import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalFilesService } from '../src/native-client/local-files-service.mjs';
import { createLocalDocumentExtractor } from '../src/native-client/local-document-extraction.mjs';
import { createNodeDocumentWorkerFactory, canonicalDocumentWorkerURL } from './support/document-worker-host.mjs';
import { xlsxFixtureBytes } from './support/xlsx-fixtures.mjs';
function environment(options = {}) {
  const actual = new Map(), metadata = new Map(), workers = createNodeDocumentWorkerFactory(options.host);
  let account = 'facade-owner-a';
  const extractor = createLocalDocumentExtractor({ workerFactory: workers, workerURL: canonicalDocumentWorkerURL('facade') });
  const controls = { failRemove: null, noOpRemove: false, failDeleteMetadata: false, afterReadMetadata: null, afterRemove: null };
  const storage = { async write(key, value) { actual.set(key, value.slice()); }, async read(key) { if (!actual.has(key)) throw Error('File not found'); return actual.get(key).slice(); }, async remove(key) { if (controls.failRemove?.(key)) throw Error('Disk temporarily unavailable'); if (!controls.noOpRemove) actual.delete(key); await controls.afterRemove?.(key); } };
  const metadataStorage = { getItem(key) { const value = metadata.get(key) ?? null; controls.afterReadMetadata?.(key); return value; }, setItem(key, value) { if (controls.failDeleteMetadata && Object.keys(JSON.parse(value).files).length === 0) throw Error('Metadata quota exceeded'); metadata.set(key, value); } };
  const files = createLocalFilesService({ storage, metadataStorage, getAccountId: () => account, getWorkspacePrefix: id => account + '--' + encodeURIComponent(id), documentExtractor: extractor });
  return { files, actual, metadata, controls, extractor, workers, setAccount: value => { account = value; } };
}
async function upload(env, value = new TextEncoder().encode('ACTUAL_FACADE_BYTES'), format = 'txt') {
  const response = await env.files.handle(new Request('https://facade.invalid/__codex-api/files', { method: 'POST', body: JSON.stringify({ file_name: 'neutral.' + format, file_size: value.length, mime_type: format === 'txt' ? 'text/plain' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }) }), '/files');
  assert.equal(response.status, 200); const allocation = await response.json();
  const form = new FormData(); form.append('file', new File([value], 'neutral.' + format)); form.append('upload_url', new URL(allocation.upload_url).searchParams.get('upload_url'));
  await env.files.upload('POST', allocation.upload_url, { body: form }); return allocation.file_id;
}
async function ready(env, id) {
  const response = await env.files.handle(new Request('https://facade.invalid/__codex-api/files/' + id + '/uploaded', { method: 'POST', body: '{}' }), '/files/' + id + '/uploaded');
  assert.equal(response.status, 200, await response.text());
}

test('the account-owned file list contains only the explicit sanitized catalog DTO', async t => {
  const env = environment(); t.after(() => env.extractor.close());
  const id = await upload(env); await ready(env, id);
  const rows = await env.files.listFiles(); assert.equal(rows.length, 1);
  assert.deepEqual(Object.keys(rows[0]).sort(), ['fileId','fileName','mimeType','size','kind','status','sha256','createdAt','processedAt'].sort());
  assert.equal(rows[0].fileId, id); assert.equal(rows[0].status, 'ready'); assert.match(rows[0].sha256, /^[0-9a-f]{64}$/);
  assert.equal(typeof rows[0].processedAt, 'number');
  env.setAccount('facade-owner-b'); assert.deepEqual(await env.files.listFiles(), []);
  await assert.rejects(() => env.files.permanentDeleteFile(id), error => error.status === 404);
  env.setAccount('facade-owner-a'); assert.equal((await env.files.readFile(id)).bytes.length, rows[0].size);
});

test('catalog listing validates metadata and detects account changes/cancellation without leaking another owner', async t => {
  const env = environment(); t.after(() => env.extractor.close()); await upload(env);
  env.controls.afterReadMetadata = () => env.setAccount('facade-owner-b');
  await assert.rejects(() => env.files.listFiles(), error => error.status === 409);
  env.controls.afterReadMetadata = null; env.setAccount('facade-owner-a');
  const controller = new AbortController(); controller.abort();
  await assert.rejects(() => env.files.listFiles({ signal: controller.signal }), error => error.name === 'AbortError');
  const [key, value] = [...env.metadata][0], state = JSON.parse(value); Object.values(state.files)[0].sha256 = 'not-a-real-hash'; env.metadata.set(key, JSON.stringify(state));
  await assert.rejects(() => env.files.listFiles(), error => error.code === 'file_corrupted');
});

