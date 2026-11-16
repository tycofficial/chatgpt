import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createLocalFilesService } from '../src/native-client/local-files-service.mjs';
import { createLocalDocumentExtractor, documentWorkerURL } from '../src/native-client/local-document-extraction.mjs';
import { documentAssetURL, ensureDocumentHexAPI } from '../src/native-client/document-text-worker.mjs';
import { smallPdfFixtures } from './support/document-small-pdf-fixtures.mjs';
import { createLocalInputPreparer } from '../src/native-client/local-input-preparation.mjs';
import { createNodeDocumentWorkerFactory, canonicalDocumentWorkerURL } from './support/document-worker-host.mjs';
import { makeTextPdf, makeDocx, corruptDocxCRC } from './support/document-fixtures.mjs';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
function environment(options = {}) {
  const actual = new Map(), metadata = new Map(), workerFactory = createNodeDocumentWorkerFactory(options.host);
  const extractor = createLocalDocumentExtractor({ workerFactory, workerURL: canonicalDocumentWorkerURL('document-fixture'), ...options.extractor });
  let account = 'document-account-a';
  const storage = { async write(key, value) { if (options.failSidecar && key.endsWith('/extracted.txt')) throw Error('Origin quota exceeded'); actual.set(key, value.slice()); if (key.endsWith('/extracted.txt')) await options.afterSidecarWrite?.(key, value); }, async read(key) { if (!actual.has(key)) throw Error('File not found'); return actual.get(key).slice(); }, async remove(key) { if (!actual.delete(key)) throw Error('File not found'); } };
  const metadataStorage = { getItem: key => metadata.get(key) ?? null, setItem: (key, value) => { if (options.failReadyMetadata && JSON.parse(value).files && Object.values(JSON.parse(value).files).some(row => row.status === 'ready')) throw Error('Metadata quota exceeded'); metadata.set(key, value); } };
  const args = { storage, metadataStorage, getAccountId: () => account, getWorkspacePrefix: id => account + '--' + encodeURIComponent(id), documentExtractor: extractor, maxTotalBytes: options.maxTotalBytes ?? 256 * 1024 * 1024, now: options.now, ticketLifetimeMs: options.ticketLifetimeMs };
  return { files: createLocalFilesService(args), restore: () => createLocalFilesService(args), storage, actual, metadata, workerFactory, extractor, setAccount: value => { account = value; } };
}
async function json(env, path, method = 'GET', value, signal) {
  const response = await env.files.handle(new Request('https://documents.invalid/site/__codex-api' + path, { method, ...(value === undefined ? {} : { body: JSON.stringify(value) }), signal }), path);
  const type = response.headers.get('Content-Type');
  return { response, value: type.includes('ndjson') ? (await response.text()).trim().split('\n').map(JSON.parse) : await response.json() };
}
async function upload(env, bytes, format, name = 'neutral.' + format) {
  const allocation = await json(env, '/files', 'POST', { file_name: name, file_size: bytes.length, mime_type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  assert.equal(allocation.response.status, 200, JSON.stringify(allocation.value));
  const form = new FormData(); form.append('file', new File([bytes], name)); form.append('upload_url', new URL(allocation.value.upload_url).searchParams.get('upload_url'));
  await env.files.upload('POST', allocation.value.upload_url, { body: form });
  return allocation.value.file_id;
}
test('actual PDF and compressed DOCX bytes become verified UTF8 sidecars while original bytes remain unchanged', async t => {
  for (const [format, bytes, markers] of [['pdf', makeTextPdf(['PDF_FIRST_REAL_TEXT', 'PDF_SECOND_REAL_TEXT']), ['PDF_FIRST_REAL_TEXT','PDF_SECOND_REAL_TEXT']], ['docx', await makeDocx(), ['NEUTRAL_DOCX_BODY_71E9','中文真实正文','TABLE_CELL_0B8D']]]) {
    const env = environment(); t.after(() => env.extractor.close());
    const originalSHA = digest(bytes), id = await upload(env, bytes, format);
    const completed = await json(env, '/files/process_upload_stream', 'POST', { file_id: id, index_for_retrieval: true });
    assert.equal(completed.response.status, 200, JSON.stringify(completed.value));
    assert.deepEqual(completed.value.map(event => event.event), ['file.processing.file_ready','file.processing.completed']);
    const { record, bytes: stored } = await env.files.readFile(id);
    assert.equal(record.status, 'ready'); assert.equal(record.kind, 'document');
    assert.equal(record.sha256, originalSHA); assert.deepEqual(stored, bytes); assert.equal(digest(bytes), originalSHA);
    assert.equal(record.extraction.sourceSHA256, originalSHA); assert.equal(record.extraction.ocr, false);
    const sidecar = await env.storage.read(record.namespace + '/extracted.txt');
    assert.equal(digest(sidecar), record.extraction.textSHA256);
    for (const marker of markers) assert.ok(new TextDecoder().decode(sidecar).includes(marker));
    const restored = env.restore();
    const messages = [{ author: { role: 'user' }, content: { content_type: 'text', parts: ['Read the actual document.'] }, metadata: { attachments: [{ id, name: record.fileName, mime_type: record.mimeType, size: bytes.length }] } }];
    const resolved = await restored.resolveChatAttachments(messages, { threadId: 'actual-thread' });
    assert.notEqual(resolved.files[0].rawPath, resolved.files[0].textPath);
    assert.equal(resolved.textFiles[0].path, resolved.files[0].textPath);
    assert.match(resolved.textFiles[0].path, /\/text\/extracted\.txt$/);
    assert.deepEqual(await env.storage.read(resolved.files[0].storageKey), bytes);
    const materialized = await env.storage.read(resolved.files[0].textStorageKey);
    assert.equal(new TextDecoder().decode(materialized), resolved.textFiles[0].text);
    for (const marker of markers) assert.ok(resolved.textFiles[0].text.includes(marker));
    const prepared = await createLocalInputPreparer({ files: restored })({ input: [], threadId: 'actual-thread', turn: { adapterMetadata: { classicUserMessage: messages[0] } } });
    for (const marker of markers) assert.ok(prepared.content.includes(marker));
    assert.ok(prepared.content.includes(resolved.files[0].textPath));
    assert.equal(env.workerFactory.workers.length, 1); assert.equal(env.workerFactory.workers[0].terminated, true);
  }
});
test('PDF page/character limits and DOCX character limits are explicit in stored text and extraction metadata', async t => {
  const pdf = environment({ extractor: { limits: { maxPages: 1 } } }); t.after(() => pdf.extractor.close());
  const id = await upload(pdf, makeTextPdf(['FIRST_PAGE_INCLUDED','SECOND_PAGE_NOT_PROCESSED']), 'pdf');
  assert.equal((await json(pdf, '/files/' + id + '/uploaded', 'POST', {})).response.status, 200);
  const p = await pdf.files.readFile(id);
  assert.equal(p.record.extraction.partial, true); assert.equal(p.record.extraction.truncated, true);
  assert.equal(p.record.extraction.totalPages, 2); assert.equal(p.record.extraction.processedPages, 1);
  const text = new TextDecoder().decode(await pdf.storage.read(p.record.namespace + '/extracted.txt'));
  assert.ok(text.includes('This extraction is partial')); assert.ok(text.includes('FIRST_PAGE_INCLUDED')); assert.ok(!text.includes('SECOND_PAGE_NOT_PROCESSED'));
  const docx = environment({ extractor: { limits: { maxCharacters: 20 } } }); t.after(() => docx.extractor.close());
  const did = await upload(docx, await makeDocx('A'.repeat(100)), 'docx');
  assert.equal((await json(docx, '/files/' + did + '/uploaded', 'POST', {})).response.status, 200);
  const d = await docx.files.readFile(did);
  assert.equal(d.record.extraction.extractedCharacters, 20); assert.equal(d.record.extraction.truncated, true);
  assert.deepEqual(d.record.extraction.reasons, ['character_limit']);
});
test('DOCX CRC corruption and truncated/corrupt PDF never emit ready and preserve original raw bytes', async t => {
  for (const [format, bytes] of [['docx', corruptDocxCRC(await makeDocx())], ['pdf', new TextEncoder().encode('%PDF-1.7\nDamaged body')]]) {
    const env = environment(); t.after(() => env.extractor.close());
    const id = await upload(env, bytes, format), result = await json(env, '/files/process_upload_stream', 'POST', { file_id: id });
    assert.equal(result.response.status, 422, JSON.stringify(result.value));
    assert.equal(result.value.error_code, 'file_corrupted');
    const raw = await env.files.readFile(id); assert.equal(raw.record.status, 'stored'); assert.equal(raw.record.sha256, digest(bytes));
    assert.ok(!env.actual.has(raw.record.namespace + '/extracted.txt'));
  }
});
test('real worker timeout and cancellation terminate CPU without a ready sidecar', async t => {
  const timed = environment({ host: { delayMs: 1000 }, extractor: { timeoutMs: 30 } }); t.after(() => timed.extractor.close());
  const tid = await upload(timed, makeTextPdf(), 'pdf'), timeout = await json(timed, '/files/' + tid + '/uploaded', 'POST', {});
  assert.equal(timeout.response.status, 408); assert.equal(timeout.value.error_code, 'document_parse_timeout'); assert.equal(timed.workerFactory.workers[0].terminated, true);
  const cancelled = environment({ host: { delayMs: 1000 } }); t.after(() => cancelled.extractor.close());
  const cid = await upload(cancelled, await makeDocx(), 'docx'), controller = new AbortController();
  const pending = json(cancelled, '/files/process_upload_stream', 'POST', { file_id: cid }, controller.signal);
  await new Promise(resolve => setTimeout(resolve, 30)); controller.abort();
  const result = await pending; assert.equal(result.response.status, 499);
  assert.equal(cancelled.workerFactory.workers[0].terminated, true);
  assert.equal((await cancelled.files.readFile(cid)).record.status, 'stored');
  assert.ok(![...cancelled.actual.keys()].some(key => key.endsWith('/extracted.txt')));
});
test('sidecar or ready-metadata storage failure cannot turn a parsed document into partial success', async t => {
  for (const options of [{ failSidecar: true }, { failReadyMetadata: true }]) {
    const env = environment(options); t.after(() => env.extractor.close());
    const bytes = await makeDocx(), id = await upload(env, bytes, 'docx'), result = await json(env, '/files/' + id + '/uploaded', 'POST', {});
    assert.equal(result.response.status, 507); assert.equal(result.value.error_code, 'local_storage_write_failed');
    const raw = await env.files.readFile(id); assert.equal(raw.record.status, 'stored'); assert.deepEqual(raw.bytes, bytes);
    assert.ok(!env.actual.has(raw.record.namespace + '/extracted.txt'));
  }
});
test('account changes during real parsing and cancelled files never expose another account text', async t => {
  const env = environment({ host: { delayMs: 150 } }); t.after(() => env.extractor.close());
  const id = await upload(env, makeTextPdf(), 'pdf'), parsing = json(env, '/files/' + id + '/uploaded', 'POST', {});
  await new Promise(resolve => setTimeout(resolve, 30)); env.setAccount('document-account-b');
  assert.equal((await parsing).response.status, 409);
  assert.equal((await json(env, '/files/download/' + id)).response.status, 404);
  env.setAccount('document-account-a'); assert.equal((await env.files.readFile(id)).record.status, 'stored');
  await env.files.cancelUpload(id);
  assert.equal((await json(env, '/files/' + id + '/uploaded', 'POST', {})).response.status, 404);
  assert.equal(env.actual.size, 0);
});
test('corrupt or missing extracted text fails rather than returning gibberish or silently reparsing', async t => {
  const env = environment(); t.after(() => env.extractor.close());
  const id = await upload(env, await makeDocx(), 'docx'); await json(env, '/files/' + id + '/uploaded', 'POST', {});
  const { record } = await env.files.readFile(id), key = record.namespace + '/extracted.txt';
  env.actual.set(key, new Uint8Array([65]));
  const result = await json(env, '/files/' + id + '/uploaded', 'POST', {});
  assert.equal(result.response.status, 409); assert.equal(result.value.error_code, 'file_corrupted');
  assert.equal(env.workerFactory.workers.length, 1);
});
test('worker and nested document asset URLs retain only the release version', () => {
  const url = documentWorkerURL('https://documents.invalid/site/native-client/local-document-extraction.mjs?v=release-123');
  assert.equal(url.href, 'https://documents.invalid/site/native-client/document-text-worker.mjs?v=release-123');
  for (const asset of ['pdf.mjs','pdf.worker.mjs','mammoth.js','cmaps/UniGB-UCS2-H.bcmap','standard_fonts/FoxitSans.pfb']) {
    const nested = documentAssetURL('./document-vendor/' + asset, url.href);
    assert.equal(nested.searchParams.get('v'), 'release-123');
    assert.equal(nested.origin, url.origin);
  }
});

test('real password-protected and image-only PDFs fail closed without invented OCR or ready text', async t => {
  for (const fixture of smallPdfFixtures) {
    const bytes = new Uint8Array(Buffer.from(fixture.base64, 'base64'));
    assert.equal(digest(bytes), fixture.sha256);
    const env = environment(); t.after(() => env.extractor.close());
    const id = await upload(env, bytes, 'pdf', fixture.file), result = await json(env, '/files/' + id + '/uploaded', 'POST', {});
    assert.equal(result.response.status, fixture.expectedStatus);
    assert.equal(result.value.error_code, fixture.expectedError);
    const raw = await env.files.readFile(id);
    assert.equal(raw.record.status, 'stored'); assert.equal(raw.record.sha256, fixture.sha256);
    assert.ok(!env.actual.has(raw.record.namespace + '/extracted.txt'));
  }
});

test('simultaneous real document parses recheck fresh quota before each ready commit', async t => {
  const bytes = makeTextPdf(['CONCURRENT_REAL_DOCUMENT_QUOTA']);
  const calibration = environment(); t.after(() => calibration.extractor.close());
  const cid = await upload(calibration, bytes, 'pdf'); await json(calibration, '/files/' + cid + '/uploaded', 'POST', {});
  const sidecarSize = (await calibration.files.readFile(cid)).record.extraction.textSize;
  let writes = 0, release;
  const both = new Promise(resolve => { release = resolve; });
  const quota = bytes.length * 2 + sidecarSize + 1;
  const env = environment({ maxTotalBytes: quota, afterSidecarWrite: async () => { if (++writes === 2) release(); await both; } }); t.after(() => env.extractor.close());
  const ids = await Promise.all([upload(env, bytes, 'pdf', 'same.pdf'), upload(env, bytes, 'pdf', 'same.pdf')]);
  const parsed = await Promise.all(ids.map(id => json(env, '/files/' + id + '/uploaded', 'POST', {})));
  assert.deepEqual(parsed.map(result => result.response.status).sort(), [200, 507]);
  const rows = await Promise.all(ids.map(id => env.files.readFile(id)));
  assert.equal(rows.filter(row => row.record.status === 'ready').length, 1);
  assert.ok([...env.actual.values()].reduce((total, bytes) => total + bytes.length, 0) <= quota);
  assert.ok(rows.every(row => digest(row.bytes) === digest(bytes)));
});

test('a fresh raw-file admission racing a document parse cannot overcommit sidecar quota', async t => {
  const bytes = makeTextPdf(['RAW_ADMISSION_CONCURRENT_WITH_TEXT']);
  const calibration = environment(); t.after(() => calibration.extractor.close());
  const cid = await upload(calibration, bytes, 'pdf'); await json(calibration, '/files/' + cid + '/uploaded', 'POST', {});
  const sidecarSize = (await calibration.files.readFile(cid)).record.extraction.textSize;
  let admitted;
  const env = environment({ maxTotalBytes: bytes.length * 2 + sidecarSize - 1, afterSidecarWrite: async () => { admitted = await json(env, '/files', 'POST', { file_name: 'fresh.txt', file_size: bytes.length, mime_type: 'text/plain' }); } }); t.after(() => env.extractor.close());
  const id = await upload(env, bytes, 'pdf'), parsed = await json(env, '/files/' + id + '/uploaded', 'POST', {});
  assert.equal(admitted.response.status, 200);
  assert.equal(parsed.response.status, 507); assert.equal(parsed.value.error_code, 'over_user_quota');
  const raw = await env.files.readFile(id); assert.equal(raw.record.status, 'stored');
  assert.ok(!env.actual.has(raw.record.namespace + '/extracted.txt'));
});

test('expired unused tickets do not block real document extraction while expired stored bytes still count', async t => {
  let clock = 1000;
  const options = { maxTotalBytes: 3000, now: () => clock, ticketLifetimeMs: 10 };
  const env = environment(options); t.after(() => env.extractor.close());
  const expired = await json(env, '/files', 'POST', { file_name: 'unused.txt', file_size: 2500, mime_type: 'text/plain' });
  assert.equal(expired.response.status, 200);
  clock = 1011;
  const bytes = makeTextPdf(['EXPIRED_PENDING_REAL_PDF_TEXT']), id = await upload(env, bytes, 'pdf');
  const parsed = await json(env, '/files/' + id + '/uploaded', 'POST', {});
  assert.equal(parsed.response.status, 200, JSON.stringify(parsed.value));
  const raw = await env.files.readFile(id);
  assert.equal(raw.record.status, 'ready'); assert.deepEqual(raw.bytes, bytes);
  assert.ok(new TextDecoder().decode(await env.storage.read(raw.record.namespace + '/extracted.txt')).includes('EXPIRED_PENDING_REAL_PDF_TEXT'));
  assert.ok([...env.actual.values()].reduce((total, value) => total + value.length, 0) <= options.maxTotalBytes);
  const expiredRecord = Object.values(JSON.parse([...env.metadata.values()][0]).files).find(row => row.fileId === expired.value.file_id);
  assert.equal(expiredRecord.status, 'pending'); assert.ok(expiredRecord.expiresAt <= clock);
  assert.equal(env.workerFactory.workers.length, 1); assert.equal(env.workerFactory.workers[0].terminated, true);

  clock = 1000;
  const stored = environment(options); t.after(() => stored.extractor.close());
  const retained = await json(stored, '/files', 'POST', { file_name: 'retained.txt', file_size: 2500, mime_type: 'text/plain' });
  assert.equal(retained.response.status, 200);
  const form = new FormData(); form.append('file', new File(['R'.repeat(2500)], 'retained.txt'));
  form.append('upload_url', new URL(retained.value.upload_url).searchParams.get('upload_url'));
  await stored.files.upload('POST', retained.value.upload_url, { body: form });
  clock = 1011;
  const rejected = await json(stored, '/files', 'POST', { file_name: 'new.pdf', file_size: bytes.length, mime_type: 'application/pdf' });
  assert.equal(rejected.response.status, 507); assert.equal(rejected.value.error_code, 'over_user_quota');
  assert.equal((await stored.files.readFile(retained.value.file_id)).bytes.length, 2500);
  assert.equal(stored.workerFactory.workers.length, 0);
});

test('the ES2025 hex fallback converts actual view bytes and rejects invalid or detached receivers', () => {
  const original = Object.getOwnPropertyDescriptor(Uint8Array.prototype, 'toHex');
  try {
    delete Uint8Array.prototype.toHex; ensureDocumentHexAPI();
    const data = new Uint8Array([0, 15, 16, 255]);
    assert.equal(data.toHex(), '000f10ff'); assert.equal(data.subarray(1, 3).toHex(), '0f10');
    assert.throws(() => Uint8Array.prototype.toHex.call(new Uint16Array([1])), TypeError);
    const detached = new Uint8Array([1]); structuredClone(detached.buffer, { transfer: [detached.buffer] });
    assert.throws(() => detached.toHex(), TypeError);
  } finally { if (original) Object.defineProperty(Uint8Array.prototype, 'toHex', original); else delete Uint8Array.prototype.toHex; }
});
