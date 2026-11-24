import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createSiteInferenceTransport, isSiteInferenceCheckpoint } from '../src/native-client/site-inference-transport.mjs';
import { LocalAppServer } from '../src/native-client/local-app-server.mjs';
import { createModelCatalogAdapter } from '../src/native-client/model-catalog-adapter.mjs';
import * as catalog from '../src/native-client/model-catalog.js';
import { streamCompletion } from '../runtime.js';

const baseURL = 'https://site-worker.example', route = '/inference/v1/responses';
const models = createModelCatalogAdapter(catalog), model = 'gpt-6.2-sol';
const clockStart = 1700000000000;
const payload = { model, input: 'Recover the response.', stream: true, store: false };
const uuid = index => '00000000-0000-4000-8000-' + index.toString().padStart(12, '0');
const sse = (type, data) => `data: ${JSON.stringify({ type, ...data })}\n\n`;
const textItem = (id, text, phase = 'final_answer') => ({ type: 'message', id, role: 'assistant', phase, content: [{ type: 'output_text', text }] });
const finish = output => sse('response.completed', { response: { status: 'completed', model, output, service_tier: 'default' } });
const streamResponse = (body, startedAt = clockStart) => new Response(body, { headers: { 'Content-Type': 'text/event-stream', 'X-Chat-Started-At': String(startedAt) } });
const receipt = (id, { data = [], ...fields } = {}) => Response.json({ id, status: 'completed', startedAt: clockStart, finishedAt: clockStart + 40,
  httpStatus: 200, contentType: 'text/event-stream', providerRequestId: 'provider-fixture', error: null, hasMore: false,
  chunks: data.map((text, seq) => ({ seq, data: text })), ...fields });
const deferred = () => { let resolve; const promise = new Promise(ready => { resolve = ready; }); return { promise, resolve }; };

test('a rewritten optional public summary leaves the streamed summary and final answer intact', async () => {
  const data = sse('response.reasoning_summary_text.delta', { output_index: 0, delta: 'Actual streamed summary.' }) + finish([
    { id: 'r', type: 'reasoning', summary: [{ type: 'summary_text', text: 'Shorter terminal summary.' }] },
    textItem('m', 'Confirmed final answer.'),
  ]);
  const result = await streamCompletion({ settings: { model, reasoningEffort: 'low', apiTransport: 'responses' }, messages: [{ role: 'user', content: 'Neutral test input' }], responsesTransport: async () => streamResponse(data) });
  assert.equal(result.content, 'Confirmed final answer.');
  assert.equal(result.reasoning, 'Actual streamed summary.');
});

function transport(fetchImpl, specific = {}) {
  let counter = 0;
  return createSiteInferenceTransport({ baseURL, getSessionToken: async () => 'fixture-bearer', getAccountId: () => 'test-user',
    uuid: () => uuid(++counter), pollIntervalMs: 1, maxNetworkRetries: 2,
    fetchImpl: (url, options) => {
      assert.equal(url.origin, baseURL);
      assert.equal(options.headers.Authorization, 'Bearer fixture-bearer');
      return fetchImpl(url, options);
    }, ...specific });
}

test('persist before POST, recover a lost admission acknowledgement using GET, and keep the same request identity', async () => {
  const checkpoint = {}, saved = [], activities = [];
  const upstreamText = finish([textItem('m', '真实回复')]);
  const client = transport(async (url, options) => {
    activities.push(options.method ?? 'GET');
    if (options.method === 'POST') {
      assert.equal(url.pathname, route);
      assert.equal(options.headers['X-Chat-Request-Id'], uuid(1));
      assert.equal(saved.at(-1).siteRequestId, uuid(1));
      assert.equal(saved.at(-1).state, 'submitted');
      assert.deepEqual(JSON.parse(options.body), payload);
      throw new TypeError('Load failed');
    }
    assert.equal(url.pathname, route + '/' + uuid(1));
    assert.equal(url.searchParams.get('after'), '-1');
    return receipt(uuid(1), { data: [upstreamText] });
  });
  const options = { checkpoint, onCheckpoint: async value => saved.push(structuredClone(value)) };
  assert.equal(await (await client.request(payload, options)).text(), upstreamText);
  assert.equal(await (await client.request(payload, options)).text(), upstreamText);
  assert.deepEqual(activities, ['POST', 'GET', 'GET']);
  assert.equal(checkpoint.finishedAt, clockStart + 40);
  assert.ok(!JSON.stringify(checkpoint).includes('fixture-bearer'));
});

