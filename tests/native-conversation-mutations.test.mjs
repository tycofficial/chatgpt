import test from 'node:test';
import assert from 'node:assert/strict';
import * as catalog from '../model-catalog.js';
import { createModelCatalogAdapter } from '../src/native-client/model-catalog-adapter.mjs';
import { LocalAppServer } from '../src/native-client/local-app-server.mjs';
import { ClassicChatAdapter } from '../src/native-client/classic-chat-adapter.mjs';
import { createPreferredHostTransport, turnHostCheckpoints } from '../src/native-client/preferred-host-transport.mjs';
const models = createModelCatalogAdapter(catalog), admin = { id: 'site-admin', role: 'administrator', planType: 'pro', membershipSource: 'site-administrator' };
function memory() { const values = new Map(); return { values, failWhen: null, getItem: key => values.get(key) ?? null, setItem(key, value) { if (this.failWhen?.(value)) throw new DOMException('Fixture persistence quota', 'QuotaExceededError'); values.set(key, value); } }; }
function fixture({ storage = memory(), completion = async () => ({ content: 'Neutral fixture reply.', finish_reason: 'stop' }), onIdleTurnInterrupt } = {}) {
  const events = [], server = new LocalAppServer({ storage, models, catalog, getExecutionPolicy: () => ({ modelSelection: true }), readSettings: () => ({ model: 'gpt-6.1-sol', apiBase: 'https://no-network.fixture', apiKey: 'fixture-only' }), streamCompletion: completion, onIdleTurnInterrupt });
  const adapter = new ClassicChatAdapter({ appServer: server, models, onConversationChange: (...event) => events.push(event) });
  return { server, adapter, events, storage };
}
async function api(env, path, body) { const response = await env.adapter.handle(new Request('https://local.fixture' + path, { method: 'PATCH', body: JSON.stringify(body) }), path.split('?')[0]); assert(response); return { response, data: await response.json() }; }
async function chat(env, { origin = null, ephemeral = false } = {}) {
  const work = origin === 'tpp';
  const response = await env.adapter.handle(new Request('https://local.fixture/f/conversation', { method: 'POST', body: JSON.stringify({ model: work ? 'gpt-6.1-sol' : 'gpt-6-sol', thinking_effort: work ? 'min' : 'standard', conversation_origin: origin, history_and_training_disabled: ephemeral, messages: [{ id: crypto.randomUUID(), author: { role: 'user' }, content: { content_type: 'text', parts: ['A neutral local fixture.'] }, metadata: {} }] }) }), '/f/conversation');
  const wire = await response.text(); assert.match(wire, /message_stream_complete/); return [...env.server.threads.values()].at(-1);
}
function rpc(env, origin) { const tx = env.server.dispatch('thread/start', { model: 'gpt-6.1-sol', effort: 'low', ...(origin ? { conversationOrigin: origin } : {}) }); tx.afterReply?.(); return env.server.getThread(tx.result.thread.id); }
function terminal(server, id) { return new Promise(resolve => { const off = server.subscribe(event => { if (event.method === 'turn/completed' && event.params.threadId === id) { off(); resolve(event.params.turn); } }); }); }
async function until(test) { const end = Date.now() + 2000; while (!test()) { if (Date.now() > end) throw Error('Mutation fixture timed out'); await new Promise(resolve => setTimeout(resolve, 1)); } }

test('exact bulk archive scopes current-account persistent Classic Chat/Work and persists both atomically', async () => {
  const env = fixture(), first = await chat(env), work = await chat(env, { origin: 'tpp' }), transient = await chat(env, { ephemeral: true }), codex = rpc(env, 'codex'), dot = rpc(env, 'dot'), unknownLocal = rpc(env);
  const result = await api(env, '/conversations', { is_archived: true }); assert.equal(result.response.status, 200); assert.equal(result.data.affected_count, 2); assert.equal(result.data.adapter_scope, 'current-account-classic-chat-and-work');
  assert.equal(first.archived, true); assert.equal(work.archived, true); for (const t of [transient, codex, dot, unknownLocal]) assert.equal(t.archived, false);
  const restored = fixture({ storage: env.storage }); assert.equal(restored.server.getThread(first.id).archived, true); assert.equal(restored.server.getThread(work.id).archived, true); assert.equal(restored.server.getThread(codex.id).archived, false); assert.equal(restored.server.threads.has(transient.id), false);
  assert.equal(env.events.filter(event => event[1].update_type === 'conversation-archived').length, 2);
});

