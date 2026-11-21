/** Account verification, browser-local guest sessions, and site-only trials. */
import { getSiteAuthEntryKind, isHistoricalSitePath, resolveSiteHomeUrl } from './site-paths.mjs?v=d483f118d44cd86f';

export const SITE_ACCOUNT_SERVICE = 'https://chatgpt-admin-bridge-tyc.hushedtarragon1.chatgpt.site';

const offlineAdminVerifier=Object.freeze({"salt":"fc2da60719d1841ba316deee9862fc4f","hash":"671da903ca544ab80c4f6842f97165b94b48f4dd510dae7de91727a8c624a29f","iterations":120000});
const offlineAdminKind = 'offline-administrator:v1';
const storageKey = 'chatgpt-site-admin-session:v1';
const guestKey = 'chatgpt-site-local-guest:v1';
const nativeSessionKey = 'original-client-prototype-local-session';
const receiptStore = 'verified-sessions';
const trialPlans = new Map([
  ['plus', 'plus'],
  ['prolite', 'pro'],
  ['pro', 'pro'],
  ['promax', 'pro'],
]);
const dayMs = 86400000;
const maxTrialTerm = 30 * dayMs + 5 * 60000;
const accountInvalid = '账户权限验证失败。';
const sessionExpired = '账户会话已过期，请重新登录。';
const networkUnavailable = '暂时无法连接本站账户服务。';
const cancelled = '账户操作已取消。';
const guestSession = Object.freeze({ role: 'guest', planType: 'free', authenticationMode: 'browser-guest' });
const tokenPattern = /^[a-f0-9]{64}$/;
const accountIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getTabGuestFlag() {
  try { return globalThis.sessionStorage.getItem(guestKey) === '1'; }
  catch { return false; }
}

function readStoredSession() {
  try { return JSON.parse(globalThis.localStorage.getItem(storageKey) || 'null'); }
  catch { return null; }
}

let guestActive = getTabGuestFlag();
let remembered = guestActive ? null : readStoredSession();
let verifiedAccount = null;
let lastError = null;
let requestGeneration = 0;
let databasePromise;
let refreshing;
let claiming;

const isToken = token => typeof token === 'string' && tokenPattern.test(token);
const isFutureExpiry = value => Number.isSafeInteger(value) && value > Date.now();
const validSession = record => record && isToken(record.token) && isFutureExpiry(record.expiresAt);
const isOffline = () => globalThis.navigator?.onLine === false;
const accountChanged = () => globalThis.dispatchEvent?.(new Event('codex-site-account-changed'));

function setTabGuest(active) {
  guestActive = active;
  try {
    if (active) globalThis.sessionStorage.setItem(guestKey, '1');
    else globalThis.sessionStorage.removeItem(guestKey);
  } catch {}
}

function setNativeSessionFlag(value) {
  try { globalThis.sessionStorage.setItem(nativeSessionKey, value); }
  catch {}
}

function openReceiptDatabase() {
  return databasePromise ??= new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open('chatgpt-site-account-verification-v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore(receiptStore);
    request.onsuccess = () => request.result && resolve(request.result);
    request.onerror = request.onblocked = () => reject(Error('本机账户验证缓存不可用。'));
  });
}

// Store the last locally observed verified identity separately from the remembered token.
async function accountReceipt(token, replacement) {
  const db = await openReceiptDatabase();
  return new Promise((resolve, reject) => {
    const read = replacement === undefined;
    const tx = db.transaction(receiptStore, read ? 'readonly' : 'readwrite');
    const store = tx.objectStore(receiptStore);
    const request = read ? store.get(token) : replacement === null ? store.delete(token) : store.put(replacement, token);
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = tx.onabort = () => reject(Error('本机账户验证缓存不可用。'));
  });
}

function forgetAccount(error = null, { removeStored = true, receiptToken = remembered?.token } = {}) {
  const previous = verifiedAccount;
  verifiedAccount = null;
  remembered = null;
  lastError = error;
  if (removeStored) {
    try { globalThis.localStorage.removeItem(storageKey); } catch {}
    if (isToken(receiptToken)) void accountReceipt(receiptToken, null).catch(() => {});
  }
  if (previous) accountChanged();
}

