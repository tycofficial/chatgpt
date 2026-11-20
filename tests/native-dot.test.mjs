import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import * as catalog from '../model-catalog.js';
import { createModelCatalogAdapter } from '../src/native-client/model-catalog-adapter.mjs';
import { LocalAppServer, LocalProtocolSocket } from '../src/native-client/local-app-server.mjs';
import { streamCompletion } from '../runtime.js';
import {
  createLocalDotAdapter, createLocalDotCompletion, LOCAL_DOT_DEFAULT_IMAGE_URL, LOCAL_DOT_RESOURCE_BUNDLE,
} from '../src/native-client/local-dot-adapter.mjs';

const memory = () => {
  const values = new Map();
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
};
const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==', 'base64'));
const appearance = { schemaVersion: 1, shape: 'circle', color: 'pink', eyes: 'oval', eyewear: 'none', accessories: [], depth: 1 };
function fixture(options = {}) {
  const storage = options.storage ?? memory();
  const models = createModelCatalogAdapter(catalog);
  const readSettings = () => ({ model: 'gpt-6.1-sol' });
  const appServer = new LocalAppServer({
    storage, models, catalog, readSettings,
    streamCompletion: options.streamCompletion ?? (() => { throw Error('The Dot protocol fixtures have no inference transport'); }),
    getExecutionPolicy: () => ({ modelSelection: true }),
    uuid: randomUUID,
  });
  let identity = { accountId: 'neutral-site-account', userId: 'neutral-site-user' }, local = true;
  const create = extra => createLocalDotAdapter({
    storage, appServer, getIdentity: () => identity,
    isLocalSession: () => local, getCapabilities: () => ({ filesystem: true, pythonExecution: true }),
    uuid: randomUUID, ...extra,
  });
  return {
    storage, appServer, create, adapter: create(options),
    setIdentity: value => { identity = value; }, setLocal: value => { local = value; },
  };
}
async function request(adapter, path, method = 'GET', value) {
  const options = { method };
  if (value !== undefined) {
    options.body = JSON.stringify(value);
    options.headers = { 'Content-Type': 'application/json' };
  }
  const response = await adapter.handle(new Request('https://site.invalid/chatgpt/backend-api' + path, options), path.split('?')[0]);
  assert.ok(response, 'The local Dot route must be handled');
  return { response, data: response.status === 204 ? null : await response.json() };
}
async function upload(adapter, bytes = png, manifest) {
  const form = new FormData();
  form.set('file', new Blob([bytes], { type: 'image/png' }), 'avatar.png');
  if (manifest) form.set('avatar_manifest', JSON.stringify(manifest));
  const response = await adapter.handle(new Request('https://site.invalid/chatgpt/backend-api/cloud-aeons/avatar-snapshots', { method: 'POST', body: form }), '/cloud-aeons/avatar-snapshots');
  return { response, data: await response.json() };
}

test('original Dot list boots exactly one actual persisted shared-server conversation and survives refresh', async () => {
  const env = fixture();
  const pages = await Promise.all([request(env.adapter, '/tbo'), request(env.adapter, '/tbo')]);
  assert.equal(pages[0].response.status, 200);
  const profile = pages[0].data.items[0];
  assert.equal(pages[0].data.items.length, 1);
  assert.equal(pages[1].data.items[0].id, profile.id);
  assert.equal(env.appServer.threads.size, 1);
  assert.equal(profile.active_root_thread_id, profile.root_thread_id);
  assert.equal(profile.status, 'active');
  assert.equal(profile.scope, 'personal');
  assert.equal(profile.aeon_kind, 'orbit');
  assert.equal(profile.avatar, 'sunglasses');
  assert.equal(profile.avatar_url, null);
  assert.equal(profile.avatar_manifest, null);
  assert.equal(env.appServer.getThread(profile.root_thread_id).adapterMetadata.conversationOrigin, 'dot');
  assert.equal(env.appServer.getThread(profile.root_thread_id).model, 'gpt-6.1-terra');
  assert.equal(env.appServer.getThread(profile.root_thread_id).turns.length, 0);
  assert.deepEqual((await request(env.create(), '/tbo')).data, pages[0].data);
  const restored = fixture({ storage: env.storage });
  assert.equal(restored.appServer.getThread(profile.root_thread_id).id, profile.root_thread_id);
  assert.equal((await request(restored.adapter, '/tbo/by-thread/' + profile.root_thread_id)).data.id, profile.id);
  assert.deepEqual((await request(restored.adapter, '/tbo/' + profile.id + '/root-thread')).data, { root_thread_id: profile.root_thread_id });
  assert.equal((await request(restored.adapter, '/tbo/' + profile.id + '/threads')).data.items[0].thread_id, profile.root_thread_id);
});

