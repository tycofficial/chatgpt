import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { createLocalMapsService, LOCAL_MAPS_WORLD_CENTER } from '../src/native-client/local-maps-service.mjs';

const memory = () => {
  const values = new Map();
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
};
const knownId = 'lbe1_' + 'A'.repeat(24);
const missingId = 'lbe1_' + 'B'.repeat(24);
const actualRecord = () => ({
  entity_id: knownId,
  business: { id: knownId, entity_lookup_id: knownId, name: 'Neutral user-created fixture point', latitude: 0, longitude: 0 },
});
const actualSource = { kind: 'user-created', source: 'protocol fixture; no business database' };
function fixture(extra = {}) {
  const storage = extra.storage ?? memory();
  let id = 'neutral-site-account';
  const create = options => createLocalMapsService({ storage, getAccountId: () => id, ...options });
  return { storage, create, adapter: create(extra), setAccount: value => { id = value; } };
}
async function request(adapter, pathname, method = 'GET') {
  const response = await adapter.handle(new Request('https://neutral.invalid/chatgpt/backend-api' + pathname, { method }), pathname);
  assert.ok(response);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  return { response, body: await response.json() };
}

test('original Maps home gets genuine empty local data and a neutral center without location, prompts or network inference', async () => {
  const env = fixture();
  const home = await request(env.adapter, '/local/home');
  assert.equal(home.response.status, 200);
  assert.deepEqual(home.body.nearby_entities, []);
  assert.deepEqual(home.body.personalized_prompts, []);
  assert.deepEqual(home.body.map_center, { latitude: 0, longitude: 0 });
  assert.equal(home.body.geographic_search_available, false);
  assert.equal(env.storage.values.size, 0);
  assert.equal(env.adapter.source.capturedLocationUsed, false);
  assert.equal(env.adapter.source.syntheticBusinesses, false);
  env.setAccount(null);
  assert.deepEqual((await request(env.adapter, '/local/home')).body.map_center, LOCAL_MAPS_WORLD_CENTER);
  const unsupported = await request(env.adapter, '/local/home', 'POST');
  assert.equal(unsupported.response.status, 405);
  assert.equal(unsupported.response.headers.get('Allow'), 'GET');
  assert.equal(await env.adapter.handle(new Request('https://neutral.invalid/local/other'), '/local/other'), null);
});

test('only actually saved source-backed local entities exist, and they survive refresh with exact native identity', async () => {
  const env = fixture();
  assert.equal((await request(env.adapter, '/local/entities/' + knownId)).response.status, 404);
  const record = actualRecord();
  const saved = env.adapter.saveEntityRecord(record, actualSource);
  assert.deepEqual(saved.business, record.business);
  assert.equal(saved.business.rating, undefined);
  assert.equal(saved.business.address, undefined);
  assert.equal(saved.business.image_urls, undefined);
  const restored = (await request(env.create(), '/local/entities/' + knownId)).body;
  assert.equal(restored.entity_id, knownId);
  assert.equal(restored.business.id, knownId);
  assert.equal(restored.business.entity_lookup_id, knownId);
  assert.deepEqual(restored.local_provenance, actualSource);
  assert.equal((await request(env.adapter, '/local/entities/' + missingId)).response.status, 404);
  assert.equal((await request(env.adapter, '/local/entities/invalid-id')).response.status, 404);
  assert.equal((await request(env.adapter, '/local/entities/%ZZ')).response.status, 404);
  assert.deepEqual((await request(env.adapter, '/local/home')).body.nearby_entities, [], 'Stored facts are not invented nearby recommendations');
  env.setAccount('another-neutral-account');
  assert.equal((await request(env.adapter, '/local/entities/' + knownId)).response.status, 404);
  env.setAccount(null);
  assert.throws(() => env.adapter.saveEntityRecord(record, actualSource), error => error.status === 401);
  env.setAccount('neutral-site-account');
  assert.equal(env.create().removeEntityRecord(knownId), true);
  assert.equal((await request(env.adapter, '/local/entities/' + knownId)).response.status, 404);
});

test('map record writes reject missing provenance, mismatched identities and invalid centers without changing storage', async () => {
  const env = fixture();
  const wrong = actualRecord();
  wrong.business.id = missingId;
  assert.throws(() => env.adapter.saveEntityRecord(wrong, actualSource), error => error.status === 422);
  assert.throws(() => env.adapter.saveEntityRecord(actualRecord()), error => error.code === 'LOCAL_MAP_ENTITY_SOURCE_REQUIRED');
  assert.throws(() => env.adapter.setMapCenter({ latitude: 91, longitude: 0 }));
  assert.equal(env.storage.values.size, 0);
  const explicit = { latitude: 1.25, longitude: -2.5 };
  env.adapter.setMapCenter(explicit);
  assert.deepEqual((await request(env.create(), '/local/home')).body.map_center, explicit);
  env.setAccount('another-neutral-account');
  assert.deepEqual((await request(env.adapter, '/local/home')).body.map_center, LOCAL_MAPS_WORLD_CENTER);
});

