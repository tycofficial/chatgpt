import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { createBrowserToolExecutor } from '../src/native-client/browser-tool-executor.mjs';
import { createLocalFilesService } from '../src/native-client/local-files-service.mjs';
import { createLocalLibraryService } from '../src/native-client/local-library-service.mjs';
import { createLibraryPublishingExecutor } from '../src/native-client/local-library-publisher.mjs';
import { durablePublicationHost } from './support/generated-publication-host.mjs';

const context = { threadId: 'owned-thread', turnId: 'neutral-turn' };
const sha = value => createHash('sha256').update(value).digest('hex');
const fileId = n => 'file_local_' + n.toString(16).padStart(32, '0');
const call = (name, args, id) => ({ id, function: { name, arguments: JSON.stringify(args) } });

async function environment(t) {
  assert.equal(typeof globalThis.navigator?.locks?.request, 'function', 'These fixtures require the real native cross-context LockManager');
  const parent = path.resolve(process.env.GENERATED_PUBLICATION_TEST_TMPDIR ?? os.tmpdir());
  await fs.mkdir(parent, { recursive: true });
  const root = await fs.mkdtemp(path.join(parent, 'native-publication-resource-'));
  const originalOwner = 'neutral-resource-owner-' + randomUUID();
  let owner = originalOwner, clock = 1800000000000, operation = 0;
  const host = await durablePublicationHost(root, { accountId: originalOwner });
  host.storage.list = async () => { throw Error('Publication may not scan or auto-import the workspace'); };
  const base = createBrowserToolExecutor({ storage: host.storage, getWorkspaceNamespace: () => owner ?? 'guest' });
  const getAccountId = () => owner;
  const files = createLocalFilesService({
    ...host, getAccountId, getWorkspacePrefix: base.getWorkspacePrefix, now: () => clock,
    getOwnedSourceWorkspace: async ({ threadId, signal }) => {
      signal?.throwIfAborted();
      if (owner !== originalOwner || threadId !== context.threadId) throw Object.assign(Error('The real source workspace is not owned by this account'), { status: 404 });
      return { accountId: owner, threadId, prefix: base.getWorkspacePrefix(threadId) };
    },
  });
  const libraries = [];
  function makeLibrary(options = {}) {
    const library = createLocalLibraryService({ files, metadataStorage: host.metadataStorage, getAccountId, lockManager: globalThis.navigator.locks, now: () => clock, ...options });
    libraries.push(library); return library;
  }
  const library = makeLibrary();
  const executor = createLibraryPublishingExecutor({
    baseExecutor: base, publishGeneratedFile: files.publishGeneratedFile,
    getIdentity: () => owner ? { accountId: owner, userId: 'neutral-resource-user', accountUserId: 'neutral-resource-user' } : null,
    resolvePublishedResource: library.resolvePublishedResource, ownsObjectURL: library.ownsObjectURL,
  });
  async function publish({ text = 'Neutral immutable deliverable 中文.', fileName = 'deliverable.md', mimeType = 'text/markdown', previous } = {}) {
    const id = ++operation; clock++;
    await executor.execute(call('create_file', { name: 'deliverable.md', content: text }, 'create-' + id), context);
    const args = { path: 'deliverable.md', file_name: fileName, mime_type: mimeType,
      ...(previous ? { file_id: previous.fileId, expected_revision: previous.revision, expected_raw_file_id: previous.rawFileId } : {}) };
    const result = await executor.execute(call('publish_file', args, 'publish-' + id), { ...context, turnId: 'publication-turn-' + id });
    assert.equal(result.isError, false);
    assert.equal(result.structuredContent.committed, true);
    assert.equal(result.structuredContent.downloadAvailable, true);
    return { receipt: result.structuredContent, uri: result.content.find(item => item.type === 'resource_link').uri, result };
  }
  t.after(async () => {
    for (const registry of libraries) registry.dispose();
    base.dispose();
    const absolute = path.resolve(root);
    if (!absolute.startsWith(parent + path.sep) || !path.basename(absolute).startsWith('native-publication-resource-')) throw Error('Unexpected cleanup target');
    await fs.rm(absolute, { recursive: true, force: true });
  });
  return { root, host, base, files, library, executor, publish, makeLibrary, originalOwner, setOwner: value => { owner = value; } };
}