test('permanent deletion verifies actual XLSX raw bytes and sidecar absence before removing its record', async t => {
  const env = environment(); t.after(() => env.extractor.close());
  const id = await upload(env, xlsxFixtureBytes('xlsx-openpyxl-inline.xlsx'), 'xlsx'); await ready(env, id);
  assert.equal(env.actual.size, 2);
  assert.deepEqual(await env.files.permanentDeleteFile(id), { deleted: true, fileId: id });
  assert.equal(env.actual.size, 0); assert.deepEqual(await env.files.listFiles(), []);
  await assert.rejects(() => env.files.readFile(id), error => error.status === 404);
  await assert.rejects(() => env.files.permanentDeleteFile(id), error => error.status === 404);
});

test('a sidecar IO failure leaves retry metadata and never reports a cancelled/deleted success', async t => {
  const env = environment(); t.after(() => env.extractor.close());
  const id = await upload(env, xlsxFixtureBytes('xlsx-openpyxl-inline.xlsx'), 'xlsx'); await ready(env, id);
  env.controls.failRemove = key => key.endsWith('/extracted.txt');
  await assert.rejects(() => env.files.permanentDeleteFile(id), error => error.status === 503);
  assert.equal((await env.files.listFiles())[0].status, 'ready'); assert.equal(env.actual.size, 1);
  assert.ok([...env.actual.keys()][0].endsWith('/extracted.txt'));
  env.controls.failRemove = null;
  assert.equal((await env.files.permanentDeleteFile(id)).deleted, true); assert.equal(env.actual.size, 0);
  assert.deepEqual(await env.files.listFiles(), []);
});

test('a no-op storage delete and a failed metadata commit cannot claim the bytes are gone', async t => {
  const env = environment(); t.after(() => env.extractor.close()); const id = await upload(env);
  env.controls.noOpRemove = true;
  await assert.rejects(() => env.files.permanentDeleteFile(id), error => error.status === 503);
  assert.equal(env.actual.size, 1); assert.equal((await env.files.listFiles()).length, 1);
  env.controls.noOpRemove = false; env.controls.failDeleteMetadata = true;
  await assert.rejects(() => env.files.permanentDeleteFile(id), error => error.status === 507);
  assert.equal(env.actual.size, 0); assert.equal((await env.files.listFiles()).length, 1);
  env.controls.failDeleteMetadata = false;
  assert.equal((await env.files.permanentDeleteFile(id)).deleted, true); assert.deepEqual(await env.files.listFiles(), []);
});

test('owner changes or aborts during permanent IO preserve retry metadata and do not touch the new owner', async t => {
  for (const changeAccount of [true, false]) {
    const env = environment(); t.after(() => env.extractor.close()); const id = await upload(env), controller = new AbortController();
    env.controls.afterRemove = () => { if (changeAccount) env.setAccount('facade-owner-b'); else controller.abort(); };
    await assert.rejects(() => env.files.permanentDeleteFile(id, { signal: controller.signal }), error => changeAccount ? error.status === 409 : error.name === 'AbortError');
    env.controls.afterRemove = null; env.setAccount('facade-owner-a'); assert.equal((await env.files.listFiles()).length, 1);
    assert.equal((await env.files.permanentDeleteFile(id)).deleted, true);
  }
});

test('permanent deletion serializes after an actual in-flight Office parser instead of racing a late ready commit', async t => {
  const env = environment({ host: { delayMs: 100 } }); t.after(() => env.extractor.close());
  const id = await upload(env, xlsxFixtureBytes('xlsx-openpyxl-inline.xlsx'), 'xlsx');
  const processing = ready(env, id); await new Promise(resolve => setTimeout(resolve, 20));
  const deletion = env.files.permanentDeleteFile(id);
  await processing; assert.equal((await deletion).deleted, true);
  assert.equal(env.actual.size, 0); assert.deepEqual(await env.files.listFiles(), []);
  assert.equal(env.workers.workers[0].terminated, true);
});
