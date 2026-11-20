/**
 * Original-service shapes over the application's explicit catalog.
 * This does not contact or claim metadata from OpenAI's private services.
 */
export const FRONTEND_TO_RAW_EFFORT = Object.freeze({
  none: 'zero', low: 'min', medium: 'standard', high: 'extended',
  xhigh: 'xhigh', max: 'max', ultra: 'ultra',
});
export const RAW_TO_FRONTEND_EFFORT = Object.freeze(Object.fromEntries(
  Object.entries(FRONTEND_TO_RAW_EFFORT).map(([frontend, raw]) => [raw, frontend]),
));

export function consolidateWorkDefaults(modelList, curatedLabel) {
  if (!modelList?.defaultOption) return modelList;
  const options = modelList.options.filter(option => option.id !== 'latest' || option.label !== curatedLabel);
  return options.length === modelList.options.length ? modelList : { ...modelList, options };
}

export function createModelCatalogAdapter(catalog) {
  const ids = [...catalog.WORK_MODEL_IDS];
  // Preserve the original Fast UI and preference even when this host cannot
  // claim accelerated provider processing. The runner independently gates
  // actual service_tier forwarding on verifiedPriority.
  const fastOptions = () => [{ service_tier: 'fast', title: 'Fast', subtitle: '' }];
  const curated = catalog.getWorkSelectionCatalog({ selectionMode: 'auto' });
  const manual = new Map(ids.map(model => [model, catalog.getWorkSelectionCatalog({ model, selectionMode: 'pinned' })]));
  const selection = catalog.normalizeWorkSelection({});
  const modelLabel = model => catalog.WORK_MODEL_LABELS[model];
  const rawEffort = effort => {
    const raw = FRONTEND_TO_RAW_EFFORT[effort];
    if (!raw) throw Error(`No original TFzY effort mapping exists for ${effort}`);
    return raw;
  };
  for (const choice of [...curated, ...[...manual.values()].flat()]) rawEffort(choice.effort);
  const defaults = new Map(ids.map(model => [model, catalog.normalizeWorkSelection({ model, selectionMode: 'pinned' }).effort]));
  defaults.set(selection.model, selection.effort);
  const provenance = Object.freeze({
    source: 'local-model-catalog-adapter',
    catalogFile: 'model-catalog.js',
    curatedPresetSource: catalog.WORK_CATALOG_PROVENANCE.auto,
    manualCapabilitySource: catalog.WORK_CATALOG_PROVENANCE.pinned,
    originalManualMembershipCaptured: false,
    originalPrivateMetadata: false,
    fastMode: { originalServiceTierId: 'fast', originalPreferenceKey: 'chatgpt-tpp-cloud-service-tier-v1', uiPreference: true, providerPriorityVerified: false },
    siteUltraOrchestration: catalog.SITE_ULTRA_ORCHESTRATION,
    frontendChatAlias: { defaultSlug: 'auto', families: catalog.CHAT_FAMILIES, meaning: 'Chat aliases route to explicit models and reasoning modes; aliases are not gateway models' },
    description: 'Work has six curated presets. Work and Codex share the verified manual catalog and site Ultra delegation. Chat has two model families.',
  });
  function preset(choice) {
    return {
      model_slug: choice.model,
      thinking_effort: rawEffort(choice.effort),
      lane: choice.effort === 'none' ? 'instant' : 'thinking',
      title: choice.label,
      selected_display_title: choice.label,
      selected_display_version: choice.model === 'auto' ? 'ChatGPT' : modelLabel(choice.model),
      preset_type: 'available',
      ...(choice.model === 'auto' ? {} : { service_tier_options: fastOptions() }),
    };
  }
  function version(id, label, modelIds, choices) {
    return {
      id,
      display_text: label,
      display_text_for_intelligence: label,
      slugs: modelIds,
      intelligence_presets: choices.map(preset),
    };
  }
  function getChatGptModels() {
    const chatModels = catalog.CHAT_FAMILIES.flatMap(family => [
      { slug: family.standardAlias, title: family.label, description: null, configurable_thinking_effort: true, default_thinking_effort: 'standard', thinking_efforts: catalog.CHAT_EFFORTS.map(effort => ({ thinking_effort: rawEffort(effort), short_label: catalog.CHAT_EFFORT_LABELS[effort], full_label: catalog.CHAT_EFFORT_LABELS[effort] })), is_work_mode_model: false, enabled_tools: [], tags: [] },
      { slug: family.proAlias, title: family.label + ' Pro', description: null, configurable_thinking_effort: true, default_thinking_effort: 'standard', thinking_efforts: [{ thinking_effort: 'standard', short_label: 'Pro', full_label: 'Pro' }], reasoning_type: 'pro', is_work_mode_model: false, enabled_tools: [], tags: [] },
    ]);
    const familyPresets = family => [
      ...catalog.CHAT_EFFORTS.map(effort => ({ model_slug: family.standardAlias, thinking_effort: rawEffort(effort), lane: effort === 'none' ? 'instant' : 'thinking', title: catalog.CHAT_EFFORT_LABELS[effort], selected_display_title: catalog.CHAT_EFFORT_LABELS[effort], selected_display_version: family.label, preset_type: 'available' })),
      { model_slug: family.proAlias, thinking_effort: 'standard', lane: 'pro', reasoning_type: 'pro', title: 'Pro', selected_display_title: 'Pro', selected_display_version: family.label, preset_type: 'available' },
    ];
    return {
      default_model_slug: 'auto',
      categories: catalog.CHAT_FAMILIES.map(family => ({
        action_pill_short_name: family.label,
        category: family.id,
        default_model: family.standardAlias,
        human_category_name: family.label,
        human_category_short_name: family.label,
        model_lane: 'thinking',
        short_explainer: null,
        supported_models: [family.standardAlias, family.proAlias],
        tagline: null,
        title: family.label,
      })),
      // iLYI needs Work capability flags when switching the original modes.
      // These rows are deliberately absent from Chat categories and versions.
      models: [...chatModels, ...workModelRows()],
      internal_groups: [{ group: 'default', model_ids: chatModels.map(model => model.slug) }],
      versions: catalog.CHAT_FAMILIES.map(family => ({ id: family.id, display_text: family.label, display_text_for_intelligence: family.label, slugs: [family.standardAlias, family.proAlias], intelligence_presets: familyPresets(family) })),
      slider_settings: familyPresets(catalog.CHAT_FAMILIES[0]).map(choice => ({ model_slug: choice.model_slug, thinking_effort: choice.thinking_effort })),
      workspace_model_policy: null,
      adapter_provenance: { ...provenance, chat: catalog.CHAT_MODEL_PROVENANCE },
    };
  }
  function workModelRows() {
    return ids.map(model => ({ slug: model, title: modelLabel(model), description: null, configurable_thinking_effort: true, default_thinking_effort: rawEffort(defaults.get(model)), thinking_efforts: manual.get(model).map(choice => ({ thinking_effort: rawEffort(choice.effort), short_label: choice.label, full_label: choice.label })), is_work_mode_model: true, service_tier_options: fastOptions(), enabled_tools: [], tags: [] }));
  }
  function getWorkModels() {
    // TFzY.p consumes this exact default_model_slug field. qJjJ/osfW use it
    // only when no valid saved Work preference exists, then TFzY.k picks
    // the original latest version and TuVM/LLIt retains its six presets.
    return {
      default_model_slug: selection.model,
      categories: ids.map(model => ({ action_pill_short_name: modelLabel(model), category: model, default_model: model, human_category_name: modelLabel(model), human_category_short_name: modelLabel(model), model_lane: 'thinking', short_explainer: null, supported_models: [model], tagline: null, title: modelLabel(model) })),
      models: workModelRows(),
      versions: [version('latest', catalog.WORK_DEFAULT_OPTION.label, [...new Set(curated.map(choice => choice.model))], curated), ...ids.map(model => version(model, modelLabel(model), [model], manual.get(model)))],
      internal_groups: [{ group: 'default', model_ids: [...ids] }],
      slider_settings: curated.map(choice => ({ model_slug: choice.model, thinking_effort: rawEffort(choice.effort) })),
      workspace_model_policy: null,
      adapter_provenance: { ...provenance, surface: 'work', frontendChatAlias: undefined, defaultSelectionSource: 'curated-six-position-catalog-with-original-latest-version' },
    };
  }
  function getRpcModelList(params = {}) {
    if (params === null) params = {};
    if (typeof params !== 'object' || Array.isArray(params)) {
      const error = new TypeError('Model list params must be an object');
      error.rpcCode = -32602;
      throw error;
    }
    let start = 0;
    if (params.cursor != null) {
      const match = /^local-models:(\d+)$/.exec(params.cursor);
      if (!match || Number(match[1]) > ids.length) {
        const error = new TypeError('Invalid local model catalog cursor');
        error.rpcCode = -32602;
        throw error;
      }
      start = Number(match[1]);
    }
    if (params.limit != null && (!Number.isSafeInteger(params.limit) || params.limit < 1)) {
      const error = new TypeError('Model list limit must be a positive integer');
      error.rpcCode = -32602;
      throw error;
    }
    const limit = Math.min(params.limit ?? 100, 100), end = Math.min(start + limit, ids.length);
    return {
      data: ids.slice(start, end).map(model => ({
        id: model,
        model,
        displayName: modelLabel(model),
        description: '',
        hidden: false,
        isDefault: model === selection.model,
        defaultReasoningEffort: defaults.get(model),
        supportedReasoningEfforts: manual.get(model).map(choice => ({ reasoningEffort: choice.effort, description: '', ...(choice.effort === 'ultra' ? { adapterExecutionMode: catalog.SITE_ULTRA_ORCHESTRATION } : {}) })),
        inputModalities: ['text'],
        serviceTiers: [{ id: 'fast', name: 'Fast', description: '' }],
        adapterServiceTierCapability: { uiPreference: true, providerPriorityVerified: false },
        adapterCapabilitySource: catalog.WORK_CATALOG_PROVENANCE.pinned,
      })),
      nextCursor: end < ids.length ? `local-models:${end}` : null,
      adapterProvenance: provenance,
    };
  }
  function getSliderModelsConfig() {
    return { presets: [curated.map(choice => ({ model: choice.model, reasoning_effort: choice.effort }))] };
  }
  return { getChatGptModels, getWorkModels, getRpcModelList, getSliderModelsConfig, provenance };
}