test('exact bulk delete removes only proven REST records and preserves local Codex/Dot/unknown RPC records', async () => {
  const env = fixture(), chatThread = await chat(env), work = await chat(env, { origin: 'tpp' }), codex = rpc(env, 'codex'), dot = rpc(env, 'dot'), unknownLocal = rpc(env);
  const result = await api(env, '/conversations', { is_visible: false }); assert.equal(result.response.status, 200); assert.equal(result.data.affected_count, 2);
  assert.equal(env.server.threads.has(chatThread.id), false); assert.equal(env.server.threads.has(work.id), false); for (const t of [codex, dot, unknownLocal]) assert.strictEqual(env.server.getThread(t.id), t);
  const restored = fixture({ storage: env.storage }); assert.deepEqual([...restored.server.threads.keys()].sort(), [codex.id, dot.id, unknownLocal.id].sort());
});

test('bulk archive persistence failure restores the complete mutation and emits no false success notification', async () => {
  const env = fixture(), a = await chat(env), b = await chat(env, { origin: 'tpp' }), before = env.storage.getItem(env.server.storageKey); let failed = false;
  env.storage.failWhen = serialized => { const state = JSON.parse(serialized); if (!failed && state.threads.filter(t => t.id === a.id || t.id === b.id).every(t => t.archived)) { failed = true; return true; } return false; };
  const result = await api(env, '/conversations', { is_archived: true }); assert.equal(result.response.status, 507); assert.equal(result.data.error.code, 'CONVERSATION_MUTATION_NOT_SAVED'); assert.equal(a.archived, false); assert.equal(b.archived, false); assert.strictEqual(env.server.getThread(a.id), a); assert.equal(env.storage.getItem(env.server.storageKey), before); assert.equal(env.events.length, 0);
});

test('bulk delete persistence failure restores every record and saved account state', async () => {
  const env = fixture(), a = await chat(env), b = await chat(env), before = env.storage.getItem(env.server.storageKey); let failed = false;
  env.storage.failWhen = serialized => { if (!failed && !JSON.parse(serialized).threads.some(t => t.id === a.id)) { failed = true; return true; } return false; };
  const result = await api(env, '/conversations', { is_visible: false }); assert.equal(result.response.status, 507); assert.strictEqual(env.server.getThread(a.id), a); assert.strictEqual(env.server.getThread(b.id), b); assert.equal(env.storage.getItem(env.server.storageKey), before); assert.equal(env.events.length, 0);
});

test('single title/archive/star changes use the same rollback while retaining active object identity', async () => {
  const env = fixture(), thread = await chat(env); thread.name = 'Original neutral title'; env.server.persist(); const before = env.storage.getItem(env.server.storageKey); let failed = false;
  env.storage.failWhen = serialized => { if (!failed && JSON.parse(serialized).threads.some(t => t.id === thread.id && t.name === 'Changed title')) { failed = true; return true; } return false; };
  const result = await api(env, '/conversation/' + thread.id, { title: 'Changed title', is_archived: true, is_starred: true }); assert.equal(result.response.status, 507); assert.equal(thread.name, 'Original neutral title'); assert.equal(thread.archived, false); assert.equal(Object.hasOwn(thread.adapterMetadata, 'isStarred'), false); assert.strictEqual(env.server.getThread(thread.id), thread); assert.equal(env.storage.getItem(env.server.storageKey), before); assert.equal(env.events.length, 0);
});

test('native Codex title changes persist across reload and only notify after successful storage', () => {
  const env = fixture(), thread = rpc(env, 'codex');
  const events = [];
  env.server.subscribe(event => events.push(event));
  const rename = name => env.server.dispatch('thread/name/set', { threadId: thread.id, name });
  assert.throws(() => rename('   '), { code: -32602 });
  const change = rename('  Native Codex title  ');
  assert.deepEqual(change.result, {});
  assert.deepEqual(events, []);
  change.afterReply();
  assert.deepEqual(events, [{ method: 'thread/name/updated', params: { threadId: thread.id, threadName: 'Native Codex title' } }]);
  assert.equal(rename('Native Codex title').afterReply, undefined);
  assert.equal(fixture({ storage: env.storage }).server.getThread(thread.id).name, 'Native Codex title');

  const saved = env.storage.getItem(env.server.storageKey);
  env.storage.failWhen = () => true;
  assert.throws(() => rename('Uncommitted title'), /history could not be saved/);
  assert.equal(thread.name, 'Native Codex title');
  assert.equal(env.storage.getItem(env.server.storageKey), saved);
  assert.equal(events.length, 1);
});

