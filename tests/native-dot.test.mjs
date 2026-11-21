import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import * as catalog from '../model-catalog.js';
import { createModelCatalogAdapter } from '../src/native-client/model-catalog-adapter.mjs';
import { LocalAppServer, LocalProtocolSocket } from '../src/native-client/local-app-server.mjs';
import { createLocalFilesService } from '../src/native-client/local-files-service.mjs';
import { createLocalInputPreparer } from '../src/native-client/local-input-preparation.mjs';
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
    prepareUserInput: options.prepareUserInput,
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
  const petPath = '/cloud-aeons/' + profile.id;
  assert.equal((await request(env.adapter, petPath, 'PATCH', { avatar_type: 'default' })).response.status, 422);
  assert.equal((await request(env.adapter, '/cloud-aeons/local-dot-unowned', 'PATCH', avatar)).response.status, 404);
  const saved = (await request(env.adapter, petPath, 'PATCH', avatar)).data;
  assert.equal(saved.avatar_url, snapshot.asset_pointer);
  assert.deepEqual(saved.avatar_manifest, avatar.avatar_manifest);
  const savedRecords = JSON.parse(env.storage.getItem(key));
  savedRecords.profiles[0].avatar_url = null;
  env.storage.setItem(key, JSON.stringify(savedRecords));
  const reloaded = (await request(env.create(), path)).data;
  assert.equal(reloaded.avatar_url, snapshot.asset_pointer);
  assert.deepEqual(reloaded.avatar_manifest, avatar.avatar_manifest);
});

function waitDotTurn(appServer, threadId) {
  return new Promise(resolve => {
    const unsubscribe = appServer.subscribe(event => {
      if (event.method === 'turn/completed' && event.params.threadId === threadId) {
        unsubscribe();
        resolve(event.params.turn);
      }
    });
  });
}

test('native Dot preserves reply references and message reactions across reload, removal and repeated clicks', { timeout: 3000 }, async () => {
  const env = fixture({ streamCompletion: async () => ({ content: 'Neutral authored reply.', finish_reason: 'stop' }) });
  const profile = (await request(env.adapter, '/tbo')).data.items[0];
  const threadId = profile.root_thread_id, path = '/messaging/rooms/' + threadId;
  await request(env.adapter, '/tbo/' + profile.id + '/messaging-room', 'POST');
  assert.deepEqual((await request(env.adapter, path + '/journal/eligibility')).data, { enabled: true });
  const firstTerminated = waitDotTurn(env.appServer, threadId);
  await request(env.adapter, path + '/messages', 'POST', { request_id: 'root-neutral', content: { text: 'Please greet me.' } });
  await firstTerminated;
  const initial = (await request(env.adapter, path + '/messages')).data.items;
  const assistant = initial.at(-1), reactionPath = path + '/messages/' + assistant.id + '/reactions';
  const expectedUpdate = { type: 'calpico-message-update', payload: { room_id: threadId, message_id: assistant.id } };
  const updates = [];
  const unsubscribe = env.adapter.subscribeRoomMessages(value => updates.push(value));
  assert.equal((await request(env.adapter, reactionPath, 'POST', { reaction: '👍' })).response.status, 204);
  assert.equal((await request(env.adapter, reactionPath, 'POST', { reaction: '👍' })).response.status, 204);
  assert.deepEqual(updates, [expectedUpdate]);
  unsubscribe();
  const restored = fixture({ storage: env.storage, streamCompletion: async () => ({ content: 'Neutral follow-up.', finish_reason: 'stop' }) });
  const reacted = (await request(restored.adapter, path + '/messages')).data.items.at(-1);
  assert.deepEqual(reacted.reactions, { 'neutral-site-user': '👍' });
  assert(Date.parse(reacted.updated_at) > Date.parse(assistant.updated_at));
  const sent = { request_id: 'quoted-neutral', content: { text: 'Please continue.' }, reply_to: { message_id: assistant.id } };
  const secondTerminated = waitDotTurn(restored.appServer, threadId);
  const accepted = await request(restored.adapter, path + '/messages', 'POST', sent);
  assert.equal(accepted.response.status, 200);
  assert.equal(accepted.data.reply_to.message_id, assistant.id);
  assert.equal(accepted.data.reply_to.message.raw_messages[0].content.parts[0], 'Neutral authored reply.');
  assert.equal((await request(restored.adapter, path + '/messages', 'POST', { ...sent, reply_to: { message_id: initial[0].id } })).response.status, 409);
  await secondTerminated;
  const reopened = fixture({ storage: env.storage });
  assert.equal((await request(reopened.adapter, path + '/messages')).data.items.find(item => item.id === accepted.data.id).reply_to.message_id, assistant.id);
  const thread = (await request(reopened.adapter, path + '/messages?reply_root_message_id=' + assistant.id)).data.items;
  assert.deepEqual(thread.map(item => item.role), ['user', 'assistant']);
  assert.ok(thread.every(item => item.reply_root_message_id === assistant.id));
  assert.equal(thread[0].id, accepted.data.id);
  const removed = [];
  const stopUpdates = reopened.adapter.subscribeRoomMessages(value => removed.push(value));
  assert.equal((await request(reopened.adapter, reactionPath, 'DELETE')).response.status, 204);
  assert.equal((await request(reopened.adapter, reactionPath, 'DELETE')).response.status, 204);
  assert.deepEqual(removed, [expectedUpdate]);
  stopUpdates();
  const cleared = (await request(reopened.adapter, path + '/messages')).data.items.find(item => item.id === assistant.id);
  assert.deepEqual(cleared.reactions, {});
  assert(Date.parse(cleared.updated_at) > Date.parse(reacted.updated_at));
  reopened.setIdentity({ accountId: 'foreign', userId: 'foreign' });
  assert.equal((await request(reopened.adapter, reactionPath, 'POST', { reaction: '👍' })).response.status, 404);
});

