import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { createLocalPersonalizationService, USER_SYSTEM_MESSAGES_STORAGE_KEY } from '../src/native-client/local-personalization-service.mjs';
const directory = path.resolve(process.env.PERSONALIZATION_TEST_TMPDIR ?? os.tmpdir());
fs.mkdirSync(directory, { recursive: true });
const root = fs.mkdtempSync(path.join(directory, 'native-personalization-test-'));
after(() => {
  const resolvedRoot = fs.realpathSync(root), resolvedParent = fs.realpathSync(directory);
  if (path.dirname(resolvedRoot) !== resolvedParent || !path.basename(resolvedRoot).startsWith('native-personalization-test-')) throw Error('Unsafe temporary test cleanup target');
  fs.rmSync(resolvedRoot, { recursive: true, force: true });
});
const ADMIN = Object.freeze({ accountId: 'local-admin-account', userId: 'local-admin-user', accountUserId: 'local-admin-owner' });
const FREE_A = Object.freeze({ accountId: 'free-account-a', userId: 'free-user-a', accountUserId: 'free-owner-a' });
const FREE_B = Object.freeze({ accountId: 'free-account-b', userId: 'free-user-b', accountUserId: 'free-owner-b' });
const empty = () => ({ enabled: false, name_user_message: '', role_user_message: '', traits_model_message: '', other_user_message: '' });
function durableStorage(name) {
  const dir = fs.mkdtempSync(path.join(root, name + '-'));
  const file = key => path.join(dir, crypto.createHash('sha256').update(key).digest('hex') + '.json');
  return {
    directory: dir,
    getItem(key) { try { return fs.readFileSync(file(key), 'utf8'); } catch (e) { if (e.code === 'ENOENT') return null; throw e; } },
    setItem(key, value) { const target = file(key), temp = target + '.tmp'; fs.writeFileSync(temp, value, 'utf8'); fs.renameSync(temp, target); },
    removeItem(key) { try { fs.unlinkSync(file(key)); } catch (e) { if (e.code !== 'ENOENT') throw e; } },
  };
}
function fixture(name) {
  const storage = durableStorage(name), diagnostics = [];
  let identity = ADMIN;
  const getIdentity = () => identity;
  const getStorageKey = key => identity?.accountId === ADMIN.accountId ? key : key + ':account:' + identity?.accountId;
  const options = { storage, getIdentity, getStorageKey, onDiagnostic: v => diagnostics.push(v) };
  return { storage, diagnostics, options, key: getStorageKey, service: createLocalPersonalizationService(options), setIdentity(v) { identity = v; }, getIdentity };
}
const req = (method = 'GET', body, options = {}) => new Request('https://replica.example/__codex-api/user_system_messages', { method, ...(body === undefined ? {} : { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }), ...options });
const call = async (f, method, body, options) => { const response = await f.service.handle(req(method, body, options)); return { response, body: await response.json() }; };

