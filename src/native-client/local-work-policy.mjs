/** Declared local execution policy; never an OpenAI subscription entitlement. */
export function createLocalWorkPolicy(originalPolicy, getCapabilities, getIdentity) {
  return function localExecutionPolicy(inputs, workspace, enabled, options) {
    const decision = originalPolicy(inputs, workspace, enabled, options);
    const identity = getIdentity(), capabilities = getCapabilities();
    // Preserve source account/auth loading and every error. Only the local text
    // provider replaces a Free-plan cloud restriction after identity converges.
    if (identity && inputs.accountId === identity.accountId &&
        inputs.plan === 'free' && !inputs.authLoading && !inputs.accountInfoLoading &&
        !inputs.accountInfoError && inputs.supportedSurface &&
        options.freeAndGoPlansAllowed === false &&
        decision.status === 'denied' && decision.reason === 'free-plan' &&
        capabilities.textConversations === true && capabilities.executionSource === 'local-app-server') {
      return { status: 'allowed', accountId: identity.accountId,
        executionSource: 'local-app-server', adapterIdentity: 'prototype-local-only',
        openaiCloudEntitlement: false, capabilities: ['text-conversations'] };
    }
    return decision;
  };
}
