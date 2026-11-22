/** Synthetic identity for this site's accounts and its separate browser guest. */
import { getSiteAccount, getSiteHomeUrl } from './site-account.mjs?v=a288d45728a939a0';

const siteAccount = getSiteAccount();
const registeredSiteUser = siteAccount?.role === 'user' ? siteAccount : null;
const administrator = siteAccount?.role === 'administrator' ? siteAccount : null;
const guestAccountId = '00000000-0000-4000-8000-000000000002';

export const LOCAL_ACCOUNT_ID = registeredSiteUser?.accountId ?? (administrator ? '00000000-0000-4000-8000-000000000001' : guestAccountId);
export const LOCAL_USER_ID = registeredSiteUser?.id ?? (administrator ? 'user-local-prototype' : 'user-local-guest');
export const LOCAL_ACCOUNT_USER_ID = registeredSiteUser?.id ?? (administrator ? 'local-prototype-account-owner' : 'local-guest-account-owner');

const toggleKey = 'original-client-prototype-local-session';
let enabled = false;
try {
  const option = new URL(globalThis.location.href).searchParams.get('localSession');
  enabled = option === '1';
  if (option === '1' || option === '0') globalThis.sessionStorage.setItem(toggleKey, option);
  if (option !== '1' && option !== '0') enabled = globalThis.sessionStorage.getItem(toggleKey) === '1' || (globalThis.sessionStorage.getItem(toggleKey) === null && globalThis.__CHATGPT_REPLICA_ENV__?.localIdentity === true);
} catch {}
let generation = 1;

const marker = 'local-prototype-not-an-openai-token';
const context = { locale: 'zh-CN', deviceId: 'local-prototype' };
const guestCreated = Math.floor(Date.now() / 1000);

function createIdentity(site) {
  const account = {
    id: LOCAL_ACCOUNT_ID, userId: LOCAL_ACCOUNT_USER_ID, planType: site?.planType ?? 'free',
    structure: 'personal', workspaceType: null, organizationId: null, computeResidency: null,
    isFedrampCompliantWorkspace: false, isDelinquent: false,
  };
  const user = {
    id: LOCAL_USER_ID,
    name: site?.username ?? '本机访客',
    email: administrator ? administrator.username.toLowerCase() + '@local.invalid' : site ? undefined : 'local-guest@example.invalid',
    created: site ? Math.floor(site.createdAt / 1000) : guestCreated,
    is_test_user: false,
  };
  const session = {
    accessToken: marker, sessionToken: 'site-account-reference:' + LOCAL_USER_ID,
    authProvider: 'local-username-password', account, user, statsigContext: context,
    adapterIdentity: 'prototype-local-only',
  };
  const snapshot = {
    accessToken: marker, accountId: LOCAL_ACCOUNT_ID, accountUserId: LOCAL_ACCOUNT_USER_ID,
    userId: LOCAL_USER_ID, userCreated: user.created, isTestUser: false, isSignup: false,
    email: user.email, name: user.name, picture: undefined, planType: account.planType, computeResidency: null,
    source: 'localAdapter', targetingAccount: account, targetingRequest: context,
    adapterIdentity: 'prototype-local-only', googleAuthenticated: false, openaiAuthenticated: false,
  };
  return { account, user, session, snapshot };
}

let observedAccount = siteAccount;
let identity = createIdentity(siteAccount);

function getActiveIdentity() {
  const liveAccount = getSiteAccount();
  const sameOwner = liveAccount?.id === siteAccount?.id && liveAccount?.accountId === siteAccount?.accountId &&
    liveAccount?.role === siteAccount?.role;
  if (liveAccount !== observedAccount) {
    observedAccount = liveAccount;
    generation++;
    if (sameOwner) identity = createIdentity(liveAccount);
  }
  return sameOwner && (siteAccount || enabled) ? identity : null;
}

