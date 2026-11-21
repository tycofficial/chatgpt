import assert from 'node:assert/strict';
import test from 'node:test';
import * as catalog from '../src/native-client/model-catalog.js';
import { streamCompletion } from '../runtime.js';
import { createBrowserToolExecutor } from '../src/native-client/browser-tool-executor.mjs';
import { ClassicChatAdapter } from '../src/native-client/classic-chat-adapter.mjs';
import { LocalAppServer } from '../src/native-client/local-app-server.mjs';
import { createModelCatalogAdapter } from '../src/native-client/model-catalog-adapter.mjs';

const model = 'gpt-6.1-sol';
const models = createModelCatalogAdapter(catalog);
const taskText = 'Run the neutral Python fixture.';
const input = [{ type: 'text', text: taskText }];
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const memory = () => { let saved; return { getItem: () => saved ?? null, setItem: (_key, value) => { saved = value; } }; };
const call = (id, name, args) => ({ id, type: 'function', function: { name, arguments: JSON.stringify(args) } });
const message = (phase, text) => ({ type: 'message', role: 'assistant', phase, content: [{ type: 'output_text', text }] });
const summary = text => ({ type: 'summary_text', text });
const sse = (type, fields) => `data: ${JSON.stringify({ type: 'response.' + type, ...fields })}\n\n`;
const completed = output => sse('completed', { response: { status: 'completed', output } });
const wire = data => new Response(data, { headers: { 'Content-Type': 'text/event-stream' } });

function makeServer(transport, options = {}) {
  return new LocalAppServer({
    storage: memory(), streamCompletion: transport, models, catalog,
    readSettings: () => ({ model, apiTransport: 'responses' }), getExecutionPolicy: () => ({ modelSelection: true }),
    ...options,
  });
}
function createTurn(server) {
  const opened = server.dispatch('thread/start', { model, effort: 'low' });
  opened.afterReply();
  const threadId = opened.result.thread.id;
  const transaction = server.dispatch('turn/start', { threadId, clientUserMessageId: 'agent-progress-fixture', input });
  return { threadId, transaction, thread: server.getThread(threadId) };
}
function terminal(server, threadId) {
  return new Promise(resolve => {
    const off = server.subscribe(event => {
      if (event.method === 'turn/completed' && event.params.threadId === threadId) { off(); resolve(event.params.turn); }
    });
  });
}