test('native Dot settings preserve concurrent changes and refuse stale-account writes', async () => {
  const env = fixture();
  const profile = (await request(env.adapter, '/tbo')).data.items[0], route = '/tbo/' + profile.id;
  let release;
  const delayed = new Promise(resolve => { release = resolve; });
  const optimistic = env.adapter.handle({
    url: 'https://site.invalid' + route, method: 'PATCH',
    async json() { await delayed; return { description: 'Neutral saved note' }; },
  }, route);
  assert.equal((await request(env.adapter, route, 'PATCH', { display_name: 'Named Dot' })).response.status, 200);
  release();
  assert.equal((await optimistic).status, 200);
  const preserved = (await request(env.create(), route)).data;
  assert.equal(preserved.display_name, 'Named Dot');
  assert.equal(preserved.description, 'Neutral saved note');
  const racing = env.adapter.handle({
    url: 'https://site.invalid' + route, method: 'PATCH',
    async json() { env.setIdentity({ accountId: 'different', userId: 'different' }); return { display_name: 'Changed by old account' }; },
  }, route);
  assert.equal((await racing).status, 409);
  env.setIdentity({ accountId: 'neutral-site-account', userId: 'neutral-site-user' });
  assert.equal((await request(env.create(), route)).data.display_name, 'Named Dot');
});

