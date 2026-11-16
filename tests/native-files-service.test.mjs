import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { createLocalFilesService, isLocalUploadURL } from '../src/native-client/local-files-service.mjs';
import { wrapNativeFileUploadClass } from '../src/native-client/local-native-upload.mjs';
const text = new TextEncoder().encode('Neutral text attachment. No private user data.\n');
function nativeDownloadFixture(provider) {
  class Native {
    static instance = null;
    static getInstance() { return this.instance ??= new Native(); }
    #events = [];
    upload(...args) { this.#events.push({ kind: 'upload', args }); return 'native-upload'; }
    fetch(...args) { this.#events.push({ kind: 'fetch', args }); return 'native-fetch'; }
    events() { return this.#events; }
  }
  const uploads = [], files = { isLocalUploadURL: url => url === 'https://local.invalid/files/local-upload/issued', upload(...args) { uploads.push(args); return 'actual-local-upload'; } };
  const wrapped = wrapNativeFileUploadClass(Native, files, 'https://local.invalid/', provider);
  return { Native, wrapped, files, uploads, instance: Native.getInstance() };
}
const metadataStore = () => { const values = new Map(); return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; };
function byteStore() {
  const files = new Map();
  return { files, async write(key, bytes) { files.set(key, new Uint8Array(bytes)); }, async read(key) { if (!files.has(key)) throw Error('File not found'); return new Uint8Array(files.get(key)); }, async remove(key) { if (!files.delete(key)) throw Error('File not found'); } };
}
function fixture(extra = {}) {
  const storage = extra.storage ?? byteStore(), metadataStorage = extra.metadataStorage ?? metadataStore();
  let account = 'neutral-account';
  const create = options => createLocalFilesService({ storage, metadataStorage, getAccountId: () => account, getWorkspacePrefix: threadId => account + '--' + encodeURIComponent(threadId), uuid: randomUUID, ...options });
  return { storage, metadataStorage, create, adapter: create(extra), setAccount: value => { account = value; } };
}
async function api(adapter, path, method = 'GET', body, init = {}) {
  const response = await adapter.handle(new Request('https://neutral.invalid/chatgpt/__codex-api' + path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }), ...init }), path);
  assert.ok(response, path + ' must be handled');
  const data = response.headers.get('Content-Type')?.includes('ndjson') ? (await response.text()).trim().split('\n').filter(Boolean).map(JSON.parse) : await response.json();
  return { response, data };
}
async function allocate(adapter, bytes = text, name = 'neutral.txt', mime = 'text/plain') {
  const result = await api(adapter, '/files', 'POST', { file_name: name, file_size: bytes.length, mime_type: mime, client_resolved_mime_type: mime, mime_resolution_source: 'declared_mime', entry_surface: 'chat_composer', supports_direct_azure_multipart: true, use_case: mime.startsWith('image/') ? 'multimodal' : 'my_files', store_in_library: true, library_persistence_mode: 'opportunistic', reset_rate_limits: false, timezone_offset_min: 0 });
  assert.equal(result.response.status, 200, JSON.stringify(result.data));
  return result.data;
}
async function upload(adapter, allocation, bytes = text, { signal, fileName = 'neutral.txt', mime = 'text/plain', progress } = {}) {
  const form = new FormData();
  form.append('file', new File([bytes], fileName, { type: mime }), fileName);
  form.append('upload_url', new URL(allocation.upload_url).searchParams.get('upload_url'));
  return adapter.upload('POST', allocation.upload_url, { body: form, signal, onUploadProgress: progress });
}
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const fileMetadata = (id, name = 'neutral.txt', mime = 'text/plain', size = text.length) => ({ id, name, mime_type: mime, size });

