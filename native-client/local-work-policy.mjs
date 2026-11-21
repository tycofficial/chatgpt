/** Declared local execution policy; never an OpenAI subscription entitlement. */
export function createLocalWorkPolicy(originalPolicy, getCapabilities, getIdentity) {
  return function localExecutionPolicy(inputs, workspace, enabled, options) {
    const decision = originalPolicy(inputs, workspace, enabled, options);
    // Preserve the original plan restriction, including Free accounts.
    return decision;
  };
}
