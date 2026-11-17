import test from 'node:test';
import assert from 'node:assert/strict';
import * as catalog from '../model-catalog.js';
import { createModelCatalogAdapter } from '../src/native-client/model-catalog-adapter.mjs';
import { LocalAppServer } from '../src/native-client/local-app-server.mjs';
import { projectChatHistoryThread } from '../src/native-client/chat-history-sync.mjs';
function environment(options = {}) {
  const values = new Map(); let fail = false;
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => { if (fail) throw Error('Neutral local quota'); values.set(key, value); } };
  const diagnostics = [];
  const server = new LocalAppServer({ storage, diagnostics, models: createModelCatalogAdapter(catalog), catalog, readSettings: () => ({ model: 'gpt-6.1-sol' }), getExecutionPolicy: () => ({ modelSelection: true }), streamCompletion: async () => ({ content: 'Neutral complete.', finish_reason: 'stop' }), ...options });
  return { server, values, diagnostics, fail: value => fail = value };
}
function start(server, options = {}) { return server.dispatch('thread/start', { model: 'gpt-6.1-sol', ...options }).result.thread.id; }

test('native persist observer receives only the exact successful durable non-ephemeral snapshot and cannot mutate live history', () => {
  const captures = [], env = environment({ onPersist: snapshot => captures.push(snapshot) });
  const id = start(env.server); captures.length = 0;
  start(env.server, { ephemeral: true }); captures.length = 0;
  env.server.getThread(id).name = 'Neutral saved title'; env.server.persist();
  assert.equal(captures.length, 1); assert.deepEqual(captures[0], JSON.parse(env.values.get(env.server.storageKey)).threads);
  assert.equal(captures[0].length, 1); captures[0][0].name = 'Observer must not write history';
  assert.equal(env.server.getThread(id).name, 'Neutral saved title');
  env.fail(true); assert.throws(() => env.server.persist()); assert.equal(captures.length, 1);
});

test('a rejected background capture cannot poison an already committed native checkpoint', async () => {
  const env = environment({ onPersist: async () => { throw Error('Neutral cloud store unavailable'); } });
  const id = start(env.server); await new Promise(resolve => setImmediate(resolve));
  assert.equal(JSON.parse(env.values.get(env.server.storageKey)).threads[0].id, id);
  assert.equal(env.server.getThread(id).id, id); assert.ok(env.diagnostics.some(event => event.type === 'local-history-capture-error'));
});

test('a failed cloud apply retains both prior native Map and exact durable bytes, and never emits a local delete capture', () => {
  const captures = [], env = environment({ onPersist: value => captures.push(value) }), id = start(env.server);
  const oldMap = env.server.threads, before = env.values.get(env.server.storageKey), imported = structuredClone(env.server.getThread(id));
  imported.name = 'Neutral cloud update'; captures.length = 0; env.fail(true);
  assert.throws(() => env.server.applyHistorySnapshot([imported]), /could not be applied/);
  assert.equal(env.server.threads, oldMap); assert.equal(env.values.get(env.server.storageKey), before); assert.equal(captures.length, 0);
});

test('applying an older cloud view preserves the real active thread object and its newer checkpoint in BOTH Map and local storage', async () => {
  let entered, release;
  const ready = new Promise(resolve => entered = resolve);
  const env = environment({ streamCompletion: async () => { entered(); return new Promise(resolve => release = () => resolve({ content: 'Neutral final.', finish_reason: 'stop' })); } });
  const id = start(env.server), transaction = env.server.dispatch('turn/start', { threadId: id, input: [{ type: 'text', text: 'Neutral real pending turn.' }] });
  transaction.afterReply(); await ready;
  const running = env.server.running.get(id), active = env.server.getThread(id), older = structuredClone(active);
  active.name = 'Newer actual local title'; active.turns[0].adapterMetadata.neutralCheckpointMarker = 'S1 newer than cloud'; env.server.persist();
  env.server.applyHistorySnapshot([older]);
  assert.equal(env.server.getThread(id), active); assert.equal(env.server.running.get(id), running); assert.equal(running.thread, active);
  const saved = JSON.parse(env.values.get(env.server.storageKey)).threads[0];
  assert.equal(saved.name, 'Newer actual local title'); assert.equal(saved.turns[0].adapterMetadata.neutralCheckpointMarker, 'S1 newer than cloud');
  assert.ok(saved.turns[0].adapterMetadata.checkpoint.transcript.length);
  const done = new Promise(resolve => { const off = env.server.subscribe(event => { if (event.method === 'turn/completed') { off(); resolve(event.params.turn); } }); });
  release(); assert.equal((await done).status, 'completed');
});