test('agent separates public summaries and streamed Python output from the body and keeps real timing and final result', { timeout: 4000 }, async () => {
  let clock = 5100;
  const secondProgress = deferred(), finishTool = deferred(), seen = [], files = new Map();
  const stdout = 'Observed stdout 中文\n';
  const excess = 'x'.repeat(32_000 - stdout.length - 1) + '😀 end\n';
  const stderr = 'Observed stderr\n';
  const code = 'print(42)';
  class FixturePython {
    async run(script, uploads, onStatus, onOutput) {
      assert.equal(script, code);
      assert.deepEqual(uploads, []);
      clock = 5350;
      onStatus('Fixture ready');
      onOutput('stdout', stdout);
      onOutput('stdout', excess);
      onOutput('stdout', 'Discarded after the cap');
      onOutput('stdin', 'Invalid stream');
      onOutput('stderr', stderr);
      await finishTool.promise;
      clock = 6040;
      return { ok: true, stdout: stdout + excess, stderr, result: '42', files: [] };
    }
  }
  const executor = createBrowserToolExecutor({
    storage: { async list() { return []; }, async write(key, bytes) { files.set(key, bytes); }, async read(key) { return files.get(key); } },
    PythonRuntime: FixturePython, PYTHON_TOOL: { type: 'function', function: { name: 'python' } },
  });
  const reasoning = { type: 'reasoning', id: 'rs-initial', summary: [summary('Check the input.'), summary('Run the calculation.')] };
  let requests = 0;
  const server = makeServer(options => streamCompletion({ ...options, responsesTransport: async payload => {
    requests++;
    assert.equal(payload.tools.some(tool => tool.name === 'task_status'), false);
    if (requests === 1) {
      const python = { type: 'function_call', id: 'fc-python', call_id: 'call-python', name: 'python', arguments: JSON.stringify({ code }) };
      return wire(sse('reasoning_summary_text.delta', { output_index: 0, summary_index: 0, delta: reasoning.summary[0].text }) +
        sse('reasoning_summary_text.done', { output_index: 0, summary_index: 1, text: reasoning.summary[1].text }) +
        completed([reasoning, message('commentary', 'Actual first body.'), python]));
    }
    assert.equal(requests, 2);
    const output = payload.input.find(item => item.type === 'function_call_output' && item.call_id === 'call-python');
    assert.equal(JSON.parse(output.output).structuredContent.result, '42');
    clock = 6200;
    return wire(completed([message('final_answer', 'Actual final body.')]));
  } }), { toolExecutor: executor, now: () => clock });
  const adapter = new ClassicChatAdapter({ appServer: server, models });
  const off = server.subscribe(event => {
    seen.push(event);
    if (event.method === 'item/mcpToolCall/progress' && event.params.message === 'Python stderr') secondProgress.resolve(event);
  });
  try {
    const { threadId, transaction } = createTurn(server);
    const done = terminal(server, threadId);
    transaction.afterReply();
    const progress = await secondProgress.promise;
    const thread = server.getThread(threadId), turn = thread.turns.at(-1);
    const tool = turn.items.find(item => item.id === progress.params.itemId);
    assert.equal(turn.status, 'inProgress');
    assert.equal(tool.status, 'inProgress');
    assert.equal(tool.completedAtMs, undefined);
    assert.equal(tool.livePythonOutput.stdout, stdout + excess.slice(0, -'😀 end\n'.length));
    assert.equal(tool.livePythonOutput.stderr, stderr);
    assert.deepEqual(turn.items.find(item => item.type === 'reasoning').summary, reasoning.summary.map(part => part.text));
    assert.deepEqual(turn.items.filter(item => item.type === 'agentMessage').map(item => item.text), ['Actual first body.']);
    const live = adapter.projectItem(thread, turn, tool).at(-1);
    assert.equal(live.content.content_type, 'execution_output');
    assert.equal(live.metadata.aggregate_result.status, 'running');
    assert.equal(live.metadata.aggregate_result.messages[1].text, stderr);

    finishTool.resolve();
    const resolved = await done;
    const final = resolved.items.find(item => item.id === tool.id);
    assert.equal(resolved.status, 'completed');
    assert.equal(final.status, 'completed');
    assert.equal(final.startedAtMs, 5100);
    assert.equal(final.completedAtMs, 6040);
    assert.equal(final.durationMs, 940);
    assert.equal(final.result.structuredContent.stdout_truncated, true);
    assert.equal(new TextDecoder().decode([...files.values()][0]), stdout + excess);
    assert.equal(final.result.structuredContent.result, '42');
    assert.deepEqual(seen.filter(event => event.method === 'item/mcpToolCall/progress').map(event => event.params.message), ['Python stdout', 'Python stderr']);
    assert.equal(seen.find(event => event.method === 'item/started' && event.params.item.id === tool.id).params.startedAtMs, 5100);
    assert.equal(seen.find(event => event.method === 'item/completed' && event.params.item.id === tool.id).params.completedAtMs, 6040);
    assert.deepEqual(resolved.items.filter(item => item.type === 'agentMessage').map(item => item.text), ['Actual first body.', 'Actual final body.']);
  } finally { finishTool.resolve(); off(); }
});