test('native Dot room sends a single turn, publishes the saved reply and reloads its history for the owner', async t => {
  const inference = [];
  let finish;
  const execution = new Promise(resolve => { finish = resolve; });
  const env = fixture({ streamCompletion: async ({ settings }) => {
    inference.push([settings.model, settings.reasoningEffort]);
    await execution;
    return { content: 'A reply from the isolated fixture.', finish_reason: 'stop' };
  } });
  const profile = (await request(env.adapter, '/tbo')).data.items[0];
  const roomPath = '/messaging/rooms/' + profile.root_thread_id;
  assert.equal((await request(env.adapter, roomPath)).response.status, 404);
  assert.equal((await request(env.adapter, '/tbo/' + profile.id + '/messaging-room', 'POST')).data.messaging_room_id, profile.root_thread_id);
  const room = (await request(env.adapter, roomPath)).data;
  assert.equal(room.type, 'DM');
  assert.equal(room.app_source, 'chatgpt:messaging');
  assert.equal(room.aeon_id, profile.id);
  assert.ok(room.members.some(member => member.account_user_id === 'neutral-site-user'));
  let publish;
  const published = new Promise(resolve => { publish = resolve; });
  t.after(env.adapter.subscribeRoomMessages(publish));
  const sent = { request_id: randomUUID(), content: { text: 'Please write a greeting.' } };
  const first = await request(env.adapter, roomPath + '/messages', 'POST', sent);
  assert.equal(first.response.status, 200);
  assert.equal(first.data.role, 'user');
  assert.equal(first.data.account_user_id, 'neutral-site-user');
  assert.equal(first.data.request_id, sent.request_id);
  assert.deepEqual(first.data.content, sent.content);
  assert.deepEqual((await request(env.adapter, roomPath + '/messages', 'POST', sent)).data, first.data);
  const conflictingCopy = { ...sent, content: { text: 'Different text with the same request ID.' } };
  assert.equal((await request(env.adapter, roomPath + '/messages', 'POST', conflictingCopy)).response.status, 409);
  assert.deepEqual((await request(env.adapter, roomPath + '/messages')).data.items, [first.data]);
  finish();
  const event = await published;
  assert.equal(event.type, 'calpico-message-add');
  assert.equal(event.payload.room_id, profile.root_thread_id);
  const assistant = event.payload.message;
  assert.equal(assistant.role, 'assistant');
  assert.equal(assistant.raw_messages[0].content.parts[0], 'A reply from the isolated fixture.');
  assert.deepEqual(inference, [['gpt-6.1-terra', 'medium']]);
  const restored = fixture({ storage: env.storage });
  const tail = (await request(restored.adapter, roomPath + '/messages?limit=1')).data;
  assert.deepEqual(tail.items, [assistant]);
  assert.equal(tail.prev_cursor, assistant.id);
  const earlier = (await request(restored.adapter, roomPath + '/messages?before=' + tail.prev_cursor)).data;
  assert.deepEqual(earlier.items, [first.data]);
  assert.equal(earlier.next_cursor, first.data.id);
  assert.equal((await request(restored.adapter, roomPath + '/read', 'POST', { last_read_at: assistant.created_at })).response.status, 204);
  assert.equal((await request(restored.adapter, roomPath)).data.last_read_at, assistant.created_at);
  restored.setIdentity({ accountId: 'foreign-account', userId: 'foreign-user' });
  assert.equal((await request(restored.adapter, roomPath)).response.status, 404);
  assert.equal((await request(restored.adapter, roomPath + '/messages')).response.status, 404);
  assert.equal((await request(restored.adapter, roomPath + '/messages', 'POST', sent)).response.status, 404);
});

test('native legacy selection and saved companion snapshots retain visible assets after reopening', async () => {
  const env = fixture();
  const profile = (await request(env.adapter, '/tbo')).data.items[0];
  const path = '/tbo/' + profile.id;
  const key = [...env.storage.values.keys()].find(key => key.startsWith('site-local-dot:v1:'));
  const records = JSON.parse(env.storage.getItem(key));
  Object.assign(records.profiles[0], { avatar_url: LOCAL_DOT_DEFAULT_IMAGE_URL, avatar_manifest: { schema_version: 1, tint: 'pink' } });
  env.storage.setItem(key, JSON.stringify(records));
  const legacy = (await request(env.create(), path)).data;
  assert.equal(legacy.avatar_id, 'sunglasses');
  assert.equal(legacy.avatar_manifest, null);
  assert.equal(legacy.avatar_url, null);
  const changed = (await request(env.adapter, path, 'PATCH', { avatar_id: 'headphones' })).data;
  assert.equal(changed.avatar_id, 'headphones');
  assert.equal(changed.avatar_manifest, null);
  assert.equal((await request(env.create(), path)).data.avatar_id, 'headphones');

  const snapshot = (await upload(env.adapter)).data.snapshot;
  const avatar = { avatar_type: 'codex-pet', avatar_manifest: { pet_id: 'fixture-pet', snapshot }, avatar_url: snapshot.asset_pointer };
  const saved = (await request(env.adapter, path, 'PATCH', avatar)).data;
  assert.equal(saved.avatar_url, snapshot.asset_pointer);
  assert.deepEqual(saved.avatar_manifest, avatar.avatar_manifest);
  const savedRecords = JSON.parse(env.storage.getItem(key));
  savedRecords.profiles[0].avatar_url = null;
  env.storage.setItem(key, JSON.stringify(savedRecords));
  const reloaded = (await request(env.create(), path)).data;
  assert.equal(reloaded.avatar_url, snapshot.asset_pointer);
  assert.deepEqual(reloaded.avatar_manifest, avatar.avatar_manifest);
});

