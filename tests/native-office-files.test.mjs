import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createLocalFilesService } from '../src/native-client/local-files-service.mjs';
import { createLocalDocumentExtractor } from '../src/native-client/local-document-extraction.mjs';
import { createLocalInputPreparer } from '../src/native-client/local-input-preparation.mjs';
import { createNodeDocumentWorkerFactory, canonicalDocumentWorkerURL } from './support/document-worker-host.mjs';
import { xlsxFixtureBytes } from './support/xlsx-fixtures.mjs';
import { realPptx, imageOnlyPptx } from './support/office-pptx-fixtures.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const MIME = { xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
function environment(options = {}) {
  const actual = new Map(), metadata = new Map(), workers = createNodeDocumentWorkerFactory(options.host);
  let account = 'office-owner-a';
  const extractor = createLocalDocumentExtractor({ workerFactory: workers, workerURL: canonicalDocumentWorkerURL('office-files-fixture'), ...options.extractor });
  const storage = { async write(key, bytes) { if (options.failSidecar && key.endsWith('/extracted.txt')) throw Error('Quota exceeded'); actual.set(key, bytes.slice()); if (key.endsWith('/extracted.txt')) await options.afterSidecarWrite?.(); }, async read(key) { if (!actual.has(key)) throw Error('File not found'); return actual.get(key).slice(); }, async remove(key) { actual.delete(key); } };
  const metadataStorage = { getItem: key => metadata.get(key) ?? null, setItem: (key, value) => { if (options.failReadyMetadata && Object.values(JSON.parse(value).files).some(row => row.status === 'ready')) throw Error('Metadata quota exceeded'); metadata.set(key, value); } };
  const args = { storage, metadataStorage, getAccountId: () => account, getWorkspacePrefix: id => account + '--' + encodeURIComponent(id), documentExtractor: extractor, maxTotalBytes: options.maxTotalBytes ?? 256 * 1024 * 1024 };
  return { files: createLocalFilesService(args), restore: () => createLocalFilesService(args), actual, metadata, storage, workers, extractor, setAccount: value => { account = value; } };
}
async function json(env, path, body, signal) {
  const response = await env.files.handle(new Request('https://office.invalid/site/__codex-api' + path, { method: 'POST', body: JSON.stringify(body), signal }), path);
  return { response, value: response.headers.get('Content-Type').includes('ndjson') ? (await response.text()).trim().split('\n').map(JSON.parse) : await response.json() };
}
async function upload(env, bytes, format, mime = MIME[format]) {
  const allocation = await json(env, '/files', { file_name: 'neutral.' + format, file_size: bytes.length, mime_type: mime });
  assert.equal(allocation.response.status, 200, JSON.stringify(allocation.value));
  const form = new FormData(); form.append('file', new File([bytes], 'neutral.' + format)); form.append('upload_url', new URL(allocation.value.upload_url).searchParams.get('upload_url'));
  await env.files.upload('POST', allocation.value.upload_url, { body: form });
  return allocation.value.file_id;
}