test('existing Dot RPC stops and resumes a turn and room delivery retries never replay an uncertain gateway request', { timeout: 4000 }, async () => {
  let adapter, started, signal;
  const entered = new Promise(resolve => { started = resolve; });
  const calls = [];
  const env = fixture({
    streamCompletion: options => adapter.complete(options),
    async complete(options) {
      calls.push([options.settings.model, options.settings.reasoningEffort]);
      if (calls.length === 1) {
        signal = options.signal;
        started();
        return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
      }
      if (calls.length === 2) throw Object.assign(Error('Neutral unresolved gateway failure'), { retryable: true, status: 502 });
      return { content: 'Reply confirmed after explicit resume.', finish_reason: 'stop' };
    },
  });
  adapter = env.adapter;
  const profile = (await request(adapter, '/tbo')).data.items[0];
  const threadId = profile.root_thread_id, messages = '/messaging/rooms/' + threadId + '/messages';
  await request(adapter, '/tbo/' + profile.id + '/messaging-room', 'POST');
  const input = { request_id: 'neutral-interrupted-retry', content: { text: 'Please write a greeting.' } };
  const accepted = await request(adapter, messages, 'POST', input);
  await entered;
  const turnId = env.appServer.getThread(threadId).turns[0].id;
  const rpc = adapter.createRpcFacade();
  rpc.dispatch('turn/interrupt', { threadId, turnId }).afterReply();
  assert.equal(signal.aborted, true);
  assert.equal(env.appServer.getThread(threadId).turns[0].status, 'interrupted');
  assert.deepEqual((await request(adapter, messages, 'POST', input)).data, accepted.data);
  assert.equal(calls.length, 1);
  const failed = waitDotTurn(env.appServer, threadId);
  rpc.dispatch('turn/resume', { threadId, turnId }).afterReply();
  assert.equal((await failed).status, 'failed');
  assert.equal(calls.length, 2);
  assert.deepEqual((await request(adapter, messages, 'POST', input)).data, accepted.data);
  assert.equal(calls.length, 2);
  const done = waitDotTurn(env.appServer, threadId);
  rpc.dispatch('turn/resume', { threadId, turnId }).afterReply();
  assert.equal(rpc.dispatch('turn/resume', { threadId, turnId }).afterReply, undefined);
  const completed = await done;
  assert.equal(completed.id, turnId);
  assert.equal(completed.status, 'completed');
  assert.deepEqual(calls, Array.from({ length: 3 }, () => ['gpt-6.1-terra', 'medium']));
  const saved = (await request(fixture({ storage: env.storage }).adapter, messages)).data.items;
  assert.deepEqual(saved.map(item => item.role), ['user', 'assistant']);
  assert.equal(saved[0].id, accepted.data.id);
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
  assert.match(download.data.download_url, /^data:image\/png;base64,/);
  const embedded = await fetch(download.data.download_url);
  assert.equal(embedded.headers.get('Content-Type'), 'image/png');
  assert.deepEqual(new Uint8Array(await embedded.arrayBuffer()), png);
  const response = await env.create().handle(new Request('https://site.invalid/chatgpt/backend-api/local-dot/assets/' + id), '/local-dot/assets/' + id);
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
  const original = { a: {}, d: {}, e: {}, f: {}, g: {}, b: () => false, c: () => false, j: () => { throw Error('original account required'); } };
  const inputs = { source: 'account inputs' };
  const requireOriginal = id => id === 'Q840' ? { c: (_scope, evaluate) => evaluate } : id === 'OWtl' ? { a: {} } : { n: inputs };
  const overrides = env.adapter.adaptCapabilityAtoms(original, requireOriginal);
  let auth = { authenticatedAccountId: 'neutral-site-account', authenticatedUserId: 'neutral-site-user', authLoading: true, accountLoading: false };
  const old = { isLoading: false, isError: false, isCapable: false };
  const get = atom => atom === inputs ? auth : atom === original.d ? old : atom({ get });
  assert.equal(get(overrides.d).isCapable, false);
  assert.equal(get(overrides.d).isLoading, true);
  assert.equal(get(overrides.e), false);
  auth = { ...auth, authLoading: false };
  assert.equal(get(overrides.e), true);
  assert.equal(get(overrides.a), true);
  assert.equal(get(overrides.g).isCapable, true);
  assert.equal(get(overrides.f).isCapable, false);
  assert.equal(get(overrides.d).openai_cloud_entitlement, false);
  assert.equal(overrides.c({ get }, { accountId: auth.authenticatedAccountId, userId: auth.authenticatedUserId }), true);
  assert.equal(overrides.c({ get }, { accountId: auth.authenticatedAccountId, userId: 'other-user' }), false);
  env.setLocal(false);
  assert.equal(get(overrides.d), old);
  assert.equal(overrides.b({}, 'neutral-site-account'), false);
});

