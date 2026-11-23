import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash, webcrypto } from 'node:crypto';
import vm from 'node:vm';
import { parse } from 'acorn';
import { capturedChunk } from './support/captured-original.mjs';
import { parseHTML } from 'linkedom';
import {
  ClassicChatAdapter, wrapNativeChatPreamble, wrapNativeClassicChatTiming,
  wrapNativeClassicStatus, wrapNativeClassicTiming, wrapNativeReasoningGroups,
} from '../src/native-client/classic-chat-adapter.mjs';
import { projectNativePythonActivity } from '../src/native-client/native-python-activity.mjs';

const read = file => readFileSync(new URL('../' + file, import.meta.url));
const plan = JSON.parse(read('src/native-client/entry-plan.json'));
const manifest = JSON.parse(read('original-client/resource-manifest.json'));
assert.equal(manifest.sourceBuild, plan.sourceBuild);
const captures = new Map(manifest.assets.map(asset => [asset.url, asset]));
// JrPc is in a lazy progress chunk. Read all factory tables without running their entries.
const progressChunks = [capturedChunk(533131, 494082), capturedChunk(923609, 517409)].map(asset => new URL(asset.url).pathname);
const factorySources = new Map();
for (const chunk of [...plan.registrationChunks, ...progressChunks]) {
  const captured = captures.get('https://chatgpt.com' + chunk);
  assert.ok(captured, 'Chunk was not in the published asset capture ' + chunk);
  const bytes = read('original-client/' + captured.path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), captured.sha256, chunk);
  const source = bytes.toString('utf8');
  const { body } = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  const { properties } = body.flatMap(statement => statement.declaration?.declarations ?? [])
    .find(declaration => declaration.id.name === '__webpack_modules__').init;
  for (const { key, value } of properties) {
    factorySources.set(key.name ?? key.value, { source, start: value.start, end: value.end, chunk });
  }
}

function originalFixture() {
  const { window, document } = parseHTML('<html><body></body></html>');
  const context = vm.createContext({
    window, document, location: new URL('https://fixture.test/chatgpt/'),
    URL, URLSearchParams, TextEncoder, TextDecoder, crypto: webcrypto,
  });
  const modules = new Map([['LF5P', { exports: {} }]]);
  function original(id) {
    if (modules.has(id)) return modules.get(id).exports;
    const record = factorySources.get(id);
    assert.ok(record, 'Original classifier dependency is absent ' + id);
    const { source, start, end, chunk } = record;
    const factory = vm.runInContext('(' + source.slice(start, end) + ')', context, { filename: chunk + '#' + id });
    const module = { id, exports: {} };
    modules.set(id, module);
    factory.call(module.exports, module, module.exports, original);
    return module.exports;
  }
  original.d = (exports, getters = {}, values = {}) => {
    for (const [name, get] of Object.entries(getters)) Object.defineProperty(exports, name, { get, enumerable: true, configurable: true });
    Object.assign(exports, values);
  };
  original.o = Object.hasOwn;
  original.n = value => { const get = () => value?.__esModule ? value.default : value; Object.defineProperty(get, 'a', { get }); return get; };
  original.r = exports => Object.defineProperty(exports, '__esModule', { value: true });
  original.nmd = module => { module.paths = []; module.children ??= []; return module; };
  original.g = context;
  return original;
}

const raw = originalFixture();

function classicProjection() {
  const original = originalFixture();
  const wrap = (id, key, fn) => {
    const module = original(id);
    Object.defineProperty(module, key, { value: fn(module[key]) });
  };
  wrap('AuIy', 'o', wrapNativeChatPreamble);
  wrap('hUUF', 'b', wrapNativeReasoningGroups);
  wrap('R2pa', 'a', project => wrapNativeClassicTiming(wrapNativeClassicChatTiming(project)));
  return { original, project: (detail, isStreaming, isWorkConversation = false) => original('G6Ip').a(detail, { isWorkConversation, isStreaming })[0].turn };
}

