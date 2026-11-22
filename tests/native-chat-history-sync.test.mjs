import test from 'node:test';
import assert from 'node:assert/strict';
import { createChatHistorySync, projectChatHistoryThread, createIndexedDBChatHistoryStore } from '../src/native-client/chat-history-sync.mjs';
import { syncFixture, save, mutation } from '../chatgpt-services/tests/chat-sync-fixture.mjs';
const copy = value => structuredClone(value);
function memoryStore() {
  const values = new Map(); let chain = Promise.resolve();
  return { values, failNext: false, failWhen: null,
    async load(key) { await chain; return copy(values.get(key)); },
    transact(key, mutate) {
      const next = chain.catch(() => {}).then(() => { const state = copy(values.get(key) ?? { schemaVersion: 1, cursor: null, heads: {}, known: {}, outbox: [], conflicts: {}, localIds: [] }); const result = mutate(state); if (this.failNext || this.failWhen?.(state)) { this.failNext = false; this.failWhen = null; throw Error('Neutral durable-store failure'); } values.set(key, state); return copy(result); }); chain = next.catch(() => {}); return next;
    },
  };
}
function thread(id = 'neutral-history-1', answer = 'Neutral completed reply', model = 'gpt-6.1-sol', effort = 'low') {
  return { id, sessionId: id, name: 'Neutral native history', preview: 'Neutral request', ephemeral: false,
    model, reasoningEffort: effort, modelProvider: 'local-openai-compatible', createdAt: 1000, updatedAt: 1010, recencyAt: 1010, status: { type: 'idle' }, archived: false, cwd: '/mnt/data', path: null,
    collaborationMode: { mode: 'default', settings: { model, reasoning_effort: effort, developer_instructions: null } },
    adapterMetadata: { instructions: [], conversationOrigin: null, classicRootId: id + '-root', frontendModelSlug: 'auto', classicModelSlugs: { [id + '-turn-1']: 'auto' }, selectionMode: 'auto' },
    turns: [{ id: id + '-turn-1', status: 'completed', startedAt: 1000, completedAt: 1010, durationMs: 10000, model, reasoningEffort: effort, clientUserMessageId: id + '-user-1',
      items: [{ type: 'userMessage', id: id + '-item-user-1', content: [{ type: 'text', text: 'Neutral request' }], clientId: id + '-user-1' }, { type: 'reasoning', id: id + '-reason-1', summary: ['Neutral summary'], content: [] }, { type: 'agentMessage', id: id + '-answer-1', text: answer, phase: 'final_answer' }],
      adapterMetadata: { instructions: [], startedAtMs: 1000000, classicUserMessage: { id: id + '-user-1', author: { role: 'user' }, content: { content_type: 'text', parts: ['Neutral request'] }, metadata: {} } }, error: null }],
  };
}
function addTurn(original, text = 'Neutral next turn', model = original.model, effort = original.reasoningEffort) {
  const out = copy(original), n = out.turns.length + 1, next = copy(thread(out.id + '-new-' + n, text, model, effort).turns[0]); out.turns.push(next); out.model = model; out.reasoningEffort = effort; out.updatedAt++; out.recencyAt++; return out;
}
async function fixture(t) { const f = await syncFixture(); t.after(() => f.DB.raw.close()); return f; }
function device(f, actor = f.alice, options = {}) {
  const storage = options.store ?? memoryStore(), calls = [], diagnostics = []; let identity = options.identity ?? { ownerId: actor.user.id, accountId: actor.user.accountId ?? 'local-admin-account', namespace: 'native-history:' + actor.user.id }, token = actor.token;
  const state = { online: true, loseAckOnce: false, afterResponse: null, beforeFetch: null };
  const fetchImpl = async (input, init) => {
    const url = new URL(input), body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ method: init.method, path: url.pathname + url.search, body: copy(body), headers: { ...init.headers }, credentials: init.credentials, redirect: init.redirect });
    if (!state.online) throw Error('Neutral offline');
    await state.beforeFetch?.(url, init);
    const response = await f.call(url.pathname + url.search, { method: init.method, token: init.headers.Authorization.slice(7), body });
    if (state.loseAckOnce && ['PUT', 'DELETE'].includes(init.method) && response.ok) { state.loseAckOnce = false; throw Error('Neutral lost acknowledgement after real SQL commit'); }
    await state.afterResponse?.(url, init, response); return response;
  };
  const create = () => createChatHistorySync({ baseURL: 'https://neutral-sync.test', fetchImpl, getIdentity: () => identity, getSessionToken: () => token, store: storage, onDiagnostic: event => diagnostics.push(event), requestTimeoutMs: 1000 });
  return { sync: create(), create, store: storage, calls, diagnostics, state, setIdentity: value => { identity = value; }, setToken: value => { token = value; }, getIdentity: () => copy(identity) };
}

test('a stalled IndexedDB write transaction aborts without committing its staged outbox state', { timeout: 3000 }, async () => {
  const owner = 'neutral-history-owner';
  const durable = { schemaVersion: 1, cursor: null, heads: {}, known: {}, outbox: [], conflicts: {}, localIds: ['existing-thread'] };
  const read = { result: copy(durable) };
  let staged = null, wrote = false, aborted = false;
  const tx = {
    objectStore(name) {
      assert.equal(name, 'owners');
      return {
        get(key) {
          assert.equal(key, owner);
          queueMicrotask(() => read.onsuccess());
          return read;
        },
        put(state, key) {
          assert.equal(key, owner);
          wrote = true;
          staged = copy(state);
        },
      };
    },
    abort() {
      assert.deepEqual(staged.localIds, ['existing-thread', 'pending-thread']);
      staged = null;
      aborted = true;
      queueMicrotask(() => tx.onabort());
    },
  };
  const connection = {
    transaction(name, mode) {
      assert.equal(name, 'owners');
      assert.equal(mode, 'readwrite');
      return tx;
    },
  };
  const indexedDB = {
    open() {
      const open = { result: connection };
      queueMicrotask(() => open.onsuccess());
      return open;
    },
  };
  const stateStore = createIndexedDBChatHistoryStore({ indexedDB, timeoutMs: 25 });
  await assert.rejects(stateStore.transact(owner, state => state.localIds.push('pending-thread')), { code: 'SYNC_LOCAL_STORAGE_TIMEOUT' });
  assert.equal(wrote, true);
  assert.equal(aborted, true);
  assert.equal(staged, null);
  assert.deepEqual(durable.localIds, ['existing-thread']);
});

