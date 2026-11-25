import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createLocalWorkspaceDownloadService } from '../src/native-client/local-workspace-download-service.mjs';
const encoder = new TextEncoder(), digest = bytes => createHash('sha256').update(bytes).digest('hex');
const baseIdentity = () => ({ accountId: 'neutral-account', userId: 'neutral-user', accountUserId: 'neutral-owner' });
const ownerKey = identity => identity && JSON.stringify([identity.accountId, identity.userId, identity.accountUserId ?? null]);
const context = { conversationId: 'conversation-1', messageId: 'assistant-1', sandboxPath: '/mnt/data/neutral.txt' };
const fail = (message, status = 409, code = 'FIXTURE_SOURCE_CHANGED') => Object.assign(new Error(message), { status, code });
function fixture(options = {}) {
  let identity = baseIdentity();
  const state = { bytes: encoder.encode('Actual neutral workspace bytes 中文.'), token: 'source-token-1', fileName: 'neutral.txt', mimeType: 'text/plain', exists: true, current: true };
  const brands = new WeakSet(), urls = new Set(), counters = { resolves: 0, creates: 0, revokes: 0 }, diagnostics = [], proofs = [];
  const create = blob => { counters.creates++; const url = URL.createObjectURL(blob); urls.add(url); return url; };
  const revoke = url => { counters.revokes++; urls.delete(url); URL.revokeObjectURL(url); };
  const service = createLocalWorkspaceDownloadService({
    getIdentity: () => identity,
    resolveSource: async spec => {
      counters.resolves++;
      await options.beforeResolve?.(spec, state);
      if (!state.exists) throw fail('Actual bytes are missing.', 404, 'FIXTURE_FILE_NOT_FOUND');
      const proof = { conversationId: spec.conversationId, messageId: spec.messageId, sandboxPath: spec.sandboxPath, ownerKey: ownerKey(identity), bytes: state.bytes, fileName: state.fileName, mimeType: state.mimeType, size: state.bytes.length, sha256: digest(state.bytes), sourceToken: state.token, ...options.proofOverride?.(spec, state) };
      brands.add(proof); proofs.push(proof); return proof;
    },
    isSourceCurrent: proof => brands.has(proof) && state.current && proof.ownerKey === ownerKey(identity) && proof.sourceToken === state.token,
    createObjectURL: blob => options.create?.(blob, { create, state, setIdentity: value => { identity = value; } }) ?? create(blob),
    revokeObjectURL: revoke, onDiagnostic: value => diagnostics.push(value), deadlineMs: options.deadlineMs ?? 10000,
  });
  return { service, state, counters, urls, diagnostics, proofs, create, revoke, setIdentity: value => { identity = value; }, getIdentity: () => identity };
}
function request(spec = context, { method = 'GET', signal, query } = {}) {
  const params = query ?? new URLSearchParams({ message_id: spec.messageId, sandbox_path: spec.sandboxPath, download_intent: 'false' }).toString();
  return new Request('https://neutral.invalid/__codex-api/conversation/' + encodeURIComponent(spec.conversationId) + '/interpreter/download?' + params, { method, signal });
}
async function ticket(env, spec = context, init) { const response = await env.service.handle(request(spec, init)); assert.ok(response); return { response, body: await response.json() }; }
async function admitted(env) { const value = await ticket(env); assert.equal(value.response.status, 200, JSON.stringify(value.body)); return value.body.download_url; }

test('exact original JSON ticket exposes real matching Blob bytes and reuses only the same verified context', async t => {
  const e = fixture(); t.after(() => e.service.dispose());
  const first = await ticket(e), url = first.body.download_url;
  assert.deepEqual(Object.keys(first.body).sort(), ['download_url', 'status']); assert.equal(first.body.status, 'success');
  assert.equal(e.service.ownsObjectURL(url), true); const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer()); assert.equal(digest(bytes), digest(e.state.bytes));
  assert.equal((await admitted(e)), url); assert.equal(e.counters.resolves, 2, 'Even cache reuse rechecks the actual source.'); assert.equal(e.counters.creates, 1);
  assert.ok(!JSON.stringify(first.body).includes('source-token')); assert.ok(!JSON.stringify(first.body).includes('neutral-account'));
});