test('native primary selection, profile pagination and original feature-pin DTO persist without invented pin limits', async () => {
  const env = fixture({ bootstrapDefault: false });
  const first = (await request(env.adapter, '/tbo', 'POST', { display_name: 'Local one' })).data;
  const second = (await request(env.adapter, '/tbo', 'POST', { display_name: 'Local two' })).data;
  assert.equal(first.is_primary, true);
  assert.equal(second.is_primary, false);
  const primary = await request(env.adapter, '/tbo/primary', 'PUT', { tbo_id: second.id });
  assert.equal(primary.response.status, 200);
  assert.deepEqual(primary.data.selection, { available: true, aeon_id: second.id });
  assert.equal(primary.data.profile.id, second.id);
  assert.equal(primary.data.profile.is_primary, true);
  const page = (await request(env.adapter, '/tbo?limit=1')).data;
  assert.equal(page.items.length, 1);
  assert.equal(page.cursor, 'local-dot:1');
  const next = (await request(env.adapter, '/tbo?limit=1&cursor=' + page.cursor)).data;
  assert.equal(next.items[0].id, second.id);
  assert.equal(next.items[0].is_primary, true);
  assert.equal(next.cursor, null);
  assert.equal((await request(env.adapter, '/tbo?cursor=not-a-local-cursor')).response.status, 400);
  await request(env.adapter, '/pins/feature/places', 'POST');
  await request(env.adapter, '/pins/feature/places', 'POST');
  const pins = (await request(env.create(), '/pins?item_type=feature')).data;
  assert.equal(pins.length, 1);
  assert.deepEqual(Object.keys(pins[0]).sort(), ['item', 'item_type', 'pinned_at']);
  assert.equal(pins[0].item_type, 'feature');
  assert.deepEqual(pins[0].item, { id: 'places' });
  assert.ok(Number.isFinite(Date.parse(pins[0].pinned_at)));
  assert.equal((await request(env.adapter, '/pins/feature/places', 'DELETE')).response.status, 204);
  assert.deepEqual((await request(env.adapter, '/pins')).data, []);
});

test('original PNG upload -> manifest PATCH -> fresh GET -> download yields the saved bytes and appearance', async () => {
  const env = fixture();
  const profile = (await request(env.adapter, '/tbo')).data.items[0];
  const manifest = { schema_version: 1, resource_bundle_id: LOCAL_DOT_RESOURCE_BUNDLE, appearance };
  const uploaded = await upload(env.adapter, png, manifest);
  assert.equal(uploaded.response.status, 200);
  const snapshot = uploaded.data.snapshot;
  assert.equal(snapshot.schema_version, 1);
  assert.match(snapshot.asset_pointer, /^file-service:\/\/local-dot-avatar-/);
  const savedManifest = { ...manifest, snapshot };
  const result = await request(env.adapter, '/tbo/' + profile.id, 'PATCH', { display_name: 'Saved neutral Dot', avatar_type: 'rendered-interactive', avatar_manifest: savedManifest });
  assert.equal(result.response.status, 200);
  assert.deepEqual(result.data.avatar_manifest, savedManifest);
  const fresh = (await request(env.create(), '/tbo/' + profile.id)).data;
  assert.equal(fresh.display_name, 'Saved neutral Dot');
  assert.deepEqual(fresh.avatar_manifest, savedManifest);
  const id = snapshot.asset_pointer.slice('file-service://'.length);
  const download = await request(env.adapter, '/files/download/' + id);
  assert.equal(download.data.status, 'success');
  assert.equal(download.data.download_url, 'https://site.invalid/chatgpt/backend-api/local-dot/assets/' + id);
  const response = await env.create().handle(new Request(download.data.download_url), '/local-dot/assets/' + id);
  assert.equal(response.headers.get('Content-Type'), 'image/png');
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), png);
});

