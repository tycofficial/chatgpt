import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_ID_STORAGE_KEY } from './auth-config.js';

const SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const SESSION_KEY = 'cg-google-session-v1';
const listeners = new Set();
let scriptPromise, initializedClientId = '', nonce = '', currentIdentity = null;
let cachedKeys = null, keysExpireAt = 0, expirationTimer;

function clientId() {
  let configured = '';
  try { configured = localStorage.getItem(GOOGLE_CLIENT_ID_STORAGE_KEY) || ''; } catch { /* Storage can be disabled. */ }
  return String(configured || GOOGLE_CLIENT_ID).trim();
}

export function isGoogleLoginConfigured() {
  return /^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId());
}

export function setGoogleClientId(value) {
  const next = String(value || '').trim();
  if (next && !/^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(next)) {
    throw new Error('请输入以 .apps.googleusercontent.com 结尾的 Google Web 应用客户端 ID。');
  }
  globalThis.google?.accounts?.id?.cancel();
  if (next) localStorage.setItem(GOOGLE_CLIENT_ID_STORAGE_KEY, next);
  else localStorage.removeItem(GOOGLE_CLIENT_ID_STORAGE_KEY);
  initializedClientId = '';
  clearSession();
}

function decodeBase64URL(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')), character => character.charCodeAt(0));
}

function decodeJSON(value) {
  return JSON.parse(new TextDecoder().decode(decodeBase64URL(value)));
}

async function publicKeys(force = false) {
  if (!force && cachedKeys && Date.now() < keysExpireAt) return cachedKeys;
  const response = await fetch(JWKS_URL, { credentials: 'omit' });
  if (!response.ok) throw new Error('暂时无法验证 Google 登录，请稍后重试。');
  const body = await response.json();
  if (!Array.isArray(body.keys)) throw new Error('Google 返回的验证密钥无效。');
  cachedKeys = body.keys;
  const maxAge = Number(response.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1] || 3600);
  keysExpireAt = Date.now() + Math.min(maxAge, 86400) * 1000;
  return cachedKeys;
}

// A signed Google ID token is verified before the local browser profile is used.
// This is a browser-local identity. A future protected backend must independently
// verify the ID token and establish its own server session.
async function verifyCredential(credential, expectedNonce) {
  if (typeof credential !== 'string' || credential.length > 20000) throw new Error('Google 登录凭据无效。');
  const parts = credential.split('.');
  if (parts.length !== 3) throw new Error('Google 登录凭据无效。');
  const header = decodeJSON(parts[0]);
  const claims = decodeJSON(parts[1]);
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw new Error('Google 登录签名类型无效。');
  let key = (await publicKeys()).find(item => item.kid === header.kid);
  if (!key) key = (await publicKeys(true)).find(item => item.kid === header.kid);
  if (!key) throw new Error('无法验证 Google 登录签名。');
  const imported = await crypto.subtle.importKey('jwk', key, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const verified = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', imported, decodeBase64URL(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]));
  if (!verified) throw new Error('Google 登录签名验证失败。');
  const now = Math.floor(Date.now() / 1000);
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audience.includes(clientId()) || (audience.length > 1 && claims.azp !== clientId())) throw new Error('Google 凭据不属于此网站。');
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss)) throw new Error('Google 登录签发方无效。');
  if (!Number.isFinite(claims.exp) || claims.exp <= now || !Number.isFinite(claims.iat) || claims.iat > now + 60) throw new Error('Google 登录已过期，请重新登录。');
  if (typeof claims.sub !== 'string' || !claims.sub || (expectedNonce && claims.nonce !== expectedNonce)) throw new Error('Google 登录请求校验失败。');
  return Object.freeze({
    provider: 'google', id: claims.sub, name: String(claims.name || ''),
    givenName: String(claims.given_name || ''), email: String(claims.email || ''),
    emailVerified: claims.email_verified === true, picture: String(claims.picture || ''),
    expiresAt: claims.exp * 1000,
  });
}

function clearSession() {
  currentIdentity = null;
  clearTimeout(expirationTimer);
  try { localStorage.removeItem(SESSION_KEY); } catch { /* Storage can be disabled. */ }
  document.cookie = 'cg-google-account=; Path=/; Max-Age=0; SameSite=Lax';
}

