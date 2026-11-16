/** BCjz wire protocol over actual local conversation updates, never a cloud socket. */
export class LocalConversationPubSub {
  constructor(appServer) {
    this.clients = new Set(); this.history = []; this.offset = 0;
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
  publish(type, payload) {
    const offset = String(++this.offset), value = { type, payload };
    this.history.push({ offset, value }); if (this.history.length > 512) this.history.shift();
    for (const client of this.clients) if (client.readyState === 1) {
      const messages = [...client.topics].filter(topic => topic === 'conversations' || topic === 'alder-conversations').map(topic => ({ type: 'message', topic_id: topic, offset, payload: value }));
      if (messages.length) client.deliver(messages);
    }
  }
  open(url) { return new LocalPubSubSocket(this, url); }
  process(client, records) {
    if (!Array.isArray(records)) throw Error('Local pubsub expects a command array');
    return records.map(record => {
      const { id, command } = record;
      if (!Number.isFinite(id) || !command || typeof command.type !== 'string') throw Error('Invalid local pubsub command');
      let reply;
      switch (command.type) {
        case 'connect': reply = { type: 'connect', adapter_source: 'local-conversation-pubsub' }; break;
        case 'presence': reply = { type: 'presence' }; break;
        case 'unsubscribe': client.topics.delete(command.topic_id); reply = { type: 'unsubscribe', topic_id: command.topic_id }; break;
        case 'subscribe': {
          if (!['conversations', 'alder-conversations'].includes(command.topic_id)) { reply = { type: 'error', code: 'LOCAL_TOPIC_UNIMPLEMENTED', message: 'Only local conversation topics are implemented' }; break; }
          client.topics.add(command.topic_id);
          const requested = command.offset == null ? null : Number(command.offset), oldest = Number(this.history[0]?.offset ?? this.offset + 1);
          const recovered = requested !== null && Number.isSafeInteger(requested) && requested >= oldest - 1 && requested <= this.offset;
          reply = { type: 'subscribe', topic_id: command.topic_id, recovered, last_offset: String(this.offset), catchups: recovered ? this.history.filter(item => Number(item.offset) > requested).map(item => ({ type: 'message', topic_id: command.topic_id, offset: item.offset, payload: item.value })) : [] };
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
  constructor(hub, url) {
    super(); this.hub = hub; this.url = url; this.readyState = 0; this.topics = new Set(); this.bufferedAmount = 0; this.extensions = ''; this.protocol = ''; this.binaryType = 'blob';
    hub.clients.add(this);
    queueMicrotask(() => { if (this.readyState === 0) { this.readyState = 1; this.dispatchEvent(new Event('open')); } });
  }
  send(data) {
    if (this.readyState !== 1) throw new DOMException('Local pubsub socket is not open', 'InvalidStateError');
    try { this.deliver(this.hub.process(this, JSON.parse(data))); }
    catch (error) { this.deliver([{ id: -1, reply: { type: 'error', code: 'LOCAL_INVALID_FRAME', message: error.message } }]); }
  }
  deliver(records) { queueMicrotask(() => { if (this.readyState === 1) this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(records) })); }); }
  close() { if (this.readyState === 3) return; this.readyState = 3; this.hub.clients.delete(this); this.topics.clear(); this.dispatchEvent(new Event('close')); }
}