test('local avatars are account-isolated; malformed images and forged snapshots never produce successful profile writes', async () => {
  const env = fixture();
  const original = (await request(env.adapter, '/tbo')).data.items[0];
  assert.equal((await upload(env.adapter, new Uint8Array([1, 2, 3]))).response.status, 415);
  const attempted = await request(env.adapter, '/tbo/' + original.id, 'PATCH', {
    avatar_type: 'rendered-interactive', avatar_manifest: {
      schema_version: 1, resource_bundle_id: LOCAL_DOT_RESOURCE_BUNDLE, appearance,
      snapshot: { schema_version: 1, asset_pointer: 'file-service://local-dot-avatar-unknown' },
    },
  });
  assert.equal(attempted.response.status, 404);
  assert.deepEqual((await request(env.adapter, '/tbo/' + original.id)).data, original);
  const snapshot = (await upload(env.adapter)).data.snapshot;
  env.setIdentity({ accountId: 'different-account', userId: 'different-user' });
  assert.equal((await request(env.adapter, '/tbo/' + original.id)).response.status, 404);
  assert.equal((await request(env.adapter, '/files/download/' + snapshot.asset_pointer.slice(15))).response.status, 404);
  env.setLocal(false);
  assert.equal((await request(env.adapter, '/tbo')).response.status, 401);
});

test('quota failures preserve stored appearance and corrupted records are reported without overwriting source bytes', async () => {
  const base = memory();
  let deny = false;
  const storage = { ...base, setItem: (key, value) => { if (deny) throw Error('quota exceeded'); base.setItem(key, value); } };
  const env = fixture({ storage });
  const profile = (await request(env.adapter, '/tbo')).data.items[0];
  const before = new Map(base.values);
  deny = true;
  const failed = await request(env.adapter, '/tbo/' + profile.id, 'PATCH', { display_name: 'Must not persist' });
  assert.equal(failed.response.status, 507);
  assert.deepEqual(base.values, before);
  assert.equal((await request(env.adapter, '/tbo/' + profile.id)).data.display_name, profile.display_name);
  assert.equal((await upload(env.adapter)).response.status, 507);
  deny = false;
  const key = [...base.values.keys()].find(value => value.startsWith('site-local-dot:v1:'));
  base.values.set(key, '{damaged');
  assert.equal((await request(env.adapter, '/tbo')).response.status, 500);
  assert.equal(base.values.get(key), '{damaged');
});

test('unsupported shared profiles and invalid manifests do not create orphan threads or fake cloud success', async () => {
  const env = fixture({ bootstrapDefault: false });
  const name = await request(env.adapter, '/tbo/name/validate', 'POST', { name: 'Neutral local Dot' });
  assert.equal(name.data.name, 'Neutral local Dot');
  assert.equal(name.data.provider_moderation, false);
  assert.equal((await request(env.adapter, '/tbo/name/validate', 'POST', { name: 'Bad\nname' })).response.status, 400);
  assert.equal((await request(env.adapter, '/tbo', 'POST', { display_name: 'No cloud', scope: 'shared' })).response.status, 501);
  assert.equal((await request(env.adapter, '/tbo', 'POST', { display_name: 'Invalid avatar', avatar_type: 'rendered-interactive', avatar_manifest: {} })).response.status, 400);
  assert.equal(env.appServer.threads.size, 0);
  const profile = (await request(env.adapter, '/tbo', 'POST', { display_name: 'Real local profile' })).data;
  const paused = await request(env.adapter, '/tbo/' + profile.id + '/runtime/pause', 'POST', {});
  assert.equal(paused.response.status, 501);
  assert.notEqual(paused.data.status, 'applied');
  assert.deepEqual((await request(env.adapter, '/tbo/' + profile.id + '/computers')).data.computers, []);
});

test('account switches during real multipart reading abort storage; native capability atoms retain authentication loading', async () => {
  const env = fixture({ bootstrapDefault: false });
  const submitted = {
    url: 'https://site.invalid/chatgpt/backend-api/cloud-aeons/avatar-snapshots',
    method: 'POST', signal: new AbortController().signal,
    async formData() {
      return { get(name) {
        if (name !== 'file') return null;
        return { type: 'image/png', size: png.length, async arrayBuffer() {
          env.setIdentity({ accountId: 'switched-account', userId: 'switched-user' });
          return png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength);
        } };
      } };
    },
  };
  assert.equal((await env.adapter.handle(submitted, '/cloud-aeons/avatar-snapshots')).status, 409);
  assert.equal(env.storage.values.size, 0);
  env.setIdentity({ accountId: 'neutral-site-account', userId: 'neutral-site-user' });
  const original = { c: { old: 'capability' }, a: {}, d: {}, f: {}, b: () => false, i: () => { throw Error('original account required'); } };
  const inputs = { source: 'account inputs' };
  const requireOriginal = id => id === 'BolX' ? { c: (_scope, evaluate) => evaluate } : id === 'OWtl' ? { a: {} } : { m: inputs };
  const overrides = env.adapter.adaptCapabilityAtoms(original, requireOriginal);
  let auth = { authenticatedAccountId: 'neutral-site-account', authenticatedUserId: 'neutral-site-user', authLoading: true, accountLoading: false };
  const old = { isLoading: false, isError: false, isCapable: false };
  const get = atom => atom === inputs ? auth : atom === original.c ? old : atom({ get });
  assert.equal(get(overrides.c).isCapable, false);
  assert.equal(get(overrides.c).isLoading, true);
  auth = { ...auth, authLoading: false };
  assert.equal(get(overrides.d), true);
  assert.equal(get(overrides.a), true);
  assert.equal(get(overrides.c).openai_cloud_entitlement, false);
  env.setLocal(false);
  assert.equal(get(overrides.c), old);
  assert.equal(overrides.b({}, 'neutral-site-account'), false);
});