function setAccount(user, authenticationMode, error = null) {
  verifiedAccount = Object.freeze({
    ...user,
    authenticationMode,
    cloudSessionVerified: authenticationMode === 'site-server',
  });
  lastError = error;
  accountChanged();
  return verifiedAccount;
}

function currentAccount() {
  if (verifiedAccount && !validSession(remembered)) {
    requestGeneration++;
    forgetAccount(sessionExpired);
  }
  if (verifiedAccount?.siteTrial && verifiedAccount.siteTrial.expiresAt <= Date.now()) {
    const { authenticationMode } = verifiedAccount;
    setAccount({ ...verifiedAccount, planType: 'free', siteTrial: null }, authenticationMode, lastError);
  }
  return verifiedAccount;
}

function validatedTrial(trial, planType) {
  if (trial == null && planType === 'free') return null;
  if (trial == null || !trialPlans.has(trial.tier) || trialPlans.get(trial.tier) !== planType ||
      !Number.isSafeInteger(trial.expiresAt) || trial.expiresAt <= 0 ||
      trial.expiresAt > Date.now() + maxTrialTerm) throw Error(accountInvalid);
  if (trial.expiresAt <= Date.now()) return null;
  return Object.freeze({ tier: trial.tier, expiresAt: trial.expiresAt });
}

function accountFromServer(user) {
  if (!user || typeof user.username !== 'string' || !user.username.trim() ||
      !Number.isSafeInteger(user.createdAt) || user.createdAt < 0 ||
      user.officialSubscriptionVerified !== false) throw Error(accountInvalid);
  const common = {
    id: user.id,
    username: user.username,
    name: typeof user.name === 'string' ? user.name : user.username,
    createdAt: user.createdAt,
    officialSubscriptionVerified: false,
  };
  if (user.id === 'site-admin' && user.role === 'administrator' && user.planType === 'pro' &&
      user.membershipSource === 'site-administrator' && user.siteTrial == null) {
    return { ...common, role: 'administrator', planType: 'pro', membershipSource: 'site-administrator', siteTrial: null };
  }
  if (user.role !== 'user' || user.membershipSource !== 'site-registration' ||
      typeof user.accountId !== 'string' || !accountIdPattern.test(user.accountId) ||
      user.id !== 'site-user:' + user.accountId) throw Error(accountInvalid);
  const siteTrial = validatedTrial(user.siteTrial, user.planType);
  return {
    ...common,
    accountId: user.accountId,
    role: 'user',
    planType: siteTrial ? user.planType : 'free',
    membershipSource: 'site-registration',
    siteTrial,
  };
}

export const getSiteAccount = () => currentAccount();
export const getSiteTrialPlan = tier => trialPlans.get(tier) ?? null;
export const isSiteGuestSession = () => guestActive;
export const getSiteAccountError = () => lastError;

export function getSitePlanCapabilities(plan = currentAccount()?.planType ?? 'free') {
  const paid = plan === 'plus' || plan === 'pro';
  return Object.freeze({ planType: paid ? plan : 'free', chat: true, modelSelection: paid, work: paid, codex: paid, dot: plan === 'pro' });
}

export const hasModelSelectionAccess = () => getSitePlanCapabilities().modelSelection;

export function getSiteSessionToken() {
  return currentAccount()?.cloudSessionVerified && !isOffline() && refreshing?.generation !== requestGeneration
    ? remembered.token : null;
}

export function getSiteHomeUrl(fallback) {
  const origin = globalThis.location.origin;
  const moduleURL = new URL(import.meta.url);
  const deployedBase = moduleURL.origin === origin && moduleURL.pathname.endsWith('/native-client/site-account.mjs')
    ? new URL(moduleURL.pathname.endsWith('/src/native-client/site-account.mjs') ? '../../' : '../', moduleURL).pathname : null;
  return resolveSiteHomeUrl(origin, deployedBase, globalThis.document?.documentElement?.dataset?.routerBasename,
    globalThis.__CHATGPT_REPLICA_ENV__?.basePath, fallback);
}