test('strict duplicate, missing, unknown, nonboolean, aliased and foreign-path queries fail before source IO', async t => {
  const e = fixture(); t.after(() => e.service.dispose());
  const queries = [
    'message_id=assistant-1&sandbox_path=%2Fmnt%2Fdata%2Fneutral.txt&message_id=assistant-2',
    'message_id=assistant-1',
    'message_id=assistant-1&sandbox_path=%2Fmnt%2Fdata%2Fneutral.txt&unknown=1',
    'message_id=assistant-1&sandbox_path=%2Fmnt%2Fdata%2Fneutral.txt&download_intent=1',
    'message_id=assistant-1&sandbox_path=%2Fmnt%2Fdata%2F..%2Fforeign.txt',
    'message_id=assistant-1&sandbox_path=%2Fmnt%2Fdata%2Fa%2F.%2Fb',
    'message_id=assistant-1&sandbox_path=%2Fmnt%2Fdata%2Fa%5Cb',
    'message_id=assistant-1&sandbox_path=%2Fmnt%2Fdata%2F%00a',
    'message_id=assistant-1&sandbox_path=%2Fetc%2Fneutral.txt',
  ];
  for (const query of queries) assert.equal((await ticket(e, context, { query })).response.status, 400, query);
  assert.equal(e.counters.resolves, 0); assert.equal(e.counters.creates, 0);
  assert.equal(await e.service.handle(new Request('https://neutral.invalid/share/id/file')), null);
  assert.equal((await ticket(e, context, { method: 'POST' })).response.status, 405);
});

test('URLSearchParams performs one decode and a percent-containing real name is never decoded a second time', async t => {
  const e = fixture(); t.after(() => e.service.dispose());
  const spec = { ...context, sandboxPath: '/mnt/data/percent%2Fname.txt' };
  e.state.fileName = 'percent%2Fname.txt'; const result = await ticket(e, spec); assert.equal(result.response.status, 200);
  assert.equal(e.proofs[0].sandboxPath, spec.sandboxPath);
});

test('guest and identity loss during async resolution issue no URL', async t => {
  let release, entered; const ready = new Promise(resolve => { entered = resolve; }), hold = new Promise(resolve => { release = resolve; });
  const e = fixture({ beforeResolve: async () => { entered(); await hold; } }); t.after(() => e.service.dispose());
  const pending = ticket(e); await ready; e.setIdentity(null); release(); const result = await pending; assert.equal(result.response.status, 401); assert.equal(e.counters.creates, 0);
  assert.equal((await ticket(e)).response.status, 401);
});

test('wrong context, wrong owner, wrong hash and inconsistent size cannot register byte authority', async t => {
  const cases = [{ messageId: 'foreign-message' }, { ownerKey: 'foreign-owner' }, { sha256: '0'.repeat(64) }, { size: 1 }];
  for (const override of cases) { const e = fixture({ proofOverride: () => override }); t.after(() => e.service.dispose()); const result = await ticket(e); assert.equal(result.response.status, 409); assert.equal(e.counters.creates, 0); }
});

test('resolver bytes are copied before digest so later source-buffer changes cannot poison an issued snapshot', async t => {
  const e = fixture(); t.after(() => e.service.dispose()); const original = e.state.bytes.slice(), url = await admitted(e);
  e.state.bytes.fill(65); const actual = new Uint8Array(await (await fetch(url)).arrayBuffer()); assert.deepEqual(actual, original);
});

