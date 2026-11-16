import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { ProtectedStore } from '../secure-store.mjs';
import { loadJose } from '../dependencies.mjs';
import { OpenAiSessions, connectionId, verifyIdentity, verifyAccess } from '../oauth.mjs';
import { BridgeClient, OfficialResponses } from '../bridge-client.mjs';
import { normalizeResponsesRequest, attemptKey, ResponsesObserver } from '../protocol.mjs';
import { JobJournal } from '../journal.mjs';
import { createLocalUi } from '../server.mjs';
import { ISSUER, RESOURCE, SCOPES, AUTHORIZE_ENDPOINT, TOKEN_ENDPOINT, DISCOVERY_ENDPOINT } from '../constants.mjs';

let jose, signing, jwks, protectedRoot;
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
const discovery = { issuer: ISSUER, authorization_endpoint: AUTHORIZE_ENDPOINT, token_endpoint: TOKEN_ENDPOINT, jwks_uri: ISSUER + '/.well-known/jwks.json', revocation_endpoint: ISSUER + '/oauth/revoke' };
const testDirectory = process.env.LOCAL_BRIDGE_TEST_DIR || (process.platform === 'win32' ? 'D:/ChatGPT-Local-Bridge/test-state' : '/tmp/tyc-chatgpt-local-bridge-tests');
before(async () => {
  protectedRoot = await new ProtectedStore(path.join(testDirectory, crypto.randomUUID())).initialize();
  jose = await loadJose(); signing = await jose.generateKeyPair('RS256');
  jwks = jose.createLocalJWKSet({ keys: [{ ...await jose.exportJWK(signing.publicKey), kid: 'fixture-signing-key', alg: 'RS256', use: 'sig' }] });
});
async function store() {
  const directory = protectedRoot.resolve('case-' + crypto.randomUUID());
  await fs.mkdir(directory, { mode: 0o700 });
  await fs.mkdir(path.join(directory, 'jobs'), { mode: 0o700 });
  await fs.mkdir(path.join(directory, 'locks'), { mode: 0o700 });
  return new ProtectedStore(directory);
}
async function jwt(claims, audience, options = {}) {
  return new jose.SignJWT(claims).setProtectedHeader({ alg: 'RS256', kid: 'fixture-signing-key' }).setIssuer(ISSUER).setAudience(audience).setIssuedAt().setExpirationTime(options.exp || '1h').sign(signing.privateKey);
}
async function oauthFixture(scopes = SCOPES.join(' ')) {
  const disk = await store(), requests = [], fixture = { nonce: '', exchanges: 0, refreshes: 0, scopes, subject: 'fixture-user', accessSubject: 'fixture-access-subject' };
  const fetch = async (input, options = {}) => {
    const url = String(input); requests.push({ url, method: options.method || 'GET', form: options.body ? Object.fromEntries(options.body) : null });
    if (url === DISCOVERY_ENDPOINT) return json(discovery);
    if (url === discovery.revocation_endpoint) return json({});
    assert.equal(url, TOKEN_ENDPOINT); const form = new URLSearchParams(options.body), clientId = form.get('client_id');
    if (form.get('grant_type') === 'refresh_token') { fixture.refreshes++; await new Promise(resolve => setTimeout(resolve, 20)); }
    else fixture.exchanges++;
    const access = await jwt({ sub: fixture.accessSubject, client_id: clientId, scope: fixture.scopes }, RESOURCE);
    const at_hash = crypto.createHash('sha256').update(access).digest().subarray(0, 16).toString('base64url');
    return json({ token_type: 'Bearer', access_token: access, id_token: await jwt({ sub: fixture.subject, nonce: fixture.nonce, at_hash, email: 'fixture@example.invalid', name: 'Fixture account' }, clientId), refresh_token: 'fixture-rotated-' + fixture.refreshes, expires_in: 3600, scope: fixture.scopes });
  };
  const sessions = new OpenAiSessions({ store: disk, jose, jwks, fetch });
  return { store: disk, sessions, fixture, fetch, requests };
}
async function authorize(context, options = {}) {
  const attempt = await context.sessions.start({ redirectUri: 'http://127.0.0.1:1455/auth/callback', ...options });
  const url = new URL(context.sessions.launch(attempt.launchId)); context.fixture.nonce = url.searchParams.get('nonce');
  const callback = new URL(url.searchParams.get('redirect_uri')); callback.search = new URLSearchParams({ state: url.searchParams.get('state'), code: 'fixture-one-time-code', ...(url.searchParams.get('client_id') === 'dynamic_agent_client' ? { client_id: 'fixture_issued_client' } : {}) });
  return { result: await context.sessions.callback(callback), url, callback };
}

