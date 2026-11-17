import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { createBrowserToolExecutor, workspacePath } from '../src/native-client/browser-tool-executor.mjs';
import { createWorkspaceDownloadSource } from '../src/native-client/local-workspace-download-source.mjs';

const encoder = new TextEncoder(), decoder = new TextDecoder();
const sha = value => createHash('sha256').update(value).digest('hex');
const identityA = { accountId: 'workspace-account-a', userId: 'neutral-user-a', accountUserId: null };

async function environment(t, options = {}) {
  const parent = path.resolve(process.env.GENERATED_PUBLICATION_TEST_TMPDIR ?? os.tmpdir());
  await fs.mkdir(parent, { recursive: true });
  const root = await fs.mkdtemp(path.join(parent, 'native-workspace-download-'));
  let identity = structuredClone(identityA), beforeRead, afterRead, readFailure, prefixSuffix = '', sequence = 0;
  const metrics = { reads: [], writes: [], removes: [] }, threads = new Map();
  const filename = key => path.join(root, sha(key));
  const storage = {
    async write(key, bytes) { metrics.writes.push(key); await fs.writeFile(filename(key), new Uint8Array(bytes)); },
    async read(key) { metrics.reads.push(key); await beforeRead?.(key); if (readFailure) throw readFailure; const bytes = new Uint8Array(await fs.readFile(filename(key))); await afterRead?.(key); return bytes; },
    async remove(key) { metrics.removes.push(key); await fs.unlink(filename(key)); },
    async list() { throw Error('No workspace scan is allowed'); },
  };
  const executor = createBrowserToolExecutor({ storage, getWorkspaceNamespace: () => identity?.accountId ?? 'guest' });
  const prefix = id => executor.getWorkspacePrefix(id) + prefixSuffix;
  const make = () => createWorkspaceDownloadSource({ getIdentity: () => identity, getThread: id => threads.get(id), getWorkspacePrefix: prefix, storage, workspacePath, ...options });
  const source = make();
  const addThread = (id = 'actual-thread') => { const value = { id, turns: [], adapterMetadata: { classicRootId: 'neutral-root', conversationOrigin: null } }; threads.set(id, value); return value; };
  const thread = addThread();
  async function produce(content = 'Neutral actual UTF-8 bytes 中文 😀.', name = 'report.md', target = thread) {
    const n = ++sequence, args = { name, content }, tool = { id: 'actual-tool-' + n, type: 'mcpToolCall', server: 'browser_workspace', tool: 'create_file', status: 'inProgress', arguments: structuredClone(args) };
    const turn = { id: 'actual-turn-' + n, status: 'inProgress', items: [tool] }; target.turns.push(turn);
    tool.result = await executor.execute({ id: tool.id, function: { name: 'create_file', arguments: JSON.stringify(args) } }, { threadId: target.id });
    tool.status = 'completed';
    const item = { id: 'actual-assistant-' + n, type: 'agentMessage', text: 'A terminal local assistant context; no Markdown link is required by the owner API.', phase: 'final' };
    turn.items.push(item); turn.status = 'completed';
    return { turn, tool, item, spec: { conversationId: target.id, messageId: item.id, sandboxPath: '/mnt/data/' + workspacePath(name) } };
  }
  async function appendTool(target, turn, toolName, args) {
    const tool = { id: 'actual-tool-' + ++sequence, type: 'mcpToolCall', server: 'browser_workspace', tool: toolName, status: 'inProgress', arguments: structuredClone(args) };
    turn.items.push(tool);
    tool.result = await executor.execute({ id: tool.id, function: { name: toolName, arguments: JSON.stringify(args) } }, { threadId: target.id });
    tool.status = 'completed'; return tool;
  }
  t.after(async () => {
    executor.dispose();
    const absolute = path.resolve(root);
    if (!absolute.startsWith(parent + path.sep) || !path.basename(absolute).startsWith('native-workspace-download-')) throw Error('Unexpected test cleanup path');
    await fs.rm(absolute, { recursive: true, force: true });
  });
  return { root, storage, executor, metrics, source, thread, threads, produce, appendTool, addThread, make,
    setIdentity: value => { identity = value; }, setPrefixSuffix: value => { prefixSuffix = value; },
    beforeRead: value => { beforeRead = value; }, afterRead: value => { afterRead = value; }, failRead: value => { readFailure = value; },
    write: (name, bytes, id = thread.id) => storage.write(executor.getWorkspacePrefix(id) + '/' + workspacePath(name), typeof bytes === 'string' ? encoder.encode(bytes) : bytes),
    remove: (name, id = thread.id) => storage.remove(executor.getWorkspacePrefix(id) + '/' + workspacePath(name)),
  };
}
const rejects = (operation, status, suffix) => assert.rejects(operation, error => error.status === status && (!suffix || error.code === 'LOCAL_WORKSPACE_DOWNLOAD_' + suffix));

