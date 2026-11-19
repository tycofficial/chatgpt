/** Source g2p6 GET/PATCH shapes backed by real browser-local preferences. */
import { getLocalAccountStorageKey, getPrototypeLocalAuthGeneration, isPrototypeLocalSession } from './local-identity.mjs?v=63a859e6c683b1b3';
import { getSiteAccount } from './site-account.mjs?v=63a859e6c683b1b3';

const key = 'original-client-prototype-user-preferences:v1';
// Identity namespaces belong to the booted account; switching accounts reloads
// that provider. An old provider must not keep reading its previous user's key.
const bootOwner = getSiteAccount()?.id ?? null;
const bootNamespace = getLocalAccountStorageKey(key);
const bootGeneration = getPrototypeLocalAuthGeneration();
function assertCurrent(operation) {
  if ((getSiteAccount()?.id ?? null) !== operation.owner || operation.owner !== bootOwner ||
      getLocalAccountStorageKey(key) !== operation.namespace || operation.namespace !== bootNamespace ||
      getPrototypeLocalAuthGeneration() !== bootGeneration ||
      (operation.owner === null) !== (operation.namespace === key + ':guest') ||
      (operation.owner !== null && !isPrototypeLocalSession())) {
    throw Object.assign(Error('The active site account changed during preference access'), { status: 409, code: 'LOCAL_PREFERENCES_ACCOUNT_CHANGED' });
  }
}
function capture() {
  const operation = { namespace: getLocalAccountStorageKey(key), owner: getSiteAccount()?.id ?? null, storage: globalThis.localStorage };
  assertCurrent(operation);
  return operation;
}
function read(operation) {
  const value = JSON.parse(operation.storage.getItem(operation.namespace) ?? '{}');
  assertCurrent(operation);
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}
function save(operation, value) {
  const serialized = JSON.stringify(value);
  const write = operation.storage.setItem;
  assertCurrent(operation);
  write.call(operation.storage, operation.namespace, serialized);
  assertCurrent(operation);
}
export function readLocalUserPreferences() {
  let state;
  try { state = read(capture()); } catch { state = {}; }
  return { settings: state.settings ?? {}, announcements: state.announcements ?? {}, eligible_announcements: [], flags: {} };
}
export function updateLocalUserPreference(feature, value) {
  if (!feature || !/^[a-zA-Z0-9_.-]+$/.test(feature)) throw Error('Invalid local preference key');
  const operation = capture(), state = read(operation);
  state.settings = { ...state.settings, [feature]: value }; save(operation, state);
  return state.settings;
}
export function acknowledgeLocalAnnouncement(id) {
  if (typeof id !== 'string' || !id) throw Error('Announcement ID is required');
  const operation = capture(), state = read(operation);
  state.announcements = { ...state.announcements, [id]: Date.now() }; save(operation, state);
  return state.announcements;
}