test('a live disconnect inside Chinese UTF-8 resumes the suffix across journal pages', { timeout: 3000 }, async () => {
  const head = 'data: {"delta":"中国🙂"}\n\n', tail = finish([textItem('m', '中国🙂')]);
  const encoder = new TextEncoder(), bytes = encoder.encode(head), polls = [];
  let posts = 0, upstream;
  const client = transport(async (url, options) => {
    if (options.method === 'POST') {
      posts++;
      return streamResponse(new ReadableStream({ start(controller) {
        upstream = controller;
        controller.enqueue(bytes.subarray(0, encoder.encode('data: {"delta":"').length + 1));
      } }));
    }
    const after = Number(url.searchParams.get('after'));
    polls.push(after);
    if (after === -1) return receipt(uuid(1), { data: [head], hasMore: true, status: 'running', finishedAt: null });
    return receipt(uuid(1), { chunks: [{ seq: 1, data: tail }] });
  });
  const checkpoint = {};
  const response = await client.request(payload, { checkpoint });
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let text = decoder.decode((await reader.read()).value, { stream: true });
  upstream.error(new TypeError('Load failed'));
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  assert.equal(text + decoder.decode(), head + tail);
  assert.deepEqual(polls, [-1, 0]);
  assert.equal(posts, 1);
  assert.equal(checkpoint.state, 'completed');
});

test('an unavailable or foreign saved receipt cannot issue a replacement request', async () => {
  const checkpoint = { route: 'site-inference', siteRequestId: uuid(1), ownerId: 'test-user', state: 'submitted' };
  let methods = [], owner = 'test-user';
  const client = transport(async (_url, options) => {
    methods.push(options.method ?? 'GET');
    return Response.json({}, { status: 404 });
  }, { getAccountId: () => owner });
  await assert.rejects(client.request(payload, { checkpoint }), { code: 'SITE_INFERENCE_RECEIPT_UNAVAILABLE', status: 404 });
  owner = 'other-owner';
  await assert.rejects(client.request(payload, { checkpoint }), { code: 'SITE_INFERENCE_SIGN_IN', status: 401 });
  assert.deepEqual(methods, ['GET']);
});

test('reopening before admission retries the identical UUID and payload after a 404', async () => {
  const checkpoint = {}, events = [];
  const closing = new AbortController();
  const first = transport(async (_url, options) => {
    events.push(options.headers['X-Chat-Request-Id']);
    closing.abort();
    throw closing.signal.reason;
  });
  await assert.rejects(first.request(payload, { checkpoint, signal: closing.signal, getAbortMode: () => 'pagehide' }), { name: 'AbortError' });
  const output = finish([textItem('m', 'Recovered once')]);
  const reopened = transport(async (_url, options) => {
    if (options.method === 'POST') {
      events.push(options.headers['X-Chat-Request-Id']);
      assert.deepEqual(JSON.parse(options.body), payload);
      return new Response(output);
    }
    events.push('receipt');
    return Response.json({}, { status: 404 });
  });
  await assert.rejects(reopened.request({ ...payload, input: 'Modified payload' }, { checkpoint }), { status: 404 });
  assert.equal(await (await reopened.request(payload, { checkpoint })).text(), output);
  assert.deepEqual(events, [uuid(1), 'receipt', 'receipt', uuid(1)]);
});