test('actual create_file and filesystem readback yield a branded exact UTF-8 proof without any scan or publication', async t => {
  const e = await environment(t), made = await e.produce(), writes = e.metrics.writes.length;
  const proof = await e.source.resolve(made.spec);
  assert.equal(proof.conversationId, e.thread.id); assert.equal(proof.messageId, made.item.id); assert.equal(proof.sandboxPath, '/mnt/data/report.md');
  assert.equal(proof.ownerKey, JSON.stringify([identityA.accountId, identityA.userId, null]));
  assert.equal(proof.fileName, 'report.md'); assert.equal(proof.mimeType, 'text/markdown');
  assert.equal(proof.size, encoder.encode(made.tool.arguments.content).length); assert.equal(proof.sha256, sha(proof.bytes));
  assert.equal(decoder.decode(proof.bytes), made.tool.arguments.content);
  assert.equal(Object.isFrozen(proof), true); assert.equal(e.source.isCurrent(proof), true); assert.equal(e.source.isCurrent({ ...proof }), false);
  assert.equal(e.metrics.reads.length, 1); assert.equal(e.metrics.writes.length, writes);
  assert.deepEqual(e.metrics.reads, [e.executor.getWorkspacePrefix(e.thread.id) + '/report.md']);
});

test('repeated source tokens are stable, byte getters cannot corrupt the private snapshot, and no raw bytes are accidentally enumerable', async t => {
  const e = await environment(t), made = await e.produce('Actual stable bytes.'), first = await e.source.resolve(made.spec), second = await e.source.resolve(made.spec);
  assert.notEqual(first, second); assert.equal(first.sourceToken, second.sourceToken); assert.equal(first.sha256, second.sha256);
  assert.match(first.sourceToken, /^[0-9a-f]{64}$/); assert.equal(Object.keys(first).includes('bytes'), false);
  const copy = first.bytes; copy[0] ^= 1;
  assert.equal(decoder.decode(first.bytes), 'Actual stable bytes.'); assert.equal(e.source.isCurrent(first), true);
});

test('only a unique actual terminal assistant ID in the requested thread is accepted; tool aliases and future paths fail', async t => {
  const e = await environment(t), first = await e.produce('First.', 'first.txt'), other = e.addThread('another-thread'), foreign = await e.produce('Foreign.', 'foreign.txt', other);
  await rejects(e.source.resolve({ ...first.spec, messageId: first.tool.id + '-result' }), 404);
  await rejects(e.source.resolve({ ...first.spec, messageId: foreign.item.id }), 404);
  await rejects(e.source.resolve({ ...first.spec, conversationId: 'missing-thread' }), 404);
  await e.produce('Future real bytes.', 'future.txt');
  await rejects(e.source.resolve({ ...first.spec, sandboxPath: '/mnt/data/future.txt' }), 404, 'PRODUCER_NOT_FOUND');
  first.turn.status = 'inProgress'; await rejects(e.source.resolve(first.spec), 409, 'MESSAGE_PENDING');
  first.turn.status = 'completed'; first.turn.items.push({ ...first.item }); await rejects(e.source.resolve(first.spec), 409, 'MESSAGE_NOT_FOUND');
});

test('producers later in the same turn are not borrowed by an earlier assistant context', async t => {
  const e = await environment(t), first = await e.produce('First.', 'one.txt');
  await e.appendTool(e.thread, first.turn, 'create_file', { name: 'two.txt', content: 'Actual later same-turn bytes.' });
  await rejects(e.source.resolve({ ...first.spec, sandboxPath: '/mnt/data/two.txt' }), 404);
  const later = { id: 'later-actual-assistant', type: 'agentMessage', text: 'Later context', phase: 'final' }; first.turn.items.push(later);
  const proof = await e.source.resolve({ ...first.spec, messageId: later.id, sandboxPath: '/mnt/data/two.txt' });
  assert.equal(decoder.decode(proof.bytes), 'Actual later same-turn bytes.');
});