export function safeSiteReturnUrl(value) {
  const base = getSiteHomeUrl();
  try {
    const target = new URL(value || base, base);
    if (target.origin !== base.origin || target.username || target.password) return base;
    if (target.pathname === base.pathname.replace(/\/$/, '')) target.pathname = base.pathname;
    if (!target.pathname.startsWith(base.pathname) && isHistoricalSitePath(target.pathname)) {
      target.pathname = base.pathname + target.pathname.slice(1);
    }
    if (target.pathname.startsWith(base.pathname) && !getSiteAuthEntryKind(target, base)) {
      for (const key of ['localSession', 'refresh_account', 'startup_account_refresh']) target.searchParams.delete(key);
      return target;
    }
  } catch {}
  return base;
}

function accountPageUrl(path, next) {
  const url = new URL(path, getSiteHomeUrl());
  if (next !== undefined) url.searchParams.set('next', safeSiteReturnUrl(next).href);
  return url;
}

export const getSiteLoginUrl = next => accountPageUrl('login', next);
export const getSiteRegistrationUrl = next => accountPageUrl('signup', next);

export function getSitePlansUrl(next) {
  const home = getSiteHomeUrl();
  const url = new URL('site-plans/', home);
  if (next !== undefined) {
    const target = safeSiteReturnUrl(next);
    if (target.hash === '#pricing') target.hash = '';
    if (!/\/(?:site-plans|plans|pricing-plan|(?:codex\/)?purchase\/[^/]+)\/?$/.test(target.pathname)) {
      url.searchParams.set('next', target.href);
    }
  }
  return url;
}

class AccountConnectionError extends Error {
  constructor() { super(networkUnavailable); }
}

async function api(path, { body, token, keepalive = false, timeoutMs = 10000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response;
    try {
      response = await fetch(SITE_ACCOUNT_SERVICE + path, {
        method: body === undefined ? 'GET' : 'POST',
        credentials: 'omit',
        redirect: 'manual',
        cache: 'no-store',
        headers: {
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
        keepalive,
      });
    } catch {
      throw new AccountConnectionError();
    }
    if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) throw Error(accountInvalid);
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      throw Object.assign(Error(result?.error?.message || '账户服务暂时不可用。'), {
        status: response.status,
        code: result?.error?.code,
      });
    }
    if (result === null) throw Error(accountInvalid);
    return result;
  } finally {
    clearTimeout(timer);
  }
}

function sessionExpiry(candidate, result) {
  if (result.expiresAt === undefined) return candidate.expiresAt;
  if (!isFutureExpiry(result.expiresAt)) throw Error(sessionExpired);
  return Math.min(candidate.expiresAt, result.expiresAt);
}

async function saveSession(record, user, mode, generation, expectedToken) {
  const receipt = { expiresAt: record.expiresAt, ...(record.kind ? { kind: record.kind } : { user }) };
  try { await accountReceipt(record.token, receipt); }
  catch (error) { if (mode === 'offline-administrator') throw error; }
  const storedToken = readStoredSession()?.token;
  if (generation !== requestGeneration || (expectedToken !== undefined && expectedToken !== storedToken)) {
    if (storedToken !== record.token) void accountReceipt(record.token, null).catch(() => {});
    if (generation === requestGeneration) forgetAccount(null, { removeStored: false });
    return null;
  }
  try {
    if (!validSession(record)) throw Error(sessionExpired);
    globalThis.localStorage.setItem(storageKey, JSON.stringify(record));
  } catch (error) {
    void accountReceipt(record.token, null).catch(() => {});
    throw error;
  }
  remembered = record;
  return setAccount(user, mode === 'site-server' && isOffline() ? 'site-offline-cache' : mode);
}

async function restoreCachedAccount(candidate, generation, connectionError = networkUnavailable) {
  let cached = currentAccount();
  if (!cached) {
    const receipt = await accountReceipt(candidate.token).catch(() => null);
    if (receipt?.expiresAt === candidate.expiresAt && receipt.user) {
      try { cached = accountFromServer(receipt.user); } catch {}
    }
  }
  if (generation !== requestGeneration || remembered !== candidate) return null;
  if (cached && validSession(candidate)) return setAccount(cached, 'site-offline-cache', connectionError);
  lastError = connectionError;
  return null;
}

