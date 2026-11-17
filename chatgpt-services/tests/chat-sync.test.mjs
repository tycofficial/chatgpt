import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { handleChatSync, getChatSyncOwner, CHAT_SYNC_LIMITS } from '../worker/chat-sync.mjs';
import { syncFixture, nativeDocument, mutation, save } from './chat-sync-fixture.mjs';

test('verified Free and administrator have durable isolated native history; another login restores exact JSON', async t => {
  const f = await syncFixture(); t.after(() => f.DB.raw.close());
  const document = nativeDocument(), id = document.id;
  const created = await save(f, f.alice, id, mutation(document)); assert.equal(created.status, 200);
  const ack = await created.json(); assert.equal(ack.revision, 1); assert.equal(ack.sequence, 1); assert.equal(ack.replayed, false);
  assert.match(ack.documentHash, /^[a-f0-9]{64}$/);
  const login = await (await f.call('/auth/login', { method: 'POST', body: { username: 'NeutralAlice', password: 'Neutral-Free-Only' } })).json();
  assert.equal(typeof login.token, 'string');
  const restored = await f.call('/sync/conversations/' + id, { token: login.token }); assert.equal(restored.status, 200);
  assert.deepEqual((await restored.json()).document, document);
  for (const actor of [f.bob, f.admin]) {
    assert.equal((await f.call('/sync/conversations/' + id, { token: actor.token })).status, 404);
    assert.deepEqual((await (await f.call('/sync/conversations', { token: actor.token })).json()).conversations, []);
  }
  const own = { ...document, name: 'Administrator neutral history' };
  assert.equal((await save(f, f.admin, id, mutation(own))).status, 200);
  assert.deepEqual((await (await f.call('/sync/conversations/' + id, { token: f.alice.token })).json()).document, document);
  assert.equal((await f.call('/bridge/pair', { method: 'POST', token: f.alice.token, body: {} })).status, 403);
  assert.ok(f.DB.state.sessions.every(value => value === 'first-primary'));
});

test('missing, fake, expired and revoked sessions cannot read or write; client identity fields cannot select an owner', async t => {
  const f = await syncFixture(); t.after(() => f.DB.raw.close());
  const id = 'auth-owner-check'; await save(f, f.admin, id, mutation(nativeDocument(id)));
  for (const token of [undefined, 'opaque-prototype-not-a-session', 'a'.repeat(64)]) {
    assert.equal((await f.call('/sync/conversations/' + id, { token })).status, 401);
    assert.equal((await f.call('/sync/conversations/' + id, { method: 'PUT', token, body: mutation(nativeDocument(id)) })).status, 401);
  }
  assert.equal((await save(f, f.alice, 'identity-spoof', { ...mutation(nativeDocument('identity-spoof')), owner: 'administrator:1' })).status, 400);
  assert.equal((await f.call('/sync/conversations?accountId=administrator%3A1', { token: f.alice.token })).status, 400);
  f.DB.raw.prepare('UPDATE user_sessions SET expires_at=0 WHERE user_id=?').run(f.alice.user.accountId);
  assert.equal((await f.call('/sync/conversations', { token: f.alice.token })).status, 401);
  assert.equal((await f.call('/auth/logout', { method: 'POST', token: f.bob.token, body: {} })).status, 200);
  assert.equal((await f.call('/sync/conversations', { token: f.bob.token })).status, 401);
  assert.equal(getChatSyncOwner({ role: 'administrator', id: 'site-admin', planType: 'pro' }), null);
  assert.equal(getChatSyncOwner({ role: 'user', id: 'not-a-verified-db-uuid' }), null);
  assert.equal(getChatSyncOwner({ role: 'administrator', id: 1 }), 'administrator:1');
  assert.equal(getChatSyncOwner(null), null);
});

