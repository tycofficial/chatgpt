import test from 'node:test';
import assert from 'node:assert/strict';
import { syncFixture } from './chat-sync-fixture.mjs';

const path = '/inference/v1/responses';
const type = { 'Content-Type': 'text/event-stream' };
const encoder = new TextEncoder();
const started = 'data: {"type":"response.output_text.delta","delta":"已收到 🌐"}\n\n';
const completed = 'data: {"type":"response.completed","response":{"status":"completed","model":"gpt-6.2-sol","service_tier":"default","usage":{"input_tokens":12,"output_tokens":4}}}\n\n';

async function prepare(t) {
  const fixture = await syncFixture();
  t.after(() => fixture.DB.raw.close());
  fixture.env.DOCODE_API_KEY = 'neutral-fixture';
  const promises = [];
  const context = { waitUntil(work) { promises.push(work); } };
  const claim = (actor, tier = 'plus') => fixture.call('/auth/site-trial', { method: 'POST', token: actor.token, body: { tier } });
  const submit = (actor, id, model = 'gpt-6.2-sol', additions = {}) => fixture.call(path, {
    method: 'POST', token: actor.token, body: { model, stream: true, input: 'Neutral fixture', ...additions },
    headers: { 'X-Chat-Request-Id': id }, context,
  });
  const receipt = (actor, id, suffix = '', method = 'GET') => fixture.call(path + '/' + id + suffix, { method, token: actor.token });
  return { ...fixture, claim, submit, receipt, settle: () => Promise.all(promises) };
}

test('one account admits one paid inference, records its exact UTF-8 prefix and recovers after disconnect', async t => {
  const f = await prepare(t);
  assert.equal((await f.claim(f.alice)).status, 200);
  let writer;
  const upstream = t.mock.method(globalThis, 'fetch', async () => new Response(
    new ReadableStream({ start(controller) { writer = controller; } }), { headers: { ...type, 'X-Request-Id': 'real-fixture-id' } },
  ));
  const id = crypto.randomUUID();
  const [first, second] = await Promise.all([f.submit(f.alice, id), f.submit(f.alice, id)]);
  const fresh = first.status === 200 ? first : second, duplicate = fresh === first ? second : first;
  assert.equal(fresh.status, 200);
  assert.equal(duplicate.status, 202);
  assert.equal((await duplicate.json()).reattached, true);
  assert.equal(fresh.headers.get('X-Chat-Request-Id'), id);
  assert.ok(Number(fresh.headers.get('X-Chat-Started-At')) <= Date.now());
  assert.match(fresh.headers.get('Access-Control-Expose-Headers'), /X-Chat-Started-At/);
  assert.equal(upstream.mock.callCount(), 1);

  const client = fresh.body.getReader();
  const encoded = encoder.encode(started);
  writer.enqueue(encoded.slice(0, encoded.length - 6));
  writer.enqueue(encoded.slice(encoded.length - 6));
  let firstVisible = '';
  const decoder = new TextDecoder();
  while (firstVisible.length < started.length) firstVisible += decoder.decode((await client.read()).value, { stream: true });
  const ongoing = await (await f.receipt(f.alice, id)).json();
  assert.equal(ongoing.status, 'running');
  assert.equal(ongoing.chunks.map(chunk => chunk.data).join(''), firstVisible);
  assert.equal((await f.receipt(f.bob, id)).status, 404);
  await client.cancel();
  writer.enqueue(encoder.encode(completed));
  writer.close();
  await f.settle();

  const recovered = await (await f.receipt(f.alice, id + '?after=-1')).json();
  assert.equal(recovered.status, 'completed');
  assert.equal(recovered.providerRequestId, 'real-fixture-id');
  assert.equal(recovered.model, 'gpt-6.2-sol');
  assert.equal(recovered.serviceTier, 'default');
  assert.equal(recovered.chunks.map(chunk => chunk.data).join(''), started + completed);
  assert.ok(recovered.finishedAt >= recovered.startedAt);
  assert.equal((await (await f.receipt(f.alice, id, '?after=9007199254740991')).json()).chunks.length, 0);
  assert.equal((await f.submit(f.alice, id, 'gpt-6.2-sol', { input: 'different' })).status, 409);
  assert.equal(upstream.mock.callCount(), 1);
  const usage = await (await f.call('/inference/v1/usage', { token: f.alice.token })).json();
  assert.deepEqual(
    { requests: usage.sources[0].requests, completed: usage.sources[0].completed, input: usage.sources[0].input_tokens, output: usage.sources[0].output_tokens },
    { requests: 1, completed: 1, input: 12, output: 4 },
  );
  assert.equal(usage.plan.planType, 'plus');
});

