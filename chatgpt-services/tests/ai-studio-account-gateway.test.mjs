import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createAiStudioAccountGateway } from '../ingress/ai-studio.mjs';
import worker from '../worker/service.mjs';
import { mutation, nativeDocument, syncFixture } from './chat-sync-fixture.mjs';

const site = 'https://tycofficial.github.io';
const upstream = 'https://chatgpt-admin-bridge-tyc.hushedtarragon1.chatgpt.site';
const requestRoute = '/inference/v1/responses';

async function start(t, { headerTimeoutMs, parseBodyFirst = false } = {}) {
  const backend = await syncFixture();
  const calls = [], work = [];
  const gateway = createAiStudioAccountGateway({
    headerTimeoutMs,
    fetchUpstream: (target, init) => {
      assert.equal(target.origin, upstream);
      calls.push({ path: target.pathname, headers: init.headers });
      const pending = worker.fetch(new Request(target, init), backend.env, { waitUntil: promise => work.push(promise) });
      if (headerTimeoutMs === undefined) return pending;
      // A network client's fetch rejects on abort while Worker waitUntil can complete.
      return new Promise((resolve, reject) => {
        const abort = () => reject(init.signal.reason);
        init.signal.addEventListener('abort', abort, { once: true });
        void pending.then(response => {
          if (init.signal.aborted) void response.body?.cancel().catch(() => {});
          else resolve(response);
        }, reject).finally(() => init.signal.removeEventListener('abort', abort));
      });
    },
  });
  const server = createServer(async (request, response) => {
    if (parseBodyFirst) {
      for await (const chunk of request) void chunk;
    }
    void gateway(request, response, () => {
      response.writeHead(200, { 'Content-Type': 'text/plain' });
      response.end('Existing AI Studio app');
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await Promise.allSettled(work);
    backend.DB.raw.close();
  });
  const call = (path, { method = 'GET', origin = site, token, body, headers, signal } = {}) => fetch(
    'http://127.0.0.1:' + server.address().port + path,
    {
      method, signal: signal ?? AbortSignal.timeout(3500), redirect: 'error',
      headers: {
        ...(origin && { Origin: origin }),
        ...(token && { Authorization: 'Bearer ' + token }),
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...headers,
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    },
  );
  return { ...backend, call, calls, work };
}

test('AI Studio reports a consumed request body without calling the account authority', async t => {
  const f = await start(t, { parseBodyFirst: true });
  const body = { username: 'TYC', password: 'Neutral-Admin-Only' };
  const login = await f.call('/auth/login', { method: 'POST', body });
  assert.equal(login.status, 500);
  assert.equal(login.headers.get('Access-Control-Allow-Origin'), site);
  assert.equal(login.headers.get('Vary'), 'Origin');
  assert.match(login.headers.get('Cache-Control'), /no-store/);
  assert.equal((await login.json()).error.code, 'SITE_ACCOUNT_GATEWAY_BODY_UNAVAILABLE');
  const foreign = await f.call('/auth/login', { method: 'POST', origin: 'https://unrelated.invalid', body });
  assert.equal(foreign.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal(f.calls.length, 0);
});

test('AI Studio routes use the existing account authority and keep session and history boundaries', async t => {
  const f = await start(t);
  assert.equal(await (await f.call('/', { origin: null })).text(), 'Existing AI Studio app');
  const health = await (await f.call('/health', { origin: null })).json();
  assert.equal(health.storage, 'D1');
  assert.equal(health.adminConfigured, true);

  const beforePreflight = f.calls.length;
  const options = await f.call('/auth/register', {
    method: 'OPTIONS', headers: { 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' },
  });
  assert.equal(options.status, 204);
  assert.equal(options.headers.get('Access-Control-Allow-Origin'), site);
  assert.equal((await f.call('/auth/session', { origin: 'https://unrelated.invalid', token: f.alice.token })).status, 403);
  assert.equal((await f.call('/auth/nonexistent')).status, 404);
  assert.equal(f.calls.length, beforePreflight);

  const username = 'studio_fixture_' + crypto.randomUUID().slice(0, 8);
  const password = 'Loopback-fixture-only';
  const registration = await f.call('/auth/register', { method: 'POST', body: { username, password, role: 'administrator', planType: 'pro' } });
  assert.equal(registration.status, 200);
  assert.equal(registration.headers.get('Access-Control-Allow-Origin'), site);
  assert.match(registration.headers.get('Cache-Control'), /no-store/);
  const account = await registration.json();
  assert.equal(account.user.role, 'user');
  assert.equal(account.user.planType, 'free');
  assert.equal((await f.call('/bridge/status', { token: account.token })).status, 403);
  const admin = await f.call('/auth/login', { method: 'POST', body: { username: 'TYC', password: 'Neutral-Admin-Only' } });
  assert.equal(admin.status, 200);
  assert.deepEqual(await admin.json().then(({ user }) => [user.id, user.role, user.planType]), ['site-admin', 'administrator', 'pro']);

  const choose = await f.call('/auth/site-trial', { method: 'POST', token: account.token, body: { tier: 'plus' } });
  assert.equal(choose.status, 200);
  const trial = (await choose.json()).user.siteTrial;
  const doc = nativeDocument();
  const path = '/sync/conversations/' + doc.id;
  const save = await f.call(path, { method: 'PUT', token: account.token, body: mutation(doc) });
  assert.equal(save.status, 200);
  assert.equal((await f.call(path, { token: f.bob.token })).status, 404);

  const login = await f.call('/auth/login', { method: 'POST', body: { username, password },
    headers: { Cookie: 'ignored=test', 'X-Forwarded-Host': 'unable-to-select.invalid' } });
  assert.equal(login.status, 200);
  assert.equal(f.calls.at(-1).headers.has('Cookie'), false);
  assert.equal(f.calls.at(-1).headers.has('X-Forwarded-Host'), false);
  const restored = await login.json();
  assert.equal(restored.user.id, account.user.id);
  assert.deepEqual(restored.user.siteTrial, trial);
  const restoredDocument = await f.call(path, { token: restored.token });
  assert.equal(restoredDocument.status, 200);
  assert.deepEqual((await restoredDocument.json()).document, doc);

  assert.equal((await f.call('/auth/logout', { method: 'POST', token: account.token })).status, 200);
  assert.equal((await f.call('/auth/session', { token: account.token })).status, 401);
  assert.equal((await f.call('/auth/session', { token: restored.token })).status, 200);
  assert.equal((await f.call('/auth/logout', { method: 'POST', token: restored.token })).status, 200);
  assert.equal((await f.call(path, { token: restored.token })).status, 401);
});

test('alternate account route casing cannot reach the existing app handlers', async t => {
  const f = await start(t);
  const attempts = [
    ['/Health', {}],
    ['/AUTH/session', { token: f.alice.token }],
    ['/Auth/Login', { method: 'POST', body: { username: 'TYC', password: 'Neutral-Admin-Only' } }],
  ];
  for (const [path, options] of attempts) {
    const response = await f.call(path, options);
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), site);
    assert.equal((await response.json()).error.code, 'ROUTE_NOT_FOUND');
  }
  assert.equal(f.calls.length, 0);
  assert.equal(await (await f.call('/healthy')).text(), 'Existing AI Studio app');
});

test('AI Studio health reports only readiness flags using the same configuration checks as the service routes', async t => {
  const f = await start(t);
  const actual = globalThis.fetch;
  let providerCalls = 0;
  t.mock.method(globalThis, 'fetch', (input, init) => {
    if (new URL(input).hostname === '127.0.0.1') return actual(input, init);
    providerCalls++;
    throw Error('Health and its fixture probes must not call providers');
  });
  const thread = '/dot-computer/v1/threads/' + crypto.randomUUID();
  const inference = { method: 'POST', token: f.admin.token, body: { input: 'Fixture', model: 'unsupported-fixture-model' } };
  async function check(configured) {
    const health = await f.call('/health', { origin: null });
    assert.equal(health.status, 200);
    assert.match(health.headers.get('cache-control'), /no-store/);
    assert.deepEqual(await health.json(), {
      ready: true, adminConfigured: true, storage: 'D1', version: 'admin-auth-1',
      inferenceConfigured: configured, billingConfigured: configured, dotComputerConfigured: configured,
    });
    const billing = await f.call('/billing/v1/options');
    assert.deepEqual(await billing.json(), { tiers: configured ? ['go', 'plus'] : [], checkoutAvailable: configured });
    const desktop = await f.call(thread, { token: f.admin.token });
    assert.equal(desktop.status, 200);
    assert.equal((await desktop.json()).status, configured ? 'stopped' : 'unconfigured');
    const model = await f.call(requestRoute, inference);
    assert.equal(model.status, configured ? 400 : 503);
    assert.equal((await model.json()).error.code, configured ? 'INVALID_INFERENCE_REQUEST' : 'DOCODE_NOT_CONFIGURED');
  }

  await check(false);
  Object.assign(f.env, {
    DOCODE_API_KEY: '  ',
    SITE_STRIPE_SECRET_KEY: 'sk_test_IsolatedFixture',
    SITE_STRIPE_WEBHOOK_SECRET: 'whsec_IsolatedFixture',
    SITE_STRIPE_PRICES: JSON.stringify({ go: 'price_fixture_go', plus: 'price_fixture_go' }),
    DOT_COMPUTER_PROVIDER_ORIGIN: 'https://linux-fixture.example/not-an-origin',
    DOT_COMPUTER_PROVIDER_TOKEN: 'isolated-fixture-desktop-token-only',
  });
  await check(false);
  Object.assign(f.env, {
    DOCODE_API_KEY: ' fixture-key-only ',
    SITE_STRIPE_PRICES: JSON.stringify({ go: 'price_fixture_go', plus: 'price_fixture_plus' }),
    DOT_COMPUTER_PROVIDER_ORIGIN: 'https://linux-fixture.example',
  });
  await check(true);
  assert.equal(providerCalls, 0);
});

test('AI Studio HTTP exposes SSE headers before the first output and resumes the same receipt after disconnect', async t => {
  const f = await start(t);
  f.env.DOCODE_API_KEY = 'synthetic-fixture-key';
  assert.equal((await f.call('/auth/site-trial', { method: 'POST', token: f.alice.token, body: { tier: 'plus' } })).status, 200);
  const actual = globalThis.fetch;
  const encoder = new TextEncoder();
  const delta = 'data: {"type":"response.output_text.delta","delta":"回复已开始"}\n\n';
  const terminal = 'data: {"type":"response.completed","response":{"status":"completed","model":"gpt-6.2-sol"}}\n\n';
  let writer, executions = 0;
  t.mock.method(globalThis, 'fetch', (input, init) => {
    if (String(input) !== 'https://docode.cc/v1/responses') return actual(input, init);
    executions++;
    return Promise.resolve(new Response(new ReadableStream({
      start(controller) { writer = controller; },
    }), { headers: { 'Content-Type': 'text/event-stream' } }));
  });
  const id = crypto.randomUUID();
  const request = { method: 'POST', token: f.alice.token, headers: { 'X-Chat-Request-Id': id },
    body: { model: 'gpt-6.2-sol', reasoning: { effort: 'low' }, input: 'Fixture question', stream: true } };
  const receipt = requestRoute + '/' + id + '?after=-1';
  try {
    const live = await f.call(requestRoute, request);
    assert.equal(live.status, 200);
    assert.equal(live.headers.get('X-Chat-Request-Id'), id);
    assert.match(live.headers.get('Access-Control-Expose-Headers'), /X-Chat-Request-Id/);
    const admitted = await (await f.call(receipt, { token: f.alice.token })).json();
    assert.equal(admitted.status, 'running');
    assert.equal(admitted.chunks.length, 0);
    writer.enqueue(encoder.encode(delta));
    const reader = live.body.getReader();
    assert.equal(new TextDecoder().decode((await reader.read()).value), delta);
    assert.equal((await (await f.call(receipt, { token: f.alice.token })).json()).status, 'running');
    await reader.cancel();
  } finally {
    writer?.enqueue(encoder.encode(terminal));
    writer?.close();
    await Promise.all(f.work);
  }
  const replay = await f.call(receipt, { token: f.alice.token });
  assert.equal(replay.status, 200);
  const result = await replay.json();
  assert.equal(result.status, 'completed');
  assert.equal(result.chunks.map(x => x.data).join(''), delta + terminal);
  assert.equal((await f.call(requestRoute, request)).status, 202);
  assert.equal((await f.call(receipt, { token: f.bob.token })).status, 404);
  assert.equal(executions, 1);
});

test('AI Studio HTTP returns a bounded timeout before provider headers while the Worker saves the same inference', async t => {
  const f = await start(t, { headerTimeoutMs: 150 });
  f.env.DOCODE_API_KEY = 'synthetic-fixture-key';
  const output = 'data: {"type":"response.completed","response":{"status":"completed","model":"gpt-6-sol"}}\n\n';
  const provider = Promise.withResolvers();
  let executions = 0;
  const actual = globalThis.fetch;
  t.mock.method(globalThis, 'fetch', (input, init) => {
    if (String(input) !== 'https://docode.cc/v1/responses') return actual(input, init);
    executions++;
    return provider.promise;
  });
  const id = crypto.randomUUID();
  const submission = { method: 'POST', token: f.alice.token, headers: { 'X-Chat-Request-Id': id },
    body: { model: 'gpt-6-sol', input: 'Fixture request', stream: true } };
  try {
    const response = await f.call(requestRoute, submission);
    assert.equal(response.status, 504);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), site);
    assert.equal(response.headers.has('X-Chat-Started-At'), false);
    assert.equal((await response.json()).error.code, 'SITE_UPSTREAM_TIMEOUT');
  } finally {
    provider.resolve(new Response(output, { headers: { 'Content-Type': 'text/event-stream' } }));
    await Promise.all(f.work);
  }
  const replay = await f.call(requestRoute + '/' + id + '?after=-1', { token: f.alice.token });
  assert.equal(replay.status, 200);
  const result = await replay.json();
  assert.equal(result.status, 'completed');
  assert.equal(result.chunks.map(chunk => chunk.data).join(''), output);
  assert.equal((await f.call(requestRoute, submission)).status, 202);
  assert.equal(executions, 1);
});