test('b634 Q840.c passes one native context to the derived Dot account atom', async () => {
  const fs = await import('node:fs/promises');
  const vm = await import('node:vm');
  const { createHash } = await import('node:crypto');
  const ranges = [
    {"id":"UQAX","file":"109308.4d55635a3c.js","start":28426,"end":28949,"sha256":"f4113790301efd13c49b60d3f31a740f3958b91365d1034eb476cbff1fd5c31c"},
    {"id":"tyzk","file":"109308.4d55635a3c.js","start":30179,"end":30355,"sha256":"a3bc52c860f98c26cf8780067056f0e1a31a5b7f396d9f59c419ea5f003d6bfd"},
    {"id":"ouEa","file":"399565.700e278f2d.js","start":600124,"end":600446,"sha256":"860afae409ae45b603070cd6f812e4af7653ba281ac232e1e137e63fe74c39d7"},
    {"id":"AvFJ","file":"109308.4d55635a3c.js","start":26092,"end":28418,"sha256":"7bbc8b826b99722219d1b09d3e9928b672ce8fdf4ae245516c431cc9b1ade618"},
    {"id":"iwK1","file":"109308.4d55635a3c.js","start":32572,"end":38521,"sha256":"41d99ef41c530842530a4b0ab3fa0c3c06e8f4a0d60bc6d66b2113cc672f94d4"},
    {"id":"fbKo","file":"109308.4d55635a3c.js","start":39890,"end":51815,"sha256":"23f10c7caff927d924480e16a3f9c16bb8937f3e2a385668e1efc65540dc295c"},
    {"id":"m4Vs","file":"109308.4d55635a3c.js","start":56110,"end":56591,"sha256":"9c96ef3d4b52f320d26fe33e48b3341e454015bcc8c0f363e9a8822765acfe23"},
    {"id":"vMlG","file":"109308.4d55635a3c.js","start":56599,"end":56888,"sha256":"82110da560adb6855405aef4da7d667af7cca8bd9e91791d164c2a2c27838cb2"},
    {"id":"KoFQ","file":"109308.4d55635a3c.js","start":22557,"end":26084,"sha256":"f2353f1185e2a426d8e29bda91e154152bf294224337de2ae4a1fbfc14f364f8"},
    {"id":"HkKI","file":"399565.700e278f2d.js","start":600454,"end":606865,"sha256":"0323381dafa9be94cce36716146e8a711c609613a4ed78b42e1de1656da37341"},
    {"id":"WWxl","file":"399565.700e278f2d.js","start":606873,"end":607850,"sha256":"e876e66c59e3b728cabef838484b558b068c1f2ce2c6bce6919ac48f9290d4e4"},
    {"id":"PKjX","file":"109308.4d55635a3c.js","start":54644,"end":56102,"sha256":"3bdbc92b619ec19141ea60b8212106af9fe8040f6a2019b577d1d822722deb10"},
    {"id":"wFEO","file":"109308.4d55635a3c.js","start":53712,"end":54113,"sha256":"ea823552009d005717c63506eed837c25cabcfec5165b6d9ca8e64afbb1a408a"},
    {"id":"oFsh","file":"109308.4d55635a3c.js","start":54121,"end":54636,"sha256":"1cba620b7a131c5f8e2edc064d6d148f912264982d1c1987869d9b726e96906a"},
    {"id":"XNFm","file":"109308.4d55635a3c.js","start":51823,"end":53704,"sha256":"b34d5ef97af3716abc0a55948d7c32189268a8200c7a4cb4c8c2c27320c06633"},
    {"id":"NxBK","file":"async/414022.d7ac2f8f82.js","start":47187,"end":48551,"sha256":"15b3d446f55b33347584c8dc4ff15777fb0ce135488b577f54dec2842d8da418"},
    {"id":"J6iR","file":"109308.4d55635a3c.js","start":31676,"end":32564,"sha256":"bdbec6e800bc45907c2045986de017a7ded615df6fe4e06e02693690efc71738"},
    {"id":"PSDF","file":"109308.4d55635a3c.js","start":38762,"end":39882,"sha256":"62bf7e6b5bc14020defd8744004e8fc8809d53d7b518bda6e7c8ced895cefc1a"},
    {"id":"suje","file":"async/414022.d7ac2f8f82.js","start":41124,"end":46786,"sha256":"6909b55ab5615af41076b7522c1418d2255cd6404c9721a47c36151f6516c312"},
    {"id":"wYVE","file":"async/414022.d7ac2f8f82.js","start":27105,"end":27841,"sha256":"f2c79c1ac1a13265c3699d36b6191508b73e437f7d1ad6bdc84d24510b8bc18c"},
    {"id":"HY2m","file":"async/414022.d7ac2f8f82.js","start":32967,"end":33624,"sha256":"64c1ce397db8657372cbf4455e3b371059c7040b91c8f4307c8be620187ab84b"},
    {"id":"uyLo","file":"async/414022.d7ac2f8f82.js","start":48858,"end":49145,"sha256":"2a1445a89b2b7b2b61ef25eebc5b5c24d658539486c59675233b5e70d7231f19"},
    {"id":"wo6g","file":"async/414022.d7ac2f8f82.js","start":27001,"end":27100,"sha256":"7a901fc692fdfcde497d764a7e7f0a301457b2726cf3aab2da1b325f6758719a"},
    {"id":"D7Ms","file":"async/414022.d7ac2f8f82.js","start":49589,"end":52551,"sha256":"97d9650eb03ec270f97fd761c00c1f3338ea0de878b3730d9b6831c83d9ba9a6"},
    {"id":"OtRH","file":"async/414022.d7ac2f8f82.js","start":40015,"end":41119,"sha256":"299bc3329f51a775937ceaa07c43fd3cdcba2d10a84b9cbf3694d283bc3c488b"},
    {"id":"rbzn","file":"async/414022.d7ac2f8f82.js","start":32578,"end":32962,"sha256":"600afe0e4cdcd3045cd0779d893e998eb1f624f392fd8b2e2cffef914da6d29f"},
    {"id":"UKIm","file":"async/414022.d7ac2f8f82.js","start":29206,"end":32573,"sha256":"a8ec2b8fb1c72e6a0b027b6f4e6090dc2dfd671c220f45c046b41b75893c4925"},
    {"id":"H4sS","file":"async/414022.d7ac2f8f82.js","start":48556,"end":48853,"sha256":"b64fc8e7ac9ee39bb32f70183f3c7214b0ed08ec38196f66c57d309bfd9d4297"},
    {"id":"pEZk","file":"async/414022.d7ac2f8f82.js","start":49150,"end":49584,"sha256":"feadbaf925a1f22a7969090da7756944741869eb066a2b35295bfe0350874a53"},
    {"id":"MtYY","file":"async/414022.d7ac2f8f82.js","start":33629,"end":40010,"sha256":"77878158ed7bcf635717b260425122468d156c0e3a9987ac796cf8dea4d07a32"},
    {"id":"OLOS","file":"async/414022.d7ac2f8f82.js","start":46791,"end":47182,"sha256":"571c65878710a83f4ce28a74d3e6ab1e9530cd6edc832f9e4213390f54f3c2c5"},
    {"id":"slNz","file":"async/414022.d7ac2f8f82.js","start":27846,"end":29201,"sha256":"e21b15a404696ebfb22d31e4f8f10680edbcab5381d518882cbfffbe0414da2f"},
  ];
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
    const expression = factory.startsWith('(') ? 'function ' + factory : factory;
    factories.set(record.id, new vm.Script('(' + expression + ')', { filename: record.file + '#' + record.id }).runInContext(context, { timeout: 1000 }));
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
  // Q840.c reexports UQAX.a. Exercise that factory with its pinned graph and store.
  const runtime = sourceFiles.get('109308.4d55635a3c.js');
  const graph = runtime.slice(runtime.indexOf('Q840:(function'));
  assert.ok(graph.includes('c:()=>N.a') && graph.includes('N=c("UQAX")'));
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
    const original = { d: derive(token, () => old), b: () => false, j: () => {} };
    const moduleRequire = id => id === 'Q840' ? { c: derive } : id === 'OWtl' ? { a: token } : id === 'Cslg' ? { n: inputs } : requireOriginal(id);
    const atoms = env.adapter.adaptCapabilityAtoms(original, moduleRequire);
    const scope = realScope();
    assert.equal(scope.get(atoms.d).isLoading, loading);
    assert.equal(scope.get(atoms.d).isCapable, !loading);
    assert.equal(scope.get(atoms.e), !loading);
    assert.equal(scope.get(atoms.a), !loading);
    assert.equal(scope.get(atoms.f).isCapable, false);
    assert.equal(scope.get(atoms.g).isCapable, !loading);
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
    d: {},
    b: () => { throw Error('Native permission must stay idle'); },
    j: () => { throw Error('Native readiness must stay idle'); },
  };
  const requireOriginal = id => id === 'Q840' ? { c: (_scope, evaluate) => evaluate } : id === 'OWtl' ? { a: {} } : { n: inputs };
  const adapted = env.adapter.adaptCapabilityAtoms(original, requireOriginal);
  const get = atom => {
    assert.notEqual(atom, original.d, 'Native readiness must stay idle');
    return atom === inputs ? auth : atom({ get });
  };
  env.setLocal(false);
  assert.equal(get(adapted.d).isLoading, true);
  assert.equal(get(adapted.d).isCapable, false);
  assert.equal(get(adapted.a), null);
  env.setLocal(true);
  auth = { authenticatedAccountId: 'neutral-site-account', authenticatedUserId: 'neutral-site-user', accountLoading: false };
  assert.equal(get(adapted.d).isCapable, false);
  assert.equal(adapted.b({ get }, auth.authenticatedAccountId), false);
  assert.throws(() => adapted.j({ get }), /local Dot provider is unavailable/);
  assert.equal((await request(env.adapter, '/tbo')).response.status, 403);
  access = true;
  assert.equal(get(adapted.e), true);
  assert.equal(get(adapted.f).isCapable, false);
  assert.equal(adapted.b({ get }, 'unexpected-account'), false);
  assert.equal(adapted.b({ get }, auth.authenticatedAccountId), true);
  assert.doesNotThrow(() => adapted.j({ get }));
});

