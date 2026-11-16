import * as catalog from '../model-catalog.js?v=78e7bc02bd4001a6';
import { createModelCatalogAdapter } from './model-catalog-adapter.mjs?v=78e7bc02bd4001a6';
import { getPrototypeStatsigUser, isPrototypeLocalSession } from './local-identity.mjs?v=78e7bc02bd4001a6';
const models = createModelCatalogAdapter(catalog);
// Same public _DJB2 algorithm as original module MEQB (Statsig key lookup).
function hash(name) { let value = 0; for (let index = 0; index < name.length; index++) value = ((value << 5) - value + name.charCodeAt(index)) | 0; return String(value >>> 0); }
export function getPrototypeConfiguration(user = getPrototypeStatsigUser()) {
  if (!user || typeof user !== 'object' || Array.isArray(user)) user = getPrototypeStatsigUser();
  const slider = { name: '423260384', value: models.getSliderModelsConfig(), rule_id: 'local-adapter', secondary_exposures: [], adapter_source: 'model-catalog.js' };
  // Original khOd.b -> d1ji.T: observed saved rail is browser:w-13 (52px).
  // This selects the captured public layout; it grants no account or cloud rights.
  const rail = { name: '3085093835', value: true, rule_id: 'local-observed-public-layout', secondary_exposures: [], adapter_source: 'captured-public-ui-layout' };
  const localWork = { name: '1625797156', value: isPrototypeLocalSession(), rule_id: 'local-text-provider', secondary_exposures: [], adapter_source: 'local-app-server-not-openai-cloud' };
  // kYSX.g -> i3D4/ep.a; the captured Chat and Work composers have this
  // original model trigger. Personal Free access is evaluated by original vw1R.
  // rbaa.k/vYe0.X: all captured source screens use the original zh-CN catalog.
  const i18n = { name: '72216192', value: { enable_i18n: true }, rule_id: 'local-observed-language', secondary_exposures: [], explicit_parameters: ['enable_i18n'], adapter_source: 'captured-public-zh-CN-ui' };
  const pickerLayer = { name: '3040264819', value: { merged_picker: true }, rule_id: 'local-observed-composer-picker', secondary_exposures: [], explicit_parameters: ['merged_picker'], adapter_source: 'captured-public-composer-ui' };
  return {
    has_updates: true, time: Date.now(), hash_used: 'none',
    user: structuredClone(user), evaluated_keys: { userID: user.userID, customIDs: user.customIDs },
    feature_gates: { '3085093835': rail, [hash('3085093835')]: rail, '1625797156': localWork, [hash('1625797156')]: localWork },
    dynamic_configs: { '423260384': slider, [hash('423260384')]: slider },
    layer_configs: { '3040264819': pickerLayer, [hash('3040264819')]: pickerLayer, '72216192': i18n, [hash('72216192')]: i18n }, param_stores: {}, sdkInfo: {}, sdkParams: {}, sdk_configs: {},
    can_record_session: false, session_recording_rate: 0, recording_blocked: true,
    adapter_source: 'prototype-local-configuration-not-an-openai-cohort',
  };
}
