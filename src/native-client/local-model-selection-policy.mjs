/**
 * Site permission boundary for the unchanged original pPWr model picker.
 * pPWr.a disabled -> n8 disables composer.openModelPicker and erx1.a;
 * erx1 refuses an open request when disabled and disables its original button.
 * A verified site Pro account keeps the original props and behavior unchanged.
 */
export function applyNativeModelSelectionPolicy(props, canSelectModels) {
  return canSelectModels === true ? props : { ...props, disabled: true };
}

export function createNativeModelSelectionPolicy(OriginalPicker, createElement, hasAccess) {
  if (typeof OriginalPicker !== 'function' || typeof createElement !== 'function' || typeof hasAccess !== 'function') {
    throw new TypeError('Invalid native model selection policy boundary');
  }
  return function SiteModelSelectionPolicy(props) {
    return createElement(OriginalPicker, applyNativeModelSelectionPolicy(props, hasAccess()));
  };
}