test('context, source-token and MIME differences do not reuse old preview URLs', async t => {
  const e = fixture(); t.after(() => e.service.dispose()); const a = await admitted(e), b = await ticket(e, { ...context, messageId: 'assistant-2' }); assert.notEqual(a, b.body.download_url);
  e.state.token = 'source-token-2'; e.state.mimeType = 'text/markdown'; const c = await admitted(e); assert.notEqual(c, a); assert.equal(e.service.ownsObjectURL(a), false); assert.equal((await fetch(c)).headers.get('Content-Type'), 'text/markdown');
});

test('unknown actual bytes decline without calling resolver or a native primitive', async t => {
  const e = fixture(); t.after(() => e.service.dispose()); let invoked = 0;
  assert.deepEqual(await e.service.downloadVerifiedBytes(encoder.encode('Never issued bytes.'), { fileName: 'x.txt' }, () => { invoked++; }), { handled: false });
  assert.equal(e.counters.resolves, 0); assert.equal(invoked, 0);
});

test('native Save re-resolves the exact issued source and grants only its exact Blob for one actual URL creation', async t => {
  const e = fixture(); t.after(() => e.service.dispose()); await admitted(e); const before = e.counters.creates; let outputURL, captured;
  const result = await e.service.downloadVerifiedBytes(e.state.bytes, { fileName: 'safe-save-as.txt' }, (blob, name) => { captured = { blob, name }; outputURL = e.service.createNativeDownloadURL(blob, e.create); assert.equal(e.service.ownsObjectURL(outputURL), true); });
  assert.deepEqual(result, { handled: true }); assert.equal(e.counters.resolves, 2); assert.equal(e.counters.creates, before + 1); assert.equal(captured.name, 'safe-save-as.txt'); assert.equal(captured.blob.type, 'text/plain'); assert.equal(digest(new Uint8Array(await (await fetch(outputURL)).arrayBuffer())), digest(e.state.bytes));
  const later = e.service.createNativeDownloadURL(captured.blob, e.create); assert.equal(e.service.ownsObjectURL(later), false, 'The exact Blob grant ends when the synchronous callback exits.'); e.revoke(later);
});

test('native Work download resolves its exact source and grants the link without an earlier preview ticket', async t => {
  const e = fixture();
  t.after(() => e.service.dispose());
  let saved;
  await e.service.downloadSource(context, {}, (blob, name) => {
    const url = e.service.createNativeDownloadURL(blob, e.create);
    assert.equal(e.service.ownsObjectURL(url), true);
    saved = { name, url };
  });
  assert.equal(saved.name, e.state.fileName);
  assert.equal(e.counters.resolves, 1);
  assert.equal(e.proofs[0].messageId, context.messageId);
  assert.deepEqual(new Uint8Array(await (await fetch(saved.url)).arrayBuffer()), e.state.bytes);

  e.state.current = false;
  assert.equal(e.service.ownsObjectURL(saved.url), false);
  await assert.rejects(e.service.downloadSource(context, {}, () => assert.fail('Saved a stale file')),
    { code: 'WORKSPACE_DOWNLOAD_SOURCE_CHANGED' });
  await assert.rejects(e.service.downloadSource({ ...context, sandboxPath: '/mnt/data/../invalid.txt' }, {},
    () => assert.fail('Saved an invalid path')), { code: 'WORKSPACE_DOWNLOAD_INVALID_REQUEST' });
  assert.equal(e.counters.resolves, 2);
});

test('one native grant cannot authorize two URLs and unknown Blob objects keep standard URL behavior without authority', async t => {
  const e = fixture(); t.after(() => e.service.dispose()); await admitted(e); let first;
  await e.service.downloadVerifiedBytes(e.state.bytes, {}, blob => { first = e.service.createNativeDownloadURL(blob, e.create); assert.throws(() => e.service.createNativeDownloadURL(blob, e.create), /only one URL/); });
  const alien = e.service.createNativeDownloadURL(new Blob([e.state.bytes]), e.create); assert.equal(e.service.ownsObjectURL(alien), false); e.revoke(alien); assert.equal(e.service.ownsObjectURL(first), true);
});

