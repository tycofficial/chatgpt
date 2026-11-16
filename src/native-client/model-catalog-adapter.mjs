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

export function createModelCatalogAdapter(catalog) {
  const ids = [...catalog.WORK_MODEL_IDS];
  const curated = catalog.getWorkSelectionCatalog({ selectionMode: 'auto' });
  const manual = new Map(ids.map(model => [model, catalog.getWorkSelectionCatalog({ model, selectionMode: 'pinned' })]));
  const selection = catalog.normalizeWorkSelection({});
  // Chat is a frontend alias for the base API model, without Work orchestration.
  const chatManual = manual.get(selection.model).filter(choice => choice.effort !== 'ultra');
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
    siteUltraOrchestration: catalog.SITE_ULTRA_ORCHESTRATION,
    frontendChatAlias: { slug: 'auto', apiModel: selection.model, meaning: 'frontend selection alias, not an additional gateway model' },
    description: 'Curated presets come from the explicit six-position capture. Per-model manual efforts combine API capabilities with explicit site Ultra orchestration; they are not a captured original account response.',
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
    return {
      default_model_slug: 'auto',
      categories: [{ action_pill_short_name: 'ChatGPT', category: 'auto', default_model: 'auto', human_category_name: 'ChatGPT', human_category_short_name: 'ChatGPT', model_lane: 'thinking', short_explainer: null, supported_models: ['auto'], tagline: null, title: 'ChatGPT' }, ...ids.map(model => ({
        action_pill_short_name: modelLabel(model),
        category: model,
        default_model: model,
        human_category_name: modelLabel(model),
        human_category_short_name: modelLabel(model),
        model_lane: 'thinking',
        short_explainer: null,
        supported_models: [model],
        tagline: null,
        title: modelLabel(model),
      }))],
      models: [{ slug: 'auto', title: 'ChatGPT', description: null, configurable_thinking_effort: true, default_thinking_effort: rawEffort(selection.effort), thinking_efforts: chatManual.map(choice => ({ thinking_effort: rawEffort(choice.effort), short_label: choice.label, full_label: choice.label })), is_work_mode_model: false, enabled_tools: [], tags: [] }, ...ids.map(model => ({
        slug: model,
        title: modelLabel(model),
        description: null,
        configurable_thinking_effort: true,
        default_thinking_effort: rawEffort(defaults.get(model)),
        thinking_efforts: manual.get(model).map(choice => ({
          thinking_effort: rawEffort(choice.effort),
          short_label: choice.label,
          full_label: choice.label,
        })),
        is_work_mode_model: true,
        enabled_tools: [],
        tags: [],
      }))],
      internal_groups: [{ group: 'default', model_ids: ['auto', ...ids] }],
      versions: [
        version('latest', catalog.WORK_DEFAULT_OPTION.label, ids, curated),
        ...ids.map(model => version(model, modelLabel(model), [model], manual.get(model))),
        // Source iLYI chooses Chat from isWorkModeModel=false; its original
        // picker needs a version radio to select this frontend alias again.
        version('auto', 'ChatGPT', ['auto'], chatManual.map(choice => ({ ...choice, model: 'auto', displayLabel: `ChatGPT ${choice.label}` }))),
      ],
      slider_settings: curated.map(choice => ({ model_slug: choice.model, thinking_effort: rawEffort(choice.effort) })),
      workspace_model_policy: null,
      adapter_provenance: provenance,
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
        adapterCapabilitySource: catalog.WORK_CATALOG_PROVENANCE.pinned,
      })),
      nextCursor: end < ids.length ? `local-models:${end}` : null,
      adapterProvenance: provenance,
    };
  }
  function getSliderModelsConfig() {
    return { presets: [curated.map(choice => ({ model: choice.model, reasoning_effort: choice.effort }))] };
  }
  return { getChatGptModels, getRpcModelList, getSliderModelsConfig, provenance };
}
