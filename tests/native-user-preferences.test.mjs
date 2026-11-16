import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const identitySource = fs.readFileSync(new URL('../src/native-client/local-identity.mjs', import.meta.url), 'utf8');
const preferencesSource = fs.readFileSync(new URL('../src/native-client/local-user-preferences.mjs', import.meta.url), 'utf8');
const baseKey = 'original-client-prototype-user-preferences:v1';
const clock = 1800000000000;
const admin = { id: 'site-admin', username: 'Fixture Admin', role: 'administrator', planType: 'pro', createdAt: clock - 10000 };
const free = uuid => ({ id: 'site-user:' + uuid, accountId: uuid, username: 'Fixture Free', role: 'user', planType: 'free', createdAt: clock - 10000 });
const first = free('66666666-6666-4666-8666-666666666666');
const second = free('77777777-7777-4777-8777-777777777777');
const accountKey = account => account === admin ? baseKey : account ? baseKey + ':account:' + account.accountId : baseKey + ':guest';
const empty = () => ({ settings: {}, announcements: {}, eligible_announcements: [], flags: {} });
const plain = value => JSON.parse(JSON.stringify(value));

// Exercise the actual identity namespace implementation and preference module in
// fresh realms. Only ESM declarations are adapted; no namespace function is
// reimplemented or mocked, and no browser/account service is contacted.
function fixture(initial, values = new Map(), options = {}) {
  let account = initial, reads = 0, writes = 0;
  const storage = {
    getItem(key) { reads++; options.beforeGet?.(key); if (options.readError) throw options.readError; return values.get(key) ?? null; },
    setItem(key, value) { writes++; if (options.writeError) throw options.writeError; values.set(key, value); options.afterSet?.(key); },
  };
  const context = vm.createContext({ getSiteAccount: () => account, URL, Date: class extends Date { static now() { return clock; } }, location: { href: 'https://fixture.invalid/chatgpt/', origin: 'https://fixture.invalid' }, sessionStorage: { getItem: () => options.localSession ? '1' : null, setItem() {} }, localStorage: storage });
  const script = source => source.replace(/^import .*;\r?$/gm, '').replace(/^export\s+/gm, '').replaceAll('import.meta.url', JSON.stringify('https://fixture.invalid/chatgpt/native-client/local-identity.mjs'));
  new vm.Script(script(identitySource), { filename: 'local-identity.mjs (actual isolated module)' }).runInContext(context);
  if ('accountBeforePreferences' in options) account = options.accountBeforePreferences;
  new vm.Script(script(preferencesSource) + '\nglobalThis.preferences = { readLocalUserPreferences, updateLocalUserPreference, acknowledgeLocalAnnouncement };', { filename: 'local-user-preferences.mjs (actual isolated module)' }).runInContext(context);
  return { api: context.preferences, values, options, setAccount: value => { account = value; }, clearSession: () => context.clearPrototypeLocalSession({ reload: false }), reads: () => reads, writes: () => writes, namespace: () => context.getLocalAccountStorageKey(baseKey) };
}

test('administrator keeps the exact legacy key, DTO, existing settings and announcement history', () => {
  const stored = { settings: { chat_theme: 'purple', enter_key_behavior: 'newline' }, announcements: { earlier: 123 }, retainedMetadata: { version: 1 } };
  const values = new Map([[baseKey, JSON.stringify(stored)]]), f = fixture(admin, values);
  assert.equal(f.namespace(), baseKey);
  assert.deepEqual(plain(f.api.readLocalUserPreferences()), { ...empty(), settings: stored.settings, announcements: stored.announcements });
  assert.deepEqual(plain(f.api.updateLocalUserPreference('chat_theme', 'blue')), { chat_theme: 'blue', enter_key_behavior: 'newline' });
  assert.deepEqual(plain(f.api.acknowledgeLocalAnnouncement('new-announcement')), { earlier: 123, 'new-announcement': clock });
  assert.equal(values.size, 1);
  assert.deepEqual(JSON.parse(values.get(baseKey)).retainedMetadata, stored.retainedMetadata);
});