test('archive preserves an actively running controller and its thread reference', async () => {
  let release, entered; const started = new Promise(resolve => entered = resolve);
  const env = fixture({ completion: () => { entered(); return new Promise(resolve => release = () => resolve({ content: 'Actual active fixture completed.', finish_reason: 'stop' })); } });
  const thread = rpc(env); thread.adapterMetadata.classicRootId = 'neutral-active-root'; thread.adapterMetadata.conversationOrigin = 'tpp';
  const tx = env.server.dispatch('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'Keep this active neutral fixture.' }] }), done = terminal(env.server, thread.id); tx.afterReply(); await started;
  const running = env.server.running.get(thread.id), result = await api(env, '/conversations', { is_archived: true }); assert.equal(result.response.status, 200); assert.equal(running.controller.signal.aborted, false); assert.strictEqual(running.thread, thread); assert.equal(thread.archived, true); release(); assert.equal((await done).status, 'completed'); assert.equal(env.server.getThread(thread.id).archived, true);
});

async function durableFixture({ failure = false, unconfirmed = false } = {}) {
  let entered, confirm; const started = new Promise(resolve => entered = resolve); const state = { deletes: 0, deletionStarted: false };
  const preferred = createPreferredHostTransport({ baseURL: 'https://cancel.fixture', getSiteAccount: () => admin, getSiteSessionToken: () => 'fixture-site-session', fetchImpl: async (url, options) => { assert.equal(options.method, 'DELETE'); assert.match(new URL(url).pathname, /^\/jobs\/[\w-]+$/); state.deletes++; state.deletionStarted = true; if (failure) throw Error('Actual injected cancellation network failure'); await new Promise(resolve => confirm = resolve); return new Response(JSON.stringify({ cancelled: !unconfirmed }), { headers: { 'Content-Type': 'application/json' } }); } });
  let env; env = fixture({ completion: async options => { Object.assign(options.transportContext.checkpoint, { route: 'host', jobId: crypto.randomUUID(), ownerId: 'site-admin', accepted: true, state: 'streaming' }); await options.transportContext.onCheckpoint(); entered(); return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true })); }, onIdleTurnInterrupt: ({ turn }) => Promise.all(turnHostCheckpoints(turn).map(cp => preferred.cancel(cp, { onCheckpoint: () => env.server.persist() }))) });
  const thread = rpc(env); thread.adapterMetadata.classicRootId = 'neutral-durable-rest-root'; thread.adapterMetadata.conversationOrigin = null;
  const tx = env.server.dispatch('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'A durable neutral fixture.' }] }), done = terminal(env.server, thread.id); tx.afterReply(); await started;
  return { ...env, thread, state, done, confirm: () => confirm() };
}

test('delete awaits one real protocol cancellation before removing a running durable record', async () => {
  const env = await durableFixture(); let returned = false;
  const deletion = api(env, '/conversation/' + env.thread.id, { is_visible: false }).then(value => { returned = true; return value; }); await until(() => env.state.deletionStarted);
  assert.equal(returned, false); assert.equal(env.server.threads.has(env.thread.id), true); assert.equal(env.server.running.has(env.thread.id), false); env.confirm();
  const result = await deletion; assert.equal(result.response.status, 200); assert.equal(env.state.deletes, 1); assert.equal(env.server.threads.has(env.thread.id), false); assert.equal((await env.done).status, 'interrupted');
});

test('a failed durable cancellation retains all bulk records rather than pretending deletion succeeded', async () => {
  const env = await durableFixture({ failure: true }), other = rpc(env); other.adapterMetadata.classicRootId = 'neutral-other-rest-root'; other.adapterMetadata.conversationOrigin = 'tpp'; env.server.persist();
  const result = await api(env, '/conversations', { is_visible: false }); assert.equal(result.response.status, 503); assert.strictEqual(env.server.getThread(env.thread.id), env.thread); assert.strictEqual(env.server.getThread(other.id), other); assert.equal(env.state.deletes, 1); assert.equal(env.events.length, 0); assert.equal((await env.done).status, 'interrupted');
});

