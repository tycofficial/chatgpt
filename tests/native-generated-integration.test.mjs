import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { createBrowserToolExecutor } from '../src/native-client/browser-tool-executor.mjs';
import { createLocalFilesService } from '../src/native-client/local-files-service.mjs';
import { createLocalLibraryService, LOCAL_GENERATED_ARTIFACT_TYPE } from '../src/native-client/local-library-service.mjs';
import { createLibraryPublishingExecutor } from '../src/native-client/local-library-publisher.mjs';
import { createLocalDocumentExtractor } from '../src/native-client/local-document-extraction.mjs';
import { durablePublicationHost } from './support/generated-publication-host.mjs';
import { createNodeDocumentWorkerFactory, canonicalDocumentWorkerURL } from './support/document-worker-host.mjs';
import { makeDocx } from './support/document-fixtures.mjs';

const encoder = new TextEncoder(), decoder = new TextDecoder();
const sha = value => createHash('sha256').update(value).digest('hex');
const context = { threadId: 'owned-thread', turnId: 'turn-one' };
const tool = (name, args, id = 'call-one') => ({ id, function: { name, arguments: JSON.stringify(args) } });
const publishCall = (args = { path: 'deliverable.md', mime_type: 'text/markdown' }, id = 'publish-one') => tool('publish_file', args, id);

async function environment(t, options = {}) {
  const parent = path.resolve(process.env.GENERATED_PUBLICATION_TEST_TMPDIR ?? os.tmpdir());
  const root = await fs.mkdtemp(path.join(parent, 'native-generated-integration-'));
  const accountId = 'generated-integration-' + randomUUID();
  let identity = { accountId, userId: 'neutral-user', accountUserId: 'neutral-user', role: 'free' }, clock = 1800000000000;
  const host = await durablePublicationHost(root, { accountId });
  // Publishing one requested file must not enumerate a workspace or auto-import logs.
  host.storage.list = async () => { throw Error('Unexpected workspace scan'); };
  const threads = new Map([[context.threadId, { accountId, ephemeral: false }]]), providers = [];
  let extractor;
  if (options.realDocuments) extractor = createLocalDocumentExtractor({ workerFactory: createNodeDocumentWorkerFactory(), workerURL: canonicalDocumentWorkerURL('generated-combined-integration') });
  function makeProvider(overrides = {}) {
    const base = createBrowserToolExecutor({ storage: host.storage, getWorkspaceNamespace: () => identity?.role === 'admin' ? null : identity?.accountId ?? 'guest' });
    const getAccountId = () => identity?.accountId ?? null;
    const getOwnedSourceWorkspace = async ({ threadId, signal }) => {
      signal?.throwIfAborted();
      const owner = getAccountId(), thread = threads.get(threadId);
      if (!owner) throw Object.assign(Error('Sign in before permanent publication'), { status: 401 });
      if (!thread || thread.accountId !== owner) throw Object.assign(Error('The source thread is not owned by this account'), { status: 404 });
      if (thread.ephemeral) throw Object.assign(Error('Temporary conversations cannot publish permanent Library files'), { status: 409, code: 'publication_ephemeral' });
      return { accountId: owner, threadId, prefix: base.getWorkspacePrefix(threadId) };
    };
    const files = createLocalFilesService({ storage: host.storage, metadataStorage: host.metadataStorage, getAccountId, getWorkspacePrefix: base.getWorkspacePrefix, getOwnedSourceWorkspace, storageLocks: host.storageLocks, documentExtractor: extractor, now: () => clock, ...overrides.files });
    const library = createLocalLibraryService({ files, metadataStorage: host.metadataStorage, getAccountId, lockManager: globalThis.navigator.locks, now: () => clock });
    const executor = createLibraryPublishingExecutor({ baseExecutor: base, publishGeneratedFile: files.publishGeneratedFile, getIdentity: () => identity,
      ...(overrides.resources === false ? {} : { resolvePublishedResource: library.resolvePublishedResource, ownsObjectURL: library.ownsObjectURL }), ...overrides.publisher });
    const provider = { base, files, library, executor };
    providers.push(provider); return provider;
  }
  t.after(async () => {
    for (const provider of providers) { provider.library.dispose(); provider.base.dispose(); }
    extractor?.close();
    const absolute = path.resolve(root);
    if (!absolute.startsWith(parent + path.sep) || !path.basename(absolute).startsWith('native-generated-integration-')) throw Error('Unexpected test directory');
    await fs.rm(absolute, { recursive: true, force: true });
  });
  return { root, host, threads, accountId, makeProvider, provider: makeProvider(options), get identity() { return identity; }, setIdentity: value => { identity = value; }, nextTime: () => ++clock };
}

