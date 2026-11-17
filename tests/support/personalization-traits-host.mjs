import assert from 'node:assert/strict';
import { createLocalPersonalizationService, USER_SYSTEM_MESSAGES_STORAGE_KEY } from '../../src/native-client/local-personalization-service.mjs';
import { createPersonalizationIdentityProvider, createPersonalizedSettingsReader } from '../../src/native-client/local-personalization-context.mjs';
import { LocalAppServer } from '../../src/native-client/local-app-server.mjs';
import { ClassicChatAdapter } from '../../src/native-client/classic-chat-adapter.mjs';
import { createModelCatalogAdapter } from '../../src/native-client/model-catalog-adapter.mjs';
import { streamCompletion } from '../../runtime.js';
import * as catalog from '../../model-catalog.js';

// A separate neutral Node process supplies the real Web Storage implementation
// and a unique --localstorage-file. This is not a physical-browser assertion.
const actualStorage = globalThis.localStorage;
assert.equal(actualStorage.constructor.name, 'Storage');
const A = Object.freeze({ accountId: 'traits-neutral-admin', userId: 'traits-neutral-user-a', accountUserId: 'traits-neutral-owner-a' });
const B = Object.freeze({ accountId: 'traits-neutral-free', userId: 'traits-neutral-user-b', accountUserId: 'traits-neutral-owner-b' });
let identity = A;
const keyFor = (key, owner = identity) => owner.accountId === A.accountId ? key : key + ':account:' + owner.accountId;
const storage = { getItem: key => actualStorage.getItem(key), setItem: (key, value) => actualStorage.setItem(key, value), removeItem: key => actualStorage.removeItem(key) };
const diagnostics = [];
const options = { storage, getIdentity: () => identity, getStorageKey: keyFor, onDiagnostic: event => diagnostics.push(event) };
const service = createLocalPersonalizationService(options);
const raw = owner => actualStorage.getItem(keyFor(USER_SYSTEM_MESSAGES_STORAGE_KEY, owner));
const empty = () => ({ enabled: false, name_user_message: '', role_user_message: '', traits_model_message: '', other_user_message: '' });
const texts = { name_user_message: 'Neutral name 中文🙂', role_user_message: 'Neutral role', traits_model_message: 'Exact neutral user text\nLine two.', other_user_message: 'Neutral other preference' };
const makeRequest = (method, body, endpoint = 'user_system_messages', headers = {}) => new Request('https://traits.fixture/__codex-api/' + endpoint, { method, headers: { 'Content-Type': 'application/json', ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
const call = async (method, body, endpoint, headers) => { const response = await service.handle(makeRequest(method, body, endpoint, headers)); assert.ok(response); return { response, data: await response.json() }; };
const seed = traits => service.patchUserSystemMessages({ enabled: true, ...texts, ...(traits ? { personality_traits: traits } : {}) });
const traitInstructions = () => service.getRequestInstructions({ surface: 'chat' });
const retained = value => assert.deepEqual(Object.fromEntries(Object.keys(texts).map(key => [key, value[key]])), texts);
const base = Object.freeze({ model: 'gpt-6.1-sol', apiBase: 'https://traits.fixture', apiKey: 'fixture-only', apiTransport: 'responses', customInstructions: 'Existing neutral base instruction.' });
const memory = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; };
function serverEnvironment({ free = false, personal = service } = {}) {
  const getIdentity = createPersonalizationIdentityProvider({ getSiteAccount: () => identity ? { id: 'site-fixture:' + identity.userId, accountId: identity.accountId } : null, getLocalIdentity: () => identity, getStorageKey: key => identity ? keyFor(key) : key + ':guest' });
  const readSettings = createPersonalizedSettingsReader({ readSettings: () => base, personalization: personal, getIdentity });
  const models = createModelCatalogAdapter(catalog), serverStorage = memory();
  const server = new LocalAppServer({ storage: serverStorage, models, catalog, readSettings, streamCompletion, getExecutionPolicy: () => ({ modelSelection: !free }), agentOptions: { streamRetries: 0 } });
  return { server, classic: new ClassicChatAdapter({ appServer: server, models }), readSettings };
}
async function send(classic, { origin, id, think = false } = {}) {
  const body = { action: 'next', parent_message_id: crypto.randomUUID(), model: (origin ?? (id ? classic.server.getThread(id).adapterMetadata.conversationOrigin : null)) === 'tpp' ? 'gpt-6.1-sol' : 'auto', messages: [{ id: crypto.randomUUID(), author: { role: 'user' }, content: { content_type: 'text', parts: ['Neutral current task.'] }, metadata: {} }], ...(origin ? { conversation_origin: origin } : {}), ...(id ? { conversation_id: id } : {}), ...(think ? { system_hints: ['reason'] } : {}) };
  const response = await classic.handle(new Request('https://traits.fixture/f/conversation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), '/f/conversation');
  assert.equal(response.status, 200); return response.text();
}
async function withHTTPFixture(action) {
  const original = globalThis.fetch, requests = [];
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), 'https://traits.fixture/v1/responses', 'No external request or fallback is allowed');
    const request = JSON.parse(init.body); requests.push(request);
    const event = { type: 'response.completed', response: { id: 'traits-response-' + requests.length, status: 'completed', model: request.model, output: [{ type: 'message', id: 'traits-output-' + requests.length, role: 'assistant', phase: 'final_answer', content: [{ type: 'output_text', text: 'Neutral fixture complete.' }] }] } };
    return new Response('data: ' + JSON.stringify(event) + '\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
  };
  try { return await action(requests); } finally { globalThis.fetch = original; }
}

const cases = {
  async catalog() {
    const en = await call('GET', undefined, 'personality_trait_types');
    assert.equal(en.response.status, 200); assert.deepEqual(en.data.trait_types.map(value => value.key), ['warm', 'enthusiastic', 'emoji', 'scannable']);
    for (const row of en.data.trait_types) { assert.equal(row.deprecated, false); assert.deepEqual(row.levels.map(value => value.key), ['less', 'default', 'more']); assert.ok(row.levels.every(value => value.description === '')); }
    const zh = await call('GET', undefined, 'personality_trait_types', { 'OAI-Language': 'zh-CN' }); assert.equal(zh.data.trait_types[0].label, '温暖'); assert.deepEqual(zh.data.trait_types[0].levels.map(value => value.option_label), ['更少', '默认', '更多']);
    const fallback = await call('GET', undefined, 'personality_trait_types', { 'OAI-Language': 'fr-FR' }); assert.deepEqual(fallback.data, en.data);
    assert.equal(raw(), null); assert.equal(service.source.originalPrivatePromptAvailable, false); assert.equal(service.source.personalityCatalogAvailable, false); assert.equal(service.source.traitCatalogAvailable, true);
    for (const [method, endpoint] of [['GET', 'personality_types'], ['POST', 'personality_settings_impression'], ['PATCH', 'personality_trait_types']]) assert.equal(await service.handle(makeRequest(method, undefined, endpoint)), null);
  },
  async partial() {
    seed({ warm: 'more', emoji: 'less' }); const result = await call('PATCH', { enabled: true, personality_traits: { enthusiastic: 'less' } }); assert.equal(result.response.status, 200);
    assert.deepEqual(result.data.personality_traits, { warm: 'more', emoji: 'less', enthusiastic: 'less' }); retained(result.data);
    assert.deepEqual(createLocalPersonalizationService(options).readUserSystemMessages(), result.data);
    const envelope = JSON.parse(raw()); assert.equal(envelope.version, 2); assert.deepEqual(envelope.owner, A); assert.deepEqual(envelope.record, result.data);
  },
  async levels() {
    seed();
    for (const key of ['warm', 'enthusiastic', 'emoji', 'scannable']) for (const level of ['less', 'more', 'default']) {
      assert.equal((await call('PATCH', { enabled: true, personality_traits: { [key]: level } })).response.status, 200);
      assert.equal(createLocalPersonalizationService(options).readUserSystemMessages().personality_traits[key], level);
    }
    assert.equal(traitInstructions(), JSON.stringify(texts));
  },
  async invalid() {
    seed({ warm: 'more' }); const before = raw();
    const invalid = [null, [], 'more', true, { warm: 'high' }, { warm: null }, { warm: 1 }, { friendly: 'more' }, { scannable: 'MORE' }, { warm: {} }, JSON.parse('{"__proto__":"more"}'), { constructor: 'more' }, { toString: 'less' }];
    for (const value of invalid) { assert.equal((await call('PATCH', { personality_traits: value })).response.status, 400); assert.equal(raw(), before); }
    for (const value of [{ personality_type_selection: 'friendly' }, { enabled: true, personality_type_selection: 'Professional' }]) { assert.equal((await call('PATCH', value)).response.status, 400); assert.equal(raw(), before); }
    assert.equal(JSON.stringify(diagnostics).includes(texts.traits_model_message), false);
  },
  async legacy() {
    actualStorage.setItem(USER_SYSTEM_MESSAGES_STORAGE_KEY, JSON.stringify({ version: 1, owner: A, record: { enabled: true, ...texts } }));
    const before = raw(); assert.deepEqual(service.readUserSystemMessages(), { enabled: true, ...texts }); assert.equal(raw(), before); assert.equal(service.getCustomInstructions({ surface: 'chat' }), JSON.stringify(texts));
    await call('PATCH', { personality_traits: { scannable: 'more' } }); const saved = JSON.parse(raw()); assert.equal(saved.version, 2); retained(saved.record); assert.equal(saved.record.personality_traits.scannable, 'more');
    await call('PATCH', { role_user_message: 'New exact role' }); assert.equal(service.readUserSystemMessages().personality_traits.scannable, 'more'); assert.equal(service.readUserSystemMessages().role_user_message, 'New exact role');
  },
  async disabled() {
    seed({ warm: 'more', scannable: 'less' }); const before = service.readUserSystemMessages(); assert.match(traitInstructions(), /warmer/);
    await call('PATCH', { enabled: false }); assert.equal(traitInstructions(), ''); assert.equal(service.getCustomInstructions({ surface: 'chat' }), '');
    assert.deepEqual(service.readUserSystemMessages(), { ...before, enabled: false });
    await call('PATCH', { enabled: true }); assert.match(traitInstructions(), /warmer/); await call('PATCH', { personality_traits: { warm: 'default' } }); assert.doesNotMatch(traitInstructions(), /warmer/); assert.match(traitInstructions(), /connected paragraphs/);
  },
  async persistWrite() { seed({ emoji: 'less', scannable: 'more' }); return { kind: actualStorage.constructor.name, version: JSON.parse(raw()).version }; },
  async persistRead() { const record = service.readUserSystemMessages(); retained(record); assert.equal(record.enabled, true); assert.deepEqual(record.personality_traits, { emoji: 'less', scannable: 'more' }); assert.match(traitInstructions(), /headings/); return { kind: actualStorage.constructor.name, version: JSON.parse(raw()).version }; },
  async owners() {
    seed({ warm: 'more' }); const a = raw(); identity = B; assert.deepEqual(service.readUserSystemMessages(), empty()); seed({ emoji: 'more' }); const b = raw(); assert.notEqual(a, b); identity = A; assert.deepEqual(service.readUserSystemMessages().personality_traits, { warm: 'more' }); identity = B; assert.deepEqual(createLocalPersonalizationService(options).readUserSystemMessages().personality_traits, { emoji: 'more' });
    identity = null; assert.equal((await call('GET', undefined, 'personality_trait_types')).response.status, 401); identity = A;
    for (const endpoint of ['user_system_messages', 'personality_trait_types']) assert.equal((await call('GET', undefined, endpoint, { 'ChatGPT-Account-ID': B.accountId })).response.status, 403);
    let reads = 0;
    const changedDuringCatalog = createLocalPersonalizationService({ ...options, getIdentity() { reads++; if (reads === 2) identity = B; return identity; } });
    const response = await changedDuringCatalog.handle(makeRequest('GET', undefined, 'personality_trait_types', { 'ChatGPT-Account-ID': A.accountId }));
    assert.equal(response.status, 409, 'The original request owner must still match when catalog construction returns');
  },
  async bodyOwner() {
    let controller; const stream = new ReadableStream({ start(value) { controller = value; } });
    const pending = service.handle(new Request('https://traits.fixture/user_system_messages', { method: 'PATCH', body: stream, duplex: 'half' })); identity = B; controller.enqueue(new TextEncoder().encode('{"enabled":true,"personality_traits":{"warm":"more"}}')); controller.close(); assert.equal((await pending).status, 409); assert.equal(raw(A), null); assert.equal(raw(B), null);
  },
  async readOwner() {
    seed({ warm: 'more' }); let once = true;
    const raced = createLocalPersonalizationService({ ...options, storage: { ...storage, getItem(key) { const value = storage.getItem(key); if (once) { once = false; identity = B; } return value; } } });
    assert.throws(() => raced.getRequestInstructions({ surface: 'chat' }), error => error.code === 'PERSONALIZATION_ACCOUNT_CHANGED'); assert.equal(raw(B), null);
  },
  async commitOwner() {
    seed({ warm: 'more' }); const a = raw(); identity = B; seed({ enthusiastic: 'more' }); const b = raw(); identity = A; let once = true;
    const raced = createLocalPersonalizationService({ ...options, storage: { ...storage, setItem(key, value) { storage.setItem(key, value); if (once) { once = false; identity = B; } } } });
    const response = await raced.handle(makeRequest('PATCH', { personality_traits: { emoji: 'more' } })); assert.equal(response.status, 409); assert.equal(raw(A), a); assert.equal(raw(B), b);
  },
  async storageFaults() {
    seed({ warm: 'more' }); const before = raw();
    const refused = createLocalPersonalizationService({ ...options, storage: { ...storage, setItem() { throw Error('Neutral refused write'); } } }); assert.equal((await refused.handle(makeRequest('PATCH', { personality_traits: { emoji: 'less' } }))).status, 500); assert.equal(raw(), before);
    let once = true; const after = createLocalPersonalizationService({ ...options, storage: { ...storage, setItem(key, value) { storage.setItem(key, value); if (once) { once = false; throw Error('Neutral postcommit failure'); } } } });
    assert.equal((await after.handle(makeRequest('PATCH', { personality_traits: { emoji: 'less' } }))).status, 500); assert.equal(raw(), before); assert.deepEqual(service.readUserSystemMessages().personality_traits, { warm: 'more' });
  },
  async firstWriteFault() {
    let once = true; const broken = createLocalPersonalizationService({ ...options, storage: { ...storage, setItem(key, value) { storage.setItem(key, value); if (once) { once = false; throw Error('Neutral first-write failure'); } } } });
    assert.equal((await broken.handle(makeRequest('PATCH', { enabled: true, personality_traits: { warm: 'more' } }))).status, 500); assert.equal(raw(), null);
  },
  async abort() {
    seed({ warm: 'more' }); const before = raw(), stopped = new AbortController(); stopped.abort(); const request = new Request('https://traits.fixture/user_system_messages', { method: 'PATCH', body: JSON.stringify({ personality_traits: { emoji: 'more' } }), signal: stopped.signal }); await assert.rejects(service.handle(request), { name: 'AbortError' }); assert.equal(raw(), before);
    const during = new AbortController(); let once = true; const raced = createLocalPersonalizationService({ ...options, storage: { ...storage, setItem(key, value) { storage.setItem(key, value); if (once) { once = false; during.abort(); } } } });
    await assert.rejects(raced.handle(new Request('https://traits.fixture/user_system_messages', { method: 'PATCH', body: '{"personality_traits":{"warm":"less"}}', signal: during.signal })), { name: 'AbortError' }); assert.equal(raw(), before);
  },
  async corrupt() {
    const invalid = [JSON.stringify({ version: 1, owner: A, record: { ...empty(), personality_traits: { warm: 'more' } } }), JSON.stringify({ version: 2, owner: A, record: empty() }), JSON.stringify({ version: 2, owner: A, record: { ...empty(), personality_traits: { warm: 'invalid' } } }), JSON.stringify({ version: 2, owner: B, record: { ...empty(), personality_traits: { warm: 'more' } } })];
    for (const value of invalid) { actualStorage.setItem(USER_SYSTEM_MESSAGES_STORAGE_KEY, value); const response = await service.handle(makeRequest('GET')); assert.ok([409, 500].includes(response.status)); assert.equal(raw(), value); }
  },
  async copies() {
    seed({ warm: 'more' }); const record = service.readUserSystemMessages(), fetched = service.readPersonalityTraitTypes(); record.personality_traits.warm = 'less'; fetched.trait_types[0].key = 'foreign'; fetched.trait_types[1].levels[0].key = 'invalid';
    assert.equal(service.readUserSystemMessages().personality_traits.warm, 'more'); assert.equal(service.readPersonalityTraitTypes().trait_types[0].key, 'warm'); assert.equal(service.readPersonalityTraitTypes().trait_types[1].levels[0].key, 'less');
  },
  async payloadChatWork() {
    seed({ warm: 'more', enthusiastic: 'less', emoji: 'less', scannable: 'more' });
    return withHTTPFixture(async requests => { const env = serverEnvironment(); await send(env.classic); await send(env.classic, { origin: 'tpp' }); assert.equal(requests.length, 2); for (const request of requests) { const system = request.input[0].content; assert.ok(system.startsWith(base.customInstructions + '\n\n' + JSON.stringify(texts))); assert.match(system, /warmer/); assert.match(system, /calmer/); assert.match(system, /emojis sparingly/); assert.match(system, /headings, lists and tables/); assert.equal(request.model, ['gpt-6-sol','gpt-6.1-sol'][requests.indexOf(request)]); assert.equal(request.input.filter(row => row.role === 'system').length, 1); } return { requests: requests.length, models: requests.map(value => value.model) }; });
  },
  async payloadUpdates() {
    seed({ warm: 'more' });
    return withHTTPFixture(async requests => { const env = serverEnvironment(); await send(env.classic, { origin: 'tpp' }); const id = [...env.server.threads.keys()][0]; await call('PATCH', { enabled: true, personality_traits: { warm: 'less', emoji: 'more' } }); await send(env.classic, { id }); assert.doesNotMatch(requests[1].input[0].content, /warmer/); assert.match(requests[1].input[0].content, /emotionally neutral/); assert.match(requests[1].input[0].content, /slightly more emojis/); await call('PATCH', { enabled: false }); await send(env.classic, { id }); assert.equal(requests[2].input[0].content, base.customInstructions); retained(service.readUserSystemMessages()); assert.deepEqual(service.readUserSystemMessages().personality_traits, { warm: 'less', emoji: 'more' }); assert.equal(env.server.getThread(id).turns.length, 3); return { requests: requests.length, turns: env.server.getThread(id).turns.length }; });
  },
  async payloadFree() {
    identity = B; seed({ scannable: 'less' });
    return withHTTPFixture(async requests => { const env = serverEnvironment({ free: true }); await send(env.classic); await send(env.classic, { think: true }); assert.deepEqual(requests.map(value => [value.model, value.reasoning.effort]), [['gpt-5.6-luna', 'none'], ['gpt-5.6-luna', 'medium']]); assert.ok(requests.every(value => value.input[0].content.includes('connected paragraphs'))); return { requests: requests.length, selections: requests.map(value => [value.model, value.reasoning.effort]) }; });
  },
  async payloadFault() {
    seed({ warm: 'more' }); const broken = createLocalPersonalizationService({ ...options, storage: { ...storage, getItem() { throw Error('Neutral storage unavailable'); } } });
    return withHTTPFixture(async requests => { const env = serverEnvironment({ personal: broken }); const stream = await send(env.classic); assert.ok(stream.includes('Could not read personalization')); assert.equal(requests.length, 0); assert.equal([...env.server.threads.values()][0].turns[0].status, 'failed'); return { requests: 0, localTurnFailed: true }; });
  },
  async surfaces() {
    seed({ warm: 'more' }); const env = serverEnvironment();
    const context = origin => ({ thread: { adapterMetadata: { classicRootId: 'neutral-root', conversationOrigin: origin } }, turn: { adapterMetadata: {} } });
    for (const value of [undefined, {}, context('codex'), context('dot'), context('unknown'), { thread: { adapterMetadata: { conversationOrigin: 'tpp' } } }, { thread: { adapterMetadata: { classicRootId: 'root', clientMetadata: { localProductSurface: 'codex' } } } }]) assert.deepEqual(env.readSettings(value), base);
    for (const surface of ['codex', 'dot', 'unknown', undefined]) assert.equal(service.getRequestInstructions({ surface }), '');
    identity = B; assert.deepEqual(env.readSettings(context(null)), base);
  },
  async singleRead() {
    seed({ warm: 'more' }); let reads = 0; const observed = createLocalPersonalizationService({ ...options, storage: { ...storage, getItem(key) { reads++; return storage.getItem(key); } } });
    const result = observed.getRequestInstructions({ surface: 'chat' }); assert.equal(reads, 1); assert.ok(result.startsWith(JSON.stringify(texts))); assert.match(result, /warmer/);
    assert.equal(service.getCustomInstructions({ surface: 'chat' }), JSON.stringify(texts));
  },
};
const scenario = process.argv[2];
if (!Object.hasOwn(cases, scenario)) throw Error('Unknown neutral scenario');
const details = await cases[scenario]();
console.log('@@RESULT@@' + JSON.stringify({ scenario, pass: true, actualStorage: actualStorage.constructor.name, externalNetwork: false, ...(details ?? {}) }));
