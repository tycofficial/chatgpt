import assert from 'node:assert/strict';
import test from 'node:test';
import { PythonRuntime, streamCompletion } from '../runtime.js';
import { LocalAppServer, projectNativeCodexPublicSummary, wrapNativeCodexActivityItem, wrapNativeCodexWorkTiming } from '../src/native-client/local-app-server.mjs';
import { projectNativeCodexPythonResult } from '../src/native-client/native-python-activity.mjs';

const part = (index, summaryIndex, text) => ({ index, summaryIndex, text });
const event = (type, fields) => ({ type: 'response.' + type, ...fields });
const summaryText = text => ({ type: 'summary_text', text });
const reasoning = (id, summary) => ({ type: 'reasoning', id, summary });
const message = (phase, text) => ({ type: 'message', role: 'assistant', phase, content: [{ type: 'output_text', text }] });

function responses(events, onDelta) {
  const wire = events.map(value => `data: ${JSON.stringify(value)}\n\n`).join('');
  return streamCompletion({
    settings: { model: 'gpt-6.1-sol', apiTransport: 'responses', reasoningEffort: 'low' },
    messages: [], onDelta,
    responsesTransport: async () => new Response(wire, { headers: { 'Content-Type': 'text/event-stream' } }),
  });
}

test('Responses retain public summary boundaries and provider indices across body messages', async () => {
  const hidden = 'fixture hidden reasoning';
  const first = reasoning('first', [summaryText('Compare the inputs.'), { type: 'reasoning_text', text: hidden }, summaryText('Check the figures.')]);
  const second = reasoning('second', [summaryText(''), summaryText('Confirm the result.')]);
  const body = message('commentary', 'This is public body progress.');
  const final = message('final_answer', 'This is the final answer.');
  const snapshots = [];
  const result = await responses([
    event('output_item.added', { output_index: 0, item: reasoning(first.id, []) }),
    event('reasoning_summary_part.added', { output_index: 0, summary_index: 0, part: summaryText('') }),
    event('reasoning_summary_text.delta', { item_id: first.id, summary_index: 0, delta: 'Compare ' }),
    event('reasoning_summary_text.done', { item_id: first.id, summary_index: 0, text: first.summary[0].text }),
    event('reasoning_summary_part.done', { item_id: first.id, summary_index: 1, part: first.summary[1] }),
    event('reasoning_summary_part.done', { item_id: first.id, summary_index: 2, part: first.summary[2] }),
    event('reasoning_summary_text.delta', { output_index: -1, summary_index: 0, delta: hidden }),
    event('reasoning_summary_text.delta', { output_index: 0, summary_index: 0, delta: { text: hidden } }),
    event('reasoning_text.delta', { output_index: 0, delta: hidden }),
    event('output_item.done', { output_index: 1, item: body }),
    event('reasoning_summary_text.delta', { output_index: 2, summary_index: 1, delta: second.summary[1].text }),
    event('reasoning_summary_text.done', { output_index: 2, summary_index: 1, text: 'Optional revised summary.' }),
    event('completed', { response: { status: 'completed', output: [first, body, second, final] } }),
  ], (_delta, assembled) => snapshots.push(structuredClone(assembled)));

  assert.deepEqual(snapshots[0].reasoning_parts, [part(0, 0, 'Compare ')]);
  assert.deepEqual(result.reasoning_parts, [part(0, 0, 'Compare the inputs.'), part(0, 2, 'Check the figures.'), part(2, 1, 'Confirm the result.')]);
  assert.equal(result.reasoning, 'Compare the inputs.Check the figures.Confirm the result.');
  assert.deepEqual(result.output_messages.map(value => [value.phase, value.text]), [
    ['commentary', body.content[0].text], ['final_answer', final.content[0].text],
  ]);
  assert(!JSON.stringify({ result, snapshots }).includes(hidden));
});

test('late earlier parts remain available while the legacy stream prefix stays monotonic', async () => {
  const first = reasoning('first', [summaryText('First.')]);
  const second = reasoning('second', [summaryText('Second.')]);
  const result = await responses([
    event('reasoning_summary_text.delta', { output_index: 1, summary_index: 0, delta: second.summary[0].text }),
    event('reasoning_summary_text.done', { output_index: 0, summary_index: 0, text: first.summary[0].text }),
    event('completed', { response: { status: 'completed', output: [first, second, message('final_answer', 'Final.')] } }),
  ]);
  assert.deepEqual(result.reasoning_parts, [part(0, 0, 'First.'), part(1, 0, 'Second.')]);
  assert.equal(result.reasoning, 'Second.');
});

