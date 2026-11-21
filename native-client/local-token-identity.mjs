
/** Identity bridge for one explicitly local marker, never an OpenAI JWT. */
export const LOCAL_HOST_ACCESS_MARKER = 'local-prototype-not-an-openai-token';
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
export function createLocalHostClaimsReader(originalReader, { getSession, getAuth, isLocalSession }) {
  if (typeof originalReader !== 'function' || [getSession, getAuth, isLocalSession].some(value => typeof value !== 'function')) throw new TypeError('Invalid local host identity boundary');
  return function readLocalHostTokenClaims(token) {
    if (token === LOCAL_HOST_ACCESS_MARKER) {
      try {
        const active = isLocalSession() === true, session = active ? getSession() : null, auth = active ? getAuth() : null;
        if (session?.accessToken === token && auth?.accessToken === token &&
            auth.adapterIdentity === 'prototype-local-only' &&
            nonempty(auth.accountId) && nonempty(auth.userId) && nonempty(auth.accountUserId) && nonempty(auth.planType) &&
            session.account?.id === auth.accountId && session.user?.id === auth.userId &&
            session.account?.userId === auth.accountUserId && session.account?.planType === auth.planType) {
          return Object.freeze({
            source: 'local-host-identity', adapterIdentity: 'prototype-local-only', openaiAuthenticated: false,
            accountId: auth.accountId, userId: auth.userId, accountUserId: auth.accountUserId,
            planType: auth.planType, rawPlanType: auth.planType, computeResidency: auth.computeResidency ?? null,
            email: auth.email ?? null, sessionId: null, issuedAt: null, isSignup: false,
          });
        }
      } catch {}
    }
    return originalReader(token);
  };
}