test('reopening a reasoning request retains the body saved before admission across the summary change', async () => {
  const request = { ...payload, reasoning: { effort: 'low' } };
  const summaryRequest = { ...request, reasoning: { effort: 'low', summary: 'auto' } };
  const currentCheckpoint = {}, closing = new AbortController();
  const first = transport(async (_url, options) => {
    assert.equal(options.headers['X-Chat-Request-Id'], uuid(1));
    assert.deepEqual(JSON.parse(options.body), summaryRequest);
    assert.equal(currentCheckpoint.requestPublicSummary, true);
    closing.abort();
    throw closing.signal.reason;
  });
  await assert.rejects(first.request(request, { checkpoint: currentCheckpoint, signal: closing.signal, getAbortMode: () => 'pagehide' }), { name: 'AbortError' });

  const previousCheckpoint = { route: 'site-inference', siteRequestId: uuid(2), ownerId: 'test-user', state: 'submitted',
    submittedAt: Date.now(), bodyHash: createHash('sha256').update(JSON.stringify(request)).digest('hex') };
  const replies = finish([textItem('m', 'Recovered once')]), submitted = [];
  const reopened = transport(async (_url, options) => {
    if (options.method !== 'POST') return Response.json({}, { status: 404 });
    submitted.push([options.headers['X-Chat-Request-Id'], JSON.parse(options.body)]);
    return new Response(replies);
  });
  assert.equal(await (await reopened.request(request, { checkpoint: currentCheckpoint })).text(), replies);
  assert.equal(await (await reopened.request(request, { checkpoint: previousCheckpoint })).text(), replies);
  assert.deepEqual(submitted, [[uuid(1), summaryRequest], [uuid(2), request]]);
});

test('explicit Stop cancels a claimed ID once, while pagehide only detaches', { timeout: 3000 }, async () => {
  for (const mode of ['user', 'pagehide']) {
    const controller = new AbortController(), checkpoint = {}, stopped = deferred(), savingStop = deferred();
    let deletes = 0;
    const client = transport(async (_url, options) => {
      if (options.method === 'DELETE') { deletes++; stopped.resolve(); return receipt(uuid(1), { status: 'cancelled' }); }
      assert.equal(options.method, 'POST');
      return streamResponse(new ReadableStream({ start(stream) {
        stream.enqueue(new TextEncoder().encode('actual partial'));
        controller.signal.addEventListener('abort', () => stream.error(controller.signal.reason), { once: true });
      } }));
    });
    const response = await client.request(payload, { checkpoint, signal: controller.signal, getAbortMode: () => mode, onCheckpoint: current => {
      if (current.state === 'cancelled') savingStop.resolve();
    } });
    const reader = response.body.getReader();
    assert.match(new TextDecoder().decode((await reader.read()).value), /actual partial/);
    controller.abort(new DOMException('Closed client stream', 'AbortError'));
    await assert.rejects(reader.read(), { name: 'AbortError' });
    if (mode === 'user') {
      await stopped.promise;
      await savingStop.promise;
      assert.equal((await client.cancel(checkpoint)).cancelled, true);
    }
    assert.equal(deletes, mode === 'user' ? 1 : 0);
  }
});

const memory = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; };
function createServer(storage, complete, extra = {}) {
  return new LocalAppServer({ storage, streamCompletion: complete, models, catalog, getExecutionPolicy: () => ({ modelSelection: true }),
    readSettings: () => ({ model, apiTransport: 'responses', apiBase: 'https://provider-fixture.example/v1', apiKey: 'neutral-key' }),
    agentOptions: { persistIntervalMs: 0, streamRetries: 2, retryDelayMs: 0 }, ...extra });
}
function launch(server, threadId, clientUserMessageId = 'fixture-message') {
  const id = threadId ?? server.dispatch('thread/start', { model, effort: 'low', executionSurface: 'work' }).result.thread.id;
  const turn = server.dispatch('turn/start', { threadId: id, clientUserMessageId, input: [{ type: 'text', text: 'Execute this fixture.' }] });
  const done = terminal(server, id);
  turn.afterReply();
  return { threadId: id, turn: turn.result.turn, done };
}
function terminal(server, threadId) {
  return new Promise(resolve => {
    const unsubscribe = server.subscribe(({ method, params }) => {
      if (method === 'turn/completed' && params.threadId === threadId) { unsubscribe(); resolve(params.turn); }
    });
  });
}

