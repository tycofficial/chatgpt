import test from 'node:test';
import assert from 'node:assert/strict';
import * as catalog from '../model-catalog.js';
import { streamCompletion } from '../runtime.js';
import { createModelCatalogAdapter } from '../src/native-client/model-catalog-adapter.mjs';
import { LocalAppServer } from '../src/native-client/local-app-server.mjs';
import { ClassicChatAdapter } from '../src/native-client/classic-chat-adapter.mjs';
import { createLocalPersonalizationService, USER_SYSTEM_MESSAGES_STORAGE_KEY } from '../src/native-client/local-personalization-service.mjs';
import { createPersonalizationIdentityProvider, createPersonalizedSettingsReader } from '../src/native-client/local-personalization-context.mjs';

const base = Object.freeze({ model: 'gpt-6.1-sol', apiBase: 'https://personalization.fixture', apiKey: 'fixture-only', apiTransport: 'responses', customInstructions: 'Existing base instruction.' });
const memory = () => { const values = new Map(); return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; };
const profile = { enabled: true, name_user_message: 'Neutral name 中文', role_user_message: 'Neutral role', traits_model_message: 'Neutral exact format', other_user_message: 'Neutral other instruction' };
const serializedProfile = JSON.stringify(Object.fromEntries(Object.entries(profile).filter(([key]) => key !== 'enabled')));
function ownerEnvironment({ guest = false } = {}) {
  let site = guest ? null : { id: 'site-user:neutral-a', accountId: 'neutral-a' };
  let local = guest ? { accountId: 'guest-fixture', userId: 'guest', accountUserId: 'guest' } : { accountId: 'neutral-a', userId: 'neutral-user-a', accountUserId: 'neutral-user-a' };
  let namespace = guest ? USER_SYSTEM_MESSAGES_STORAGE_KEY + ':guest' : USER_SYSTEM_MESSAGES_STORAGE_KEY + ':account:neutral-a';
  const getIdentity = createPersonalizationIdentityProvider({ getSiteAccount: () => site, getLocalIdentity: () => local, getStorageKey: () => namespace });
  const storage = memory(), service = createLocalPersonalizationService({ storage, getIdentity, getStorageKey: () => namespace });
  const readSettings = createPersonalizedSettingsReader({ readSettings: () => base, personalization: service, getIdentity });
  return { storage, service, getIdentity, readSettings, setSite: value => site = value, setLocal: value => local = value, setNamespace: value => namespace = value };
}
const context = (origin = null, extra = {}) => ({ thread: { adapterMetadata: { classicRootId: 'neutral-classic-root', conversationOrigin: origin, ...extra } }, turn: { adapterMetadata: {} } });
function serverFor(env, { free = false, serverStorage = memory() } = {}) {
  const models = createModelCatalogAdapter(catalog);
  const server = new LocalAppServer({ storage: serverStorage, models, catalog, readSettings: env.readSettings, streamCompletion, getExecutionPolicy: () => ({ modelSelection: !free }), agentOptions: { streamRetries: 0 } });
  return { server, classic: new ClassicChatAdapter({ appServer: server, models }), serverStorage };
}
async function send(classic, { origin = null, conversationId, think = false, expectFailure = false } = {}) {
  const body = { action: 'next', parent_message_id: crypto.randomUUID(), model: (origin ?? (conversationId ? classic.server.getThread(conversationId).adapterMetadata.conversationOrigin : null)) === 'tpp' ? 'gpt-6.1-sol' : 'auto', messages: [{ id: crypto.randomUUID(), author: { role: 'user' }, content: { content_type: 'text', parts: ['Neutral next task.'] }, metadata: {} }], ...(origin ? { conversation_origin: origin } : {}), ...(conversationId ? { conversation_id: conversationId } : {}), ...(think ? { system_hints: ['reason'] } : {}) };
  const response = await classic.handle(new Request('https://personalization.fixture/f/conversation', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }), '/f/conversation');
  assert.equal(response.status, 200); const text = await response.text();
  if (expectFailure) assert.ok(text.includes('Could not read personalization')); else assert.ok(text.includes('[DONE]'));
  return text;
}
async function withHTTPFixture(run) {
  const originalFetch = globalThis.fetch, requests = [];
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), 'https://personalization.fixture/v1/responses');
    const payload = JSON.parse(options.body); requests.push(payload);
    const event = { type: 'response.completed', response: { id: 'neutral-' + requests.length, status: 'completed', model: payload.model, output: [{ type: 'message', id: 'neutral-output-' + requests.length, role: 'assistant', phase: 'final_answer', content: [{ type: 'output_text', text: 'Neutral fixture complete.' }] }] } };
    return new Response('data: ' + JSON.stringify(event) + '\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
  };
  try { await run(requests); } finally { globalThis.fetch = originalFetch; }
}

test('actual Classic Chat and Work requests carry exact field JSON, preserve base settings and use one profile system record', async () => {
  const env = ownerEnvironment(); env.service.patchUserSystemMessages(profile);
  await withHTTPFixture(async requests => {
    const { classic, server } = serverFor(env);
    await send(classic); await send(classic, { origin: 'tpp' });
    assert.equal(requests.length, 2);
    for (const request of requests) {
      assert.equal(request.input[0].role, 'system');
      assert.equal(request.input[0].content, base.customInstructions + '\n\n' + serializedProfile);
      assert.equal(request.input.filter(record => typeof record.content === 'string' && record.content.includes(serializedProfile)).length, 1);
      assert.equal(request.model, ['gpt-6-sol','gpt-6.1-sol'][requests.indexOf(request)]);
    }
    assert.equal([...server.threads.values()].every(thread => thread.turns[0].status === 'completed'), true);
    assert.deepEqual(env.readSettings(), base);
  });
});

