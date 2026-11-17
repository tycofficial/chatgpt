import * as catalog from '../model-catalog.js?v=af4b4c8d85347af9';
import { createModelCatalogAdapter } from './model-catalog-adapter.mjs?v=af4b4c8d85347af9';
import { getPrototypeStatsigUser, isPrototypeLocalSession } from './local-identity.mjs?v=af4b4c8d85347af9';
import { hasModelSelectionAccess } from './site-account.mjs?v=af4b4c8d85347af9';
const models = createModelCatalogAdapter(catalog);
let readLibraryAvailability = () => false;
/** The Library gate is enabled only after its real local file provider exists. */
export function setLocalLibraryAvailability(reader) {
  if (typeof reader !== 'function') throw new TypeError('A real Library availability reader is required');
  readLibraryAvailability = reader;
}
// Same public _DJB2 algorithm as original module MEQB (Statsig key lookup).
function hash(name) { let value = 0; for (let index = 0; index < name.length; index++) value = ((value << 5) - value + name.charCodeAt(index)) | 0; return String(value >>> 0); }
export function getPrototypeConfiguration(user = getPrototypeStatsigUser()) {
  if (!user || typeof user !== 'object' || Array.isArray(user)) user = getPrototypeStatsigUser();
  const slider = { name: '423260384', value: models.getSliderModelsConfig(), rule_id: 'local-adapter', secondary_exposures: [], adapter_source: 'model-catalog.js' };
  // Original khOd.b -> d1ji.T: observed saved rail is browser:w-13 (52px).
  // This selects the captured public layout; it grants no account or cloud rights.
  const rail = { name: '3085093835', value: true, rule_id: 'local-observed-public-layout', secondary_exposures: [], adapter_source: 'captured-public-ui-layout' };
  const localWork = { name: '1625797156', value: isPrototypeLocalSession(), rule_id: 'local-text-provider', secondary_exposures: [], adapter_source: 'local-app-server-not-openai-cloud' };
  const localDots = { name: '1202965598', value: isPrototypeLocalSession(), rule_id: 'site-local-dot-provider', secondary_exposures: [], adapter_source: 'public-original-dot-ui-with-local-profile-service' };
  const localLibrary = { name: '224248639', value: isPrototypeLocalSession() && readLibraryAvailability() === true, rule_id: 'site-local-library-provider', secondary_exposures: [], adapter_source: 'original-library-ui-with-browser-origin-files' };
  // User-selected source layout: keep Chat and Work as separate native modes.
  // rbaa.k/vYe0.X: all captured source screens use the original zh-CN catalog.
  const i18n = { name: '72216192', value: { enable_i18n: true }, rule_id: 'local-observed-language', secondary_exposures: [], explicit_parameters: ['enable_i18n'], adapter_source: 'captured-public-zh-CN-ui' };
  const pickerLayer = { name: '3040264819', value: { merged_picker: false }, rule_id: 'user-requested-separated-chat-work', secondary_exposures: [], explicit_parameters: ['merged_picker'], adapter_source: 'user-requested-original-separate-mode-layout' };
  // Zplx/osfW require 536305374 for saving/restoring Ultra. j44z requires
  // 1186680773 before Xvtr may keep Ultra in the RPC model capability list.
  const ultraAccess = hasModelSelectionAccess();
  const ultraSelection = { name: '536305374', value: ultraAccess, rule_id: 'site-ultra-orchestration', secondary_exposures: [], adapter_source: 'site-parallel-agents' };
  const ultraCatalog = { name: '1186680773', value: ultraAccess, rule_id: 'site-ultra-orchestration', secondary_exposures: [], adapter_source: 'site-parallel-agents' };
  return {
    has_updates: true, time: Date.now(), hash_used: 'none',
    user: structuredClone(user), evaluated_keys: { userID: user.userID, customIDs: user.customIDs },
    feature_gates: { '3085093835': rail, [hash('3085093835')]: rail, '1625797156': localWork, [hash('1625797156')]: localWork, '1202965598': localDots, [hash('1202965598')]: localDots, '224248639': localLibrary, [hash('224248639')]: localLibrary, '536305374': ultraSelection, [hash('536305374')]: ultraSelection, '1186680773': ultraCatalog, [hash('1186680773')]: ultraCatalog },
    dynamic_configs: { '423260384': slider, [hash('423260384')]: slider },
    layer_configs: { '3040264819': pickerLayer, [hash('3040264819')]: pickerLayer, '72216192': i18n, [hash('72216192')]: i18n }, param_stores: {}, sdkInfo: {}, sdkParams: {}, sdk_configs: {},
    can_record_session: false, session_recording_rate: 0, recording_blocked: true,
    adapter_source: 'prototype-local-configuration-not-an-openai-cohort',
  };
}