test('close after a real tool and saved public text, then restore the same leg without repeating either', { timeout: 4000 }, async () => {
  const storage = memory(), visible = deferred(), savedPartial = '已收到文件。', finalText = savedPartial + ' 后续内容。';
  const tool = { type: 'function_call', id: 'itm-tool', call_id: 'call-tool', name: 'fixture_write', arguments: '{}' };
  const leg1 = finish([tool]), delta = sse('response.output_text.delta', { output_index: 0, delta: savedPartial });
  const leg2 = finish([textItem('final', finalText)]);
  let executions = 0, posts = 0, polls = [], clock = clockStart;
  const executor = { tools: [{ type: 'function', function: { name: 'fixture_write' } }], async execute() { executions++; return { content: [{ type: 'text', text: 'actual tool output' }] }; } };
  const client = transport(async (url, options) => {
    if (options.method === 'POST') {
      posts++;
      assert.equal(options.headers['X-Chat-Request-Id'], uuid(posts));
      const stored = JSON.parse(storage.getItem('cg-original-app-server:v1')).threads[0].turns.at(-1).adapterMetadata.checkpoint;
      assert.equal(stored.inFlight.transport.siteRequestId, uuid(posts));
      clock += 25;
      if (posts === 1) return streamResponse(leg1, clock);
      const sent = JSON.parse(options.body);
      assert.ok(sent.input.some(item => item.type === 'function_call_output' && item.call_id === 'call-tool'));
      return streamResponse(new ReadableStream({ start(stream) {
        stream.enqueue(new TextEncoder().encode(delta));
        options.signal.addEventListener('abort', () => stream.error(options.signal.reason), { once: true });
      } }), clock);
    }
    assert.notEqual(options.method, 'DELETE');
    const id = url.pathname.split('/').at(-1), after = Number(url.searchParams.get('after'));
    polls.push([id, after]);
    if (id === uuid(1)) {
      clock = Math.max(clock, clockStart + 40);
      return receipt(id, { startedAt: clockStart + 25, finishedAt: clockStart + 40, data: after === -1 ? [leg1] : [] });
    }
    return receipt(id, { startedAt: clockStart + 65, finishedAt: clockStart + 150, data: [delta, leg2] });
  });
  const complete = options => streamCompletion({ ...options, responsesTransport: (data, wire) => client.request(data, { ...options.transportContext, signal: wire.signal }) });
  const server = createServer(storage, complete, { toolExecutor: executor, now: () => clock });
  server.subscribe(event => { if (event.method === 'item/agentMessage/delta' && event.params.delta === savedPartial) visible.resolve(); });
  const first = launch(server);
  await visible.promise;
  server.interrupt(first.threadId, { reason: 'pagehide' });
  assert.equal((await first.done).status, 'interrupted');
  assert.equal(posts, 2);
  assert.equal(executions, 1);

  clock += 20000;
  const restored = createServer(storage, complete, { toolExecutor: executor, now: () => clock });
  const before = restored.getThread(first.threadId).turns.at(-1);
  assert.equal(before.items.find(item => item.type === 'agentMessage').text, savedPartial);
  const reattach = restored.dispatch('turn/resume', { threadId: first.threadId, turnId: first.turn.id });
  const appended = [];
  restored.subscribe(event => { if (event.method === 'item/agentMessage/delta') appended.push(event.params.delta); });
  const done = terminal(restored, first.threadId);
  reattach.afterReply();
  const after = await done;
  assert.equal(after.status, 'completed');
  assert.equal(after.items.find(item => item.type === 'agentMessage').text, finalText);
  assert.deepEqual(appended, [' 后续内容。']);
  // A reader may prefetch the first leg's journal at EOF before it consumes
  // the already queued terminal event and cancels the response.
  const firstLegCursors = polls.filter(([id]) => id === uuid(1)).map(([, after]) => after);
  assert.ok(firstLegCursors.length > 0);
  assert.equal(new Set(firstLegCursors).size, firstLegCursors.length);
  assert.ok(firstLegCursors.every(after => after === -1 || after === Number.MAX_SAFE_INTEGER));
  assert.deepEqual(polls.filter(([id]) => id !== uuid(1)), [[uuid(2), -1]]);
  assert.equal(posts, 2);
  assert.equal(executions, 1);
  assert.equal(after.durationMs, 150);
  assert.equal(after.adapterMetadata.checkpoint.metrics.at(-1).workerDurationMs, 85);
  assert.equal(after.items.filter(item => item.type === 'reasoning').at(-1).durationMs, 85);
});


