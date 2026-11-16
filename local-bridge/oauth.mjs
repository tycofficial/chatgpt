import crypto from 'node:crypto';
import { ISSUER, RESOURCE, SCOPES, APP_NAME, AUTHORIZE_ENDPOINT, TOKEN_ENDPOINT, DISCOVERY_ENDPOINT, BridgeError } from './constants.mjs';
const random = bytes => crypto.randomBytes(bytes).toString('base64url');
export const connectionId = (clientId, subject) => crypto.createHash('sha256').update(ISSUER + '\n' + clientId + '\n' + subject).digest('hex');
const terminalRefresh = new Set(['invalid_grant', 'invalid_refresh_token', 'token_expired', 'refresh_token_expired', 'refresh_token_invalidated', 'refresh_token_reused']);
const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const scopeSet = value => typeof value === 'string' ? [...new Set(value.split(/\s+/).filter(Boolean))] : [];
const timestamp = value => typeof value === 'number' ? value < 1e12 ? value * 1000 : value : Date.parse(value) || 0;
export async function verifyIdentity(jose, token, jwks, clientId, { nonce, subject, requireNonce = true } = {}) {
  const { payload } = await jose.jwtVerify(token, jwks, { issuer: ISSUER, audience: clientId, requiredClaims: ['sub', 'exp', 'iat'], clockTolerance: 5, algorithms: ['RS256', 'ES256'] });
  if (typeof payload.sub !== 'string' || !payload.sub) throw new BridgeError('INVALID_SUBJECT', 'OpenAI did not return a valid account identity');
  if ((requireNonce || payload.nonce !== undefined) && !equal(payload.nonce, nonce)) throw new BridgeError('NONCE_MISMATCH', 'The OpenAI authorization nonce did not match');
  if ((Array.isArray(payload.aud) && payload.aud.length > 1 || payload.azp !== undefined) && payload.azp !== clientId) throw new BridgeError('AUTHORIZED_PARTY_MISMATCH', 'The ID token authorized party did not match this client');
  if (subject && payload.sub !== subject) throw new BridgeError('ACCOUNT_MISMATCH', 'The selected ChatGPT registration belongs to a different account');
  return payload;
}
export async function verifyAccess(jose, token, jwks, clientId, subject) {
  const { payload } = await jose.jwtVerify(token, jwks, { issuer: ISSUER, audience: RESOURCE, requiredClaims: ['sub', 'exp', 'iat'], clockTolerance: 5, algorithms: ['RS256', 'ES256'] });
  if (typeof payload.sub !== 'string' || !payload.sub || subject && payload.sub !== subject || payload.client_id !== clientId) throw new BridgeError('ACCESS_IDENTITY_MISMATCH', 'OpenAI access-token identity does not match the selected registration');
  return payload;
}
export class OpenAiSessions {
  constructor({ store, jose, fetch = globalThis.fetch, now = Date.now, jwks = null }) { this.store = store; this.jose = jose; this.fetch = fetch; this.now = now; this.jwks = jwks; this.pending = new Map(); this.inFlightRefresh = new Map(); this.discovery = null; }
  async configuration() {
    if (!this.discovery) {
      const response = await this.fetch(DISCOVERY_ENDPOINT, { redirect: 'error', signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new BridgeError('OIDC_UNAVAILABLE', 'OpenAI identity discovery is unavailable', { status: response.status });
      const value = await response.json();
      if (value.issuer !== ISSUER || value.authorization_endpoint !== AUTHORIZE_ENDPOINT || value.token_endpoint !== TOKEN_ENDPOINT || new URL(value.jwks_uri).origin !== ISSUER) throw new BridgeError('INVALID_DISCOVERY', 'OpenAI identity discovery did not match the expected production issuer');
      this.discovery = value;
    }
    this.jwks ??= this.jose.createRemoteJWKSet(new URL(this.discovery.jwks_uri), { timeoutDuration: 15000 });
    return this.discovery;
  }
  async accounts() { return this.store.read('accounts.json', { activeId: null, registrations: [] }); }
  async credential(id) { if (!/^[a-f0-9]{64}$/.test(id || '')) throw new BridgeError('INVALID_ACCOUNT', 'Select a saved ChatGPT account'); return this.store.read('credentials/' + id + '.json'); }
  async updateAccounts(fn) { return this.store.withLock('accounts-index', async () => { const value = await this.accounts(); await fn(value); await this.store.write('accounts.json', value); return value; }); }
  async start({ redirectUri, selectedId = null, enablePlan = false }) {
    const callback = new URL(redirectUri);
    if (callback.protocol !== 'http:' || callback.hostname !== '127.0.0.1' || callback.pathname !== '/auth/callback' || !callback.port || callback.username || callback.password || callback.search || callback.hash) throw new BridgeError('INVALID_CALLBACK', 'OAuth requires an exact HTTP 127.0.0.1 callback at /auth/callback');
    await this.configuration();
    const accounts = await this.accounts(), selected = selectedId ? accounts.registrations.find(account => account.id === selectedId) : null;
    if (selectedId && !selected) throw new BridgeError('ACCOUNT_NOT_FOUND', 'Saved ChatGPT registration not found');
    const credentials = selected?.subject ? await this.credential(selected.id) : null;
    const state = random(32), nonce = random(32), verifier = random(64), launchId = random(32);
    const attempt = { state, nonce, verifier, redirectUri, selected, clientId: selected?.clientId || 'dynamic_agent_client', expiresAt: this.now() + 10 * 60 * 1000, launchId, launched: false };
    const url = new URL(AUTHORIZE_ENDPOINT); url.search = new URLSearchParams({ client_id: attempt.clientId, ext_agent_host_id: await this.store.hostId(), response_type: 'code', redirect_uri: redirectUri, scope: SCOPES.join(' '), resource: RESOURCE, state, nonce, code_challenge_method: 'S256', code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url') }).toString();
    if (!selected) url.searchParams.set('agent_name_hint', APP_NAME);
    if (credentials?.id_token) url.searchParams.set('id_token_hint', credentials.id_token);
    if (selected?.email) url.searchParams.set('login_hint', selected.email);
    if (enablePlan) url.searchParams.set('prompt', 'consent');
    attempt.url = url.href; this.pending.set(state, attempt);
    return { launchId, expiresAt: attempt.expiresAt };
  }
  launch(launchId) { const attempt = [...this.pending.values()].find(value => value.launchId === launchId); if (!attempt || attempt.expiresAt <= this.now() || attempt.launched) throw new BridgeError('AUTHORIZATION_EXPIRED', 'Start a fresh ChatGPT sign-in attempt'); attempt.launched = true; return attempt.url; }
  async tokenRequest(form) {
    const response = await this.fetch(TOKEN_ENDPOINT, { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: new URLSearchParams(form), signal: AbortSignal.timeout(30000) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new BridgeError(body.error || 'TOKEN_EXCHANGE_FAILED', 'OpenAI token exchange failed; start a fresh sign-in if authorization expired', { status: response.status, requestId: response.headers.get('x-request-id') || response.headers.get('openai-request-id') });
    if (body.token_type?.toLowerCase() !== 'bearer' || typeof body.access_token !== 'string' || !Number.isFinite(body.expires_in) || body.expires_in <= 0) throw new BridgeError('INVALID_TOKEN_RESPONSE', 'OpenAI returned an invalid token response');
    return body;
  }
  async callback(url) {
    const state = url.searchParams.get('state'), attempt = this.pending.get(state); this.pending.delete(state);
    if (!attempt || attempt.expiresAt <= this.now() || !equal(state, attempt.state)) throw new BridgeError('STATE_MISMATCH', 'The OAuth callback state is missing, expired or already used');
    if (url.origin + url.pathname !== new URL(attempt.redirectUri).origin + '/auth/callback') throw new BridgeError('CALLBACK_MISMATCH', 'OAuth callback URI did not match this attempt');
    if (url.searchParams.has('error')) throw new BridgeError(url.searchParams.get('error') === 'access_denied' ? 'CONSENT_DECLINED' : 'AUTHORIZATION_FAILED', 'ChatGPT sign-in was not authorized; no credentials were replaced');
    const issued = url.searchParams.get('client_id');
    if (attempt.clientId === 'dynamic_agent_client') {
      if (!issued || issued === 'dynamic_agent_client' || !/^[A-Za-z0-9_-]{1,256}$/.test(issued)) throw new BridgeError('INCOMPLETE_REGISTRATION', 'OpenAI did not return an issued registration client ID');
      attempt.clientId = issued;
      // Retain registration even if its one-time code expires; it is not active yet.
      await this.updateAccounts(value => { if (!value.registrations.some(account => account.clientId === issued)) value.registrations.push({ id: connectionId(issued, 'pending'), clientId: issued, subject: null, label: '待完成的 ChatGPT 注册', verified: false }); });
    } else if (issued && issued !== attempt.clientId) throw new BridgeError('CLIENT_MISMATCH', 'OAuth returned a different client ID for the selected account');
    const code = url.searchParams.get('code'); if (!code) throw new BridgeError('MISSING_CODE', 'The callback did not contain an authorization code');
    const tokens = await this.tokenRequest({ grant_type: 'authorization_code', client_id: attempt.clientId, code, code_verifier: attempt.verifier, redirect_uri: attempt.redirectUri, resource: RESOURCE });
    if (typeof tokens.id_token !== 'string') throw new BridgeError('MISSING_ID_TOKEN', 'OpenAI did not return the ID token needed to verify this account');
    const identity = await verifyIdentity(this.jose, tokens.id_token, this.jwks, attempt.clientId, { nonce: attempt.nonce, subject: attempt.selected?.subject });
    if (identity.at_hash) { const hash = crypto.createHash('sha256').update(tokens.access_token).digest().subarray(0, 16).toString('base64url'); if (!equal(identity.at_hash, hash)) throw new BridgeError('ACCESS_HASH_MISMATCH', 'The ID token access-token hash did not match'); }
    const access = await verifyAccess(this.jose, tokens.access_token, this.jwks, attempt.clientId);
    const scopes = scopeSet(tokens.scope), id = connectionId(attempt.clientId, identity.sub);
    const record = { accessSubject: access.sub, issuer: ISSUER, subject: identity.sub, client_id: attempt.clientId, ext_agent_host_id: await this.store.hostId(), id_token: tokens.id_token, access_token: tokens.access_token, refresh_token: tokens.refresh_token || null, scopes, expiresAt: Math.min(this.now() + tokens.expires_in * 1000, access.exp * 1000), earliestRefreshAt: timestamp(tokens.earliest_refresh_at), savedAt: this.now(), originalNonce: attempt.nonce, planUseEnabled: scopes.includes('chatgpt.tokens.use.direct') && scopes.includes('resource.invoke') && scopeSet(access.scope).includes('chatgpt.tokens.use.direct') && scopeSet(access.scope).includes('resource.invoke') };
    await this.store.write('credentials/' + id + '.json', record);
    await this.updateAccounts(value => { value.registrations = value.registrations.filter(account => account.clientId !== attempt.clientId || account.subject && account.subject !== identity.sub); value.registrations.push({ id, clientId: attempt.clientId, subject: identity.sub, email: typeof identity.email === 'string' ? identity.email : null, label: typeof identity.name === 'string' ? identity.name : typeof identity.email === 'string' ? identity.email : 'ChatGPT', verified: true }); value.activeId = id; });
    return { id, planUseEnabled: record.planUseEnabled };
  }
  async select(id) { const value = await this.accounts(); if (!value.registrations.some(account => account.id === id && account.verified)) throw new BridgeError('ACCOUNT_NOT_FOUND', 'Choose a verified saved ChatGPT registration'); await this.updateAccounts(state => { state.activeId = id; }); }
  async accessToken(id = null) {
    id ??= (await this.accounts()).activeId;
    const existing = await this.credential(id);
    if (!existing?.access_token) throw new BridgeError('SIGN_IN_REQUIRED', 'Continue with ChatGPT to authorize this local bridge');
    if (!existing.planUseEnabled) throw new BridgeError('PLAN_SCOPE_MISSING', 'ChatGPT plan usage was not granted; enable it explicitly from the local settings');
    if (existing.expiresAt > this.now() + 60000 || existing.expiresAt > this.now() && existing.earliestRefreshAt > this.now()) return existing.access_token;
    if (this.inFlightRefresh.has(id)) return this.inFlightRefresh.get(id);
    const refresh = this.store.withLock('refresh-' + id, async () => {
      const current = await this.credential(id); if (current?.expiresAt > this.now() + 60000) return current.access_token;
      if (!current?.refresh_token) throw new BridgeError('SIGN_IN_REQUIRED', 'The renewable ChatGPT session is unavailable; sign in again');
      if (current.earliestRefreshAt > this.now()) throw new BridgeError('REFRESH_NOT_YET', 'OpenAI has not yet allowed this session to refresh');
      await this.configuration();
      let tokens;
      try { tokens = await this.tokenRequest({ grant_type: 'refresh_token', client_id: current.client_id, refresh_token: current.refresh_token, resource: RESOURCE }); }
      catch (error) { if (terminalRefresh.has(error.code)) await this.store.write('credentials/' + id + '.json', { ...current, access_token: null, refresh_token: null, id_token: null, planUseEnabled: false }); throw error; }
      if (typeof tokens.refresh_token !== 'string' || !tokens.refresh_token) throw new BridgeError('MISSING_ROTATED_REFRESH', 'OpenAI refresh did not supply a replacement refresh token');
      if (tokens.id_token) { const identity = await verifyIdentity(this.jose, tokens.id_token, this.jwks, current.client_id, { subject: current.subject, nonce: current.originalNonce, requireNonce: false }); if (identity.at_hash) { const hash = crypto.createHash('sha256').update(tokens.access_token).digest().subarray(0, 16).toString('base64url'); if (!equal(identity.at_hash, hash)) throw new BridgeError('ACCESS_HASH_MISMATCH', 'The refreshed access-token hash did not match'); } }
      const claims = await verifyAccess(this.jose, tokens.access_token, this.jwks, current.client_id, current.accessSubject), scopes = tokens.scope === undefined ? current.scopes : scopeSet(tokens.scope);
      const replacement = { ...current, ...tokens, scopes, expiresAt: Math.min(this.now() + tokens.expires_in * 1000, claims.exp * 1000), earliestRefreshAt: timestamp(tokens.earliest_refresh_at), savedAt: this.now(), planUseEnabled: scopes.includes('chatgpt.tokens.use.direct') && scopes.includes('resource.invoke') && scopeSet(claims.scope).includes('chatgpt.tokens.use.direct') && scopeSet(claims.scope).includes('resource.invoke') };
      await this.store.write('credentials/' + id + '.json', replacement);
      if (!replacement.planUseEnabled) throw new BridgeError('PLAN_SCOPE_MISSING', 'ChatGPT plan permission is no longer present');
      return replacement.access_token;
    });
    this.inFlightRefresh.set(id, refresh);
    try { return await refresh; } finally { this.inFlightRefresh.delete(id); }
  }
  async signOut(id) { return this.store.withLock('refresh-' + id, async () => {
    const current = await this.credential(id); if (!current) return { remoteRevocationConfirmed: false };
    let confirmed = false;
    if (current.refresh_token) { try {
      const config = await this.configuration(); const endpoint = new URL(config.revocation_endpoint); if (endpoint.origin !== ISSUER) throw new BridgeError('INVALID_REVOCATION_ENDPOINT', 'Unexpected OpenAI revocation endpoint');
      for (let attempt = 0; attempt < 3; attempt++) {
        try { const r = await this.fetch(endpoint, { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: current.refresh_token, token_type_hint: 'refresh_token', client_id: current.client_id }), signal: AbortSignal.timeout(15000) }); if (r.status === 200) { confirmed = true; break; } if (r.status < 500) break; } catch {}
        if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 500 * 2 ** attempt));
      }
    } catch {} }
    await this.store.write('credentials/' + id + '.json', { ...current, access_token: null, refresh_token: null, id_token: null, planUseEnabled: false });
    await this.updateAccounts(value => { if (value.activeId === id) value.activeId = null; });
    return { remoteRevocationConfirmed: confirmed, usageUrl: 'https://chatgpt.com/settings/usage' };
    });
  }
}