test('real original BolX.c/UQAX factory closure invokes Dot policy with one context argument', async () => {
  const fs = await import('node:fs/promises');
  const vm = await import('node:vm');
  const { createHash } = await import('node:crypto');
  const ranges = [{"id":"UQAX","file":"109308.a4430446b5.js","start":29574,"end":30097,"sha256":"e5bdab5723b4a7403f70b58b46d70ac0d27e585b2b4b74bb5bfdca9c6f9c1f41"},{"id":"AvFJ","file":"109308.a4430446b5.js","start":27240,"end":29566,"sha256":"d917bb574a53fef857f896d67087d845a0b688dce98d7116e7eecc10bc6c2d14"},{"id":"fbKo","file":"109308.a4430446b5.js","start":40689,"end":52403,"sha256":"da78512df796cd529c15feacb4ae767c5a4875737c3f5e329b7f6b4f13dbed29"},{"id":"J6iR","file":"109308.a4430446b5.js","start":32824,"end":33712,"sha256":"6342bb90268d51f150ad62b81bfbcfc15991e34b6f15f9a8e33ce2e2b1041b58"},{"id":"KoFQ","file":"109308.a4430446b5.js","start":23705,"end":27232,"sha256":"909183d4d723942dab675ff12732924c2aec23607223f7c182a0f1450a99d7e7"},{"id":"ouEa","file":"257798.13b56b362a.js","start":152136,"end":152465,"sha256":"d400408bcd13eb4ee4c88c2b292ce66e2f82a8e951061cb62148fab3cd27f5bd"},{"id":"HkKI","file":"257798.13b56b362a.js","start":152473,"end":158884,"sha256":"1a54d4b43dd130bf2ace265f89f73ebdcedb9b8b3a28fec8eb365455871bf76b"},{"id":"NxBK","file":"617936.4707466a2e.js","start":32568,"end":33940,"sha256":"2492ffbcaa205979f372dda3f4f1aff063cd8c062d558582a98a42ed98061359"},{"id":"D7Ms","file":"617936.4707466a2e.js","start":35698,"end":38668,"sha256":"ad7ecafef4f5893db856ac46c7de95de2141d2d354c379f4d0ea7c97accae679"},{"id":"pEZk","file":"617936.4707466a2e.js","start":35248,"end":35690,"sha256":"97c4c6418721b073e5c804b1c170aaab148fc922a987ed70a09afb7a37bef0a7"},{"id":"HY2m","file":"617936.4707466a2e.js","start":11392,"end":12057,"sha256":"37bbd41d5d1b5ffcd8a14e49dedbfe95c20014a56af290fef3e93d50955b9fdc"},{"id":"H4sS","file":"617936.4707466a2e.js","start":34632,"end":34937,"sha256":"9d53c5c846e62f8dd78e88478bc054c102620a18174f780cdae22a5e4f7cf1d5"},{"id":"uyLo","file":"617936.4707466a2e.js","start":34945,"end":35240,"sha256":"b0f725a5be8d9297545e0d4190ae75503ac73edad95f02271db511ebc19ccbc3"},{"id":"wYVE","file":"617936.4707466a2e.js","start":4403,"end":5147,"sha256":"ec1a252e82e87b4e0db3cdf99dde7a3c8373f1d2b599d2fc7c99018b096398fb"},{"id":"wo6g","file":"617936.4707466a2e.js","start":4288,"end":4395,"sha256":"3a6af9bd97cd3fe66b7d147e5713e7b16007b3bfacf4031c265ae5a3e970a3cc"},{"id":"PKjX","file":"109308.a4430446b5.js","start":55232,"end":56690,"sha256":"436d3d33f2ab516b64fde9f16b79f154c35aa969acfe5ccb9982be803d3c0b0b"},{"id":"PSDF","file":"109308.a4430446b5.js","start":39561,"end":40681,"sha256":"47abcdc0f4665072189384c9c308badd641d70587cf60a3c3df9978948c6a2f0"},{"id":"vMlG","file":"109308.a4430446b5.js","start":57187,"end":57476,"sha256":"cbc1ba4c51dce53dafe0eaf8f61e3578c50d990b52095e38b9b05ef210e8691a"},{"id":"WWxl","file":"257798.13b56b362a.js","start":158892,"end":159869,"sha256":"448dbd4809c6bd1e4be18915a1218754ad6b2a8ccf58e6715e28c68f2e97745f"},{"id":"XNFm","file":"109308.a4430446b5.js","start":52411,"end":54292,"sha256":"135dcfc151dd9dc60ff0a13cbc2ca85bbdfe8328609a5f25469361c4a2ef299a"},{"id":"oFsh","file":"109308.a4430446b5.js","start":54709,"end":55224,"sha256":"9f795c98c97fd5810acfab5edbdd1a01099ad2274410585de15a987cc3f49906"},{"id":"iwK1","file":"109308.a4430446b5.js","start":33720,"end":39553,"sha256":"bb38b14d5d9b54bef4bcfafa258cb528608ed777ada08b5cab9e620fcdecd34f"},{"id":"m4Vs","file":"109308.a4430446b5.js","start":56698,"end":57179,"sha256":"42f368550fc19cc40d07e74107aec540e3ccde01aa449b17836a487ca6ed1521"},{"id":"wFEO","file":"109308.a4430446b5.js","start":54300,"end":54701,"sha256":"7ce42d9f77f4757d5c3e281a05227a7821528bf6d2296730f76cdb23859cdfa7"},{"id":"suje","file":"617936.4707466a2e.js","start":19582,"end":25252,"sha256":"9436c0f4d2cdf256fb6ef09faee29647e9e5961139b00a93cb365072f5e3c748"},{"id":"OtRH","file":"617936.4707466a2e.js","start":18462,"end":19574,"sha256":"b03203599768f7b595a24ba4aab3a39e54c492d06644391194a28a2935452332"},{"id":"MtYY","file":"617936.4707466a2e.js","start":12065,"end":18454,"sha256":"5c6a1ba97164db04b4952f4ae8ab9be327377d41cdbc93d976c074387566a838"},{"id":"OLOS","file":"617936.4707466a2e.js","start":32161,"end":32560,"sha256":"5960c43fd81842cc996a0fd02d8589102c974c5649146a84cd64067d0a12873e"},{"id":"rbzn","file":"617936.4707466a2e.js","start":10994,"end":11384,"sha256":"11fa01410fef0ca20d89641a7ce0f85c8196f387894ded24dec7fb5ee559d093"},{"id":"slNz","file":"617936.4707466a2e.js","start":5155,"end":6518,"sha256":"2a7d8aa8e99181f1a55122adb4d662c7e13c391abda2f21a80bdd781b873afbe"},{"id":"UKIm","file":"617936.4707466a2e.js","start":7611,"end":10986,"sha256":"f0915d818e73f74973c90fc9ce4375f86d1e9d6b1cffc5344bf21268f27607af"},{"id":"tyzk","file":"109308.a4430446b5.js","start":31327,"end":31503,"sha256":"6c8a9f0ff93064cd7722a476b40d3d9b741f4eecfdfef4f00d21582b92f2ba43"}];
  const context = vm.createContext({ console, setTimeout, clearTimeout, queueMicrotask, performance, TextEncoder, TextDecoder, AbortController, AbortSignal });
  const factories = new Map(), cache = new Map(), sourceFiles = new Map();
  for (const record of ranges) {
    let source = sourceFiles.get(record.file);
    if (!source) {
      source = await fs.readFile(new URL('../original-client/public/chatgpt.com/cdn/assets/' + record.file, import.meta.url), 'utf8');
      sourceFiles.set(record.file, source);
    }
    const factory = source.slice(record.start, record.end);
    assert.equal(createHash('sha256').update(factory).digest('hex'), record.sha256, 'Pinned original factory changed: ' + record.id);
    factories.set(record.id, new vm.Script('(' + factory + ')', { filename: record.file + '#' + record.id }).runInContext(context, { timeout: 1000 }));
  }
  function requireOriginal(id) {
    if (cache.has(id)) return cache.get(id).exports;
    assert.ok(factories.has(id), 'Original pure atom closure must not import network/UI module ' + id);
    const module = { exports: {} };
    cache.set(id, module);
    factories.get(id)(module, module.exports, requireOriginal);
    return module.exports;
  }
  requireOriginal.d = (exports, getters = {}, values = {}) => {
    for (const [name, get] of Object.entries(getters)) Object.defineProperty(exports, name, { get, enumerable: true });
    for (const [name, value] of Object.entries(values)) Object.defineProperty(exports, name, { value, enumerable: true });
  };
  requireOriginal.o = (value, name) => Object.prototype.hasOwnProperty.call(value, name);
  requireOriginal.n = module => {
    const get = module?.__esModule ? () => module.default : () => module;
    Object.defineProperty(get, 'a', { get });
    return get;
  };
  requireOriginal.r = exports => Object.defineProperty(exports, '__esModule', { value: true });
  // BolX.c directly reexports UQAX.a; the original complete pure dependency
  // closure and original Jotai store are used, not a callback-shaped mock.
  const derive = requireOriginal('UQAX').a;
  const token = requireOriginal('tyzk').a('DotNativeABITest');
  function realScope() {
    const store = requireOriginal('ouEa').b();
    const node = { token, parent: null, store, cachedBindings: new Map(), signalBindings: new Map(), imperativeReadAtoms: new Set(), debugEntries: new Set(), value: {}, contextVersionAtom: requireOriginal('ouEa').a(0) };
    const chain = new Map([[token.id, node]]);
    return { get: atom => store.get(atom.resolve(node, chain)) };
  }
  const probe = derive(token, function (state) { return { arguments: arguments.length, get: typeof state.get }; });
  assert.equal(realScope().get(probe).arguments, 1);
  assert.equal(realScope().get(probe).get, 'function');
  const broken = derive(token, (_argument, { get }) => get(null));
  assert.throws(() => realScope().get(broken), /Cannot destructure/);
  const env = fixture({ bootstrapDefault: false });
  const old = { isLoading: false, isError: false, isCapable: false };
  for (const loading of [true, false]) {
    const inputs = derive(token, () => ({
      authenticatedAccountId: 'neutral-site-account', authenticatedUserId: 'neutral-site-user',
      authLoading: loading, accountLoading: false,
    }));
    const original = { c: derive(token, () => old), b: () => false, i: () => {} };
    const moduleRequire = id => id === 'BolX' ? { c: derive } : id === 'OWtl' ? { a: token } : id === 'Cslg' ? { m: inputs } : requireOriginal(id);
    const atoms = env.adapter.adaptCapabilityAtoms(original, moduleRequire);
    const scope = realScope();
    assert.equal(scope.get(atoms.c).isLoading, loading);
    assert.equal(scope.get(atoms.c).isCapable, !loading);
    assert.equal(scope.get(atoms.d), !loading);
    assert.equal(scope.get(atoms.a), !loading);
    assert.equal(scope.get(atoms.f).isCapable, !loading);
  }
});