test('quota failure and damaged map storage never pretend saved data or a successful empty fallback', async () => {
  const base = memory();
  let deny = false;
  const storage = { ...base, setItem(key, value) { if (deny) throw Error('quota'); base.setItem(key, value); } };
  const env = fixture({ storage });
  env.adapter.saveEntityRecord(actualRecord(), actualSource);
  const before = new Map(base.values);
  deny = true;
  assert.throws(() => env.adapter.setMapCenter({ latitude: 10, longitude: 10 }), error => error.status === 507);
  assert.throws(() => env.adapter.removeEntityRecord(knownId), error => error.status === 507);
  assert.deepEqual(base.values, before);
  assert.equal((await request(env.adapter, '/local/entities/' + knownId)).response.status, 200);
  deny = false;
  const key = [...base.values.keys()][0];
  base.values.set(key, '{damaged');
  assert.equal((await request(env.adapter, '/local/home')).response.status, 500);
  assert.equal(base.values.get(key), '{damaged');
  const unavailable = env.create({ storage: { getItem() { throw Error('blocked'); } } });
  assert.equal((await request(unavailable, '/local/home')).response.status, 503);
});

test('a real attached map reader must return the requested identity and cannot cross an account switch', async () => {
  const env = fixture();
  const supplied = env.create({ readEntity: async id => id === knownId ? actualRecord() : null });
  assert.equal((await request(supplied, '/local/entities/' + knownId)).body.business.name, actualRecord().business.name);
  assert.equal((await request(supplied, '/local/entities/' + missingId)).response.status, 404);
  const mismatch = env.create({ readEntity: async () => ({ entity_id: missingId, business: { ...actualRecord().business, id: missingId, entity_lookup_id: missingId } }) });
  assert.equal((await request(mismatch, '/local/entities/' + knownId)).response.status, 502);
  const failed = env.create({ readEntity: async () => { throw Error('Real provider unavailable'); } });
  assert.equal((await request(failed, '/local/entities/' + knownId)).response.status, 500);
  const switched = env.create({ readEntity: async () => { env.setAccount('different-account'); return actualRecord(); } });
  assert.equal((await request(switched, '/local/entities/' + knownId)).response.status, 409);
});

test('the actual original sm3b home/shared query code consumes local service responses and treats unknown entities as 404', async () => {
  const file = 'async/297551.0d77275a5e.js';
  const ranges = [
    {"id":"aL","start":28287,"end":30161,"sha256":"14b39c7862bee3524606557051bab3cdfc8e8bef5b9aabc623041f8688f51b94"},
    {"id":"aM","start":30163,"end":30635,"sha256":"022e4f36d57ed70f0d491166f7746f24f7c676169238f9f3fa4a5f1881d272cf"},
    {"id":"cb","start":69705,"end":70352,"sha256":"9623db1b4703ba505d1ce889ac28a583ed2af340913f71a2ba5093716683c1f7"},
  ];
  const original = await fs.readFile(new URL('../original-client/public/chatgpt.com/cdn/assets/' + file, import.meta.url), 'utf8');
  const env = fixture();
  const calls = [];
  class FetchError extends Error {
    constructor(status) { super('fixture HTTP ' + status); this.status = status; }
  }
  const context = vm.createContext({
    r: { f: 'account', k: 'user', p: 'authenticated' }, s: { a: 'guest' },
    aI: { a: 'locale' }, R: { c: () => ({}) }, ca: { FetchError },
    aJ: { a: '/local/home' },
    aK: { safeParse: () => { throw Error('No fabricated nearby business should reach parsing'); } },
    aF: { v: () => { throw Error('No invented nearby business should be normalized'); } },
    aH: { Request: { async safeGet(path, options) {
      calls.push({ path, options });
      const resolved = path.replace('{entity_id}', options.parameters?.path?.entity_id ?? '');
      const actual = await request(env.adapter, resolved);
      if (!actual.response.ok) throw new FetchError(actual.response.status);
      return actual.body;
    } } },
  });
  const queryDefinitions = {};
  for (const range of ranges) {
    const source = original.slice(range.start, range.end);
    assert.equal(createHash('sha256').update(source).digest('hex'), range.sha256);
    queryDefinitions[range.id] = new vm.Script('(' + source + ')', { filename: file + '#' + range.id }).runInContext(context, { timeout: 1000 });
  }
  context.aM = queryDefinitions.aM;
  const get = key => ({ account: 'neutral-site-account', user: 'neutral-site-user', authenticated: true, guest: false, locale: { locale: 'zh-CN' } })[key];
  const signal = new AbortController().signal;
  const nativeHome = queryDefinitions.aL('neutral-query-key', { get });
  const home = await nativeHome.queryFn({ signal });
  assert.deepEqual(Array.from(home.cards), []);
  assert.deepEqual(Array.from(home.places), []);
  assert.deepEqual(home.mapCenter, { latitude: 0, longitude: 0 });
  assert.equal(calls[0].path, '/local/home');
  assert.equal(calls[0].options.additionalHeaders['ChatGPT-Account-ID'], 'neutral-site-account');
  assert.equal(calls[0].options.additionalHeaders['oai-language'], 'zh-CN');
  assert.equal(calls.length, 1, 'Empty genuine local suggestions must not trigger translation or recommendation requests');
  const unknown = queryDefinitions.cb(missingId, { get });
  assert.equal(await unknown.queryFn({ signal }), null);
  env.adapter.saveEntityRecord(actualRecord(), actualSource);
  const saved = await queryDefinitions.cb(knownId, { get }).queryFn({ signal });
  assert.equal(saved.id, knownId);
  assert.equal(saved.entity_lookup_id, knownId);
  const count = calls.length;
  assert.equal(await queryDefinitions.cb('invalid-id', { get }).queryFn({ signal }), null);
  assert.equal(calls.length, count, 'Original code rejects malformed entity lookups before requesting');
});