test('invalidated source bytes remain recognized and throw rather than falling back after ownership checks revoke the cache', async t => {
  const e = fixture(); t.after(() => e.service.dispose()); const original = e.state.bytes.slice(), url = await admitted(e); e.state.current = false;
  assert.equal(e.service.ownsObjectURL(url), false); let invoked = false;
  await assert.rejects(e.service.downloadVerifiedBytes(original, {}, () => { invoked = true; }), error => error.code === 'WORKSPACE_DOWNLOAD_SOURCE_UNAVAILABLE'); assert.equal(invoked, false);
});

test('physical deletion and changed actual bytes before Save propagate typed failures, retaining known-byte rejection', async t => {
  for (const kind of ['deleted', 'overwritten']) { const e = fixture(); t.after(() => e.service.dispose()); await admitted(e); const previous = e.state.bytes.slice();
    if (kind === 'deleted') e.state.exists = false; else e.state.bytes = encoder.encode('Different actual disk version.');
    let invoked = 0; await assert.rejects(e.service.downloadVerifiedBytes(previous, {}, () => { invoked++; }), error => kind === 'deleted' ? error.code === 'FIXTURE_FILE_NOT_FOUND' : error.code === 'WORKSPACE_DOWNLOAD_BYTES_CHANGED'); assert.equal(invoked, 0);
    await assert.rejects(e.service.downloadVerifiedBytes(previous, {}, () => {}), error => error.code === 'WORKSPACE_DOWNLOAD_SOURCE_UNAVAILABLE');
  }
});

test('native filename rejection and async native primitives cannot leave an active exact-Blob grant', async t => {
  const e = fixture(); t.after(() => e.service.dispose()); await admitted(e); let captured;
  await assert.rejects(e.service.downloadVerifiedBytes(e.state.bytes, { fileName: '../bad' }, () => {}), /filename/);
  await assert.rejects(e.service.downloadVerifiedBytes(e.state.bytes, {}, blob => { captured = blob; return Promise.resolve(); }), /remain synchronous/);
  const url = e.service.createNativeDownloadURL(captured, e.create); assert.equal(e.service.ownsObjectURL(url), false); e.revoke(url);
});

test('owner change during actual URL creation revokes it before returning a ticket or grant', async t => {
  const e = fixture({ create(blob, { create, setIdentity }) { const url = create(blob); setIdentity({ ...baseIdentity(), userId: 'changed-user' }); return url; } }); t.after(() => e.service.dispose());
  assert.equal((await ticket(e)).response.status, 409); assert.equal(e.urls.size, 0);
});

test('cancellation while resolving issues no ticket; disposal rejects both new requests and native saves', async t => {
  let release, entered; const ready = new Promise(resolve => { entered = resolve; }), hold = new Promise(resolve => { release = resolve; });
  const e = fixture({ beforeResolve: async () => { entered(); await hold; } }); t.after(() => e.service.dispose()); const controller = new AbortController(), pending = ticket(e, context, { signal: controller.signal }); await ready; controller.abort(); release(); assert.equal((await pending).response.status, 499); assert.equal(e.counters.creates, 0);
  e.service.dispose(); assert.equal((await ticket(e)).response.status, 409); await assert.rejects(e.service.downloadVerifiedBytes(new Uint8Array(), {}, () => {}), error => error.code === 'WORKSPACE_DOWNLOAD_DISPOSED');
});

test('forgetting a revoked preview URL removes related native URL authority and never restores stale bytes as unknown', async t => {
  const e = fixture(); t.after(() => e.service.dispose()); const preview = await admitted(e); let native;
  await e.service.downloadVerifiedBytes(e.state.bytes, {}, blob => { native = e.service.createNativeDownloadURL(blob, e.create); });
  e.service.forgetNativeDownloadURL(preview); e.revoke(preview); assert.equal(e.service.ownsObjectURL(preview), false); assert.equal(e.service.ownsObjectURL(native), false);
  await assert.rejects(e.service.downloadVerifiedBytes(e.state.bytes, {}, () => {}), error => error.code === 'WORKSPACE_DOWNLOAD_SOURCE_UNAVAILABLE');
});