test('disabling retains text, removes it from next same-thread request, and re-enabling applies saved text after history reload', async () => {
  const env = ownerEnvironment(); env.service.patchUserSystemMessages(profile);
  await withHTTPFixture(async requests => {
    const first = serverFor(env); await send(first.classic);
    const id = [...first.server.threads.keys()][0];
    env.service.patchUserSystemMessages({ enabled: false });
    await send(first.classic, { conversationId: id });
    assert.equal(requests[1].input[0].content, base.customInstructions);
    assert.equal(JSON.stringify(requests[1]).includes(profile.traits_model_message), false);
    assert.equal(env.service.readUserSystemMessages().traits_model_message, profile.traits_model_message);
    env.service.patchUserSystemMessages({ enabled: true });
    const restored = serverFor(env, { serverStorage: first.serverStorage });
    await send(restored.classic, { conversationId: id });
    assert.equal(requests[2].input[0].content, base.customInstructions + '\n\n' + serializedProfile);
    assert.equal(restored.server.getThread(id).turns.length, 3);
    assert.equal(requests[2].input.filter(row => row.role === 'user').length, 3);
  });
});

test('Free remains 5.6 Luna Instant or explicit medium while the enabled profile has real request effect', async () => {
  const env = ownerEnvironment(); env.service.patchUserSystemMessages(profile);
  await withHTTPFixture(async requests => {
    const { classic } = serverFor(env, { free: true });
    await send(classic); await send(classic, { think: true });
    assert.deepEqual(requests.map(request => [request.model, request.reasoning.effort]), [['gpt-5.6-luna', 'none'], ['gpt-5.6-luna', 'medium']]);
    assert.ok(requests.every(request => request.input[0].content.endsWith(serializedProfile)));
  });
});

test('Codex, Dot, ephemeral RPC default tpp and unknown origins never read the profile or change their instructions', () => {
  let reads = 0;
  const read = createPersonalizedSettingsReader({ readSettings: () => base, getIdentity: () => ({ accountId: 'neutral' }), personalization: { getCustomInstructions() { reads++; throw Error('Excluded surface accessed web profile'); } } });
  const cases = [undefined, {}, { thread: { ephemeral: true, adapterMetadata: { conversationOrigin: 'tpp' } } }, context('codex'), context('dot'), context('unknown'), context(null, { clientMetadata: { localProductSurface: 'codex' } }), { ...context(), turn: { adapterMetadata: { clientMetadata: { conversationOrigin: 'dot' } } } }];
  for (const value of cases) assert.deepEqual(read(value), base);
  assert.equal(reads, 0);
});

test('boot identity refuses late login, replacement account, changed namespace and cleared local identity', () => {
  const guest = ownerEnvironment({ guest: true });
  guest.setSite({ id: 'site-user:neutral-a', accountId: 'neutral-a' });
  guest.setNamespace(USER_SYSTEM_MESSAGES_STORAGE_KEY + ':account:neutral-a');
  assert.equal(guest.getIdentity(), null);
  const env = ownerEnvironment(); env.service.patchUserSystemMessages(profile);
  env.setSite({ id: 'site-user:neutral-b', accountId: 'neutral-b' });
  assert.equal(env.getIdentity(), null); assert.deepEqual(env.readSettings(context()), base);
  env.setSite({ id: 'site-user:neutral-a', accountId: 'neutral-other' }); assert.equal(env.getIdentity(), null);
  env.setSite({ id: 'site-user:neutral-a', accountId: 'neutral-a' });
  env.setNamespace(USER_SYSTEM_MESSAGES_STORAGE_KEY + ':account:neutral-b'); assert.equal(env.getIdentity(), null);
  env.setNamespace(USER_SYSTEM_MESSAGES_STORAGE_KEY + ':account:neutral-a'); env.setLocal(null); assert.equal(env.getIdentity(), null);
});

test('storage faults fail the real turn before HTTP, rather than send a task with silently missing instructions', async () => {
  const env = ownerEnvironment(); env.service.patchUserSystemMessages(profile);
  env.storage.getItem = () => { throw Error('Neutral storage read failure'); };
  await withHTTPFixture(async requests => {
    const { classic, server } = serverFor(env); await send(classic, { expectFailure: true });
    assert.equal(requests.length, 0);
    const turn = [...server.threads.values()][0].turns[0];
    assert.equal(turn.status, 'failed');
    assert.ok(turn.error.message.includes('Could not read personalization'));
    assert.equal(JSON.stringify(turn.error).includes(profile.name_user_message), false);
  });
});

test('guest Classic tasks preserve base settings without reading another account profile', () => {
  let reads = 0;
  const read = createPersonalizedSettingsReader({ readSettings: () => base, getIdentity: () => null, personalization: { getCustomInstructions() { reads++; return 'Forbidden profile'; } } });
  assert.deepEqual(read(context()), base); assert.equal(reads, 0);
});