test('remote unfinished history is manually paused, cannot replay its checkpoint, and ephemeral local history stays private', () => {
  let calls = 0; const env = environment({ streamCompletion: async () => { calls++; return {}; } });
  const id = start(env.server), temporaryId = start(env.server, { ephemeral: true }), incoming = structuredClone(env.server.getThread(id));
  incoming.turns = [{ id: 'neutral-remote-turn', status: 'inProgress', items: [{ type: 'userMessage', id: 'neutral-user', content: [{ type: 'text', text: 'Neutral imported request' }] }], adapterMetadata: { checkpoint: { inFlight: { transport: { jobId: 'not-to-be-replayed' } } } } }];
  const temporary = env.server.getThread(temporaryId); env.server.applyHistorySnapshot([incoming]);
  assert.equal(env.server.getThread(temporaryId), temporary);
  const turn = env.server.getThread(id).turns[0]; assert.equal(turn.status, 'interrupted'); assert.equal(turn.adapterMetadata.resumable, false); assert.equal(turn.adapterMetadata.resumePolicy, 'manual'); assert.equal(turn.adapterMetadata.checkpoint, undefined);
  assert.equal(calls, 0); assert.equal(JSON.parse(env.values.get(env.server.storageKey)).threads.some(thread => thread.id === temporaryId), false);
  assert.throws(() => env.server.resumeTurn({ threadId: id, turnId: turn.id }), /No resumable execution checkpoint/);
});

test('invalid snapshots are rejected before any write or replacing existing history', () => {
  const env = environment(), id = start(env.server), before = env.values.get(env.server.storageKey), original = env.server.getThread(id);
  for (const snapshot of [null, [{ id: 'bad', turns: null }], [original, original], [{ ...original, ephemeral: true }]]) {
    assert.throws(() => env.server.applyHistorySnapshot(snapshot)); assert.equal(env.values.get(env.server.storageKey), before); assert.equal(env.server.getThread(id), original);
  }
});

test('a remote title change preserves unchanged idle private checkpoints per turn, while an actually changed turn does not inherit them', () => {
  const env = environment(), id = start(env.server), local = env.server.getThread(id);
  local.turns = [{ id: 'unchanged-turn', status: 'interrupted', items: [{ type: 'agentMessage', id: 'neutral-assistant', text: 'Actual partial text.' }], adapterMetadata: { checkpoint: { state: 'interrupted', transcript: [{ role: 'assistant', content: 'Actual partial text.' }] }, resumable: true } }, { id: 'changed-turn', status: 'interrupted', items: [{ type: 'agentMessage', id: 'neutral-second', text: 'Old partial text.' }], adapterMetadata: { checkpoint: { state: 'interrupted', transcript: [] }, resumable: true } }];
  env.server.persist();
  const project = thread => ({ ...thread, turns: thread.turns.map(turn => ({ id: turn.id, status: turn.status, items: turn.items })) });
  const cloud = project(structuredClone(local)); cloud.name = 'Title renamed on another device'; cloud.turns[1].items[0].text = 'Actual newer text from another device.';
  env.server.applyHistorySnapshot([cloud], { projectThread: project });
  const merged = env.server.getThread(id);
  assert.equal(merged.name, cloud.name); assert.ok(merged.turns[0].adapterMetadata.checkpoint); assert.equal(merged.turns[0].adapterMetadata.resumable, true);
  assert.equal(merged.turns[1].adapterMetadata?.checkpoint, undefined); assert.equal(merged.turns[1].items[0].text, 'Actual newer text from another device.');
  const stored = JSON.parse(env.values.get(env.server.storageKey)).threads[0]; assert.deepEqual(stored.turns[0].adapterMetadata.checkpoint, local.turns[0].adapterMetadata.checkpoint);
});

function publishedThread(server) {
  const id = start(server), thread = server.getThread(id);
  const receipt = { committed: true, operationId: 'tool_neutral_published', fileId: 'file_local_' + '1'.repeat(32), rawFileId: 'file_local_' + '2'.repeat(32), revision: 1, sha256: '3'.repeat(64), fileName: 'neutral.md', mimeType: 'text/markdown', size: 11, publication: { origin: 'generated', revision: 1, updatedAt: 1 } };
  const result = { content: [{ type: 'text', text: JSON.stringify({ ...receipt, downloadAvailable: true }) }, { type: 'resource_link', uri: 'blob:neutral-old-session', name: receipt.fileName, mimeType: receipt.mimeType, size: receipt.size }], structuredContent: { ...receipt, downloadAvailable: true }, isError: false };
  thread.turns = [{ id: 'neutral-published-turn', status: 'completed', model: thread.model, items: [{ type: 'mcpToolCall', id: 'neutral-published-item', server: 'browser_workspace', tool: 'publish_file', status: 'completed', arguments: {}, result }], adapterMetadata: { resumable: false, checkpoint: { state: 'completed', completedCalls: { neutral_call: { name: 'publish_file', arguments: '{"path":"neutral.md"}', output: structuredClone(result) } }, pendingCalls: [], transcript: [] } } }];
  server.persist(); return thread;
}
function newResourcePair(thread) {
  const before = structuredClone(thread), after = structuredClone(thread);
  after.turns[0].items[0].result.content[1].uri = 'blob:neutral-new-session';
  after.turns[0].adapterMetadata.checkpoint.completedCalls.neutral_call.output.content[1].uri = 'blob:neutral-new-session';
  return { before, after };
}