function setup() {
  let saved;
  const storage = { getItem: () => saved ?? null, setItem: (_key, value) => { saved = value; } };
  const host = () => new LocalAppServer({ storage, now: () => 4321 });
  const server = host();
  const turn = { id: 'fixture-turn', status: 'inProgress', reasoningEffort: 'low', items: [], adapterMetadata: { startedAtMs: 4321, checkpoint: { inFlight: {} } } };
  const thread = { id: 'fixture-thread', turns: [turn] };
  server.threads.set(thread.id, thread);
  const running = { thread, turn, reasoning: null, lastSavedAt: 4321 };
  server.beginReasoning(running);
  return { server, running, restore() {
    server.persist();
    const restored = host();
    const restoredThread = restored.getThread(thread.id);
    const [restoredTurn] = restoredThread.turns;
    const [item] = restoredTurn.items;
    const continuation = { thread: restoredThread, turn: restoredTurn, reasoning: item, lastSavedAt: 4321 };
    restored.beginReasoning(continuation);
    return { restored, continuation, item };
  } };
}

const summaryDeltas = server => {
  const values = [];
  server.subscribe(({ method, params }) => {
    if (method === 'item/reasoning/summaryTextDelta') values.push([params.summaryIndex, params.delta]);
  });
  return values;
};

test('native summary slots survive reload and emit only unseen suffixes by stable provider key', () => {
  const { server, running, restore } = setup();
  const live = summaryDeltas(server);
  server.append(running, '', 'Later.', null, null, [part(4, 2, 'Later.')]);
  server.append(running, '', 'Later.', null, null, [part(0, 9, 'Late earlier entry.'), part(4, 2, 'Later.')]);
  const { restored, continuation, item } = restore();
  const replay = summaryDeltas(restored);
  assert.deepEqual(live, [[0, 'Later.'], [1, 'Late earlier entry.']]);
  assert.deepEqual(item.summary, ['Later.', 'Late earlier entry.']);

  restored.append(continuation, '', 'Later.', null, null, [part(4, 2, 'Later.')]);
  restored.append(continuation, '', 'Later.', null, null, [part(0, 9, 'Late '), part(4, 2, 'Later.')]);
  restored.append(continuation, 'Body resumes.', 'Later.', null, null,
    [part(0, 9, 'Late earlier entry. Extended.'), part(4, 2, 'Later.'), part(8, 1, 'New entry.')]);
  restored.append(continuation, '', 'Later.', null, null, [part(4, -1, 'Invalid.'), null, part(5, 2, {})]);

  assert.equal(item.id, running.reasoning.id);
  assert.deepEqual(replay, [[1, ' Extended.'], [2, 'New entry.']]);
  assert.deepEqual(item.summary, ['Later.', 'Late earlier entry. Extended.', 'New entry.']);
  assert.deepEqual(item.content, []);
  assert.equal(continuation.turn.items.at(-1).text, 'Body resumes.');
});

test('already published legacy reasoning keeps its flat slot on reattachment', () => {
  const { server, running, restore } = setup();
  server.append(running, '', 'Old first.');
  const { restored, continuation, item } = restore();
  const replay = summaryDeltas(restored);
  restored.append(continuation, '', 'Old ', null, null, [part(0, 0, 'Old ')]);
  restored.append(continuation, '', 'Old first.New second.', null, null, [part(0, 0, 'Old first.'), part(0, 2, 'New second.')]);
  assert.deepEqual(item.summary, ['Old first.New second.']);
  assert.deepEqual(replay, [[0, 'New second.']]);
});

test('Codex native projection removes saved task_status calls while keeping genuine tools and body', () => {
  const threadId = 'fixture-thread';
  const items = [
    { type: 'mcpToolCall', tool: 'task_status' }, { type: 'mcpToolCall', tool: 'python' },
    { type: 'reasoning', summary: ['Title', 'Details.'] }, { type: 'agentMessage', text: 'Body.' },
  ];
  const turn = { params: { threadId }, turnId: 'turn', items };
  const host = { threads: new Map() };
  const project = wrapNativeCodexWorkTiming(value => value, host);
  assert.deepEqual(project(turn).items, items.slice(1));
  host.threads.set(threadId, { turns: [{ id: 'turn', status: 'completed', adapterMetadata: { reasoningLifecycle: { workStartedAtMs: 15, completedAtMs: 250 } } }] });
  const projected = project(turn);
  assert.deepEqual(projected.items, items.slice(1));
  assert.equal(projected.turnStartedAtMs, 15);
  assert.equal(projected.finalAssistantStartedAtMs, 250);
  assert.equal(turn.items.length, 4);
});

