import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import * as catalog from '../model-catalog.js';
import { streamCompletion } from '../runtime.js';
import { LocalAppServer } from '../src/native-client/local-app-server.mjs';
import { ClassicChatAdapter } from '../src/native-client/classic-chat-adapter.mjs';
import { createModelCatalogAdapter } from '../src/native-client/model-catalog-adapter.mjs';
import { createBrowserToolExecutor } from '../src/native-client/browser-tool-executor.mjs';

const models = createModelCatalogAdapter(catalog);
const memory = () => { const values = new Map(); return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; };
const copy = value => structuredClone(value);
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const endMessage = (text, phase = 'final_answer') => ({ type: 'message', id: 'neutral-response-message', role: 'assistant', phase, content: [{ type: 'output_text', text }] });
const sse = (event, value = {}) => `data: ${JSON.stringify({ type: event, ...value })}\n\n`;
function responseStream(produce, signal) {
  let reader;
  const body = new ReadableStream({
    start(controller) {
      reader = controller;
      Promise.resolve().then(() => produce({ emit: (type, value) => controller.enqueue(new TextEncoder().encode(sse(type, value))), close: () => controller.close() })).catch(error => { try { controller.error(error); } catch {} });
      signal?.addEventListener('abort', () => { try { controller.error(signal.reason); } catch {} }, { once: true });
    },
  });
  return new Response(body, { headers: { 'Content-Type': 'text/event-stream' } });
}
function setup({ now = Date.now, storage = memory(), toolExecutor = null, checkpointStore = null, free = false, agentOptions = {} } = {}) {
  const server = new LocalAppServer({ storage, streamCompletion, models, catalog, now, toolExecutor, checkpointStore, agentOptions: { streamRetries: 0, ...agentOptions }, getExecutionPolicy: () => free ? { modelSelection: false, fixedModel: 'gpt-6-luna', defaultEffort: 'low', allowedEfforts: ['low', 'medium'] } : { modelSelection: true }, readSettings: () => ({ model: 'gpt-6.1-sol', apiTransport: 'responses', apiBase: 'https://neutral-reasoning.invalid/v1', apiKey: 'neutral-test-only' }) });
  return { server, adapter: new ClassicChatAdapter({ appServer: server, models, now, heartbeatMs: 10000 }), storage };
}
async function withHTTP(handler, run) {
  const original = globalThis.fetch, requests = [];
  globalThis.fetch = async (input, init = {}) => {
    assert.equal(String(input), 'https://neutral-reasoning.invalid/v1/responses', 'No external/provider endpoint may be used by this fixture');
    assert.equal(init.method, 'POST');
    const payload = JSON.parse(init.body); requests.push(payload);
    return handler({ payload, number: requests.length, signal: init.signal });
  };
  try { return await run(requests); } finally { globalThis.fetch = original; }
}
function next(adapter, extra = {}) {
  const body = { action: 'next', model: 'gpt-6.1-sol', thinking_effort: 'extended', conversation_origin: 'tpp', messages: [{ id: crypto.randomUUID(), author: { role: 'user' }, content: { content_type: 'text', parts: ['Complete the neutral reasoning fixture.'] } }], ...extra };
  return adapter.handle(new Request('https://neutral-reasoning.invalid/f/conversation', { method: 'POST', body: JSON.stringify(body) }), '/f/conversation');
}
function wireMessages(wire) { return wire.split('\n\n').flatMap(block => { const text = block.startsWith('data: ') ? block.slice(6) : null; if (!text || text === '[DONE]') return []; try { const value = JSON.parse(text); return value.message ? [value.message] : []; } catch { return []; } }); }
const thoughts = wire => wireMessages(wire).filter(message => message.content.content_type === 'thoughts');
const current = server => [...server.threads.values()].at(-1);
const reasoning = turn => turn.items.filter(item => item.type === 'reasoning');
function streamFinal(emit, close, text = 'Neutral final response.', phase = 'final_answer') {
  emit('response.output_item.added', { output_index: 0, item: { ...endMessage('', phase), content: [] } });
  emit('response.output_text.delta', { output_index: 0, content_index: 0, delta: text });
  emit('response.completed', { response: { status: 'completed', output: [endMessage(text, phase)] } }); close();
}