test('actual SQLite account history restores exact native text/IDs/model/effort across two fresh devices', async t => {
  const f = await fixture(t), a = device(f), doc = addTurn(thread(), 'Astra followup', 'gpt-6-astra', 'high'); doc.archived = true;
  const initial = await a.sync.initialize([doc]); assert.equal(initial.queuedCount, 0);
  const b = device(f), restored = await b.sync.initialize([]); await b.sync.acknowledgeApplied(restored.threads); assert.deepEqual(restored.threads, [projectChatHistoryThread(doc)]); assert.equal(restored.queuedCount, 0); assert.equal(restored.conflicts.length, 0);
  assert.equal(f.DB.raw.prepare('SELECT COUNT(*) AS n FROM chat_sync_changes').get().n, 1);
  assert.equal(restored.threads[0].turns[1].model, 'gpt-6-astra'); assert.equal(restored.threads[0].turns[1].reasoningEffort, 'high');
  for (const call of a.calls) { assert.equal(call.credentials, 'omit'); assert.equal(call.redirect, 'error'); }
});

test('projection strips credentials/checkpoints/file bytes/host jobs and marks resources unavailable without mutating the local source', () => {
  const doc = thread(); doc.status = { type: 'active' }; const turn = doc.turns[0]; turn.status = 'inProgress';
  doc.adapterMetadata.apiKey = 'SECRET-API-KEY'; doc.adapterMetadata.clientMetadata = { authorization: 'SECRET-HEADER', localProductSurface: 'codex' };
  turn.adapterMetadata.checkpoint = { transcript: [{ content: 'PRIVATE-FILE-CONTEXT' }], pendingCalls: [{ secret: 'PRIVATE-CALL' }], hostRequest: { token: 'SECRET-TOKEN' } }; turn.adapterMetadata.apiTranscript = [{ content: 'PRIVATE-TRANSCRIPT' }];
  turn.items[0].content.push({ type: 'image', url: 'data:image/png;base64,PRIVATE-IMAGE-BYTES' });
  turn.adapterMetadata.classicUserMessage.metadata.attachments = [{ id: 'file_local_neutral', name: 'neutral.png', mime_type: 'image/png', size: 22, upload_url: 'SECRET-UPLOAD', ticket: 'SECRET-TICKET' }];
  turn.items.push({ id: 'tool-one', type: 'mcpToolCall', server: 'browser_workspace', tool: 'publish_file', status: 'inProgress', arguments: { bytes: 'PRIVATE-BYTES' }, result: { structuredContent: { committed: true, fileId: 'logical', rawFileId: 'raw', revision: 1, sha256: 'a'.repeat(64), fileName: 'out.txt', mimeType: 'text/plain', size: 5, operationId: 'operation-1', namespace: 'SECRET-NAMESPACE', publication: { origin: 'generated', revision: 1, updatedAt: 42 } }, content: [{ type: 'resource_link', uri: 'blob:original-device', name: 'out.txt', mimeType: 'text/plain' }] }, error: null });
  const before = copy(doc), projected = projectChatHistoryThread(doc), json = JSON.stringify(projected);
  for (const secret of ['SECRET-', 'PRIVATE-', 'blob:', 'data:image', 'hostRequest', '"checkpoint":', 'namespace']) assert.equal(json.includes(secret), false, secret);
  assert.deepEqual(doc, before); assert.equal(projected.turns[0].status, 'interrupted'); assert.equal(projected.turns[0].adapterMetadata.resumePolicy, 'manual'); assert.equal(projected.turns[0].adapterMetadata.resumable, false);
  const item = projected.turns[0].items.at(-1); assert.equal(item.status, 'failed'); assert.equal(item.result.structuredContent.committed, true); assert.equal(item.result.structuredContent.downloadAvailable, false); assert.equal(item.result.structuredContent.downloadUnavailable, 'original-browser-only');
  assert.equal(projected.turns[0].adapterMetadata.classicUserMessage.metadata.attachments[0].adapter_attachment_availability, undefined);
  assert.equal(projected.turns[0].adapterMetadata.classicUserMessage.metadata.adapter_attachment_availability, 'original-browser-only');
  assert.deepEqual(projectChatHistoryThread(projected), projected);
});

test('same-device local private checkpoint is retained while remote device can never auto-resume a paid task', async t => {
  const f = await fixture(t), a = device(f), doc = thread(); doc.turns[0].status = 'inProgress'; doc.turns[0].adapterMetadata.checkpoint = { pendingCalls: [], transcript: [{ role: 'user', content: 'private local' }] }; doc.turns[0].adapterMetadata.resumable = true; doc.turns[0].adapterMetadata.resumePolicy = 'automatic';
  const local = await a.sync.initialize([doc]); assert.deepEqual(local.threads[0], doc);
  const remote = await device(f).sync.initialize([]); const turn = remote.threads[0].turns[0]; assert.equal(turn.status, 'interrupted'); assert.equal(turn.adapterMetadata.checkpoint, undefined); assert.equal(turn.adapterMetadata.resumePolicy, 'manual'); assert.equal(turn.adapterMetadata.resumable, false);
});

test('offline outbox persists before network, reload retries once and restores all local output', async t => {
  const f = await fixture(t), a = device(f), doc = thread(); a.state.online = false;
  const result = await a.sync.initialize([doc]); assert.equal(result.deferred.retryable, true); assert.equal(result.queuedCount, 1);
  assert.equal(f.DB.raw.prepare('SELECT COUNT(*) AS n FROM chat_sync_changes').get().n, 0);
  const before = JSON.stringify([...a.store.values.values()]); assert.equal(before.includes(f.alice.token), false);
  a.state.online = true; const reloaded = a.create(); await reloaded.flush(); const restored = await device(f).sync.initialize([]); assert.equal(restored.threads[0].turns[0].items.at(-1).text, 'Neutral completed reply'); assert.equal(f.DB.raw.prepare('SELECT COUNT(*) AS n FROM chat_sync_changes').get().n, 1);
});

test('lost SQL acknowledgement replays identical durable mutation ID and body after restart', async t => {
  const f = await fixture(t), a = device(f), doc = thread(); a.state.loseAckOnce = true;
  const first = await a.sync.initialize([doc]); assert.equal(first.queuedCount, 1); assert.equal(first.deferred.retryable, true);
  const firstPut = a.calls.find(call => call.method === 'PUT'); const again = a.create(); await again.flush(); const puts = a.calls.filter(call => call.method === 'PUT');
  assert.equal(puts.length, 2); assert.deepEqual(puts[1].body, firstPut.body); assert.equal(f.DB.raw.prepare('SELECT COUNT(*) AS n FROM chat_sync_changes').get().n, 1); assert.equal((await again.snapshot()).queuedCount, 0);
});

