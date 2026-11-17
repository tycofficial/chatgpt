/** Browser-local Chat/Work text and four source-known communication traits.
 * Catalog wording and request guidance are a declared local implementation,
 * not the original private personality service or hidden model prompt.
 */
export const USER_SYSTEM_MESSAGES_STORAGE_KEY = 'original-client-user-system-messages:v1';
export const USER_SYSTEM_MESSAGE_FIELDS = Object.freeze(['name_user_message', 'role_user_message', 'traits_model_message', 'other_user_message']);
export const MAX_USER_SYSTEM_MESSAGE_LENGTH = 1500;
export const PERSONALITY_TRAIT_KEYS = Object.freeze(['warm', 'enthusiastic', 'emoji', 'scannable']);
const textFields = new Set(['enabled', ...USER_SYSTEM_MESSAGE_FIELDS]);
const fields = new Set([...textFields, 'personality_traits']);
const traitKeys = new Set(PERSONALITY_TRAIT_KEYS);
const traitLevels = new Set(['less', 'default', 'more']);
const labels = Object.freeze({
  en: Object.freeze({ warm: 'Warm', enthusiastic: 'Enthusiastic', emoji: 'Emojis', scannable: 'Headers & Lists', less: 'Less', default: 'Default', more: 'More' }),
  zh: Object.freeze({ warm: '温暖', enthusiastic: '热情', emoji: '表情符号', scannable: '标题和列表', less: '更少', default: '默认', more: '更多' }),
});
// These are authored instructions for the documented directions. They never
// change tool permissions, model selection, requested output format or memory.
const traitGuidance = Object.freeze({
  warm: Object.freeze({ less: 'Use a more emotionally neutral tone while keeping the answer equally complete.', more: 'Use a warmer, sincere and friendly tone.' }),
  enthusiastic: Object.freeze({ less: 'Use calmer, more objective language without reducing completeness.', more: 'Show more enthusiasm, curiosity and active interest.' }),
  emoji: Object.freeze({ less: 'Use emojis sparingly in conversation and omit them in informational answers.', more: 'Use slightly more emojis where appropriate.' }),
  scannable: Object.freeze({ less: 'Use fewer formatting elements and favor connected paragraphs.', more: 'Use headings, lists and tables more often when they help.' }),
});
const defaultRecord = () => ({ enabled: false, name_user_message: '', role_user_message: '', traits_model_message: '', other_user_message: '' });
const cloneRecord = value => ({ enabled: value.enabled, name_user_message: value.name_user_message, role_user_message: value.role_user_message, traits_model_message: value.traits_model_message, other_user_message: value.other_user_message, ...(Object.hasOwn(value, 'personality_traits') ? { personality_traits: { ...value.personality_traits } } : {}) });
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.prototype.toString.call(value) === '[object Object]';
const sameIdentity = (a, b) => a.accountId === b.accountId && a.userId === b.userId && (a.accountUserId ?? null) === (b.accountUserId ?? null);
const sync = value => { if (value && typeof value.then === 'function') throw Error('Synchronous storage is required'); return value; };
export class PersonalizationServiceError extends Error {
  constructor(code, message, status = 400, details = {}) { super(message); this.name = 'PersonalizationServiceError'; this.code = code; this.status = status; Object.assign(this, details); }
}
const fail = (code, message, status, details) => new PersonalizationServiceError(code, message, status, details);
function validatePatch(value, complete = false) {
  if (!isObject(value) || Object.keys(value).some(key => !fields.has(key))) throw fail('PERSONALIZATION_INVALID_FIELDS', 'Unsupported personalization fields.', 400);
  if (complete && [...textFields].some(key => !Object.hasOwn(value, key))) throw fail('PERSONALIZATION_INVALID_FIELDS', 'Incomplete personalization record.', 400);
  for (const key of Object.keys(value)) {
    if (key === 'enabled') {
      if (typeof value[key] !== 'boolean') throw fail('PERSONALIZATION_INVALID_VALUE', 'Enabled must be a boolean.', 400, { field: key });
    } else if (key === 'personality_traits') {
      const traits = value[key];
      if (!isObject(traits) || Object.keys(traits).some(trait => !traitKeys.has(trait) || !traitLevels.has(traits[trait]))) throw fail('PERSONALIZATION_INVALID_TRAITS', 'Unsupported communication trait or level.', 400, { field: key });
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
    if (!isObject(stored) || ![1, 2].includes(stored.version) || !isObject(stored.owner) || !isObject(stored.record)) throw fail('PERSONALIZATION_STORAGE_CORRUPTED', 'Stored personalization is invalid.', 500);
    if ((stored.version === 2) !== Object.hasOwn(stored.record, 'personality_traits')) throw fail('PERSONALIZATION_STORAGE_CORRUPTED', 'Stored personalization is invalid.', 500);
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
    const oldRaw = readRaw(owner, signal), previous = decode(oldRaw, owner), next = cloneRecord(previous);
    for (const key of Object.keys(patch)) {
      if (key === 'personality_traits') {
        if (Object.hasOwn(previous, key) || Object.keys(patch[key]).length) next[key] = { ...previous[key], ...patch[key] };
      } else next[key] = patch[key];
    }
    if (JSON.stringify(previous) === JSON.stringify(next)) return cloneRecord(next);
    const { key, ...identity } = owner;
    const raw = JSON.stringify({ version: Object.hasOwn(next, 'personality_traits') ? 2 : 1, owner: identity, record: next });
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
  function customText(record) {
    if (!record.enabled) return '';
    const context = {};
    for (const key of USER_SYSTEM_MESSAGE_FIELDS) {
      if (record[key].trim().length > 0) context[key] = record[key];
    }
    return Object.keys(context).length ? JSON.stringify(context) : '';
  }
  function getCustomInstructions({ surface, signal } = {}) {
    // Preserve the existing exact four-key JSON interface for legacy callers.
    if (surface !== 'chat' && surface !== 'work') return '';
    return customText(readUserSystemMessages({ signal }));
  }
  function getRequestInstructions({ surface, signal } = {}) {
    // Local policy: disabled retains both text and traits but applies neither.
    // A default trait contributes no authored guidance. This is not a claim
    // about the original private backend's enabled/default prompt semantics.
    if (surface !== 'chat' && surface !== 'work') return '';
    const owner = captureOwner(), record = readForOwner(owner, signal);
    const text = customText(record), directions = [];
    if (record.enabled) for (const key of PERSONALITY_TRAIT_KEYS) {
      const level = record.personality_traits?.[key];
      if (level === 'less' || level === 'more') directions.push(traitGuidance[key][level]);
    }
    const guidance = directions.length ? 'Apply these communication preferences when compatible with the task and requested output format:\n' + directions.map(value => '- ' + value).join('\n') : '';
    assertOwner(owner, signal);
    return [text, guidance].filter(Boolean).join('\n\n');
  }
  function readPersonalityTraitTypes({ locale = 'en', signal } = {}) {
    const owner = captureOwner(); assertOwner(owner, signal);
    const words = /^(?:zh|zh-CN|zh-Hans(?:-CN)?)$/i.test(locale) ? labels.zh : labels.en;
    const result = { trait_types: PERSONALITY_TRAIT_KEYS.map(key => ({ key, label: words[key], deprecated: false, levels: ['less', 'default', 'more'].map(level => ({ key: level, option_label: words[level], description: '' })) })) };
    assertOwner(owner, signal);
    return result;
  }
  const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  async function handle(request, adapterPath) {
    const path = adapterPath ?? new URL(request.url).pathname.replace(/^\/(?:__codex-api|backend-api)(?=\/)/, '');
    const isProfile = /^\/user_system_messages\/?$/.test(path);
    const isTraits = /^\/personality_trait_types\/?$/.test(path);
    if (!(isProfile && ['GET', 'PATCH'].includes(request.method) || isTraits && request.method === 'GET')) return null;
    try {
      checkSignal(request.signal); const owner = captureOwner(), requestedAccount = request.headers.get('ChatGPT-Account-ID');
      if (requestedAccount !== null && requestedAccount !== owner.accountId) throw fail('PERSONALIZATION_ACCOUNT_MISMATCH', 'The requested account is not active.', 403);
      if (isTraits) {
        const catalog = readPersonalityTraitTypes({ locale: request.headers.get('OAI-Language') ?? 'en', signal: request.signal });
        assertOwner(owner, request.signal);
        return json(catalog);
      }
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
    source: Object.freeze({ provider: 'browser-local-personalization', textFieldsOnly: false, originalPrivatePromptAvailable: false, personalityCatalogAvailable: false, traitCatalogAvailable: true, traitKeys: PERSONALITY_TRAIT_KEYS, traitCatalogSource: 'public-source-keys/official-help-labels/local-provider', traitGuidanceSource: 'authored-local-guidance-from-documented-effects', enabledFalsePolicy: 'retain-text-and-traits/apply-neither', defaultTraitPolicy: 'omit-local-trait-guidance', maxTextLength: MAX_USER_SYSTEM_MESSAGE_LENGTH, surfaces: Object.freeze(['chat', 'work']) }),
    handle, readUserSystemMessages, patchUserSystemMessages, getCustomInstructions, getRequestInstructions, readPersonalityTraitTypes,
  });
}