test('never-settling source IO rejects promptly on outer abort and a later genuine Retry succeeds with a fresh signal', async t => {
  let entered, firstSignal; const ready = new Promise(resolve => { entered = resolve; }); let calls = 0;
  const e = fixture({ deadlineMs: 500, beforeResolve: async spec => { if (++calls === 1) { firstSignal = spec.signal; entered(); await new Promise(() => {}); } } }); t.after(() => e.service.dispose());
  const controller = new AbortController(), start = Date.now(), pending = ticket(e, context, { signal: controller.signal }); await ready; assert.notEqual(firstSignal, controller.signal); controller.abort();
  const result = await pending; assert.equal(result.response.status, 499); assert.ok(Date.now() - start < 400); assert.equal(firstSignal.aborted, true); assert.equal(e.counters.creates, 0);
  assert.equal((await ticket(e)).response.status, 200); assert.equal(e.counters.creates, 1);
});

test('bounded source deadline excludes late uncooperative results and never mints their URL', async t => {
  let release, firstSignal; const hold = new Promise(resolve => { release = resolve; }); let calls = 0;
  const e = fixture({ deadlineMs: 80, beforeResolve: async spec => { if (++calls === 1) { firstSignal = spec.signal; await hold; } } }); t.after(() => e.service.dispose());
  const result = await ticket(e); assert.equal(result.response.status, 503); assert.equal(result.body.error.code, 'WORKSPACE_DOWNLOAD_TIMEOUT'); assert.equal(firstSignal.aborted, true); assert.equal(e.counters.creates, 0);
  release(); await new Promise(resolve => setTimeout(resolve, 25)); assert.equal(e.counters.creates, 0, 'Late source proof must never reach URL issuance.');
  assert.equal((await ticket(e)).response.status, 200); assert.equal(e.counters.creates, 1);
});

test('native Save storage timeout propagates, late completion cannot invoke Save, and reopening permits a real retry', async t => {
  let release; const hold = new Promise(resolve => { release = resolve; }); let calls = 0;
  const e = fixture({ deadlineMs: 80, beforeResolve: async () => { if (++calls === 2) await hold; } }); t.after(() => e.service.dispose()); await admitted(e); let invoked = 0;
  await assert.rejects(e.service.downloadVerifiedBytes(e.state.bytes, {}, () => { invoked++; }), error => error.code === 'WORKSPACE_DOWNLOAD_TIMEOUT'); assert.equal(invoked, 0);
  release(); await new Promise(resolve => setTimeout(resolve, 25)); assert.equal(invoked, 0); assert.equal(e.urls.size, 0);
  await assert.rejects(e.service.downloadVerifiedBytes(e.state.bytes, {}, () => {}), error => error.code === 'WORKSPACE_DOWNLOAD_SOURCE_UNAVAILABLE');
  await admitted(e); assert.deepEqual(await e.service.downloadVerifiedBytes(e.state.bytes, {}, () => { invoked++; }), { handled: true }); assert.equal(invoked, 1);
});

test('dispose aborts a pending unresponsive source and deadline configuration remains bounded', async () => {
  let entered; const ready = new Promise(resolve => { entered = resolve; }); const e = fixture({ beforeResolve: async () => { entered(); await new Promise(() => {}); } });
  const pending = ticket(e); await ready; e.service.dispose(); const result = await pending; assert.equal(result.response.status, 409); assert.equal(result.body.error.code, 'WORKSPACE_DOWNLOAD_DISPOSED'); assert.equal(e.counters.creates, 0);
  const required = { getIdentity: () => baseIdentity(), resolveSource: () => {}, isSourceCurrent: () => true };
  for (const deadlineMs of [0, -1, 10001, Infinity, 1.5]) assert.throws(() => createLocalWorkspaceDownloadService({ ...required, deadlineMs }), TypeError);
});
