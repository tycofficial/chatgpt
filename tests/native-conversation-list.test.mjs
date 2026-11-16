import test from 'node:test';
import assert from 'node:assert/strict';
import * as catalog from '../model-catalog.js';
import { createModelCatalogAdapter } from '../src/native-client/model-catalog-adapter.mjs';
import { LocalAppServer } from '../src/native-client/local-app-server.mjs';
import { ClassicChatAdapter } from '../src/native-client/classic-chat-adapter.mjs';
const models = createModelCatalogAdapter(catalog);
function fixture() {
  const values = new Map(), storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const server = new LocalAppServer({ storage, models, catalog, getExecutionPolicy: () => ({ modelSelection: true }), streamCompletion: async () => { throw Error('List fixtures must not infer'); }, readSettings: () => ({ model: 'gpt-6.1-sol' }) });
  const rows = {};
  for (const [index, name, origin, classic] of [[1,'classicChat',null,true],[2,'classicWork','tpp',true],[3,'legacyNull',null,false],[4,'legacyTpp','tpp',false],[5,'dot','dot',false],[6,'codex','codex',false]]) {
    const tx = server.dispatch('thread/start', { model: 'gpt-6.1-sol', effort: 'low', ...(origin ? { conversationOrigin: origin } : {}) }), thread = server.getThread(tx.result.thread.id);
    thread.name = name; thread.updatedAt = index; thread.adapterMetadata.conversationOrigin = origin;
    if (classic) thread.adapterMetadata.classicRootId = 'neutral-fixture-root-' + name;
    rows[name] = thread;
  }
  server.persist(); return { server, rows, storage, adapter: new ClassicChatAdapter({ appServer: server, models }) };
}
async function list(env, query = '') { const response = await env.adapter.handle(new Request('https://local.fixture/conversations' + query), '/conversations'); assert.equal(response.status, 200); return response.json(); }
const names = page => page.items.map(item => item.title).sort();

test('exact native Chat exclude-tpp query excludes explicit Dot/Codex and retains old null RPC history', async () => {
  const env = fixture(), result = await list(env, '?exclude_conversation_origin=tpp&is_archived=false');
  assert.deepEqual(names(result), ['classicChat','legacyNull']); assert.equal(result.total, 2); assert.equal(env.server.threads.size, 6);
  for (const key of ['dot','codex','legacyTpp']) assert.strictEqual(env.server.getThread(env.rows[key].id), env.rows[key]);
});

test('exact native Work origin-tpp query preserves both real Work and pre-marker RPC records', async () => {
  const env = fixture(), result = await list(env, '?conversation_origin=tpp&is_archived=false');
  assert.deepEqual(names(result), ['classicWork','legacyTpp']); assert.equal(result.total, 2); assert.equal(env.server.threads.size, 6);
  assert.equal(result.items.find(item => item.title === 'legacyTpp').conversation_origin, 'tpp');
});

test('default list excludes only declared Dot/Codex, and pagination counts the retained legacy records', async () => {
  const env = fixture(), all = await list(env); assert.deepEqual(names(all), ['classicChat','classicWork','legacyNull','legacyTpp']); assert.equal(all.total, 4);
  const page = await list(env, '?offset=1&limit=2'); assert.deepEqual(page.items.map(item => item.title), ['legacyNull','classicWork']); assert.equal(page.total, 4); assert.equal(page.offset, 1); assert.equal(page.limit, 2);
  assert.deepEqual((await list(env, '?conversation_origin=dot')).items, []); assert.deepEqual((await list(env, '?conversation_origin=codex')).items, []);
  const restored = new LocalAppServer({ storage: env.storage, models, catalog, getExecutionPolicy: () => ({ modelSelection: true }), streamCompletion: async () => {}, readSettings: () => ({}) });
  assert.equal(restored.threads.size, 6); assert.equal(restored.getThread(env.rows.dot.id).adapterMetadata.conversationOrigin, 'dot'); assert.equal(restored.getThread(env.rows.codex.id).adapterMetadata.conversationOrigin, 'codex');
});

test('existing archived/ephemeral and origin-filter semantics are unchanged for retained history', async () => {
  const env = fixture(); env.rows.classicChat.archived = true; env.rows.legacyTpp.archived = true; env.rows.dot.archived = true; env.rows.codex.archived = true; env.rows.legacyNull.ephemeral = true;
  assert.deepEqual(names(await list(env, '?is_archived=true')), ['classicChat','legacyTpp']); assert.deepEqual(names(await list(env, '?exclude_conversation_origin=tpp&is_archived=true')), ['classicChat']); assert.deepEqual(names(await list(env, '?conversation_origin=tpp&is_archived=true')), ['legacyTpp']); assert.deepEqual(names(await list(env, '?is_archived=false')), ['classicWork']);
  assert.equal(env.rows.legacyNull.ephemeral, true); assert.equal(env.rows.dot.archived, true); assert.equal(env.rows.codex.archived, true);
});