test('only the site Codex projection supplies native details from saved public summaries and Python output', () => {
  const threadId = 'fixture-codex', turnId = 'fixture-turn';
  const output = { stdout: 'B2 36.5\n', stderr: 'SAMPLE_SMALL\n', executionEnvironment: 'browser-pyodide', files: [] };
  const artifact = { type: 'resource_link', name: 'result.txt', uri: 'https://site.example/result.txt' };
  const python = { type: 'mcpToolCall', id: 'python-call', server: 'browser_workspace', tool: 'python',
    arguments: { code: 'print("B2", 36.5)' }, result: { content: [{ type: 'text', text: JSON.stringify(output) }, artifact], structuredContent: output } };
  const local = { id: turnId, items: [{ type: 'reasoning', id: 'summary', summary: ['Public check.', 'Public result.'] }, python] };
  const state = { params: { threadId }, turnId, items: local.items };
  const thread = { executionSurface: 'codex', turns: [local] };
  const server = { threads: new Map([[threadId, thread]]) };
  const summarize = value => ({ items: [
    { type: 'reasoning', sourceItemId: 'summary', content: '**Public check.**\n\nPublic result.', completed: true },
    { type: 'reasoning', sourceItemId: 'unverified', content: 'External trace.', completed: true },
    { type: 'mcp-tool-call', invocation: { server: python.server, tool: python.tool, arguments: python.arguments },
      result: { type: 'success', ...value.items[1].result, raw: value.items[1].result } },
  ] });
  const project = wrapNativeCodexWorkTiming(summarize, server), classify = wrapNativeCodexActivityItem(() => null);
  const [visible, unknown, tool] = project(state).items;
  assert.equal(classify(visible).grouping, 'standalone');
  assert.equal(visible.content, 'Public check.\n\nPublic result.');
  assert.equal(projectNativeCodexPublicSummary({ ...visible, content: '**Public check.**\n\nPublic result.' }).content, visible.content);
  for (const [summary, expected] of [
    ['**Public headline.**', 'Public headline.'],
    ['## Public headline.', 'Public headline.'],
    ['### **Public headline.** ###\n\nPublic result.', 'Public headline.\n\nPublic result.'],
  ]) {
    local.items[0].summary = [summary];
    assert.equal(projectNativeCodexPublicSummary(project(state).items[0]).content, expected);
    assert.deepEqual(local.items[0].summary, [summary]);
  }
  assert.equal(classify(unknown), null);
  assert.equal(classify(tool).grouping, 'standalone');
  assert.equal(tool.invocation.arguments.code, python.arguments.code);
  const formatted = projectNativeCodexPythonResult(tool);
  assert.deepEqual(formatted.result.content, [{ type: 'text', text: output.stdout }, { type: 'text', text: output.stderr }, artifact]);
  assert.equal(formatted.result.raw, python.result);
  const interrupted = { ...tool, result: { type: 'error', error: 'Execution was interrupted' } };
  assert.equal(projectNativeCodexPythonResult(interrupted, { stdout: 'Partial\n' }).result.error, 'Partial\n\nExecution was interrupted');
  thread.executionSurface = 'work';
  assert.ok(project(state).items.every(item => classify(item) === null));
});

test('PythonRuntime forwards validated worker output before resolving the unchanged result', async t => {
  const previous = globalThis.Worker;
  t.after(() => { if (previous === undefined) delete globalThis.Worker; else globalThis.Worker = previous; });
  const result = { stdout: 'line\n', stderr: 'warning\n' };
  globalThis.Worker = class {
    postMessage({ id }) {
      const send = data => this.onmessage({ data: { id, ...data } });
      queueMicrotask(() => {
        send({ type: 'status', message: 'Loading' });
        send({ type: 'output', streamName: 'stdout', text: 'line\n' });
        send({ type: 'output', streamName: 'anything', text: 'invalid stream' });
        send({ type: 'output', streamName: 'stderr', text: { invalid: true } });
        send({ type: 'output', streamName: 'stderr', text: 'wrong run', id: id + 1 });
        send({ type: 'output', streamName: 'stderr', text: 'warning\n' });
        send({ type: 'result', result });
      });
    }
  };
  const callbacks = [];
  const runtime = new PythonRuntime();
  const completed = await runtime.run('print("line")', [], status => callbacks.push(status), (...output) => callbacks.push(output));
  assert.deepEqual(callbacks, ['Loading', ['stdout', 'line\n'], ['stderr', 'warning\n']]);
  assert.deepEqual(completed, result);
});