// A native browser-auth cleanup changes the guest toggle and leaves site verification in its own module.
export const isPrototypeLocalSession = () => !!getActiveIdentity();
/** The storage namespace is bound to the verified owner at startup. */
export function getLocalAccountStorageKey(key) {
  return administrator ? key : registeredSiteUser ? key + ':account:' + LOCAL_ACCOUNT_ID : key + ':guest';
}
export const getPrototypeLocalSession = () => getActiveIdentity()?.session ?? null;
export const getPrototypeLocalAuth = () => getActiveIdentity()?.snapshot ?? null;
export function getPrototypeLocalAuthGeneration() {
  getActiveIdentity();
  return generation;
}
export function getPrototypeCurrentUser() {
  const user = getActiveIdentity()?.user;
  return user ? { id: user.id, created: user.created, email: user.email, name: user.name, first_name: user.name, email_domain_type: null, phone_number: null, picture: null } : null;
}
export function clearPrototypeLocalSession({ reload = false } = {}) {
  enabled = false;
  generation++;
  try { globalThis.sessionStorage.setItem(toggleKey, '0'); } catch {}
  try {
    const url = new URL(globalThis.location.href);
    url.searchParams.delete('localSession');
    globalThis.history.replaceState(globalThis.history.state, '', url.href);
  } catch {}
  globalThis.dispatchEvent?.(new Event('codex-browser-auth-changed'));
  globalThis.dispatchEvent?.(new Event('codex-browser-auth-context-changed'));
  if (reload) globalThis.location.reload();
}
export function getLocalSignedOutUrl() {
  const fallback = new URL('../', import.meta.url).pathname;
  const url = getSiteHomeUrl(fallback);
  url.searchParams.set('localSession', '0');
  return url.href;
}
export function getLocalAccountCheck() {
  const active = getActiveIdentity();
  if (!active) return { account_ordering: [], accounts: {} };
  const { account, user } = active;
  return {
    account_ordering: [LOCAL_ACCOUNT_ID],
    accounts: {
      [LOCAL_ACCOUNT_ID]: {
        account: {
          account_id: LOCAL_ACCOUNT_ID, account_user_id: LOCAL_ACCOUNT_USER_ID,
          account_user_role: 'account-owner', structure: 'personal', plan_type: account.planType,
          name: user.name, display_name: user.name, is_zdr: false, is_openai_internal: false,
          is_deactivated: false, is_most_recent_expired_subscription_gratis: false,
          is_fedramp_compliant_workspace: false,
          tbo_config: { tbo_available: account.planType === 'pro', adapter_source: 'site-local-dot-provider' },
          adapter_identity: 'prototype-local-only',
        },
        entitlement: { has_active_subscription: ['plus','pro'].includes(account.planType), is_delinquent: false, grace_period_id: null, adapter_source: 'site-membership' },
        // The native account adapter reads this envelope for Free too.
        last_active_subscription: { purchase_origin_platform: null, will_renew: false },
        features: ['dot_account_access_policy'],
        can_access_with_session: true, sso_connection_name: null,
      },
    },
    adapter_identity: 'prototype-local-only',
  };
}
export function getLocalOptimizedAccount() {
  const result = getLocalAccountCheck();
  const entry = result.accounts[LOCAL_ACCOUNT_ID];
  if (!entry) return null;
  return {
    account: entry.account,
    account_user: { is_trial: false, seat_type: null, trial_state: null, trial_expires_at: null, pending_seat_upgrade_request: false },
    features: entry.features,
    adapter_identity: 'prototype-local-only',
  };
}
export function getLocalWhamAccounts() {
  const check = getLocalAccountCheck();
  return {
    accounts: check.account_ordering.map(id => ({ ...check.accounts[id].account, id, can_access_with_session: true, sso_connection_name: null })),
    account_ordering: check.account_ordering,
    default_account_id: check.account_ordering[0] ?? null,
    adapter_identity: 'prototype-local-only',
  };
}
export function getPrototypeStatsigUser() {
  const active = isPrototypeLocalSession();
  return {
    userID: active ? LOCAL_USER_ID : 'local-prototype-anonymous',
    appVersion: 'local-original-probe', locale: 'zh-CN',
    customIDs: { stableID: 'local-prototype', ...(active ? { account_id: LOCAL_ACCOUNT_ID, account_user_id: LOCAL_ACCOUNT_USER_ID } : {}) },
  };
}