test('revisions progress across three real SQL writes and stale writers never replace newer history', async t => {
  const f = await syncFixture(); t.after(() => f.DB.raw.close()); const id = 'three-turns';
  for (let step = 0; step < 3; step++) {
    const doc = { ...nativeDocument(id), turns: Array.from({ length: step + 1 }, (_, index) => ({ id: 'turn-' + index, status: 'completed', input: [{ type: 'text', text: 'Neutral ' + index }], items: [] })) };
    const response = await save(f, f.alice, id, mutation(doc, step)); assert.equal(response.status, 200);
    assert.equal((await response.json()).revision, step + 1);
  }
  const stale = await save(f, f.alice, id, mutation({ ...nativeDocument(id), name: 'Old offline copy' }, 1)); assert.equal(stale.status, 409);
  const conflict = await stale.json(); assert.equal(conflict.error.code, 'SYNC_REVISION_CONFLICT'); assert.equal(conflict.current.revision, 3);
  assert.equal(own(conflict.current, 'document'), false);
  assert.equal((await (await f.call('/sync/conversations/' + id, { token: f.alice.token })).json()).document.turns.length, 3);
  assert.equal(f.DB.raw.prepare('SELECT COUNT(*) AS n FROM chat_sync_changes').get().n, 3);
});
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

test('twenty simultaneous stale devices have exactly one CAS winner and one new owner change', async t => {
  const f = await syncFixture(); t.after(() => f.DB.raw.close()); const id = 'concurrent';
  await save(f, f.alice, id, mutation(nativeDocument(id)));
  const responses = await Promise.all(Array.from({ length: 20 }, (_, index) => save(f, f.alice, id, mutation({ ...nativeDocument(id), name: 'Device ' + index }, 1))));
  assert.equal(responses.filter(response => response.status === 200).length, 1);
  assert.equal(responses.filter(response => response.status === 409).length, 19);
  assert.equal(f.DB.raw.prepare('SELECT revision FROM chat_sync_conversations').get().revision, 2);
  assert.equal(f.DB.raw.prepare('SELECT COUNT(*) AS n FROM chat_sync_changes').get().n, 2);
});

test('same mutation is idempotent across reordered JSON, later revisions, and concurrent retries', async t => {
  const f = await syncFixture(); t.after(() => f.DB.raw.close()); const id = 'idempotent';
  const first = { baseRevision: 0, mutationId: 'device-one:create', document: { z: '末尾', a: { b: 2, a: 1 } } };
  const responses = await Promise.all(Array.from({ length: 6 }, () => save(f, f.alice, id, first)));
  assert.ok(responses.every(response => response.status === 200));
  const receipts = await Promise.all(responses.map(response => response.json())); assert.equal(receipts.filter(receipt => !receipt.replayed).length, 1);
  const reordered = { ...first, document: { a: { a: 1, b: 2 }, z: '末尾' } };
  assert.equal((await (await save(f, f.alice, id, reordered)).json()).replayed, true);
  await save(f, f.alice, id, mutation({ updated: true }, 1));
  assert.equal((await (await save(f, f.alice, id, first)).json()).revision, 1);
  assert.equal((await (await f.call('/sync/conversations/' + id, { token: f.alice.token })).json()).revision, 2);
  assert.equal(f.DB.raw.prepare('SELECT COUNT(*) AS n FROM chat_sync_changes').get().n, 2);
  const changed = await save(f, f.alice, id, { ...first, document: { different: true } }); assert.equal(changed.status, 409);
  assert.equal((await changed.json()).error.code, 'SYNC_MUTATION_ID_CONFLICT');
  assert.equal((await save(f, f.alice, 'another-conversation', first)).status, 409);
  assert.equal((await save(f, f.bob, id, first)).status, 200);
});