test('native Dot socket uses the exact route per turn and reloads saved replies', async t => {
  const siteOrigin = 'https://site-proxy.fixture.test';
  const providers = [
    { id: 'openclawplan', apiBase: 'https://api.openclawplan.com', apiKey: 'fixture-openclawplan', supportedModels: ['gpt-6.1-terra', 'gpt-6-astra'] },
    { id: 'docode', apiBase: 'https://docode.cc', apiKey: 'fixture-docode', supportedModels: ['gpt-6-astra'] },
  ];
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (input, init) => {
    const url = new URL(input);
    const provider = url.pathname.split('/')[2];
    const payload = JSON.parse(init.body);
    assert.equal(url.origin, siteOrigin);
    assert.equal(init.method, 'POST');
    assert.equal(url.pathname, '/api-proxy/' + provider + '/v1/responses');
    assert.equal(new Headers(init.headers).get('Authorization'), 'Bearer fixture-' + provider);
    assert.equal(payload.stream, true);
    assert.equal(payload.store, false);
    requests.push({ provider, payload });
    const id = requests.length;
    const output = [{
      type: 'message', id: 'message-' + id, role: 'assistant', phase: 'final_answer',
      content: [{ type: 'output_text', text: 'Fixture upstream reply ' + id }],
    }];
    const body = {
      type: 'response.completed',
      response: { id: 'response-' + id, status: 'completed', model: payload.model, reasoning: payload.reasoning, output },
    };
    return new Response('data: ' + JSON.stringify(body) + '\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
  });
  const completion = createLocalDotCompletion({ complete: streamCompletion, getProviders: () => providers, siteOrigin });
  let adapter;
  const env = fixture({ complete: completion, streamCompletion: options => adapter.complete(options) });
  adapter = env.adapter;
  const profile = (await request(adapter, '/tbo')).data.items[0];
  const { root_thread_id: threadId } = (await request(adapter, '/tbo/' + profile.id + '/root-thread')).data;
  const socket = new LocalProtocolSocket(adapter.createRpcFacade(env.appServer));
  t.after(() => socket.close());
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));

  let nextRpcId = 0;
  function messageMatching(match) {
    return new Promise((resolve, reject) => {
      const deadline = setTimeout(() => {
        socket.removeEventListener('message', onMessage);
        reject(Error('Dot RPC timed out'));
      }, 2500);
      function onMessage(event) {
        const value = JSON.parse(event.data);
        if (!match(value)) return;
        clearTimeout(deadline);
        socket.removeEventListener('message', onMessage);
        resolve(value);
      }
      socket.addEventListener('message', onMessage);
    });
  }
  async function rpc(method, params) {
    const id = ++nextRpcId;
    const reply = messageMatching(value => value.id === id);
    socket.send(JSON.stringify({ id, method, params }));
    return reply;
  }

  assert.equal((await rpc('thread/resume', { threadId })).result.model, 'gpt-6.1-terra');
  const tasks = [
    ['帮我写一句问候。', 'gpt-6.1-terra'],
    ['请严格证明这条定理并推导边界条件。', 'gpt-6-astra'],
  ];
  for (const [text, expectedModel] of tasks) {
    const completed = messageMatching(value => value.method === 'turn/completed' && value.params.threadId === threadId);
    const input = [{ type: 'text', text }];
    const started = await rpc('turn/start', { threadId, model: 'gpt-6.1-sol', effort: 'max', input, clientUserMessageId: randomUUID() });
    const { turn } = (await completed).params;
    assert.equal(started.error, undefined);
    assert.equal(turn.status, 'completed', turn.error?.message);
    assert.equal(turn.model, expectedModel);
    assert.equal(turn.adapterMetadata.checkpoint.metrics[0].adapterExecution.model, expectedModel);
  }
  assert.deepEqual(requests.map(({ provider, payload }) => [provider, payload.model, payload.reasoning.effort]), [
    ['openclawplan', 'gpt-6.1-terra', 'medium'], ['docode', 'gpt-6-astra', 'high'],
  ]);
  assert(JSON.stringify(requests[1].payload.input).includes('Fixture upstream reply 1'));
  const restored = fixture({ storage: env.storage });
  const turns = restored.appServer.getThread(threadId).turns;
  assert.deepEqual(turns.map(turn => turn.model), ['gpt-6.1-terra', 'gpt-6-astra']);
  assert.deepEqual(turns.map(turn => turn.items.find(item => item.type === 'agentMessage').text), [
    'Fixture upstream reply 1', 'Fixture upstream reply 2',
  ]);
  env.setLocal(false);
  assert.equal((await rpc('thread/read', { threadId })).error.code, -32003);
  assert.equal(requests.length, 2);
});

