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