test('delete returns a stable tombstone, erases stored document, and blocks stale or deliberate same-ID resurrection', async t => {
  const f = await syncFixture(); t.after(() => f.DB.raw.close()); const id = 'deleted-history';
  await save(f, f.alice, id, mutation(nativeDocument(id)));
  const body = { baseRevision: 1, mutationId: 'device-one:delete' };
  const remove = () => f.call('/sync/conversations/' + id, { method: 'DELETE', token: f.alice.token, body });
  const receipt = await (await remove()).json(); assert.equal(receipt.revision, 2); assert.equal(receipt.deleted, true);
  assert.equal((await (await remove()).json()).replayed, true);
  const gone = await f.call('/sync/conversations/' + id, { token: f.alice.token }); assert.equal(gone.status, 410);
  const tombstone = (await gone.json()).tombstone; assert.equal(tombstone.id, id); assert.equal(tombstone.revision, 2); assert.equal(tombstone.deleted, true);
  assert.equal(f.DB.raw.prepare('SELECT document_json FROM chat_sync_conversations').get().document_json, null);
  for (const baseRevision of [0, 1, 2]) {
    const response = await save(f, f.alice, id, mutation(nativeDocument(id), baseRevision)); assert.equal(response.status, 409);
    assert.equal((await response.json()).error.code, 'CONVERSATION_DELETED');
  }
  assert.deepEqual((await (await f.call('/sync/conversations', { token: f.alice.token })).json()).conversations, []);
  const changes = (await (await f.call('/sync/changes', { token: f.alice.token })).json()).changes;
  assert.deepEqual(changes.map(change => [change.revision, change.deleted]), [[1, false], [2, true]]);
});

test('offline deletion of not-yet-uploaded history writes tombstone before a late bulk migration', async t => {
  const f = await syncFixture(); t.after(() => f.DB.raw.close()); const id = 'offline-never-uploaded';
  const deleted = await f.call('/sync/conversations/' + id, { method: 'DELETE', token: f.alice.token, body: { baseRevision: 0, mutationId: 'offline-delete-1' } });
  assert.equal(deleted.status, 200); assert.equal((await deleted.json()).revision, 1);
  const stale = await save(f, f.alice, id, mutation(nativeDocument(id))); assert.equal(stale.status, 409);
  assert.equal((await stale.json()).current.deleted, true);
});

test('metadata pagination plus first watermark and changes does not lose interleaved new/renamed/deleted histories', async t => {
  const f = await syncFixture(); t.after(() => f.DB.raw.close());
  for (const id of ['bravo', 'delta', 'foxtrot']) await save(f, f.alice, id, mutation(nativeDocument(id)));
  const first = await (await f.call('/sync/conversations?limit=1', { token: f.alice.token })).json();
  assert.deepEqual(first.conversations.map(row => row.id), ['bravo']); assert.equal(first.cursor, 3); assert.equal(first.nextCursor, 'bravo');
  assert.equal(own(first.conversations[0], 'document'), false);
  await save(f, f.alice, 'alpha', mutation(nativeDocument('alpha')));
  await save(f, f.alice, 'delta', mutation({ ...nativeDocument('delta'), name: 'Renamed while paging', archived: true }, 1));
  await f.call('/sync/conversations/foxtrot', { method: 'DELETE', token: f.alice.token, body: { baseRevision: 1, mutationId: 'delete-foxtrot' } });
  const rest = await (await f.call('/sync/conversations?cursor=' + first.nextCursor + '&limit=1', { token: f.alice.token })).json();
  assert.deepEqual(rest.conversations.map(row => row.id), ['delta']); assert.equal(rest.nextCursor, null);
  const changed = await (await f.call('/sync/changes?after=' + first.cursor + '&limit=2', { token: f.alice.token })).json();
  assert.deepEqual(changed.changes.map(row => row.id), ['alpha', 'delta']); assert.equal(changed.hasMore, true); assert.equal(changed.cursor, 5);
  const last = await (await f.call('/sync/changes?after=' + changed.cursor + '&limit=2', { token: f.alice.token })).json();
  assert.equal(last.changes[0].id, 'foxtrot'); assert.equal(last.changes[0].deleted, true); assert.equal(last.hasMore, false); assert.equal(last.cursor, 6);
  assert.equal((await f.call('/sync/changes?after=7', { token: f.alice.token })).status, 409);
  const other = await (await f.call('/sync/changes', { token: f.bob.token })).json(); assert.equal(other.cursor, 0); assert.equal(other.latestCursor, 0);
});

