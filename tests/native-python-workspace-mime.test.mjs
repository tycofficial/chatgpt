import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { createBrowserToolExecutor, workspacePath } from '../src/native-client/browser-tool-executor.mjs';
import { createWorkspaceDownloadSource } from '../src/native-client/local-workspace-download-source.mjs';
import { fixtureBase64 } from './support/python-workspace-mime-fixtures.mjs';

const utf8 = value => new TextEncoder().encode(value), sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fixture = name => new Uint8Array(Buffer.from(fixtureBase64[name], 'base64'));
const marker = { version: 1, source: 'browser-workspace-written-files', algorithm: 'sha256', verification: 'write-readback' };
const table = [
  ['txt', 'text/plain', utf8('Neutral MIME text 中文.')], ['md', 'text/markdown', utf8('# Neutral markdown')], ['py', 'text/x-python', utf8('print(42)')], ['js', 'text/javascript', utf8('console.log(42)')],
  ['html', 'text/html', utf8('<!doctype html><title>Neutral fixture</title>')], ['svg', 'image/svg+xml', utf8('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2"/></svg>')],
  ['csv', 'text/csv', utf8('name,value\nneutral,42\n')], ['json', 'application/json', utf8('{"neutral":42}')],
  ['png', 'image/png', fixture('png')], ['jpg', 'image/jpeg', fixture('jpeg')], ['jpeg', 'image/jpeg', fixture('jpeg')], ['gif', 'image/gif', fixture('gif')], ['webp', 'image/webp', fixture('webp')],
  ['pdf', 'application/pdf', fixture('pdf')], ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', fixture('docx')],
  ['xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', fixture('xlsx')], ['pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', fixture('pptx')], ['zip', 'application/zip', fixture('docx')],
];
async function environment(t, outputFiles = []) {
  const parent = path.resolve(process.env.GENERATED_PUBLICATION_TEST_TMPDIR ?? os.tmpdir()); await fs.mkdir(parent, { recursive: true });
  const root = await fs.mkdtemp(path.join(parent, 'native-python-mime-')), index = new Set(); let output = outputFiles;
  const disk = key => path.join(root, sha(key));
  const storage = {
    async write(key, bytes) { await fs.writeFile(disk(key), new Uint8Array(bytes)); index.add(key); },
    async read(key) { return new Uint8Array(await fs.readFile(disk(key))); },
    async list(prefix) { const rows = []; for (const key of index) if (key.startsWith(prefix + '/')) rows.push({ name: key.slice(prefix.length + 1), size: (await fs.stat(disk(key))).size }); return rows; },
    async remove(key) { await fs.unlink(disk(key)); index.delete(key); },
  };
  // This is an explicit runtime-output fixture. These cases exercise the real
  // executor/storage/download path and make no genuine Python or UI claim.
  class ControlledOutputRuntime { async run() { return { ok: true, stdout: 'Neutral controlled output.', files: structuredClone(output) }; } terminate() {} }
  const identity = { accountId: 'neutral-mime-owner', userId: 'neutral-mime-user', accountUserId: null }, threadId = 'mime-thread';
  const executor = createBrowserToolExecutor({ storage, getWorkspaceNamespace: () => identity.accountId, PythonRuntime: ControlledOutputRuntime, PYTHON_TOOL: { type: 'function', function: { name: 'python' } } });
  const call = { id: 'mime-python-call', function: { name: 'python', arguments: JSON.stringify({ code: 'Neutral runtime-output fixture; not executed Python' }) } };
  const invoke = () => executor.execute(call, { threadId });
  const makeSource = result => {
    const thread = { id: threadId, turns: [{ id: 'mime-turn', status: 'completed', items: [{ id: call.id, type: 'mcpToolCall', server: 'browser_workspace', tool: 'python', status: 'completed', arguments: JSON.parse(call.function.arguments), result }, { id: 'mime-assistant', type: 'agentMessage', text: 'Actual stored output bytes.', phase: 'final_answer' }] }] };
    return createWorkspaceDownloadSource({ getIdentity: () => identity, getThread: id => id === threadId ? thread : null, getWorkspacePrefix: id => executor.getWorkspacePrefix(id), storage, workspacePath });
  };
  t.after(async () => { executor.dispose(); const absolute = await fs.realpath(root), relative = path.relative(parent, absolute); assert.ok(!relative.startsWith('..') && !path.isAbsolute(relative) && path.basename(absolute).startsWith('native-python-mime-')); await fs.rm(absolute, { recursive: true, force: true }); });
  return { executor, storage, threadId, invoke, makeSource, setOutput: value => { output = value; } };
}
async function assertTransport(e, file, mime, expected) {
  const stored = await e.storage.read(e.executor.getWorkspacePrefix(e.threadId) + '/' + file.name); assert.equal(sha(stored), sha(expected));
  const blob = await e.executor.getArtifact(e.threadId, file.name); assert.equal(blob.type, mime); assert.equal(sha(new Uint8Array(await blob.arrayBuffer())), sha(expected));
  const response = await e.executor.handleArtifactRequest(new Request(new URL(file.url, 'https://neutral-mime.invalid')));
  assert.equal(response.status, 200); assert.equal(response.headers.get('Content-Type'), mime); assert.match(response.headers.get('Content-Disposition'), /^attachment;/);
  assert.equal(sha(new Uint8Array(await response.arrayBuffer())), sha(expected));
}

