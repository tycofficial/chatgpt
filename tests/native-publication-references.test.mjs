import test from 'node:test';
import assert from 'node:assert/strict';
import { createNativePublicationReferences } from '../src/native-client/native-publication-references.mjs';
import { createLibraryPublishingExecutor, normalizePublicationReceipt } from '../src/native-client/local-library-publisher.mjs';
import { createBrowserToolExecutor } from '../src/native-client/browser-tool-executor.mjs';

const logical = 'file_local_' + '1'.repeat(32), raw = 'file_local_' + '2'.repeat(32), secondRaw = 'file_local_' + '3'.repeat(32);
const copy = value => structuredClone(value);
const identity = () => ({ accountId: 'neutral-account', userId: 'neutral-user', accountUserId: 'neutral-account-user' });
const receipt = (patch = {}) => ({ committed: true, operationId: 'tool_' + 'a'.repeat(64), fileId: logical, rawFileId: raw, revision: 1, sha256: 'b'.repeat(64), fileName: '中性报告.md', mimeType: 'text/markdown', size: 71, publication: { origin: 'generated', revision: 1, updatedAt: 1800000000000 }, ...patch });
const output = (value = receipt(), uri = 'blob:neutral-owned-revision-one') => ({ isError: false, structuredContent: { ...value, downloadAvailable: true }, content: [{ type: 'text', text: JSON.stringify(value) }, { type: 'resource_link', uri, name: value.fileName, mimeType: value.mimeType, size: value.size }] });
const tool = (result = output(), id = 'publish-item') => ({ type: 'mcpToolCall', id, server: 'browser_workspace', tool: 'publish_file', status: 'completed', arguments: { path: '中性报告.md' }, result });
const expected = value => ({ type: 'file', name: value.fileName, file_id: value.rawFileId, library_file_id: value.fileId, mime_type: value.mimeType, size: value.size });
function deepFreeze(value) { if (value && typeof value === 'object' && !Object.isFrozen(value)) { for (const entry of Object.values(value)) deepFreeze(entry); Object.freeze(value); } return value; }
function fixture(options = {}) {
  let active = identity(); const diagnostics = [], validations = [], verified = [];
  const final = { type: 'agentMessage', id: 'final-answer', text: 'Neutral final reply unchanged.', phase: 'final_answer' };
  const turn = { id: 'neutral-turn', status: 'completed', error: null, items: [{ type: 'agentMessage', id: 'commentary', text: 'Neutral commentary unchanged.', phase: 'commentary' }, tool(), final] };
  const thread = { id: 'neutral-thread', turns: [turn] };
  const projector = createNativePublicationReferences({
    getIdentity: () => active,
    normalizeReceipt: (value, operation) => { validations.push(operation); return normalizePublicationReceipt(value, operation); },
    ownsPublishedResource: (uri, value) => { verified.push({ uri, receipt: copy(value) }); return uri === 'blob:neutral-owned-revision-one' && value.rawFileId === raw; },
    onDiagnostic: event => diagnostics.push(event), ...options,
  });
  return { projector, thread, turn, item: final, diagnostics, validations, verified, getIdentity: () => active, setIdentity: value => { active = value; }, project: () => projector.forAssistant({ thread, turn, item: final }) };
}

test('factory requires the shared validator and explicit verified identity/resource providers', () => {
  assert.throws(() => createNativePublicationReferences(), TypeError);
  assert.throws(() => createNativePublicationReferences({ normalizeReceipt: normalizePublicationReceipt, getIdentity: identity }), TypeError);
});

test('malformed contexts fail closed without leaking thrown private content', () => {
  const e = fixture();
  for (const context of [null, undefined, false, 7, [], {}, { thread: null }]) assert.deepEqual(e.projector.forAssistant(context), []);
  const context = { get thread() { throw Error('Private context error'); } };
  assert.deepEqual(e.projector.forAssistant(context), []); assert.equal(e.verified.length, 0);
  assert.equal(JSON.stringify(e.diagnostics).includes('Private'), false);
});