test('a failed SQL transaction rolls back document, revision, sequence, receipt and change atomically', async t => {
  const f = await syncFixture(); t.after(() => f.DB.raw.close()); const id = 'rollback';
  await save(f, f.alice, id, mutation({ original: true }));
  const body = mutation({ new: true }, 1);
  f.DB.state.failOnce = sql => sql.startsWith('INSERT OR IGNORE INTO chat_sync_mutations');
  assert.equal((await save(f, f.alice, id, body)).status, 503);
  assert.equal(f.DB.raw.prepare('SELECT revision FROM chat_sync_conversations').get().revision, 1);
  assert.equal(f.DB.raw.prepare('SELECT sequence FROM chat_sync_owners').get().sequence, 1);
  assert.equal(f.DB.raw.prepare('SELECT COUNT(*) AS n FROM chat_sync_mutations').get().n, 1);
  assert.equal(f.DB.raw.prepare('SELECT COUNT(*) AS n FROM chat_sync_changes').get().n, 1);
  assert.equal((await save(f, f.alice, id, body)).status, 200);
  assert.deepEqual((await (await f.call('/sync/conversations/' + id, { token: f.alice.token })).json()).document, { new: true });
});

test('lost acknowledgement after commit can retry the same durable outbox entry without duplicate writes', async t => {
  const f = await syncFixture(); t.after(() => f.DB.raw.close()); const id = 'lost-response', body = mutation(nativeDocument(id));
  f.DB.state.failAfterCommit = true;
  assert.equal((await save(f, f.alice, id, body)).status, 503);
  const retry = await save(f, f.alice, id, body); assert.equal(retry.status, 200); assert.equal((await retry.json()).replayed, true);
  assert.equal(f.DB.raw.prepare('SELECT COUNT(*) AS n FROM chat_sync_conversations').get().n, 1);
  assert.equal(f.DB.raw.prepare('SELECT COUNT(*) AS n FROM chat_sync_changes').get().n, 1);
});

test('bulk migration validates before any write, returns per-entry CAS conflicts and is replay-safe', async t => {
  const f = await syncFixture(); t.after(() => f.DB.raw.close());
  const operations = ['bulk-a', 'bulk-b', 'bulk-c'].map(id => ({ method: 'PUT', id, ...mutation(nativeDocument(id)) }));
  const bulk = body => f.call('/sync/batch', { method: 'POST', token: f.alice.token, body });
  assert.equal((await bulk({ mutations: [...operations, { method: 'POST', id: 'invalid' }] })).status, 400);
  assert.equal(f.DB.raw.prepare('SELECT COUNT(*) AS n FROM chat_sync_conversations').get().n, 0);
  const saved = await (await bulk({ mutations: operations })).json(); assert.equal(saved.complete, true); assert.ok(saved.results.every(item => item.status === 200));
  const retried = await (await bulk({ mutations: operations })).json(); assert.ok(retried.results.every(item => item.body.replayed));
  const conflicts = await (await bulk({ mutations: [{ method: 'PUT', id: 'bulk-a', ...mutation({ stale: true }) }, { method: 'PUT', id: 'bulk-d', ...mutation(nativeDocument('bulk-d')) }] })).json();
  assert.deepEqual(conflicts.results.map(item => item.status), [409, 200]);
  assert.equal(f.DB.raw.prepare('SELECT COUNT(*) AS n FROM chat_sync_changes').get().n, 4);
});

test('partially committed bulk request reports progress and retries the unchanged batch safely', async t => {
  const f = await syncFixture(); t.after(() => f.DB.raw.close());
  const operations = ['partial-a', 'partial-b', 'partial-c'].map(id => ({ method: 'PUT', id, ...mutation(nativeDocument(id)) }));
  let writes = 0;
  f.DB.state.failOnce = sql => sql.startsWith('INSERT INTO chat_sync_conversations') && ++writes === 2;
  const call = () => f.call('/sync/batch', { method: 'POST', token: f.alice.token, body: { mutations: operations } });
  const failed = await call(); assert.equal(failed.status, 503); const progress = await failed.json(); assert.equal(progress.complete, false); assert.equal(progress.results.length, 1);
  const resumed = await (await call()).json(); assert.equal(resumed.complete, true); assert.equal(resumed.results[0].body.replayed, true);
  assert.equal(f.DB.raw.prepare('SELECT COUNT(*) AS n FROM chat_sync_changes').get().n, 3);
});