test('Work HTTP commentary → real file → final retains real summaries and continuous lifecycle with precise seconds', async () => {
  const base = 1700000000123; let clock = base, work;
  const root = await fs.mkdtemp(path.join(process.env.TEMP || 'D:/Codex-Agent-Validation/test-temp', 'reasoning-work-'));
  const store = { async write(key, bytes) { clock += 2000; const file = path.join(root, key); await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, bytes); }, async read(key) { return new Uint8Array(await fs.readFile(path.join(root, key))); }, async list() { return []; }, async remove(key) { await fs.unlink(path.join(root, key)); } };
  const executor = createBrowserToolExecutor({ storage: store });
  const { server, adapter } = setup({ now: () => clock, toolExecutor: executor }); const events = [];
  server.subscribe(event => events.push(event));
  try {
    await withHTTP(({ number, payload, signal }) => {
      work = current(server); const turn = work.turns.at(-1), item = reasoning(turn).at(-1);
      assert.equal(item.status, 'inProgress'); assert.deepEqual(item.summary, []); assert.equal(payload.reasoning.effort, 'high');
      return responseStream(async ({ emit, close }) => {
        if (number === 1) {
          clock = base + 2500; emit('response.reasoning_summary_text.delta', { delta: '真实摘要 A 😀' });
          clock = base + 4000; streamFinal(emit, close, 'Neutral intermediate commentary.', 'commentary');
        } else if (number === 2) {
          assert.equal(turn.adapterMetadata.reasoningLifecycle.status, 'inProgress');
          assert.equal(adapter.reasoningMessage(work, turn, reasoning(turn)[0]).metadata.reasoning_status, 'is_reasoning');
          clock = base + 5000; emit('response.reasoning_summary_text.delta', { delta: 'Model summary B' });
          clock = base + 7000;
          emit('response.completed', { response: { status: 'completed', output: [{ type: 'function_call', id: 'function-actual-neutral', call_id: 'call-neutral-write', name: 'create_file', arguments: JSON.stringify({ name: 'actual.txt', content: 'Actual neutral workspace bytes.' }) }] } }); close();
        } else {
          assert.equal(number, 3); assert.equal(clock, base + 9000);
          const tool = turn.items.find(item => item.type === 'mcpToolCall'); assert.equal(tool.status, 'completed');
          const prior = adapter.reasoningMessage(work, turn, reasoning(turn)[1]);
          assert.equal(prior.metadata.reasoning_status, 'is_reasoning'); assert.equal(prior.metadata.reasoning_end_time, undefined);
          clock = base + 12000; streamFinal(emit, close);
        }
      }, signal);
    }, async requests => {
      const wire = await (await next(adapter)).text(); const turn = current(server).turns.at(-1);
      assert.equal(turn.status, 'completed'); assert.equal(requests.length, 3, 'A true final answer is not forced to continue');
      assert.deepEqual(reasoning(turn).map(item => item.startedAtMs), [base, base + 4000, base + 9000]);
      assert.deepEqual(reasoning(turn).map(item => item.durationMs), [4000, 3000, 3000]);
      assert.deepEqual(reasoning(turn).map(item => item.summary), [['真实摘要 A 😀'], ['Model summary B'], []]);
      assert.equal(turn.adapterMetadata.reasoningLifecycle.attemptDurationMs, 10000);
      assert.equal(turn.adapterMetadata.reasoningLifecycle.workDurationMs, 12000);
      assert.equal(turn.durationMs, 12000);
      assert.equal(new TextDecoder().decode(await store.read(encodeURIComponent(work.id) + '/actual.txt')), 'Actual neutral workspace bytes.');
      const messages = thoughts(wire); assert(messages.some(message => message.status === 'in_progress' && message.content.thoughts.length === 0));
      assert(messages.some(message => message.content.thoughts[0]?.summary === '真实摘要 A 😀' && message.metadata.reasoning_status === 'is_reasoning'));
      const finals = reasoning(turn).map(item => adapter.detail(work).mapping[item.id].message);
      assert.deepEqual(finals.map(message => message.metadata.finished_duration_sec), [4, 3, 3]);
      for (const message of finals) { assert.equal(message.metadata.reasoning_start_time, base / 1000); assert.equal(message.metadata.reasoning_end_time, (base + 12000) / 1000); assert.equal(message.metadata.reasoning_status, 'reasoning_ended'); assert.notEqual(message.metadata.finished_duration_sec, 0); }
      const pendingStart = events.findIndex(event => event.method === 'item/started' && event.params.item?.type === 'reasoning');
      assert(pendingStart >= 0); const firstSummary = events.findIndex(event => event.method === 'item/reasoning/summaryTextDelta'); assert(firstSummary > pendingStart);
      assert.equal(events.filter(event => event.method === 'item/reasoning/summaryTextDelta').map(event => event.params.delta).join('|'), '真实摘要 A 😀|Model summary B');
      for (const item of reasoning(turn)) assert.equal(events.filter(event => event.method === 'item/completed' && event.params.item?.id === item.id).length, 1);
      const final = wireMessages(wire).findLast(message => message.channel === 'final'); assert.equal(final.metadata.reasoning_end_time, (base + 12000) / 1000); assert.match(wire, /message_stream_complete/);
    });
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('Free Chat HTTP no-summary response starts pending before bytes and records real nonzero delay without invented thoughts', async () => {
  const { server, adapter } = setup({ free: true }); const entered = deferred(), release = deferred(); let started;
  await withHTTP(({ payload, signal }) => {
    assert.equal(payload.model, 'gpt-5.6-luna'); assert.equal(payload.reasoning.effort, 'medium');
    started = Date.now(); const item = reasoning(current(server).turns.at(-1)).at(-1); assert(item); assert.equal(item.status, 'inProgress'); assert.deepEqual(item.summary, []); entered.resolve();
    return responseStream(async ({ emit, close }) => { await release.promise; await delay(45); streamFinal(emit, close); }, signal);
  }, async requests => {
    const response = await next(adapter, { model: 'auto', thinking_effort: undefined, conversation_origin: null, system_hints: ['reason'] }); const body = response.text(); await entered.promise;
    const pending = reasoning(current(server).turns.at(-1))[0]; assert.deepEqual(pending.summary, []); assert.equal(pending.completedAtMs, null);
    release.resolve(); const wire = await body, turn = current(server).turns.at(-1), item = reasoning(turn)[0];
    assert.equal(requests.length, 1); assert.equal(turn.status, 'completed'); assert(item.durationMs >= 35); assert(item.startedAtMs <= started + 10);
    assert.deepEqual(item.summary, []); assert.deepEqual(item.content, []);
    const projected = thoughts(wire).at(-1); assert.deepEqual(projected.content.thoughts, []); assert(projected.metadata.finished_duration_sec >= 0.035); assert.equal(projected.metadata.reasoning_status, 'reasoning_ended');
  });
});

test('RPC Codex lifecycle carries real millisecond timestamps and exact model summary independently of Classic', async () => {
  let clock = 1000123; const { server } = setup({ now: () => clock }); const events = [], textSeen = deferred(); server.subscribe(event => { events.push(event); if (event.method === 'item/agentMessage/delta') { const item = server.running.get(event.params.threadId).reasoning; assert.equal(item.status, 'inProgress', 'First answer text must not prematurely end the real attempt'); assert.equal(item.completedAtMs, null); textSeen.resolve(); } });
  await withHTTP(({ signal }) => responseStream(async ({ emit, close }) => {
    clock += 1050; emit('response.reasoning_summary_text.delta', { delta: 'Only actual model summary.' });
    emit('response.output_item.added', { output_index: 0, item: { ...endMessage(''), content: [] } });
    emit('response.output_text.delta', { output_index: 0, content_index: 0, delta: 'Neutral final response.' });
    await textSeen.promise; clock += 2000; emit('response.completed', { response: { status: 'completed', output: [endMessage('Neutral final response.')] } }); close();
  }, signal), async requests => {
    const thread = server.dispatch('thread/start', { model: 'gpt-6.1-sol', effort: 'high', conversationOrigin: 'codex' }); thread.afterReply();
    const tx = server.dispatch('turn/start', { threadId: thread.result.thread.id, input: [{ type: 'text', text: 'Neutral Codex timing.' }] });
    const done = new Promise(resolve => { const off = server.subscribe(event => { if (event.method === 'turn/completed') { off(); resolve(event.params.turn); } }); }); tx.afterReply(); const turn = await done;
    const item = reasoning(turn)[0]; assert.equal(item.startedAtMs, 1000123); assert.equal(item.completedAtMs, 1003173); assert.equal(item.durationMs, 3050); assert.equal(item.status, 'completed');
    const start = events.find(event => event.method === 'item/started' && event.params.item?.type === 'reasoning'); const end = events.find(event => event.method === 'item/completed' && event.params.item?.type === 'reasoning');
    assert.deepEqual(start.params.item.summary, []); assert.equal(start.params.item.completedAtMs, null); assert.equal(end.params.item.durationMs, 3050); assert.equal(requests.length, 1);
  });
});

test('none makes no synthetic pending item while actual unexpected model summary is still preserved', async () => {
  for (const actualSummary of [false, true]) {
    const { server, adapter } = setup();
    await withHTTP(({ signal }) => responseStream(async ({ emit, close }) => { assert.equal(reasoning(current(server).turns.at(-1)).length, 0); if (actualSummary) emit('response.reasoning_summary_text.delta', { delta: 'Actual optional summary.' }); streamFinal(emit, close); }, signal), async requests => {
      const wire = await (await next(adapter, { model: 'gpt-6-luna', thinking_effort: 'zero' })).text();
      const items = reasoning(current(server).turns.at(-1)); assert.equal(items.length, actualSummary ? 1 : 0); assert.equal(thoughts(wire).length > 0, actualSummary); assert.equal(requests[0].reasoning.effort, 'none');
      if (actualSummary) assert.deepEqual(items[0].summary, ['Actual optional summary.']);
    });
  }
});

test('403 closes pending as cancelled, preserves error/manual checkpoint, and allows next ordinary input', async () => {
  let clock = 2000123; const { server, adapter } = setup({ now: () => clock });
  await withHTTP(({ number, signal }) => {
    if (number === 1) { clock += 2500; return new Response(JSON.stringify({ error: { message: 'Neutral account balance fixture.', code: 'insufficient_quota' } }), { status: 403, headers: { 'Content-Type': 'application/json' } }); }
    return responseStream(async ({ emit, close }) => { clock += 1000; streamFinal(emit, close); }, signal);
  }, async requests => {
    const failed = await (await next(adapter)).text(); const thread = current(server), turn = thread.turns[0], item = reasoning(turn)[0];
    assert.equal(turn.status, 'failed'); assert.equal(turn.adapterMetadata.resumePolicy, 'manual'); assert.equal(item.status, 'cancelled'); assert.equal(item.durationMs, 2500);
    assert.equal(thoughts(failed).at(-1).metadata.reasoning_status, 'reasoning_cancelled'); assert.equal(thoughts(failed).at(-1).metadata.finished_duration_sec, 2.5); assert.match(failed, /can_retry":false/); assert.equal(requests.length, 1);
    await (await next(adapter, { conversation_id: thread.id })).text(); assert.equal(thread.turns.at(-1).status, 'completed'); assert.equal(requests.length, 2);
  });
});

test('explicit Stop closes the observed attempt promptly and a late delta cannot re-open reasoning', async () => {
  let clock = 3000123, late; const entered = deferred(); const { server, adapter } = setup({ now: () => clock });
  await withHTTP(({ signal }) => responseStream(async ({ emit }) => { late = emit; entered.resolve(); await new Promise(() => {}); }, signal), async requests => {
    const reading = (await next(adapter)).text(); await entered.promise; const thread = current(server); clock += 4321; server.interrupt(thread.id);
    const wire = await reading, turn = thread.turns[0], item = reasoning(turn)[0];
    assert.equal(turn.status, 'interrupted'); assert.equal(item.status, 'cancelled'); assert.equal(item.durationMs, 4321); assert.equal(thoughts(wire).at(-1).metadata.reasoning_status, 'reasoning_cancelled');
    try { late('response.reasoning_summary_text.delta', { delta: 'Late rejected text' }); } catch {}
    await delay(5); assert.deepEqual(item.summary, []); assert.equal(requests.length, 1); assert.equal(server.running.size, 0);
  });
});

test('EOF with summary and complete-looking tool item remains incomplete: zero tools, zero retry, cancelled reasoning', async () => {
  let clock = 4000123, writes = 0; const executor = { tools: [{ function: { name: 'fixture_tool' } }], async execute() { writes++; return { content: [{ type: 'text', text: 'Must not run.' }] }; } };
  const { server, adapter } = setup({ now: () => clock, toolExecutor: executor });
  await withHTTP(({ signal }) => responseStream(async ({ emit, close }) => { clock += 1100; emit('response.reasoning_summary_text.delta', { delta: 'Genuine partial summary.' }); emit('response.output_item.done', { output_index: 0, item: { type: 'function_call', id: 'not-terminal', call_id: 'no-execution', name: 'fixture_tool', arguments: '{}' } }); close(); }, signal), async requests => {
    const wire = await (await next(adapter)).text(); const turn = current(server).turns[0]; assert.equal(turn.status, 'failed'); assert.equal(writes, 0); assert.equal(requests.length, 1); assert.equal(turn.adapterMetadata.lastFailure.code, 'INCOMPLETE_RESPONSE_STREAM');
    assert.deepEqual(reasoning(turn)[0].summary, ['Genuine partial summary.']); assert.equal(reasoning(turn)[0].status, 'cancelled'); assert.equal(thoughts(wire).at(-1).metadata.reasoning_status, 'reasoning_cancelled');
  });
});

test('bounded commentary closes cancelled state after three real attempts and does not fabricate final/tool success', async () => {
  let clock = 5000123; const { server, adapter } = setup({ now: () => clock });
  await withHTTP(({ signal }) => responseStream(async ({ emit, close }) => { clock += 1234; streamFinal(emit, close, 'Actual neutral intermediate text.', 'commentary'); }, signal), async requests => {
    const wire = await (await next(adapter)).text(), turn = current(server).turns[0];
    assert.equal(requests.length, 3); assert.equal(turn.status, 'failed'); assert.equal(turn.adapterMetadata.lastFailure.code, 'COMMENTARY_WITHOUT_COMPLETION'); assert.equal(reasoning(turn).length, 3);
    assert.equal(turn.adapterMetadata.reasoningLifecycle.status, 'cancelled'); assert.equal(turn.adapterMetadata.reasoningLifecycle.attemptDurationMs, 3702); assert.equal(thoughts(wire).at(-1).metadata.reasoning_status, 'reasoning_cancelled');
    assert.equal(turn.items.filter(item => item.type === 'mcpToolCall').length, 0); assert(!wire.includes('message_stream_complete'));
  });
});

test('JSON history reload retains completed time/summary exactly without inference or duration drift', async () => {
  let clock = 6000123; const { server, adapter, storage } = setup({ now: () => clock });
  await withHTTP(({ signal }) => responseStream(async ({ emit, close }) => { clock += 3456; emit('response.reasoning_summary_text.delta', { delta: 'Durable real summary.' }); streamFinal(emit, close); }, signal), async requests => {
    await (await next(adapter)).text(); const before = copy(current(server)), beforeDetail = adapter.detail(before); clock += 9_000_000;
    const restored = setup({ now: () => clock, storage }), after = restored.server.getThread(before.id);
    assert.deepEqual(reasoning(after.turns[0]), reasoning(before.turns[0])); assert.deepEqual(after.turns[0].adapterMetadata.reasoningLifecycle, before.turns[0].adapterMetadata.reasoningLifecycle);
    for (const item of reasoning(after.turns[0])) assert.deepEqual(restored.adapter.detail(after).mapping[item.id].message, beforeDetail.mapping[item.id].message);
    assert.equal(requests.length, 1); assert.equal(restored.server.running.size, 0);
  });
});

test('crash snapshot stops pending without inventing an observed end time or counting offline hours', async () => {
  let clock = 7000123; const entered = deferred(); const { server, adapter, storage } = setup({ now: () => clock });
  await withHTTP(({ signal }) => responseStream(async () => { entered.resolve(); await new Promise(() => {}); }, signal), async requests => {
    const reading = (await next(adapter)).text(); await entered.promise; server.persist();
    const snapshot = storage.getItem(server.storageKey), isolated = memory(); isolated.setItem(server.storageKey, snapshot); clock += 86_400_000;
    const restored = setup({ now: () => clock, storage: isolated }), thread = current(restored.server), item = reasoning(thread.turns[0])[0];
    assert.equal(thread.turns[0].status, 'interrupted'); assert.equal(item.status, 'cancelled'); assert.equal(item.completedAtMs, null); assert.equal(item.durationMs, null); assert.equal(requests.length, 1);
    const projected = restored.adapter.detail(thread).mapping[item.id].message; assert.equal(projected.metadata.reasoning_status, 'reasoning_cancelled'); assert.equal(projected.metadata.reasoning_end_time, undefined); assert.equal(projected.metadata.finished_duration_sec, undefined);
    server.interrupt(current(server).id); await reading;
  });
});

test('a durably confirmed in-flight result replays its real end time after detach, without another HTTP request', async () => {
  let clock = 8000123, captured = false; const saveEntered = deferred(), saveRelease = deferred(), storage = memory();
  const checkpointStore = { async save(record) { if (!captured && record.checkpoint.inFlight?.result) { captured = true; saveEntered.resolve(); await saveRelease.promise; } } };
  const { server, adapter } = setup({ now: () => clock, storage, checkpointStore });
  await withHTTP(({ signal }) => responseStream(async ({ emit, close }) => { clock += 2250; emit('response.reasoning_summary_text.delta', { delta: 'Confirmed saved result summary.' }); streamFinal(emit, close); }, signal), async requests => {
    const wire = (await next(adapter)).text(); await saveEntered.promise; const thread = current(server); clock += 500; server.interrupt(thread.id, { reason: 'pagehide' }); saveRelease.resolve(); await wire;
    const oldItemId = reasoning(thread.turns[0])[0].id; const restored = setup({ now: () => clock, storage }); clock += 60000;
    const response = await restored.adapter.handle(new Request('https://neutral-reasoning.invalid/f/conversation/resume', { method: 'POST', body: JSON.stringify({ conversation_id: thread.id, offset: 0 }) }), '/f/conversation/resume');
    const completedWire = await response.text(), turn = restored.server.getThread(thread.id).turns[0], items = reasoning(turn);
    assert.equal(requests.length, 1); assert.equal(turn.status, 'completed'); assert.equal(items.length, 1); assert.equal(items[0].id, oldItemId); assert.equal(items[0].status, 'completed'); assert.equal(items[0].completedAtMs, 8000123 + 2250); assert.equal(items[0].durationMs, 2250);
    assert.equal(thoughts(completedWire).at(-1).metadata.finished_duration_sec, 2.25); assert.equal(thoughts(completedWire).at(-1).metadata.reasoning_status, 'reasoning_ended');
  });
});

test('a genuine retryable HTTP failure cancels only its attempt while the overall reasoning activity continues', async () => {
  let clock = 9000123; const { server, adapter } = setup({ now: () => clock, agentOptions: { streamRetries: 1, retryDelayMs: 0 } });
  await withHTTP(({ number, signal }) => {
    if (number === 1) { clock += 750; throw Object.assign(Error('Neutral network fetch connection failed'), { retryable: true }); }
    const turn = current(server).turns[0]; assert.equal(turn.adapterMetadata.reasoningLifecycle.status, 'inProgress'); assert.equal(reasoning(turn).length, 2); assert.equal(reasoning(turn)[0].status, 'cancelled');
    return responseStream(async ({ emit, close }) => { clock += 1250; streamFinal(emit, close); }, signal);
  }, async requests => {
    const wire = await (await next(adapter)).text(), turn = current(server).turns[0]; assert.equal(turn.status, 'completed'); assert.equal(requests.length, 2); assert.deepEqual(reasoning(turn).map(item => item.durationMs), [750, 1250]); assert.equal(turn.adapterMetadata.reasoningLifecycle.attemptDurationMs, 2000);
    const pending = thoughts(wire).filter(message => message.metadata.reasoning_status === 'is_reasoning'); assert(pending.length >= 2); assert(pending.every(message => message.metadata.reasoning_end_time === undefined));
  });
});

test('public summary supplied only in a completed reasoning item or JSON response is retained without exposing hidden content', async () => {
  for (const json of [false, true]) {
    let clock = 10000123; const { server, adapter } = setup({ now: () => clock });
    const summary = { type: 'reasoning', id: 'actual-public-summary', summary: [{ type: 'summary_text', text: 'Actual completed-only summary 中文.' }], encrypted_content: 'neutral-ciphertext-not-UI', content: [{ type: 'reasoning_text', text: 'Not a public summary.' }] };
    await withHTTP(({ signal }) => {
      clock += 2123;
      if (json) return new Response(JSON.stringify({ status: 'completed', output: [summary, endMessage('Neutral final response.')] }), { headers: { 'Content-Type': 'application/json' } });
      return responseStream(async ({ emit, close }) => {
        emit('response.output_item.done', { output_index: 0, item: summary });
        emit('response.completed', { response: { status: 'completed', output: [summary, endMessage('Neutral final response.')] } }); close();
      }, signal);
    }, async requests => {
      const wire = await (await next(adapter)).text(), turn = current(server).turns[0]; assert.equal(turn.status, 'completed'); assert.equal(requests.length, 1);
      assert.deepEqual(reasoning(turn)[0].summary, ['Actual completed-only summary 中文.']);
      assert.equal(thoughts(wire).at(-1).content.thoughts[0].summary, 'Actual completed-only summary 中文.');
      assert(!wire.includes('neutral-ciphertext-not-UI')); assert(!wire.includes('Not a public summary.'));
    });
  }
});

test('delta, summary done, item done, and response done merge one exact summary without duplicate text', async () => {
  let clock = 11000123; const { server, adapter } = setup({ now: () => clock });
  const summary = { type: 'reasoning', id: 'deduplicated-summary', summary: [{ type: 'summary_text', text: 'Real summary 😀.' }] };
  await withHTTP(({ signal }) => responseStream(async ({ emit, close }) => {
    emit('response.output_item.added', { output_index: 0, item: { ...summary, summary: [] } });
    clock += 1350; emit('response.reasoning_summary_text.delta', { output_index: 0, item_id: summary.id, summary_index: 0, delta: 'Real ' });
    emit('response.reasoning_summary_text.done', { output_index: 0, item_id: summary.id, summary_index: 0, text: 'Real summary 😀.' });
    emit('response.output_item.done', { output_index: 0, item: summary });
    emit('response.completed', { response: { status: 'completed', output: [summary, endMessage('Neutral final response.')] } }); close();
  }, signal), async requests => {
    await (await next(adapter)).text(); const item = reasoning(current(server).turns[0])[0]; assert.deepEqual(item.summary, ['Real summary 😀.']); assert.equal(requests.length, 1); assert.equal(item.durationMs, 1350);
  });
});