test('new next-turn queued behind a lost acknowledgement is not overwritten by the old cloud snapshot', async t => {
  const f = await fixture(t), a = device(f), first = thread(); a.state.loseAckOnce = true; await a.sync.initialize([first]);
  const second = addTurn(first, 'second turn after unknown acknowledgement', 'gpt-6-astra', 'max'); await a.sync.capture([second]);
  const result = await a.sync.synchronize([second]); assert.equal(result.queuedCount, 0); assert.equal(result.conflicts.length, 0); assert.equal(f.DB.raw.prepare('SELECT COUNT(*) AS n FROM chat_sync_changes').get().n, 2);
  const remote = await device(f).sync.initialize([]); assert.equal(remote.threads[0].turns.length, 2); assert.equal(remote.threads[0].turns[1].model, 'gpt-6-astra'); assert.equal(remote.threads[0].turns[1].reasoningEffort, 'max');
});

test('a later local capture uses the exact Worker revision recovered from a lost acknowledgement', async t => {
  const f = await fixture(t), a = device(f);
  const first = thread('capture-after-lost-acknowledgement');
  await a.sync.initialize([first]);
  const second = addTurn(first, 'Confirmed by the Worker before the reply was lost.');
  await a.sync.capture([second]);
  a.state.loseAckOnce = true;
  await assert.rejects(a.sync.flush(), { code: 'SYNC_NETWORK_UNAVAILABLE' });
  assert.equal([...a.store.values.values()][0].outbox[0].attempted, true);

  await a.sync.pull();
  assert.equal((await a.sync.snapshot()).queuedCount, 0);
  const third = addTurn(second, 'Captured after reading the missing acknowledgement.');
  await a.sync.capture([third]);
  assert.equal([...a.store.values.values()][0].outbox[0].baseRevision, 2);
  await a.sync.flush();

  const other = device(f);
  assert.deepEqual((await other.sync.initialize([])).threads, [projectChatHistoryThread(third)]);
  assert.deepEqual(a.calls.filter(call => call.method === 'PUT').map(call => call.body.baseRevision), [0, 1, 2]);
});

test('two concurrent device edits preserve both real documents and never retry a stale CAS as success', async t => {
  const f = await fixture(t), a = device(f), original = thread(); await a.sync.initialize([original]); const b = device(f); await b.sync.acknowledgeApplied((await b.sync.initialize([])).threads);
  const aEdit = addTurn(original, 'device A update'), bEdit = addTurn(original, 'device B conflicting update'); await a.sync.synchronize([aEdit]);
  const result = await b.sync.synchronize([bEdit]); assert.equal(result.conflicts.length, 1); assert.deepEqual(result.conflicts[0].local, projectChatHistoryThread(bEdit)); assert.deepEqual(result.conflicts[0].remote, projectChatHistoryThread(aEdit)); assert.equal(result.queuedCount, 0); assert.deepEqual(result.threads, [bEdit]);
  assert.equal(f.DB.raw.prepare('SELECT revision FROM chat_sync_conversations').get().revision, 2);
  await b.sync.resolveConflict(original.id, 'local'); await b.sync.flush(); assert.equal(f.DB.raw.prepare('SELECT revision FROM chat_sync_conversations').get().revision, 3);
  const restored = await device(f).sync.initialize([]); assert.equal(restored.threads[0].turns[1].items.at(-1).text, 'device B conflicting update');
});

test('cloud tombstone wins over stale/offline write while the unsent local conflict copy remains durable', async t => {
  const f = await fixture(t), a = device(f), original = thread(); await a.sync.initialize([original]); const b = device(f); await b.sync.acknowledgeApplied((await b.sync.initialize([])).threads);
  await a.sync.synchronize([]); const bEdit = addTurn(original, 'offline edit before learning deletion'); const result = await b.sync.synchronize([bEdit]);
  assert.equal(result.threads.length, 0); assert.equal(result.conflicts[0].reason, 'remote-deleted'); assert.equal(result.conflicts[0].local.turns.length, 2); assert.equal(result.queuedCount, 0);
  await assert.rejects(b.sync.resolveConflict(original.id, 'local'), { code: 'SYNC_CONVERSATION_DELETED' });
  const newDevice = await device(f).sync.initialize([original]); assert.equal(newDevice.threads.length, 0); assert.equal(newDevice.conflicts[0].reason, 'remote-deleted');
  assert.equal(f.DB.raw.prepare('SELECT deleted FROM chat_sync_conversations').get().deleted, 1);
});

test('offline deletion before first upload becomes a real server tombstone and cannot be resurrected by migration', async t => {
  const f = await fixture(t), a = device(f), original = thread(); a.state.online = false; await a.sync.initialize([original]); await a.sync.capture([]);
  a.state.online = true; await a.sync.flush(); const row = f.DB.raw.prepare('SELECT revision,deleted,document_json FROM chat_sync_conversations').get(); assert.equal(row.deleted, 1); assert.equal(row.document_json, null); assert.equal(row.revision, 1);
  const newDevice = await device(f).sync.initialize([original]); assert.equal(newDevice.threads.length, 0);
});

test('Free and administrator isolation, boot-identity replacement, revoked token, and guest all fail closed', async t => {
  const f = await fixture(t), a = device(f), original = thread(); await a.sync.initialize([original]);
  assert.deepEqual((await device(f, f.bob).sync.initialize([])).threads, []); assert.deepEqual((await device(f, f.admin).sync.initialize([])).threads, []);
  const scope = a.getIdentity(); a.setIdentity({ ...scope, ownerId: f.bob.user.id }); await assert.rejects(a.sync.pull(), { code: 'SYNC_ACCOUNT_CHANGED' }); assert.equal(a.calls.filter(call => call.method === 'PUT').length, 1);
  const guest = device(f, f.alice, { identity: null }); guest.setIdentity(null); await assert.rejects(guest.sync.initialize([]), { code: 'SYNC_ACCOUNT_CHANGED' }); assert.equal(guest.calls.length, 0);
  const revoked = device(f); await f.call('/auth/logout', { method: 'POST', token: f.alice.token, body: {} }); await assert.rejects(revoked.sync.initialize([]), { status: 401 });
});

test('account change during a committed response never installs the old owner data into the new session', async t => {
  const f = await fixture(t), a = device(f), original = thread(); const old = a.getIdentity();
  a.state.afterResponse = async (url, init) => { if (init.method === 'PUT') a.setIdentity({ ...old, ownerId: f.bob.user.id }); };
  await assert.rejects(a.sync.initialize([original]), { code: 'SYNC_ACCOUNT_CHANGED' });
  assert.equal(f.DB.raw.prepare('SELECT COUNT(*) AS n FROM chat_sync_conversations').get().n, 1);
  a.state.afterResponse = null; a.setIdentity(old); await a.create().flush(); assert.equal(f.DB.raw.prepare('SELECT COUNT(*) AS n FROM chat_sync_changes').get().n, 1);
});

