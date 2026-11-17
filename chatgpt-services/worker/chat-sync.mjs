/** Authenticated, revisioned native conversation documents in D1.
 * The caller must obtain principal from the existing server-side session verifier.
 * No client account field, local UI entitlement, or model capability is trusted.
 */
export const CHAT_SYNC_LIMITS = Object.freeze({
  documentBytes: 1_000_000,
  requestBytes: 1_100_000,
  batchBytes: 4_500_000,
  batchMutations: 20,
  documentNodes: 150_000,
  documentDepth: 80,
  pageSize: 100,
});

const encoder = new TextEncoder();
const idPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const mutationPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const q = (db, sql, ...values) => db.prepare(sql).bind(...values);
const results = result => result?.results ?? [];
const hex = bytes => Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
const sha256 = async value => hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store', ...extra },
});
const failure = (status, code, message, extra = {}, headers = {}) => json({ error: { code, message }, ...extra }, status, headers);

class SyncError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const invalid = message => { throw new SyncError(400, 'INVALID_SYNC_REQUEST', message); };

/** Only the raw server session row is accepted here, never the public/client DTO. */
export function getChatSyncOwner(principal) {
  if (principal?.role === 'administrator' && principal.id === 1) return 'administrator:1';
  if (principal?.role === 'user' && typeof principal.id === 'string' && uuidPattern.test(principal.id)) return 'user:' + principal.id.toLowerCase();
  return null;
}

function exactKeys(value, required, optional = []) {
  if (!object(value) || Object.keys(value).some(key => !required.includes(key) && !optional.includes(key)) || required.some(key => !own(value, key))) invalid('The sync request has unsupported or missing fields.');
}

function canonicalDocument(document) {
  if (!object(document)) invalid('document must be a JSON object.');
  let nodes = 0;
  const encode = (value, depth) => {
    if (++nodes > CHAT_SYNC_LIMITS.documentNodes || depth > CHAT_SYNC_LIMITS.documentDepth) throw new SyncError(413, 'SYNC_DOCUMENT_TOO_COMPLEX', 'The conversation exceeds the JSON structure budget.');
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
    if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(item => encode(item, depth + 1)).join(',') + ']';
    if (object(value)) return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + encode(value[key], depth + 1)).join(',') + '}';
    invalid('document must contain only JSON values.');
  };
  const serialized = encode(document, 0);
  if (encoder.encode(serialized).byteLength > CHAT_SYNC_LIMITS.documentBytes) throw new SyncError(413, 'SYNC_DOCUMENT_TOO_LARGE', 'The conversation exceeds the cloud document byte budget.');
  return serialized;
}