async function libraryCall(provider, pathname, method = 'GET', value, signal) {
  const response = await provider.library.handle(new Request('https://site.invalid/backend-api' + pathname, { method, ...(value !== undefined ? { body: JSON.stringify(value), headers: { 'Content-Type': 'application/json' } } : {}), signal }), new URL('https://site.invalid' + pathname).pathname);
  assert.ok(response, 'The actual Library provider must handle this route');
  return { response, value: await response.json() };
}
const recommended = (provider, value = {}) => libraryCall(provider, '/files/library', 'POST', { cursor: null, limit: 50, categories: [], source: null, include_hidden_files: false, include_saved_entities: true, include_sites: false, trashed_only: false, ranking: 'suggested', ...value });
const create = (provider, text = 'Neutral generated deliverable 中文.', name = 'deliverable.md', ctx = context) => provider.executor.execute(tool('create_file', { name, content: text }, 'create-' + name), ctx);
async function readBlob(uri, expected) {
  const response = await fetch(uri); assert.equal(response.status, 200);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (expected) { assert.equal(sha(bytes), expected.sha256); assert.equal(bytes.length, expected.size); assert.equal(response.headers.get('Content-Type'), expected.mimeType); }
  return bytes;
}
async function download(provider, rawId) {
  const result = await libraryCall(provider, '/files/download/' + rawId);
  assert.equal(result.response.status, 200, JSON.stringify(result.value));
  assert.equal(provider.library.ownsObjectURL(result.value.download_url), true);
  return result.value;
}
async function uploadText(provider, text = 'Neutral actual uploaded file.') {
  const bytes = encoder.encode(text);
  const request = new Request('https://site.invalid/backend-api/files', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file_name: 'upload.txt', file_size: bytes.length, mime_type: 'text/plain' }) });
  const created = await provider.files.handle(request, '/files'); assert.equal(created.status, 200);
  const ticket = await created.json(), form = new FormData(); form.set('file', new Blob([bytes], { type: 'text/plain' }), 'upload.txt'); await provider.files.upload('POST', ticket.upload_url, { body: form });
  const ready = await provider.files.handle(new Request('https://site.invalid/backend-api/files/' + ticket.file_id + '/uploaded', { method: 'POST' }), '/files/' + ticket.file_id + '/uploaded');
  assert.equal(ready.status, 200); return ticket.file_id;
}