test('exact source DTO uses immutable raw plus logical IDs, preserves text/results, and exports no URI/path/private receipt fields', () => {
  const e = fixture(), data = e.turn.items[1].result.structuredContent;
  data.namespace = 'private-namespace-not-exported'; data.token = 'private-token-not-exported'; data.publication.providerSecret = 'private-extra-not-exported';
  const before = copy(e.thread); deepFreeze(e.thread);
  const refs = e.project(); assert.deepEqual(refs, [expected(data)]);
  assert.deepEqual(Object.keys(refs[0]), ['type', 'name', 'file_id', 'library_file_id', 'mime_type', 'size']);
  assert.deepEqual(e.thread, before); assert.equal(e.verified.length, 1); assert.equal(e.validations.length, 1);
  assert.equal('namespace' in e.verified[0].receipt, false); assert.equal('downloadAvailable' in e.verified[0].receipt, false); assert.equal('providerSecret' in e.verified[0].receipt.publication, false);
  const publicText = JSON.stringify(refs); for (const privateValue of ['blob:', 'private-', '/mnt/', 'operationId', 'sha256', 'sandbox_path', 'download_url']) assert.equal(publicText.includes(privateValue), false);
});

test('structured-clone turn/completed notifications and serialized same-ID snapshots project before any reload', () => {
  const e = fixture();
  // This is the actual LocalAppServer.notify wire shape: params is cloned.
  const event = { method: 'turn/completed', params: copy({ threadId: e.thread.id, turn: e.turn }) };
  assert.notEqual(event.params.turn, e.turn);
  assert.deepEqual(e.projector.forAssistant({ thread: e.thread, turn: event.params.turn, item: event.params.turn.items.at(-1) }), [expected(receipt())]);
  const serialized = JSON.parse(JSON.stringify(e.turn));
  assert.deepEqual(e.projector.forAssistant({ thread: e.thread, turn: serialized, item: copy(serialized.items.at(-1)) }), [expected(receipt())]);
});

test('only the matching last native agentMessage and actual thread turn source are eligible', () => {
  const e = fixture(); assert.deepEqual(e.projector.forAssistant({ thread: e.thread, turn: e.turn, item: e.turn.items[0] }), []);
  assert.deepEqual(e.projector.forAssistant({ thread: e.thread, turn: e.turn, item: e.turn.items[1] }), []);
  for (const change of [turn => { turn.id = 'foreign-turn'; }, turn => { turn.status = 'failed'; }, turn => { turn.items.at(-1).text = 'Stale different reply'; }, turn => { turn.items[1].result.content[1].uri = 'blob:stale-link'; }, turn => { turn.items.push({ type: 'agentMessage', id: 'later', text: 'Later reply' }); }]) {
    const requested = copy(e.turn); change(requested);
    assert.deepEqual(e.projector.forAssistant({ thread: e.thread, turn: requested, item: requested.items.at(-1) }), []);
  }
  assert.equal(e.verified.length, 0);
});

test('completed artifacts remain references on completed, failed and interrupted turns without relabeling the task', () => {
  for (const status of ['completed', 'failed', 'interrupted']) {
    const e = fixture(); e.turn.status = status; e.turn.error = status === 'failed' ? { message: 'Neutral provider failure' } : null;
    const before = copy(e.thread); assert.deepEqual(e.project(), [expected(receipt())]); assert.deepEqual(e.thread, before);
  }
  for (const status of ['inProgress', 'queued', 'unknown', undefined]) { const e = fixture(); e.turn.status = status; assert.deepEqual(e.project(), []); assert.equal(e.verified.length, 0); }
});

test('foreign MCP servers, other tools, incomplete or error tool results never enter the verifier', () => {
  for (const patch of [{ server: 'foreign_plugin' }, { tool: 'read_file' }, { type: 'agentMessage' }, { status: 'inProgress' }, { status: 'failed' }]) {
    const e = fixture(); Object.assign(e.turn.items[1], patch); assert.deepEqual(e.project(), []); assert.equal(e.verified.length, 0);
  }
  for (const isError of [true, undefined, 'false']) { const e = fixture(); e.turn.items[1].result.isError = isError; assert.deepEqual(e.project(), []); assert.equal(e.verified.length, 0); }
  const e = fixture(); e.turn.items[1].result = { isError: false, content: [{ type: 'text', text: JSON.stringify(receipt()) }] }; assert.deepEqual(e.project(), []);
});