test('protected host identity is stable and traversal is rejected', async () => {
  const disk = await store(); assert.equal(await disk.hostId(), await disk.hostId());
  assert.throws(() => disk.resolve('../outside'), { code: 'INVALID_STATE_PATH' });
  await disk.write('atomic.json', { value: 'fixture' }); assert.deepEqual(await disk.read('atomic.json'), { value: 'fixture' });
});

test('Responses contract preserves model/effort and namespaces functions without unsupported fields', () => {
  const source = { model: 'fixture-model', input: [{ role: 'system', content: 'fixture policy' }, { role: 'user', content: 'fixture prompt' }], reasoning: { effort: 'high' }, store: true, stream: false, previous_response_id: 'not-supported', max_output_tokens: 42, temperature: 0.8, tools: [{ type: 'function', function: { name: 'read_fixture', parameters: { type: 'object', properties: {} } } }] };
  const normalized = normalizeResponsesRequest(source, [{ slug: 'fixture-model' }]);
  assert.equal(normalized.payload.store, false); assert.equal(normalized.payload.stream, true); assert.equal(normalized.payload.input[0].role, 'developer'); assert.equal(source.input[0].role, 'system');
  assert.deepEqual(normalized.payload.reasoning, { effort: 'high' }); assert.equal(normalized.payload.tools[0].type, 'namespace'); assert.equal(normalized.payload.tools[0].tools[0].name, 'read_fixture');
  assert.equal('previous_response_id' in normalized.payload, false); assert.equal('max_output_tokens' in normalized.payload, false); assert.equal('temperature' in normalized.payload, false);
  assert.throws(() => normalizeResponsesRequest({ model: 'unknown', input: [] }, [{ slug: 'fixture-model' }]), { code: 'MODEL_NOT_AVAILABLE' });
  assert.throws(() => normalizeResponsesRequest({ model: 'fixture-model', input: [], tools: [{ type: 'code_interpreter' }] }), { code: 'UNSUPPORTED_TOOL' });
  assert.equal(attemptKey({ payload: source, resume: false }), attemptKey({ payload: source, resume: true }));
});

test('PKCE registration uses issued client, exact redirect and one-use state', async () => {
  const context = await oauthFixture(), { result, url, callback } = await authorize(context);
  assert.equal(url.searchParams.get('client_id'), 'dynamic_agent_client'); assert.equal(url.searchParams.get('agent_name_hint'), 'TYC ChatGPT Local Bridge');
  assert.equal(url.searchParams.get('resource'), RESOURCE); assert.equal(url.searchParams.get('code_challenge_method'), 'S256'); assert.ok(url.searchParams.get('ext_agent_host_id'));
  const form = context.requests.find(item => item.form?.grant_type === 'authorization_code').form;
  assert.equal(form.client_id, 'fixture_issued_client'); assert.equal(form.redirect_uri, 'http://127.0.0.1:1455/auth/callback'); assert.equal(form.code_verifier.length, 86);
  assert.equal(crypto.createHash('sha256').update(form.code_verifier).digest('base64url'), url.searchParams.get('code_challenge'));
  assert.equal(result.planUseEnabled, true); assert.equal((await context.sessions.accounts()).activeId, result.id);
  await assert.rejects(context.sessions.callback(callback), { code: 'STATE_MISMATCH' });
  await assert.rejects(context.sessions.start({ redirectUri: 'http://localhost:1455/auth/callback' }), { code: 'INVALID_CALLBACK' });
  await assert.rejects(context.sessions.start({ redirectUri: 'http://127.0.0.1:1455/auth/callback?extra=1' }), { code: 'INVALID_CALLBACK' });
});