test('actual create_file stays workspace-only until explicit publish_file produces dual IDs, Generated DTO and verified download bytes', async t => {
  const env = await environment(t), p = env.provider;
  const created = await create(p); await create(p, 'A real unrequested log.', '.logs/task.txt');
  assert.equal((await p.files.listFiles()).length, 0); assert.equal((await recommended(p)).value.items.length, 0);
  const uploadedId = await uploadText(p);
  const result = await p.executor.execute(publishCall(), context), receipt = result.structuredContent;
  assert.equal(result.isError, false); assert.equal(receipt.committed, true); assert.equal(receipt.downloadAvailable, true); assert.notEqual(receipt.fileId, receipt.rawFileId);
  const saved = await p.files.readFile(receipt.rawFileId); assert.equal(decoder.decode(saved.bytes), 'Neutral generated deliverable 中文.'); assert.equal(sha(saved.bytes), receipt.sha256);
  assert.equal(saved.record.generated.fileId, receipt.fileId); assert.equal(saved.record.generated.revision, 1);
  assert.equal(saved.record.ticket, undefined); assert.equal(saved.record.namespace.includes('publication-'), true);
  const generated = await recommended(p, { source: 'generated' }), uploaded = await recommended(p, { source: 'uploaded' });
  assert.deepEqual(generated.value.items.map(row => row.id), [receipt.fileId]); assert.deepEqual(uploaded.value.items.map(row => row.id), [uploadedId]);
  const card = generated.value.items[0]; assert.equal(card.file_id, receipt.rawFileId); assert.equal(card.file_name, receipt.fileName); assert.equal(card.mime_type, receipt.mimeType); assert.equal(card.library_artifact_type, LOCAL_GENERATED_ARTIFACT_TYPE);
  assert.equal(card.current_version_number, undefined); assert.equal(card.share_url, undefined); assert.equal(/namespace|ticket|operationKey|sourcePath/.test(JSON.stringify(card)), false);
  const nodes = await libraryCall(p, '/files/library/nodes?source=generated'); assert.equal(nodes.value.items[0].id, receipt.fileId); assert.equal(nodes.value.items[0].file_id, receipt.rawFileId);
  const link = result.content.find(value => value.type === 'resource_link'); assert.ok(link); assert.equal(sha(await readBlob(link.uri, receipt)), receipt.sha256);
  const sourceDownload = await download(p, receipt.rawFileId); await readBlob(sourceDownload.download_url, receipt);
  assert.equal(created.structuredContent.file.path, '/mnt/data/deliverable.md'); assert.equal((await p.files.listFiles()).length, 2);
});

test('updates preserve stable Library folder/name/favorite while old raw revisions and old resource bytes never redirect to the new workspace content', async t => {
  const env = await environment(t), p = env.provider; await create(p, 'Version one immutable.');
  const first = (await p.executor.execute(publishCall(), context)).structuredContent;
  const firstURL = (await p.library.resolvePublishedResource(first)).uri;
  const folder = await libraryCall(p, '/files/library/directories', 'POST', { name: 'Neutral folder', parent_directory_id: null });
  await libraryCall(p, '/files/library/files/' + first.fileId, 'PATCH', { file_name: 'Visible saved name.md' });
  await libraryCall(p, '/files/library/files/' + first.fileId + '/move', 'PATCH', { directory_id: folder.value.id });
  const favorite = await libraryCall(p, '/files/library/favorites', 'POST', { target_ref: { type: 'library_file', library_file_id: first.fileId } }); assert.equal(favorite.response.status, 200, JSON.stringify(favorite.value));
  await create(p, 'Version two source bytes.'); env.nextTime();
  const second = (await p.executor.execute(publishCall({ path: 'deliverable.md', file_name: 'revision-two.md', mime_type: 'text/markdown', file_id: first.fileId, expected_revision: 1, expected_raw_file_id: first.rawFileId }, 'publish-two'), { ...context, turnId: 'turn-two' })).structuredContent;
  assert.equal(second.fileId, first.fileId); assert.notEqual(second.rawFileId, first.rawFileId); assert.equal(second.revision, 2);
  assert.equal(decoder.decode(await readBlob(firstURL, first)), 'Version one immutable.');
  assert.equal(decoder.decode((await p.files.readFile(first.rawFileId)).bytes), 'Version one immutable.');
  assert.equal(decoder.decode((await p.files.readFile(second.rawFileId)).bytes), 'Version two source bytes.');
  const node = await libraryCall(p, '/files/library/files/' + first.fileId + '/node'); assert.equal(node.value.file_name, 'Visible saved name.md'); assert.equal(node.value.file_id, second.rawFileId); assert.equal(node.value.parent_directory_id, folder.value.id);
  const favorites = await libraryCall(p, '/files/library/favorites?source=generated'); assert.equal(favorites.value.items[0].favorite_id, favorite.value.favorite_id); assert.equal(favorites.value.items[0].item.file_id, second.rawFileId);
  const oldDownload = await download(p, first.rawFileId); assert.equal(decoder.decode(await readBlob(oldDownload.download_url, first)), 'Version one immutable.');
  const newDownload = await download(p, second.rawFileId); assert.equal(decoder.decode(await readBlob(newDownload.download_url, second)), 'Version two source bytes.');
  const source = await p.base.handleArtifactRequest(new Request('https://site.invalid/__local_artifacts/' + p.base.getWorkspacePrefix(context.threadId) + '/deliverable.md'));
  assert.equal(await source.text(), 'Version two source bytes.', 'The original mutable VFS artifact is distinct from an immutable Library copy');
  const replay = await p.executor.recoverCall(publishCall(), context); assert.equal(replay.structuredContent.rawFileId, first.rawFileId); assert.equal(replay.structuredContent.superseded, true); assert.equal(replay.structuredContent.currentRevision, 2);
  assert.equal(sha(await readBlob(replay.content.find(item => item.type === 'resource_link').uri, first)), first.sha256);
});