async function verifyRememberedSession(candidate, generation) {
  lastError = null;
  if (candidate.kind === offlineAdminKind) {
    const receipt = await accountReceipt(candidate.token).catch(() => null);
    if (generation !== requestGeneration) return null;
    if (candidate.username === 'TYC' && receipt?.kind === offlineAdminKind &&
        receipt.expiresAt === candidate.expiresAt && validSession(candidate)) {
      return setAccount(offlineAdministrator(), 'offline-administrator');
    }
    forgetAccount('请重新验证本站管理员账户。');
    return null;
  }
  try {
    const result = await api('/auth/session', { token: candidate.token });
    if (generation !== requestGeneration) return null;
    const user = accountFromServer(result.user);
    if (verifiedAccount && verifiedAccount.id !== user.id) throw Error(accountInvalid);
    return await saveSession({ token: candidate.token, expiresAt: sessionExpiry(candidate, result) }, user, 'site-server', generation, candidate.token);
  } catch (error) {
    if (generation !== requestGeneration) return null;
    if (error instanceof AccountConnectionError) return restoreCachedAccount(candidate, generation);
    forgetAccount(error.message || accountInvalid);
    return null;
  }
}

export function refreshSiteAccount() {
  if (guestActive) return Promise.resolve(null);
  if (refreshing?.generation === requestGeneration) return refreshing.operation;
  if (claiming?.generation === requestGeneration) {
    return claiming.operation.catch(() => {}).then(refreshSiteAccount);
  }
  if (!validSession(remembered)) {
    forgetAccount();
    return Promise.resolve(null);
  }
  const generation = requestGeneration;
  const operation = verifyRememberedSession(remembered, generation).finally(() => {
    if (refreshing?.operation !== operation) return;
    refreshing = null;
    if (generation === requestGeneration && verifiedAccount?.cloudSessionVerified) accountChanged();
  });
  refreshing = { generation, operation };
  return operation;
}

export const initializeSiteAccount = refreshSiteAccount;

export async function initializeSiteAccountForDisplay() {
  const candidate = remembered;
  if (guestActive || !validSession(candidate) || candidate.kind === offlineAdminKind) return refreshSiteAccount();
  const generation = requestGeneration;
  const cached = await restoreCachedAccount(candidate, generation, isOffline() ? networkUnavailable : null);
  if (generation !== requestGeneration) return currentAccount();
  if (!cached) return refreshSiteAccount();
  if (!isOffline()) void refreshSiteAccount();
  return cached;
}

export function startSiteGuestSession() {
  requestGeneration++;
  forgetAccount(null, { removeStored: !guestActive });
  setTabGuest(true);
  setNativeSessionFlag('1');
  return guestSession;
}

async function authenticateSiteAccount(endpoint, username, password, { legacyGuestFallback = true } = {}) {
  const generation = ++requestGeneration;
  forgetAccount(null, { removeStored: !guestActive });
  setTabGuest(false);
  try {
    const result = await api(endpoint, { body: { username, password } });
    if (generation !== requestGeneration) throw Error(cancelled);
    if (!isToken(result.token) || !isFutureExpiry(result.expiresAt)) throw Error('账户服务返回了无效的登录结果。');
    const user = accountFromServer(result.user);
    if (endpoint === '/auth/register' && (user.role !== 'user' || user.planType !== 'free')) throw Error('注册账户类型无效。');
    const verified = await saveSession({ token: result.token, expiresAt: result.expiresAt }, user, 'site-server', generation);
    if (!verified) throw Error(cancelled);
    setNativeSessionFlag('1');
    return verified;
  } catch (error) {
    if (generation === requestGeneration) {
      if (legacyGuestFallback && endpoint === '/auth/login' && error instanceof AccountConnectionError) return startSiteGuestSession();
      forgetAccount(error.message || '登录失败，请重试。');
    }
    throw error;
  }
}

function offlineAdministrator() {
  return {
    id: 'site-admin', username: 'TYC', name: 'TYC', role: 'administrator', planType: 'pro',
    membershipSource: 'site-administrator', createdAt: 0, officialSubscriptionVerified: false, siteTrial: null,
  };
}