async function assertBytes(uri, receipt) {
  const response = await fetch(uri);
  assert.equal(response.status, 200);
  const bytes = new Uint8Array(await response.arrayBuffer());
  assert.equal(bytes.length, receipt.size);
  assert.equal(sha(bytes), receipt.sha256);
  assert.equal(response.headers.get('Content-Type'), receipt.mimeType);
}

test('real create/publish/verified bytes grant only the exact generated immutable receipt synchronously', async t => {
  const env = await environment(t), { receipt, uri } = await env.publish();
  assert.notEqual(receipt.fileId, receipt.rawFileId);
  const value = env.library.ownsPublishedResource(uri, receipt);
  assert.equal(value, true);
  assert.equal(value instanceof Promise, false);
  assert.equal(env.library.ownsObjectURL(uri), true);
  assert.equal(env.library.ownsPublishedResource(uri, structuredClone(receipt)), true);
  const saved = await env.files.readFile(receipt.rawFileId);
  assert.equal(saved.record.generated.fileId, receipt.fileId);
  assert.equal(saved.record.generated.revision, receipt.revision);
  assert.equal(sha(saved.bytes), receipt.sha256);
  await assertBytes(uri, receipt);
});

test('each public immutable identity field is checked and unknown/foreign URI schemes never grant authority', async t => {
  const env = await environment(t), { receipt, uri } = await env.publish();
  for (const patch of [
    { committed: false }, { fileId: fileId(1) }, { rawFileId: fileId(2) },
    { fileId: receipt.rawFileId }, { rawFileId: receipt.fileId },
    { revision: receipt.revision + 1 }, { revision: 0 },
    { sha256: '0'.repeat(64) }, { sha256: receipt.sha256.toUpperCase() },
    { mimeType: 'text/html' }, { mimeType: '' },
    { size: receipt.size + 1 }, { size: -1 }, { fileName: 'different.md' }, { fileName: '' },
  ]) assert.equal(env.library.ownsPublishedResource(uri, { ...receipt, ...patch }), false, JSON.stringify(patch));
  for (const value of [null, undefined, [], {}, { ...receipt, committed: 'true' }]) assert.equal(env.library.ownsPublishedResource(uri, value), false);
  for (const value of ['', null, new URL(uri), 'https://site.invalid/file', 'data:text/plain,same', 'javascript:void(0)', uri + '#suffix']) assert.equal(env.library.ownsPublishedResource(value, receipt), false);
  const foreign = URL.createObjectURL(new Blob([await (await fetch(uri)).arrayBuffer()], { type: receipt.mimeType }));
  try { assert.equal(env.library.ownsPublishedResource(foreign, receipt), false); assert.equal(env.library.ownsObjectURL(foreign), false); }
  finally { URL.revokeObjectURL(foreign); }
  assert.equal(env.library.ownsPublishedResource(uri, receipt), true);
});

test('old raw revision remains bound to its own bytes/name/MIME after a genuine update and cannot be paired with the new receipt', async t => {
  const env = await environment(t), first = await env.publish({ text: 'Original immutable text.', fileName: 'old.md' });
  const second = await env.publish({ previous: first.receipt, text: 'Actual updated immutable text.', fileName: 'new.txt', mimeType: 'text/plain' });
  assert.equal(first.receipt.fileId, second.receipt.fileId);
  assert.notEqual(first.receipt.rawFileId, second.receipt.rawFileId);
  assert.equal(second.receipt.revision, 2);
  assert.equal(env.library.ownsPublishedResource(first.uri, first.receipt), true);
  assert.equal(env.library.ownsPublishedResource(second.uri, second.receipt), true);
  assert.equal(env.library.ownsPublishedResource(first.uri, second.receipt), false);
  assert.equal(env.library.ownsPublishedResource(second.uri, first.receipt), false);
  const replay = await env.library.resolvePublishedResource(first.receipt);
  assert.equal(replay.uri, first.uri);
  await assertBytes(first.uri, first.receipt); await assertBytes(second.uri, second.receipt);
});