test('a later assistant may refer to an inherited actual producer, while an overwritten older message never redirects to the new bytes', async t => {
  const e = await environment(t), first = await e.produce('Original version.', 'same.txt'), unrelated = await e.produce('Another path.', 'other.txt');
  const inherited = await e.source.resolve({ ...unrelated.spec, sandboxPath: first.spec.sandboxPath }); assert.equal(decoder.decode(inherited.bytes), 'Original version.');
  const next = await e.produce('Replaced version.', 'same.txt');
  await rejects(e.source.resolve(first.spec), 409, 'VERSION_UNAVAILABLE');
  const proof = await e.source.resolve(next.spec); assert.equal(decoder.decode(proof.bytes), 'Replaced version.');
});

test('missing or corrupted actual bytes are never rebuilt from preserved successful tool arguments', async t => {
  const e = await environment(t), made = await e.produce('AAAA');
  await e.write('report.md', 'BBBB'); const writes = e.metrics.writes.length;
  await rejects(e.source.resolve(made.spec), 409, 'VERSION_UNAVAILABLE'); assert.equal(e.metrics.writes.length, writes);
  await e.remove('report.md'); const afterDelete = e.metrics.writes.length;
  await rejects(e.source.resolve(made.spec), 404, 'FILE_NOT_FOUND'); assert.equal(e.metrics.writes.length, afterDelete);
  assert.equal((await fs.readdir(e.root)).length, 0);
});

test('source and owner replacement across actual awaited IO invalidate the proof before exposure', async t => {
  for (const mutation of [e => e.setIdentity({ ...identityA, userId: 'replacement-user' }), e => e.setIdentity(null), e => e.setPrefixSuffix('-replacement'), e => e.threads.delete(e.thread.id), (_e, made) => { made.tool.arguments.content = 'Changed in history.'; }, (_e, made) => { made.item.text = 'Changed assistant source'; }]) {
    const e = await environment(t), made = await e.produce(); e.beforeRead(() => mutation(e, made));
    await rejects(e.source.resolve(made.spec), 409);
  }
});

test('isCurrent is synchronous branded source checking; Save must re-resolve physical bytes to detect an overwrite', async t => {
  const e = await environment(t), made = await e.produce('Source value.'), proof = await e.source.resolve(made.spec);
  assert.equal(e.source.isCurrent(proof), true); assert.equal(e.source.isCurrent(proof) instanceof Promise, false);
  await e.write('report.md', 'Changed file!');
  assert.equal(e.source.isCurrent(proof), true, 'The synchronous source check does not pretend to perform filesystem IO');
  await rejects(e.source.resolve(made.spec), 409, 'VERSION_UNAVAILABLE');
  made.tool.result.structuredContent.file.mime = 'text/plain'; assert.equal(e.source.isCurrent(proof), false);
});

test('boot-null, late login, logout, changed user and guest namespace cannot acquire a proof', async t => {
  const e = await environment(t), made = await e.produce(), proof = await e.source.resolve(made.spec);
  e.setIdentity(null); assert.equal(e.source.isCurrent(proof), false); await rejects(e.source.resolve(made.spec), 409, 'ACCOUNT_CHANGED');
  const guest = e.make(); await rejects(guest.resolve(made.spec), 401, 'AUTH_REQUIRED');
  e.setIdentity(identityA); await rejects(guest.resolve(made.spec), 401, 'AUTH_REQUIRED');
  e.setIdentity({ accountId: 'workspace-account-b', userId: 'neutral-user-b', accountUserId: null }); await rejects(e.source.resolve(made.spec), 409, 'ACCOUNT_CHANGED');
});

test('malformed or unsuccessful producer metadata cannot assert a real version', async t => {
  for (const mutate of [m => { m.tool.status = 'failed'; }, m => { m.tool.result.isError = true; }, m => { m.tool.result.structuredContent.file.path = '/mnt/data/other.txt'; }, m => { m.tool.result.structuredContent.file.name = 'other.txt'; }, m => { m.tool.result.structuredContent.file.size++; }, m => { delete m.tool.result.structuredContent.file.mime; }]) {
    const e = await environment(t), made = await e.produce(); mutate(made);
    await rejects(e.source.resolve(made.spec), 409, 'VERSION_UNAVAILABLE'); assert.equal(e.metrics.reads.length, 0);
  }
});