test('two registered Free users and guest persist independently without ever migrating administrator data', () => {
  const adminRaw = JSON.stringify({ settings: { chat_theme: 'purple' }, announcements: { 'admin-only': 1 } });
  const values = new Map([[baseKey, adminRaw]]);
  const a = fixture(first, values), b = fixture(second, values), guest = fixture(null, values);
  for (const f of [a, b, guest]) assert.deepEqual(plain(f.api.readLocalUserPreferences()), empty());
  a.api.updateLocalUserPreference('chat_theme', 'blue'); a.api.acknowledgeLocalAnnouncement('first-only');
  b.api.updateLocalUserPreference('chat_theme', 'green'); b.api.acknowledgeLocalAnnouncement('second-only');
  guest.api.updateLocalUserPreference('chat_theme', 'orange'); guest.api.acknowledgeLocalAnnouncement('guest-only');
  assert.equal(values.get(baseKey), adminRaw);
  assert.deepEqual([...values.keys()].sort(), [baseKey, accountKey(first), accountKey(second), accountKey(null)].sort());
  for (const [owner, theme, announcement] of [[first, 'blue', 'first-only'], [second, 'green', 'second-only'], [null, 'orange', 'guest-only']]) {
    const restored = fixture(owner, values).api.readLocalUserPreferences();
    assert.deepEqual(plain(restored), { settings: { chat_theme: theme }, announcements: { [announcement]: clock }, eligible_announcements: [], flags: {} });
  }
  assert.equal(fixture(admin, values).api.readLocalUserPreferences().settings.chat_theme, 'purple');
});

test('an old administrator or Free module cannot read or write after another account replaces or clears its identity', () => {
  for (const [initial, replacement] of [[admin, first], [first, second], [first, admin], [admin, null], [first, null], [null, admin], [null, first]]) {
    const values = new Map([[accountKey(initial), JSON.stringify({ settings: { chat_theme: 'purple' }, announcements: { earlier: 1 } })]]);
    const f = fixture(initial, values), before = [...values]; f.setAccount(replacement);
    // The real identity module intentionally retains its boot-bound namespace.
    assert.equal(f.namespace(), accountKey(initial));
    assert.deepEqual(plain(f.api.readLocalUserPreferences()), empty());
    for (const mutate of [() => f.api.updateLocalUserPreference('chat_theme', 'blue'), () => f.api.acknowledgeLocalAnnouncement('later')]) {
      assert.throws(mutate, error => error.status === 409 && error.code === 'LOCAL_PREFERENCES_ACCOUNT_CHANGED');
    }
    assert.deepEqual([...values], before); assert.equal(f.writes(), 0);
  }
});

test('an identity cleared during a read yields neutral bootstrap data and prevents either mutation', () => {
  for (const operation of ['read', 'patch', 'ack']) {
    const values = new Map([[baseKey, JSON.stringify({ settings: { chat_theme: 'purple' }, announcements: { earlier: 1 } })]]);
    const f = fixture(admin, values), before = [...values]; f.options.beforeGet = () => f.setAccount(null);
    if (operation === 'read') assert.deepEqual(plain(f.api.readLocalUserPreferences()), empty());
    else assert.throws(() => operation === 'patch' ? f.api.updateLocalUserPreference('chat_theme', 'blue') : f.api.acknowledgeLocalAnnouncement('later'), error => error.status === 409);
    assert.deepEqual([...values], before); assert.equal(f.writes(), 0);
  }
});

test('a late-loaded preference module cannot inherit an identity namespace belonging to the previous account', () => {
  for (const [initial, replacement] of [[admin, null], [admin, first], [first, second], [null, admin], [null, first]]) {
    const values = new Map([[accountKey(initial), JSON.stringify({ settings: { chat_theme: 'purple' }, announcements: { earlier: 1 } })]]);
    const before = [...values], f = fixture(initial, values, { accountBeforePreferences: replacement, localSession: true });
    assert.deepEqual(plain(f.api.readLocalUserPreferences()), empty());
    assert.throws(() => f.api.updateLocalUserPreference('chat_theme', 'blue'), error => error.status === 409);
    assert.throws(() => f.api.acknowledgeLocalAnnouncement('later'), error => error.status === 409);
    assert.deepEqual([...values], before); assert.equal(f.reads(), 0); assert.equal(f.writes(), 0);
  }
});

test('clearing the original local-session identity blocks the old authenticated provider even before its verified account is removed', () => {
  const values = new Map([[baseKey, JSON.stringify({ settings: { chat_theme: 'purple' } })]]), before = [...values], f = fixture(admin, values);
  f.clearSession();
  assert.deepEqual(plain(f.api.readLocalUserPreferences()), empty());
  assert.throws(() => f.api.updateLocalUserPreference('chat_theme', 'blue'), error => error.status === 409);
  assert.deepEqual([...values], before); assert.equal(f.reads(), 0); assert.equal(f.writes(), 0);
});