async function readJson(request, limit) {
  const length = request.headers.get('content-length');
  if (length && /^\d+$/.test(length) && Number(length) > limit) throw new SyncError(413, 'SYNC_REQUEST_TOO_LARGE', 'The sync request is too large.');
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') ?? '')) throw new SyncError(415, 'SYNC_JSON_REQUIRED', 'Send a JSON sync request.');
  const chunks = []; let size = 0;
  const reader = request.body?.getReader();
  if (!reader) invalid('A JSON request body is required.');
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new SyncError(413, 'SYNC_REQUEST_TOO_LARGE', 'The sync request is too large.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { invalid('The sync request must be valid UTF-8 JSON.'); }
}

async function prepareMutation(method, id, body) {
  if (!idPattern.test(id)) invalid('Invalid conversation ID.');
  exactKeys(body, method === 'PUT' ? ['baseRevision', 'mutationId', 'document'] : ['baseRevision', 'mutationId']);
  if (!Number.isSafeInteger(body.baseRevision) || body.baseRevision < 0 || body.baseRevision >= Number.MAX_SAFE_INTEGER) invalid('baseRevision must be a nonnegative safe integer.');
  if (typeof body.mutationId !== 'string' || !mutationPattern.test(body.mutationId)) invalid('Invalid mutationId.');
  if (method === 'PUT' && object(body.document)) {
    if (own(body.document, 'id') && body.document.id !== id) invalid('The native document ID must match the conversation route.');
    if (body.document.ephemeral === true) invalid('Ephemeral conversations are not cloud-synced.');
  }
  const document = method === 'PUT' ? canonicalDocument(body.document) : null;
  const documentHash = document === null ? null : await sha256(document);
  const requestHash = await sha256(JSON.stringify([method, id, body.baseRevision, documentHash]));
  return { method, id, baseRevision: body.baseRevision, mutationId: body.mutationId, document, documentHash, requestHash, deleted: method === 'DELETE' ? 1 : 0 };
}

const metadata = row => ({
  id: row.conversation_id,
  revision: row.revision,
  deleted: row.deleted === 1,
  updatedAt: row.updated_at,
  sequence: row.sequence,
  ...(own(row, 'created_at') ? { createdAt: row.created_at } : {}),
  ...(own(row, 'document_hash') ? { documentHash: row.document_hash } : {}),
});
const columns = 'conversation_id,revision,deleted,created_at,updated_at,sequence,document_hash';

async function applyMutation(db, owner, mutation, now) {
  const m = mutation;
  // These statements execute as ONE D1 batch transaction. Both the CAS and
  // idempotency guard live inside SQL; no read-then-write decision occurs in JS.
  const batch = await db.batch([
    q(db, `INSERT INTO chat_sync_conversations
      (owner_key,conversation_id,revision,document_json,document_hash,deleted,created_at,updated_at,last_mutation_id,sequence)
      SELECT ?,?,1,?,?,?,?,?,?,0
      WHERE (?=0 OR EXISTS(SELECT 1 FROM chat_sync_conversations WHERE owner_key=? AND conversation_id=?))
        AND NOT EXISTS(SELECT 1 FROM chat_sync_mutations WHERE owner_key=? AND mutation_id=?)
      ON CONFLICT(owner_key,conversation_id) DO UPDATE SET
        revision=chat_sync_conversations.revision+1,document_json=excluded.document_json,
        document_hash=excluded.document_hash,deleted=excluded.deleted,
        updated_at=MAX(chat_sync_conversations.updated_at,excluded.updated_at),last_mutation_id=excluded.last_mutation_id
      WHERE chat_sync_conversations.revision=? AND chat_sync_conversations.deleted=0
        AND NOT EXISTS(SELECT 1 FROM chat_sync_mutations WHERE owner_key=? AND mutation_id=?)`,
      owner, m.id, m.document, m.documentHash, m.deleted, now, now, m.mutationId,
      m.baseRevision, owner, m.id, owner, m.mutationId, m.baseRevision, owner, m.mutationId),
    q(db, 'INSERT OR IGNORE INTO chat_sync_owners(owner_key,sequence) VALUES(?,0)', owner),
    q(db, `UPDATE chat_sync_owners SET sequence=sequence+1 WHERE owner_key=?
      AND EXISTS(SELECT 1 FROM chat_sync_conversations WHERE owner_key=? AND conversation_id=? AND last_mutation_id=?)
      AND NOT EXISTS(SELECT 1 FROM chat_sync_mutations WHERE owner_key=? AND mutation_id=?)`, owner, owner, m.id, m.mutationId, owner, m.mutationId),
    q(db, `INSERT INTO chat_sync_changes(owner_key,sequence,conversation_id,revision,deleted,updated_at,mutation_id)
      SELECT c.owner_key,o.sequence,c.conversation_id,c.revision,c.deleted,c.updated_at,?
      FROM chat_sync_conversations c JOIN chat_sync_owners o ON o.owner_key=c.owner_key
      WHERE c.owner_key=? AND c.conversation_id=? AND c.last_mutation_id=?
        AND NOT EXISTS(SELECT 1 FROM chat_sync_mutations WHERE owner_key=? AND mutation_id=?)`, m.mutationId, owner, m.id, m.mutationId, owner, m.mutationId),
    q(db, `UPDATE chat_sync_conversations SET sequence=(SELECT sequence FROM chat_sync_owners WHERE owner_key=?)
      WHERE owner_key=? AND conversation_id=? AND last_mutation_id=?
        AND NOT EXISTS(SELECT 1 FROM chat_sync_mutations WHERE owner_key=? AND mutation_id=?)`, owner, owner, m.id, m.mutationId, owner, m.mutationId),
    q(db, `INSERT OR IGNORE INTO chat_sync_mutations(owner_key,mutation_id,conversation_id,request_hash,revision,deleted,sequence,document_hash,updated_at)
      SELECT owner_key,?,conversation_id,?,revision,deleted,sequence,document_hash,updated_at
      FROM chat_sync_conversations WHERE owner_key=? AND conversation_id=? AND last_mutation_id=?`, m.mutationId, m.requestHash, owner, m.id, m.mutationId),
    q(db, 'SELECT * FROM chat_sync_mutations WHERE owner_key=? AND mutation_id=?', owner, m.mutationId),
    q(db, `SELECT ${columns} FROM chat_sync_conversations WHERE owner_key=? AND conversation_id=?`, owner, m.id),
  ]);
  const receipt = results(batch[6])[0], current = results(batch[7])[0];
  if (receipt) {
    if (receipt.request_hash !== m.requestHash || receipt.conversation_id !== m.id) return failure(409, 'SYNC_MUTATION_ID_CONFLICT', 'This mutation ID already identifies another request.', { current: current ? metadata(current) : null });
    const wrote = Number(batch[0]?.meta?.changes ?? batch[0]?.changes ?? 0) === 1;
    return json({ ...metadata(receipt), replayed: !wrote });
  }
  return failure(409, current?.deleted === 1 ? 'CONVERSATION_DELETED' : 'SYNC_REVISION_CONFLICT',
    current?.deleted === 1 ? 'This conversation was deleted and cannot be resurrected by an old device.' : 'Another device changed this conversation. Pull the current revision before retrying.',
    { current: current ? metadata(current) : null });
}

function pageLimit(url, allowed) {
  for (const key of url.searchParams.keys()) if (!allowed.includes(key)) invalid('Unsupported sync query parameter.');
  for (const key of allowed) if (url.searchParams.getAll(key).length > 1) invalid('Duplicate sync query parameter.');
  const text = url.searchParams.get('limit');
  if (text !== null && !/^[1-9]\d{0,2}$/.test(text)) invalid('Invalid page limit.');
  const limit = text === null ? 50 : Number(text);
  if (limit > CHAT_SYNC_LIMITS.pageSize) invalid('The page limit exceeds the sync budget.');
  return limit;
}

async function list(db, owner, url) {
  const limit = pageLimit(url, ['cursor', 'limit']);
  const cursor = url.searchParams.get('cursor') ?? '';
  if (cursor && !idPattern.test(cursor)) invalid('Invalid conversation page cursor.');
  const values = await db.batch([
    q(db, 'SELECT sequence FROM chat_sync_owners WHERE owner_key=?', owner),
    q(db, `SELECT ${columns} FROM chat_sync_conversations WHERE owner_key=? AND deleted=0 AND conversation_id>? ORDER BY conversation_id LIMIT ?`, owner, cursor, limit + 1),
  ]);
  const rows = results(values[1]), page = rows.slice(0, limit);
  return json({ conversations: page.map(metadata), cursor: results(values[0])[0]?.sequence ?? 0, nextCursor: rows.length > limit ? page.at(-1).conversation_id : null });
}

async function changes(db, owner, url) {
  const limit = pageLimit(url, ['after', 'limit']), text = url.searchParams.get('after') ?? '0';
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(Number(text))) invalid('Invalid change cursor.');
  const after = Number(text);
  const values = await db.batch([
    q(db, 'SELECT sequence FROM chat_sync_owners WHERE owner_key=?', owner),
    q(db, 'SELECT conversation_id,revision,deleted,updated_at,sequence FROM chat_sync_changes WHERE owner_key=? AND sequence>? ORDER BY sequence LIMIT ?', owner, after, limit + 1),
  ]);
  const latestCursor = results(values[0])[0]?.sequence ?? 0;
  if (after > latestCursor) return failure(409, 'SYNC_CURSOR_AHEAD', 'The change cursor is newer than this account database.', { latestCursor });
  const rows = results(values[1]), page = rows.slice(0, limit);
  return json({ changes: page.map(metadata), cursor: page.at(-1)?.sequence ?? after, hasMore: rows.length > limit, latestCursor });
}

