import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { createBrowserToolExecutor } from '../src/native-client/browser-tool-executor.mjs';

const marker = { version: 1, source: 'browser-workspace-written-files', algorithm: 'sha256', verification: 'write-readback' };
const encoder = new TextEncoder(), sha = value => createHash('sha256').update(value).digest('hex');
const utf8 = value => encoder.encode(value), asDataURL = (bytes, mime) => 'data:' + mime + ';base64,' + Buffer.from(bytes).toString('base64');
function genuinePDF() {
  const stream = 'BT /F1 12 Tf 20 80 Td (Neutral Python PDF artifact) Tj ET';
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 100] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', '<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream'];
  let text = '%PDF-1.4\n', offsets = [0];
  for (const [i, object] of objects.entries()) { offsets.push(Buffer.byteLength(text)); text += (i + 1) + ' 0 obj\n' + object + '\nendobj\n'; }
  const xref = Buffer.byteLength(text); text += 'xref\n0 6\n0000000000 65535 f \n' + offsets.slice(1).map(n => String(n).padStart(10, '0') + ' 00000 n \n').join('') + 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
  return new Uint8Array(Buffer.from(text));
}
function genuinePNG() {
  const crc = bytes => { let value = 0xffffffff; for (const byte of bytes) { value ^= byte; for (let i = 0; i < 8; i++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0); } return (value ^ 0xffffffff) >>> 0; };
  const chunk = (type, bytes) => { const label = Buffer.from(type), size = Buffer.alloc(4), sum = Buffer.alloc(4); size.writeUInt32BE(bytes.length); sum.writeUInt32BE(crc(Buffer.concat([label, bytes]))); return Buffer.concat([size, label, bytes, sum]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4); ihdr[8] = 8; ihdr[9] = 6;
  return new Uint8Array(Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.from([0, 255, 0, 0, 255]))), chunk('IEND', Buffer.alloc(0))]));
}
const output = files => ({ ok: true, error: null, stdout: 'Neutral Python output.', stderr: '', result: '3', files });
const descriptor = (name, bytes, mime) => ({ name, path: '/mnt/data/' + name, mime, dataUrl: asDataURL(bytes, mime) });

async function environment(t, options = {}) {
  const parent = path.resolve(process.env.GENERATED_PUBLICATION_TEST_TMPDIR ?? os.tmpdir()); await fs.mkdir(parent, { recursive: true });
  const root = await fs.mkdtemp(path.join(parent, 'native-python-versions-'));
  const index = new Map(), events = [], runtimeCalls = []; let namespace = 'neutral-python-owner', beforeWrite, afterWrite, beforeRead;
  const disk = key => path.join(root, sha(key));
  const storage = {
    async write(key, bytes) { events.push({ kind: 'write-start', key }); await beforeWrite?.(key, bytes); await fs.writeFile(disk(key), bytes); index.set(key, true); events.push({ kind: 'write-done', key }); await afterWrite?.(key); },
    async read(key) { events.push({ kind: 'read', key }); await beforeRead?.(key); return new Uint8Array(await fs.readFile(disk(key))); },
    async list(prefix) { events.push({ kind: 'input-list', prefix }); const rows = []; for (const key of index.keys()) if (key.startsWith(prefix + '/')) rows.push({ name: key.slice(prefix.length + 1), size: (await fs.stat(disk(key))).size }); return rows; },
    async remove(key) { await fs.unlink(disk(key)); index.delete(key); },
  };
  // Explicit PythonRuntime transport fixture. Genuine engine execution is a
  // separate D-only proof; these tests target real executor/storage semantics.
  class ProtocolRuntime {
    async run(code, files, onStatus) { runtimeCalls.push({ code, files }); onStatus?.('neutral runtime fixture'); return options.run ? options.run(code, files) : options.output ?? output([]); }
    terminate(reason) { events.push({ kind: 'runtime-terminated', reason: reason?.name }); }
  }
  const executor = createBrowserToolExecutor({ storage, PythonRuntime: ProtocolRuntime, PYTHON_TOOL: { type: 'function', function: { name: 'python' } }, getWorkspaceNamespace: () => namespace });
  const context = { threadId: 'actual-python-thread' };
  const invoke = signal => executor.execute({ id: 'neutral-python-call', function: { name: 'python', arguments: JSON.stringify({ code: 'Neutral fixture code' }) } }, { ...context, signal });
  t.after(async () => { executor.dispose(); const absolute = path.resolve(root); if (!absolute.startsWith(parent + path.sep) || !path.basename(absolute).startsWith('native-python-versions-')) throw Error('Unexpected fixture cleanup path'); await fs.rm(absolute, { recursive: true, force: true }); });
  return { executor, storage, events, runtimeCalls, context, invoke, index,
    beforeWrite: value => { beforeWrite = value; }, afterWrite: value => { afterWrite = value; }, beforeRead: value => { beforeRead = value; }, setNamespace: value => { namespace = value; },
    async actual(name, prefix = executor.getWorkspacePrefix(context.threadId)) { return new Uint8Array(await fs.readFile(disk(prefix + '/' + name))); },
  };
}