test('interleaved public summaries and assistant messages can replay the same saved stream across refresh', { timeout: 4000 }, async () => {
  const storage = memory(), visible = deferred();
  const summary = (summary_index, delta) => sse('response.reasoning_summary_text.delta', {
    output_index: 0, summary_index, delta,
  });
  const initial = [
    summary(1, 'Second public summary.'),
    summary(0, 'First public'),
    sse('response.output_item.added', { output_index: 1, item: textItem('preamble', '', 'commentary') }),
    sse('response.output_text.delta', { output_index: 1, delta: 'Earlier body' }),
    sse('response.output_item.added', { output_index: 2, item: textItem('final', '') }),
    sse('response.output_text.delta', { output_index: 2, delta: 'Final body' }),
    summary(0, ' summary.'),
    sse('response.output_text.delta', { output_index: 1, delta: ' has more.' }),
  ].join('');
  const output = finish([
    { id: 'reasoning', type: 'reasoning', summary: [
      { type: 'summary_text', text: 'First public summary.' },
      { type: 'summary_text', text: 'Second public summary.' },
    ] },
    textItem('preamble', 'Earlier body has more.', 'commentary'),
    textItem('final', 'Final body after reconnect.'),
  ]);
  let posts = 0;
  const client = transport(async (url, options) => {
    if (options.method === 'POST') {
      posts++;
      return streamResponse(new ReadableStream({ start(stream) {
        stream.enqueue(new TextEncoder().encode(initial));
        options.signal.addEventListener('abort', () => stream.error(options.signal.reason), { once: true });
      } }));
    }
    assert.equal(url.pathname, route + '/' + uuid(1));
    return receipt(uuid(1), { data: [initial, output] });
  });
  const complete = options => streamCompletion({ ...options,
    responsesTransport: (data, wire) => client.request(data, { ...options.transportContext, signal: wire.signal }),
  });
  const server = createServer(storage, complete);
  server.subscribe(event => {
    if (event.method === 'item/agentMessage/delta' && event.params.delta === ' has more.') visible.resolve();
  });
  const first = launch(server);
  await visible.promise;
  server.interrupt(first.threadId, { reason: 'pagehide' });
  assert.equal((await first.done).status, 'interrupted');

  const restored = createServer(storage, complete);
  const before = restored.getThread(first.threadId).turns[0];
  const bodies = turn => turn.items.filter(item => item.type === 'agentMessage');
  assert.deepEqual(bodies(before).map(item => item.text), ['Earlier body has more.', 'Final body']);
  const append = [];
  restored.subscribe(({ method, params }) => {
    if (method === 'item/agentMessage/delta') append.push(params.delta);
  });
  const done = terminal(restored, first.threadId);
  restored.dispatch('turn/resume', { threadId: first.threadId, turnId: first.turn.id }).afterReply();
  const result = await done;
  assert.equal(result.status, 'completed', result.adapterMetadata.lastFailure?.message);
  assert.deepEqual(bodies(result).map(item => item.id), bodies(before).map(item => item.id));
  assert.deepEqual(bodies(result).map(item => [item.phase, item.text]), [
    ['commentary', 'Earlier body has more.'], ['final_answer', 'Final body after reconnect.'],
  ]);
  assert.deepEqual(result.items.find(item => item.type === 'reasoning').summary,
    ['Second public summary.', 'First public summary.']);
  assert.deepEqual(append, [' after reconnect.']);
  assert.equal(posts, 1);
});