test('UTF-8 bytes, JSON depth, node count, body size and envelope limits fail honestly without writes', async t => {
  const f = await syncFixture(); t.after(() => f.DB.raw.close());
  const tooLarge = mutation({ text: '中'.repeat(Math.ceil(CHAT_SYNC_LIMITS.documentBytes / 3)) });
  assert.equal((await save(f, f.alice, 'utf8-size', tooLarge)).status, 413);
  let deep = {}; for (let index = 0; index < CHAT_SYNC_LIMITS.documentDepth + 2; index++) deep = { child: deep };
  assert.equal((await save(f, f.alice, 'deep-json', mutation(deep))).status, 413);
  assert.equal((await save(f, f.alice, 'many-nodes', mutation({ values: Array(CHAT_SYNC_LIMITS.documentNodes + 1).fill(0) }))).status, 413);
  assert.equal((await f.call('/sync/conversations/raw-size', { method: 'PUT', token: f.alice.token, headers: { 'Content-Type': 'application/json' }, rawBody: ' '.repeat(CHAT_SYNC_LIMITS.requestBytes + 1) })).status, 413);
  for (const body of [null, {}, { ...mutation({}), baseRevision: -1 }, { ...mutation({}), baseRevision: 1.1 }, { ...mutation({}), mutationId: 'tiny' }, mutation([]), mutation({ id: 'wrong-route-id' }), mutation({ ephemeral: true }), { ...mutation({}), accountId: f.admin.user.id }]) {
    assert.equal((await save(f, f.alice, 'invalid-envelope', body)).status, 400);
  }
  assert.equal((await f.call('/sync/conversations/not-json', { method: 'PUT', token: f.alice.token, rawBody: '{}' })).status, 415);
  assert.equal((await f.call('/sync/conversations/bad-json', { method: 'PUT', token: f.alice.token, headers: { 'Content-Type': 'application/json' }, rawBody: '{broken' })).status, 400);
  assert.equal((await f.call('/sync/batch', { method: 'POST', token: f.alice.token, body: { mutations: Array.from({ length: 21 }, (_, index) => ({ method: 'PUT', id: 'extra-' + index, ...mutation({}) })) } })).status, 400);
  assert.equal(f.DB.raw.prepare('SELECT COUNT(*) AS n FROM chat_sync_conversations').get().n, 0);
});

test('route, cursor and CORS controls retain existing authentication and origin restrictions', async t => {
  const f = await syncFixture(); t.after(() => f.DB.raw.close());
  const preflight = await f.call('/sync/conversations/example', { method: 'OPTIONS' }); assert.equal(preflight.status, 204);
  assert.ok(preflight.headers.get('Access-Control-Allow-Methods').split(',').includes('PUT'));
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), 'https://tycofficial.github.io');
  assert.equal((await f.call('/sync/conversations', { token: f.alice.token, origin: 'https://unrelated.invalid' })).status, 403);
  for (const path of ['/sync/conversations?limit=0', '/sync/conversations?limit=101', '/sync/conversations?limit=1&limit=2', '/sync/conversations?cursor=%2F', '/sync/changes?after=-1', '/sync/changes?after=9007199254740992', '/sync/conversations/%2Fescape', '/sync/conversations/a?owner=other']) assert.equal((await f.call(path, { token: f.alice.token })).status, 400);
  assert.equal((await f.call('/sync/unknown', { token: f.alice.token })).status, 404);
  assert.equal((await f.call('/sync/conversations', { method: 'POST', token: f.alice.token, body: {} })).status, 405);
  assert.equal(await handleChatSync(new Request('https://neutral.test/auth/session'), f.env, null), null);
});

test('reads and writes return storage failures instead of claiming a persisted history', async t => {
  const f = await syncFixture(); t.after(() => f.DB.raw.close());
  f.DB.state.failOnce = sql => sql.startsWith('SELECT sequence FROM chat_sync_owners');
  const list = await f.call('/sync/conversations', { token: f.alice.token }); assert.equal(list.status, 503); assert.equal((await list.json()).error.code, 'SYNC_STORAGE_UNAVAILABLE');
  const unavailable = await handleChatSync(new Request('https://neutral.test/sync/conversations'), {}, { role: 'administrator', id: 1 }); assert.equal(unavailable.status, 503);
});