function setup(status = 'inProgress') {
  const thread = { id: 'thread', createdAt: 1700, updatedAt: 1701, model: 'gpt-6-sol', adapterMetadata: {} };
  const turn = { id: 'turn', status, startedAt: 1700, model: 'gpt-6-sol', reasoningEffort: 'medium', items: [], adapterMetadata: { reasoningLifecycle: { startedAtMs: 1700000, completedAtMs: status === 'completed' ? 1702500 : null } } };
  thread.turns = [turn];
  return { thread, turn, adapter: new ClassicChatAdapter({ appServer: {}, models: {}, now: () => 1702500 }) };
}
const nativeItem = message => ({ item: message.content.content_type === 'thoughts' ? { type: 'reasoning', presentation: 'thought', content: message.content.thoughts.map(x => x.summary).join('\n'), completed: message.status !== 'in_progress' } : { type: 'assistant-message', content: message.content.parts.join('\n') }, sourceMessage: message, role: 'assistant', turnId: 'turn' });
const group = (messages, streaming) => raw('hUUF').b(messages.map(nativeItem), { isStreaming: streaming, clinicalSearchEnabled: false });

test('exact original classifier reproduces the former final-answer folding bug', () => {
  const { adapter, thread, turn } = setup('completed');
  const answer = { type: 'agentMessage', id: 'answer', text: 'Here is the actual result.' }; turn.items.push(answer);
  const message = adapter.message(thread, turn, answer, 'assistant');
  const old = { ...message, metadata: { ...message.metadata, ...adapter.reasoningMetadata(turn) } };
  assert.equal(group([old], false)[0].item.type, 'chatgpt-reasoning-group');
  assert.equal(group([message], false)[0].item.type, 'assistant-message');
});

test('ordinary text that sounds like thinking remains visible during streaming and after restore', () => {
  for (const status of ['inProgress', 'completed']) {
    const { adapter, thread, turn } = setup(status);
    const answer = { type: 'agentMessage', id: 'answer', text: 'Let me think through this. The result is 42.' }; turn.items.push(answer);
    const message = adapter.message(thread, turn, answer, 'assistant');
    assert.equal(message.channel, 'final');
    assert.equal(message.end_turn, status === 'completed');
    for (const field of ['reasoning_status', 'reasoning_group_id', 'reasoning_start_time', 'reasoning_end_time']) assert.equal(message.metadata[field], undefined);
    assert.equal(group([message], status === 'inProgress')[0].item.type, 'assistant-message');
    const restored = adapter.detail(structuredClone(thread)).mapping.answer.message;
    assert.equal(group([restored], status === 'inProgress')[0].item.type, 'assistant-message');
    assert.equal(restored.content.parts[0], answer.text);
  }
});

test('native Chat projection preserves intermediate and final body, keeps progress below it, and uses actual elapsed time', () => {
  const { adapter, thread, turn } = setup();
  thread.executionSurface = 'chat';
  const commentary = { type: 'agentMessage', id: 'progress', text: 'The first file is ready; checking the second.', phase: 'commentary' };
  const answer = { type: 'agentMessage', id: 'answer', text: 'Both files passed.', phase: 'final_answer' };
  const activeReasoning = { type: 'reasoning', id: 'reason-after', summary: [], status: 'inProgress', startedAtMs: 1700500 };
  turn.items.push(
    { type: 'userMessage', id: 'prompt', content: [{ type: 'text', text: 'Check both sample files.' }] },
    { type: 'reasoning', id: 'reason-before', summary: ['Actual earlier summary'], status: 'completed', startedAtMs: 1700000, completedAtMs: 1700500, durationMs: 500 },
    commentary,
    activeReasoning,
  );
  turn.adapterMetadata.completedItemIds = [commentary.id];
  const { original, project } = classicProjection();
  const pendingPayload = adapter.detail(thread);
  const pendingThoughts = pendingPayload.mapping['reason-after'].message;
  assert.equal(pendingThoughts.metadata.reasoning_status, 'is_reasoning');
  assert.equal(pendingThoughts.metadata.reasoning_end_time, undefined);
  const publicParagraphs = node => Array.from(node.items.filter(item => item.type === 'assistant-message'))
    .flatMap(item => item.content.split('\n\n'));
  const checkPending = (detail, expectedBody) => {
    const pending = project(detail, true);
    assert.equal(pending.status, 'in_progress');
    assert.deepEqual(publicParagraphs(pending), expectedBody);
    const trailingProgress = pending.items.at(-1);
    assert.equal(trailingProgress.type, 'chatgpt-reasoning-group');
    assert.equal(trailingProgress.completed, false);
    const { status } = original('JrPc').a({ group: trailingProgress, family: 'chat', isLive: true, isBlocked: false });
    assert.equal(status.kind, 'standalone');
    assert.equal(status.content.kind, 'awaiting-fallback');
    assert.doesNotMatch(JSON.stringify(pending.items.filter(item => item.type === 'chatgpt-reasoning-group')), /The first file|Both files passed/);
  };
  checkPending(pendingPayload, [commentary.text]);
  turn.items.push(answer);
  checkPending(adapter.detail(thread), [commentary.text, answer.text]);
  const follows = { type: 'reasoning', id: 'reasoning-actual', summary: ['Observed check after the body.'], status: 'inProgress', startedAtMs: 1700750 };
  turn.items.push(follows);
  const naturallyActive = project(adapter.detail(thread), true);
  const afterAnswer = naturallyActive.items.slice(naturallyActive.items.findLastIndex(item => item.type === 'assistant-message') + 1);
  assert.equal(afterAnswer.filter(item => item.type === 'chatgpt-reasoning-group' && !item.completed).length, 1);
  assert.match(JSON.stringify(afterAnswer), /Observed check after the body/);
  turn.items.pop();

  turn.status = 'completed'; turn.adapterMetadata.reasoningLifecycle.completedAtMs = 1702500;
  activeReasoning.status = 'completed'; activeReasoning.durationMs = 2000;
  const ended = project(adapter.detail(structuredClone(thread)), false);
  assert.deepEqual(publicParagraphs(ended), [commentary.text, answer.text]);
  const thinking = ended.items.filter(item => item.type === 'chatgpt-reasoning-group');
  assert.match(JSON.stringify(thinking), /Actual earlier summary/);
  assert.doesNotMatch(JSON.stringify(thinking), /The first file|Both files passed/);
  assert(thinking.every(item => item.completed));
  assert.equal(ended.workCompletedAtMs - ended.workStartedAtMs, 2500);
});

