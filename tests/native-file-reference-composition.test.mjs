import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { durablePublicationHost } from './support/generated-publication-host.mjs';
import { parseOriginalMarkdown } from './support/original-markdown.mjs';
import { originalSHA256Bytes } from './support/original-sync-sha256.mjs';
import { originalFilePreparer, originalFilePreparerFixture } from './support/original-file-preparer.mjs';
import { createBrowserToolExecutor, workspacePath } from '../src/native-client/browser-tool-executor.mjs';
import { createLocalFilesService } from '../src/native-client/local-files-service.mjs';
import { createLocalLibraryService } from '../src/native-client/local-library-service.mjs';
import { createLibraryPublishingExecutor, normalizePublicationReceipt } from '../src/native-client/local-library-publisher.mjs';
import { createNativePublicationReferences } from '../src/native-client/native-publication-references.mjs';
import { createWorkspaceDownloadSource } from '../src/native-client/local-workspace-download-source.mjs';
import { createNativeWorkspaceReferences } from '../src/native-client/native-workspace-references.mjs';
import { createNativeFileReferenceComposition } from '../src/native-client/native-file-reference-composition.mjs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex'), utf8 = value => new TextEncoder().encode(value);
async function environment(t, options = {}) {
  const parent = path.resolve(process.env.GENERATED_PUBLICATION_TEST_TMPDIR ?? os.tmpdir()); await fs.mkdir(parent, { recursive: true });
  const root = await fs.mkdtemp(path.join(parent, 'native-composition-'));
  let identity = { accountId: 'publication-owner-fs', userId: 'composition-user', accountUserId: null }, queuedPython = [], shaCalls = 0, hashHook, readerHook;
  const host = await durablePublicationHost(root), writtenKeys = new Set(), actualWrite = host.storage.write.bind(host.storage), thread = { id: 'owned-thread', ephemeral: false, turns: [], adapterMetadata: {} }, threads = new Map([[thread.id, thread]]);
  host.storage.write = async (key, bytes) => { await actualWrite(key, bytes); writtenKeys.add(key); };
  // The executor's existing Python input transfer lists only recorded keys in
  // this fixture, then reads their actual persisted bytes. No output scan.
  host.storage.list = async prefix => { const rows = []; for (const key of writtenKeys) if (key.startsWith(prefix + '/')) rows.push({ name: key.slice(prefix.length + 1), size: (await host.storage.read(key)).length }); return rows; };
  const turn = { id: 'actual-turn-' + randomUUID(), status: 'inProgress', items: [] }; thread.turns.push(turn);
  class ControlledRuntime { async run() { return { ok: true, stdout: '', files: queuedPython.map(file => ({ ...file, bytes: new Uint8Array(file.bytes) })) }; } terminate() {} }
  const base = createBrowserToolExecutor({ storage: host.storage, getWorkspaceNamespace: () => identity?.accountId ?? 'guest', PythonRuntime: ControlledRuntime, PYTHON_TOOL: { type: 'function', function: { name: 'python' } } });
  const files = createLocalFilesService({ ...host, getAccountId: () => identity?.accountId ?? null, getWorkspacePrefix: id => base.getWorkspacePrefix(id), getOwnedSourceWorkspace: async ({ threadId, signal }) => { signal?.throwIfAborted(); if (!identity || !threads.has(threadId)) throw Object.assign(Error('Owned actual thread required'), { status: 404 }); return { accountId: identity.accountId, threadId, prefix: base.getWorkspacePrefix(threadId) }; } });
  const library = createLocalLibraryService({ files, metadataStorage: host.metadataStorage, getAccountId: () => identity?.accountId ?? null });
  const tool = createLibraryPublishingExecutor({ baseExecutor: base, publishGeneratedFile: files.publishGeneratedFile, getIdentity: () => identity, resolvePublishedResource: library.resolvePublishedResource, ownsObjectURL: library.ownsObjectURL });
  const source = createWorkspaceDownloadSource({ getIdentity: () => identity, getThread: id => threads.get(id), getWorkspacePrefix: id => base.getWorkspacePrefix(id), storage: host.storage, workspacePath, artifactBaseURL: 'https://composition.invalid/', sha256Bytes: options.unavailableSHA ? null : bytes => { shaCalls++; return hashHook ? hashHook(bytes) : originalSHA256Bytes(bytes); } });
  const workspace = createNativeWorkspaceReferences({ getIdentity: () => identity, getThread: id => threads.get(id), parseMarkdown: parseOriginalMarkdown, describeFile: source.describe, isDescriptionCurrent: source.isDescriptionCurrent });
  const strict = createNativePublicationReferences({ getIdentity: () => identity, normalizeReceipt: normalizePublicationReceipt, ownsPublishedResource: library.ownsPublishedResource });
  const compose = createNativeFileReferenceComposition({ getIdentity: () => identity, getThread: id => threads.get(id), publicationProjector: strict, workspaceProjector: workspace, normalizeReceipt: normalizePublicationReceipt, describePublicationSource: receipt => readerHook ? readerHook(receipt) : files.describePublicationSource(receipt), isPublicationSourceCurrent: files.isPublicationSourceCurrent, getDescriptionSHA: source.getDescriptionSHA });
  async function execute(name, args) { const item = { id: randomUUID(), type: 'mcpToolCall', server: 'browser_workspace', tool: name, status: 'inProgress', arguments: structuredClone(args) }; turn.items.push(item); item.result = await tool.execute({ id: item.id, function: { name, arguments: JSON.stringify(args) } }, { threadId: thread.id, turnId: turn.id }); item.status = 'completed'; return item; }
  async function create(name = 'A.MD', content = 'Actual composition content 中文 😀.') { const item = await execute('create_file', { name, content }); return { item, file: item.result.structuredContent.file, content }; }
  async function python(name = 'P.MD', content = 'Actual controlled transport bytes.') { queuedPython = [{ name, bytes: utf8(content) }]; const item = await execute('python', { code: 'Labeled controlled runtime-output fixture; no Python engine claim' }); return { item, file: item.result.structuredContent.files[0], content }; }
  async function publish(made, extra = {}) { const item = await execute('publish_file', { path: made.file.name, mime_type: made.file.mime, ...extra }); return { item, receipt: normalizePublicationReceipt(item.result.structuredContent, item.result.structuredContent.operationId) }; }
  function finish(made) { const list = Array.isArray(made) ? made : [made], text = '文件 😀：' + list.map((value, index) => '[下载' + index + '](<' + new URL(value.file.url, 'https://composition.invalid/').href + '>)').join(' 以及 '); turn.status = 'completed'; const item = { id: 'actual-assistant-' + randomUUID(), type: 'agentMessage', text, phase: 'final_answer' }; turn.items.push(item); return { thread, turn, item }; }
  t.after(async () => { base.dispose(); library.dispose?.(); const actual = await fs.realpath(root), relative = path.relative(parent, actual); assert.ok(!relative.startsWith('..') && !path.isAbsolute(relative) && path.basename(actual).startsWith('native-composition-')); await fs.rm(actual, { recursive: true, force: true }); });
  return { root, identity: () => identity, setIdentity: value => { identity = value; }, thread, turn, threads, host, base, files, library, source, workspace, strict, compose, execute, create, python, publish, finish, shaCalls: () => shaCalls, setHashHook: value => { hashHook = value; }, setReaderHook: value => { readerHook = value; } };
}
const isLibrary = ref => typeof ref.file_id === 'string', isWorkspace = ref => typeof ref.sandbox_path === 'string';