test('a real uploaded owned Blob never qualifies as a generated receipt even with its actual bytes/SHA', async t => {
  const env = await environment(t), bytes = new TextEncoder().encode('Actual neutral uploaded bytes.');
  const response = await env.files.handle(new Request('https://site.invalid/backend-api/files', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file_name: 'upload.txt', file_size: bytes.length, mime_type: 'text/plain' }) }), '/files');
  assert.equal(response.status, 200);
  const ticket = await response.json(), form = new FormData();
  form.set('file', new Blob([bytes], { type: 'text/plain' }), 'upload.txt');
  await env.files.upload('POST', ticket.upload_url, { body: form });
  const ready = await env.files.handle(new Request('https://site.invalid/backend-api/files/' + ticket.file_id + '/uploaded', { method: 'POST' }), '/files/' + ticket.file_id + '/uploaded');
  assert.equal(ready.status, 200);
  const source = await env.library.handle(new Request('https://site.invalid/backend-api/files/download/' + ticket.file_id), '/files/download/' + ticket.file_id);
  assert.equal(source.status, 200); const { download_url: uri } = await source.json();
  assert.equal(env.library.ownsObjectURL(uri), true);
  const fake = { committed: true, fileId: fileId(3), rawFileId: ticket.file_id, revision: 1, sha256: sha(bytes), fileName: 'upload.txt', mimeType: 'text/plain', size: bytes.length };
  assert.equal(env.library.ownsPublishedResource(uri, fake), false);
  assert.equal(env.library.ownsPublishedResource(uri, { ...fake, fileId: ticket.file_id }), false);
});

test('account replacement and logout revoke old grants without permanently disabling a new current-owner registry', async t => {
  for (const replacement of ['another-neutral-owner', null]) {
    const env = await environment(t), { uri, receipt } = await env.publish();
    env.setOwner(replacement);
    assert.equal(env.library.ownsPublishedResource(uri, receipt), false);
    assert.equal(env.library.ownsObjectURL(uri), false);
    await assert.rejects(fetch(uri));
    env.setOwner(env.originalOwner);
    assert.equal(env.library.ownsPublishedResource(uri, receipt), false);
    const fresh = await env.library.resolvePublishedResource(receipt);
    assert.notEqual(fresh.uri, uri);
    assert.equal(env.library.ownsPublishedResource(fresh.uri, receipt), true);
    await assertBytes(fresh.uri, receipt);
  }
});

test('explicit disposal makes the new verification capability terminal while retaining legacy ownsObjectURL behavior', async t => {
  const env = await environment(t), { uri, receipt } = await env.publish();
  env.library.dispose();
  assert.equal(env.library.ownsPublishedResource(uri, receipt), false);
  assert.equal(env.library.ownsObjectURL(uri), false);
  const later = await env.library.resolvePublishedResource(receipt);
  assert.equal(env.library.ownsObjectURL(later.uri), true, 'Legacy resource methods were not changed to throw after disposal');
  assert.equal(env.library.ownsPublishedResource(later.uri, receipt), false, 'A disposed verifier must not silently rearm');
});

