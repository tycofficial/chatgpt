import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalAppServer } from '../src/native-client/local-app-server.mjs';

test('native Codex can hydrate saved history by turn or by paged item across the thread', () => {
  const server = new LocalAppServer({ storage: null });
  const item = (id, startedAtMs) => ({ id, type: 'agentMessage', text: id, startedAtMs });
  server.threads.set('thread', { id: 'thread', turns: [
    { id: 'first', items: [item('a', 100), item('b', 140)] },
    { id: 'second', items: [item('c', 160), item('d', 190)] },
  ] });
  const read = params => server.dispatch('thread/items/list', { threadId: 'thread', ...params }).result;
  const newest = read({ sortDirection: 'desc', limit: 2 });
  assert.deepEqual(newest.data.map(row => [row.turnId, row.item.id, row.startedAtMs, row.completedAtMs]), [
    ['second', 'd', 190, null], ['second', 'c', 160, null],
  ]);
  assert.deepEqual(read({ sortDirection: 'desc', cursor: newest.nextCursor }).data.map(row => row.item.id), ['b', 'a']);
  assert.deepEqual(read({ turnId: 'first', cursor: { type: 'item', itemId: 'a' } }).data.map(row => row.item.id), ['b']);
  assert.throws(() => read({ turnId: 'second', cursor: { type: 'item', itemId: 'a' } }), { code: -32602 });
  assert.throws(() => read({ threadId: 'other' }), { code: -32001 });
});