test('fresh providers restore durable receipts and exact versions while old page Blob strings are revoked rather than represented as durable links', async t => {
  const env = await environment(t), p = env.provider; await create(p);
  const result = await p.executor.execute(publishCall(), context), receipt = result.structuredContent, oldURL = result.content.find(value => value.type === 'resource_link').uri;
  const serializedCheckpoint = JSON.stringify(result); p.library.dispose(); assert.equal(p.library.ownsObjectURL(oldURL), false); await assert.rejects(fetch(oldURL));
  const fresh = env.makeProvider(), recovered = await fresh.executor.recoverCall(publishCall(), context);
  assert.equal(recovered.structuredContent.fileId, receipt.fileId); assert.equal(recovered.structuredContent.rawFileId, receipt.rawFileId); assert.equal(recovered.structuredContent.revision, 1);
  const newURL = recovered.content.find(value => value.type === 'resource_link').uri; assert.notEqual(newURL, oldURL); await readBlob(newURL, receipt);
  assert.equal(fresh.library.ownsObjectURL(JSON.parse(serializedCheckpoint).content.find(value => value.type === 'resource_link').uri), false);
  assert.equal((await fresh.files.listFiles()).length, 1); assert.equal((await recommended(fresh, { source: 'generated' })).value.items[0].file_id, receipt.rawFileId);
});

test('post-commit download failures or intentionally omitted resource callbacks truthfully retain the saved Library receipt and can recover a later valid download', async t => {
  for (const resources of [false, 'failure']) {
    const env = await environment(t), p = resources === false ? env.makeProvider({ resources: false }) : env.makeProvider({ publisher: { resolvePublishedResource: async () => { throw Error('Neutral download service unavailable'); } } });
    await create(p); const result = await p.executor.execute(publishCall(), context), receipt = result.structuredContent;
    assert.equal(result.isError, false); assert.equal(receipt.committed, true); assert.equal(receipt.downloadAvailable, false); assert.equal(receipt.downloadUnavailable, true); assert.equal(result.content.some(value => value.type === 'resource_link'), false);
    const row = (await recommended(p, { source: 'generated' })).value.items[0]; assert.equal(row.id, receipt.fileId);
    const fresh = env.makeProvider(), recovered = await fresh.executor.recoverCall(publishCall(), context); assert.equal(recovered.structuredContent.rawFileId, receipt.rawFileId); assert.equal(recovered.structuredContent.downloadAvailable, true); assert.equal((await fresh.files.listFiles()).length, 1);
    await readBlob((await download(fresh, receipt.rawFileId)).download_url, receipt);
  }
});