test('a committed-but-download-unavailable receipt never becomes a fictional native download', () => {
  for (const patch of [{ downloadAvailable: false }, { downloadAvailable: undefined }, { downloadAvailable: 'true' }, { downloadUnavailable: true }, { committed: false }]) {
    const e = fixture(); Object.assign(e.turn.items[1].result.structuredContent, patch); assert.deepEqual(e.project(), []); assert.equal(e.verified.length, 0);
  }
});

test('the actual strict V3 normalizer rejects bad raw IDs/revision/SHA/publication fields and invalid operation identities', () => {
  for (const patch of [{ rawFileId: logical }, { rawFileId: 'file-local-wrong' }, { revision: 0 }, { sha256: 'wrong' }, { publication: { origin: 'generated', revision: 2, updatedAt: 1800000000000 } }, { operationId: 'not-a-publication-operation' }]) {
    const e = fixture(); Object.assign(e.turn.items[1].result.structuredContent, patch); assert.deepEqual(e.project(), []); assert.equal(e.verified.length, 0);
  }
  const e = fixture(); Object.defineProperty(e.turn.items[1].result.structuredContent, 'operationId', { get() { throw Error('Private getter content'); }, enumerable: true });
  assert.deepEqual(e.project(), []); assert.equal(e.verified.length, 0); assert.equal(JSON.stringify(e.diagnostics).includes('Private'), false);
});

test('resource URI/name/MIME/size must match the checked receipt before ownership is queried', () => {
  for (const patch of [{ type: 'text' }, { uri: '' }, { uri: null }, { name: 'wrong-name.md' }, { mimeType: 'text/plain' }, { size: 72 }, { size: '71' }]) {
    const e = fixture(); Object.assign(e.turn.items[1].result.content[1], patch); assert.deepEqual(e.project(), []); assert.equal(e.verified.length, 0);
  }
  const e = fixture(); e.turn.items[1].result.content[1].uri = 'blob:foreign'; assert.deepEqual(e.project(), []); assert.equal(e.verified.length, 1);
});

test('only strict synchronous ownership true is accepted; verifier failures are generic and do not rewrite results', () => {
  for (const answer of [false, undefined, 1, 'true', Promise.resolve(true)]) { const e = fixture({ ownsPublishedResource: () => answer }); const before = copy(e.thread); assert.deepEqual(e.project(), []); assert.deepEqual(e.thread, before); }
  const e = fixture({ ownsPublishedResource: () => { throw Error('Private filename/provider/credential error'); } }); assert.deepEqual(e.project(), []);
  assert.equal(JSON.stringify(e.diagnostics).includes('Private'), false); assert.ok(e.diagnostics.every(event => Object.keys(event).sort().join(',') === 'code,type'));
});

test('boot identity is mandatory and cannot be replaced by a later login, missing owner or changed account/user/recipient', () => {
  let active = null; const e = fixture({ getIdentity: () => active }); active = identity(); assert.deepEqual(e.project(), []); assert.equal(e.verified.length, 0);
  for (const next of [null, { ...identity(), accountId: 'foreign' }, { ...identity(), userId: 'foreign' }, { ...identity(), accountUserId: 'foreign' }, { accountId: 'neutral-account' }]) { const e = fixture(); e.setIdentity(next); assert.deepEqual(e.project(), []); assert.equal(e.verified.length, 0); }
  const malformed = fixture({ getIdentity: () => { throw Error('Private identity error'); } }); assert.deepEqual(malformed.project(), []);
});

