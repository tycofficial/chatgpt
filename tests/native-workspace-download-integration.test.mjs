import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { createBrowserToolExecutor, workspacePath } from '../src/native-client/browser-tool-executor.mjs';
import { createWorkspaceDownloadSource } from '../src/native-client/local-workspace-download-source.mjs';
import { createLocalWorkspaceDownloadService } from '../src/native-client/local-workspace-download-service.mjs';
import { createLocalFilesService } from '../src/native-client/local-files-service.mjs';
import { createLocalLibraryService } from '../src/native-client/local-library-service.mjs';
import { createOwnedDownloadTransport } from '../src/native-client/owned-download-transport.mjs';
const encoder = new TextEncoder(), digest = bytes => createHash('sha256').update(bytes).digest('hex');
const metadataStore = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), values }; };
async function actual(t, options = {}) {
  const parent = path.resolve(process.env.NATIVE_WORKSPACE_TEST_ROOT ?? path.join(os.tmpdir(), 'native-workspace-download-tests'));
  await fs.mkdir(parent, { recursive: true }); const directory = await fs.mkdtemp(path.join(parent, 'neutral-'));
  const stats = { reads: 0, writes: 0, lists: 0, creates: 0 }, liveURLs = new Set(); let identity = { accountId: 'neutral-account', userId: 'neutral-user', accountUserId: 'neutral-owner' }, readHook;
  const disk = key => { const value = path.resolve(directory, key); if (!value.startsWith(directory + path.sep)) throw Error('Fixture path escaped its own directory.'); return value; };
  const storage = { async read(key) { stats.reads++; await readHook?.(key); return new Uint8Array(await fs.readFile(disk(key))); }, async write(key, bytes) { stats.writes++; const target = disk(key); await fs.mkdir(path.dirname(target), { recursive: true }); await fs.writeFile(target, new Uint8Array(bytes)); }, async remove(key) { await fs.unlink(disk(key)); }, async list() { stats.lists++; throw Error('A download must not scan the fixture filesystem.'); } };
  const create = blob => { stats.creates++; const value = URL.createObjectURL(blob); liveURLs.add(value); return value; }, revoke = value => { liveURLs.delete(value); URL.revokeObjectURL(value); };
  const executor = createBrowserToolExecutor({ storage, getWorkspaceNamespace: () => identity?.accountId ?? null }), threads = new Map(), thread = { id: 'actual-thread-1', turns: [], adapterMetadata: { classicRootId: 'actual-root', conversationOrigin: 'tpp' } }; threads.set(thread.id, thread);
  async function produce(content, { name = 'neutral.md', assistantId = 'actual-assistant-1' } = {}) {
    const number = thread.turns.length + 1, args = { name, content }, call = { id: 'actual-call-' + number, function: { name: 'create_file', arguments: JSON.stringify(args) } }, output = await executor.execute(call, { threadId: thread.id });
    const turn = { id: 'actual-turn-' + number, status: 'completed', items: [{ id: call.id, type: 'mcpToolCall', server: 'browser_workspace', tool: 'create_file', status: 'completed', arguments: args, result: output }, { id: assistantId, type: 'agentMessage', text: 'Neutral actual tool output is ready.', phase: 'final_answer' }] };
    thread.turns.push(turn); return { turn, args, output, bytes: encoder.encode(content), spec: { conversationId: thread.id, messageId: assistantId, sandboxPath: '/mnt/data/' + workspacePath(name) } };
  }
  const produced = await produce('Actual disk-backed neutral markdown 中文.');
  const source = createWorkspaceDownloadSource({ getIdentity: () => identity, getThread: id => threads.get(id), getWorkspacePrefix: executor.getWorkspacePrefix, storage, workspacePath });
  const workspace = createLocalWorkspaceDownloadService({ getIdentity: () => identity, resolveSource: source.resolve, isSourceCurrent: source.isCurrent, createObjectURL: create, revokeObjectURL: revoke, deadlineMs: options.deadlineMs ?? 10000 });
  const fileMetadata = metadataStore(), libraryMetadata = metadataStore();
  const files = createLocalFilesService({ storage, metadataStorage: fileMetadata, getAccountId: () => identity?.accountId ?? null, getWorkspacePrefix: executor.getWorkspacePrefix });
  const library = createLocalLibraryService({ files, metadataStorage: libraryMetadata, getAccountId: () => identity?.accountId ?? null, createObjectURL: create, revokeObjectURL: revoke });
  const transport = createOwnedDownloadTransport({ providers: [library, workspace], fetchImpl: options.fetchImpl ?? fetch });
  t.after(async () => { workspace.dispose(); library.dispose(); for (const url of liveURLs) revoke(url); const resolved = path.resolve(directory); assert.ok(resolved.startsWith(parent + path.sep)); await fs.rm(resolved, { recursive: true, force: true }); });
  async function ticket(spec = produced.spec, signal) { const query = new URLSearchParams({ message_id: spec.messageId, sandbox_path: spec.sandboxPath, download_intent: 'false' }); const response = await workspace.handle(new Request('https://neutral.invalid/__codex-api/conversation/' + spec.conversationId + '/interpreter/download?' + query, { signal })); return { response, body: await response.json() }; }
  return { stats, liveURLs, create, revoke, storage, executor, thread, threads, source, workspace, files, library, transport, produced, produce, ticket, setReadHook: value => { readHook = value; }, setIdentity: value => { identity = value; }, identity: () => identity, fileMetadata, libraryMetadata };
}
async function uploadActualFile(e) {
  const bytes = encoder.encode('Actual separate canonical FileService upload.'), fileName = 'uploaded.txt', request = (route, method = 'GET', body) => new Request('https://neutral.invalid/__codex-api' + route, { method, ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
  const allocation = await(await e.files.handle(request('/files', 'POST', { file_name: fileName, file_size: bytes.length, mime_type: 'text/plain', store_in_library: true }), '/files')).json();
  const form = new FormData(); form.append('file', new File([bytes], fileName, { type: 'text/plain' }), fileName); form.append('upload_url', new URL(allocation.upload_url).searchParams.get('upload_url')); await e.files.upload('POST', allocation.upload_url, { body: form });
  const ready = await e.files.handle(request('/files/' + allocation.file_id + '/uploaded', 'POST', {}), '/files/' + allocation.file_id + '/uploaded'); assert.equal(ready.status, 200, await ready.text());
  const response = await e.library.handle(request('/files/download/' + allocation.file_id), '/files/download/' + allocation.file_id); assert.equal(response.status, 200); const body = await response.json();
  return { bytes, id: allocation.file_id, fileName, url: body.download_url };
}
async function nativeSave(e, bytes, name, expectedProvider) {
  let result, reading, creates;
  assert.deepEqual(await e.transport.downloadVerifiedBytes(bytes, { fileName: name }, (blob, actualName) => {
    const before = e.stats.creates, url = e.transport.createNativeDownloadURL(blob, e.create); creates = e.stats.creates - before;
    assert.equal(actualName, name); assert.equal(e.transport.ownsObjectURL(url), true); assert.equal(expectedProvider.ownsObjectURL(url), true);
    result = { url, mimeType: blob.type }; reading = e.transport.fetch(url).then(async response => ({ status: response.status, bytes: new Uint8Array(await response.arrayBuffer()) }));
  }), { handled: true });
  const observed = await reading; assert.equal(observed.status, 200); assert.equal(digest(observed.bytes), digest(bytes)); assert.equal(creates, 1, 'Nested authority wrappers create exactly one actual URL.');
  e.transport.forgetNativeDownloadURL(result.url); e.revoke(result.url); assert.equal(e.transport.ownsObjectURL(result.url), false); return result;
}

test('real create_file -> branded resolver -> transient ticket -> real composed byte fetch does not publish or scan', async t => {
  const e = await actual(t), before = (await e.files.listFiles()).length, writes = e.stats.writes;
  const result = await e.ticket(); assert.equal(result.response.status, 200, JSON.stringify(result.body)); assert.deepEqual(Object.keys(result.body).sort(), ['download_url', 'status']);
  assert.equal(e.workspace.ownsObjectURL(result.body.download_url), true); assert.equal(e.library.ownsObjectURL(result.body.download_url), false); assert.equal(e.library.ownsPublishedResource(result.body.download_url, { committed: true }), false);
  const fetched = await e.transport.fetch(result.body.download_url); assert.equal(fetched.status, 200); assert.equal(digest(new Uint8Array(await fetched.arrayBuffer())), digest(e.produced.bytes));
  assert.equal((await e.files.listFiles()).length, before); assert.equal(e.fileMetadata.values.size, 0); assert.equal(e.libraryMetadata.values.size, 0); assert.equal(e.stats.writes, writes); assert.equal(e.stats.lists, 0);
});

test('real Library and real Workspace share only transport: both native saves have one URL and unknown Blobs stay unowned', async t => {
  const e = await actual(t), uploaded = await uploadActualFile(e), workspace = await e.ticket(); assert.equal(workspace.response.status, 200);
  assert.equal(e.library.ownsObjectURL(uploaded.url), true); assert.equal(e.workspace.ownsObjectURL(uploaded.url), false);
  assert.equal(e.workspace.ownsObjectURL(workspace.body.download_url), true); assert.equal(e.library.ownsObjectURL(workspace.body.download_url), false);
  assert.equal(e.library.ownsPublishedResource(workspace.body.download_url, { committed: true }), false);
  assert.equal((await nativeSave(e, uploaded.bytes, uploaded.fileName, e.library)).mimeType, 'text/plain');
  assert.equal((await nativeSave(e, e.produced.bytes, 'neutral.md', e.workspace)).mimeType, 'text/markdown');
  const before = e.stats.creates, unknown = e.transport.createNativeDownloadURL(new Blob([encoder.encode('unknown')]), e.create); assert.equal(e.stats.creates, before + 1); assert.equal(e.transport.ownsObjectURL(unknown), false); await assert.rejects(e.transport.fetch(unknown), error => error.name === 'AbortError'); e.revoke(unknown);
  assert.equal((await e.files.listFiles()).length, 1, 'Only the explicit real upload exists in FileService.'); assert.equal(e.stats.lists, 0);
});

test('actual disk overwrite fails old message Save instead of changing bytes or falling back, while its new message gets a new ticket', async t => {
  const e = await actual(t), first = await e.ticket(); assert.equal(first.response.status, 200);
  const second = await e.produce('Different real future-turn version 中文.', { assistantId: 'actual-assistant-2' });
  let invoked = 0; await assert.rejects(e.transport.downloadVerifiedBytes(e.produced.bytes, { fileName: 'neutral.md' }, () => { invoked++; }), error => error.code === 'LOCAL_WORKSPACE_DOWNLOAD_VERSION_UNAVAILABLE'); assert.equal(invoked, 0);
  assert.equal(e.workspace.ownsObjectURL(first.body.download_url), false);
  await assert.rejects(e.transport.downloadVerifiedBytes(e.produced.bytes, {}, () => {}), error => error.code === 'WORKSPACE_DOWNLOAD_SOURCE_UNAVAILABLE');
  assert.equal((await e.ticket()).response.status, 409); const fresh = await e.ticket(second.spec); assert.equal(fresh.response.status, 200); assert.notEqual(fresh.body.download_url, first.body.download_url); assert.equal(digest(new Uint8Array(await(await e.transport.fetch(fresh.body.download_url)).arrayBuffer())), digest(second.bytes));
});

test('actual byte deletion and source-record mutation invalidate known context with no native callback or new publication', async t => {
  const e = await actual(t); await e.ticket(); await e.storage.remove(e.executor.getWorkspacePrefix(e.thread.id) + '/neutral.md'); let invoked = 0;
  await assert.rejects(e.transport.downloadVerifiedBytes(e.produced.bytes, {}, () => { invoked++; }), error => error.code === 'LOCAL_WORKSPACE_DOWNLOAD_FILE_NOT_FOUND'); assert.equal(invoked, 0);
  assert.equal((await e.ticket()).response.status, 404); assert.equal((await e.files.listFiles()).length, 0);
  await e.storage.write(e.executor.getWorkspacePrefix(e.thread.id) + '/neutral.md', e.produced.bytes); const restored = await e.ticket(); assert.equal(restored.response.status, 200);
  e.thread.turns[0].items[1].text = 'Changed source assistant context.'; assert.equal(e.workspace.ownsObjectURL(restored.body.download_url), false);
  await assert.rejects(e.transport.downloadVerifiedBytes(e.produced.bytes, {}, () => {}), error => error.code === 'WORKSPACE_DOWNLOAD_SOURCE_UNAVAILABLE');
});

test('real source read timeout cannot mint late capabilities and original owner can retry after disk availability returns', async t => {
  const e = await actual(t, { deadlineMs: 150 }); let release; const hold = new Promise(resolve => { release = resolve; }); e.setReadHook(() => hold);
  const result = await e.ticket(); assert.equal(result.response.status, 503); assert.equal(result.body.error.code, 'WORKSPACE_DOWNLOAD_TIMEOUT'); assert.equal(e.stats.creates, 0);
  release(); e.setReadHook(null); await new Promise(resolve => setTimeout(resolve, 30)); assert.equal(e.stats.creates, 0);
  assert.equal((await e.ticket()).response.status, 200); assert.equal(e.stats.creates, 1); assert.equal((await e.files.listFiles()).length, 0);
});

test('actual account loss revokes both registries and rejects native Save rather than invoking fallback', async t => {
  const e = await actual(t), uploaded = await uploadActualFile(e), workspace = await e.ticket(); assert.equal(workspace.response.status, 200);
  e.setIdentity(null); assert.equal(e.transport.ownsObjectURL(workspace.body.download_url), false); assert.equal(e.transport.ownsObjectURL(uploaded.url), false);
  await assert.rejects(e.transport.fetch(workspace.body.download_url), error => error.name === 'AbortError'); let invoked = 0;
  await assert.rejects(e.transport.downloadVerifiedBytes(e.produced.bytes, {}, () => { invoked++; }), error => error.status === 401); assert.equal(invoked, 0); assert.equal((await e.ticket()).response.status, 401);
});
