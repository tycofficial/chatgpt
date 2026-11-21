/** The site's WebSocket implements the original command/acknowledgement and replay format. */
const topicKinds = new Map([
  ['conversations', 'conversation'], ['alder-conversations', 'conversation'],
  ['calpico-chatgpt-messaging', 'messaging'], ['calpico-chatgpt-messaging-all', 'messaging'],
]);

export class LocalConversationPubSub {
  constructor(appServer, { getOwner = () => 'local', hasRoomAccess = () => false, subscribeRoomMessages } = {}) {
    this.getOwner = getOwner;
    this.hasRoomAccess = hasRoomAccess;
    this.subscribeRoomMessages = subscribeRoomMessages;
    this.clients = new Set();
    this.journals = new Map();
    this.unsubscribe = appServer.subscribe(event => {
      const p = event.params, id = p.threadId ?? p.thread?.id;
      if (!id) return;
      if (event.method === 'thread/started') this.publish('conversation-created', { conversation_id: id });
      if (event.method === 'thread/name/updated') this.publish('conversation-history-update', { conversation_id: id, update_type: 'conversation-title-updated' });
      if (event.method === 'turn/completed') {
        const last = p.turn.items.filter(item => item.type === 'agentMessage').at(-1);
        if (p.turn.status === 'completed') this.publish('conversation-turn-complete', { conversation_id: id, current_message_id: last?.id ?? null });
        else this.publish('conversation-history-update', { conversation_id: id, update_type: 'local-turn-' + p.turn.status });
      }
    });
  }
  journal(owner, kind) {
    let channels = this.journals.get(owner);
    if (!channels) this.journals.set(owner, channels = new Map());
    let log = channels.get(kind);
    if (!log) channels.set(kind, log = { offset: 0, history: [] });
    return log;
  }
  isCurrent(client) { return Boolean(client.owner) && client.owner === this.getOwner(); }
  publish(type, payload) { this.append('conversation', { type, payload }); }
  append(kind, value) {
    const owner = this.getOwner();
    if (!owner) return;
    const log = this.journal(owner, kind), offset = String(++log.offset);
    log.history.push({ offset, value });
    if (log.history.length > 512) log.history.shift();
    for (const client of this.clients) {
      if (client.owner !== owner || client.readyState !== 1) continue;
      const messages = [...client.topics].filter(topic => topicKinds.get(topic) === kind)
        .map(topic => ({ type: 'message', topic_id: topic, offset, payload: value }));
      if (messages.length) client.deliver(messages);
    }
  }
  open(url) { return new LocalPubSubSocket(this, url, this.getOwner()); }
  process(client, records) {
    if (!Array.isArray(records)) throw Error('Local pubsub expects a command array');
    return records.map(record => {
      const { id, command } = record;
      if (!Number.isFinite(id) || !command || typeof command.type !== 'string') throw Error('Invalid local pubsub command');
      let reply;
      switch (command.type) {
        case 'connect': reply = { type: 'connect', adapter_source: 'local-conversation-pubsub' }; break;
        case 'presence': reply = { type: 'presence' }; break;
        case 'unsubscribe':
          client.topics.delete(command.topic_id);
          if (![...client.topics].some(topic => topicKinds.get(topic) === 'messaging')) client.stopRoomMessages();
          reply = { type: 'unsubscribe', topic_id: command.topic_id }; break;
        case 'subscribe': {
          const topic = command.topic_id, kind = topicKinds.get(topic);
          if (!kind || (kind === 'messaging' && (!this.hasRoomAccess() || !this.subscribeRoomMessages))) {
            reply = { type: 'error', code: 'LOCAL_TOPIC_UNIMPLEMENTED', message: 'This topic is unavailable for the active site account' }; break;
          }
          client.topics.add(topic);
          if (kind === 'messaging') {
            client.startRoomMessages();
            // The room's persisted GET is authoritative after reconnect. Do not keep a second history of message bodies on the socket.
            reply = { type: 'subscribe', topic_id: topic, recovered: false, last_offset: String(client.roomOffset), catchups: [] };
            break;
          }
          const log = this.journal(client.owner, kind);
          const requested = command.offset == null ? null : Number(command.offset), oldest = Number(log.history[0]?.offset ?? log.offset + 1);
          const recovered = requested !== null && Number.isSafeInteger(requested) && requested >= oldest - 1 && requested <= log.offset;
          const catchups = recovered ? log.history.filter(item => Number(item.offset) > requested)
            .map(item => ({ type: 'message', topic_id: topic, offset: item.offset, payload: item.value })) : [];
          reply = { type: 'subscribe', topic_id: topic, recovered, last_offset: String(log.offset), catchups };
          break;
        }
        default: reply = { type: 'error', code: 'LOCAL_COMMAND_UNIMPLEMENTED', message: 'Local pubsub command is not implemented' };
      }
      return { id, reply };
    });
  }
}
class LocalPubSubSocket extends EventTarget {
  static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
  constructor(hub, url, owner) {
    super(); this.hub = hub; this.url = url; this.owner = owner; this.readyState = 0; this.topics = new Set(); this.bufferedAmount = 0; this.extensions = ''; this.protocol = ''; this.binaryType = 'blob';
    hub.clients.add(this);
    this.roomOffset = 0; this.roomSubscription = null;
    queueMicrotask(() => { if (this.readyState === 0) { this.readyState = 1; this.emit(new Event('open')); } });
  }
  emit(event) { this.dispatchEvent(event); this['on' + event.type]?.call(this, event); }
  startRoomMessages() {
    if (this.roomSubscription) return;
    this.roomSubscription = this.hub.subscribeRoomMessages(value => {
      if (!this.hub.isCurrent(this) || !this.hub.hasRoomAccess() || !value?.payload?.room_id) return;
      const { type, payload } = value;
      const messageEvent = type === 'calpico-message-add' && payload.message ||
        type === 'calpico-message-update' && typeof payload.message_id === 'string' && payload.message_id.length > 0;
      if (!messageEvent) return;
      const offset = String(++this.roomOffset);
      const records = [...this.topics].filter(topic => topicKinds.get(topic) === 'messaging')
        .map(topic => ({ type: 'message', topic_id: topic, offset, payload: value }));
      if (records.length) this.deliver(records);
    });
  }
  stopRoomMessages() {
    if (this.roomSubscription) this.roomSubscription();
    this.roomSubscription = null;
  }
  send(data) {
    if (this.readyState !== 1) throw new DOMException('Local pubsub socket is not open', 'InvalidStateError');
    if (!this.hub.isCurrent(this)) { this.close(); return; }
    try { this.deliver(this.hub.process(this, JSON.parse(data))); }
    catch (error) { this.deliver([{ id: -1, reply: { type: 'error', code: 'LOCAL_INVALID_FRAME', message: error.message } }]); }
  }
  deliver(records) {
    queueMicrotask(() => {
      if (this.readyState !== 1) return;
      if (!this.hub.isCurrent(this)) { this.close(); return; }
      const accessible = this.hub.hasRoomAccess() ? records : records.filter(record =>
        topicKinds.get(record.topic_id ?? record.reply?.topic_id) !== 'messaging');
      if (accessible.length) this.emit(new MessageEvent('message', { data: JSON.stringify(accessible) }));
    });
  }
  close() {
    if (this.readyState === 3) return;
    this.readyState = 3; this.stopRoomMessages(); this.hub.clients.delete(this); this.topics.clear(); this.emit(new Event('close'));
  }
}
