import test from 'node:test';
import assert from 'node:assert/strict';
import { syncFixture } from './chat-sync-fixture.mjs';

const key = 'neutral-test-provider-key';
const path = '/inference/v1/responses';
const model = 'gpt-6.2-sol';
const defaultPayload = { model, input: 'Neutral fixture.', stream: true };
const infer = (fixture, token, body = defaultPayload, options = {}) =>
  fixture.call(path, { method: 'POST', token, body, ...options });
const claim = (fixture, tier) =>
  fixture.call('/auth/site-trial', { method: 'POST', token: fixture.alice.token, body: { tier } });
async function expectError(response, status, code) {
  assert.equal(response.status, status);
  assert.equal((await response.json()).error.code, code);
}

test('only administrators and current site trials may use configured inference', async t => {
  const fixture = await syncFixture();
  const { DB, env, admin, alice } = fixture;
  t.after(() => DB.raw.close());
  const upstream = t.mock.method(globalThis, 'fetch', () => new Response('{}', {
    headers: { 'Content-Type': 'application/json' },
  }));

  await expectError(await infer(fixture, undefined), 401, 'SITE_AUTH_REQUIRED');
  await expectError(await infer(fixture, alice.token), 403, 'SITE_INFERENCE_PLAN_REQUIRED');
  await expectError(await infer(fixture, admin.token), 503, 'DOCODE_NOT_CONFIGURED');
  assert.equal((await claim(fixture, 'plus')).status, 200);
  await expectError(await infer(fixture, alice.token), 503, 'DOCODE_NOT_CONFIGURED');
  assert.equal(upstream.mock.callCount(), 0);

  env.DOCODE_API_KEY = key;
  assert.equal((await infer(fixture, admin.token, { ...defaultPayload, model: 'gpt-6.2-astra' })).status, 200);
  assert.equal((await infer(fixture, alice.token)).status, 200);
  assert.equal((await claim(fixture, 'promax')).status, 200);
  assert.equal((await infer(fixture, alice.token)).status, 200);
  DB.raw.prepare('UPDATE site_trials SET expires_at=? WHERE user_id=?').run(Date.now(), alice.user.accountId);
  await expectError(await infer(fixture, alice.token), 403, 'SITE_INFERENCE_PLAN_REQUIRED');
  assert.equal(upstream.mock.callCount(), 3);
});

test('inference validates stateless request fields and enforces the UTF-8 byte limit without upstream work', async t => {
  const fixture = await syncFixture();
  const { DB, env, admin } = fixture;
  t.after(() => DB.raw.close());
  env.DOCODE_API_KEY = key;
  const upstream = t.mock.method(globalThis, 'fetch', () => { throw Error('Unexpected upstream request'); });
  const get = await fixture.call(path, { token: admin.token });
  assert.equal(get.status, 405);
  assert.equal(get.headers.get('allow'), 'POST');
  await expectError(await infer(fixture, admin.token, defaultPayload, { origin: 'https://untrusted.invalid' }), 403, 'ORIGIN_NOT_ALLOWED');
  await expectError(await infer(fixture, admin.token, defaultPayload, { headers: { 'Content-Type': 'text/plain' } }), 415, 'INFERENCE_JSON_REQUIRED');
  await expectError(await infer(fixture, admin.token, defaultPayload, { rawBody: '{' }), 400, 'INVALID_INFERENCE_REQUEST');
  for (const body of [
    { ...defaultPayload, model: 'gpt-6.2' },
    { ...defaultPayload, input: {} },
    { ...defaultPayload, stream: 'true' },
    { ...defaultPayload, store: true },
    { ...defaultPayload, previous_response_id: 'neutral-shared-id' },
    { ...defaultPayload, input: [{ type: 'item_reference', id: 'neutral-shared-id' }] },
  ]) {
    await expectError(await infer(fixture, admin.token, body), 400, 'INVALID_INFERENCE_REQUEST');
  }
  await expectError(await infer(fixture, admin.token, defaultPayload, {
    headers: { 'Content-Length': String(8 * 1024 * 1024 + 1) },
  }), 413, 'INFERENCE_REQUEST_TOO_LARGE');
  await expectError(await infer(fixture, admin.token, {
    ...defaultPayload, input: '字'.repeat(Math.ceil(8 * 1024 * 1024 / 3)),
  }), 413, 'INFERENCE_REQUEST_TOO_LARGE');
  assert.equal(upstream.mock.callCount(), 0);
});