test('durable outbox commit failure sends no request; failed ACK save retries exact original request without loss', async t => {
  const f = await fixture(t), a = device(f); a.store.failNext = true;
  await assert.rejects(a.sync.capture([thread()]), /Neutral durable-store failure/); assert.equal(a.calls.length, 0); assert.equal(a.store.values.size, 0);
  await a.sync.capture([thread()]); a.state.afterResponse = async (url, init, response) => { if (init.method === 'PUT' && response.ok) { a.store.failNext = true; a.state.afterResponse = null; } };
  await assert.rejects(a.sync.flush(), /Neutral durable-store failure/); const first = a.calls.find(call => call.method === 'PUT'); await a.create().flush(); assert.deepEqual(a.calls.filter(call => call.method === 'PUT')[1].body, first.body); assert.equal(f.DB.raw.prepare('SELECT COUNT(*) AS n FROM chat_sync_changes').get().n, 1);
});

test('malformed/oversize/duplicate local histories reject atomically and ephemeral records are never uploaded', async t => {
  const f = await fixture(t), a = device(f), doc = thread(), huge = thread('huge'); huge.turns[0].items.at(-1).text = '中'.repeat(400000);
  await assert.rejects(a.sync.capture([doc, huge]), { code: 'SYNC_DOCUMENT_TOO_LARGE' }); assert.equal(a.store.values.size, 0); assert.equal(a.calls.length, 0);
  await assert.rejects(a.sync.capture([doc, doc]), { code: 'SYNC_INVALID_DOCUMENT' });
  const ephemeral = thread('temporary'); ephemeral.ephemeral = true; await a.sync.initialize([ephemeral]); assert.equal(a.calls.filter(call => call.method === 'PUT').length, 0);
  const bad = thread('bad'); bad.turns[0].items.push({ id: 'unknown', type: 'unimplementedExecutable' }); await assert.rejects(a.sync.capture([bad]), { code: 'SYNC_UNSUPPORTED_ITEM' });
});

test('original hidden system records and order persist but cannot grant tools/model/account permissions', async t => {
  const f = await fixture(t), a = device(f), doc = thread(); const system = { id: 'original-hidden-system', author: { role: 'system' }, content: { content_type: 'text', parts: ['Neutral original hidden context'] }, metadata: { is_visually_hidden_from_conversation: true } };
  doc.turns[0].adapterMetadata.classicInputMessages = [system, doc.turns[0].adapterMetadata.classicUserMessage]; doc.turns[0].adapterMetadata.executionPolicy = 'grant-pro'; doc.adapterMetadata.clientMetadata = { token: 'SECRET', role: 'administrator' };
  await a.sync.initialize([doc]); const remote = (await device(f).sync.initialize([])).threads[0]; assert.deepEqual(remote.turns[0].adapterMetadata.classicInputMessages.map(row => row.id), ['original-hidden-system', doc.id + '-user-1']); assert.equal(remote.turns[0].adapterMetadata.classicInputMessages[0].metadata.is_visually_hidden_from_conversation, true); assert.equal(remote.turns[0].adapterMetadata.apiTranscript[0].role, 'system'); assert.equal(remote.turns[0].adapterMetadata.apiTranscript[0].content, 'Neutral original hidden context'); assert.equal(remote.turns[0].adapterMetadata.executionPolicy, undefined); assert.equal(JSON.stringify(remote).includes('SECRET'), false);
});

test('two tabs sharing one atomic store cannot lose one another\'s newly queued conversations', async t => {
  const f = await fixture(t), store = memoryStore(), a = device(f, f.alice, { store }), b = device(f, f.alice, { store });
  await Promise.all([a.sync.capture([thread('tab-a')], { detectDeletes: false }), b.sync.capture([thread('tab-b')], { detectDeletes: false })]);
  await Promise.all([a.sync.flush(), b.sync.flush()]); const restored = await device(f).sync.initialize([]); assert.deepEqual(restored.threads.map(row => row.id).sort(), ['tab-a', 'tab-b']); assert.equal(f.DB.raw.prepare('SELECT COUNT(*) AS n FROM chat_sync_changes').get().n, 2);
});

test('first list watermark survives real multi-page listing and interleaved create/update/delete', async t => {
  const f = await fixture(t); for (let i=0;i<101;i++) { const id='row-'+String(i).padStart(3,'0'); await save(f,f.alice,id,mutation(projectChatHistoryThread(thread(id)))); }
  const a = device(f); let changed = false;
  a.state.afterResponse = async (url, init, response) => { if (url.pathname === '/sync/conversations' && !changed) { changed=true; await save(f,f.alice,'aaa-late',mutation(projectChatHistoryThread(thread('aaa-late')))); await save(f,f.alice,'row-050',mutation(projectChatHistoryThread(thread('row-050','Changed during pagination')),1)); await f.call('/sync/conversations/row-100',{method:'DELETE',token:f.alice.token,body:{baseRevision:1,mutationId:'pagination-delete-100'}}); } };
  const restored = await a.sync.initialize([]); assert.equal(restored.threads.length,101); assert.equal(restored.threads.some(row=>row.id==='aaa-late'),true); assert.equal(restored.threads.some(row=>row.id==='row-100'),false); assert.equal(restored.threads.find(row=>row.id==='row-050').turns[0].items.at(-1).text,'Changed during pagination'); assert.equal(restored.cursor,104); assert.equal(a.calls.filter(call=>call.path.startsWith('/sync/changes?after=101')).length,1); assert.equal(a.calls.filter(call=>call.path.startsWith('/sync/conversations?')).length,2);
});

test('a permanently invalid server response never advances the durable change cursor or invents an empty history', async t => {
  const f = await fixture(t), a = device(f); await a.sync.initialize([thread()]); const oldCursor = (await a.sync.snapshot()).cursor;
  await save(f, f.alice, 'malformed-remote', mutation({ id: 'malformed-remote', turns: 'not-a-native-thread' })); await assert.rejects(a.sync.pull(), { code: 'SYNC_INVALID_DOCUMENT' }); assert.equal((await a.sync.snapshot()).cursor, oldCursor); assert.equal((await a.sync.snapshot()).threads.length, 1);
});

