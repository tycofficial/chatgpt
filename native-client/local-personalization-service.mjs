/** Browser-local Chat/Work text preferences; no original private service. */
export const USER_SYSTEM_MESSAGES_STORAGE_KEY = 'original-client-user-system-messages:v1';
export const USER_SYSTEM_MESSAGE_FIELDS = Object.freeze(['name_user_message', 'role_user_message', 'traits_model_message', 'other_user_message']);
export const MAX_USER_SYSTEM_MESSAGE_LENGTH = 1500;
const fields = new Set(['enabled', ...USER_SYSTEM_MESSAGE_FIELDS]);
const defaultRecord = () => ({ enabled: false, name_user_message: '', role_user_message: '', traits_model_message: '', other_user_message: '' });
const cloneRecord = value => ({ enabled: value.enabled, name_user_message: value.name_user_message, role_user_message: value.role_user_message, traits_model_message: value.traits_model_message, other_user_message: value.other_user_message });
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.prototype.toString.call(value) === '[object Object]';
const sameIdentity = (a, b) => a.accountId === b.accountId && a.userId === b.userId && (a.accountUserId ?? null) === (b.accountUserId ?? null);
const sync = value => { if (value && typeof value.then === 'function') throw Error('Synchronous storage is required'); return value; };
export class PersonalizationServiceError extends Error {
  constructor(code, message, status = 400, details = {}) { super(message); this.name = 'PersonalizationServiceError'; this.code = code; this.status = status; Object.assign(this, details); }
}
const fail = (code, message, status, details) => new PersonalizationServiceError(code, message, status, details);
function validatePatch(value, complete = false) {
  if (!isObject(value) || Object.keys(value).some(key => !fields.has(key))) throw fail('PERSONALIZATION_INVALID_FIELDS', 'Unsupported personalization fields.', 400);
  if (complete && [...fields].some(key => !Object.hasOwn(value, key))) throw fail('PERSONALIZATION_INVALID_FIELDS', 'Incomplete personalization record.', 400);
  for (const key of Object.keys(value)) {
    if (key === 'enabled') {
      if (typeof value[key] !== 'boolean') throw fail('PERSONALIZATION_INVALID_VALUE', 'Enabled must be a boolean.', 400, { field: key });
    } else if (typeof value[key] !== 'string') throw fail('PERSONALIZATION_INVALID_VALUE', 'Personalization text must be a string.', 400, { field: key });
    else if (value[key].length > MAX_USER_SYSTEM_MESSAGE_LENGTH) throw fail('PERSONALIZATION_TEXT_TOO_LONG', 'Personalization text exceeds 1500 characters.', 422, { field: key });
  }
  return value;
}
/**
 * storage must implement synchronous getItem/setItem/removeItem.
 * getIdentity is an authoritative current identity provider, never request-body claims.
 * getStorageKey(baseKey, identity) should use the existing account namespace policy.
 */