test('Dot overview exposes disconnected computer and an empty schedule list for a new profile', async () => {
  const env = fixture();
  const profile = (await request(env.adapter, '/tbo')).data.items[0];
  const base = '/tbo/' + profile.id;
  const computer = base + '/environment/status?thread_id=' + encodeURIComponent(profile.active_root_thread_id);
  const schedules = base + '/automations?limit=100';
  const stored = new Map(env.storage.values);

  const computerStatus = await request(env.adapter, computer);
  assert.equal(computerStatus.response.status, 200);
  assert.deepEqual(computerStatus.data, { environmentId: null, status: 'unknown', capabilities: [] });
  const schedulePage = await request(env.adapter, schedules);
  assert.equal(schedulePage.response.status, 200);
  assert.deepEqual(schedulePage.data, { items: [], cursor: null });
  assert.equal((await request(env.adapter, base + '/environment/status?thread_id=another-thread')).response.status, 404);
  assert.equal((await request(env.adapter, base + '/environment/wake', 'POST')).response.status, 501);
  assert.equal((await request(env.adapter, schedules, 'POST')).response.status, 400);

  env.setIdentity({ accountId: 'another-account', userId: 'another-user' });
  assert.equal((await request(env.adapter, computer)).response.status, 404);
  assert.equal((await request(env.adapter, schedules)).response.status, 404);
  assert.deepEqual(env.storage.values, stored);
});