test('missing IndexedDB fails explicitly rather than silently claiming a durable outbox', () => {
  assert.throws(() => createIndexedDBChatHistoryStore({ indexedDB: null }), { code: 'SYNC_LOCAL_STORAGE_UNAVAILABLE' });
});

test('a stale second tab cannot delete a newly synced thread or overwrite a newer turn while its own source is unchanged', async t => {
  const f = await fixture(t), store = memoryStore(), a = device(f, f.alice, { store }), original = thread(); await a.sync.initialize([original]); const b = device(f, f.alice, { store }); await b.sync.acknowledgeApplied((await b.sync.initialize([])).threads);
  const updated = addTurn(original, 'A newer completed turn'), extra = thread('other-tab-new-thread'); await a.sync.synchronize([updated, extra]);
  const before = f.DB.raw.prepare('SELECT COUNT(*) AS n FROM chat_sync_changes').get().n;
  await b.sync.capture([original]); await b.sync.flush(); assert.equal(f.DB.raw.prepare('SELECT COUNT(*) AS n FROM chat_sync_changes').get().n, before);
  const restored = await b.sync.synchronize([original]); assert.equal(restored.threads.length, 2); assert.equal(restored.threads.find(row => row.id === original.id).turns.length, 2); assert.equal(restored.conflicts.length, 0);
});

test('an actual stale-tab edit branches durably instead of borrowing another tab\'s latest CAS revision', async t => {
  const f = await fixture(t), store = memoryStore(), a = device(f, f.alice, { store }), original = thread(); await a.sync.initialize([original]); const b = device(f, f.alice, { store }); await b.sync.acknowledgeApplied((await b.sync.initialize([])).threads);
  await a.sync.synchronize([addTurn(original, 'A newest branch')]);
  const edited = addTurn(original, 'B stale-context branch'); await b.sync.capture([edited]); const state = await b.sync.snapshot([edited]);
  assert.equal(state.conflicts[0].reason, 'concurrent-local-context'); assert.equal(state.conflicts[0].local.turns[1].items.at(-1).text, 'B stale-context branch'); assert.equal(state.conflicts[0].remote.turns[1].items.at(-1).text, 'A newest branch');
  await b.sync.flush(); assert.equal(f.DB.raw.prepare('SELECT revision FROM chat_sync_conversations').get().revision, 2);
});

test('a verified reattaching turn advances an unsent browser history capture without branching', async t => {
  const f = await fixture(t), a = device(f);
  const previous = thread('restored-browser-capture', 'Saved public prefix.');
  const first = previous.turns[0];
  first.status = 'inProgress';
  first.completedAt = first.durationMs = null;
  first.items[1] = { ...first.items[1], status: 'inProgress', startedAtMs: 1001000, completedAtMs: null, durationMs: null };
  first.adapterMetadata.reasoningLifecycle = {
    status: 'inProgress', startedAtMs: 1001000, workStartedAtMs: 1000000, attemptDurationMs: 0,
  };

  a.state.online = false;
  await a.sync.initialize([previous]);
  const queued = copy([...a.store.values.values()][0].outbox[0]);
  assert.equal(queued.attempted, false);
  assert.equal(queued.baseRevision, 0);

  const restored = copy(previous), resumed = restored.turns[0];
  restored.updatedAt = restored.recencyAt = 1011;
  resumed.adapterMetadata.resumePolicy = 'automatic';
  resumed.adapterMetadata.resumable = true;
  resumed.adapterMetadata.checkpoint = {
    inFlight: { transport: { route: 'site-inference', siteRequestId: '90000000-0000-4000-8000-000000000001', ownerId: a.getIdentity().ownerId } },
  };
  resumed.adapterMetadata.reasoningLifecycle.attemptDurationMs = 1200;
  resumed.items[2].text += ' The existing request continued.';
  a.state.online = true;
  const newProcess = a.create();
  const initialized = await newProcess.initialize([restored]);
  assert.equal(initialized.conflicts.length, 0);
  assert.equal(initialized.queuedCount, 0);
  const writes = a.calls.filter(call => call.method === 'PUT');
  assert.equal(writes.length, 2);
  assert.deepEqual(writes[0].body, { baseRevision: 0, mutationId: queued.mutationId, document: queued.document });
  assert.equal(writes[1].body.baseRevision, 1);

  const other = device(f);
  const recovered = await other.sync.initialize([]);
  assert.deepEqual(recovered.threads, [projectChatHistoryThread(restored)]);
});

test('a completed browser reattachment recovers the first upload while a changed prompt stays conflicted', async t => {
  const f = await fixture(t), a = device(f);
  const make = (id, changed) => {
    const previous = thread(id, 'Unchanged visible beginning.');
    const pending = previous.turns[0];
    pending.status = 'inProgress';
    pending.completedAt = pending.durationMs = null;
    pending.items[1] = { ...pending.items[1], status: 'inProgress', startedAtMs: 1000000, durationMs: null };
    pending.adapterMetadata.reasoningLifecycle = { status: 'inProgress', startedAtMs: 1000000, workStartedAtMs: 1000000, attemptDurationMs: 0 };
    pending.items.pop();
    const completed = thread(id, 'The actual confirmed answer.');
    completed.updatedAt = completed.recencyAt = 1012;
    const turn = completed.turns[0];
    turn.items[1] = { ...turn.items[1], status: 'completed', startedAtMs: 1000050, completedAtMs: 1012000, durationMs: 11950 };
    turn.adapterMetadata.interruption = 'page-reload-checkpoint-saved';
    turn.adapterMetadata.resumePolicy = 'automatic';
    turn.adapterMetadata.checkpoint = { state: 'completed' };
    turn.adapterMetadata.reasoningLifecycle = { status: 'completed', startedAtMs: 1000000, workStartedAtMs: 1000000, completedAtMs: 1012000, attemptDurationMs: 11950, workDurationMs: 12000 };
    if (changed) turn.items[0].content[0].text = 'A different prompt in a competing branch.';
    return { previous, completed };
  };
  const recovered = make('initial-local-recovery', false), divergent = make('initial-local-divergence', true);
  a.state.online = false;
  await a.sync.initialize([recovered.previous, divergent.previous]);
  const key = [...a.store.values.keys()][0];
  await a.store.transact(key, state => {
    for (const { previous, completed } of [recovered, divergent]) {
      const id = previous.id;
      state.conflicts[id] = { id, reason: 'startup-local-diverged', local: projectChatHistoryThread(completed),
        remote: copy(state.heads[id]), remoteMetadata: { id, revision: 0, sequence: 0, deleted: false } };
      state.heads[id] = projectChatHistoryThread(completed);
    }
    state.outbox = [];
  });

  a.state.online = true;
  const before = await a.create().initialize([recovered.completed, divergent.completed]);
  assert.deepEqual(before.conflicts.map(conflict => conflict.id), [divergent.completed.id]);
  const writes = a.calls.filter(call => call.method === 'PUT');
  assert.equal(writes.length, 1);
  assert.equal(writes[0].body.baseRevision, 0);
  const anotherDevice = device(f);
  assert.deepEqual((await anotherDevice.sync.initialize([])).threads, [projectChatHistoryThread(recovered.completed)]);
});