test('guest, wrong-account, temporary, missing-thread and already-aborted calls never create permanent generated records or copy guest bytes at login', async t => {
  const env = await environment(t), p = env.provider, original = env.identity;
  env.setIdentity(null); await create(p, 'Guest workspace draft.');
  await assert.rejects(p.executor.execute(publishCall(), context), error => error.code === 'LOCAL_LIBRARY_PUBLICATION_IDENTITY_REQUIRED');
  assert.equal((await recommended(p)).response.status, 401);
  env.setIdentity(original); await assert.rejects(p.executor.execute(publishCall(), context), error => error.status === 404); assert.equal((await p.files.listFiles()).length, 0);
  await create(p); env.threads.get(context.threadId).ephemeral = true;
  await assert.rejects(p.executor.execute(publishCall(), context), error => error.code === 'publication_ephemeral'); assert.equal((await p.files.listFiles()).length, 0);
  env.threads.get(context.threadId).ephemeral = false;
  const controller = new AbortController(); controller.abort(); await assert.rejects(p.executor.execute(publishCall(), { ...context, signal: controller.signal }), error => error.name === 'AbortError');
  env.setIdentity({ accountId: 'different-free-account', userId: 'other-user', accountUserId: 'other-user' }); await assert.rejects(p.executor.execute(publishCall(), context), error => error.status === 404); assert.equal((await p.files.listFiles()).length, 0);
  env.setIdentity(original); env.threads.delete(context.threadId); await assert.rejects(p.executor.execute(publishCall(), context), error => error.status === 404); assert.equal((await p.files.listFiles()).length, 0);
});

test('an account change after durable commit cannot expose a resource to the replacement identity or remove the original owner saved file', async t => {
  const env = await environment(t), original = env.identity; let p;
  p = env.makeProvider({ publisher: { resolvePublishedResource: async receipt => { const resource = await p.library.resolvePublishedResource(receipt); env.setIdentity({ accountId: 'replacement-account', userId: 'replacement-user', accountUserId: 'replacement-user' }); return resource; } } });
  await create(p); await assert.rejects(p.executor.execute(publishCall(), context), error => error.committed === true && error.code === 'LOCAL_LIBRARY_PUBLICATION_ACCOUNT_CHANGED');
  assert.equal((await p.files.listFiles()).length, 0); env.setIdentity(original);
  const fresh = env.makeProvider(), recovered = await fresh.executor.recoverCall(publishCall(), context); assert.equal(recovered.structuredContent.committed, true); assert.equal((await fresh.files.listFiles()).length, 1); await readBlob(recovered.content.find(value => value.type === 'resource_link').uri, recovered.structuredContent);
});