test('journal create, edit and delete persist with revisions and account isolation', async () => {
  const env = fixture();
  const profile = (await request(env.adapter, '/tbo')).data.items[0];
  await request(env.adapter, `/tbo/${profile.id}/messaging-room`, 'POST');
  const journal = `/messaging/rooms/${profile.root_thread_id}/journal`;
  const { data: created, response } = await request(env.adapter, journal, 'POST', { content: 'Test journal.' });
  assert.equal(response.status, 201);
  const reopened = fixture({ storage: env.storage });
  assert.deepEqual((await request(reopened.adapter, journal)).data.items, [created]);
  const entryPath = `${journal}/${created.id}`;
  const { data: edited } = await request(reopened.adapter, entryPath, 'PATCH', { content: 'Edited test journal.', revision: 1 });
  assert.equal(edited.revision, 2);
  assert.equal((await request(reopened.adapter, entryPath, 'DELETE', { revision: 1 })).response.status, 409);
  assert.equal((await request(fixture({ storage: env.storage }).adapter, journal)).data.items[0].content, edited.content);
  assert.equal((await request(reopened.adapter, entryPath, 'DELETE', { revision: 2 })).response.status, 204);
  assert.deepEqual((await request(fixture({ storage: env.storage }).adapter, journal)).data.items, []);
  reopened.setIdentity({ accountId: 'another-account', userId: 'another-user' });
  assert.equal((await request(reopened.adapter, journal)).response.status, 404);
});

test('native Dot composer can write, edit and delete journal notes shown in the original journal shape', async () => {
  const env = fixture();
  const profile = (await request(env.adapter, '/tbo')).data.items[0];
  await request(env.adapter, `/tbo/${profile.id}/messaging-room`, 'POST');
  const room = `/messaging/rooms/${profile.root_thread_id}`;
  const journal = `${room}/journal`;
  const send = (adapter, id, text) => request(adapter, `${room}/messages`, 'POST', { request_id: id, idempotency_token: id, content: { text } });
  const events = [];
  const unsubscribe = env.adapter.subscribeRoomMessages(event => events.push(event));
  const first = await send(env.adapter, 'entry-write', '/journal add Native journal fixture');
  assert.equal((await send(env.adapter, 'entry-write', '/journal add Native journal fixture')).data.id, first.data.id);
  assert.equal((await send(env.adapter, 'entry-write', '/journal add Different fixture')).response.status, 409);
  unsubscribe();
  assert.equal(events.length, 1);
  assert.match(events[0].payload.message.content.text, /已保存日记/);
  assert.equal(env.appServer.getThread(profile.root_thread_id).turns.length, 0);
  const reopened = fixture({ storage: env.storage });
  const native = (await request(reopened.adapter, `${journal}?view=tasks`)).data;
  assert.equal(native.tasks[0].description, 'Native journal fixture');
  assert.deepEqual(native.items, []);
  const entryId = native.tasks[0].id;
  assert.equal((await send(reopened.adapter, 'entry-edit', `/journal edit ${entryId} Updated native fixture`)).response.status, 200);
  const details = (await request(reopened.adapter, `${journal}?view=tasks&task_id=${entryId}`)).data;
  assert.equal(details.turns[0].messages[0].text, 'Updated native fixture');
  assert.equal((await send(reopened.adapter, 'entry-delete', `/journal delete ${entryId}`)).response.status, 200);
  assert.deepEqual((await request(fixture({ storage: env.storage }).adapter, `${journal}?view=tasks`)).data.tasks, []);
});