test('closing after a resumed reply retains queued uploads and reconciles a lost acknowledgement', async t => {
  for (const lostAcknowledgement of [false, true]) {
    await t.test(lostAcknowledgement ? 'actual Worker write with a lost response' : 'unattempted local upload', async t => {
      const f = await fixture(t), a = device(f);
      const pending = thread('acknowledged-browser-reattachment', 'Recorded partial reply.');
      const early = pending.turns[0];
      early.status = 'inProgress';
      early.completedAt = early.durationMs = null;
      early.items[1] = { ...early.items[1], status: 'inProgress', startedAtMs: 1000000 };
      early.adapterMetadata.reasoningLifecycle = { status: 'inProgress', startedAtMs: 1000000, workStartedAtMs: 1000000, attemptDurationMs: 0 };
      early.items.pop();
      await a.sync.initialize([pending]);
      const ahead = copy(pending);
      ahead.updatedAt = ahead.recencyAt = 1011;
      ahead.turns[0].items.push({ type: 'agentMessage', id: pending.id + '-answer-1', text: 'Recorded partial reply.', phase: 'final_answer' });
      await a.sync.capture([ahead]);
      const previous = copy([...a.store.values.values()][0].outbox[0]);
      assert.equal(previous.baseRevision, 1);
      assert.equal(previous.attempted, false);
      if (lostAcknowledgement) {
        a.state.loseAckOnce = true;
        await assert.rejects(a.sync.flush(), { code: 'SYNC_NETWORK_UNAVAILABLE' });
        const attempted = [...a.store.values.values()][0].outbox[0];
        assert.equal(attempted.attempted, true);
        assert.equal(attempted.mutationId, previous.mutationId);
        assert.deepEqual(attempted.document, previous.document);
      }

      const completed = copy(ahead), turn = completed.turns[0];
      completed.updatedAt = completed.recencyAt = 1012;
      turn.status = 'completed';
      turn.completedAt = 1012;
      turn.durationMs = 12000;
      turn.items[1] = { ...turn.items[1], status: 'completed', startedAtMs: 1000050, completedAtMs: 1012000, durationMs: 11950 };
      turn.items[2].text = 'Recorded partial reply. The confirmed answer followed.';
      turn.adapterMetadata.interruption = 'page-reload-checkpoint-saved';
      turn.adapterMetadata.resumePolicy = 'automatic';
      turn.adapterMetadata.checkpoint = { state: 'completed' };
      turn.adapterMetadata.reasoningLifecycle = { ...turn.adapterMetadata.reasoningLifecycle,
        status: 'completed', completedAtMs: 1012000, attemptDurationMs: 11950, workDurationMs: 12000 };
      const reopened = a.create();
      const initialized = await reopened.initialize([completed]);
      assert.deepEqual(initialized.conflicts, []);
      assert.equal(initialized.queuedCount, 0);
      const writes = a.calls.filter(call => call.method === 'PUT');
      assert.deepEqual(writes.map(call => call.body.baseRevision), [0, 1, 2]);
      assert.deepEqual(writes[1].body, { baseRevision: 1, mutationId: previous.mutationId, document: previous.document });
      assert.deepEqual((await device(f).sync.initialize([])).threads, [projectChatHistoryThread(completed)]);
    });
  }
});

test('startup with divergent older native storage preserves both branches and requires an explicit decision', async t => {
  const f = await fixture(t), a = device(f), original = thread(); await a.sync.initialize([original]); await a.sync.synchronize([addTurn(original, 'Previously synced newer branch')]);
  const reloaded = await a.create().initialize([original]); assert.equal(reloaded.conflicts.length, 1); assert.equal(reloaded.conflicts[0].local.turns.length, 1); assert.equal(reloaded.conflicts[0].remote.turns.length, 2); assert.equal(reloaded.queuedCount, 0); assert.equal(f.DB.raw.prepare('SELECT revision FROM chat_sync_conversations').get().revision, 2);
});

test('dispose cancels the actual pending fetch and cannot accept a callback after logout', async t => {
  const f = await fixture(t), a = device(f); await a.sync.capture([thread()]); let entered; const started = new Promise(resolve => { entered = resolve; });
  a.state.beforeFetch = async (url, init) => { entered(); await new Promise((resolve, reject) => { init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true }); }); };
  const pending = a.sync.flush(); await started; a.sync.dispose(); await assert.rejects(pending, { code: 'SYNC_ACCOUNT_CHANGED' }); assert.equal(f.DB.raw.prepare('SELECT COUNT(*) AS n FROM chat_sync_changes').get().n, 0); assert.equal([...a.store.values.values()][0].outbox.length, 1);
});

test('actual native LocalAppServer reads sanitized hidden context on a following turn without a resumable remote execution', async t => {
  const { pathToFileURL } = await import('node:url'), path = await import('node:path'); const { LocalAppServer } = await import(pathToFileURL(path.resolve('src/native-client/local-app-server.mjs')).href);
  const original = thread(); original.turns[0].status = 'inProgress'; original.turns[0].adapterMetadata.checkpoint = { transcript: [{ role: 'system', content: 'PRIVATE-PROVIDER-CONTEXT' }] };
  original.turns[0].adapterMetadata.classicInputMessages = [{ id: 'native-hidden-context', author: { role: 'system' }, content: { content_type: 'text', parts: ['Original neutral hidden creation context'] }, metadata: { is_visually_hidden_from_conversation: true } }, original.turns[0].adapterMetadata.classicUserMessage];
  const projected = projectChatHistoryThread(original), storage = new Map([['cg-original-app-server:v1', JSON.stringify({ schemaVersion: 1, threads: [projected] })]]); let calls = 0;
  const server = new LocalAppServer({ storage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) }, streamCompletion: async () => { calls++; }, readSettings: () => ({}), models: {}, catalog: {}, getExecutionPolicy: () => ({ modelSelection: true }) });
  const restored = server.getThread(original.id); const messages = server.messages(restored, { id: 'future-turn', adapterMetadata: { instructions: [] } }, { omitCurrent: true });
  assert.equal(messages[0].role, 'system'); assert.equal(messages[0].content, 'Original neutral hidden creation context'); assert.equal(messages[1].role, 'user'); assert.equal(messages.at(-1).content, 'Neutral completed reply');
  assert.equal(restored.turns[0].adapterMetadata.checkpoint, undefined); assert.throws(() => server.resumeTurn({ threadId: original.id }), error => /checkpoint/.test(error.message)); assert.equal(calls, 0);
});