test('an account change triggered while serializing a value cannot copy old state into the new account', () => {
  const values = new Map([[accountKey(first), JSON.stringify({ settings: { chat_theme: 'blue' }, announcements: { earlier: 1 } })], [accountKey(second), JSON.stringify({ settings: { chat_theme: 'green' } })]]);
  const f = fixture(first, values), before = [...values];
  const value = { toJSON() { f.setAccount(second); return 'new-value'; } };
  assert.throws(() => f.api.updateLocalUserPreference('fixture', value), error => error.status === 409);
  assert.deepEqual([...values], before); assert.equal(f.writes(), 0);
});

test('the read fallback remains neutral for missing, unavailable, malformed or non-object storage', () => {
  for (const raw of [undefined, '{', 'null', '[]', 'false', '"invalid"']) {
    const values = new Map(raw === undefined ? [] : [[accountKey(first), raw]]), f = fixture(first, values), before = [...values];
    assert.deepEqual(plain(f.api.readLocalUserPreferences()), empty()); assert.deepEqual([...values], before); assert.equal(f.writes(), 0);
  }
  const f = fixture(first, new Map(), { readError: Error('Fixture storage is unavailable') });
  assert.deepEqual(plain(f.api.readLocalUserPreferences()), empty()); assert.equal(f.writes(), 0);
});

test('failed storage reads or writes propagate their real error and preserve prior bytes without a successful mutation result', () => {
  for (const operation of ['patch', 'ack']) for (const failure of ['readError', 'writeError']) {
    const original = JSON.stringify({ settings: { chat_theme: 'blue' }, announcements: { earlier: 1 } });
    const values = new Map([[accountKey(first), original]]), error = Error('Fixture ' + failure), f = fixture(first, values, { [failure]: error });
    assert.throws(() => operation === 'patch' ? f.api.updateLocalUserPreference('chat_theme', 'green') : f.api.acknowledgeLocalAnnouncement('later'), actual => actual === error);
    assert.equal(values.get(accountKey(first)), original); assert.equal(values.size, 1);
    assert.equal(f.writes(), failure === 'readError' ? 0 : 1);
  }
});

test('malformed saved JSON and unserializable values cannot overwrite existing preferences', () => {
  const broken = fixture(first, new Map([[accountKey(first), '{']]));
  assert.throws(() => broken.api.updateLocalUserPreference('chat_theme', 'green'), /JSON|Expected property/);
  assert.throws(() => broken.api.acknowledgeLocalAnnouncement('later'), /JSON|Expected property/);
  assert.equal(broken.values.get(accountKey(first)), '{'); assert.equal(broken.writes(), 0);
  const raw = JSON.stringify({ settings: { chat_theme: 'blue' } }), circular = {}; circular.self = circular;
  const f = fixture(first, new Map([[accountKey(first), raw]]));
  assert.throws(() => f.api.updateLocalUserPreference('fixture', circular), /circular/i);
  assert.equal(f.values.get(accountKey(first)), raw); assert.equal(f.writes(), 0);
});

test('a storage implementation revoking the owner while committing is never reported as success and never receives a different account key', () => {
  const values = new Map([[accountKey(second), JSON.stringify({ settings: { chat_theme: 'green' } })]]), f = fixture(first, values);
  f.options.afterSet = key => { assert.equal(key, accountKey(first)); f.setAccount(second); };
  assert.throws(() => f.api.updateLocalUserPreference('chat_theme', 'blue'), error => error.status === 409);
  assert.equal(JSON.parse(values.get(accountKey(second))).settings.chat_theme, 'green');
  assert.equal(JSON.parse(values.get(accountKey(first))).settings.chat_theme, 'blue');
});

test('invalid public mutation inputs make no storage changes', () => {
  const f = fixture(first);
  assert.throws(() => f.api.updateLocalUserPreference('../foreign', true), /Invalid local preference key/);
  assert.throws(() => f.api.acknowledgeLocalAnnouncement(''), /Announcement ID is required/);
  assert.equal(f.reads(), 0); assert.equal(f.writes(), 0); assert.equal(f.values.size, 0);
});
