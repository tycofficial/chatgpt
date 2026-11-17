/** Account-owned text history sync. No model transport or executable remote checkpoint. */
export const CHAT_HISTORY_SYNC_SCHEMA = 1;
export const CHAT_HISTORY_SYNC_LIMITS = Object.freeze({ documentBytes: 1_000_000, pageSize: 100, flushMutations: 40, queuedMutations: 2000, threads: 2000, requestTimeoutMs: 15000 });
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const clone = value => structuredClone(value);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const idPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const tokenPattern = /^[a-f0-9]{64}$/;
const encoder = new TextEncoder();
export class ChatHistorySyncError extends Error {
  constructor(code, message, { status = null, retryable = false } = {}) { super(message); this.name = 'ChatHistorySyncError'; this.code = code; this.status = status; this.retryable = retryable; }
}
const fail = (code, message, options) => { throw new ChatHistorySyncError(code, message, options); };
function jsonText(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(jsonText).join(',') + ']';
  if (object(value)) return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + jsonText(value[key])).join(',') + '}';
  fail('SYNC_INVALID_DOCUMENT', 'Conversation history must contain only JSON values.');
}
const equal = (a, b) => jsonText(a) === jsonText(b);
const safeString = value => typeof value === 'string' ? value : null;
function fields(value, names) {
  const out = {};
  for (const key of names) if (own(value ?? {}, key) && (value[key] === null || ['string', 'number', 'boolean'].includes(typeof value[key]))) out[key] = value[key];
  return out;
}
function safeId(value, name = 'conversation') { if (typeof value !== 'string' || !idPattern.test(value)) fail('SYNC_INVALID_DOCUMENT', `Invalid ${name} ID.`); return value; }
function strings(value) { return Array.isArray(value) ? value.filter(item => typeof item === 'string') : []; }
function localURI(value) { return typeof value === 'string' && /^(?:blob:|data:|file:|local-only:)|(?:^|\/)__local_artifacts\//i.test(value); }
const unavailable = '[Attachment is available only in the original browser; its bytes were not synced.]';
function safeLinkText(value) { return typeof value === 'string' ? value.replace(/(?:blob:|file:|data:(?:image|application)\/)[^\s<>"']+|https?:\/\/[^\s<>"']*\/__local_artifacts\/[^\s<>"']+|(?:\/[^\s<>"']*)?\b__local_artifacts\/[^\s<>"']+/gi, '[original-browser-only resource]') : ''; }
function attachment(value) { return fields(value, ['id', 'name', 'mime_type', 'size', 'width', 'height', 'library_file_id', 'library_artifact_type', 'is_big_paste', 'attachment_role']); }
function messageMetadata(value) {
  const out = fields(value, ['is_visually_hidden_from_conversation', 'is_user_system_message', 'model_slug', 'thinking_effort', 'is_complete', 'finish_reason']);
  if (Array.isArray(value?.system_hints)) out.system_hints = strings(value.system_hints);
  if (Array.isArray(value?.attachments)) {
    out.attachments = value.attachments.filter(object).map(attachment);
    if (out.attachments.length) out.adapter_attachment_availability = 'original-browser-only';
  }
  return out;
}
function classicMessage(value) {
  if (!object(value) || !['user', 'system'].includes(value.author?.role) || !object(value.content) || !Array.isArray(value.content.parts)) fail('SYNC_INVALID_DOCUMENT', 'Invalid original Classic input record.');
  if (value.author.role === 'system' && value.metadata?.is_visually_hidden_from_conversation !== true) fail('SYNC_INVALID_DOCUMENT', 'Unsupported visible system record in Classic history.');
  const out = { ...fields(value, ['id', 'create_time', 'update_time', 'status', 'end_turn', 'weight']), author: { role: value.author.role }, content: { content_type: 'text', parts: value.content.parts.map(part => typeof part === 'string' ? safeLinkText(part) : unavailable) }, metadata: messageMetadata(value.metadata) };
  if (!out.content.parts.length) out.content.parts = [''];
  return out;
}
function userInput(value) {
  return (Array.isArray(value) ? value : []).map(part => object(part) && part.type === 'text' && typeof part.text === 'string' ? { type: 'text', text: safeLinkText(part.text), ...(Array.isArray(part.text_elements) ? { text_elements: [] } : {}) } : { type: 'text', text: unavailable });
}
function safeReceipt(value) {
  if (!object(value) || value.committed !== true || typeof value.fileId !== 'string' || typeof value.rawFileId !== 'string') return null;
  return { ...fields(value, ['committed', 'operationId', 'fileId', 'rawFileId', 'revision', 'sha256', 'fileName', 'mimeType', 'size', 'kind', 'created', 'updated', 'createdAt', 'updatedAt', 'currentRevision', 'superseded', 'unchanged', 'cleanupPending']), ...(object(value.publication) ? { publication: fields(value.publication, ['origin', 'revision', 'updatedAt']) } : {}) };
}
function publicWebURL(value) {
  if (typeof value !== 'string' || localURI(value)) return null;
  try { const url = new URL(value); if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || [...url.searchParams.keys()].some(key => /^(?:api[_-]?key|access_token|token|auth|authorization|password|session|cookie)$/i.test(key))) return null; return url.href; } catch { return null; }
}
function publicWebReferences(value, text) {
  const out = [], chars = Array.from(text);
  for (const ref of Array.isArray(value) ? value : []) {
    if (!object(ref) || !['webpage', 'grouped_webpages'].includes(ref.type) || !Number.isSafeInteger(ref.start_idx) || !Number.isSafeInteger(ref.end_idx) || ref.start_idx < 0 || ref.end_idx <= ref.start_idx || ref.end_idx > chars.length || chars.slice(ref.start_idx, ref.end_idx).join('') !== ref.matched_text) continue;
    const sources = (ref.type === 'webpage' ? [ref] : Array.isArray(ref.items) ? ref.items : []).flatMap(item => { const url = publicWebURL(item?.url); return url ? [{ url, ...(typeof item.title === 'string' ? { title: item.title } : {}) }] : []; });
    if (!sources.length) continue;
    const range = fields(ref, ['start_idx', 'end_idx', 'matched_text']);
    out.push(ref.type === 'webpage' ? { type: 'webpage', ...range, ...sources[0] } : { type: 'grouped_webpages', ...range, items: sources });
  }
  return out;
}
function publicWebSearch(value) {
  const raw = value.responseItem;
  if (!object(raw) || raw.type !== 'web_search_call' || typeof raw.id !== 'string' || !raw.id || !['in_progress', 'searching', 'completed', 'failed'].includes(raw.status)) fail('SYNC_INVALID_DOCUMENT', 'Invalid hosted search history record.');
  const action = raw.action, projected = { type: raw.type, id: raw.id, status: raw.status };
  if (object(action)) {
    if (action.type === 'search') projected.action = { type: 'search', ...(typeof action.query === 'string' ? { query: safeLinkText(action.query) } : {}), ...(Array.isArray(action.queries) ? { queries: strings(action.queries).map(safeLinkText) } : {}) };
    if (['open_page', 'find_in_page'].includes(action.type)) { const url = publicWebURL(action.url); if (url) projected.action = { type: action.type, url, ...(action.type === 'find_in_page' && typeof action.pattern === 'string' ? { pattern: safeLinkText(action.pattern) } : {}) }; }
    if (action.type === 'other') projected.action = { type: 'other' };
  }
  const pending = ['in_progress', 'searching'].includes(raw.status);
  return { id: value.id, type: 'webSearch', ...fields(value, ['providerCallId', 'round']), responseItem: projected, ...(pending ? { interruption: 'cancelled', completedAtMs: null, durationMs: null } : ['cancelled', 'failed'].includes(value.interruption) ? { interruption: value.interruption } : {}) };
}
function syncItem(value, unavailableResources) {
  if (!object(value) || typeof value.id !== 'string') fail('SYNC_INVALID_DOCUMENT', 'Invalid conversation item.');
  if (value.type === 'userMessage') return { ...fields(value, ['id', 'type', 'clientId']), content: userInput(value.content) };
  if (value.type === 'agentMessage') { const text = safeLinkText(value.text), refs = publicWebReferences(value.webSearchReferences, text); return { id: value.id, type: value.type, ...(['commentary', 'final_answer'].includes(value.phase) ? { phase: value.phase } : {}), text, ...(refs.length ? { webSearchReferences: refs } : {}) }; }
  if (value.type === 'webSearch') return publicWebSearch(value);
  if (value.type === 'reasoning') return { id: value.id, type: value.type, summary: strings(value.summary).map(safeLinkText), content: strings(value.content).map(safeLinkText), ...fields(value, ['status', 'startedAtMs', 'completedAtMs', 'durationMs']), ...(value.status === 'inProgress' ? { status: 'cancelled', completedAtMs: null, durationMs: null } : {}) };
  if (value.type === 'mcpToolCall') {
    const content = [];
    for (const item of value.result?.content ?? []) {
      if (item?.type === 'text' && typeof item.text === 'string') content.push({ type: 'text', text: safeLinkText(item.text) });
      else if (item?.type === 'resource_link' || item?.type === 'resource' || item?.type === 'image' || item?.type === 'audio') {
        const descriptor = fields(item, ['name', 'title', 'mimeType', 'size']);
        unavailableResources.push({ ...descriptor, availability: 'original-browser-only' });
        content.push({ type: 'text', text: `[${descriptor.name ?? descriptor.title ?? 'Resource'} is available only in the original browser; its bytes were not synced.]` });
      }
    }
    const receipt = safeReceipt(value.result?.structuredContent) ?? safeReceipt(value.result?.structuredContent?.receipt) ?? safeReceipt(value.result?.receipt);
    if (receipt) { unavailableResources.push({ ...receipt, availability: 'original-browser-only' }); content.splice(0, content.length, { type: 'text', text: JSON.stringify({ ...receipt, downloadAvailable: false, downloadUnavailable: 'original-browser-only' }) }); }
    const inProgress = value.status === 'inProgress';
    return { ...fields(value, ['id', 'type', 'server', 'tool', 'durationMs']), arguments: {}, status: inProgress ? 'failed' : value.status, result: { content, isError: inProgress || value.result?.isError === true, ...(receipt ? { structuredContent: { ...receipt, downloadAvailable: false, downloadUnavailable: 'original-browser-only' } } : {}) }, error: inProgress ? { message: 'Tool execution remains on its original browser; it was not resumed on this device.' } : value.error?.message ? { message: safeLinkText(value.error.message) } : null };
  }
  // Unknown executable item schemas are never replayed or silently converted to success.
  fail('SYNC_UNSUPPORTED_ITEM', `History sync does not support item type ${String(value.type)}.`);
}
/** A new JSON projection; it never mutates original local history/checkpoints. */
export function projectChatHistoryThread(thread) {
  if (!object(thread) || !Array.isArray(thread.turns)) fail('SYNC_INVALID_DOCUMENT', 'A native thread with turns is required.');
  const id = safeId(thread.id);
  if (thread.ephemeral === true) return null;
  const out = {
    ...fields(thread, ['sessionId', 'name', 'preview', 'model', 'reasoningEffort', 'reasoningMode', 'executionSurface', 'serviceTier', 'uiServiceTier', 'modelProvider', 'createdAt', 'updatedAt', 'recencyAt', 'archived', 'path', 'cwd', 'cliVersion', 'source', 'originator', 'threadSource', 'mode', 'threadStartKind', 'historyMode', 'parentThreadId', 'forkedFromId', 'approvalPolicy']),
    id, ephemeral: false, status: { type: 'idle' }, gitInfo: null, environments: [],
    collaborationMode: { mode: thread.collaborationMode?.mode ?? 'default', settings: { model: thread.collaborationMode?.settings?.model ?? thread.model, reasoning_effort: thread.collaborationMode?.settings?.reasoning_effort ?? thread.reasoningEffort ?? null, developer_instructions: null } },
    adapterMetadata: { ...fields(thread.adapterMetadata, ['source', 'conversationOrigin', 'classicRootId', 'frontendModelSlug', 'reasoningMode', 'executionSurface', 'chatFamily', 'selectionMode', 'curatedPresetMatch']), instructions: strings(thread.adapterMetadata?.instructions).map(safeLinkText), cloudHistorySync: { schemaVersion: 1, executionCheckpointAvailable: false, fileBytesAvailable: false } }, turns: [],
  };
  if (object(thread.adapterMetadata?.classicModelSlugs)) out.adapterMetadata.classicModelSlugs = Object.fromEntries(Object.entries(thread.adapterMetadata.classicModelSlugs).filter(([key, val]) => typeof key === 'string' && typeof val === 'string'));
  const client = fields(thread.adapterMetadata?.clientMetadata, ['conversationOrigin', 'localProductSurface']); if (Object.keys(client).length) out.adapterMetadata.clientMetadata = client;
  const ids = new Set();
  for (const turn of thread.turns) {
    if (!object(turn) || typeof turn.id !== 'string' || ids.has(turn.id) || !Array.isArray(turn.items)) fail('SYNC_INVALID_DOCUMENT', 'Invalid or duplicate native turn.');
    ids.add(turn.id);
    const wasRunning = turn.status === 'inProgress';
    const metadata = { ...fields(turn.adapterMetadata, ['startedAtMs', 'frontendModelSlug', 'reasoningMode', 'executionSurface', 'chatFamily', 'selectionMode', 'curatedPresetMatch', 'interruption']), instructions: strings(turn.adapterMetadata?.instructions).map(safeLinkText), resumable: false, resumePolicy: 'manual' };
    if (wasRunning) metadata.interruption = 'cloud-history-restored-without-execution-checkpoint';
    if (turn.adapterMetadata?.webSearchIntent?.enabled === true) metadata.webSearchIntent = { enabled: true, required: turn.adapterMetadata.webSearchIntent.required === true };
    if (object(turn.adapterMetadata?.reasoningLifecycle)) {
      metadata.reasoningLifecycle = fields(turn.adapterMetadata.reasoningLifecycle, ['startedAtMs', 'workStartedAtMs', 'completedAtMs', 'status', 'attemptDurationMs', 'workDurationMs', 'timingBasis']);
      if (wasRunning) { metadata.reasoningLifecycle.status = 'cancelled'; metadata.reasoningLifecycle.completedAtMs = null; delete metadata.reasoningLifecycle.workDurationMs; }
    }
    if (object(turn.adapterMetadata?.classicResponseBranch)) {
      const branch = turn.adapterMetadata.classicResponseBranch;
      if (branch.version !== 1 || !['next', 'regenerate'].includes(branch.kind) || !Array.isArray(branch.ancestorTurnIds) || branch.ancestorTurnIds.some(id => id === turn.id || !ids.has(id))) fail('SYNC_INVALID_DOCUMENT', 'Invalid response branch ancestry.');
      metadata.classicResponseBranch = { ...fields(branch, ['version', 'kind', 'sourceTurnId', 'frontendSlug']), parentMessageId: safeId(branch.parentMessageId, 'parent message'), ancestorTurnIds: branch.ancestorTurnIds.map(id => safeId(id, 'ancestor turn')) };
    }
    if (turn.adapterMetadata?.classicUserMessage) metadata.classicUserMessage = classicMessage(turn.adapterMetadata.classicUserMessage);
    if (Array.isArray(turn.adapterMetadata?.classicInputMessages)) metadata.classicInputMessages = turn.adapterMetadata.classicInputMessages.map(classicMessage);
    const resources = (turn.adapterMetadata?.cloudUnavailableResources ?? []).filter(object).map(value => ({ ...(safeReceipt(value) ?? fields(value, ['name', 'title', 'mimeType', 'size'])), availability: 'original-browser-only' }));
    const items = turn.items.map(item => syncItem(item, resources));
    if (resources.length) metadata.cloudUnavailableResources = [...new Map(resources.map(value => [jsonText(value), value])).values()];
    // Rebuild text history from source records; never copy private tool/file transcripts.
    const originals = metadata.classicInputMessages ?? (metadata.classicUserMessage ? [metadata.classicUserMessage] : null);
    const transcript = originals ? originals.map(record => ({ role: record.author.role, content: record.content.parts.join('\n') + (record.metadata?.attachments?.length ? '\n' + unavailable : '') })) : [];
    for (const item of items) {
      if (!originals && item.type === 'userMessage') transcript.push({ role: 'user', content: item.content.map(part => part.text).join('\n') });
      if (item.type === 'agentMessage' && item.text) transcript.push({ role: 'assistant', content: item.text, ...(['commentary', 'final_answer'].includes(item.phase) ? { phase: item.phase } : {}) });
    }
    metadata.apiTranscript = transcript;
    metadata.apiTranscriptSource = 'sanitized-native-text-history';
    out.turns.push({ ...fields(turn, ['id', 'startedAt', 'completedAt', 'durationMs', 'model', 'reasoningEffort', 'reasoningMode', 'executionSurface', 'serviceTier', 'clientUserMessageId']), status: wasRunning ? 'interrupted' : turn.status, items, error: turn.error?.message ? { message: safeLinkText(turn.error.message), codexErrorInfo: null, additionalDetails: null, misalignment: null } : null, adapterMetadata: metadata });
  }
  const serialized = jsonText(out);
  if (encoder.encode(serialized).byteLength > CHAT_HISTORY_SYNC_LIMITS.documentBytes) fail('SYNC_DOCUMENT_TOO_LARGE', 'This conversation exceeds the cloud text-history budget; its complete local copy was retained.', { status: 413 });
  return out;
}
function freshState() { return { schemaVersion: 1, cursor: null, heads: Object.create(null), known: Object.create(null), outbox: [], conflicts: Object.create(null), localIds: [] }; }
function validateState(value) { if (!value) return freshState(); if (value.schemaVersion !== 1 || !object(value.heads) || !object(value.known) || !Array.isArray(value.outbox) || !object(value.conflicts) || !Array.isArray(value.localIds)) fail('SYNC_LOCAL_STATE_INVALID', 'The durable sync state could not be loaded.'); for (const key of ['heads', 'known', 'conflicts']) Object.setPrototypeOf(value[key], null); return value; }
/** Atomic read-modify-write; callback must be synchronous and never does network I/O. */
export function createIndexedDBChatHistoryStore({ indexedDB = globalThis.indexedDB, databaseName = 'chatgpt-site-history-sync-v1' } = {}) {
  if (!indexedDB?.open) fail('SYNC_LOCAL_STORAGE_UNAVAILABLE', 'IndexedDB is required for a durable account sync outbox.', { status: 503 });
  let openPromise;
  const open = () => openPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('owners')) request.result.createObjectStore('owners'); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new ChatHistorySyncError('SYNC_LOCAL_STORAGE_UNAVAILABLE', 'The durable account sync store could not be opened.', { status: 503 }));
    request.onblocked = () => reject(new ChatHistorySyncError('SYNC_LOCAL_STORAGE_BLOCKED', 'Another browser tab is blocking the sync store upgrade.', { status: 503 }));
  });
  const transaction = async (owner, updater) => {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('owners', updater ? 'readwrite' : 'readonly'), store = tx.objectStore('owners'), req = store.get(owner); let result, thrown;
      req.onsuccess = () => {
        try { const state = validateState(req.result); if (updater) { result = updater(state); if (result?.then) fail('SYNC_LOCAL_TRANSACTION_ASYNC', 'A sync-store mutation must be synchronous.'); store.put(state, owner); } else result = clone(state); }
        catch (error) { thrown = error; tx.abort(); }
      };
      tx.oncomplete = () => resolve(clone(result));
      tx.onerror = tx.onabort = () => reject(thrown ?? new ChatHistorySyncError('SYNC_LOCAL_STORAGE_UNAVAILABLE', 'The durable account outbox could not be saved.', { status: 507 }));
    });
  };
  return { load: owner => transaction(owner), transact: transaction, close: async () => (await open()).close() };
}
function identityScope(value) {
  if (!object(value) || !['ownerId', 'accountId', 'namespace'].every(key => typeof value[key] === 'string' && value[key].length && value[key].length < 512)) return null;
  return JSON.stringify([value.ownerId, value.accountId, value.namespace]);
}
function metadata(value, id) {
  if (!object(value) || value.id !== id || !Number.isSafeInteger(value.revision) || value.revision < 1 || typeof value.deleted !== 'boolean' || !Number.isSafeInteger(value.sequence) || value.sequence < 1) fail('SYNC_PROTOCOL_ERROR', 'The account history service returned invalid revision metadata.');
  return fields(value, ['id', 'revision', 'deleted', 'sequence', 'createdAt', 'updatedAt', 'documentHash']);
}
export function createChatHistorySync({ baseURL, fetchImpl = globalThis.fetch?.bind(globalThis), getIdentity, getSessionToken, store = null, now = Date.now, uuid = () => crypto.randomUUID(), onDiagnostic = () => {}, requestTimeoutMs = CHAT_HISTORY_SYNC_LIMITS.requestTimeoutMs } = {}) {
  const base = new URL(baseURL);
  if (base.username || base.password || base.search || base.hash || base.protocol !== 'https:' && !(base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname))) fail('SYNC_INVALID_CONFIGURATION', 'Use an explicit trusted account-service origin.');
  if (base.pathname !== '/') fail('SYNC_INVALID_CONFIGURATION', 'The account-service base must be an origin.');
  if (typeof fetchImpl !== 'function' || typeof getIdentity !== 'function' || typeof getSessionToken !== 'function') fail('SYNC_INVALID_CONFIGURATION', 'Verified account and transport callbacks are required.');
  const bootScope = identityScope(getIdentity());
  const stateStore = store ?? createIndexedDBChatHistoryStore();
  let serial = Promise.resolve(), disposed = false, localBaseline = null;
  let observedRevisions = new Map();
  // A reload/new engine is not the causal author of older durable intents.
  const contextId = 'context-' + crypto.randomUUID();
  const activeRequests = new Set();
  const diagnostic = (type, extra = {}) => { try { onDiagnostic({ type, ...extra }); } catch {} };
  const assertOwner = () => {
    if (disposed || !bootScope || identityScope(getIdentity()) !== bootScope) fail('SYNC_ACCOUNT_CHANGED', 'Account history sync requires the same verified boot account.', { status: 401 });
    const token = getSessionToken(); if (!tokenPattern.test(token ?? '')) fail('SYNC_AUTH_REQUIRED', 'A verified site session is required for history sync.', { status: 401 });
    return token;
  };
  const exclusive = task => { const next = serial.catch(() => {}).then(task); serial = next; return next; };
  const load = async () => { assertOwner(); const value = validateState(await stateStore.load(bootScope)); assertOwner(); return value; };
  const update = async mutate => { assertOwner(); const result = await stateStore.transact(bootScope, state => { assertOwner(); return mutate(validateState(state)); }); assertOwner(); return result; };
  const request = async (path, { method = 'GET', body, signal } = {}) => {
    const token = assertOwner(), controller = new AbortController(), timer = setTimeout(() => controller.abort(new DOMException('Account sync timed out', 'TimeoutError')), requestTimeoutMs);
    activeRequests.add(controller);
    const abort = () => controller.abort(signal.reason); if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
    try {
      const response = await fetchImpl(new URL(path, base), { method, headers: { Authorization: 'Bearer ' + token, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, credentials: 'omit', redirect: 'error', cache: 'no-store', signal: controller.signal, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      assertOwner(); const value = await response.json(); assertOwner(); return { response, value };
    } catch (error) { if (disposed || identityScope(getIdentity()) !== bootScope) assertOwner(); if (error instanceof ChatHistorySyncError) throw error; throw new ChatHistorySyncError('SYNC_NETWORK_UNAVAILABLE', 'Account history could not be synced; the durable local outbox was retained.', { retryable: true }); }
    finally { activeRequests.delete(controller); clearTimeout(timer); signal?.removeEventListener('abort', abort); }
  };
  const responseError = ({ response, value }) => new ChatHistorySyncError(value?.error?.code ?? 'SYNC_HTTP_ERROR', value?.error?.message ?? 'Account history could not be synced.', { status: response.status, retryable: response.status >= 500 || response.status === 429 });
  const newMutation = (id, method, document = null, baseRevision = 0) => ({ id, method, contextId, mutationId: 'sync-' + uuid(), baseRevision, attempted: false, createdAt: now(), ...(method === 'PUT' ? { document: clone(document) } : {}) });
  function queue(state, id, method, document, observedRevision = state.known[id]?.revision ?? 0) {
    const pending = state.outbox.filter(item => item.id === id), last = pending.at(-1);
    if (last && !last.attempted && last.contextId === contextId) { last.method = method; if (method === 'PUT') last.document = clone(document); else delete last.document; return last; }
    if (state.outbox.length >= CHAT_HISTORY_SYNC_LIMITS.queuedMutations) fail('SYNC_OUTBOX_FULL', 'The durable sync queue is full; local history was retained.', { status: 507 });
    const baseRevision = last ? last.baseRevision + 1 : observedRevision;
    if (!Number.isSafeInteger(baseRevision) || baseRevision < 0) fail('SYNC_OUTBOX_INVALID_REVISION', 'The saved mutation has no valid observed revision; its local history was retained.');
    const next = newMutation(id, method, document, baseRevision); state.outbox.push(next); return next;
  }
  async function captureInside(threads, { detectDeletes = true, initial = false } = {}) {
    if (!Array.isArray(threads) || threads.length > CHAT_HISTORY_SYNC_LIMITS.threads) fail('SYNC_INVALID_DOCUMENT', 'A bounded complete local thread snapshot is required.');
    const documents = threads.map(projectChatHistoryThread).filter(Boolean), ids = documents.map(doc => doc.id);
    if (new Set(ids).size !== ids.length) fail('SYNC_INVALID_DOCUMENT', 'Duplicate local conversation IDs.');
    const previousLocal = localBaseline;
    const result = await update(state => {
      for (const document of documents) {
        const id = document.id;
        if (previousLocal?.has(id) && equal(previousLocal.get(id), document)) continue;
        if (state.known[id]?.deleted) { state.conflicts[id] = { id, reason: 'remote-deleted', local: document, remote: null, remoteMetadata: clone(state.known[id]), createdAt: now() }; delete state.heads[id]; continue; }
        if (state.heads[id] && equal(state.heads[id], document)) continue;
        if (state.heads[id] && ((initial && (state.known[id]?.revision || state.outbox.some(item => item.id === id))) || previousLocal?.has(id) && !equal(previousLocal.get(id), state.heads[id]))) {
          state.conflicts[id] = { id, reason: initial ? 'startup-local-diverged' : 'concurrent-local-context', local: clone(document), remote: clone(state.heads[id]), remoteMetadata: clone(state.known[id] ?? { id, revision: 0, deleted: false, sequence: 0 }), createdAt: now() };
          state.outbox = state.outbox.filter(item => item.id !== id);
        }
        state.heads[id] = clone(document);
        if (state.conflicts[id]) state.conflicts[id].local = clone(document);
        else queue(state, id, 'PUT', document, observedRevisions.get(id) ?? state.known[id]?.revision ?? 0);
      }
      if (detectDeletes) for (const id of previousLocal?.keys() ?? []) if (!ids.includes(id) && !state.known[id]?.deleted) {
        const remote = state.heads[id] ?? null, known = state.known[id] ?? { id, revision: 0, deleted: false, sequence: 0 }, observed = observedRevisions.get(id) ?? 0;
        const pending = state.outbox.filter(item => item.id === id), causal = pending.some(item => item.method === 'PUT' && equal(item.document, previousLocal.get(id)));
        if (!remote || !equal(remote, previousLocal.get(id)) || known.revision !== observed && !causal) {
          state.conflicts[id] = { id, reason: 'concurrent-local-delete', local: null, remote: clone(remote), remoteMetadata: clone(known), createdAt: now() };
          state.outbox = state.outbox.filter(item => item.id !== id);
        } else { delete state.conflicts[id]; queue(state, id, 'DELETE', null, observed); }
        delete state.heads[id];
      }
      state.localIds = ids.filter(id => !state.known[id]?.deleted);
      return { queuedCount: state.outbox.length, conflictCount: Object.keys(state.conflicts).length, observed: Object.fromEntries(ids.map(id => [id, state.known[id]?.revision ?? 0])) };
    });
    localBaseline = new Map(documents.map(document => [document.id, clone(document)]));
    observedRevisions = new Map(documents.map(document => [document.id, result.observed[document.id]]));
    return { queuedCount: result.queuedCount, conflictCount: result.conflictCount };
  }
  async function adopt(remoteMetadata, document) {
    const id = safeId(remoteMetadata.id);
    return update(state => {
      const known = state.known[id], pending = state.outbox.filter(item => item.id === id);
      if ((known?.revision ?? 0) > remoteMetadata.revision) return;
      const local = state.heads[id] ?? null;
      if (remoteMetadata.deleted) {
        const retained = local ?? state.conflicts[id]?.local ?? null;
        if (retained && (pending.length || state.conflicts[id])) state.conflicts[id] = { id, reason: 'remote-deleted', local: clone(retained), remote: null, remoteMetadata: clone(remoteMetadata), createdAt: now() };
        else if (state.conflicts[id]?.local === null) delete state.conflicts[id];
        delete state.heads[id]; state.outbox = state.outbox.filter(item => item.id !== id); state.known[id] = clone(remoteMetadata); state.localIds = state.localIds.filter(value => value !== id); return;
      }
      const match = pending.findLastIndex(item => item.method === 'PUT' && item.attempted && item.baseRevision === remoteMetadata.revision - 1 && equal(item.document, document));
      if (match >= 0) { const remove = new Set(pending.slice(0, match + 1).map(item => item.mutationId)); const resolved = remove.has(state.conflicts[id]?.resolution?.mutationId); state.outbox = state.outbox.filter(item => !remove.has(item.mutationId)); state.known[id] = clone(remoteMetadata); if (resolved) { delete state.conflicts[id]; if (state.heads[id] && !equal(state.heads[id], document) && !state.outbox.some(item => item.id === id)) queue(state, id, 'PUT', state.heads[id], remoteMetadata.revision); } else if (!state.outbox.some(item => item.id === id)) state.heads[id] = clone(document); return; }
      if (local && equal(local, document)) { state.outbox = state.outbox.filter(item => item.id !== id); state.known[id] = clone(remoteMetadata); state.heads[id] = clone(document); delete state.conflicts[id]; return; }
      if (pending.length || state.conflicts[id]) {
        const resolving = state.conflicts[id];
        if (resolving?.resolution && resolving.remoteMetadata.revision === remoteMetadata.revision && resolving.remote && equal(resolving.remote, document)) { state.known[id] = clone(remoteMetadata); return; }
        if ((known?.revision ?? 0) === remoteMetadata.revision && !state.conflicts[id]) return;
        state.conflicts[id] = { id, reason: 'concurrent-update', local: clone(local), remote: clone(document), remoteMetadata: clone(remoteMetadata), createdAt: now() };
        state.outbox = state.outbox.filter(item => item.id !== id); state.known[id] = clone(remoteMetadata); diagnostic('history-sync-conflict', { conversationId: id }); return;
      }
      state.known[id] = clone(remoteMetadata); state.heads[id] = clone(document);
    });
  }
  async function fetchRemote(id, signal) {
    const result = await request('/sync/conversations/' + encodeURIComponent(safeId(id)), { signal });
    if (result.response.status === 410) { const meta = metadata(result.value.tombstone, id); if (!meta.deleted) fail('SYNC_PROTOCOL_ERROR', 'Invalid deletion tombstone.'); await adopt(meta, null); return; }
    if (!result.response.ok) throw responseError(result);
    const meta = metadata(result.value, id); if (meta.deleted) fail('SYNC_PROTOCOL_ERROR', 'A live history response cannot be deleted.');
    const document = projectChatHistoryThread(result.value.document); if (!document || document.id !== id) fail('SYNC_PROTOCOL_ERROR', 'The remote document ID does not match its history entry.');
    await adopt(meta, document);
  }
  async function pullInside({ signal } = {}) {
    let state = await load(), after = state.cursor;
    if (after === null) {
      let pageCursor = null, firstWatermark = null; const pages = new Set();
      do {
        const query = new URLSearchParams({ limit: String(CHAT_HISTORY_SYNC_LIMITS.pageSize) }); if (pageCursor) query.set('cursor', pageCursor);
        const result = await request('/sync/conversations?' + query, { signal }); if (!result.response.ok) throw responseError(result);
        const value = result.value;
        if (!Array.isArray(value.conversations) || !Number.isSafeInteger(value.cursor) || value.cursor < 0 || value.nextCursor !== null && typeof value.nextCursor !== 'string') fail('SYNC_PROTOCOL_ERROR', 'Invalid account history list.');
        firstWatermark ??= value.cursor;
        for (let index = 0; index < value.conversations.length; index += 4) await Promise.all(value.conversations.slice(index, index + 4).map(async item => { metadata(item, item.id); await fetchRemote(item.id, signal); }));
        pageCursor = value.nextCursor; if (pageCursor && pages.has(pageCursor)) fail('SYNC_PROTOCOL_ERROR', 'Account history pagination repeated a cursor.'); pages.add(pageCursor);
      } while (pageCursor);
      after = firstWatermark ?? 0;
    }
    for (let pages = 0; pages < 1000; pages++) {
      const result = await request('/sync/changes?' + new URLSearchParams({ after: String(after), limit: String(CHAT_HISTORY_SYNC_LIMITS.pageSize) }), { signal }); if (!result.response.ok) throw responseError(result);
      const value = result.value;
      if (!Array.isArray(value.changes) || !Number.isSafeInteger(value.cursor) || value.cursor < after || typeof value.hasMore !== 'boolean' || value.hasMore && value.cursor === after) fail('SYNC_PROTOCOL_ERROR', 'Invalid history change cursor.');
      let last = after;
      for (const change of value.changes) { const meta = metadata(change, change.id); if (meta.sequence <= last || meta.sequence > value.cursor) fail('SYNC_PROTOCOL_ERROR', 'History changes are not ordered.'); last = meta.sequence; if (meta.deleted) await adopt(meta, null); else await fetchRemote(meta.id, signal); }
      after = value.cursor; await update(current => { current.cursor = after; });
      if (!value.hasMore) return { cursor: after };
    }
    fail('SYNC_PROTOCOL_ERROR', 'The history change page budget was exceeded.');
  }
  async function flushInside({ signal, limit = CHAT_HISTORY_SYNC_LIMITS.flushMutations } = {}) {
    let sent = 0;
    while (sent < limit) {
      const entry = await update(state => {
        const candidate = state.outbox.find(item => !item.blocked && (!state.conflicts[item.id] || state.conflicts[item.id].resolution?.mutationId === item.mutationId)); if (!candidate) return null;
        if (!Number.isSafeInteger(candidate.baseRevision) || candidate.baseRevision < 0) fail('SYNC_OUTBOX_INVALID_REVISION', 'The saved mutation has no valid observed revision; refresh preserves its local copy.');
        candidate.attempted = true; return clone(candidate);
      });
      if (!entry) return { sent, pending: (await load()).outbox.length };
      let result;
      try { result = await request('/sync/conversations/' + encodeURIComponent(entry.id), { method: entry.method, body: { baseRevision: entry.baseRevision, mutationId: entry.mutationId, ...(entry.method === 'PUT' ? { document: entry.document } : {}) }, signal }); }
      catch (error) { diagnostic('history-sync-deferred', { code: error.code ?? 'SYNC_NETWORK_UNAVAILABLE' }); throw error; }
      sent++;
      if (result.response.status === 409) {
        if (result.value.error?.code === 'SYNC_MUTATION_ID_CONFLICT') { await update(state => { const item = state.outbox.find(value => value.mutationId === entry.mutationId); if (item) item.blocked = 'SYNC_MUTATION_ID_CONFLICT'; }); throw responseError(result); }
        await fetchRemote(entry.id, signal); continue;
      }
      if (!result.response.ok) {
        const error = responseError(result);
        if (!error.retryable && ![401, 403].includes(error.status)) await update(state => { const item = state.outbox.find(value => value.mutationId === entry.mutationId); if (item) item.blocked = error.code; });
        throw error;
      }
      const receipt = metadata(result.value, entry.id);
      if (receipt.deleted !== (entry.method === 'DELETE') || receipt.revision !== entry.baseRevision + 1 || typeof result.value.replayed !== 'boolean') fail('SYNC_PROTOCOL_ERROR', 'The history mutation acknowledgement did not match the durable request.');
      await update(state => {
        state.outbox = state.outbox.filter(value => value.mutationId !== entry.mutationId);
        if ((state.known[entry.id]?.revision ?? 0) <= receipt.revision) state.known[entry.id] = receipt;
        const conflict = state.conflicts[entry.id];
        if (receipt.deleted) {
          const latest = state.heads[entry.id] ?? null;
          if (latest) state.conflicts[entry.id] = { id: entry.id, reason: 'remote-deleted', local: clone(latest), remote: null, remoteMetadata: clone(receipt), createdAt: now() };
          else if (conflict?.resolution?.mutationId === entry.mutationId) delete state.conflicts[entry.id];
          state.outbox = state.outbox.filter(value => value.id !== entry.id);
          delete state.heads[entry.id]; state.localIds = state.localIds.filter(value => value !== entry.id);
        } else if (conflict?.resolution?.mutationId === entry.mutationId) {
          delete state.conflicts[entry.id];
          if (state.heads[entry.id] && !equal(state.heads[entry.id], entry.document)) queue(state, entry.id, 'PUT', state.heads[entry.id], receipt.revision);
        }
      });
      if (entry.method === 'PUT' && localBaseline?.has(entry.id) && equal(localBaseline.get(entry.id), entry.document)) observedRevisions.set(entry.id, receipt.revision);
      if (entry.method === 'DELETE') observedRevisions.delete(entry.id);
    }
    return { sent, pending: (await load()).outbox.length };
  }
  async function snapshotInside(localThreads = []) {
    const state = await load(), originals = new Map();
    for (const thread of localThreads) { const doc = projectChatHistoryThread(thread); if (doc) originals.set(doc.id, { thread, doc }); }
    const threads = Object.values(state.heads).map(doc => { const original = originals.get(doc.id); return clone(original && equal(original.doc, doc) ? original.thread : doc); });
    return { threads, cursor: state.cursor, queuedCount: state.outbox.length, conflicts: clone(Object.values(state.conflicts)) };
  }
  async function initializeInside(localThreads, { signal } = {}) {
    await captureInside(localThreads, { detectDeletes: false, initial: true });
    let deferred = null;
    try { await pullInside({ signal }); await flushInside({ signal }); }
    catch (error) { if (!error.retryable) throw error; deferred = { code: error.code, retryable: true }; diagnostic('history-sync-deferred', deferred); }
    const result = await snapshotInside(localThreads);
    // Returning a merged snapshot is not proof that the caller could persist it.
    // Only acknowledgeApplied() advances the observed baseline to cloud records.
    return { ...result, deferred };
  }
  return {
    initialize: (localThreads, options) => { const input = clone(localThreads); return exclusive(() => initializeInside(input, options)); },
    capture: (localThreads, options) => { const input = clone(localThreads); return exclusive(() => captureInside(input, options)); },
    acknowledgeApplied: localThreads => {
      const input = clone(localThreads);
      return exclusive(async () => {
        if (!Array.isArray(input)) fail('SYNC_INVALID_DOCUMENT', 'A complete applied local thread snapshot is required.');
        const documents = input.map(projectChatHistoryThread).filter(Boolean);
        if (new Set(documents.map(document => document.id)).size !== documents.length) fail('SYNC_INVALID_DOCUMENT', 'Duplicate applied conversation IDs.');
        const revisions = await update(state => { state.localIds = documents.map(document => document.id); return Object.fromEntries(documents.map(document => [document.id, state.known[document.id]?.revision ?? 0])); });
        localBaseline = new Map(documents.map(document => [document.id, document]));
        observedRevisions = new Map(documents.map(document => [document.id, revisions[document.id]]));
        return { applied: documents.length };
      });
    },
    pull: options => exclusive(() => pullInside(options)),
    flush: options => exclusive(() => flushInside(options)),
    snapshot: localThreads => { const input = clone(localThreads); return exclusive(() => snapshotInside(input)); },
    synchronize: (localThreads, options = {}) => { const input = clone(localThreads); return exclusive(async () => { if (input) await captureInside(input); await pullInside(options); await flushInside(options); return snapshotInside(input ?? []); }); },
    conflicts: () => exclusive(async () => clone(Object.values((await load()).conflicts))),
    resolveConflict: (id, decision) => exclusive(async () => update(state => {
      const conflict = state.conflicts[safeId(id)]; if (!conflict) fail('SYNC_CONFLICT_NOT_FOUND', 'No durable history conflict exists.');
      if (decision === 'remote') {
        if (conflict.remoteMetadata.deleted || conflict.remote === null) delete state.heads[id]; else state.heads[id] = clone(conflict.remote);
        state.outbox = state.outbox.filter(item => item.id !== id); delete state.conflicts[id]; return { id, decision, pending: false };
      }
      if (decision !== 'local') fail('SYNC_INVALID_CONFLICT_DECISION', 'Choose the current remote history or explicitly retain the local history.');
      if (conflict.remoteMetadata.deleted && conflict.local !== null) fail('SYNC_CONVERSATION_DELETED', 'A deleted conversation cannot be resurrected; retain the conflict copy or explicitly create a new conversation ID.');
      if (conflict.remoteMetadata.deleted && conflict.local === null) { delete state.heads[id]; delete state.conflicts[id]; return { id, decision, pending: false }; }
      // A null local branch means an explicit local DELETE, never PUT null.
      if (conflict.local === null) delete state.heads[id]; else state.heads[id] = clone(conflict.local);
      state.outbox = state.outbox.filter(item => item.id !== id);
      const entry = queue(state, id, conflict.local === null ? 'DELETE' : 'PUT', conflict.local, conflict.remoteMetadata.revision);
      conflict.resolution = { decision, mutationId: entry.mutationId, baseRevision: entry.baseRevision };
      return { id, decision, mutationId: entry.mutationId, pending: true };
    })),
    dispose: () => { disposed = true; for (const controller of activeRequests) controller.abort(new DOMException('Account history sync disposed', 'AbortError')); activeRequests.clear(); },
    capabilities: Object.freeze({ accountHistory: true, fileBytes: false, remoteTaskAutoResume: false, durableOutbox: true, conflictPreservation: true }),
  };
}