test('actual create/publish/readback moves one already trusted Library DTO onto the exact original HTTP span without mutation', async t => {
  const e = await environment(t), made = await e.create(), saved = await e.publish(made), context = e.finish(made), before = JSON.stringify(context.thread);
  const strict = e.strict.forAssistant(context), workspace = e.workspace.forAssistant(context), references = e.compose.forAssistant(context);
  assert.equal(strict.length, 1); assert.equal(workspace.length, 1); assert.equal(references.length, 1); assert.equal(isLibrary(references[0]), true); assert.equal(isWorkspace(references[0]), false);
  assert.equal(references[0].file_id, saved.receipt.rawFileId); assert.equal(references[0].library_file_id, saved.receipt.fileId);
  for (const key of ['start_idx','end_idx','matched_text']) assert.equal(references[0][key], workspace[0][key]);
  for (const key of Object.keys(strict[0])) assert.equal(references[0][key], strict[0][key]);
  assert.equal('start_idx' in strict[0], false); assert.equal(JSON.stringify(context.thread), before); assert.equal(e.shaCalls(), 1);
  const normalized = normalizePublicationReceipt(saved.item.result.structuredContent, saved.receipt.operationId), proof = e.files.describePublicationSource(normalized);
  assert.equal(proof.bytesVerified, false); assert.equal(proof.sourceSHA256, sha(utf8(made.content))); assert.notEqual(saved.receipt.operationId, saved.item.id);
});