test('known Worker extensions and existing JS mapping agree across real descriptors, Blob and HTTP bytes in both cases', async t => {
  const cases = table.flatMap(([extension, mime, bytes]) => [extension, extension.toUpperCase()].map((suffix, index) => ({ name: 'nested/neutral-' + index + '.' + suffix, mime, bytes })));
  const e = await environment(t, cases.map(row => ({ name: row.name, bytes: row.bytes, mime: 'application/x-untrusted-runtime-hint' })));
  const result = await e.invoke(); assert.equal(result.isError, false); assert.deepEqual(result.structuredContent.artifact_manifest, marker); assert.equal(result.structuredContent.files.length, 36);
  for (const [index, row] of cases.entries()) {
    const file = result.structuredContent.files[index]; assert.equal(file.name, row.name); assert.equal(file.mime, row.mime); assert.equal(file.size, row.bytes.length); assert.equal(file.sha256, sha(row.bytes));
    assert.equal(result.content.filter(item => item.type === 'resource_link')[index].mimeType, row.mime);
    await assertTransport(e, file, row.mime, row.bytes);
  }
});

test('unknown and unsupported legacy extensions remain binary despite MIME claims in runtime/dataURL', async t => {
  const bytes = utf8('Actual neutral bytes; no format assertion.'), names = ['unknown.bin', 'unknown', 'old.DOC', 'old.XLS', 'old.PPT', 'macro.DOCM', 'archive.svgz', 'photo.JPEG.backup', 'report.docx#not-an-extension', 'unknown.constructor', 'unknown.CONSTRUCTOR', 'unknown.__proto__', 'unknown.__PROTO__'];
  const e = await environment(t, names.map(name => ({ name, mime: 'application/pdf', dataUrl: 'data:application/pdf;base64,' + Buffer.from(bytes).toString('base64') })));
  const result = await e.invoke();
  for (const file of result.structuredContent.files) { assert.equal(file.mime, 'application/octet-stream'); assert.equal(file.sha256, sha(bytes)); await assertTransport(e, file, 'application/octet-stream', bytes); }
});

test('MIME classification changes no raw bytes, hashes or manifest and does not validate a format from its extension', async t => {
  const bytes = utf8('This is deliberately not an Office binary document.');
  const e = await environment(t, [{ name: 'same.bin', bytes }, { name: 'same.DoCx', bytes }]);
  const result = await e.invoke(), [binary, document] = result.structuredContent.files;
  assert.equal(binary.mime, 'application/octet-stream'); assert.equal(document.mime, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  assert.equal(binary.sha256, document.sha256); assert.equal(document.sha256, sha(bytes)); assert.deepEqual(result.structuredContent.artifact_manifest, marker);
  assert.equal('validated' in document, false); assert.equal('parsed' in document, false); await assertTransport(e, document, document.mime, bytes);
});

test('create_file and list_files reuse the same classifier without gaining a Python version manifest', async t => {
  const e = await environment(t), text = 'Neutral original create_file content.';
  const result = await e.executor.execute({ id: 'create-upper', function: { name: 'create_file', arguments: JSON.stringify({ name: 'SCRIPT.JS', content: text }) } }, { threadId: e.threadId });
  const file = result.structuredContent.file; assert.equal(file.mime, 'text/javascript'); assert.equal('sha256' in file, false); assert.equal('artifact_manifest' in result.structuredContent, false);
  await assertTransport(e, file, 'text/javascript', utf8(text));
  const listed = await e.executor.execute({ id: 'list-original', function: { name: 'list_files', arguments: '{}' } }, { threadId: e.threadId });
  assert.equal(listed.structuredContent.files[0].mime, 'text/javascript'); assert.equal('sha256' in listed.structuredContent.files[0], false); assert.equal('artifact_manifest' in listed.structuredContent, false);
});

test('the unchanged version resolver verifies known Office/image MIME with the same byte SHA and respects original recorded metadata', async t => {
  const cases = [['version.DOCX', fixture('docx')], ['version.XLSX', fixture('xlsx')], ['version.PPTX', fixture('pptx')], ['version.JpEg', fixture('jpeg')]];
  const e = await environment(t, cases.map(([name, bytes]) => ({ name, bytes }))), result = await e.invoke(), source = e.makeSource(result);
  for (const file of result.structuredContent.files) {
    const proof = await source.resolve({ conversationId: e.threadId, messageId: 'mime-assistant', sandboxPath: file.path });
    assert.equal(proof.mimeType, file.mime); assert.equal(proof.sha256, file.sha256); assert.equal(sha(proof.bytes), file.sha256); assert.equal(source.isCurrent(proof), true);
  }
  const old = structuredClone(result); old.structuredContent.files[0].mime = 'application/octet-stream';
  const oldSource = e.makeSource(old), oldProof = await oldSource.resolve({ conversationId: e.threadId, messageId: 'mime-assistant', sandboxPath: old.structuredContent.files[0].path });
  assert.equal(oldProof.mimeType, 'application/octet-stream', 'Old history is consumed as recorded; no metadata migration'); assert.equal(oldProof.sha256, result.structuredContent.files[0].sha256);
});