test('derived resource URLs persist in native results and completed caches without changing cloud text or resubmitting tools', () => {
  const captures = [], env = environment({ onPersist: value => captures.push(value) }), thread = publishedThread(env.server), pair = newResourcePair(thread);
  captures.length = 0; const events = []; env.server.subscribe(event => events.push(event));
  const result = env.server.applyToolResultPresentation([pair], { projectThread: projectChatHistoryThread });
  assert.deepEqual(result, { updated: [thread.id], skipped: [] });
  assert.deepEqual(projectChatHistoryThread(env.server.getThread(thread.id)), projectChatHistoryThread(pair.before));
  const saved = JSON.parse(env.values.get(env.server.storageKey)).threads[0];
  assert.equal(saved.turns[0].items[0].result.content[1].uri, 'blob:neutral-new-session');
  assert.equal(saved.turns[0].adapterMetadata.checkpoint.completedCalls.neutral_call.output.content[1].uri, 'blob:neutral-new-session');
  assert.equal(saved.turns[0].adapterMetadata.checkpoint.state, 'completed');
  assert.deepEqual(captures, []); assert.deepEqual(events, []);
});

test('a failed resource presentation write preserves the exact native objects and previous durable receipt', () => {
  const env = environment(), thread = publishedThread(env.server), pair = newResourcePair(thread), oldMap = env.server.threads, disk = env.values.get(env.server.storageKey);
  env.fail(true);
  assert.throws(() => env.server.applyToolResultPresentation([pair], { projectThread: projectChatHistoryThread }), /could not be saved/);
  assert.equal(env.server.threads, oldMap); assert.equal(env.server.getThread(thread.id), thread); assert.equal(env.values.get(env.server.storageKey), disk);
});

test('an asynchronous resource resolver cannot overwrite a conversation edited or deleted while it waited', () => {
  const env = environment(), thread = publishedThread(env.server), pair = newResourcePair(thread);
  thread.name = 'Newer actual title'; env.server.persist(); const disk = env.values.get(env.server.storageKey);
  assert.deepEqual(env.server.applyToolResultPresentation([pair], { projectThread: projectChatHistoryThread }), { updated: [], skipped: [thread.id] });
  assert.equal(env.server.getThread(thread.id), thread); assert.equal(env.values.get(env.server.storageKey), disk);
  env.server.threads.delete(thread.id); env.server.persist();
  assert.deepEqual(env.server.applyToolResultPresentation([pair], { projectThread: projectChatHistoryThread }), { updated: [], skipped: [thread.id] });
  assert.equal(env.server.threads.size, 0);
});

test('a resource-only write retains unrelated live task references and its latest private checkpoint in memory and disk', async () => {
  let entered, release;
  const ready = new Promise(resolve => entered = resolve);
  const env = environment({ streamCompletion: async () => { entered(); return new Promise(resolve => release = () => resolve({ content: 'Neutral live task finished.', finish_reason: 'stop' })); } });
  const published = publishedThread(env.server), pair = newResourcePair(published), liveId = start(env.server);
  const transaction = env.server.dispatch('turn/start', { threadId: liveId, input: [{ type: 'text', text: 'Neutral live task.' }] }); transaction.afterReply(); await ready;
  const running = env.server.running.get(liveId), active = env.server.getThread(liveId);
  active.turns[0].adapterMetadata.privateLiveMarker = 'Latest genuine checkpoint'; env.server.persist();
  env.server.applyToolResultPresentation([pair, newResourcePair({ ...active, turns: published.turns })], { projectThread: projectChatHistoryThread });
  assert.equal(env.server.getThread(liveId), active); assert.equal(env.server.running.get(liveId), running); assert.equal(running.thread, active);
  assert.equal(JSON.parse(env.values.get(env.server.storageKey)).threads.find(thread => thread.id === liveId).turns[0].adapterMetadata.privateLiveMarker, 'Latest genuine checkpoint');
  const done = new Promise(resolve => { const off = env.server.subscribe(event => { if (event.method === 'turn/completed') { off(); resolve(); } }); }); release(); await done;
});

test('resource presentation rejects semantic history changes and malformed batches before writing any partial result', () => {
  const env = environment(), thread = publishedThread(env.server), pair = newResourcePair(thread), disk = env.values.get(env.server.storageKey), oldMap = env.server.threads;
  const changed = structuredClone(pair); changed.after.name = 'Must not rewrite history';
  for (const pairs of [[pair, pair], [changed], [{ before: pair.before, after: { ...pair.after, id: 'another-id' } }], null]) {
    assert.throws(() => env.server.applyToolResultPresentation(pairs, { projectThread: projectChatHistoryThread }));
    assert.equal(env.server.threads, oldMap); assert.equal(env.values.get(env.server.storageKey), disk);
  }
});