test('later delete and unsupported Python/write_file producers do not borrow an earlier create_file version', async t => {
  const deleted = await environment(t), first = await deleted.produce();
  await deleted.appendTool(deleted.thread, first.turn, 'delete_file', { path: 'report.md' });
  first.turn.items.push({ id: 'after-delete', type: 'agentMessage', text: 'Deleted', phase: 'final' });
  await rejects(deleted.source.resolve({ ...first.spec, messageId: 'after-delete' }), 404, 'VERSION_UNAVAILABLE');
  const legacy = await environment(t), initial = await legacy.produce();
  await legacy.appendTool(legacy.thread, initial.turn, 'write_file', { path: 'report.md', content: 'Actual legacy replacement.' });
  initial.turn.items.push({ id: 'after-legacy', type: 'agentMessage', text: 'Legacy', phase: 'final' });
  await rejects(legacy.source.resolve({ ...initial.spec, messageId: 'after-legacy' }), 501, 'PRODUCER_UNSUPPORTED');
  // A negative protocol fixture: no fake Python execution or hash is claimed.
  const python = await environment(t), created = await python.produce();
  created.turn.items.push({ id: 'python-without-byte-manifest', type: 'mcpToolCall', server: 'browser_workspace', tool: 'python', status: 'completed', arguments: { code: 'not executed by this fixture' }, result: { isError: false, structuredContent: { files: [{ name: 'report.md', path: '/mnt/data/report.md', mime: 'text/markdown', size: 10 }] } } });
  created.turn.items.push({ id: 'after-python', type: 'agentMessage', text: 'Python context', phase: 'final' });
  await rejects(python.source.resolve({ ...created.spec, messageId: 'after-python' }), 501, 'PRODUCER_UNSUPPORTED');
});

test('invalid and noncanonical /mnt/data paths, fake message IDs and excessive transfer sizes perform no workspace IO', async t => {
  const e = await environment(t), made = await e.produce();
  for (const sandboxPath of ['report.md', '/mnt/data/../report.md', '/mnt/data/a/./b.txt', '/mnt/data//report.md', '/mnt/data\\report.md', '/mnt/elsewhere/report.md', '/mnt/data/a\0b']) await rejects(e.source.resolve({ ...made.spec, sandboxPath }), 400);
  await rejects(e.source.resolve({ ...made.spec, messageId: '' }), 400);
  assert.equal(e.metrics.reads.length, 0);
  const small = await environment(t, { maxBytes: 5 }), unicode = await small.produce('中文😀');
  await rejects(small.source.resolve(unicode.spec), 413, 'FILE_TOO_LARGE'); assert.equal(small.metrics.reads.length, 0);
});

test('real storage failures and aborts remain explicit and never produce a substitute success', async t => {
  const e = await environment(t), made = await e.produce();
  e.failRead(Object.assign(Error('Actual host IO failure'), { code: 'EIO' })); await rejects(e.source.resolve(made.spec), 503, 'STORAGE_UNAVAILABLE');
  e.failRead(null); const pre = new AbortController(); pre.abort(); await assert.rejects(e.source.resolve({ ...made.spec, signal: pre.signal }), error => error.name === 'AbortError');
  const during = new AbortController(); e.afterRead(() => during.abort()); await assert.rejects(e.source.resolve({ ...made.spec, signal: during.signal }), error => error.name === 'AbortError');
});

test('a temporary owned conversation can read its real transient file but disappearance after reload invalidates the proof', async t => {
  const e = await environment(t), made = await e.produce(); e.thread.ephemeral = true;
  const proof = await e.source.resolve(made.spec); assert.equal(e.source.isCurrent(proof), true);
  e.threads.clear(); assert.equal(e.source.isCurrent(proof), false); await rejects(e.source.resolve(made.spec), 404);
});

test('unrelated titles, later contexts and other paths do not invalidate the exact earlier source proof', async t => {
  const e = await environment(t), made = await e.produce(), proof = await e.source.resolve(made.spec);
  e.thread.name = 'A truthful local rename'; await e.produce('Other actual bytes.', 'different.txt');
  assert.equal(e.source.isCurrent(proof), true); assert.equal((await e.source.resolve(made.spec)).sourceToken, proof.sourceToken);
});