test('the fixed Dot transport rejects a mismatched model or effort and unsupported IDs', async () => {
  let detectedModel = 'gpt-6.1-terra';
  let detectedEffort = 'high';
  let requests = 0;
  const completion = createLocalDotCompletion({
    complete: async () => { requests++; return { model: detectedModel, actual_reasoning: { effort: detectedEffort } }; },
    getProviders: () => [{ id: 'docode', apiBase: 'https://docode.cc', apiKey: 'fixture-dot', supportedModels: ['gpt-6-astra'] }],
    siteOrigin: 'https://site-proxy.fixture.test',
  });
  const settings = { model: 'gpt-6-astra', reasoningEffort: 'high' };
  await assert.rejects(completion({ settings }), { code: 'LOCAL_DOT_MODEL_UNVERIFIED' });
  detectedModel = settings.model;
  detectedEffort = 'low';
  await assert.rejects(completion({ settings }), { code: 'LOCAL_DOT_MODEL_UNVERIFIED' });
  await assert.rejects(completion({ settings: { ...settings, model: 'gpt-6.1-sol' } }), { code: 'LOCAL_DOT_MODEL_UNSUPPORTED' });
  assert.equal(requests, 2);
});

test('site-owned readiness never reads native cloud entitlement during loading or on plans without Dot', async () => {
  let access = false;
  const env = fixture({ bootstrapDefault: false, siteAccountsOnly: true, hasDotAccess: () => access });
  let auth = { accountLoading: true };
  const inputs = {};
  const original = {
    c: {},
    b: () => { throw Error('Native permission must stay idle'); },
    i: () => { throw Error('Native readiness must stay idle'); },
  };
  const requireOriginal = id => id === 'BolX' ? { c: (_scope, evaluate) => evaluate } : id === 'OWtl' ? { a: {} } : { m: inputs };
  const adapted = env.adapter.adaptCapabilityAtoms(original, requireOriginal);
  const get = atom => {
    assert.notEqual(atom, original.c, 'Native readiness must stay idle');
    return atom === inputs ? auth : atom({ get });
  };
  env.setLocal(false);
  assert.equal(get(adapted.c).isLoading, true);
  assert.equal(get(adapted.c).isCapable, false);
  env.setLocal(true);
  auth = { authenticatedAccountId: 'neutral-site-account', authenticatedUserId: 'neutral-site-user', accountLoading: false };
  assert.equal(get(adapted.c).isCapable, false);
  assert.equal(adapted.b({}, auth.authenticatedAccountId), false);
  assert.equal((await request(env.adapter, '/tbo')).response.status, 403);
  access = true;
  assert.equal(get(adapted.c).isCapable, true);
  assert.equal(adapted.b({}, 'unexpected-account'), false);
  assert.equal(adapted.b({}, auth.authenticatedAccountId), true);
  assert.doesNotThrow(() => adapted.i({}));
});