test('genuine XLSX/PPTX bytes pass the actual dedicated worker, SHA sidecar, restore and prepared model-input chain', async t => {
  for (const [format, bytes, markers] of [['xlsx', xlsxFixtureBytes('xlsx-multisheet-typed-formula-cache.xlsx'), ['XLSX_MAIN_标记', 'XLSX_INLINE_MARKER', 'XLSX_VERY_HIDDEN_SHEET']], ['pptx', realPptx(), ['PPTX-SLIDE-C', 'PPTX-TABLE-END', 'PPTX-NESTED-GROUP-END']]]) {
    const env = environment(); t.after(() => env.extractor.close());
    const originalSHA = hash(bytes), id = await upload(env, bytes, format), processed = await json(env, '/files/process_upload_stream', { file_id: id, index_for_retrieval: true });
    assert.equal(processed.response.status, 200, JSON.stringify(processed.value));
    assert.deepEqual(processed.value.map(event => event.event), ['file.processing.file_ready', 'file.processing.completed']);
    const raw = await env.files.readFile(id);
    assert.equal(raw.record.mimeType, MIME[format]); assert.equal(raw.record.storageName, 'document.' + format);
    assert.deepEqual(raw.bytes, bytes); assert.equal(raw.record.sha256, originalSHA); assert.equal(raw.record.extraction.sourceSHA256, originalSHA);
    assert.equal(raw.record.extraction.parser.xml.version, '0.8.15');
    if (format === 'xlsx') { assert.equal(raw.record.extraction.formulaEvaluation, false); assert.equal(raw.record.extraction.missingFormulaCaches, 1); assert.equal(raw.record.extraction.partial, true); }
    const sidecar = await env.storage.read(raw.record.namespace + '/extracted.txt');
    assert.equal(hash(sidecar), raw.record.extraction.textSHA256);
    const message = { author: { role: 'user' }, content: { content_type: 'text', parts: ['Read the real uploaded data.'] }, metadata: { attachments: [{ id, name: raw.record.fileName, mime_type: MIME[format], size: bytes.length }] } };
    const restored = env.restore(), resolved = await restored.resolveChatAttachments([message], { threadId: 'actual-office-thread' });
    assert.notEqual(resolved.files[0].rawPath, resolved.files[0].textPath);
    assert.equal(resolved.textFiles[0].path, resolved.files[0].textPath);
    assert.deepEqual(await env.storage.read(resolved.files[0].storageKey), bytes);
    assert.equal(new TextDecoder().decode(await env.storage.read(resolved.files[0].textStorageKey)), resolved.textFiles[0].text);
    const prepared = await createLocalInputPreparer({ files: restored })({ input: [], threadId: 'actual-office-thread', turn: { adapterMetadata: { classicUserMessage: message } } });
    for (const marker of markers) assert.ok(prepared.content.includes(marker), marker);
    assert.ok(prepared.content.includes(resolved.files[0].textPath));
    assert.equal(env.workers.workers.length, 1); assert.equal(env.workers.workers[0].terminated, true); assert.equal(hash(bytes), originalSHA);
  }
});

test('actual XLSX corruption and image-only PPTX cannot emit ready or materialize claimed text', async t => {
  for (const [format, bytes, code] of [['xlsx', xlsxFixtureBytes('xlsx-corrupt-crc.xlsx'), 'file_corrupted'], ['pptx', imageOnlyPptx(), 'document_text_unavailable']]) {
    const env = environment(); t.after(() => env.extractor.close());
    const id = await upload(env, bytes, format), result = await json(env, '/files/process_upload_stream', { file_id: id });
    assert.equal(result.response.status, 422); assert.equal(result.value.error_code, code);
    const raw = await env.files.readFile(id); assert.equal(raw.record.status, 'stored'); assert.equal(raw.record.sha256, hash(bytes));
    assert.ok(!env.actual.has(raw.record.namespace + '/extracted.txt'));
    await assert.rejects(() => env.files.resolveChatAttachments([{ author: { role: 'user' }, content: { content_type: 'text', parts: ['Read the upload.'] }, metadata: { attachments: [{ id }] } }], { threadId: 'must-not-infer' }));
    assert.equal(env.workers.workers.length, 1); assert.equal(env.workers.workers[0].terminated, true);
  }
});

test('Office worker budgets, timeout and cancellation fail before a ready record', async t => {
  const bytes = xlsxFixtureBytes('xlsx-openpyxl-inline.xlsx');
  for (const [options, expected] of [[{ extractor: { limits: { maxXmlPartBytes: 80 } } }, 'document_container_limit'], [{ extractor: { timeoutMs: 30 }, host: { delayMs: 1000 } }, 'document_parse_timeout']]) {
    const env = environment(options); t.after(() => env.extractor.close());
    const id = await upload(env, bytes, 'xlsx'), result = await json(env, '/files/' + id + '/uploaded', {});
    assert.equal(result.value.error_code, expected); assert.equal((await env.files.readFile(id)).record.status, 'stored');
    assert.ok(![...env.actual.keys()].some(key => key.endsWith('/extracted.txt')));
    assert.equal(env.workers.workers[0].terminated, true);
  }
  const env = environment({ host: { delayMs: 1000 } }); t.after(() => env.extractor.close());
  const id = await upload(env, realPptx(), 'pptx'), controller = new AbortController(), pending = json(env, '/files/' + id + '/uploaded', {}, controller.signal);
  await new Promise(resolve => setTimeout(resolve, 30)); controller.abort();
  assert.equal((await pending).response.status, 499); assert.equal((await env.files.readFile(id)).record.status, 'stored');
  assert.equal(env.workers.workers[0].terminated, true);
});

