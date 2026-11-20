import assert from 'node:assert/strict';
import test from 'node:test';
import * as catalog from '../src/native-client/model-catalog.js';
import { ClassicChatAdapter } from '../src/native-client/classic-chat-adapter.mjs';
import { LocalAppServer } from '../src/native-client/local-app-server.mjs';
import { createModelCatalogAdapter } from '../src/native-client/model-catalog-adapter.mjs';
import { createLocalCodexAdapter } from '../src/native-client/local-codex-adapter.mjs';
import { projectChatHistoryThread } from '../src/native-client/chat-history-sync.mjs';

function setup(storage = (() => {
  const records = new Map();
  return { getItem: key => records.get(key), setItem: (key, value) => records.set(key, value) };
})()) {
  const requests = [];
  const models = createModelCatalogAdapter(catalog);
  const readSettings = () => ({ model: 'gpt-6.1-sol', apiKey: 'fixture-only', apiBase: 'https://fixture.invalid' });
  const server = new LocalAppServer({
    storage, models, catalog, readSettings,
    getExecutionPolicy: () => ({ modelSelection: true }),
    toolExecutor: { storage: {}, tools: [], execute() {} },
    async streamCompletion(options) {
      requests.push({ model: options.settings.model, effort: options.settings.reasoningEffort });
      return { content: 'Fixture answer.', finish_reason: 'stop' };
    },
  });
  const codex = createLocalCodexAdapter({
    appServer: server, models, readSettings, getIdentity: () => ({ accountId: 'site-account', userId: 'site-user' }), isLocalSession: () => true,
    getCapabilities: () => ({ executionSource: 'local-app-server', textConversations: true, modelSelection: true }),
  });
  return { requests, server, codex, classic: new ClassicChatAdapter({ appServer: server, models }), storage };
}

function send(classic, details) {
  const body = { action: 'next', messages: [{ id: crypto.randomUUID(), author: { role: 'user' }, content: { content_type: 'text', parts: ['Fixture question'] } }], ...details };
  return classic.handle(new Request('https://fixture.invalid/f/conversation', { method: 'POST', body: JSON.stringify(body) }), '/f/conversation');
}

test('reopened Work history restores its origin and continues with a stale Chat picker payload', async () => {
  const first = setup();
  await (await send(first.classic, { conversation_origin: 'tpp', model: 'gpt-6.1-sol', thinking_effort: 'extended' })).text();
  const [work] = first.server.threads.values();
  const second = setup(first.storage);
  const shared = projectChatHistoryThread(work);
  assert.equal(shared.executionSurface, 'work');
  assert.equal(shared.adapterMetadata.conversationOrigin, 'tpp');
  const restored = second.server.getThread(work.id);
  const snapshot = second.classic.detail(restored);
  assert.equal(snapshot.conversation_origin, 'tpp');
  assert.equal(snapshot.default_model_slug, 'gpt-6.1-sol');
  await (await send(second.classic, { conversation_id: work.id, conversation_origin: null, model: 'chat-gpt-6-pro', thinking_effort: 'standard' })).text();
  assert.equal(restored.turns.at(-1).executionSurface, 'work');
  assert.deepEqual(second.requests, [{ model: 'gpt-6.1-sol', effort: 'high' }]);
});

test('Codex starts without a selected project and its thread lists omit Work records', async () => {
  const { codex, classic, server } = setup();
  await (await send(classic, { conversation_origin: 'tpp', model: 'gpt-6.1-sol', thinking_effort: 'min' })).text();
  const [work] = server.threads.values();
  const facade = codex.createRpcFacade({ getRequestContext: (method, params) => codex.getBrowserRequestContext(method, params, { sidebarProductMode: 'codex' }) });
  const { thread } = facade.dispatch('thread/start', { model: 'gpt-6.1-sol', effort: 'medium' }).result;
  assert.equal(thread.cwd, '/mnt/data');
  assert.equal(thread.executionSurface, 'codex');
  assert.equal(thread.adapterMetadata.conversationOrigin, 'codex');
  assert.deepEqual(facade.dispatch('thread/list').result.data.map(row => row.id), [thread.id]);
  assert.deepEqual(facade.dispatch('thread/loaded/list').result.data, [thread.id]);
  assert.deepEqual((await classic.list(new URL('https://fixture.invalid/conversations')).json()).items.map(row => row.id), [work.id]);
  const resumed = facade.dispatch('thread/resume', { threadId: thread.id, executionSurface: 'work' }).result.thread;
  assert.equal(resumed.executionSurface, 'codex');
});