test('a fresh provider reconstructs an exact new grant from real persisted raw bytes but never adopts another registry Blob string', async t => {
  const env = await environment(t), { uri, receipt } = await env.publish(), fresh = env.makeLibrary();
  assert.equal(fresh.ownsPublishedResource(uri, receipt), false);
  const resource = await fresh.resolvePublishedResource(structuredClone(receipt));
  assert.notEqual(resource.uri, uri);
  assert.equal(fresh.ownsPublishedResource(resource.uri, receipt), true);
  assert.equal(env.library.ownsPublishedResource(resource.uri, receipt), false);
  await assertBytes(resource.uri, receipt);
});

test('confirmed permanent deletion removes both raw revisions and revokes the exact publication grants', async t => {
  const env = await environment(t), first = await env.publish(), second = await env.publish({ previous: first.receipt, text: 'Deletion second version.' });
  const pathname = '/files/library/files/' + first.receipt.fileId;
  const response = await env.library.handle(new Request('https://site.invalid/backend-api' + pathname + '?soft_delete=false&file_id=' + second.receipt.rawFileId, { method: 'DELETE' }), pathname);
  assert.equal(response.status, 200, await response.text());
  assert.equal(env.library.ownsPublishedResource(first.uri, first.receipt), false);
  assert.equal(env.library.ownsPublishedResource(second.uri, second.receipt), false);
  await assert.rejects(env.files.readFile(first.receipt.rawFileId));
  await assert.rejects(env.files.readFile(second.receipt.rawFileId));
});

test('receipt getters cannot replace the owner during a synchronous verification or turn exceptions into success', async t => {
  const env = await environment(t), { uri, receipt } = await env.publish();
  const hostile = { ...receipt, get fileName() { env.setOwner('replacement-during-receipt-read'); return receipt.fileName; } };
  assert.equal(env.library.ownsPublishedResource(uri, hostile), false);
  env.setOwner(env.originalOwner);
  const resource = await env.library.resolvePublishedResource(receipt);
  assert.equal(env.library.ownsPublishedResource(resource.uri, { ...receipt, get mimeType() { throw Error('Neutral getter failure'); } }), false);
  assert.equal(env.library.ownsPublishedResource(resource.uri, receipt), true);
});

test('native temporary copy grants only its verified bytes to the intact synchronous save action', async t => {
  const env = await environment(t), { uri, receipt } = await env.publish();
  const input = new Uint8Array(await (await fetch(uri)).arrayBuffer());
  let derived, seenBlob;
  const result = await env.library.downloadVerifiedBytes(input, { fileName: 'saved.md' }, (blob, fileName) => {
    seenBlob = blob;
    assert.equal(fileName, 'saved.md'); assert.equal(blob.type, receipt.mimeType);
    derived = env.library.createNativeDownloadURL(blob, value => URL.createObjectURL(value));
    assert.equal(env.library.ownsObjectURL(derived), true);
  });
  assert.deepEqual(result, { handled: true });
  assert.equal(sha(new Uint8Array(await (await fetch(derived)).arrayBuffer())), receipt.sha256);
  const late = env.library.createNativeDownloadURL(seenBlob, value => URL.createObjectURL(value));
  const sameBytes = env.library.createNativeDownloadURL(new Blob([input], { type: receipt.mimeType }), value => URL.createObjectURL(value));
  try { assert.equal(env.library.ownsObjectURL(late), false); assert.equal(env.library.ownsObjectURL(sameBytes), false); }
  finally { URL.revokeObjectURL(late); URL.revokeObjectURL(sameBytes); }
  env.library.forgetNativeDownloadURL(derived); URL.revokeObjectURL(derived);
  assert.equal(env.library.ownsObjectURL(derived), false);
});