test('real DOCX bytes publish through the same tool into the native generic document projection and immutable sidecar attachment path', async t => {
  const env = await environment(t, { realDocuments: true }), p = env.provider;
  const bytes = await makeDocx('Actual generated DOCX body 中文 and table-compatible text.');
  await env.host.storage.write(p.base.getWorkspacePrefix(context.threadId) + '/generated.docx', bytes);
  const result = await p.executor.execute(publishCall({ path: 'generated.docx', mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), context), receipt = result.structuredContent;
  const saved = await p.files.readFile(receipt.rawFileId); assert.equal(sha(saved.bytes), sha(bytes)); assert.equal(saved.record.kind, 'document'); assert.equal(saved.record.extraction.parser.name, 'mammoth');
  const node = (await recommended(p, { source: 'generated', categories: ['documents'] })).value.items[0]; assert.equal(node.file_id, receipt.rawFileId); assert.equal(node.library_artifact_type, LOCAL_GENERATED_ARTIFACT_TYPE); assert.equal(node.page_metadata, undefined);
  await readBlob((await download(p, receipt.rawFileId)).download_url, receipt);
  const resolved = await p.files.resolveChatAttachments([{ author: { role: 'user' }, content: { content_type: 'text', parts: ['Read the saved generated file.'] }, metadata: { attachments: [{ id: receipt.rawFileId, name: receipt.fileName }] } }], { threadId: context.threadId });
  assert.equal(resolved.textFiles.length, 1); assert.match(resolved.textFiles[0].text, /Actual generated DOCX body 中文/); assert.notEqual(resolved.textFiles[0].path, resolved.textFiles[0].rawPath);
  const textKey = p.base.getWorkspacePrefix(context.threadId) + '/' + resolved.textFiles[0].path.slice('/mnt/data/'.length);
  assert.equal(decoder.decode(await env.host.storage.read(textKey)), resolved.textFiles[0].text);
});

test('two independent complete providers updating one expected revision commit exactly once and Library reads the actual winner plus retained first raw', async t => {
  const env = await environment(t), p = env.provider; await create(p, 'Original complete publication.');
  const first = (await p.executor.execute(publishCall(), context)).structuredContent;
  await create(p, 'Second requested immutable source.'); const q = env.makeProvider();
  const args = { path: 'deliverable.md', mime_type: 'text/markdown', file_id: first.fileId, expected_revision: 1, expected_raw_file_id: first.rawFileId };
  const attempts = await Promise.allSettled([p.executor.execute(publishCall(args, 'racer-one'), { ...context, turnId: 'racer-turn-one' }), q.executor.execute(publishCall(args, 'racer-two'), { ...context, turnId: 'racer-turn-two' })]);
  assert.equal(attempts.filter(value => value.status === 'fulfilled').length, 1); const failed = attempts.find(value => value.status === 'rejected'); assert.equal(failed.reason.status, 409);
  const receipt = attempts.find(value => value.status === 'fulfilled').value.structuredContent;
  const rows = (await recommended(q, { source: 'generated' })).value.items; assert.equal(rows.length, 1); assert.equal(rows[0].id, first.fileId); assert.equal(rows[0].file_id, receipt.rawFileId); assert.equal(receipt.revision, 2);
  assert.equal(decoder.decode(await readBlob((await download(q, first.rawFileId)).download_url, first)), 'Original complete publication.');
  assert.equal(decoder.decode(await readBlob((await download(q, receipt.rawFileId)).download_url, receipt)), 'Second requested immutable source.');
});

test('native logical trash and confirmed permanent deletion remove every retained generated raw version and revoke all issued Library resources', async t => {
  const env = await environment(t), p = env.provider; await create(p);
  const first = (await p.executor.execute(publishCall(), context)).structuredContent, oldURL = (await p.library.resolvePublishedResource(first)).uri;
  await create(p, 'Newer deletion candidate.'); const second = (await p.executor.execute(publishCall({ path: 'deliverable.md', file_id: first.fileId, expected_revision: 1, expected_raw_file_id: first.rawFileId }, 'second-call'), { ...context, turnId: 'second-turn' })).structuredContent;
  const newURL = (await p.library.resolvePublishedResource(second)).uri;
  const trash = await libraryCall(p, '/files/library/files/' + first.fileId + '?soft_delete=true&file_id=' + second.rawFileId, 'DELETE'); assert.equal(trash.response.status, 200);
  assert.equal((await recommended(p, { source: 'generated' })).value.items.length, 0); assert.equal((await recommended(p, { source: 'generated', trashed_only: true })).value.items.length, 1);
  const deleted = await libraryCall(p, '/files/library/files/' + first.fileId + '?soft_delete=false&file_id=' + second.rawFileId, 'DELETE'); assert.equal(deleted.response.status, 200);
  for (const raw of [first.rawFileId, second.rawFileId]) await assert.rejects(p.files.readFile(raw), error => error.status === 404);
  assert.equal(p.library.ownsObjectURL(oldURL), false); assert.equal(p.library.ownsObjectURL(newURL), false); await assert.rejects(fetch(oldURL)); await assert.rejects(fetch(newURL));
  await assert.rejects(p.executor.recoverCall(publishCall(), context), error => error.status === 410); assert.equal((await p.files.listFiles()).length, 0);
});