export function createLocalPersonalizationService({ storage, getIdentity, getStorageKey, onDiagnostic = () => {} }) {
  if (!storage || ['getItem', 'setItem', 'removeItem'].some(key => typeof storage[key] !== 'function') || typeof getIdentity !== 'function' || typeof getStorageKey !== 'function') throw TypeError('Storage and authoritative identity/namespace providers are required');
  const diagnose = event => { try { onDiagnostic(event); } catch {} };
  const checkSignal = signal => signal?.throwIfAborted();
  function captureOwner() {
    const value = getIdentity();
    if (!value || typeof value.accountId !== 'string' || !value.accountId.trim() || typeof value.userId !== 'string' || !value.userId.trim()) throw fail('PERSONALIZATION_IDENTITY_REQUIRED', 'An active site identity is required.', 401);
    const owner = { accountId: value.accountId, userId: value.userId, ...(typeof value.accountUserId === 'string' ? { accountUserId: value.accountUserId } : {}) };
    const key = getStorageKey(USER_SYSTEM_MESSAGES_STORAGE_KEY, owner);
    if (typeof key !== 'string' || !key) throw fail('PERSONALIZATION_STORAGE_UNAVAILABLE', 'Personalization storage is unavailable.', 500);
    return { ...owner, key };
  }
  function assertOwner(owner, signal) {
    checkSignal(signal);
    let current;
    try { current = captureOwner(); } catch { throw fail('PERSONALIZATION_ACCOUNT_CHANGED', 'The active account changed.', 409); }
    if (!sameIdentity(owner, current) || owner.key !== current.key) throw fail('PERSONALIZATION_ACCOUNT_CHANGED', 'The active account changed.', 409);
  }
  function readRaw(owner, signal) {
    assertOwner(owner, signal);
    let raw;
    try { raw = sync(storage.getItem(owner.key)); } catch { throw fail('PERSONALIZATION_STORAGE_UNAVAILABLE', 'Could not read personalization.', 500); }
    assertOwner(owner, signal);
    if (raw != null && typeof raw !== 'string') throw fail('PERSONALIZATION_STORAGE_CORRUPTED', 'Stored personalization is invalid.', 500);
    return raw ?? null;
  }
  function decode(raw, owner) {
    if (raw === null) return defaultRecord();
    let stored;
    try { stored = JSON.parse(raw); } catch { throw fail('PERSONALIZATION_STORAGE_CORRUPTED', 'Stored personalization is invalid.', 500); }
    if (!isObject(stored) || stored.version !== 1 || !isObject(stored.owner) || !isObject(stored.record)) throw fail('PERSONALIZATION_STORAGE_CORRUPTED', 'Stored personalization is invalid.', 500);
    if (!sameIdentity(owner, stored.owner)) throw fail('PERSONALIZATION_OWNER_MISMATCH', 'Stored personalization belongs to another identity.', 409);
    try { validatePatch(stored.record, true); } catch { throw fail('PERSONALIZATION_STORAGE_CORRUPTED', 'Stored personalization is invalid.', 500); }
    return cloneRecord(stored.record);
  }
  function readForOwner(owner, signal) { return decode(readRaw(owner, signal), owner); }
  function rollback(owner, oldRaw) {
    try { if (sync(storage.getItem(owner.key)) === oldRaw || oldRaw === null && sync(storage.getItem(owner.key)) == null) return true; } catch {}
    try {
      if (oldRaw === null) sync(storage.removeItem(owner.key)); else sync(storage.setItem(owner.key, oldRaw));
      const current = sync(storage.getItem(owner.key));
      return oldRaw === null ? current == null : current === oldRaw;
    } catch { return false; }
  }
  function writeForOwner(owner, patch, signal) {
    validatePatch(patch); assertOwner(owner, signal);
    const oldRaw = readRaw(owner, signal), previous = decode(oldRaw, owner), next = { ...previous };
    for (const key of Object.keys(patch)) next[key] = patch[key];
    if (JSON.stringify(previous) === JSON.stringify(next)) return cloneRecord(next);
    const { key, ...identity } = owner;
    const raw = JSON.stringify({ version: 1, owner: identity, record: next });
    try { assertOwner(owner, signal); sync(storage.setItem(key, raw)); assertOwner(owner, signal); }
    catch (error) {
      const rolledBack = rollback(owner, oldRaw);
      diagnose({ type: 'personalization-write-failed', code: error?.code ?? 'PERSONALIZATION_STORAGE_UNAVAILABLE', rollbackSucceeded: rolledBack });
      if (rolledBack && (error instanceof PersonalizationServiceError || error?.name === 'AbortError')) throw error;
      throw fail('PERSONALIZATION_STORAGE_UNAVAILABLE', 'Could not save personalization.', 500, { rollbackFailed: !rolledBack });
    }
    diagnose({ type: 'personalization-saved', fields: Object.keys(patch) });
    return cloneRecord(next);
  }
  function readUserSystemMessages({ signal } = {}) { checkSignal(signal); return readForOwner(captureOwner(), signal); }
  function patchUserSystemMessages(patch, { signal } = {}) { checkSignal(signal); return writeForOwner(captureOwner(), patch, signal); }
  function getCustomInstructions({ surface, signal } = {}) {
    // Explicit opt-in surfaces: this profile is not Codex AGENTS, Dot behavior, or project instructions.
    if (surface !== 'chat' && surface !== 'work') return '';
    const record = readUserSystemMessages({ signal });
    if (!record.enabled) return '';
    // Preserve native field associations and exact user values; no inferred persona prompt.
    const context = {};
    for (const key of USER_SYSTEM_MESSAGE_FIELDS) {
      if (record[key].trim().length > 0) context[key] = record[key];
    }
    return Object.keys(context).length ? JSON.stringify(context) : '';
  }
  const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  async function handle(request, adapterPath) {
    const path = adapterPath ?? new URL(request.url).pathname.replace(/^\/(?:__codex-api|backend-api)(?=\/)/, '');
    if (!/^\/user_system_messages\/?$/.test(path) || !['GET', 'PATCH'].includes(request.method)) return null;
    try {
      checkSignal(request.signal); const owner = captureOwner(), requestedAccount = request.headers.get('ChatGPT-Account-ID');
      if (requestedAccount !== null && requestedAccount !== owner.accountId) throw fail('PERSONALIZATION_ACCOUNT_MISMATCH', 'The requested account is not active.', 403);
      if (request.method === 'GET') return json(readForOwner(owner, request.signal));
      let patch;
      try { patch = await request.json(); } catch { throw fail('PERSONALIZATION_INVALID_JSON', 'Personalization must be a JSON object.', 400); }
      assertOwner(owner, request.signal);
      return json(writeForOwner(owner, patch, request.signal));
    } catch (error) {
      if (error?.name === 'AbortError') throw error;
      const known = error instanceof PersonalizationServiceError;
      const code = known ? error.code : 'PERSONALIZATION_STORAGE_UNAVAILABLE', status = known ? error.status : 500;
      diagnose({ type: 'personalization-request-failed', method: request.method, code, status });
      return json({ error: { code, message: known ? error.message : 'Personalization is unavailable.', ...(known && fields.has(error.field) ? { field: error.field } : {}) } }, status);
    }
  }
  return Object.freeze({
    source: Object.freeze({ provider: 'browser-local-personalization', textFieldsOnly: true, originalPrivatePromptAvailable: false, personalityCatalogAvailable: false, maxTextLength: MAX_USER_SYSTEM_MESSAGE_LENGTH, surfaces: Object.freeze(['chat', 'work']) }),
    handle, readUserSystemMessages, patchUserSystemMessages, getCustomInstructions,
  });
}