test('stopping Python keeps the actual partial output and resumed execution does not rerun it', { timeout: 3000 }, async () => {
  const storage = memory(), live = deferred();
  let clock = 1000, runs = 0;
  const toolExecutor = { tools: [{ type: 'function', function: { name: 'python' } }], execute(_call, { signal, onOutput }) {
    runs++;
    clock += 150;
    const pending = new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
    onOutput('stdout', 'Actual partial stdout.');
    return pending;
  } };
  const start = async () => ({ finish_reason: 'tool_calls', tool_calls: [call('partial-call', 'python', { code: 'print(3)' })] });
  const server = makeServer(start, { storage, toolExecutor, now: () => clock });
  const { threadId, transaction } = createTurn(server);
  server.subscribe(event => { if (event.method === 'item/mcpToolCall/progress') live.resolve(); });
  const before = terminal(server, threadId);
  transaction.afterReply();
  await live.promise;
  clock = 1440;
  server.interrupt(threadId);
  const interrupted = await before;
  const old = interrupted.items.find(item => item.type === 'mcpToolCall');
  assert.equal(interrupted.status, 'interrupted');
  assert.equal(old.pythonCancelled, true);
  assert.equal(old.result.isError, true);
  assert.equal(old.durationMs, 440);
  assert.equal(old.livePythonOutput.stdout, 'Actual partial stdout.');

  const restored = makeServer(async options => {
    assert.equal(options.messages.at(-1).tool_call_id, 'partial-call');
    assert.match(options.messages.at(-1).content, /Completion is unknown/);
    return { content: 'Actual next response.', finish_reason: 'stop', reasoning_parts: [{ index: 0, summaryIndex: 1, text: 'Terminal public part.' }] };
  }, { storage, toolExecutor, now: () => clock });
  const resume = restored.dispatch('turn/resume', { threadId });
  const done = terminal(restored, threadId);
  resume.afterReply();
  const final = await done;
  assert.equal(final.status, 'completed');
  assert.equal(final.items.find(item => item.id === old.id).livePythonOutput.stdout, 'Actual partial stdout.');
  assert.deepEqual(final.items.findLast(item => item.type === 'reasoning').summary, ['Terminal public part.']);
  assert.equal(runs, 1);
});

test('old pending task_status call IDs get real retirement receipts without another tool or spurious model round', { timeout: 3000 }, async () => {
  const storage = memory();
  const old = makeServer(() => assert.fail('The old fixture should be persisted before it executes'), { storage });
  const { threadId, thread } = createTurn(old);
  const turn = thread.turns.at(-1);
  const queued = call('saved-queued', 'task_status', { status: 'running' });
  const uncertain = call('saved-uncertain', 'task_status', { status: 'completed' });
  turn.items.push({ type: 'mcpToolCall', id: 'old-item', server: 'browser_workspace', tool: 'task_status', status: 'inProgress', arguments: { status: 'completed' } });
  turn.adapterMetadata.checkpoint = {
    schemaVersion: 1, state: 'tool', rounds: 0, metrics: [], interruptedAttempts: [],
    taskState: { status: 'running' }, completedCalls: {},
    transcript: [{ role: 'user', content: taskText }, { role: 'assistant', tool_calls: [queued, uncertain] }],
    pendingCalls: [{ call: queued, state: 'queued' }, { call: uncertain, state: 'running', itemId: 'old-item' }],
  };
  old.persist();

  let requests = 0;
  const toolExecutor = { tools: [{ type: 'function', function: { name: 'python' } }], execute() { assert.fail('No legacy tool should execute'); }, recoverCall() { assert.fail('No legacy tool should be recovered'); } };
  const restored = makeServer(options => streamCompletion({ ...options, responsesTransport: async payload => {
    assert.equal(++requests, 1);
    assert(!JSON.stringify(payload.tools).includes('task_status'));
    assert(!payload.input.some(item => item.role === 'system' && item.content.includes('task_status')));
    assert.deepEqual(payload.input.filter(item => item.type === 'function_call').map(item => item.call_id), [queued.id, uncertain.id]);
    const receipts = payload.input.filter(item => item.type === 'function_call_output');
    assert.deepEqual(receipts.map(item => item.call_id), [queued.id, uncertain.id]);
    for (const { output } of receipts) { assert.equal(JSON.parse(output).isError, true); assert.match(output, /retired.*performed no work/); }
    return wire(completed([message('final_answer', 'Continued using the saved state.')]));
  } }), { storage, toolExecutor });
  const notifications = [];
  restored.subscribe(event => notifications.push(event));
  const resume = restored.dispatch('turn/resume', { threadId });
  const finished = terminal(restored, threadId);
  resume.afterReply();
  const result = await finished;
  assert.equal(result.status, 'completed');
  assert.equal(requests, 1);
  assert.equal(result.items.find(item => item.id === 'old-item').status, 'failed');
  assert.equal(result.items.filter(item => item.tool === 'task_status').length, 1);
  assert(!notifications.some(event => ['item/started', 'item/completed'].includes(event.method) && event.params.item?.tool === 'task_status'));
});