test('valid dictionary-like conversation IDs cannot collide with inherited object properties', async t => { const f=await fixture(t),a=device(f);const input=[thread('constructor'),thread('toString')];await a.sync.initialize(input);const remote=await device(f).sync.initialize([]);assert.deepEqual(remote.threads.map(row=>row.id).sort(),['constructor','toString']);});

test('returned cloud snapshot is never treated as locally applied when native storage quota prevents commit', async t => {
 const f=await fixture(t),uploader=device(f);await uploader.sync.initialize([thread('cloud-a'),thread('cloud-b')]);const receiver=device(f);const result=await receiver.sync.initialize([]);assert.equal(result.threads.length,2);
 receiver.store.failNext=true;await assert.rejects(receiver.sync.acknowledgeApplied(result.threads),/Neutral durable-store failure/);await receiver.sync.capture([]);await receiver.sync.flush();assert.equal(f.DB.raw.prepare('SELECT COUNT(*) AS n FROM chat_sync_conversations WHERE deleted=0').get().n,2);assert.equal(receiver.calls.filter(call=>call.method==='DELETE').length,0);receiver.sync.dispose();
 const remount=device(f);const restored=await remount.sync.initialize([]);await remount.sync.acknowledgeApplied(restored.threads);await remount.sync.capture([]);await remount.sync.flush();assert.equal(f.DB.raw.prepare('SELECT COUNT(*) AS n FROM chat_sync_conversations WHERE deleted=1').get().n,2);
});

test('v2 stale-tab DELETE never borrows shared latest revision and preserves the unseen newer remote document', async t => {
 const f=await fixture(t),store=memoryStore(),a=device(f,f.alice,{store}),original=thread();await a.sync.initialize([original]);const b=device(f,f.alice,{store});const first=await b.sync.initialize([]);await b.sync.acknowledgeApplied(first.threads);
 const updated=addTurn(original,'New content stale tab never saw');await a.sync.synchronize([updated]);await b.sync.capture([]);await b.sync.flush();
 const result=await b.sync.snapshot();assert.equal(result.conflicts.length,1);assert.equal(result.conflicts[0].reason,'concurrent-local-delete');assert.equal(result.conflicts[0].local,null);assert.equal(result.conflicts[0].remote.turns.length,2);assert.equal(b.calls.filter(call=>call.method==='DELETE').length,0);assert.equal(f.DB.raw.prepare('SELECT revision,deleted FROM chat_sync_conversations').get().revision,2);assert.equal(f.DB.raw.prepare('SELECT deleted FROM chat_sync_conversations').get().deleted,0);
});

test('v2 explicit local deletion conflict queues DELETE, survives pull, retains branch until actual acknowledgement', async t => {
 const f=await fixture(t),a=device(f),original=thread();await a.sync.initialize([original]);const b=device(f);const remote=await b.sync.initialize([]);await b.sync.acknowledgeApplied(remote.threads);await b.sync.synchronize([addTurn(original,'Remote update conflicts with local deletion')]);
 await a.sync.capture([]);await a.sync.pull();const before=await a.sync.conflicts();assert.equal(before[0].local,null);const choice=await a.sync.resolveConflict(original.id,'local');assert.equal(choice.pending,true);assert.equal((await a.sync.conflicts()).length,1);await a.sync.pull();assert.equal((await a.sync.conflicts())[0].resolution.mutationId,choice.mutationId);
 await a.sync.flush();const deleted=a.calls.filter(call=>call.method==='DELETE');assert.equal(deleted.length,1);assert.equal(deleted[0].body.baseRevision,2);assert.equal(a.calls.some(call=>call.method==='PUT'&&call.body.document===null),false);assert.equal((await a.sync.snapshot()).threads.length,0);assert.equal((await a.sync.conflicts()).length,0);assert.equal(f.DB.raw.prepare('SELECT deleted FROM chat_sync_conversations').get().deleted,1);
});

test('v2 delete resolution racing another real update becomes a new intact conflict instead of deleting or corrupting it', async t => {
 const f=await fixture(t),a=device(f),original=thread();await a.sync.initialize([original]);await a.sync.capture([]);await save(f,f.alice,original.id,mutation(projectChatHistoryThread(addTurn(original,'Cloud second turn')),1));await a.sync.pull();await a.sync.resolveConflict(original.id,'local');
 await save(f,f.alice,original.id,mutation(projectChatHistoryThread(addTurn(addTurn(original,'Cloud second turn'),'Cloud third turn')),2));await a.sync.flush();const result=await a.sync.snapshot();assert.equal(result.conflicts.length,1);assert.equal(result.conflicts[0].local,null);assert.equal(result.conflicts[0].remote.turns.length,3);assert.equal(result.conflicts[0].resolution,undefined);assert.equal(result.threads.length,0);assert.equal(a.calls.filter(call=>call.method==='DELETE').at(-1).body.baseRevision,2);assert.equal(f.DB.raw.prepare('SELECT revision,deleted FROM chat_sync_conversations').get().revision,3);assert.equal(f.DB.raw.prepare('SELECT deleted FROM chat_sync_conversations').get().deleted,0);
});

test('v2 captured PUT binds its own observed CAS base before a different tab advances shared metadata', async t => {
 const f=await fixture(t),store=memoryStore(),a=device(f,f.alice,{store}),original=thread();await a.sync.initialize([original]);const b=device(f,f.alice,{store});await b.sync.acknowledgeApplied((await b.sync.initialize([])).threads);
 await b.sync.capture([addTurn(original,'Captured local branch')]);assert.equal([...store.values.values()][0].outbox[0].baseRevision,1);await save(f,f.alice,original.id,mutation(projectChatHistoryThread(addTurn(original,'Other device wins first')),1));
 // A separate context observes the real newer revision in the same durable owner state.
 await a.sync.pull();await b.sync.flush();const result=await b.sync.snapshot();assert.equal(f.DB.raw.prepare('SELECT revision FROM chat_sync_conversations').get().revision,2);assert.equal(result.conflicts.length,1);assert.equal(result.conflicts[0].local.turns[1].items.at(-1).text,'Captured local branch');assert.equal(result.conflicts[0].remote.turns[1].items.at(-1).text,'Other device wins first');
});