test('a confirmed interrupted receipt keeps its saved text and rejects stale resume', { timeout: 4000 }, async () => {
  const storage = memory();
  const savedText = 'Saved text before the interruption.';
  const partial = sse('response.output_text.delta', { output_index: 0, delta: savedText });
  const requests = [];
  const client = transport(async (url, request) => {
    if (request.method === 'POST') {
      const id = request.headers['X-Chat-Request-Id'];
      requests.push(['POST', id]);
      if (id === uuid(1)) return streamResponse(partial);
      assert.ok(JSON.stringify(JSON.parse(request.body).input).includes(savedText));
      return streamResponse(finish([textItem('follow', 'Continued from the saved text.')]));
    }
    const id = url.pathname.split('/').at(-1);
    requests.push([request.method, id]);
    if (id !== uuid(1)) return receipt(id);
    return receipt(id, { status: 'interrupted', data: [partial],
      error: { code: 'INFERENCE_INTERRUPTED', message: 'The server stopped this request.' } });
  });
  const complete = options => streamCompletion({
    ...options, responsesTransport: (data, wire) => client.request(data, { ...options.transportContext, signal: wire.signal }),
  });
  const first = launch(createServer(storage, complete));
  const stopped = await first.done;
  assert.equal(stopped.adapterMetadata.resumable, false);
  assert.equal(stopped.adapterMetadata.lastFailure.code, 'INFERENCE_INTERRUPTED');
  const restored = createServer(storage, complete);
  const saved = restored.getThread(first.threadId).turns.at(-1);
  assert.equal(saved.items.find(item => item.type === 'agentMessage').text, savedText);
  assert.throws(() => restored.dispatch('turn/resume', { threadId: first.threadId }), {
    data: { adapterCode: 'INFERENCE_INTERRUPTED' },
  });
  assert.equal((await launch(restored, first.threadId, 'new-fixture-message').done).status, 'completed');
  assert.deepEqual(requests.filter(([method]) => method === 'POST'), [['POST', uuid(1)], ['POST', uuid(2)]]);
});

test('a plain stream lost after provider pinning retains text and never resubmits on reopen', { timeout: 3000 }, async () => {
  const storage = memory();
  let calls = 0;
  const server = createServer(storage, async options => {
    calls++;
    if (calls > 1) {
      assert.ok(options.messages.some(message => message.content === 'Actual partial text'));
      return { content: 'Continued from retained text.', finish_reason: 'stop' };
    }
    options.transportContext.checkpoint.apiProviderId = 'fixture-provider';
    await options.transportContext.onCheckpoint();
    options.onDelta('Actual partial text', { content: 'Actual partial text' });
    throw new TypeError('Load failed');
  });
  const started = launch(server);
  const failed = await started.done;
  assert.equal(failed.adapterMetadata.resumePolicy, 'manual');
  assert.equal(failed.adapterMetadata.resumable, false);
  assert.equal(failed.adapterMetadata.lastFailure.code, 'PLAIN_INFERENCE_INTERRUPTED');

  const restored = createServer(storage, server.streamCompletion);
  assert.throws(() => restored.dispatch('turn/resume', { threadId: started.threadId }), { data: { adapterCode: 'PLAIN_INFERENCE_INTERRUPTED' } });
  const duplicate = restored.dispatch('turn/addUserMessage', { threadId: started.threadId, clientUserMessageId: 'fixture-message', input: [{ type: 'text', text: 'Execute this fixture.' }] });
  assert.equal(duplicate.result.admissionOutcome, 'duplicate');
  assert.equal(duplicate.result.turn.items.find(item => item.type === 'agentMessage').text, 'Actual partial text');
  assert.equal(calls, 1);
  assert.equal((await launch(restored, started.threadId, 'new-fixture-message').done).status, 'completed');
  assert.equal(calls, 2);
});