async function get(db, owner, id) {
  const row = await q(db, 'SELECT * FROM chat_sync_conversations WHERE owner_key=? AND conversation_id=?', owner, id).first();
  if (!row) return failure(404, 'CONVERSATION_NOT_FOUND', 'This account does not have this conversation.');
  if (row.deleted) return failure(410, 'CONVERSATION_DELETED', 'This conversation was deleted.', { tombstone: metadata(row) });
  return json({ ...metadata(row), document: JSON.parse(row.document_json) });
}

/** Handles only /sync/... routes; null means the existing worker retains ownership. */
export async function handleChatSync(request, env, principal, { now = Date.now } = {}) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/sync/')) return null;
  const owner = getChatSyncOwner(principal);
  if (!owner) return failure(401, 'AUTH_REQUIRED', 'Log in to this site to sync conversation history.');
  try {
    if (!env.DB) throw new Error('Storage unavailable');
    // A read starts at the primary when read replication is enabled, so a
    // second device does not restore an older state immediately after a write.
    const db = typeof env.DB.withSession === 'function' ? env.DB.withSession('first-primary') : env.DB;
    if (url.pathname === '/sync/conversations') {
      if (request.method !== 'GET') return failure(405, 'METHOD_NOT_ALLOWED', 'Use GET to list conversations.', {}, { Allow: 'GET' });
      return await list(db, owner, url);
    }
    if (url.pathname === '/sync/changes') {
      if (request.method !== 'GET') return failure(405, 'METHOD_NOT_ALLOWED', 'Use GET to pull conversation changes.', {}, { Allow: 'GET' });
      return await changes(db, owner, url);
    }
    if (url.pathname === '/sync/batch') {
      if (request.method !== 'POST') return failure(405, 'METHOD_NOT_ALLOWED', 'Use POST for a bounded sync batch.', {}, { Allow: 'POST' });
      if (url.search) invalid('Sync writes do not accept query parameters.');
      const body = await readJson(request, CHAT_SYNC_LIMITS.batchBytes); exactKeys(body, ['mutations']);
      if (!Array.isArray(body.mutations) || body.mutations.length < 1 || body.mutations.length > CHAT_SYNC_LIMITS.batchMutations) invalid('A sync batch must contain 1 to 20 mutations.');
      const mutations = [];
      for (const value of body.mutations) {
        exactKeys(value, ['method', 'id', 'baseRevision', 'mutationId'], ['document']);
        if (!['PUT', 'DELETE'].includes(value.method) || typeof value.id !== 'string') invalid('Unsupported batch operation.');
        mutations.push(await prepareMutation(value.method, value.id, value.method === 'PUT'
          ? { baseRevision: value.baseRevision, mutationId: value.mutationId, document: value.document }
          : (own(value, 'document') ? invalid('DELETE has no document.') : { baseRevision: value.baseRevision, mutationId: value.mutationId })));
      }
      const completed = [];
      for (const mutation of mutations) {
        let response;
        try { response = await applyMutation(db, owner, mutation, now()); }
        catch { return failure(503, 'SYNC_STORAGE_UNAVAILABLE', 'Some sync operations could not be saved. Retry the same mutation IDs.', { complete: false, results: completed }); }
        completed.push({ mutationId: mutation.mutationId, id: mutation.id, status: response.status, body: await response.json() });
      }
      return json({ complete: true, results: completed });
    }
    const match = /^\/sync\/conversations\/([^/]+)$/.exec(url.pathname);
    if (!match) return failure(404, 'SYNC_ROUTE_NOT_FOUND', 'Unknown conversation sync route.');
    let id; try { id = decodeURIComponent(match[1]); } catch { invalid('Invalid conversation ID.'); }
    if (!idPattern.test(id)) invalid('Invalid conversation ID.');
    if (url.search) invalid('Conversation requests do not accept query parameters.');
    if (request.method === 'GET') return await get(db, owner, id);
    if (!['PUT', 'DELETE'].includes(request.method)) return failure(405, 'METHOD_NOT_ALLOWED', 'Use GET, PUT, or DELETE for a conversation.', {}, { Allow: 'GET, PUT, DELETE' });
    const mutation = await prepareMutation(request.method, id, await readJson(request, CHAT_SYNC_LIMITS.requestBytes));
    return await applyMutation(db, owner, mutation, now());
  } catch (error) {
    if (error instanceof SyncError) return failure(error.status, error.code, error.message);
    return failure(503, 'SYNC_STORAGE_UNAVAILABLE', 'Conversation history could not be read or saved. Keep the durable local copy and retry.');
  }
}
