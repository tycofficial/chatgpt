/** Site permission boundary for the unchanged original Pro model picker. */
export function applyNativeModelSelectionPolicy(props, canSelectModels) {
  return canSelectModels === true ? props : null;
}
export function createNativeModelSelectionPolicy(OriginalPicker, createElement, hasAccess) {
  if (typeof OriginalPicker !== 'function' || typeof createElement !== 'function' || typeof hasAccess !== 'function') throw new TypeError('Invalid native model selection policy boundary');
  return function SiteModelSelectionPolicy(props) {
    const allowedProps = applyNativeModelSelectionPolicy(props, hasAccess());
    return allowedProps === null ? null : createElement(OriginalPicker, allowedProps);
  };
}

/** Select the original plus-menu Think branch for Free, preserving its eligibility. */
export function createNativeThinkingEntryPolicy(originalHook, hasAccess) {
  if (typeof originalHook !== 'function' || typeof hasAccess !== 'function') throw new TypeError('Invalid native thinking entry boundary');
  const cache = new WeakMap();
  return function useSiteThinkingEntryPolicy(...args) {
    const result = originalHook(...args);
    if (hasAccess() === true || !result?.showThinkingToggle) return result;
    if (!cache.has(result)) cache.set(result, { ...result, showThinkingToggle: false });
    return cache.get(result);
  };
}