function setSession(identity, credential) {
  currentIdentity = identity;
  try { localStorage.setItem(SESSION_KEY, JSON.stringify({ credential })); } catch { /* Memory-only session remains usable. */ }
  const remaining = Math.max(0, Math.floor((identity.expiresAt - Date.now()) / 1000));
  document.cookie = `cg-google-account=1; Path=/; Max-Age=${remaining}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  clearTimeout(expirationTimer);
  expirationTimer = setTimeout(() => {
    clearSession();
    window.dispatchEvent(new CustomEvent('google-auth-change', { detail: null }));
  }, Math.min(identity.expiresAt - Date.now(), 2147483647));
}

export async function getIdentity() {
  if (!isGoogleLoginConfigured()) return null;
  if (currentIdentity && currentIdentity.expiresAt > Date.now()) return currentIdentity;
  let credential;
  try { credential = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')?.credential; } catch { clearSession(); return null; }
  if (!credential) return null;
  try {
    const identity = await verifyCredential(credential);
    setSession(identity, credential);
    return identity;
  } catch {
    clearSession();
    return null;
  }
}

function loadScript() {
  if (globalThis.google?.accounts?.id) return Promise.resolve(globalThis.google.accounts.id);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    const timeout = setTimeout(() => reject(new Error('无法连接 Google 登录服务，请检查网络后重试。')), 15000);
    script.onload = () => { clearTimeout(timeout); resolve(globalThis.google.accounts.id); };
    script.onerror = () => { clearTimeout(timeout); script.remove(); reject(new Error('无法连接 Google 登录服务，请检查网络后重试。')); };
    document.head.append(script);
  }).catch(error => { scriptPromise = null; throw error; });
  return scriptPromise;
}

function notifyError(error) {
  for (const listener of listeners) listener.onError?.(error);
}

async function handleCredential(response) {
  try {
    const identity = await verifyCredential(response?.credential, nonce);
    setSession(identity, response.credential);
    for (const listener of listeners) listener.onLogin?.(identity);
    window.dispatchEvent(new CustomEvent('google-auth-change', { detail: identity }));
  } catch (error) { notifyError(error); }
}

function initialize(api) {
  const id = clientId();
  if (initializedClientId === id) return;
  nonce = [...crypto.getRandomValues(new Uint8Array(24))].map(byte => byte.toString(16).padStart(2, '0')).join('');
  api.initialize({ client_id: id, callback: handleCredential, nonce, ux_mode: 'popup', auto_select: false, use_fedcm_for_prompt: true });
  initializedClientId = id;
}

export async function mountGoogleLogin(container, { onLogin, onError } = {}) {
  if (!(container instanceof Element)) throw new TypeError('Google 登录需要一个容器元素。');
  container.replaceChildren();
  if (!isGoogleLoginConfigured()) {
    container.dataset.authState = 'unconfigured';
    const message = document.createElement('p');
    message.setAttribute('role', 'status');
    message.textContent = 'Google 登录尚未启用。网站所有者需要先创建 Google OAuth Web 应用客户端，并将授权 JavaScript 来源设为 https://tycofficial.github.io。';
    const link = document.createElement('a');
    link.href = 'https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Google 登录配置说明';
    container.append(message, link);
    return { configured: false, prompt() { return false; }, destroy() { container.replaceChildren(); } };
  }
  container.dataset.authState = 'loading';
  const listener = { onLogin, onError };
  listeners.add(listener);
  try {
    const api = await loadScript();
    initialize(api);
    container.dataset.authState = 'ready';
    api.renderButton(container, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', width: Math.max(200, Math.min(400, container.clientWidth || 320)), locale: document.documentElement.lang || 'zh-CN' });
    return {
      configured: true,
      prompt() { api.prompt(); return true; },
      destroy() { listeners.delete(listener); api.cancel(); container.replaceChildren(); },
    };
  } catch (error) {
    listeners.delete(listener);
    container.dataset.authState = 'error';
    container.textContent = error.message;
    onError?.(error);
    return { configured: true, prompt() { return false; }, destroy() { container.replaceChildren(); } };
  }
}

export async function signOut({ revoke = false } = {}) {
  const identity = await getIdentity();
  clearSession();
  const api = globalThis.google?.accounts?.id;
  api?.cancel();
  api?.disableAutoSelect();
  window.dispatchEvent(new CustomEvent('google-auth-change', { detail: null }));
  if (!revoke || !identity) return { revoked: false };
  const available = api || await loadScript();
  return new Promise(resolve => {
    const timeout = setTimeout(() => resolve({ revoked: false }), 10000);
    available.revoke(identity.id, response => { clearTimeout(timeout); resolve({ revoked: response.successful === true, error: response.error || null }); });
  });
}
