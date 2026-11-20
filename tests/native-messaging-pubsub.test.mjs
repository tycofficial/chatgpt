import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalConversationPubSub } from '../src/native-client/local-pubsub.mjs';

test('the native messaging topics deliver room updates only to their subscribed account and reread its room on reconnect', async () => {
  let owner = 'account-A', paid = true;
  const listeners = new Set();
  const hub = new LocalConversationPubSub({ subscribe() { return () => {}; } }, {
    getOwner: () => owner, hasRoomAccess: () => paid,
    subscribeRoomMessages(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  });
  const topic = 'calpico-chatgpt-messaging', other = topic + '-all';
  const incoming = { type: 'calpico-message-add', payload: { room_id: 'room-A', message: { id: 'reply' } } };
  const update = { type: 'calpico-message-update', payload: { room_id: 'room-A', message_id: 'reply' } };
  const tick = () => new Promise(resolve => setImmediate(resolve));
  const start = async () => {
    const socket = hub.open('wss://fixture.test/local');
    const frames = [];
    socket.onmessage = event => frames.push(...JSON.parse(event.data));
    await tick();
    return { frames, socket, command(type, topic_id, offset) {
      socket.send(JSON.stringify([{ id: 1, command: { type, topic_id, offset } }]));
    } };
  };
  const a = await start();
  a.command('subscribe', topic); a.command('subscribe', other);
  await tick(); assert.equal(listeners.size, 1);
  for (const listener of listeners) {
    listener(incoming); listener(update);
    listener({ type: update.type, payload: { room_id: 'room-A' } });
  }
  await tick();
  assert.deepEqual(a.frames.filter(x => x.type === 'message').map(x => [x.topic_id, x.payload]), [[topic, incoming], [other, incoming], [topic, update], [other, update]]);
  a.command('unsubscribe', other); await tick(); assert.equal(listeners.size, 1);
  for (const listener of listeners) listener(incoming);
  owner = 'account-B'; await tick();
  assert.equal(a.frames.filter(x => x.type === 'message').length, 4);
  assert.equal(listeners.size, 0);
  const b = await start();
  b.command('subscribe', topic, 0); await tick();
  assert.deepEqual(b.frames[0].reply.catchups, []);
  assert.equal(b.frames[0].reply.recovered, false);
  for (const listener of listeners) listener(incoming);
  paid = false; await tick();
  assert.equal(b.frames.filter(x => x.type === 'message').length, 0);
  b.socket.close(); assert.equal(listeners.size, 0);
});