test('native Work uses its elapsed row after body and retains three independent Python disclosures and all public summaries', () => {
  const { adapter, thread, turn } = setup();
  thread.executionSurface = 'work';
  thread.adapterMetadata.conversationOrigin = 'tpp';
  const tasks = [
    { label: 'Add the fixture values', code: 'print(3 + 2)', stdout: '5\n', expression: '5' },
    { label: 'Check the fixture units', code: 'print(12 * 4)', stdout: '48\n', expression: '48' },
    { label: 'Verify the combined fixture', code: 'print(48 + 5)', stdout: '53\n', expression: '53' },
  ];
  const progress = { type: 'agentMessage', id: 'note', text: 'I will check the two inputs first.', phase: 'commentary' };
  const answer = { type: 'agentMessage', id: 'result', text: 'The combined result is 53.', phase: 'final_answer' };
  turn.items.push(
    { type: 'userMessage', id: 'prompt', content: [{ type: 'text', text: 'Verify the sample.' }] },
    { type: 'reasoning', id: 'public-steps', summary: tasks.map(task => task.label), status: 'inProgress', startedAtMs: 1700000 },
    progress,
    ...tasks.map((task, index) => ({ type: 'mcpToolCall', id: `python-${index}`, server: 'browser_workspace', tool: 'python',
      status: 'completed', arguments: { code: task.code }, startedAtMs: 1703000 + index * 1000, completedAtMs: 1703500 + index * 1000,
      result: { isError: false, content: [], structuredContent: { executionEnvironment: 'browser-pyodide', stdout: task.stdout, result: task.expression } } })),
    answer,
  );
  turn.adapterMetadata.completedItemIds = [progress.id];
  const { original, project } = classicProjection();
  const { jsx, jsxs, Fragment } = original('ABep');
  const NativeWorkStatus = original('XSEO').a;
  const NativeTranscript = () => null;
  const render = wrapNativeClassicStatus(NativeTranscript, {
    getThread: id => id === thread.id ? thread : null,
    renderTurn: jsx,
    renderStatus: (transcript, status) => jsxs(Fragment, { children: [transcript, jsx(NativeWorkStatus, status)] }),
    renderChatElapsed: () => assert.fail('Work rendered the Chat elapsed row'),
  });
  const props = { conversationId: thread.id, isWorkConversation: true };
  const liveDetail = adapter.detail(thread);
  const liveTurn = project(liveDetail, true, true);
  assert.equal(liveTurn.status, 'in_progress');
  assert.equal(liveTurn.items.at(-1).type, 'chatgpt-reasoning-group');
  assert.equal(liveTurn.items.at(-1).completed, false);
  assert.equal(liveTurn.items.at(-1).items.length, 0);
  const [transcript, status] = render({ ...props, turn: liveTurn }).props.children;
  assert.equal(transcript.type, NativeTranscript);
  assert.equal(transcript.props.turn.items.at(-1).type, 'assistant-message');
  assert.equal(status.type, NativeWorkStatus);
  assert.equal(status.props.status, 'working');
  assert.equal(status.props.startedAtMs, 1700000);
  assert.equal(status.props.completedAtMs, null);
  assert.equal(liveDetail.mapping['python-0-result'].message.update_time, 1703.5);

  turn.status = 'completed'; turn.completedAt = 1717; turn.adapterMetadata.reasoningLifecycle.completedAtMs = 1717000;
  turn.items[1].status = 'completed';
  const saved = adapter.detail(structuredClone(thread));
  for (const [index, task] of tasks.entries()) {
    const id = index ? `public-steps-summary-${index}` : 'public-steps';
    assert.equal(saved.mapping[id].message.content.thoughts[0].summary, task.label);
    assert.equal(saved.mapping[id].message.metadata.reasoning_group_id, turn.id);
  }
  const ended = project(saved, false, true);
  assert.equal(ended.workCompletedAtMs - ended.workStartedAtMs, 17000);
  assert.equal(render({ ...props, turn: ended }).type, NativeTranscript, 'Real terminal activity should use the native transcript disclosure');
  const groups = ended.items.filter(item => item.type === 'chatgpt-reasoning-group');
  const entries = groups.flatMap(group => group.items);
  assert.deepEqual(Array.from(entries.filter(item => item.type === 'reasoning'), item => item.content), tasks.map(task => task.label));
  const python = entries.filter(item => item.type === 'chatgpt-python-execution');
  assert.deepEqual(Array.from(python, row => row.id), ['python-0-call', 'python-1-call', 'python-2-call']);
  assert.deepEqual(Array.from(python, row => row.code), tasks.map(task => task.code));
  assert.deepEqual(Array.from(python, row => row.output[0].text), tasks.map(task => task.stdout));
  assert.deepEqual(Array.from(python, row => row.output[1].text), tasks.map(task => task.expression));
  assert(python.every(row => row.status === 'completed'));
  assert(!entries.some(item => item.type === 'exec'));
  assert.deepEqual(Array.from(ended.items.filter(item => item.type === 'assistant-message')).flatMap(item => item.content.split('\n\n')), [progress.text, answer.text]);
  assert.doesNotMatch(JSON.stringify(entries), /I will check the two inputs|The combined result is/);
});

