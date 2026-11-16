/** Explicit prototype-local identity; never a Google/OpenAI authentication. */
import { getSiteAccount } from './site-account.mjs?v=b88858afb5156217';
const siteAccount = getSiteAccount();
const registeredSiteUser = siteAccount?.role === 'user' && siteAccount.planType === 'free' ? siteAccount : null;
const administrator = siteAccount?.role === 'administrator' && siteAccount.planType === 'pro' ? siteAccount : null;
export const LOCAL_ACCOUNT_ID = registeredSiteUser?.accountId ?? '00000000-0000-4000-8000-000000000001';
export const LOCAL_USER_ID = registeredSiteUser?.id ?? 'user-local-prototype';
export const LOCAL_ACCOUNT_USER_ID = registeredSiteUser?.id ?? 'local-prototype-account-owner';
const toggleKey = 'original-client-prototype-local-session';
let enabled = false;
let option;
try {
  option = new URL(globalThis.location.href).searchParams.get('localSession');
  enabled = option === '1';
  if (option === '1' || option === '0') globalThis.sessionStorage.setItem(toggleKey, option);
  if (option !== '1' && option !== '0') enabled = globalThis.sessionStorage.getItem(toggleKey) === '1' || (globalThis.sessionStorage.getItem(toggleKey) === null && globalThis.__CHATGPT_REPLICA_ENV__?.localIdentity === true);
} catch {}
let generation = 1;
if (siteAccount) enabled = true;
const marker = 'local-prototype-not-an-openai-token';
const account = { id: LOCAL_ACCOUNT_ID, userId: LOCAL_ACCOUNT_USER_ID, planType: 'free', structure: 'personal', workspaceType: null, organizationId: null, computeResidency: null, isFedrampCompliantWorkspace: false, isDelinquent: false };
const user = { id: LOCAL_USER_ID, name: '本地账户', email: 'local-prototype@example.invalid', created: Math.floor(Date.now() / 1000), is_test_user: false };
const context = { locale: 'zh-CN', deviceId: 'local-prototype' };
if (siteAccount) { account.planType = siteAccount.planType; user.name = siteAccount.username; user.email = administrator ? administrator.username.toLowerCase() + '@local.invalid' : undefined; user.created = Math.floor(siteAccount.createdAt / 1000); }
const session = { accessToken: marker, sessionToken: 'site-account-reference:' + LOCAL_USER_ID, authProvider: 'local-username-password', account, user, statsigContext: context, adapterIdentity: 'prototype-local-only' };
const snapshot = {
  accessToken: marker, accountId: LOCAL_ACCOUNT_ID, accountUserId: LOCAL_ACCOUNT_USER_ID,
  userId: LOCAL_USER_ID, userCreated: user.created, isTestUser: false, isSignup: false,
  email: user.email, name: user.name, picture: undefined, planType: account.planType, computeResidency: null,
  source: 'localAdapter', targetingAccount: account, targetingRequest: context,
  adapterIdentity: 'prototype-local-only', googleAuthenticated: false, openaiAuthenticated: false,
};
const isActive = () => enabled && (!siteAccount || getSiteAccount()?.id === siteAccount.id);
export const isPrototypeLocalSession = isActive;
/** Admin keeps existing storage; registered and guest accounts never read it. */
export function getLocalAccountStorageKey(key) { return administrator ? key : registeredSiteUser ? key + ':account:' + LOCAL_ACCOUNT_ID : key + ':guest'; }
export const getPrototypeLocalSession = () => isActive() ? session : null;
export const getPrototypeLocalAuth = () => isActive() ? snapshot : null;
export const getPrototypeLocalAuthGeneration = () => generation;
export function getPrototypeCurrentUser() {
  return isActive() ? { id: user.id, created: user.created, email: user.email, name: user.name, first_name: user.name, email_domain_type: null, phone_number: null, picture: null } : null;
}
export function clearPrototypeLocalSession({ reload = true } = {}) {
  enabled = false; generation++;
  try {
    globalThis.sessionStorage.setItem(toggleKey, '0');
    const url = new URL(globalThis.location.href); url.searchParams.delete('localSession');
    globalThis.history.replaceState(globalThis.history.state, '', url.href);
    globalThis.dispatchEvent(new Event('codex-browser-auth-changed'));
    globalThis.dispatchEvent(new Event('codex-browser-auth-context-changed'));
    if (reload) globalThis.location.reload();
  } catch {}
}
export function getLocalSignedOutUrl() {
  const fallback = new URL('../', import.meta.url).pathname;
  const basename = globalThis.document?.documentElement?.dataset?.routerBasename ?? fallback;
  const candidate = new URL(basename, globalThis.location.origin);
  const url = candidate.origin === globalThis.location.origin ? candidate : new URL(fallback, globalThis.location.origin);
  url.searchParams.set('localSession', '0');
  return url.href;
}
export function getLocalAccountCheck() {
  if (!isActive()) return { account_ordering: [], accounts: {} };
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
          adapter_identity: 'prototype-local-only',
        },
        // lwd4 account-refresh contract; this local Free identity has no paid subscription.
        entitlement: { has_active_subscription: false, is_delinquent: false, grace_period_id: null },
        // TPx7/m0qY dereference this envelope even for a local Free account.
        last_active_subscription: { purchase_origin_platform: null, will_renew: false },
        features: [],
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
    features: [],
    adapter_identity: 'prototype-local-only',
  };
}
export function getLocalWhamAccounts() {
  const check = getLocalAccountCheck();
  return {
    accounts: check.account_ordering.map(id => ({ ...check.accounts[id].account, id, can_access_with_session: true, sso_connection_name: null })),
    account_ordering: check.account_ordering,
    default_account_id: isPrototypeLocalSession() ? LOCAL_ACCOUNT_ID : null,
    adapter_identity: 'prototype-local-only',
  };
}
export function getPrototypeStatsigUser() {
  return {
    userID: isActive() ? LOCAL_USER_ID : 'local-prototype-anonymous',
    appVersion: 'local-original-probe', locale: 'zh-CN',
    customIDs: { stableID: 'local-prototype', ...(isActive() ? { account_id: LOCAL_ACCOUNT_ID, account_user_id: LOCAL_ACCOUNT_USER_ID } : {}) },
  };
}