test('an unconfirmed durable cancellation never drops the saved conversation', async () => {
  const env = await durableFixture({ unconfirmed: true }), deletion = api(env, '/conversations', { is_visible: false }); await until(() => env.state.deletionStarted); env.confirm(); const result = await deletion;
  assert.equal(result.response.status, 503); assert.equal(result.data.error.code, 'HOST_CANCELLATION_UNCONFIRMED'); assert.equal(env.server.threads.has(env.thread.id), true); assert.equal(env.events.length, 0); await env.done;
});

test('rollback after a confirmed cancellation preserves the honest interrupted state and recoverable records', async () => {
  const env = await durableFixture(); let failed = false; env.storage.failWhen = serialized => { if (!failed && !JSON.parse(serialized).threads.some(t => t.id === env.thread.id)) { failed = true; return true; } return false; };
  const deletion = api(env, '/conversations', { is_visible: false }); await until(() => env.state.deletionStarted); env.confirm(); const result = await deletion;
  assert.equal(result.response.status, 507); const restored = fixture({ storage: env.storage }), thread = restored.server.getThread(env.thread.id); assert.equal(thread.turns[0].status, 'interrupted'); assert.equal(turnHostCheckpoints(thread.turns[0])[0].state, 'cancelled'); assert.equal(env.state.deletes, 1); assert.equal(env.events.length, 0); await env.done;
});

test('bulk accepts only the exact source actions and never treats unrelated query filters as deletion scope', async () => {
  const env = fixture(), thread = await chat(env);
  for (const [path, body] of [['/conversations', {}], ['/conversations', { is_archived: false }], ['/conversations', { is_visible: true }], ['/conversations', { is_visible: false, is_archived: true }], ['/conversations', { title: 'Not bulk rename' }], ['/conversations?conversation_origin=dot', { is_visible: false }]]) { const result = await api(env, path, body); assert.equal(result.response.status, 400); assert.equal(env.server.threads.has(thread.id), true); assert.equal(thread.archived, false); }
});

test('mutations stay within their current account namespace and serialize concurrent batches', async () => {
  const a = fixture(), b = fixture(), first = await chat(a), otherAccount = await chat(b);
  const results = await Promise.all([api(a, '/conversations', { is_archived: true }), api(a, '/conversations', { is_visible: false })]); assert(results.every(result => result.response.status === 200)); assert.equal(a.server.threads.has(first.id), false); assert.equal(b.server.threads.has(otherAccount.id), true); assert.equal(otherAccount.archived, false);
});


test('only committed changes emit exact native archive/unarchive/delete/name events for their actual ids', async () => {
  const env = fixture(), a = await chat(env), b = await chat(env, { origin: 'tpp' }), dot = rpc(env, 'dot'), codex = rpc(env, 'codex'), events = [];
  env.server.subscribe(event => { if (['thread/archived','thread/unarchived','thread/deleted','thread/name/updated'].includes(event.method)) events.push(event); });
  assert.equal((await api(env, '/conversations', { is_archived: true })).response.status, 200);
  assert.deepEqual(events.map(e => e.method), ['thread/archived','thread/archived']); assert.deepEqual(events.map(e => e.params.threadId).sort(), [a.id,b.id].sort());
  await api(env, '/conversations', { is_archived: true }); assert.equal(events.length, 2, 'An unchanged archive does not invent another RPC change');
  await api(env, '/conversation/' + a.id, { is_archived: false }); assert.deepEqual(events.at(-1), { method: 'thread/unarchived', params: { threadId: a.id } });
  await api(env, '/conversation/' + a.id, { title: 'Committed neutral title' }); assert.deepEqual(events.at(-1), { method: 'thread/name/updated', params: { threadId: a.id, threadName: 'Committed neutral title' } });
  const beforeFailure = events.length; let failed = false; env.storage.failWhen = data => { if (!failed && JSON.parse(data).threads.find(t => t.id === a.id)?.archived) { failed = true; return true; } return false; };
  assert.equal((await api(env, '/conversation/' + a.id, { is_archived: true })).response.status, 507); assert.equal(events.length, beforeFailure, 'Rolled-back mutation has no native commit notification');
  assert.equal((await api(env, '/conversations', { is_visible: false })).response.status, 200); assert.deepEqual(events.slice(-2).map(e => e.method), ['thread/deleted','thread/deleted']); assert(events.every(e => ![dot.id,codex.id].includes(e.params.threadId)));
});