test('the first public text is saved and sent without waiting for the normal chunk timer', async t => {
  const f = await prepare(t);
  assert.equal((await f.claim(f.alice)).status, 200);
  let writer;
  t.mock.method(globalThis, 'fetch', async () => new Response(
    new ReadableStream({ start(controller) { writer = controller; } }), { headers: type },
  ));
  const id = crypto.randomUUID();
  const response = await f.submit(f.alice, id);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const lifecycleEvent = 'data: {"type":"response.in_progress"}\n\n';
  writer.enqueue(encoder.encode(lifecycleEvent));
  assert.equal(decoder.decode((await reader.read()).value), lifecycleEvent);

  const originalTimer = globalThis.setTimeout;
  let batchTimers = 0;
  t.mock.method(globalThis, 'setTimeout', (callback, delay, ...args) => {
    if (delay > 0 && delay <= 200) batchTimers++;
    return originalTimer(callback, delay, ...args);
  });
  try {
    writer.enqueue(encoder.encode(started));
    assert.equal(decoder.decode((await reader.read()).value), started);
    const persisted = await (await f.receipt(f.alice, id)).json();
    assert.equal(persisted.chunks.map(chunk => chunk.data).join(''), lifecycleEvent + started);
    assert.equal(batchTimers, 0);
  } finally {
    writer.enqueue(encoder.encode(completed));
    writer.close();
    await f.settle();
  }
});

test('Free accepts only Standard Chat with atomic daily cap; Dot passes exact Pro model choices', async t => {
  const f = await prepare(t);
  f.env.FREE_DAILY_REQUESTS = '1';
  const payloads = [];
  t.mock.method(globalThis, 'fetch', async (_url, init) => {
    const body = JSON.parse(init.body);
    payloads.push(body);
    return new Response(JSON.stringify({ model: body.model, status: 'completed', output: [] }), { headers: { 'Content-Type': 'application/json' } });
  });
  const freeId = crypto.randomUUID();
  assert.equal((await f.submit(f.alice, freeId)).status, 403);
  assert.equal((await f.submit(f.alice, freeId, 'gpt-6-sol', { service_tier: 'priority' })).status, 403);
  const free = await f.submit(f.alice, freeId, 'gpt-6-sol', { reasoning: { effort: 'low' } });
  assert.equal(free.status, 200);
  await free.text();
  const refused = await f.submit(f.alice, crypto.randomUUID(), 'gpt-6-sol');
  assert.equal(refused.status, 429);
  assert.match(refused.headers.get('Retry-After'), /^\d+$/);
  assert.equal((await f.submit(f.alice, freeId, 'gpt-6-sol', { reasoning: { effort: 'low' } })).status, 202);
  assert.equal((await f.claim(f.alice, 'pro')).status, 200);
  const terra = await f.submit(f.alice, crypto.randomUUID(), 'gpt-6.1-terra', { reasoning: { effort: 'medium' } });
  const astra = await f.submit(f.alice, crypto.randomUUID(), 'gpt-6-astra', { reasoning: { effort: 'high' } });
  assert.equal(terra.status, 200);
  assert.equal(astra.status, 200);
  await Promise.all([terra.text(), astra.text(), f.settle()]);
  assert.deepEqual(payloads.map(payload => [payload.model, payload.reasoning.effort, payload.store]), [
    ['gpt-6-sol', 'low', false], ['gpt-6.1-terra', 'medium', false], ['gpt-6-astra', 'high', false],
  ]);
});

test('premature EOF, expiry of a running worker, and early cancel never dispatch the same request again', async t => {
  const f = await prepare(t);
  await f.claim(f.alice);
  const upstream = t.mock.method(globalThis, 'fetch', async () => new Response(started, { headers: type }));
  const id = crypto.randomUUID();
  assert.equal(await (await f.submit(f.alice, id)).text(), started);
  await f.settle();
  const interrupted = await (await f.receipt(f.alice, id)).json();
  assert.equal(interrupted.error.code, 'INFERENCE_INTERRUPTED');
  assert.equal(interrupted.status, 'interrupted');
  assert.equal((await f.submit(f.alice, id)).status, 202);

  f.DB.raw.prepare("UPDATE inference_receipts SET status='running',finished_at=NULL,updated_at=? WHERE id=?").run(Date.now() - 90_000, id);
  assert.equal((await (await f.receipt(f.alice, id)).json()).status, 'interrupted');
  const early = crypto.randomUUID();
  assert.equal((await (await f.receipt(f.alice, early, '', 'DELETE')).json()).status, 'cancelled');
  const lateSubmission = await f.submit(f.alice, early);
  assert.equal(lateSubmission.status, 202);
  assert.equal((await lateSubmission.json()).status, 'cancelled');
  assert.equal(upstream.mock.callCount(), 1);
});