test('v2 lost acknowledgement of resolved local PUT is reconciled without a permanent conflict or duplicate write', async t => {
 const f=await fixture(t),a=device(f),original=thread();await a.sync.initialize([original]);const local=addTurn(original,'Local selected branch');await a.sync.capture([local]);await save(f,f.alice,original.id,mutation(projectChatHistoryThread(addTurn(original,'Remote competing branch')),1));await a.sync.pull();await a.sync.resolveConflict(original.id,'local');a.state.loseAckOnce=true;await assert.rejects(a.sync.flush(),{code:'SYNC_NETWORK_UNAVAILABLE'});assert.equal((await a.sync.conflicts()).length,1);await a.sync.pull();assert.equal((await a.sync.conflicts()).length,0);assert.equal((await a.sync.snapshot()).queuedCount,0);assert.equal(f.DB.raw.prepare('SELECT revision FROM chat_sync_conversations').get().revision,3);
});

test('v2 a new local edit during a committed DELETE acknowledgement is preserved as a tombstone conflict', async t => {
 const f=await fixture(t),a=device(f),original=thread();await a.sync.initialize([original]);const b=device(f,f.alice,{store:a.store});await b.sync.acknowledgeApplied((await b.sync.initialize([])).threads);await a.sync.capture([]);let entered,release;const arrived=new Promise(resolve=>{entered=resolve;}),pause=new Promise(resolve=>{release=resolve;});
 a.state.afterResponse=async(url,init,response)=>{if(init.method==='DELETE'&&response.ok){entered();await pause;}};const deleting=a.sync.flush();await arrived;
 // Another native context retains new unsent work while the delete response is in flight.
 await b.sync.capture([addTurn(original,'Unsaved new branch after deletion')]);release();await deleting;const result=await a.sync.snapshot();assert.equal(result.threads.length,0);assert.equal(result.conflicts[0].reason,'remote-deleted');assert.equal(result.conflicts[0].local.turns.length,2);assert.equal(f.DB.raw.prepare('SELECT deleted FROM chat_sync_conversations').get().deleted,1);
});

test('v3 foreign unattempted DELETE cannot be rewritten by another context edited PUT, and its edited branch survives the real delete', async t => {
 const f=await fixture(t),store=memoryStore(),a=device(f,f.alice,{store}),b=device(f,f.alice,{store}),original=thread('v3-foreign-delete-edit');await a.sync.initialize([original]);const initial=await b.sync.initialize([]);await b.sync.acknowledgeApplied(initial.threads);
 await b.sync.capture([]);const before=copy([...store.values.values()][0].outbox);assert.equal(before.length,1);assert.equal(before[0].method,'DELETE');assert.equal(before[0].attempted,false);assert.equal(before[0].baseRevision,1);assert.equal(typeof before[0].contextId,'string');
 const edited=addTurn(original,'Newer edit must remain a durable local branch');await a.sync.capture([edited]);const queued=copy([...store.values.values()][0].outbox);assert.equal(queued.length,2);assert.deepEqual(queued[0],before[0]);assert.equal(queued[1].method,'PUT');assert.notEqual(queued[1].contextId,queued[0].contextId);assert.notEqual(queued[1].mutationId,queued[0].mutationId);assert.equal(queued[1].baseRevision,2);
 await a.sync.flush();const remote=await f.call('/sync/conversations/'+original.id,{token:f.alice.token});assert.equal(remote.status,410);assert.equal((await remote.json()).tombstone.revision,2);const snapshot=await a.sync.snapshot();assert.equal(snapshot.threads.length,0);assert.equal(snapshot.queuedCount,0);assert.equal(snapshot.conflicts.length,1);assert.equal(snapshot.conflicts[0].reason,'remote-deleted');assert.deepEqual(snapshot.conflicts[0].local,projectChatHistoryThread(edited));assert.equal(a.calls.filter(row=>row.method==='DELETE').at(-1).body.mutationId,before[0].mutationId);assert.equal(a.calls.filter(row=>row.method==='PUT').length,1);
 const fresh=await a.create().initialize([]);assert.equal(fresh.conflicts.length,1);assert.deepEqual(fresh.conflicts[0].local,projectChatHistoryThread(edited));await assert.rejects(a.sync.resolveConflict(original.id,'local'),{code:'SYNC_CONVERSATION_DELETED'});
});

test('v3 same-context offline create then delete still coalesces only its own never-attempted intent', async t => {
 const f=await fixture(t),a=device(f),original=thread('v3-own-offline-delete');a.state.online=false;await a.sync.initialize([original]);const before=copy([...a.store.values.values()][0].outbox[0]);assert.equal(before.method,'PUT');assert.equal(before.attempted,false);
 await a.sync.capture([]);const after=copy([...a.store.values.values()][0].outbox);assert.equal(after.length,1);assert.equal(after[0].method,'DELETE');assert.equal(after[0].mutationId,before.mutationId);assert.equal(after[0].contextId,before.contextId);assert.equal(after[0].baseRevision,0);assert.equal(after[0].document,undefined);
 a.state.online=true;await a.sync.flush();const value=await(await f.call('/sync/conversations/'+original.id,{token:f.alice.token})).json();assert.equal(value.tombstone.revision,1);assert.equal(f.DB.raw.prepare('SELECT COUNT(*) AS n FROM chat_sync_changes').get().n,1);assert.equal(a.calls.some(row=>row.method==='PUT'),false);
});

test('v3 reloaded context does not rewrite an older unattempted offline create while deleting its same local snapshot', async t => {
 const f=await fixture(t),a=device(f),original=thread('v3-reload-causal-delete');a.state.online=false;await a.sync.initialize([original]);const before=copy([...a.store.values.values()][0].outbox[0]);const reloaded=a.create();await reloaded.initialize([original]);await reloaded.capture([]);const queued=copy([...a.store.values.values()][0].outbox);
 assert.equal(queued.length,2);assert.deepEqual(queued[0],before);assert.equal(queued[0].method,'PUT');assert.equal(queued[1].method,'DELETE');assert.notEqual(queued[0].contextId,queued[1].contextId);assert.notEqual(queued[0].mutationId,queued[1].mutationId);assert.equal(queued[1].baseRevision,1);
 a.state.online=true;await reloaded.flush();assert.equal(f.DB.raw.prepare('SELECT COUNT(*) AS n FROM chat_sync_changes').get().n,2);const remote=await f.call('/sync/conversations/'+original.id,{token:f.alice.token});assert.equal(remote.status,410);assert.equal((await remote.json()).tombstone.revision,2);assert.equal((await reloaded.snapshot()).queuedCount,0);
});