test('native Python distinguishes traceback, system error, cancellation, and real partial stdio', () => {
  const project = (result, extra = {}) => projectNativePythonActivity({ metadata: {} }, {
    type: 'mcpToolCall', id: 'python-result', server: 'browser_workspace', tool: 'python', status: 'failed',
    arguments: { code: 'print(7)' }, result, ...extra,
  }, 'turn');
  const partial = { stdout: 'Part while running.\n', stderr: 'Before stopping.\n' };
  const system = 'Execution was interrupted; tool completion is unknown.';
  const failed = project({ isError: true, structuredContent: { error: system } }, { livePythonOutput: partial });
  const aggregate = failed[1].metadata.aggregate_result;
  assert.deepEqual(aggregate.messages.map(entry => entry.text), [partial.stdout, partial.stderr]);
  assert.deepEqual(aggregate.system_exception.traceback, [system]);
  assert.equal(aggregate.in_kernel_exception, undefined);
  const cancelled = project({ isError: true, structuredContent: { error: system } }, { livePythonOutput: partial, pythonCancelled: true });
  const interrupted = raw('jddg').a(cancelled, { isStreaming: false }).get(cancelled[0]).item;
  assert.equal(interrupted.status, 'paused');
  assert.deepEqual(Array.from(interrupted.output, row => row.text), [partial.stdout, partial.stderr]);

  const trace = 'Traceback (most recent call last):\n  File "fixture.py", line 1\nValueError: neutral value';
  const kernel = project({ isError: true, structuredContent: { executionEnvironment: 'browser-pyodide', error: trace, stdout: '', stderr: `Actual warning\n${trace}\n` } }, { livePythonOutput: partial });
  const actual = raw('jddg').a(kernel, { isStreaming: false }).get(kernel[0]).item;
  assert.equal(actual.status, 'error');
  assert.deepEqual(Array.from(actual.output, row => [row.kind, row.text]), [['stderr', 'Actual warning\n'], ['error', trace]]);
  assert.equal(kernel[1].metadata.aggregate_result.in_kernel_exception.name, 'ValueError');
  assert.equal(kernel[1].metadata.aggregate_result.system_exception, undefined);
});