test('native copy with unknown bytes or a fresh unverified registry cannot adopt any URL', async t => {
  const env = await environment(t), { uri } = await env.publish(), fresh = env.makeLibrary();
  const input = new Uint8Array(await (await fetch(uri)).arrayBuffer());
  const never = () => assert.fail('Unverified bytes must not invoke native save');
  assert.deepEqual(await fresh.downloadVerifiedBytes(input, {}, never), { handled: false });
  assert.deepEqual(await env.library.downloadVerifiedBytes(new TextEncoder().encode('Unknown content'), {}, never), { handled: false });
  const response = await fresh.handle(new Request('https://site.invalid/backend-api/files/library/nodes'));
  assert.equal(response.status, 200);
  assert.deepEqual(await fresh.downloadVerifiedBytes(input, {}, never), { handled: false }, 'Catalog metadata alone is not byte authority');
});

test('native old-revision copy retains exact immutable bytes after an update and all derived grants revoke on deletion', async t => {
  const env = await environment(t), old = await env.publish({ text: 'First immutable bytes' });
  const next = await env.publish({ previous: old.receipt, text: 'New immutable bytes' });
  const input = new Uint8Array(await (await fetch(old.uri)).arrayBuffer());
  let derived;
  assert.deepEqual(await env.library.downloadVerifiedBytes(input, {}, blob => { derived = env.library.createNativeDownloadURL(blob, value => URL.createObjectURL(value)); }), { handled: true });
  assert.equal(sha(await (await fetch(derived)).bytes()), old.receipt.sha256);
  assert.notEqual(old.receipt.sha256, next.receipt.sha256);
  const pathname = '/files/library/files/' + old.receipt.fileId;
  const response = await env.library.handle(new Request('https://site.invalid/backend-api' + pathname + '?soft_delete=false&file_id=' + next.receipt.rawFileId, { method: 'DELETE' }), pathname);
  assert.equal(response.status, 200);
  assert.equal(env.library.ownsObjectURL(derived), false); await assert.rejects(fetch(derived));
  assert.deepEqual(await env.library.downloadVerifiedBytes(input, {}, () => assert.fail('Deleted bytes must not save')), { handled: false });
});

test('native copy snapshots mutable temporary input before asynchronous verification', async t => {
  const env = await environment(t), { uri, receipt } = await env.publish();
  const input = new Uint8Array(await (await fetch(uri)).arrayBuffer());
  let saved;
  const operation = env.library.downloadVerifiedBytes(input, {}, blob => { saved = blob; });
  input.fill(0);
  assert.deepEqual(await operation, { handled: true });
  assert.equal(sha(new Uint8Array(await saved.arrayBuffer())), receipt.sha256);
});

test('native copy checks owner and lifecycle again after asynchronous raw read', async t => {
  for (const change of ['owner', 'dispose']) {
    const env = await environment(t), { receipt, uri } = await env.publish();
    let duringCopy = false;
    const registry = env.makeLibrary({ files: { ...env.files, readFile: async (...args) => {
      const result = await env.files.readFile(...args);
      if (duringCopy) { if (change === 'owner') env.setOwner('replacement-copy-owner'); else registry.dispose(); }
      return result;
    } } });
    await registry.resolvePublishedResource(receipt); duringCopy = true;
    const bytes = new Uint8Array(await (await fetch(uri)).arrayBuffer());
    await assert.rejects(registry.downloadVerifiedBytes(bytes, {}, () => assert.fail('Changed identity must not save')));
  }
});

test('native URL creation rechecks identity and native save failures reject instead of reporting success', async t => {
  const env = await environment(t), { uri } = await env.publish();
  const bytes = new Uint8Array(await (await fetch(uri)).arrayBuffer());
  await assert.rejects(env.library.downloadVerifiedBytes(bytes, {}, () => { throw Error('Native save failed'); }), /Native save failed/);
  let stale;
  await assert.rejects(env.library.downloadVerifiedBytes(bytes, {}, blob => {
    env.library.createNativeDownloadURL(blob, value => {
      stale = URL.createObjectURL(value); env.setOwner(null); return stale;
    });
  }));
  assert.equal(env.library.ownsObjectURL(stale), false);
  await assert.rejects(fetch(stale));
});