test('actual original EGK5 preparer consumes the moved full-link range once with no remaining HTTP link or appended duplicate', async t => {
  const e = await environment(t), made = await e.create(); await e.publish(made); const context = e.finish(made), references = e.compose.forAssistant(context);
  const prepared = originalFilePreparer({ id: context.item.id, author: { role: 'assistant' }, content: { content_type: 'text', parts: [context.item.text] }, metadata: { content_references: references }, status: 'finished_successfully', end_turn: true, recipient: 'all', channel: 'final' });
  assert.equal(originalFilePreparerFixture.factories, 67); assert.equal(typeof prepared.markdown, 'string');
  assert.equal((prepared.markdown.match(/:chatgpt-content-reference\{/g) ?? []).length, 1); assert.equal(prepared.markdown.includes('__local_artifacts'), false); assert.equal(prepared.contentReferences.filter(isLibrary).length, 1);
  assert.equal(context.item.text.includes('__local_artifacts'), true, 'The stored body remains unchanged');
});

test('unpublished B survives a proven A relocation; same name/size/hash in a different actual path never substitutes A', async t => {
  const e = await environment(t), a = await e.create('left/same.MD', 'SAME actual bytes'), b = await e.create('right/same.MD', 'SAME actual bytes'); await e.publish(a); const context = e.finish([a,b]), refs = e.compose.forAssistant(context);
  assert.equal(refs.length, 2); assert.equal(refs.filter(isLibrary).length, 1); assert.equal(refs.filter(isWorkspace).length, 1); assert.equal(refs.find(isWorkspace).sandbox_path, '/mnt/data/right/same.MD'); assert.equal(e.shaCalls(), 1);
});

test('same path and size after an actual different-byte overwrite does not relocate an older Library version', async t => {
  const e = await environment(t), first = await e.create('same.MD', 'AAAA'); await e.publish(first); const changed = await e.create('same.MD', 'BBBB'), context = e.finish(changed), refs = e.compose.forAssistant(context);
  assert.equal(refs.length, 2); assert.equal(refs.filter(isWorkspace).length, 1); assert.equal(refs.filter(isLibrary).length, 1); assert.equal(refs.find(isLibrary).start_idx, undefined);
});

test('multiple explicit links to one workspace source stay conservative and do not hash or duplicate a raw-ID span', async t => {
  const e = await environment(t), made = await e.create(); await e.publish(made); const context = e.finish([made,made]), refs = e.compose.forAssistant(context);
  assert.equal(refs.length, 3); assert.equal(refs.filter(isWorkspace).length, 2); assert.equal(refs.filter(isLibrary).length, 1); assert.equal(refs.find(isLibrary).start_idx, undefined); assert.equal(e.shaCalls(), 0);
});

test('two genuine immutable raw versions matching one source are ambiguous, not selected by latest version', async t => {
  const e = await environment(t), made = await e.create(), first = await e.publish(made); const second = await e.publish(made, { file_id: first.receipt.fileId, expected_revision: first.receipt.revision, expected_raw_file_id: first.receipt.rawFileId });
  assert.notEqual(first.receipt.rawFileId, second.receipt.rawFileId); const context = e.finish(made), refs = e.compose.forAssistant(context);
  assert.equal(refs.filter(isLibrary).length, 2); assert.equal(refs.filter(isWorkspace).length, 1); assert.ok(refs.filter(isLibrary).every(ref => ref.start_idx === undefined));
});

test('no strict candidate or a different actual source path triggers zero original synchronous hash calls', async t => {
  const e = await environment(t), a = await e.create('A.MD'), context = e.finish(a); assert.equal(e.compose.forAssistant(context).length, 1); assert.equal(e.shaCalls(), 0);
});

test('Python transport output with real executor readback uses recorded SHA without invoking the string hash callback', async t => {
  const e = await environment(t), made = await e.python(); await e.publish(made); const context = e.finish(made), refs = e.compose.forAssistant(context);
  assert.equal(refs.length, 1); assert.equal(isLibrary(refs[0]), true); assert.equal(e.shaCalls(), 0);
});

test('expected SHA cache is actual-producer/exact-content based and recomputes for a replaced canonical producer object', async t => {
  const e = await environment(t), made = await e.create('cache.MD', 'Cache 中文 😀 \ud800'); await e.publish(made); const context = e.finish(made);
  assert.equal(e.compose.forAssistant(context).length, 1); assert.equal(e.compose.forAssistant(context).length, 1); assert.equal(e.shaCalls(), 1);
  const cloned = structuredClone(e.turn); e.thread.turns = [cloned]; const restored = { thread: e.thread, turn: cloned, item: cloned.items.at(-1) };
  assert.equal(e.compose.forAssistant(restored).length, 1); assert.equal(e.shaCalls(), 2);
});

test('invalid digest callbacks do not poison the cache or suppress the existing workspace fallback', async t => {
  const e = await environment(t), made = await e.create(); await e.publish(made); const context = e.finish(made);
  e.setHashHook(() => 'INVALID'); assert.equal(e.compose.forAssistant(context).length, 2); assert.equal(e.compose.forAssistant(context).length, 2); assert.equal(e.shaCalls(), 2);
  e.setHashHook(null); assert.equal(e.compose.forAssistant(context).length, 1); assert.equal(e.shaCalls(), 3);
});

test('workspace reference clones/edits and description clones cannot supply a branded source identity', async t => {
  const e = await environment(t), made = await e.create(); const context = e.finish(made), reference = e.workspace.forAssistant(context)[0], description = e.workspace.getReferenceDescription(reference);
  assert.ok(description); assert.equal(e.workspace.getReferenceDescription(structuredClone(reference)), null); assert.equal(e.source.getDescriptionSHA({ ...description }), null);
  reference.start_idx++; assert.equal(e.workspace.getReferenceDescription(reference), null);
});

test('owner replacement or actual publication mutation during synchronous hashing fails closed', async t => {
  const e = await environment(t), made = await e.create(), saved = await e.publish(made), context = e.finish(made);
  e.setHashHook(bytes => { saved.item.result.structuredContent.sha256 = '0'.repeat(64); return originalSHA256Bytes(bytes); });
  assert.deepEqual(e.compose.forAssistant(context), []);
});

test('verified account replacement during the hash callback yields no old-owner reference output', async t => {
  const e = await environment(t), made = await e.create(); await e.publish(made); const context = e.finish(made);
  e.setHashHook(bytes => { e.setIdentity({ accountId: 'another-owner', userId: 'another-user', accountUserId: null }); return originalSHA256Bytes(bytes); });
  assert.deepEqual(e.compose.forAssistant(context), []);
});

test('a cloned publication proof is never accepted as a current provenance association', async t => {
  const e = await environment(t), made = await e.create(); await e.publish(made); const context = e.finish(made);
  e.setReaderHook(receipt => ({ ...e.files.describePublicationSource(receipt) })); const refs = e.compose.forAssistant(context);
  assert.equal(refs.length, 2); assert.equal(refs.find(isLibrary).start_idx, undefined); assert.equal(e.shaCalls(), 0);
});

test('the actual original preparer retains unpublished B beside a relocated Library A', async t => {
  const e = await environment(t), a = await e.create('A.MD'), b = await e.create('B.MD'); await e.publish(a); const context = e.finish([a,b]), references = e.compose.forAssistant(context);
  const prepared = originalFilePreparer({ id: context.item.id, author: { role: 'assistant' }, content: { content_type: 'text', parts: [context.item.text] }, metadata: { content_references: references }, status: 'finished_successfully', end_turn: true, recipient: 'all', channel: 'final' });
  assert.equal((prepared.markdown.match(/:chatgpt-content-reference\{/g) ?? []).length, 2); assert.equal(prepared.markdown.includes('__local_artifacts'), false);
  assert.equal(prepared.contentReferences.filter(isLibrary).length, 1); assert.equal(prepared.contentReferences.filter(ref => ref.sandbox_path === '/mnt/data/B.MD').length, 1);
});

test('same-object content and version changes invalidate the exact expected-SHA cache', async t => {
  const e = await environment(t), made = await e.create('version.MD', 'AAAA'); await e.publish(made); const context = e.finish(made);
  assert.equal(e.compose.forAssistant(context).length, 1); assert.equal(e.shaCalls(), 1);
  made.item.arguments.content = 'BBBB'; assert.equal(e.compose.forAssistant(context).length, 2); assert.equal(e.shaCalls(), 2);
  made.item.arguments.content = 'AAAA'; made.item.result.structuredContent.file.mime = 'text/plain'; assert.equal(e.compose.forAssistant(context).length, 1); assert.equal(e.shaCalls(), 3);
});

test('a digest callback that mutates its fresh argument cannot create a cached expected hash', async t => {
  const e = await environment(t), made = await e.create(); await e.publish(made); const context = e.finish(made);
  e.setHashHook(bytes => { bytes.fill(0); return originalSHA256Bytes(bytes); }); assert.equal(e.compose.forAssistant(context).length, 2); assert.equal(e.compose.forAssistant(context).length, 2); assert.equal(e.shaCalls(), 2);
});

test('unavailable synchronous SHA preserves both existing references without any digest callback or authority claim', async t => {
  const e = await environment(t, { unavailableSHA: true }), made = await e.create(); await e.publish(made); const context = e.finish(made), refs = e.compose.forAssistant(context);
  assert.equal(refs.length, 2); assert.equal(refs.filter(isWorkspace).length, 1); assert.equal(refs.filter(isLibrary).length, 1); assert.equal(refs.find(isLibrary).start_idx, undefined); assert.equal(e.shaCalls(), 0);
});