test('account switches and actual sidecar/metadata failures preserve raw Office bytes without partial success', async t => {
  const bytes = xlsxFixtureBytes('xlsx-openpyxl-inline.xlsx');
  for (const options of [{ failSidecar: true }, { failReadyMetadata: true }]) {
    const env = environment(options); t.after(() => env.extractor.close());
    const id = await upload(env, bytes, 'xlsx'), result = await json(env, '/files/' + id + '/uploaded', {});
    assert.equal(result.response.status, 507); assert.equal(result.value.error_code, 'local_storage_write_failed');
    const raw = await env.files.readFile(id); assert.equal(raw.record.status, 'stored'); assert.deepEqual(raw.bytes, bytes);
    assert.ok(!env.actual.has(raw.record.namespace + '/extracted.txt'));
  }
  const env = environment({ host: { delayMs: 150 } }); t.after(() => env.extractor.close());
  const id = await upload(env, bytes, 'xlsx'), pending = json(env, '/files/' + id + '/uploaded', {});
  await new Promise(resolve => setTimeout(resolve, 30)); env.setAccount('office-owner-b');
  assert.equal((await pending).response.status, 409);
  await assert.rejects(() => env.files.readFile(id)); env.setAccount('office-owner-a');
  assert.equal((await env.files.readFile(id)).record.status, 'stored');
});

test('simultaneous genuine XLSX/PPTX worker completions cannot overcommit the shared raw/sidecar quota', async t => {
  const samples = [['xlsx', xlsxFixtureBytes('xlsx-openpyxl-inline.xlsx')], ['pptx', realPptx()]], sizes = [];
  const calibration = environment(); t.after(() => calibration.extractor.close());
  for (const [format, bytes] of samples) { const id = await upload(calibration, bytes, format); assert.equal((await json(calibration, '/files/' + id + '/uploaded', {})).response.status, 200); sizes.push((await calibration.files.readFile(id)).record.extraction.textSize); }
  let writes = 0, release; const barrier = new Promise(resolve => { release = resolve; });
  const quota = samples.reduce((total, [, bytes]) => total + bytes.length, 0) + Math.max(...sizes) + 1;
  const env = environment({ maxTotalBytes: quota, afterSidecarWrite: async () => { if (++writes === 2) release(); await barrier; } }); t.after(() => env.extractor.close());
  const ids = await Promise.all(samples.map(([format, bytes]) => upload(env, bytes, format))), results = await Promise.all(ids.map(id => json(env, '/files/' + id + '/uploaded', {})));
  assert.deepEqual(results.map(row => row.response.status).sort(), [200,507]);
  assert.equal((await Promise.all(ids.map(id => env.files.readFile(id)))).filter(row => row.record.status === 'ready').length, 1);
  assert.ok([...env.actual.values()].reduce((total, value) => total + value.length, 0) <= quota);
});

test('supported extensions select real bytes despite an octet MIME while legacy/macro variants remain rejected', async t => {
  const env = environment(); t.after(() => env.extractor.close());
  const id = await upload(env, xlsxFixtureBytes('xlsx-openpyxl-inline.xlsx'), 'xlsx', 'application/octet-stream');
  assert.equal((await json(env, '/files/' + id + '/uploaded', {})).response.status, 200);
  assert.equal((await env.files.readFile(id)).record.mimeType, MIME.xlsx);
  for (const name of ['old.xls','old.xlsb','macro.xlsm','old.ppt','macro.pptm']) assert.equal((await json(env, '/files', { file_name: name, file_size: 12, mime_type: MIME.xlsx })).response.status, 415);
});