test('queued Dot messages recover after reload and admit a repeated request ID once', async () => {
  const first = Promise.withResolvers();
  const env = fixture({ streamCompletion: async () => first.promise });
  const profile = (await request(env.adapter, '/tbo')).data.items[0];
  const room = `/messaging/rooms/${profile.root_thread_id}`;
  await request(env.adapter, `/tbo/${profile.id}/messaging-room`, 'POST');
  const firstDone = waitDotTurn(env.appServer, profile.root_thread_id);
  await request(env.adapter, `${room}/messages`, 'POST', { request_id: 'queued-first', content: { text: 'First message' } });
  const second = { request_id: 'queued-second', content: { text: 'Give a rigorous proof for this test.' } };
  assert.equal((await request(env.adapter, `${room}/messages`, 'POST', second)).response.status, 202);
  assert.equal((await request(env.adapter, `${room}/messages`, 'POST', second)).response.status, 202);
  assert.equal((await request(env.adapter, `${room}/messages`, 'POST', { ...second, content: { text: 'Modified duplicate' } })).response.status, 409);
  first.resolve({ content: 'First reply.', finish_reason: 'stop' });
  await firstDone;
  const requests = [];
  const reopened = fixture({ storage: env.storage, streamCompletion: async ({ settings }) => {
    requests.push([settings.model, settings.reasoningEffort]);
    return { content: 'Second reply.', finish_reason: 'stop' };
  } });
  assert.equal((await request(reopened.adapter, `${room}/messages?live=1`)).data.queued.length, 1);
  const secondDone = waitDotTurn(reopened.appServer, profile.root_thread_id);
  assert.equal((await request(reopened.adapter, `${room}/queue`, 'POST', {})).response.status, 204);
  await secondDone;
  assert.equal((await request(reopened.adapter, `${room}/messages`, 'POST', second)).response.status, 200);
  assert.deepEqual(requests, [['gpt-6-astra', 'high']]);
  assert.equal((await request(reopened.adapter, `${room}/messages?live=1`)).data.queued.length, 0);
});

test('the native Dot room auto-advances a queued send and preserves its message ID', async () => {
  const first = Promise.withResolvers(), calls = [];
  const env = fixture({ backgroundRoomPump: true, streamCompletion: async ({ messages }) => {
    calls.push(messages.at(-1).content);
    return calls.length === 1 ? first.promise : { content: 'Second native reply', finish_reason: 'stop' };
  } });
  const profile = (await request(env.adapter, '/tbo')).data.items[0];
  const id = profile.root_thread_id, base = `/messaging/rooms/${id}`;
  await request(env.adapter, `/tbo/${profile.id}/messaging-room`, 'POST');
  await request(env.adapter, `${base}/messages`, 'POST', { request_id: 'native-first', content: { text: 'First native send' } });
  const next = { request_id: 'native-next', content: { text: 'Second native send' } };
  const queued = await request(env.adapter, `${base}/messages`, 'POST', next);
  assert.equal(queued.status ?? queued.response.status, 202);
  assert.equal((await request(env.adapter, `${base}/messages`)).data.items.at(-1).id, queued.data.id);
  const finished = new Promise(resolve => {
    const off = env.appServer.subscribe(event => {
      if (event.method === 'turn/completed' && event.params.turn.clientUserMessageId === next.request_id) { off(); resolve(); }
    });
  });
  first.resolve({ content: 'First native reply', finish_reason: 'stop' });
  await finished;
  assert.equal((await request(env.adapter, `${base}/messages`, 'POST', next)).data.id, queued.data.id);
  assert.deepEqual(calls, ['First native send', 'Second native send']);
});