test('JWT verification rejects nonce/audience/subject/client mismatch and expired identity', async () => {
  const id = await jwt({ sub: 'fixture-user', nonce: 'fixture-nonce' }, 'fixture-client');
  assert.equal((await verifyIdentity(jose, id, jwks, 'fixture-client', { nonce: 'fixture-nonce' })).sub, 'fixture-user');
  const forged = id.split('.'); forged[2] = (forged[2][0] === 'A' ? 'B' : 'A') + forged[2].slice(1);
  await assert.rejects(verifyIdentity(jose, forged.join('.'), jwks, 'fixture-client', { nonce: 'fixture-nonce' }));
  await assert.rejects(verifyIdentity(jose, id, jwks, 'fixture-client', { nonce: 'wrong' }), { code: 'NONCE_MISMATCH' });
  await assert.rejects(verifyIdentity(jose, id, jwks, 'wrong-client', { nonce: 'fixture-nonce' }));
  await assert.rejects(verifyIdentity(jose, id, jwks, 'fixture-client', { nonce: 'fixture-nonce', subject: 'another-user' }), { code: 'ACCOUNT_MISMATCH' });
  const expired = await jwt({ sub: 'fixture-user', nonce: 'fixture-nonce' }, 'fixture-client', { exp: Math.floor(Date.now() / 1000) - 30 });
  await assert.rejects(verifyIdentity(jose, expired, jwks, 'fixture-client', { nonce: 'fixture-nonce' }));
  const access = await jwt({ sub: 'opaque-access-identity', client_id: 'fixture-client', scope: SCOPES.join(' ') }, RESOURCE);
  assert.equal((await verifyAccess(jose, access, jwks, 'fixture-client')).sub, 'opaque-access-identity');
  await assert.rejects(verifyAccess(jose, access, jwks, 'wrong-client'), { code: 'ACCESS_IDENTITY_MISMATCH' });
});

test('returning registration reuses client, omits agent hint and rejects another issued client', async () => {
  const context = await oauthFixture(), first = await authorize(context), attempt = await context.sessions.start({ redirectUri: 'http://127.0.0.1:1666/auth/callback', selectedId: first.result.id, enablePlan: true });
  const url = new URL(context.sessions.launch(attempt.launchId));
  assert.equal(url.searchParams.get('client_id'), 'fixture_issued_client'); assert.equal(url.searchParams.has('agent_name_hint'), false); assert.ok(url.searchParams.get('id_token_hint')); assert.equal(url.searchParams.get('prompt'), 'consent');
  const callback = new URL('http://127.0.0.1:1666/auth/callback'); callback.search = new URLSearchParams({ state: url.searchParams.get('state'), code: 'fixture', client_id: 'other_client' });
  await assert.rejects(context.sessions.callback(callback), { code: 'CLIENT_MISMATCH' }); assert.equal(context.fixture.exchanges, 1);
});

test('identity-only consent is retained but never permits plan inference', async () => {
  const context = await oauthFixture('openid profile email offline_access'), { result } = await authorize(context);
  assert.equal(result.planUseEnabled, false); assert.equal((await context.sessions.accounts()).registrations[0].verified, true);
  await assert.rejects(context.sessions.accessToken(), { code: 'PLAN_SCOPE_MISSING' });
});

test('refresh is serialized across session instances and atomically rotates tokens without scope', async () => {
  const context = await oauthFixture(), { result } = await authorize(context), credential = await context.sessions.credential(result.id);
  await context.store.write('credentials/' + result.id + '.json', { ...credential, expiresAt: Date.now() - 1 });
  const other = new OpenAiSessions({ store: context.store, jose, jwks, fetch: context.fetch });
  const values = await Promise.all([context.sessions.accessToken(), context.sessions.accessToken(), other.accessToken()]);
  assert.equal(new Set(values).size, 1); assert.equal(context.fixture.refreshes, 1);
  const form = context.requests.find(item => item.form?.grant_type === 'refresh_token').form;
  assert.equal('scope' in form, false); assert.equal(form.resource, RESOURCE); assert.equal(form.client_id, 'fixture_issued_client');
  assert.equal((await other.credential(result.id)).refresh_token, 'fixture-rotated-1');
});

test('sign-out revokes refresh, removes local tokens and keeps registration/host', async () => {
  const context = await oauthFixture(), { result } = await authorize(context), host = await context.store.hostId();
  assert.equal((await context.sessions.signOut(result.id)).remoteRevocationConfirmed, true);
  const credential = await context.sessions.credential(result.id); assert.equal(credential.access_token, null); assert.equal(credential.refresh_token, null); assert.equal(credential.id_token, null);
  assert.equal((await context.sessions.accounts()).activeId, null); assert.equal((await context.sessions.accounts()).registrations.length, 1); assert.equal(await context.store.hostId(), host);
  const revoke = context.requests.find(item => item.url === discovery.revocation_endpoint); assert.equal(revoke.form.token_type_hint, 'refresh_token');
});