test('original create -> real multipart bytes -> SHA -> native process NDJSON -> source download persists across instances', async () => {
  const env = fixture();
  const allocated = await allocate(env.adapter);
  assert.match(allocated.file_id, /^file_local_[0-9a-f]{32}$/);
  assert.equal(env.storage.files.size, 0);
  assert.equal((await api(env.adapter, '/files/process_upload_stream', 'POST', { file_id: allocated.file_id })).response.status, 409);
  let progress;
  await upload(env.adapter, allocated, text, { progress: value => { progress = value; } });
  assert.deepEqual(progress, { loaded: text.length, total: text.length });
  assert.equal(env.storage.files.size, 1);
  const stored = await env.adapter.readFile(allocated.file_id);
  assert.equal(stored.record.status, 'stored');
  assert.equal(stored.record.sha256, digest(text));
  assert.deepEqual(stored.bytes, text);
  const ready = await api(env.adapter, '/files/process_upload_stream', 'POST', { file_id: allocated.file_id, file_name: 'neutral.txt', use_case: 'my_files', index_for_retrieval: true });
  assert.equal(ready.response.status, 200);
  assert.deepEqual(ready.data.map(event => event.event), ['file.processing.file_ready', 'file.processing.completed']);
  assert.ok(ready.data.every(event => event.file_id === allocated.file_id && event.extra.mime_type === 'text/plain'));
  assert.ok(ready.data.every(event => !Object.hasOwn(event.extra, 'metadata_object_id')), 'No fake cloud Library ID');
  const restored = env.create();
  assert.equal((await restored.readFile(allocated.file_id)).record.status, 'ready');
  const download = await api(restored, '/files/download/' + allocated.file_id);
  assert.equal(download.response.status, 200);
  assert.equal(download.data.status, 'success');
  assert.match(download.data.download_url, /^https:\/\/neutral\.invalid\/chatgpt\/__local_artifacts\//);
  const path = new URL(download.data.download_url).pathname.split('/__local_artifacts/')[1].split('/').map(decodeURIComponent).join('/');
  assert.deepEqual(await env.storage.read(path), text);
});

test('text, CSV, JSON and Markdown really decode and materialize under the shared thread workspace', async () => {
  for (const [name, mime, contents] of [['neutral.csv', 'text/csv', 'a,b\n1,2\n'], ['neutral.json', 'application/json', '{"neutral":true}'], ['neutral.md', 'text/markdown', '# Neutral\nFixture only.']]) {
    const env = fixture(), bytes = new TextEncoder().encode(contents);
    const allocated = await allocate(env.adapter, bytes, name, mime);
    await upload(env.adapter, allocated, bytes, { fileName: name, mime });
    assert.equal((await api(env.adapter, '/files/' + allocated.file_id + '/uploaded', 'POST', {})).response.status, 200);
    const original = [{ author: { role: 'user' }, content: { content_type: 'text', parts: ['Read the actual attachment.'] }, metadata: { attachments: [fileMetadata(allocated.file_id, name, mime, bytes.length)] } }];
    const resolved = await env.adapter.resolveChatAttachments(original, { threadId: 'real-thread' });
    assert.equal(resolved.input[0].type, 'text');
    assert.equal(resolved.input[0].text, 'Read the actual attachment.');
    assert.equal(resolved.textFiles[0].text, contents);
    assert.equal(resolved.textFiles[0].truncated, false);
    assert.equal(resolved.files[0].path, '/mnt/data/attachments/' + allocated.file_id + '/' + name);
    assert.deepEqual(await env.storage.read(resolved.files[0].storageKey), bytes);
    assert.ok(resolved.input.every(item => item.type !== 'file'));
  }
});

test('mismatched byte counts, real quota failures and metadata errors cannot report upload ready', async () => {
  const env = fixture(), allocated = await allocate(env.adapter);
  await assert.rejects(() => upload(env.adapter, allocated, new Uint8Array([1])), error => error.status === 422);
  assert.equal(env.storage.files.size, 0);
  assert.equal((await api(env.adapter, '/files/process_upload_stream', 'POST', { file_id: allocated.file_id })).response.status, 409);
  const badBytes = fixture({ storage: { ...byteStore(), async write() { throw Error('quota exceeded'); } } });
  const failed = await allocate(badBytes.adapter);
  await assert.rejects(() => upload(badBytes.adapter, failed), error => error.status === 507);
  const failedProcess = await api(badBytes.adapter, '/files/process_upload_stream', 'POST', { file_id: failed.file_id });
  assert.equal(failedProcess.response.status, 409);
  const metadata = metadataStore();
  const badMetadata = fixture({ metadataStorage: { getItem: metadata.getItem, setItem() { throw Error('quota exceeded'); } } });
  assert.equal((await api(badMetadata.adapter, '/files', 'POST', { file_name: 'neutral.txt', file_size: 10 })).response.status, 507);
  assert.equal(badMetadata.storage.files.size, 0);
  const quota = fixture({ maxTotalBytes: 10, maxFileBytes: 100 });
  assert.equal((await api(quota.adapter, '/files', 'POST', { file_name: 'neutral.txt', file_size: 11 })).response.status, 507);
  const realEstimate = fixture({ readStorageEstimate: async () => ({ quota: 100, usage: 99 }) });
  assert.equal((await api(realEstimate.adapter, '/files', 'POST', { file_name: 'neutral.txt', file_size: 2 })).response.status, 507);
});

test('concurrent real storage estimates cannot bypass account quota reservations', async () => {
  const env = fixture({ maxTotalBytes: 10, maxFileBytes: 100, readStorageEstimate: async () => { await Promise.resolve(); return { quota: 1000, usage: 0 }; } });
  const results = await Promise.all([api(env.adapter, '/files', 'POST', { file_name: 'one.txt', file_size: 6 }), api(env.adapter, '/files', 'POST', { file_name: 'two.txt', file_size: 6 })]);
  assert.deepEqual(results.map(result => result.response.status).sort(), [200, 507]);
});

test('a consumed upload ticket can retry identical bytes but cannot replace a referenced file', async () => {
  const env = fixture(), allocated = await allocate(env.adapter);
  await upload(env.adapter, allocated);
  await api(env.adapter, '/files/' + allocated.file_id + '/uploaded', 'POST', {});
  await upload(env.adapter, allocated);
  assert.equal((await env.adapter.readFile(allocated.file_id)).record.status, 'ready');
  const replacement = new Uint8Array(text.length).fill(65);
  await assert.rejects(() => upload(env.adapter, allocated, replacement), error => error.status === 409 && error.code === 'file_rejected');
  const verified = await env.adapter.readFile(allocated.file_id);
  assert.deepEqual(verified.bytes, text);
  assert.equal(verified.record.sha256, digest(text));
});

test('invalid request objects and corrupted storage paths cannot reach another workspace', async () => {
  const env = fixture();
  assert.equal((await api(env.adapter, '/files', 'POST', null)).response.status, 400);
  assert.equal((await api(env.adapter, '/files/process_upload_stream', 'POST', {})).response.status, 400);
  const allocated = await allocate(env.adapter);
  await upload(env.adapter, allocated);
  const key = [...env.metadataStorage.values.keys()][0], original = env.metadataStorage.values.get(key);
  for (const replacement of [{ namespace: '..' }, { storageName: '../other-account.txt' }]) {
    const saved = JSON.parse(original);
    Object.assign(saved.files[allocated.file_id], replacement);
    const corrupt = JSON.stringify(saved);
    env.metadataStorage.values.set(key, corrupt);
    assert.equal((await api(env.adapter, '/files/download/' + allocated.file_id)).response.status, 500);
    assert.equal(env.metadataStorage.values.get(key), corrupt, 'Damaged metadata is preserved, not silently reset');
  }
});

test('uploads and actual file IDs remain account isolated; cancelling removes bytes and blocks ready', async () => {
  const env = fixture(), allocated = await allocate(env.adapter);
  await upload(env.adapter, allocated);
  env.setAccount('different-account');
  assert.equal((await api(env.adapter, '/files/download/' + allocated.file_id)).response.status, 404);
  await assert.rejects(() => upload(env.adapter, allocated), error => error.status === 403);
  env.setAccount('neutral-account');
  assert.equal((await env.adapter.cancelUpload(allocated.file_id)).cancelled, true);
  assert.equal(env.adapter.ownsUploadURL(allocated.upload_url), true, 'A cancelled local ticket must not fall through to original cloud XHR');
  await assert.rejects(() => upload(env.adapter, allocated), error => error.status === 404);
  assert.equal(env.storage.files.size, 0);
  assert.equal((await api(env.adapter, '/files/process_upload_stream', 'POST', { file_id: allocated.file_id })).response.status, 404);
  env.setAccount(null);
  assert.equal((await api(env.adapter, '/files', 'POST', { file_name: 'neutral.txt', file_size: 1 })).response.status, 401);
});

test('pure local transport guard catches old-account tickets without falling through to native XHR', async () => {
  const env = fixture(), allocated = await allocate(env.adapter), base = 'https://neutral.invalid/chatgpt/';
  const direct = new URL(allocated.upload_url).searchParams.get('upload_url');
  assert.equal(isLocalUploadURL(allocated.upload_url, base), true);
  assert.equal(isLocalUploadURL(direct, base), true);
  env.setAccount('different-account');
  assert.equal(env.adapter.ownsUploadURL(allocated.upload_url), false);
  assert.equal(env.adapter.isLocalUploadURL(allocated.upload_url, base), true, 'Classification does not inspect current account storage');
  let xhrCalls = 0;
  const route = (method, url, options) => env.adapter.isLocalUploadURL(url, base) ? env.adapter.upload(method, url, options) : (++xhrCalls, Promise.resolve());
  await assert.rejects(() => route('POST', allocated.upload_url, {}), error => error.status === 403);
  assert.equal(xhrCalls, 0);
  const offOrigin = new URL(allocated.upload_url); offOrigin.hostname = 'other.invalid';
  const offTarget = new URL(allocated.upload_url); offTarget.searchParams.set('upload_url', direct.replace('neutral.invalid', 'other.invalid'));
  const mismatchedPrefix = new URL(allocated.upload_url); mismatchedPrefix.searchParams.set('upload_url', direct.replace('/chatgpt/', '/other/'));
  for (const url of [offOrigin, offTarget, mismatchedPrefix, 'https://neutral.invalid/__codex-api/files', 'https://neutral.invalid/estuary/upload_content_bytes', 'https://neutral.invalid/files/local-upload/not-a-ticket']) assert.equal(isLocalUploadURL(url, base), false, String(url));
});

test('aborting a genuine pending storage write never emits ready and cleans its allocated bytes', async () => {
  const bytes = byteStore();
  let release, started;
  const waiting = new Promise(resolve => { started = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  const storage = { ...bytes, async write(key, value) { started(); await gate; await bytes.write(key, value); } };
  const env = fixture({ storage }), allocated = await allocate(env.adapter), controller = new AbortController();
  const pending = upload(env.adapter, allocated, text, { signal: controller.signal });
  await waiting;
  controller.abort(); release();
  await assert.rejects(() => pending, error => error.status === 499 || error.name === 'AbortError');
  assert.equal(bytes.files.size, 0);
  assert.equal((await api(env.adapter, '/files/process_upload_stream', 'POST', { file_id: allocated.file_id })).response.status, 404);
});

test('corrupt metadata and changed actual bytes are surfaced without silently replacing evidence', async () => {
  const env = fixture(), allocated = await allocate(env.adapter);
  await upload(env.adapter, allocated);
  const rawKey = [...env.storage.files.keys()][0];
  env.storage.files.set(rawKey, new Uint8Array(text.length).fill(65));
  const process = await api(env.adapter, '/files/process_upload_stream', 'POST', { file_id: allocated.file_id });
  assert.equal(process.response.status, 409);
  assert.equal(process.data.error_code, 'file_corrupted');
  const key = [...env.metadataStorage.values.keys()][0];
  env.metadataStorage.values.set(key, '{damaged');
  assert.equal((await api(env.adapter, '/files/download/' + allocated.file_id)).response.status, 500);
  assert.equal(env.metadataStorage.values.get(key), '{damaged');
});

test('unsupported Office and binary pretending to be text never claim successful parsing', async () => {
  const env = fixture();
  for (const name of ['neutral.doc', 'neutral.xlsm', 'neutral.pptm', 'neutral.xls', 'neutral.ppt', 'neutral.xlsb']) {
    const result = await api(env.adapter, '/files', 'POST', { file_name: name, file_size: 10 });
    assert.equal(result.response.status, 415);
    assert.equal(result.data.error_code, 'unhandled_mime_type');
  }
  assert.equal((await api(env.adapter, '/files', 'POST', { file_name: 'neutral.xlsm', file_size: 10, mime_type: 'application/pdf' })).response.status, 415);
  assert.equal(env.storage.files.size, 0);
  const pdf = new TextEncoder().encode('%PDF-1.7\nNot a text document.');
  const renamed = await allocate(env.adapter, pdf, 'renamed.txt', 'text/plain');
  await upload(env.adapter, renamed, pdf);
  const process = await api(env.adapter, '/files/process_upload_stream', 'POST', { file_id: renamed.file_id });
  assert.equal(process.response.status, 415);
  assert.equal(process.data.error_code, 'unhandled_mime_type');
  assert.ok(!Array.isArray(process.data));
});

test('real PNG upload resolves native image pointers and localImage paths to the same actual bytes', async () => {
  const image = new Uint8Array(await fs.readFile(new URL('../src/native-client/dot-assets/default-dot.png', import.meta.url)));
  const env = fixture(), allocated = await allocate(env.adapter, image, 'neutral-public-image.png', 'image/png');
  await upload(env.adapter, allocated, image, { fileName: 'neutral-public-image.png', mime: 'image/png' });
  assert.equal((await api(env.adapter, '/files/' + allocated.file_id + '/uploaded', 'POST', {})).response.status, 200);
  const messages = [{ author: { role: 'user' }, content: { content_type: 'multimodal_text', parts: [{ content_type: 'image_asset_pointer', asset_pointer: 'sediment://' + allocated.file_id, width: 1, height: 1, size_bytes: image.length }, 'Describe this image.'] }, metadata: { attachments: [fileMetadata(allocated.file_id, 'neutral-public-image.png', 'image/png', image.length)] } }];
  const resolved = await env.adapter.resolveChatAttachments(messages, { threadId: 'real-image-thread' });
  assert.equal(resolved.input[0].type, 'image');
  assert.match(resolved.input[0].url, /^data:image\/png;base64,/);
  assert.deepEqual(new Uint8Array(Buffer.from(resolved.input[0].url.split(',')[1], 'base64')), image);
  const local = await env.adapter.resolveUserInputImage({ type: 'localImage', path: resolved.files[0].path }, { threadId: 'real-image-thread' });
  assert.equal(local.input.url, resolved.input[0].url);
  assert.equal(local.sha256, digest(image));
  assert.ok(local.width > 0 && local.height > 0);
  await assert.rejects(() => env.adapter.resolveUserInputImage({ type: 'image', url: 'https://not-a-local-provider.invalid/private.png' }), error => error.code === 'unsupported_image_source');
  await assert.rejects(() => env.adapter.resolveUserInputImage({ type: 'localImage', path: '../../outside.png' }, { threadId: 'real-image-thread' }));
});

test('the native class/singleton/private state and all unowned/revoked/non-GET fetch arguments remain intact', () => {
  const owned = new Set(['blob:owned']), provider = { ownsObjectURL: url => owned.has(url), fetch() { throw Error('Must not route this request'); } };
  const env = nativeDownloadFixture(provider), options = { method: 'POST', headers: { Range: 'bytes=0-3' } }, extra = {};
  assert.equal(env.wrapped, env.Native); assert.equal(env.Native.getInstance(), env.instance); assert.equal(Object.getPrototypeOf(env.instance), env.Native.prototype);
  assert.equal(env.instance.upload('POST', 'https://local.invalid/files/local-upload/issued', options), 'actual-local-upload');
  assert.equal(env.instance.upload('POST', 'https://unowned.invalid/upload', options), 'native-upload');
  for (const [url, settings] of [['blob:owned', options], ['blob:foreign', {}], ['https://unowned.invalid/file', {}]]) {
    assert.equal(env.instance.fetch(url, settings, extra), 'native-fetch');
    assert.deepEqual(env.instance.events().at(-1).args, [url, settings, extra]);
    assert.equal(env.instance.events().at(-1).args[1], settings);
  }
  owned.clear(); assert.equal(env.instance.fetch('blob:owned', {}, extra), 'native-fetch');
  assert.equal(env.uploads.length, 1);
});

test('exact owned blob GET returns the real ranged Response bytes and native header callbacks', async t => {
  const bytes = Uint8Array.from([10,20,30,40,50]), url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  t.after(() => URL.revokeObjectURL(url));
  const controller = new AbortController(), requests = [], headerEvents = [], assertions = [];
  const provider = { ownsObjectURL(value) { return value === url; }, fetch(value, options) { requests.push({ value, options, receiver: this }); return fetch(value, options); } };
  const env = nativeDownloadFixture(provider), response = await env.instance.fetch(url, { headers: { Range: 'bytes=1-3' }, signal: controller.signal, assertRequestCurrent: () => assertions.push(true), onResponseHeaders: (headers, status) => headerEvents.push({ headers, status }) });
  assert.ok(response instanceof Response); assert.equal(response.status, 206); assert.deepEqual(new Uint8Array(await response.arrayBuffer()), Uint8Array.from([20,30,40]));
  assert.equal(requests.length, 1); assert.equal(requests[0].receiver, provider); assert.equal(requests[0].options.signal, controller.signal);
  assert.equal(requests[0].options.headers.Range, 'bytes=1-3'); assert.equal(assertions.length, 2);
  assert.equal(headerEvents.length, 1); assert.equal(headerEvents[0].headers, response.headers); assert.equal(headerEvents[0].status, 206);
  assert.equal(env.instance.events().length, 0);
});

test('owned HEAD retains the actual provider Response and original GET remains the default', async () => {
  const requests = [], responses = [new Response(null, { status: 200, headers: { 'Content-Length': '3' } }), new Response('real-body')];
  const provider = { ownsObjectURL: value => value === 'blob:owned', async fetch(value, options) { requests.push(options); return responses[requests.length - 1]; } };
  const env = nativeDownloadFixture(provider);
  assert.equal(await env.instance.fetch('blob:owned', { method: 'head' }), responses[0]);
  assert.equal(await env.instance.fetch('blob:owned'), responses[1]);
  assert.deepEqual(requests.map(row => row.method), ['HEAD','GET']);
});

test('abort/current-identity checks reject before and after owned fetch without falling back to native', async () => {
  for (const stage of ['before','during','assert-before','assert-after']) {
    const controller = new AbortController(); let requests = 0, headers = 0, assertions = 0;
    const identityError = Error('Exact original request identity changed');
    const provider = { ownsObjectURL: value => value === 'blob:owned', async fetch() { requests++; if (stage === 'during') controller.abort(); return new Response('real-file'); } };
    const env = nativeDownloadFixture(provider);
    if (stage === 'before') controller.abort();
    const operation = env.instance.fetch('blob:owned', { signal: controller.signal, onResponseHeaders: () => headers++, assertRequestCurrent() { assertions++; if (stage === 'assert-before' || stage === 'assert-after' && assertions === 2) throw identityError; } });
    await assert.rejects(operation, error => stage.startsWith('assert-') ? error === identityError : error.name === 'AbortError');
    assert.equal(requests, ['before','assert-before'].includes(stage) ? 0 : 1); assert.equal(headers, 0); assert.equal(env.instance.events().length, 0);
  }
});

test('account revocation during owned fetch rejects the actual response even without an identity callback', async () => {
  let owned = true, calls = 0, headers = 0, cancelled = false;
  const provider = { ownsObjectURL: value => owned && value === 'blob:owned', async fetch() { calls++; owned = false; return new Response(new ReadableStream({ start(controller) { controller.enqueue(Uint8Array.from([1,2])); }, cancel() { cancelled = true; } })); } };
  const env = nativeDownloadFixture(provider);
  await assert.rejects(() => env.instance.fetch('blob:owned', { onResponseHeaders: () => headers++ }), error => error.name === 'AbortError');
  assert.equal(calls, 1); assert.equal(headers, 0); assert.equal(cancelled, true); assert.equal(env.instance.events().length, 0);
});

test('native wrapper rebinding requires the identical files, reference and stable download capability', () => {
  const provider = { ownsObjectURL: () => false, fetch: () => Promise.resolve(new Response()) }, env = nativeDownloadFixture(provider);
  assert.equal(wrapNativeFileUploadClass(env.Native, env.files, 'https://local.invalid/', provider), env.Native);
  assert.throws(() => wrapNativeFileUploadClass(env.Native, { ...env.files }, 'https://local.invalid/', provider), /already bound/);
  assert.throws(() => wrapNativeFileUploadClass(env.Native, env.files, 'https://different.invalid/', provider), /already bound/);
  assert.throws(() => wrapNativeFileUploadClass(env.Native, env.files, 'https://local.invalid/', { ...provider }), /already bound/);
  assert.throws(() => wrapNativeFileUploadClass(env.Native, env.files, 'https://local.invalid/', {}), TypeError);
  provider.fetch = () => Promise.resolve(new Response());
  assert.throws(() => wrapNativeFileUploadClass(env.Native, env.files, 'https://local.invalid/', provider), /already bound/);
});
