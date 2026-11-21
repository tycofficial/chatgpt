import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { wrapNativeDownloadServices } from '../src/native-client/local-native-download.mjs';

// Execute the exact pinned public factories, without modifying their bodies.
// No browser or fake RPC implementation is involved in these lifecycle checks.
function originalFactory(file, hash, id, nextId, imports = {}) {
  const bytes = fs.readFileSync(new URL('../original-client/public/chatgpt.com/cdn/assets/' + file, import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), hash);
  const exports = {}, require = id => { if (!(id in imports)) throw Error('Unexpected native import ' + id); return imports[id]; };
  require.d = (target, getters = {}, values = {}) => {
    for (const [key, getter] of Object.entries(getters)) Object.defineProperty(target, key, { enumerable: true, get: getter });
    for (const [key, value] of Object.entries(values)) Object.defineProperty(target, key, { enumerable: true, value });
  };
  const source = bytes.toString('utf8');
  const marker = source.indexOf(id + ':(function');
  assert(marker >= 0, 'Missing original factory ' + id);
  const start = marker + id.length + 1;
  const end = source.indexOf(',' + nextId + ':(function', start);
  assert(end > start, 'Missing boundary after ' + id);
  const factory = Function('return (' + source.slice(start, end) + ')')();
  factory({ exports }, exports, require); return exports;
}
const rpc = originalFactory('399565.700e278f2d.js', 'f50ab4416402df1800059525a3db6d96f9b684b6a5e3aa8045e3f7e65aebd95e', 'ZG9f', 'QkCx');
const basename = value => value.replaceAll('\\', '/').replace(/\/+$/, '').split('/').at(-1) ?? value;
const temporary = originalFactory('955979.17a59d5e45.js', '8e87e7d34bbcdd3ca24abdd9be485f546a41bb9c2bcadf2e654afd0691d0bf48', 'Afr7', 'JmpW', {
  bnxy: { j: basename },
  Z8fU: { a: '/__codex_browser_temporary_files__/' },
});
const sanitize = value => { const result = basename(value).replace(/[<>:"|?*]/gu, '_').replaceAll('\0', '_'); return !result || result === '.' || result === '..' ? 'download' : result; };
const data = value => new TextEncoder().encode(value);
class TooLarge extends Error { constructor(length) { super('File exceeds the preview size limit'); this.byteLength = length; } }

function environment(t, overrides = {}) {
  const delegated = [], verified = [], downloaded = [];
  const lifecycle = { originalMethodReads: 0, originalMethodDisposals: 0 };
  class NativeTarget extends rpc.c {
    #receiver = 'real-native-private-receiver';
    get downloadCopy() {
      lifecycle.originalMethodReads++;
      const method = async (...args) => { delegated.push({ receiver: this.#receiver, args }); if (args[0]?.failOriginal) throw Error('Original native download failed'); return 'original-result'; };
      method[Symbol.dispose] = () => { lifecycle.originalMethodDisposals++; };
      return method;
    }
    async readText(value) { return { text: this.#receiver + ':' + value.path }; }
  }
  const originalStub = new rpc.b(new NativeTarget());
  const serviceDispose = () => originalStub[Symbol.dispose]();
  const services = Object.freeze({ workspaceFiles: originalStub, untouched: Object.freeze({ marker: 'native-service' }), [Symbol.dispose]: serviceDispose });
  const args = {
    isTemporaryPath: temporary.c, getTemporaryFile: temporary.b, getDefaultFileName: basename,
    sanitizeFileName: sanitize, maxBytes: 0x10000000, createTooLargeError: n => new TooLarge(n),
    wrapRpcMethod: callback => new rpc.b(callback),
    downloadVerifiedBytes: async (bytes, options, native) => { verified.push({ bytes: bytes.slice(), options }); native(new Blob([bytes], { type: 'text/markdown' }), options.fileName); return { handled: true }; },
    nativeDownload: (blob, name) => { downloaded.push({ blob, name }); },
    ...overrides,
  };
  const wrapped = wrapNativeDownloadServices(services, args), paths = [];
  t.after(() => { for (const path of paths) temporary.d(path); originalStub[Symbol.dispose](); });
  const save = async (request, ...extra) => { const method = await wrapped.workspaceFiles.downloadCopy; try { return await method(request, ...extra); } finally { method[Symbol.dispose](); } };
  return { originalStub, services, wrapped, args, delegated, verified, downloaded, lifecycle, save,
    file(text = 'Actual neutral immutable bytes.', name = 'neutral.md') { const path = temporary.a(name, data(text)); paths.push(path); return path; } };
}

test('the wrapper preserves immutable native RpcStubs, other methods/private receivers and service disposal', async t => {
  const e = environment(t);
  assert.notEqual(e.wrapped, e.services); assert.notEqual(e.wrapped.workspaceFiles, e.originalStub);
  assert.equal(e.services.workspaceFiles, e.originalStub); assert.equal(e.wrapped.untouched, e.services.untouched);
  assert.equal(e.wrapped[Symbol.dispose], e.services[Symbol.dispose]); assert.equal(Object.isExtensible(e.wrapped), false);
  assert.equal(Object.getPrototypeOf(e.wrapped.workspaceFiles), Object.getPrototypeOf(e.originalStub));
  assert.throws(() => { e.originalStub.downloadCopy = () => {}; }, /assign/);
  assert.throws(() => Object.defineProperty(e.originalStub, 'downloadCopy', { value: () => {} }), /define/);
  assert.deepEqual(await e.wrapped.workspaceFiles.readText({ path: 'neutral.txt' }), { text: 'real-native-private-receiver:neutral.txt' });
});

test('real Afr7 bytes reach the asynchronous verifier and only its actual synchronous primitive completes the native save', async t => {
  const e = environment(t), path = e.file('Actual bytes 中文.');
  assert.equal(await e.save({ path, fileName: '../export?.md' }), undefined);
  assert.equal(e.delegated.length, 0); assert.equal(e.verified.length, 1); assert.equal(e.downloaded.length, 1);
  assert.equal(new TextDecoder().decode(e.verified[0].bytes), 'Actual bytes 中文.');
  assert.equal(e.verified[0].options.fileName, 'export_.md'); assert.equal(e.downloaded[0].name, 'export_.md');
  assert.equal(e.downloaded[0].blob.type, 'text/markdown'); assert.equal(await e.downloaded[0].blob.text(), 'Actual bytes 中文.');
  await e.save({ path }); assert.equal(e.downloaded[1].name, 'neutral.md');
});

test('each property access creates a real independently disposable RpcStub; using one never poisons the next save', async t => {
  const e = environment(t), path = e.file(), first = await e.wrapped.workspaceFiles.downloadCopy;
  await first({ path }); first[Symbol.dispose]();
  await assert.rejects(async () => await first({ path }), /disposed/);
  const second = await e.wrapped.workspaceFiles.downloadCopy;
  assert.notEqual(first, second);
  try { await second({ path }); } finally { second[Symbol.dispose](); }
  assert.equal(e.downloaded.length, 2);
  // n10M first awaits a disposable property, then calls a fresh property value.
  const held = await e.wrapped.workspaceFiles.downloadCopy;
  try { await e.wrapped.workspaceFiles.downloadCopy({ path }); } finally { held[Symbol.dispose](); }
  assert.equal(e.downloaded.length, 3);
});

test('managed saves never acquire the original child handle; every successful or failed fallback disposes its actual native child', async t => {
  const e = environment(t), path = e.file();
  await e.save({ path });
  assert.deepEqual(e.lifecycle, { originalMethodReads: 0, originalMethodDisposals: 0 });
  await e.save({ path: '/mnt/data/original-only.txt' });
  assert.deepEqual(e.lifecycle, { originalMethodReads: 1, originalMethodDisposals: 1 });
  await assert.rejects(e.save({ path: '/mnt/data/original-failure.txt', failOriginal: true }), /Original native download failed/);
  assert.deepEqual(e.lifecycle, { originalMethodReads: 2, originalMethodDisposals: 2 });
  await e.save({ path });
  assert.deepEqual(e.lifecycle, { originalMethodReads: 2, originalMethodDisposals: 2 });
});

test('non-temporary, missing temporary and unrecognized verified bytes delegate unchanged arguments to the original private receiver', async t => {
  const e = environment(t, { downloadVerifiedBytes: async () => ({ handled: false }) });
  const requests = [{ path: '/mnt/data/unpublished.txt', fileName: 'unchanged?.txt' }, { path: '/__codex_browser_temporary_files__/missing/file.txt' }, { path: e.file() }];
  for (const request of requests) assert.equal(await e.save(request, 'original-extra'), 'original-result');
  assert.equal(e.delegated.length, 3);
  for (let i = 0; i < requests.length; i++) assert.deepEqual(e.delegated[i], { receiver: 'real-native-private-receiver', args: [requests[i], 'original-extra'] });
  assert.equal(e.downloaded.length, 0);
});

test('the native maximum, tighter per-call limit and explicit null use original preview-limit errors before verification', async t => {
  const e = environment(t, { maxBytes: 4 }), path = e.file('12345');
  for (const request of [{ path }, { path, maxBytes: 100 }, { path, maxBytes: 3 }, { path, maxBytes: null }]) {
    await assert.rejects(e.save(request), error => error.message === 'File exceeds the preview size limit' && error.byteLength === 5);
  }
  assert.equal(e.verified.length, 0); assert.equal(e.delegated.length, 0); assert.equal(e.downloaded.length, 0);
});

test('the byte copy is admitted before await and verifier mutation never changes the original temporary registry', async t => {
  let snapshot, release; const ready = new Promise(resolve => { release = resolve; });
  const e = environment(t, { downloadVerifiedBytes: async (bytes, options, native) => { snapshot = bytes; await ready; native(new Blob([bytes]), options.fileName); return { handled: true }; } }), path = e.file('abcdef');
  const operation = e.save({ path });
  for (let i = 0; i < 10 && !snapshot; i++) await new Promise(resolve => setTimeout(resolve, 0));
  assert.ok(snapshot); temporary.b(path).bytes[0] = 88; assert.equal(new TextDecoder().decode(snapshot), 'abcdef');
  snapshot[1] = 89; assert.equal(new TextDecoder().decode(temporary.b(path).bytes), 'Xbcdef');
  release(); await operation; assert.equal(e.delegated.length, 0);
});

test('ownership/corruption/provider failures propagate without fallback or false native downloads', async t => {
  for (const code of ['LOCAL_LIBRARY_ACCOUNT_CHANGED', 'LOCAL_LIBRARY_FILE_CORRUPTED', 'LOCAL_LIBRARY_FILE_NOT_FOUND']) {
    const e = environment(t, { downloadVerifiedBytes: async () => { throw Object.assign(Error(code), { code, status: 409 }); } }), path = e.file();
    await assert.rejects(e.save({ path }), error => error.code === code);
    assert.equal(e.delegated.length, 0); assert.equal(e.downloaded.length, 0);
  }
});

test('a provider cannot claim handled without real native execution or decline after executing it', async t => {
  for (const downloadVerifiedBytes of [async () => ({ handled: true }), async () => undefined, async (bytes, options, native) => { native(new Blob([bytes]), options.fileName); return { handled: false }; }]) {
    const e = environment(t, { downloadVerifiedBytes }), path = e.file();
    await assert.rejects(e.save({ path }), /handled|inconsistent/);
    assert.equal(e.delegated.length, 0);
  }
});

test('multiple or asynchronous primitive invocations are rejected rather than silently changing the native download contract', async t => {
  const twice = environment(t, { downloadVerifiedBytes: async (bytes, options, native) => { native(new Blob([bytes]), options.fileName); native(new Blob([bytes]), options.fileName); return { handled: true }; } });
  await assert.rejects(twice.save({ path: twice.file() }), /only once/); assert.equal(twice.downloaded.length, 1);
  const asynchronous = environment(t, { nativeDownload: async () => {} });
  await assert.rejects(asynchronous.save({ path: asynchronous.file() }), /synchronous/);
});

test('configuration errors cannot replace native RPC disposal with a fake plain async function', async t => {
  const e = environment(t);
  assert.throws(() => wrapNativeDownloadServices(e.services, { ...e.args, maxBytes: 0 }), /services/);
  const broken = wrapNativeDownloadServices(e.services, { ...e.args, wrapRpcMethod: fn => fn });
  assert.throws(() => broken.workspaceFiles.downloadCopy, /RpcStub/);
  const noFiles = Object.freeze({ other: true }); assert.equal(wrapNativeDownloadServices(noFiles, e.args), noFiles);
});