test('Go admits Standard Chat atomically, counts earlier same-day admissions and keeps existing receipts', async t => {
  let now = Date.UTC(2026, 10, 25, 23, 59, 45);
  const reset = now + 15_000;
  t.mock.method(Date, 'now', () => now);
  const f = await prepare(t);
  f.env.FREE_DAILY_REQUESTS = '1';
  f.env.FREE_GLOBAL_DAILY_REQUESTS = '1';
  const upstream = t.mock.method(globalThis, 'fetch', async (_url, request) => {
    const { model } = JSON.parse(request.body);
    return Response.json({ model, status: 'completed', output: [] });
  });
  const usage = async actor => (await (await f.call('/inference/v1/usage', { token: actor.token })).json()).sources[0];
  const prior = crypto.randomUUID();
  const priorOptions = { reasoning: { effort: 'high' } };
  assert.equal((await f.claim(f.alice)).status, 200);
  const premium = await f.submit(f.alice, prior, 'gpt-6.2-sol', priorOptions);
  assert.equal(premium.status, 200);
  await premium.text();
  assert.equal((await f.receipt(f.alice, crypto.randomUUID(), '', 'DELETE')).status, 200);
  await f.settle();
  f.DB.raw.prepare("INSERT INTO site_billing_subscriptions VALUES ('sub_go_quota',1,?,'go','active',?,0,?,?)")
    .run(f.alice.user.accountId, reset + 86_400_000, now, now);
  assert.deepEqual((await usage(f.alice)).goDaily, { requests: 1, limit: 2, resetsAt: reset });

  for (const [model, fields] of [
    ['gpt-6.2-sol', priorOptions],
    ['gpt-6-sol', { service_tier: 'priority' }],
    ['gpt-6-sol', { reasoning: { effort: 'high' } }],
    ['gpt-6-sol', { reasoning: { mode: 'pro' } }],
  ]) {
    const denied = await f.submit(f.alice, crypto.randomUUID(), model, fields);
    assert.equal(denied.status, 403);
    assert.equal((await denied.json()).error.code, 'SITE_INFERENCE_PLAN_REQUIRED');
  }
  const unjournaled = await f.call(path, { method: 'POST', token: f.alice.token, body: { model: 'gpt-6-sol', input: 'Neutral fixture' } });
  assert.equal(unjournaled.status, 403);
  assert.equal((await f.call('/dot-computer/v1/threads/' + crypto.randomUUID(), { token: f.alice.token })).status, 403);
  assert.equal((await f.call('/bridge/status', { token: f.alice.token })).status, 403);

  const resumed = await f.submit(f.alice, prior, 'gpt-6.2-sol', priorOptions);
  assert.equal(resumed.status, 202);
  assert.equal((await resumed.json()).status, 'completed');
  assert.equal((await f.submit(f.alice, prior, 'gpt-6.2-sol', { input: 'Different fixture' })).status, 409);
  assert.equal((await f.submit(f.alice, prior, 'gpt-6.2-sol', { ...priorOptions, store: true })).status, 400);
  assert.equal((await f.receipt(f.alice, prior)).status, 200);
  assert.equal(upstream.mock.callCount(), 1);

  const input = [{ role: 'user', content: [{ type: 'input_text', text: 'Neutral fixture' },
    { type: 'input_image', image_url: 'data:image/png;base64,iVBORw0KGgo=' }] }];
  const ids = [crypto.randomUUID(), crypto.randomUUID()];
  const standard = id => f.submit(f.alice, id, 'gpt-6-sol', { input, reasoning: { mode: 'standard', effort: 'medium' } });
  const attempts = await Promise.all(ids.map(standard));
  assert.deepEqual(attempts.map(response => response.status).sort(), [200, 429]);
  const accepted = attempts.find(response => response.status === 200);
  const refused = attempts.find(response => response.status === 429);
  assert.equal(refused.headers.get('Retry-After'), '15');
  assert.equal((await refused.json()).error.code, 'SITE_GO_LIMIT');
  await accepted.text();
  assert.deepEqual(JSON.parse(upstream.mock.calls[1].arguments[1].body).input, input);
  assert.equal((await standard(accepted.headers.get('X-Chat-Request-Id'))).status, 202);
  assert.deepEqual((await usage(f.alice)).goDaily, { requests: 2, limit: 2, resetsAt: reset });
  assert.equal((await usage(f.alice)).freeDaily.requests, 0);

  const free = await f.submit(f.bob, crypto.randomUUID(), 'gpt-6-sol');
  assert.equal(free.status, 200);
  await free.text();
  assert.equal((await f.submit(f.bob, crypto.randomUUID(), 'gpt-6-sol')).status, 429);
  assert.equal((await usage(f.bob)).goDaily, undefined);

  f.env.GO_DAILY_REQUESTS = '3';
  const extra = await standard(crypto.randomUUID());
  assert.equal(extra.status, 200);
  await extra.text();
  assert.deepEqual((await usage(f.alice)).goDaily, { requests: 3, limit: 3, resetsAt: reset });
  assert.equal((await standard(crypto.randomUUID())).status, 429);
  now = reset;
  assert.deepEqual((await usage(f.alice)).goDaily, { requests: 0, limit: 3, resetsAt: reset + 86_400_000 });
  const nextDay = await standard(crypto.randomUUID());
  assert.equal(nextDay.status, 200);
  await nextDay.text();
  await f.settle();
  assert.equal(upstream.mock.callCount(), 5);
});