test('schema-only migration preserves existing verified sessions, Free users and relay state', async t => {
  const f = await syncFixture({ includeSyncMigration: false }); t.after(() => f.DB.raw.close());
  const pairing = await (await f.call('/bridge/pair', { method: 'POST', token: f.admin.token, body: {} })).json();
  assert.equal(typeof pairing.bridgeId, 'string');
  const before = { users: f.DB.raw.prepare('SELECT id,username FROM users ORDER BY id').all(), sessions: f.DB.raw.prepare('SELECT COUNT(*) AS n FROM sessions').get().n, userSessions: f.DB.raw.prepare('SELECT COUNT(*) AS n FROM user_sessions').get().n };
  const sql = fs.readFileSync(new URL('../drizzle/0003_chat_sync.sql', import.meta.url), 'utf8');
  assert.equal(/\b(?:INSERT|UPDATE|DELETE|DROP|ALTER)\s/i.test(sql), false);
  f.DB.raw.exec(sql);
  assert.deepEqual(f.DB.raw.prepare('SELECT id,username FROM users ORDER BY id').all(), before.users);
  assert.equal(f.DB.raw.prepare('SELECT COUNT(*) AS n FROM sessions').get().n, before.sessions);
  assert.equal(f.DB.raw.prepare('SELECT COUNT(*) AS n FROM user_sessions').get().n, before.userSessions);
  assert.equal(f.DB.raw.prepare('SELECT id FROM bridges').get().id, pairing.bridgeId);
  assert.equal((await f.call('/auth/session', { token: f.alice.token })).status, 200);
  assert.equal((await f.call('/auth/session', { token: f.admin.token })).status, 200);
  assert.equal((await save(f, f.alice, 'post-migration', mutation(nativeDocument('post-migration')))).status, 200);
});

test('exact byte boundary is accepted and arbitrary native text stays data rather than SQL or prototype state', async t => {
  const f = await syncFixture(); t.after(() => f.DB.raw.close());
  const exact = { text: 'a'.repeat(CHAT_SYNC_LIMITS.documentBytes - 11) };
  assert.equal(new TextEncoder().encode(JSON.stringify(exact)).byteLength, CHAT_SYNC_LIMITS.documentBytes);
  assert.equal((await save(f, f.alice, 'byte-boundary', mutation(exact))).status, 200);
  assert.equal((await (await f.call('/sync/conversations/byte-boundary', { token: f.alice.token })).json()).document.text.length, exact.text.length);
  const hostileAsData = JSON.parse('{"__proto__":{"owned":true},"constructor":"literal","text":"\'); DROP TABLE users; -- <script>neutral</script>"}');
  assert.equal((await save(f, f.alice, 'untrusted-text', mutation(hostileAsData))).status, 200);
  const stored = (await (await f.call('/sync/conversations/untrusted-text', { token: f.alice.token })).json()).document;
  assert.deepEqual(stored, hostileAsData); assert.equal({}.owned, undefined);
  assert.equal(f.DB.raw.prepare('SELECT COUNT(*) AS n FROM users').get().n, 2);
});

test('bulk DELETE uses the same tombstone/CAS contract and rejects ignored document fields', async t => {
  const f = await syncFixture(); t.after(() => f.DB.raw.close());
  await save(f, f.alice, 'bulk-delete', mutation({ history: 'Neutral' }));
  const operation = { method: 'DELETE', id: 'bulk-delete', baseRevision: 1, mutationId: 'bulk-delete-operation' };
  const bad = await f.call('/sync/batch', { method: 'POST', token: f.alice.token, body: { mutations: [{ ...operation, document: {} }] } }); assert.equal(bad.status, 400);
  const first = await (await f.call('/sync/batch', { method: 'POST', token: f.alice.token, body: { mutations: [operation] } })).json();
  assert.equal(first.results[0].status, 200); assert.equal(first.results[0].body.deleted, true);
  const replay = await (await f.call('/sync/batch', { method: 'POST', token: f.alice.token, body: { mutations: [operation] } })).json(); assert.equal(replay.results[0].body.replayed, true);
  assert.equal((await f.call('/sync/conversations/bulk-delete', { token: f.alice.token })).status, 410);
});