test('administrator pairing discards administrator session and exposes no bridge credential', async () => {
  const disk = await store(), calls = [], client = new BridgeClient({ store: disk, sessions: {}, official: {}, baseURL: 'https://fixture-site.example', fetch: async (url, options) => {
    calls.push({ path: new URL(url).pathname, authorization: options.headers.Authorization, body: JSON.parse(options.body) });
    if (new URL(url).pathname === '/auth/login') return json({ token: 'fixture-admin-session', user: { role: 'administrator' } });
    if (new URL(url).pathname === '/bridge/pair') return json({ bridgeId: 'fixture-bridge-id', bridgeToken: 'fixture-bridge-token' });
    return json({});
  } });
  assert.deepEqual(await client.pair('fixture-admin', 'fixture-password'), { bridgeId: 'fixture-bridge-id' });
  assert.equal(calls.at(-1).path, '/auth/logout'); assert.equal(calls[1].authorization, 'Bearer fixture-admin-session');
  const text = JSON.stringify(await client.status()); assert.equal(text.includes('fixture-bridge-token'), false); assert.equal(text.includes('fixture-admin-session'), false);
  assert.equal((await disk.read('pairing.json')).bridgeToken, 'fixture-bridge-token');
});

function completedStream() {
  return 'event: response.output_text.delta\ndata: {"type":"response.output_text.delta","delta":"fixture 你好"}\n\nevent: response.completed\ndata: {"type":"response.completed","response":{"id":"fixture-response","model":"fixture-model","usage":{"input_tokens":2,"output_tokens":3}}}\n\n';
}
async function relayFixture({ stream = completedStream(), dropFirstAck = false } = {}) {
  const disk = await store(), received = new Map(), requests = [], fixture = { inferenceCalls: 0, dropped: false };
  const official = {
    async request() { fixture.inferenceCalls++; const bytes = new TextEncoder().encode(stream); return { response: new Response(new ReadableStream({ start(controller) { controller.enqueue(bytes.slice(0, 121)); controller.enqueue(bytes.slice(121, 124)); controller.enqueue(bytes.slice(124)); controller.close(); } }), { headers: { 'Content-Type': 'text/event-stream', 'x-request-id': 'fixture-request-id' } }) }; },
    async recordUsageError(error) { fixture.quotaError = error.code; },
  };
  const client = new BridgeClient({ store: disk, sessions: {}, official, baseURL: 'https://fixture-site.example', fetch: async (_url, options) => {
    const value = JSON.parse(options.body); if (!Array.isArray(value.events)) return json({ status: 'claimed', cancelled: false, ackSeq: -1 }); requests.push(value);
    for (const event of value.events) { if (received.has(event.seq)) assert.deepEqual(received.get(event.seq), event); received.set(event.seq, event); }
    if (dropFirstAck && !fixture.dropped) { fixture.dropped = true; throw Error('fixture transport lost acknowledgement'); }
    return json({ ackSeq: value.events.at(-1).seq });
  } });
  return { store: disk, client, official, fixture, received, requests, pairing: { bridgeToken: 'fixture-only-token' }, job: { id: crypto.randomUUID(), payload: { model: 'fixture-model', input: [{ role: 'user', content: 'fixture prompt' }] }, resume: false } };
}

test('relay forwards exact raw SSE, seq starts0 and lost acknowledgement cannot repeat inference', async () => {
  const context = await relayFixture({ dropFirstAck: true });
  await context.client.runJob(context.job, context.pairing);
  await context.client.runJob({ ...context.job, resume: true }, context.pairing);
  assert.equal(context.fixture.inferenceCalls, 1);
  const events = [...context.received.values()].sort((a, b) => a.seq - b.seq);
  assert.deepEqual(events.map(event => event.seq), events.map((_, index) => index));
  assert.deepEqual(events[0].data, { type: 'headers', status: 200, contentType: 'text/event-stream' });
  assert.equal(events.filter(event => event.data.type === 'data').map(event => event.data.text).join(''), completedStream());
  assert.equal(events.at(-1).data.type, 'end'); assert.equal(context.requests.at(-1).status, 'complete'); assert.equal(context.requests.at(-1).usage.output_tokens, 3);
});

test('in-stream quota failure is preserved and never reported as completed', async () => {
  const stream = 'data: {"type":"response.failed","response":{"error":{"code":"subscription_sharing_usage_limit_exceeded","message":"fixture quota pause"}}}\n\n';
  const context = await relayFixture({ stream }); await context.client.runJob(context.job, context.pairing);
  assert.equal(context.requests.at(-1).status, 'failed'); assert.equal(context.requests.at(-1).error.code, 'subscription_sharing_usage_limit_exceeded'); assert.equal(context.fixture.quotaError, 'subscription_sharing_usage_limit_exceeded');
});

