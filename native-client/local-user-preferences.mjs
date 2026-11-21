/** Source g2p6 GET/PATCH shapes backed by real browser-local preferences. */
import { getLocalAccountStorageKey, isPrototypeLocalSession } from './local-identity.mjs?v=dea77d65adc42752';
import { getSiteAccount, hasModelSelectionAccess } from './site-account.mjs?v=dea77d65adc42752';

const key = 'original-client-prototype-user-preferences:v1';
const effortVisibilityKey = 'model_picker_reasoning_effort_visibility';
const workEfforts = Object.freeze(['low', 'medium', 'high', 'xhigh', 'max', 'ultra']);
function defaultEffortVisibility() {
  return { enabled: [...workEfforts], source: 'default', uses_defaults: true };
}
function withEffortOverrides(previous, overrides) {
  const enabled = workEfforts.filter(effort => typeof overrides[effort] === 'boolean'
    ? overrides[effort] : previous.enabled.includes(effort));
  return { enabled, source: 'user', uses_defaults: false };
}
function readEffortVisibility(value) {
  const defaults = defaultEffortVisibility();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults;
  if (Array.isArray(value.enabled) && ['default', 'migrated', 'user'].includes(value.source) && typeof value.uses_defaults === 'boolean') {
    return { enabled: workEfforts.filter(effort => value.enabled.includes(effort)), source: value.source, uses_defaults: value.uses_defaults };
  }
  return withEffortOverrides(defaults, value);
}
function visibleSettings(saved) {
  const settings = { ...saved };
  if (hasModelSelectionAccess()) settings[effortVisibilityKey] = readEffortVisibility(settings[effortVisibilityKey]);
  else delete settings[effortVisibilityKey];
  return settings;
}
// Identity namespaces belong to the booted account; switching accounts reloads
// that provider. An old provider must not keep reading its previous user's key.
const bootOwner = getSiteAccount()?.id ?? null;
const bootNamespace = getLocalAccountStorageKey(key);
function assertCurrent(operation) {
  if ((getSiteAccount()?.id ?? null) !== operation.owner || operation.owner !== bootOwner ||
      getLocalAccountStorageKey(key) !== operation.namespace || operation.namespace !== bootNamespace ||
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
  try { state = read(capture()); } catch { /* The account binding or storage could be unavailable. */ }
  return { settings: state ? visibleSettings(state.settings) : {}, announcements: state?.announcements ?? {}, eligible_announcements: [], flags: {} };
}
export function updateLocalUserPreference(feature, value) {
  if (!feature || !/^[a-zA-Z0-9_.-]+$/.test(feature)) throw Error('Invalid local preference key');
  const operation = capture(), state = read(operation);
  if (feature === effortVisibilityKey) {
    if (!hasModelSelectionAccess()) return visibleSettings(state.settings);
    if (value === null) value = defaultEffortVisibility();
    else {
      if (!value || typeof value !== 'object' || Array.isArray(value) || Object.values(value).some(flag => typeof flag !== 'boolean')) throw Error('Invalid reasoning effort visibility preference');
      value = withEffortOverrides(readEffortVisibility(state.settings?.[effortVisibilityKey]), value);
    }
  }
  state.settings = { ...state.settings, [feature]: value }; save(operation, state);
  return visibleSettings(state.settings);
}
export function acknowledgeLocalAnnouncement(id) {
  if (typeof id !== 'string' || !id) throw Error('Announcement ID is required');
  const operation = capture(), state = read(operation);
  state.announcements = { ...state.announcements, [id]: Date.now() }; save(operation, state);
  return state.announcements;
}