test('Dot uses actual uploaded bytes for a message and its follow-up after reload', async () => {
  const bytes = new Map();
  const storage = memory();
  const files = createLocalFilesService({
    metadataStorage: storage, getAccountId: () => 'neutral-site-account', getWorkspacePrefix: id => `test-${id}`,
    storage: { read: async name => { if (!bytes.has(name)) throw Error('File not found'); return bytes.get(name); }, write: async (name, data) => bytes.set(name, new Uint8Array(data)), remove: async name => bytes.delete(name) },
  });
  const requests = [];
  const options = {
    storage, prepareUserInput: createLocalInputPreparer({ files }), files,
    streamCompletion: async ({ messages }) => { requests.push(messages); return { content: 'Read actual attached text.', finish_reason: 'stop' }; },
  };
  const env = fixture(options);
  const profile = (await request(env.adapter, '/tbo')).data.items[0];
  const id = profile.root_thread_id;
  const room = `/messaging/rooms/${id}`;
  await request(env.adapter, `/tbo/${profile.id}/messaging-room`, 'POST');
  const file = new File(['Dot fixture token A682.'], 'dot-fixture.txt', { type: 'text/plain' });
  const form = new FormData();
  form.append('file', file);
  const uploaded = await env.adapter.handle(new Request(`https://site.invalid/backend-api${room}/files`, { method: 'POST', body: form }), `${room}/files`);
  assert.equal(uploaded.status, 200);
  const attachment = await uploaded.json();
  assert.equal(attachment.type, 'file');
  assert.equal(attachment.status, 'ready');
  assert.equal(attachment.size_bytes, file.size);
  const done = waitDotTurn(env.appServer, id);
  const sent = await request(env.adapter, `${room}/messages`, 'POST', { request_id: 'dot-upload', content: { text: '', attachments: [{ type: 'file', file_id: attachment.file_id }] } });
  assert.equal(sent.response.status, 200);
  assert.equal((await done).status, 'completed');
  assert.match(JSON.stringify(requests[0]), /Dot fixture token A682/);
  assert.equal((await files.readFile(attachment.id)).bytes.byteLength, file.size);
  const reopened = fixture(options);
  assert.equal((await request(reopened.adapter, `${room}/messages`)).data.items[0].content.attachments[0].file_id, attachment.id);
  assert.match((await request(reopened.adapter, `${room}/files/${attachment.file_id}`)).data.download_url, /\/__local_artifacts\//);
  const next = waitDotTurn(reopened.appServer, id);
  await request(reopened.adapter, `${room}/messages`, 'POST', { request_id: 'dot-upload-follow-up', content: { text: 'What was the fixture token?' } });
  assert.equal((await next).status, 'completed');
  assert.match(JSON.stringify(requests[1]), /Dot fixture token A682/);
});

test('Dot automation uses one actual model turn per scheduled interval, stores its output, and stops when disabled', async () => {
  let clock = 1700000000000, runs = 0;
  const options = { now: () => clock, streamCompletion: async ({ messages }) => {
    runs++;
    assert.match(JSON.stringify(messages), /Fixture task prompt/);
    return { content: 'Fixture task result', finish_reason: 'stop' };
  } };
  const env = fixture(options);
  const profile = (await request(env.adapter, '/tbo')).data.items[0];
  await request(env.adapter, `/tbo/${profile.id}/messaging-room`, 'POST');
  const path = `/tbo/${profile.id}/automations`;
  const { data: schedule } = await request(env.adapter, path, 'POST', { name: 'Fixture task', prompt: 'Fixture task prompt', interval_minutes: 1 });
  clock = schedule.next_at;
  const payload = { scheduled_for: clock, request_id: 'fixture-schedule' };
  const done = waitDotTurn(env.appServer, profile.root_thread_id);
  assert.equal((await request(env.adapter, `${path}/${schedule.id}/run`, 'POST', payload)).response.status, 202);
  assert.equal((await done).status, 'completed');
  const reopened = fixture({ ...options, storage: env.storage });
  const { items: [view] } = (await request(reopened.adapter, path)).data;
  assert.equal(view.last_run.status, 'completed');
  assert.equal(view.last_run.output, 'Fixture task result');
  await request(reopened.adapter, `${path}/${schedule.id}/run`, 'POST', payload);
  assert.equal(runs, 1);
  await request(reopened.adapter, `${path}/${schedule.id}`, 'PATCH', { enabled: false });
  assert.equal((await request(reopened.adapter, `${path}/${schedule.id}/run`, 'POST', { request_id: 'disabled-fixture' })).response.status, 409);
  assert.equal((await request(reopened.adapter, path)).data.items[0].last_run.output, 'Fixture task result');
});

test('a schedule made from the original Dot composer can run and stop through native automation actions', async () => {
  const env = fixture({ streamCompletion: async ({ messages }) => {
    assert.match(JSON.stringify(messages.at(-1)), /Native automation prompt/);
    return { content: 'Native automation result', finish_reason: 'stop' };
  } });
  const profile = (await request(env.adapter, '/tbo')).data.items[0];
  const id = profile.root_thread_id;
  await request(env.adapter, `/tbo/${profile.id}/messaging-room`, 'POST');
  const schedules = `/tbo/${profile.id}/automations`;
  const message = { request_id: 'automation-create', content: { text: '/automation add Native task | 0 | Native automation prompt' } };
  const compose = `/messaging/rooms/${id}/messages`;
  await request(env.adapter, compose, 'POST', message);
  await request(env.adapter, compose, 'POST', message);
  const { items: [schedule, duplicate] } = (await request(env.adapter, schedules)).data;
  assert.equal(duplicate, undefined);
  assert.equal(schedule.executor, 'local');
  assert.equal(schedule.title, 'Native task');
  assert.equal(schedule.aeon_id, profile.id);
  const global = `/automation/${schedule.id}`;
  const done = waitDotTurn(env.appServer, id);
  const start = { idempotency_key: 'native-manual-run' };
  assert.equal((await request(env.adapter, `${global}/run`, 'POST', start)).response.status, 202);
  assert.equal((await done).status, 'completed');
  await request(env.adapter, `${global}/run`, 'POST', start);
  const reopened = fixture({ storage: env.storage });
  assert.equal((await request(reopened.adapter, `${global}/runs/latest`)).data.last_run.output, 'Native automation result');
  assert.equal((await request(reopened.adapter, `${global}/runs`)).data.items.length, 1);
  assert.equal((await request(reopened.adapter, '/automations/set_status', 'POST', { jawbone_id: schedule.id, is_enabled: false })).data.is_enabled, false);
  assert.equal((await request(reopened.adapter, `${global}/run`, 'POST', { idempotency_key: 'stopped' })).response.status, 409);
});