async function loginOfflineAdministrator(password) {
  const generation = ++requestGeneration;
  forgetAccount(null, { removeStored: !guestActive });
  setTabGuest(false);
  try {
    if (!globalThis.crypto?.subtle) throw Error('此浏览器不支持本地密码验证，请通过 HTTPS 打开网站。');
    const bytes = hex => Uint8Array.from(hex.match(/../g), x => parseInt(x, 16));
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(password).toLowerCase()), 'PBKDF2', false, ['deriveBits']);
    const result = new Uint8Array(await crypto.subtle.deriveBits({
      name: 'PBKDF2', salt: bytes(offlineAdminVerifier.salt), iterations: offlineAdminVerifier.iterations, hash: 'SHA-256',
    }, material, 256));
    const expected = bytes(offlineAdminVerifier.hash);
    let mismatch = result.length ^ expected.length;
    for (let i = 0; i < expected.length; i++) mismatch |= result[i] ^ expected[i];
    if (mismatch) throw Error('用户名或密码不正确。');
    if (generation !== requestGeneration) throw Error(cancelled);
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), x => x.toString(16).padStart(2, '0')).join('');
    const record = { kind: offlineAdminKind, username: 'TYC', token, expiresAt: Date.now() + 365 * dayMs };
    const verified = await saveSession(record, offlineAdministrator(), 'offline-administrator', generation);
    if (!verified) throw Error(cancelled);
    setNativeSessionFlag('1');
    return verified;
  } catch (error) {
    if (generation === requestGeneration) forgetAccount(error.message || '本地登录失败。');
    throw error;
  }
}

export function loginSiteAccount(username, password) {
  const administrator = String(username).normalize('NFKC').trim().toLowerCase() === 'tyc';
  if (globalThis.__CHATGPT_REPLICA_ENV__?.siteAccountService) {
    if (administrator && isOffline()) return loginOfflineAdministrator(password);
    if (isOffline()) return Promise.reject(Error('请联网登录本站账户。'));
    return authenticateSiteAccount('/auth/login', username, password, { legacyGuestFallback: false }).catch(error => {
      if (administrator && error instanceof AccountConnectionError && error.message !== cancelled) return loginOfflineAdministrator(password);
      throw error;
    });
  }
  if (administrator) return loginOfflineAdministrator(password);
  if (isOffline()) return Promise.resolve(startSiteGuestSession());
  return authenticateSiteAccount('/auth/login', username, password);
}

export function registerSiteAccount(username, password) {
  return authenticateSiteAccount('/auth/register', username, password);
}

export function logoutSiteAccount({ waitForRemote = false } = {}) {
  const tabIsGuest = guestActive || getTabGuestFlag();
  const session = tabIsGuest ? null : readStoredSession() ?? remembered;
  const token = session?.kind === offlineAdminKind ? null : session?.token;
  requestGeneration++;
  forgetAccount(null, { removeStored: !tabIsGuest, receiptToken: session?.token });
  setTabGuest(false);
  setNativeSessionFlag('0');
  if (isToken(token)) {
    const revocation = api('/auth/logout', { body: {}, token, keepalive: true, timeoutMs: 2000 }).catch(() => {});
    if (waitForRemote) return revocation;
  }
}

export async function claimSiteTrial(tier) {
  if (!trialPlans.has(tier)) throw Error('请选择有效的本站试用方案。');
  const account = currentAccount();
  if (account?.role !== 'user' || account.membershipSource !== 'site-registration') throw Error('请先登录本站注册账户。');
  const token = getSiteSessionToken();
  if (!token) throw Error('请联网验证账户后再开启试用。');
  if (claiming?.generation === requestGeneration) throw Error('正在保存试用方案，请稍候。');
  const candidate = remembered;
  const generation = requestGeneration;
  const operation = (async () => {
    try {
      const result = await api('/auth/site-trial', { body: { tier }, token });
      if (generation !== requestGeneration) throw Error(cancelled);
      const updated = accountFromServer(result.user);
      if (updated.id !== account.id || updated.siteTrial?.tier !== tier) throw Error(accountInvalid);
      const verified = await saveSession({ token, expiresAt: sessionExpiry(candidate, result) }, updated, 'site-server', generation, token);
      if (!verified) throw Error(cancelled);
      return verified;
    } catch (error) {
      if (generation === requestGeneration) {
        if (error.status === 401) {
          requestGeneration++;
          forgetAccount(sessionExpired);
        } else if (error instanceof AccountConnectionError && currentAccount()) {
          setAccount(currentAccount(), 'site-offline-cache', networkUnavailable);
        }
      }
      throw error;
    }
  })();
  claiming = { generation, operation };
  try { return await operation; }
  finally { if (claiming?.operation === operation) claiming = null; }
}