test('inference sends only its server credential upstream and streams SSE with chunk-safe redaction', { timeout: 4000 }, async t => {
  const fixture = await syncFixture();
  const { DB, env, alice } = fixture;
  t.after(() => DB.raw.close());
  env.DOCODE_API_KEY = key;
  assert.equal((await claim(fixture, 'prolite')).status, 200);
  const first = 'event: response.output_text.delta\ndata: {"type":"response.output_text.delta","delta":"试用"}\n\n';
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let stream;
  const upstreamBody = new ReadableStream({ start(controller) { stream = controller; } });
  const payload = {
    model: 'gpt-6.2-astra', stream: true, include: ['reasoning.encrypted_content'],
    input: [{ role: 'user', content: 'Neutral fixture.' }], reasoning: { effort: 'max' },
    tools: [{ type: 'function', name: 'neutral_tool', parameters: { type: 'object' } }, { type: 'web_search' }],
    tool_choice: 'auto',
  };
  const upstream = t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(url, 'https://docode.cc/v1/responses');
    assert.equal(init.method, 'POST');
    assert.equal(init.redirect, 'manual');
    const headers = new Headers(init.headers);
    assert.equal(headers.get('authorization'), 'Bearer ' + key);
    assert.equal(headers.get('cookie'), null);
    assert.equal(headers.get('origin'), null);
    assert.deepEqual(JSON.parse(init.body), { ...payload, store: false });
    return new Response(upstreamBody, { headers: {
      'Content-Type': 'Text/Event-Stream; charset=utf-8',
      'Set-Cookie': 'fixture=' + key,
      'X-Request-Id': 'neutral-request',
      'X-Untrusted': key,
    } });
  });
  stream.enqueue(encoder.encode(first));
  const response = await infer(fixture, alice.token, payload, { headers: { Cookie: 'fixture=browser' } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'text/event-stream; charset=utf-8');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('X-Request-Id'), 'neutral-request');
  assert.equal(response.headers.get('X-Inference-Route'), 'site-docode');
  assert.equal(response.headers.get('Set-Cookie'), null);
  assert.equal(response.headers.get('X-Untrusted'), null);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://tycofficial.github.io');
  assert.match(response.headers.get('Access-Control-Expose-Headers'), /X-Request-Id/);
  const reader = response.body.getReader();
  const delivered = await reader.read();
  assert.equal(decoder.decode(delivered.value), first);

  stream.enqueue(encoder.encode('data: {"type":"error","message":"' + key.slice(0, 8)));
  stream.enqueue(encoder.encode(key.slice(8) + '"}\n\n'));
  stream.close();
  let remaining = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    remaining += decoder.decode(value, { stream: true });
  }
  assert.equal(remaining + decoder.decode(), 'data: {"type":"error","message":"[redacted]"}\n\n');
  assert.equal(upstream.mock.callCount(), 1);
});

test('inference preserves provider error details and rejects upstream redirects', async t => {
  const fixture = await syncFixture();
  const { DB, env, admin } = fixture;
  t.after(() => DB.raw.close());
  env.DOCODE_API_KEY = key;
  const upstream = t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    error: { code: 'insufficient_quota', message: 'Neutral error ' + key, type: 'server_error', param: 'model' },
    request_id: 'neutral-request',
    credential: key,
  }), {
    status: 429,
    headers: { 'Content-Type': 'application/json', 'Retry-After': '30', 'X-Request-Id': 'neutral-request' },
  }));
  const response = await infer(fixture, admin.token);
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('Retry-After'), '30');
  assert.equal(response.headers.get('X-Request-Id'), 'neutral-request');
  assert.deepEqual(await response.json(), {
    error: {
      code: 'insufficient_quota', message: 'Neutral error [redacted]',
      type: 'server_error', param: 'model', request_id: 'neutral-request',
    },
  });

  upstream.mock.mockImplementationOnce(async () => new Response(key, {
    status: 307, headers: { Location: 'https://untrusted.invalid/' },
  }));
  const redirect = await infer(fixture, admin.token);
  assert.equal(redirect.headers.get('Location'), null);
  await expectError(redirect, 502, 'DOCODE_REDIRECT_BLOCKED');
  assert.equal(upstream.mock.callCount(), 2);
});