test('EOF without official completed event fails and restart checkpoint never resubmits', async () => {
  const context = await relayFixture({ stream: 'data: {"type":"response.output_text.delta","delta":"partial fixture"}\n\n' }); await context.client.runJob(context.job, context.pairing);
  assert.equal(context.requests.at(-1).error.code, 'STREAM_INTERRUPTED'); assert.equal(context.requests.at(-1).status, 'failed');
  const interrupted = await relayFixture(), claim = await new JobJournal(interrupted.store).claim(interrupted.job); claim.attempt.phase = 'requesting'; await interrupted.client.journal.save(claim.state);
  await interrupted.client.runJob({ ...interrupted.job, resume: true }, interrupted.pairing);
  assert.equal(interrupted.fixture.inferenceCalls, 0); assert.equal(interrupted.requests.at(-1).error.code, 'BRIDGE_RESTART_INTERRUPTED');
  assert.equal(interrupted.received.get(0).data.status, 502); assert.equal(interrupted.requests.at(-1).status, 'failed');
});

test('catalog visibility is official, quota pause is structured and no plan/percentage is invented', async () => {
  const disk = await store(), sessions = { accounts: async () => ({ activeId: 'fixture-account' }), accessToken: async () => 'fixture-access-token' }, urls = [];
  const official = new OfficialResponses({ store: disk, sessions, fetch: async (url, options) => { urls.push({ url, options }); return json({ models: [{ slug: 'listed', display_name: 'Listed fixture', visibility: 'list' }, { slug: 'hidden', visibility: 'hide' }] }); } });
  assert.deepEqual((await official.catalog()).models, [{ slug: 'listed', display_name: 'Listed fixture' }]);
  await official.recordUsageError({ code: 'subscription_sharing_usage_limit_exceeded', status: 429, requestId: 'fixture-request' });
  const profile = await official.profile(); assert.equal(profile.authenticated, true); assert.equal(profile.planType, null); assert.equal(profile.quota.state, 'request-paused');
  assert.equal('usedPercent' in profile.quota, false); assert.equal('resetsAt' in profile.quota, false);
  await assert.rejects(official.request({ model: 'listed', input: [] }), { code: 'SUBSCRIPTION_PAUSED' });
  assert.equal(urls.length, 1); assert.equal(urls[0].url, RESOURCE + '/models');
  sessions.accessToken = async () => { throw Object.assign(Error('Fixture sign-in required'), { code: 'SIGN_IN_REQUIRED' }); };
  assert.equal((await official.profile()).authenticated, false);
});

test('local UI requires private owner launch plus cookie/CSRF and rejects foreign origins', async () => {
  const disk = await store(), bridge = { status: async () => ({ paired: false }), stop: async () => {}, pair: async () => ({ bridgeId: 'fixture' }) }, sessions = { accounts: async () => ({ activeId: null, registrations: [] }) };
  const ui = createLocalUi({ store: disk, sessions, official: {}, bridge, port: 0 });
  const { origin } = await ui.start();
  try {
    assert.equal((await fetch(origin + '/')).status, 403);
    const config = await disk.read('ui.json'), launch = await fetch(config.launchUrl, { redirect: 'manual' }); assert.equal(launch.status, 303);
    const cookie = launch.headers.get('set-cookie').split(';')[0], response = await fetch(origin + '/local/status', { headers: { Cookie: cookie } }), status = await response.json();
    assert.equal(response.status, 200); assert.ok(status.csrf); assert.equal(JSON.stringify(status).includes('launch='), false);
    const rejected = await fetch(origin + '/local/pair', { method: 'POST', headers: { Cookie: cookie, Origin: 'https://attacker.example', 'Content-Type': 'application/json', 'X-Bridge-CSRF': status.csrf }, body: '{}' }); assert.equal(rejected.status, 403);
    const missing = await fetch(origin + '/local/pair', { method: 'POST', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' }, body: '{}' }); assert.equal(missing.status, 403);
    const accepted = await fetch(origin + '/local/pair', { method: 'POST', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json', 'X-Bridge-CSRF': status.csrf }, body: '{}' }); assert.equal(accepted.status, 200);
  } finally { await ui.close(); }
});