test('text, PDF and PNG retain original descriptors and receive actual persisted-byte SHA plus the explicit manifest', async t => {
  const text = utf8('Neutral Python text 中文 😀.\n'), pdf = genuinePDF(), png = genuinePNG();
  const e = await environment(t, { output: output([descriptor('text.txt', text, 'text/plain'), { name: 'document.pdf', bytes: pdf }, descriptor('image.png', png, 'image/png')]) });
  const result = await e.invoke(), data = result.structuredContent;
  assert.equal(result.isError, false); assert.deepEqual(data.artifact_manifest, marker); assert.equal(data.executionEnvironment, 'browser-pyodide');
  assert.deepEqual(data.files.map(file => file.name), ['text.txt', 'document.pdf', 'image.png']);
  for (const [i, bytes] of [text, pdf, png].entries()) {
    const file = data.files[i], actual = await e.actual(file.name);
    assert.equal(file.sha256, sha(bytes)); assert.equal(file.sha256, sha(actual)); assert.equal(file.size, bytes.length);
    assert.equal(file.path, '/mnt/data/' + file.name); assert.equal(file.mime, ['text/plain', 'application/pdf', 'image/png'][i]);
    assert.match(file.url, /^\/__local_artifacts\/account-neutral-python-owner--actual-python-thread\//);
    assert.deepEqual([...actual], [...bytes]); assert.match(file.sha256, /^[0-9a-f]{64}$/);
  }
  assert.deepEqual(JSON.parse(result.content[0].text), data);
  assert.equal(result.content.filter(item => item.type === 'resource_link').length, 3);
  assert.equal(e.events.filter(event => event.kind === 'input-list').length, 1, 'No new output scan may be added');
  assert.equal(e.events.filter(event => event.kind === 'read').length, 3, 'Exactly one actual readback per output');
  for (const read of e.events.filter(event => event.kind === 'read')) assert(e.events.findIndex(event => event.kind === 'write-done' && event.key === read.key) < e.events.indexOf(read));
});

test('a runtime buffer mutation during real write cannot change the privately captured version', async t => {
  const runtimeBytes = utf8('AAAA'), e = await environment(t, { output: output([{ name: 'copy.txt', bytes: runtimeBytes }]) });
  e.beforeWrite(() => runtimeBytes.fill(66));
  const result = await e.invoke(); assert.equal(result.structuredContent.files[0].sha256, sha(utf8('AAAA')));
  assert.equal(new TextDecoder().decode(await e.actual('copy.txt')), 'AAAA'); assert.equal(new TextDecoder().decode(runtimeBytes), 'BBBB');
});

test('mutated storage input or changed readback fails instead of assigning current bytes to the old output version', async t => {
  const e = await environment(t, { output: output([{ name: 'changed.txt', bytes: utf8('AAAA') }]) });
  e.beforeWrite((_key, bytes) => bytes.fill(66));
  await assert.rejects(e.invoke(), error => error.code === 'LOCAL_WORKSPACE_ARTIFACT_WRITE_CHANGED' && error.status === 409);
  assert.equal(new TextDecoder().decode(await e.actual('changed.txt')), 'BBBB');
});

test('write and readback IO failures propagate, and no rollback or successful manifest is invented', async t => {
  const before = await environment(t, { output: output([{ name: 'file.txt', bytes: utf8('Real bytes') }]) }), writeError = Object.assign(Error('Neutral write IO failure'), { code: 'EIO' });
  before.beforeWrite(() => { throw writeError; }); await assert.rejects(before.invoke(), error => error === writeError); assert.equal(before.index.size, 0);
  const after = await environment(t, { output: output([{ name: 'file.txt', bytes: utf8('Real bytes') }]) }), readError = Object.assign(Error('Neutral readback IO failure'), { code: 'EIO' });
  after.beforeRead(() => { throw readError; }); await assert.rejects(after.invoke(), error => error === readError);
  assert.equal(new TextDecoder().decode(await after.actual('file.txt')), 'Real bytes', 'A failed attestation does not pretend to undo a real write');
});

test('abort before execution or after actual writes never returns successful artifact metadata', async t => {
  const e = await environment(t, { output: output([{ name: 'abort.txt', bytes: utf8('Written before abort') }]) }), already = new AbortController(); already.abort();
  await assert.rejects(e.invoke(already.signal), error => error.name === 'AbortError'); assert.equal(e.runtimeCalls.length, 0);
  const during = new AbortController(); e.afterWrite(() => during.abort()); await assert.rejects(e.invoke(during.signal), error => error.name === 'AbortError');
  assert.equal(new TextDecoder().decode(await e.actual('abort.txt')), 'Written before abort'); assert.equal(e.events.filter(event => event.kind === 'read').length, 0);
});

test('namespace replacement during await refuses new version metadata for the captured workspace', async t => {
  const e = await environment(t, { output: output([{ name: 'owner.txt', bytes: utf8('Original namespace bytes') }]) });
  const oldPrefix = e.executor.getWorkspacePrefix(e.context.threadId); e.afterWrite(() => e.setNamespace('replacement-owner'));
  await assert.rejects(e.invoke(), error => error.code === 'LOCAL_WORKSPACE_ARTIFACT_NAMESPACE_CHANGED');
  assert.equal(new TextDecoder().decode(await e.actual('owner.txt', oldPrefix)), 'Original namespace bytes');
});

test('existing long stdout/stderr/result logs receive the same real-write hashes and keep current truncation data', async t => {
  const text = 'x'.repeat(32010), e = await environment(t, { output: { ...output([{ name: 'plain.txt', bytes: utf8('Small actual file') }]), stdout: text, stderr: text, result: text } });
  const result = await e.invoke(), data = result.structuredContent;
  assert.equal(data.files.length, 4); assert.deepEqual(data.artifact_manifest, marker);
  for (const key of ['stdout', 'stderr', 'result']) {
    assert.equal(data[key].length, 32000); assert.equal(data[key + '_truncated'], true);
    const file = data.files.find(file => file.name.endsWith('-' + key + '.txt')); assert(file.name.startsWith('.logs/'));
    assert.equal(file.sha256, sha(utf8(text))); assert.equal(file.sha256, sha(await e.actual(file.name)));
  }
  assert.equal(e.events.filter(event => event.kind === 'input-list').length, 1);
});

test('ordinary create_file/list_files stay unversioned and the pre-existing runtime input list is preserved', async t => {
  const e = await environment(t, { output: output([]) });
  const create = await e.executor.execute({ function: { name: 'create_file', arguments: JSON.stringify({ name: 'existing.txt', content: 'Existing input' }) } }, e.context);
  assert.equal(create.structuredContent.file.sha256, undefined); assert.equal(create.structuredContent.artifact_manifest, undefined);
  const python = await e.invoke(); assert.deepEqual(python.structuredContent.files, []); assert.deepEqual(python.structuredContent.artifact_manifest, marker);
  assert.equal(e.runtimeCalls[0].files[0].name, 'existing.txt'); assert.equal(new TextDecoder().decode(e.runtimeCalls[0].files[0].bytes), 'Existing input');
  const listed = await e.executor.execute({ function: { name: 'list_files', arguments: '{}' } }, e.context);
  assert.equal(listed.structuredContent.artifact_manifest, undefined); assert.equal(listed.structuredContent.files[0].sha256, undefined);
});

test('Python engine error status stays failed even if its recoverable output bytes were genuinely stored and hashed', async t => {
  const e = await environment(t, { output: { ...output([{ name: 'recovered.txt', bytes: utf8('Actual partial file') }]), ok: false, error: 'Neutral actual runtime error', stdout: 'Preserved prior stdout', stderr: 'Preserved error' } });
  const result = await e.invoke(); assert.equal(result.isError, true); assert.equal(result.structuredContent.error, 'Neutral actual runtime error');
  assert.equal(result.structuredContent.stdout, 'Preserved prior stdout'); assert.deepEqual(result.structuredContent.artifact_manifest, marker);
  assert.equal(result.structuredContent.files[0].sha256, sha(await e.actual('recovered.txt')));
});

test('duplicate canonical output paths fail honestly instead of returning an ambiguous version manifest', async t => {
  const e = await environment(t, { output: output([{ name: 'same.txt', bytes: utf8('First real file') }, { name: './same.txt', bytes: utf8('Second conflicting file') }]) });
  await assert.rejects(e.invoke(), error => error.code === 'LOCAL_WORKSPACE_ARTIFACT_DUPLICATE_PATH');
  assert.equal(new TextDecoder().decode(await e.actual('same.txt')), 'First real file'); assert.equal(e.events.filter(event => event.kind === 'write-done').length, 1);
});

test('empty binary files have an exact version while malformed bytes/paths and oversized files never gain success metadata', async t => {
  const empty = await environment(t, { output: output([{ name: 'empty.txt', bytes: new Uint8Array() }]) });
  assert.equal((await empty.invoke()).structuredContent.files[0].sha256, sha(new Uint8Array()));
  for (const file of [{ name: '../escape.txt', bytes: utf8('No escape') }, { name: 'invalid.txt', bytes: 'not binary bytes' }, { name: 'large.txt', bytes: new Uint8Array(20 * 1024 * 1024 + 1) }]) {
    const e = await environment(t, { output: output([file]) }); await assert.rejects(e.invoke()); assert.equal(e.index.size, 0);
  }
});

test('the existing descriptor MIME resolver remains unchanged; this version marker does not add Office rendering support', async t => {
  const e = await environment(t, { output: output([{ name: 'example.docx', bytes: utf8('Negative MIME-contract fixture; not a DOCX parser claim'), mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }]) });
  const result = await e.invoke(); assert.equal(result.structuredContent.files[0].mime, 'application/octet-stream');
  assert.equal(result.structuredContent.files[0].sha256, sha(await e.actual('example.docx')));
});