test('owner changes during receipt validation or a verifier callback discard every projected reference', () => {
  let active = identity(), calls = 0;
  const e = fixture({ getIdentity: () => active, normalizeReceipt: (value, op) => { const normalized = normalizePublicationReceipt(value, op); active = { ...active, accountId: 'foreign' }; return normalized; }, ownsPublishedResource: () => { calls++; return true; } });
  assert.deepEqual(e.project(), []); assert.equal(calls, 0);
  active = identity(); let verified = 0;
  const f = fixture({ getIdentity: () => active, ownsPublishedResource: () => { verified++; if (verified === 2) active = null; return true; } });
  const second = receipt({ operationId: 'tool_' + 'c'.repeat(64), rawFileId: secondRaw, revision: 2, publication: { origin: 'generated', revision: 2, updatedAt: 1800000000001 } }); f.turn.items.splice(-1, 0, tool(output(second, 'blob:second'), 'publish-two'));
  assert.deepEqual(f.project(), []); assert.equal(verified, 2);
});

test('deduplication is by immutable raw ID, while superseded revisions of the same logical file remain distinct', () => {
  const e = fixture({ ownsPublishedResource: () => true }); e.turn.items.splice(2, 0, copy(e.turn.items[1]));
  const old = e.turn.items[1].result.structuredContent; old.currentRevision = 2; old.superseded = true;
  const latest = receipt({ operationId: 'tool_' + 'c'.repeat(64), rawFileId: secondRaw, revision: 2, publication: { origin: 'generated', revision: 2, updatedAt: 1800000000001 } });
  e.turn.items.splice(-1, 0, tool(output(latest, 'blob:second'), 'publish-two'));
  assert.deepEqual(e.project(), [expected(old), expected(latest)]); assert.equal(e.validations.length, 3);
});

test('invalid sibling data is skipped without inventing refs or losing an independently verified valid publication', () => {
  const e = fixture(), broken = tool(output(receipt({ operationId: 'tool_' + 'd'.repeat(64), rawFileId: 'invalid' })), 'broken-publication'); e.turn.items.splice(-1, 0, broken);
  assert.deepEqual(e.project(), [expected(receipt())]); assert.equal(e.verified.length, 1);
  const malformed = fixture(); malformed.turn.items[1].result.content = null; assert.deepEqual(malformed.project(), []);
});

test('actual publisher output over real neutral workspace bytes projects with the shared V3 validator without model or network calls', async t => {
  const storage = new Map(), bytes = new TextEncoder().encode('Neutral actual workspace deliverable 中文.'), urls = new Set();
  const host = { read: async key => new Uint8Array(storage.get(key)), write: async (key, value) => storage.set(key, new Uint8Array(value)), list: async () => [] };
  const base = createBrowserToolExecutor({ storage: host });
  const context = { threadId: 'neutral-thread', turnId: 'neutral-turn' };
  await host.write(base.getWorkspacePrefix(context.threadId) + '/deliverable.md', bytes);
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(value => value.toString(16).padStart(2, '0')).join('');
  const publisher = createLibraryPublishingExecutor({ baseExecutor: base, getIdentity: identity,
    publishGeneratedFile: async args => receipt({ operationId: args.requestId, size: bytes.length, sha256: digest }),
    resolvePublishedResource: async value => { const uri = URL.createObjectURL(new Blob([bytes], { type: value.mimeType })); urls.add(uri); return { uri, name: value.fileName, mimeType: value.mimeType, rawFileId: value.rawFileId, revision: value.revision, sha256: value.sha256 }; },
    ownsObjectURL: uri => urls.has(uri),
  });
  t.after(() => { for (const uri of urls) URL.revokeObjectURL(uri); base.dispose(); });
  const result = await publisher.execute({ id: 'neutral-tool-call', function: { name: 'publish_file', arguments: '{"path":"deliverable.md"}' } }, context);
  const e = fixture({ ownsPublishedResource: (uri, value) => urls.has(uri) && value.rawFileId === raw && value.sha256 === digest && value.size === bytes.length }); e.turn.items[1].result = result;
  assert.deepEqual(e.project(), [expected(result.structuredContent)]); assert.equal(result.isError, false); assert.equal(result.structuredContent.downloadAvailable, true);
});