test('new owner has the exact empty/off direct native DTO and read does not persist a fabricated default', async () => {
  const f = fixture('empty'), { response, body } = await call(f, 'GET');
  assert.equal(response.status, 200); assert.equal(response.headers.get('Cache-Control'), 'no-store'); assert.deepEqual(body, empty());
  assert.equal(Object.hasOwn(body, 'personality_type_selection'), false); assert.equal(Object.hasOwn(body, 'personality_traits'), false);
  assert.equal(f.storage.getItem(USER_SYSTEM_MESSAGES_STORAGE_KEY), null);
});
test('partial PATCH merges without clearing other fields and a fresh provider reads real disk bytes', async () => {
  const f = fixture('persist');
  await call(f, 'PATCH', { enabled: true, name_user_message: '  Neutral name  ', role_user_message: 'Neutral role' });
  const { response, body } = await call(f, 'PATCH', { traits_model_message: 'Keep this exact neutral preference.\nSecond paragraph.' });
  assert.equal(response.status, 200); assert.equal(body.name_user_message, '  Neutral name  '); assert.equal(body.role_user_message, 'Neutral role');
  const fresh = createLocalPersonalizationService(f.options); assert.deepEqual(fresh.readUserSystemMessages(), body);
  const envelope = JSON.parse(f.storage.getItem(USER_SYSTEM_MESSAGES_STORAGE_KEY)); assert.equal(envelope.version, 1); assert.deepEqual(envelope.owner, ADMIN); assert.deepEqual(envelope.record, body);
});
test('disabled text remains stored; explicit Chat/Work context preserves user text and other surfaces never inherit it', async () => {
  const f = fixture('enabled'); await call(f, 'PATCH', { name_user_message: 'Neutral name', role_user_message: 'Neutral role', traits_model_message: '  Exact user text\n  ', other_user_message: 'Neutral additional text' });
  assert.equal(f.service.getCustomInstructions({ surface: 'chat' }), ''); assert.equal(f.service.getCustomInstructions({ surface: 'work' }), '');
  await call(f, 'PATCH', { enabled: true });
  const expected = { name_user_message: 'Neutral name', role_user_message: 'Neutral role', traits_model_message: '  Exact user text\n  ', other_user_message: 'Neutral additional text' };
  assert.deepEqual(JSON.parse(f.service.getCustomInstructions({ surface: 'chat' })), expected); assert.deepEqual(JSON.parse(f.service.getCustomInstructions({ surface: 'work' })), expected);
  for (const surface of ['codex', 'dot', 'project', undefined]) assert.equal(f.service.getCustomInstructions({ surface }), '');
  assert.equal(f.service.getCustomInstructions(), '');
  await call(f, 'PATCH', { enabled: false }); assert.equal(f.service.getCustomInstructions({ surface: 'chat' }), ''); assert.equal(f.service.readUserSystemMessages().traits_model_message, '  Exact user text\n  ');
});
test('two Free users and admin use independent durable owner records, with the admin base namespace preserved', async () => {
  const f = fixture('owners'); await call(f, 'PATCH', { enabled: true, traits_model_message: 'Admin neutral record' });
  f.setIdentity(FREE_A); assert.deepEqual((await call(f, 'GET')).body, empty()); await call(f, 'PATCH', { enabled: true, traits_model_message: 'Free A neutral record' });
  f.setIdentity(FREE_B); assert.deepEqual((await call(f, 'GET')).body, empty()); await call(f, 'PATCH', { enabled: true, traits_model_message: 'Free B neutral record' });
  for (const [owner, value] of [[ADMIN, 'Admin neutral record'], [FREE_A, 'Free A neutral record'], [FREE_B, 'Free B neutral record']]) {
    f.setIdentity(owner); assert.deepEqual(JSON.parse(createLocalPersonalizationService(f.options).getCustomInstructions({ surface: 'chat' })), { traits_model_message: value });
  }
  assert.equal(JSON.parse(f.storage.getItem(USER_SYSTEM_MESSAGES_STORAGE_KEY)).record.traits_model_message, 'Admin neutral record');
});
test('unknown base-style catalog/impression routes and methods stay unimplemented instead of claiming an invented service', async () => {
  const f = fixture('catalog');
  for (const [method, endpoint] of [['GET', 'personality_types'], ['POST', 'personality_settings_impression'], ['POST', 'user_system_messages'], ['PATCH', 'personality_trait_types']]) {
    assert.equal(await f.service.handle(new Request('https://replica.example/' + endpoint, { method })), null);
  }
});
test('strict field/type validation rejects arrays, null, unknown personality keys and non-string text without touching storage', async () => {
  const f = fixture('validate'); await call(f, 'PATCH', { traits_model_message: 'Old neutral text' }); const before = f.storage.getItem(USER_SYSTEM_MESSAGES_STORAGE_KEY);
  for (const value of [[], null, true, 'text', { personality_type_selection: 'guessed-key' }, { personality_traits: [] }, { enabled: 1 }, { name_user_message: null }, { other_user_message: false }, { traits_model_message: 7 }, { '__proto__': null, unsupported: true }]) {
    const result = await call(f, 'PATCH', value); assert.equal(result.response.status, 400); assert.equal(f.storage.getItem(USER_SYSTEM_MESSAGES_STORAGE_KEY), before);
  }
});
test('1500 UTF-16 code units match the source length contract for every field and astral Unicode', async () => {
  const f = fixture('length');
  for (const field of ['name_user_message', 'role_user_message', 'traits_model_message', 'other_user_message']) {
    assert.equal((await call(f, 'PATCH', { [field]: '中'.repeat(1500) })).response.status, 200);
    const before = f.storage.getItem(USER_SYSTEM_MESSAGES_STORAGE_KEY), result = await call(f, 'PATCH', { [field]: '中'.repeat(1501) });
    assert.equal(result.response.status, 422); assert.equal(result.body.error.field, field); assert.equal(f.storage.getItem(USER_SYSTEM_MESSAGES_STORAGE_KEY), before);
  }
  assert.equal((await call(f, 'PATCH', { name_user_message: '😀'.repeat(750) })).response.status, 200);
  assert.equal((await call(f, 'PATCH', { name_user_message: '😀'.repeat(751) })).response.status, 422);
});
test('malformed JSON and arbitrary account headers do not write or expose a record', async () => {
  const f = fixture('requests'); await call(f, 'PATCH', { traits_model_message: 'Private neutral fixture marker' });
  const before = f.storage.getItem(USER_SYSTEM_MESSAGES_STORAGE_KEY);
  const invalid = await f.service.handle(new Request('https://replica.example/user_system_messages', { method: 'PATCH', body: '{broken', headers: { 'Content-Type': 'application/json' } })); assert.equal(invalid.status, 400);
  for (const method of ['GET', 'PATCH']) {
    const denied = await call(f, method, method === 'PATCH' ? { enabled: true } : undefined, { headers: { 'ChatGPT-Account-ID': FREE_A.accountId } });
    assert.equal(denied.response.status, 403); assert.equal(JSON.stringify(denied.body).includes('Private neutral fixture marker'), false);
  }
  assert.equal(f.storage.getItem(USER_SYSTEM_MESSAGES_STORAGE_KEY), before);
});
test('no active owner is denied, and a bad namespace cannot expose another owner envelope', async () => {
  const f = fixture('identity'); await call(f, 'PATCH', { traits_model_message: 'Admin-only neutral marker' });
  f.setIdentity(null); assert.equal((await call(f, 'GET')).response.status, 401);
  f.setIdentity(FREE_A); const collision = createLocalPersonalizationService({ ...f.options, getStorageKey: () => USER_SYSTEM_MESSAGES_STORAGE_KEY });
  const response = await collision.handle(req()); assert.equal(response.status, 409); assert.equal(JSON.stringify(await response.json()).includes('Admin-only neutral marker'), false);
});
test('identity change while a PATCH body is arriving is rejected before a storage write', async () => {
  const f = fixture('body-change'); let controller;
  const body = new ReadableStream({ start(value) { controller = value; } });
  const request = new Request('https://replica.example/user_system_messages', { method: 'PATCH', body, duplex: 'half', headers: { 'Content-Type': 'application/json' } });
  const promise = f.service.handle(request); f.setIdentity(FREE_A); controller.enqueue(new TextEncoder().encode('{"traits_model_message":"Late old-owner neutral write"}')); controller.close();
  const response = await promise; assert.equal(response.status, 409); assert.equal(f.storage.getItem(USER_SYSTEM_MESSAGES_STORAGE_KEY), null); assert.deepEqual(f.service.readUserSystemMessages(), empty());
});
test('identity change during storage read aborts rather than returning the previous owner profile', async () => {
  const f = fixture('read-change'); await call(f, 'PATCH', { traits_model_message: 'Old-owner neutral marker' }); let once = true;
  const service = createLocalPersonalizationService({ ...f.options, storage: { ...f.storage, getItem(key) { const value = f.storage.getItem(key); if (once) { once = false; f.setIdentity(FREE_A); } return value; } } });
  const response = await service.handle(req()); assert.equal(response.status, 409); assert.equal(JSON.stringify(await response.json()).includes('Old-owner neutral marker'), false);
});
test('storage refusal before commit returns an honest failure and preserves original disk bytes', async () => {
  const f = fixture('write-refused'); await call(f, 'PATCH', { traits_model_message: 'Original neutral text' }); const old = f.storage.getItem(USER_SYSTEM_MESSAGES_STORAGE_KEY);
  const broken = createLocalPersonalizationService({ ...f.options, storage: { ...f.storage, setItem() { throw Error('Storage refused'); } } });
  const response = await broken.handle(req('PATCH', { traits_model_message: 'Must not be echoed as saved' })); assert.equal(response.status, 500); assert.equal(f.storage.getItem(USER_SYSTEM_MESSAGES_STORAGE_KEY), old); assert.equal(f.service.readUserSystemMessages().traits_model_message, 'Original neutral text');
});
test('a store that throws after committing is rolled back, without caching an unsaved echo', async () => {
  const f = fixture('after-commit'); await call(f, 'PATCH', { traits_model_message: 'Original neutral record' }); const old = f.storage.getItem(USER_SYSTEM_MESSAGES_STORAGE_KEY); let once = true;
  const service = createLocalPersonalizationService({ ...f.options, storage: { ...f.storage, setItem(key, value) { f.storage.setItem(key, value); if (once) { once = false; throw Error('Failed after commit'); } } } });
  const response = await service.handle(req('PATCH', { enabled: true, traits_model_message: 'Rollback neutral marker' })); assert.equal(response.status, 500); assert.equal(f.storage.getItem(USER_SYSTEM_MESSAGES_STORAGE_KEY), old); assert.equal(service.readUserSystemMessages().enabled, false);
});
test('owner change inside commit rolls back only the captured namespace and preserves the new owner record', async () => {
  const f = fixture('commit-change'); await call(f, 'PATCH', { traits_model_message: 'Admin original' }); f.setIdentity(FREE_A); await call(f, 'PATCH', { traits_model_message: 'Free A original' }); const freeKey = f.key(USER_SYSTEM_MESSAGES_STORAGE_KEY), freeRaw = f.storage.getItem(freeKey); f.setIdentity(ADMIN); const adminRaw = f.storage.getItem(USER_SYSTEM_MESSAGES_STORAGE_KEY); let once = true;
  const service = createLocalPersonalizationService({ ...f.options, storage: { ...f.storage, setItem(key, value) { f.storage.setItem(key, value); if (once) { once = false; f.setIdentity(FREE_A); } } } });
  const response = await service.handle(req('PATCH', { traits_model_message: 'Wrongly late admin write' })); assert.equal(response.status, 409); assert.equal(f.storage.getItem(freeKey), freeRaw); assert.equal(f.storage.getItem(USER_SYSTEM_MESSAGES_STORAGE_KEY), adminRaw);
});
test('first-write rollback removes a newly created record and does not invent a saved default', async () => {
  const f = fixture('first-failure'); let once = true;
  const service = createLocalPersonalizationService({ ...f.options, storage: { ...f.storage, setItem(key, value) { f.storage.setItem(key, value); if (once) { once = false; throw Error('After first write'); } } } });
  assert.equal((await service.handle(req('PATCH', { traits_model_message: 'Uncommitted first record' }))).status, 500); assert.equal(f.storage.getItem(USER_SYSTEM_MESSAGES_STORAGE_KEY), null);
});
test('corrupt or invalid stored records fail visibly and remain untouched instead of silently resetting', async () => {
  const f = fixture('corrupt');
  for (const raw of ['{bad', JSON.stringify({ version: 2, owner: ADMIN, record: empty() }), JSON.stringify({ version: 1, owner: ADMIN, record: { ...empty(), enabled: 'yes' } }), JSON.stringify({ version: 1, owner: ADMIN, record: { ...empty(), personality_type_selection: 'invented' } })]) {
    f.storage.setItem(USER_SYSTEM_MESSAGES_STORAGE_KEY, raw); const response = await f.service.handle(req()); assert.equal(response.status, 500); assert.equal(f.storage.getItem(USER_SYSTEM_MESSAGES_STORAGE_KEY), raw);
  }
});
test('aborted requests never commit and diagnostics never contain preference text', async () => {
  const f = fixture('abort'); const abort = new AbortController(); abort.abort(); await assert.rejects(f.service.handle(req('PATCH', { traits_model_message: 'Do not persist this marker' }, { signal: abort.signal })), { name: 'AbortError' });
  assert.equal(f.storage.getItem(USER_SYSTEM_MESSAGES_STORAGE_KEY), null);
  await call(f, 'PATCH', { traits_model_message: 'Never log this neutral profile marker' }); assert.equal(JSON.stringify(f.diagnostics).includes('Never log'), false);
});
test('getter is synchronous, skips whitespace-only fields, and never returns a mutable storage reference', async () => {
  const f = fixture('getter'); await call(f, 'PATCH', { enabled: true, name_user_message: '  ', traits_model_message: 'Exact neutral context' });
  const result = f.service.getCustomInstructions({ surface: 'chat' }); assert.equal(typeof result, 'string'); assert.deepEqual(JSON.parse(result), { traits_model_message: 'Exact neutral context' });
  const record = f.service.readUserSystemMessages(); record.traits_model_message = 'Mutated returned object'; assert.deepEqual(JSON.parse(f.service.getCustomInstructions({ surface: 'chat' })), { traits_model_message: 'Exact neutral context' });
});

test('JSON context preserves all four native field associations, escaping and exact Unicode values without extra keys', async () => {
  const f = fixture('json-context');
  const values = {
    name_user_message: 'Name "A"\n中文😀',
    role_user_message: 'Role \\ planner',
    traits_model_message: '{"nested":"this is user text"}\nSecond line',
    other_user_message: '  Keep exact leading and trailing spaces  ',
  };
  await call(f, 'PATCH', { enabled: true, ...values });
  for (const surface of ['chat', 'work']) {
    const context = f.service.getCustomInstructions({ surface });
    assert.deepEqual(JSON.parse(context), values);
    assert.deepEqual(Object.keys(JSON.parse(context)), ['name_user_message', 'role_user_message', 'traits_model_message', 'other_user_message']);
  }
  await call(f, 'PATCH', { name_user_message: '\t \n', role_user_message: '', traits_model_message: '', other_user_message: '   ' });
  assert.equal(f.service.getCustomInstructions({ surface: 'chat' }), '');
  assert.equal(f.service.readUserSystemMessages().name_user_message, '\t \n');
});