globalThis.addEventListener?.('offline', () => {
  const account = currentAccount();
  if (account?.cloudSessionVerified) setAccount(account, 'site-offline-cache', networkUnavailable);
});
globalThis.addEventListener?.('online', () => {
  if (remembered && remembered.kind !== offlineAdminKind) void refreshSiteAccount();
});
globalThis.addEventListener?.('focus', () => {
  if (!isOffline() && remembered && remembered.kind !== offlineAdminKind && !currentAccount()?.cloudSessionVerified) {
    void refreshSiteAccount();
  }
});
globalThis.addEventListener?.('storage', event => {
  if (guestActive || (event.key !== storageKey && event.key !== null) || !remembered) return;
  if (readStoredSession()?.token !== remembered.token) {
    requestGeneration++;
    forgetAccount(null, { removeStored: false });
  }
});

export function renderSiteLoginPage(){
 const registration = getSiteAuthEntryKind(location.href, getSiteHomeUrl()) === 'signup';
 document.documentElement.dataset.siteAuth='true';
 document.body.dataset.siteAuth='true';
 const style=document.createElement('style');style.textContent="html[data-site-auth=true]{color-scheme:light}body[data-site-auth=true]{--auth-bg:#fff;--auth-text:#0d0d0d;--auth-muted:#5d5d5d;--auth-border:#8f8f8f;--auth-button:#0d0d0d;--auth-button-text:#fff;margin:0;min-height:100dvh;height:auto;overflow:auto;background:var(--auth-bg);color:var(--auth-text);font-family:\"OpenAI Sans\",ui-sans-serif,system-ui,-apple-system,\"Segoe UI\",sans-serif}.site-login{min-height:100dvh;display:flex;flex-direction:column;align-items:center;box-sizing:border-box;padding:28px 24px 22px;background:var(--auth-bg);color:var(--auth-text);font-size:16px;line-height:1.5}.site-login *{box-sizing:border-box}.site-login-brand{align-self:flex-start;font-size:22px;font-weight:600;line-height:28px;color:var(--auth-text);text-decoration:none}.site-login-panel{width:100%;max-width:400px;text-align:center;margin:auto 0;padding:44px 0}.site-login h1{color:var(--auth-text);font-size:32px;line-height:40px;letter-spacing:-.6px;margin:0 0 12px;font-weight:600}.site-login p{font-size:14px;line-height:22px;color:var(--auth-muted);margin:0 0 28px}.site-login form{margin:0;color:var(--auth-text)}.site-login label{display:block;text-align:left;font-size:14px;line-height:20px;color:var(--auth-text);margin:20px 0 8px}.site-login input{display:block;width:100%;height:54px;border:1px solid var(--auth-border);border-radius:28px;padding:0 20px;font:inherit;background:var(--auth-bg);color:var(--auth-text);-webkit-text-fill-color:var(--auth-text);caret-color:var(--auth-text);opacity:1;outline:none}.site-login input::placeholder{color:var(--auth-muted);opacity:1}.site-login input:focus-visible{outline:2px solid var(--auth-text);outline-offset:2px}.site-login input:-webkit-autofill{-webkit-text-fill-color:var(--auth-text);box-shadow:0 0 0 1000px var(--auth-bg) inset}.site-login button{display:block;width:100%;height:52px;padding:0 20px;border:0;border-radius:28px;margin-top:28px;background:var(--auth-button);color:var(--auth-button-text);-webkit-text-fill-color:var(--auth-button-text);font:inherit;font-weight:500;cursor:pointer;transition:opacity .15s ease}.site-login button:hover{opacity:.88}.site-login button:focus-visible,.site-login a:focus-visible{outline:2px solid var(--auth-text);outline-offset:3px}.site-login button:disabled{opacity:.55;cursor:wait}.site-login .site-login-error{color:#b42318;min-height:22px;margin:16px 0}.site-login-panel a{color:var(--auth-text);text-decoration:underline;font-size:14px;text-underline-offset:3px}.site-login .site-login-back{display:inline-block;margin-top:4px}.site-login footer{margin-top:auto;color:var(--auth-muted);font-size:12px;line-height:20px}@media (prefers-color-scheme:dark){html[data-site-auth=true]{color-scheme:dark}body[data-site-auth=true]{--auth-bg:#212121;--auth-text:#f3f3f3;--auth-muted:#b4b4b4;--auth-border:#8f8f8f;--auth-button:#f3f3f3;--auth-button-text:#0d0d0d}.site-login .site-login-error{color:#ff9f98}}@media (max-width:480px){.site-login{padding:24px 20px 20px}.site-login-panel{max-width:352px}.site-login h1{font-size:30px;line-height:38px}}@media (prefers-reduced-motion:reduce){.site-login button{transition:none}}";
  style.textContent += '.site-login button.site-login-guest{margin:0 0 20px;border:1px solid var(--auth-border);background:var(--auth-bg);color:var(--auth-text);-webkit-text-fill-color:var(--auth-text)}.site-login .site-login-guest-note{margin:-8px 0 20px}';
  document.head.append(style);
  const main = document.createElement('main');
  main.className = 'site-login';
  main.innerHTML = [
    '<a class="site-login-brand" aria-label="ChatGPT 首页">ChatGPT</a>',
    '<section class="site-login-panel">',
    '<h1>' + (registration ? '创建账户' : '欢迎回来') + '</h1>',
    '<p>' + (registration ? '使用用户名和密码创建本站免费账户' : '登录你的本站账户') + '</p>',
    '<form><label for="site-username">用户名</label>',
    '<input id="site-username" name="username" autocomplete="username" autocapitalize="off" spellcheck="false" required>',
    '<label for="site-password">密码</label><input id="site-password" name="password" type="password" autocomplete="' +
      (registration ? 'new-password" required minlength="8" maxlength="128"' : 'current-password" required') + '>',
    '<button type="submit">继续</button><p class="site-login-error" role="alert" aria-live="polite"></p></form>',
    registration ? '' : '<button class="site-login-guest" type="button">以本机访客继续</button>',
    registration ? '' : '<p class="site-login-guest-note">访客记录保存在此浏览器。</p>',
    '<p>' + (registration ? '已有账户？' : '还没有账户？') + ' <a class="site-login-switch">' +
      (registration ? '登录' : '注册') + '</a></p>',
    '<a class="site-login-back">返回 ChatGPT</a></section><footer>本站账户</footer>',
  ].join('');
  const form = main.querySelector('form');
  const message = main.querySelector('[role=alert]');
  const submit = form.querySelector('button');
  const guest = main.querySelector('.site-login-guest');
  const target = safeSiteReturnUrl(new URL(location.href).searchParams.get('next'));
  main.querySelector('.site-login-back').href = target.href;
  main.querySelector('.site-login-brand').href = getSiteHomeUrl().href;
  const switchURL = (registration ? getSiteLoginUrl : getSiteRegistrationUrl)(target.href);
  main.querySelector('.site-login-switch').href = switchURL.href;
  guest?.addEventListener('click', () => {
    startSiteGuestSession();
    location.assign(target.href);
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    submit.disabled = true;
    if (guest) guest.disabled = true;
    message.textContent = registration ? '正在创建账户…' : '正在验证账户…';
    const username = form.querySelector('[name=username]');
    const password = form.querySelector('[name=password]');
    try {
      const session = await (registration ? registerSiteAccount : loginSiteAccount)(username.value, password.value);
      password.value = '';
      message.textContent = session.role === 'guest' ? '账户服务无法连接，正在进入本机访客模式…' :
        registration ? '账户已创建，正在进入…' : '登录成功，正在进入…';
      location.assign(target.href);
    } catch (error) {
      password.value = '';
      message.textContent = error.message || (registration ? '注册失败，请重试。' : '登录失败，请重试。');
      submit.disabled = false;
      if (guest) guest.disabled = false;
    }
  });
  document.body.replaceChildren(main);
  document.title = (registration ? '注册' : '登录') + ' — ChatGPT';
}
