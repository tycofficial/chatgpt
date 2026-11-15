import test from 'node:test';
import assert from 'node:assert/strict';
import { getModels, streamCompletion, SSEDecoder, PythonRuntime, PYTHON_TOOL } from '../runtime.js';

const settings = { apiBase: 'https://provider.example/', apiKey: 'test-only-key', model: 'test-model' };
const turn = () => new Promise(resolve => setImmediate(resolve));
const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function eventStream(events, { size = 7, done = true } = {}) {
  const text = events.map(event => `data: ${typeof event === 'string' ? event : JSON.stringify(event)}\r\n\r\n`).join('') + (done ? 'data: [DONE]\r\n\r\n' : '');
  const bytes = new TextEncoder().encode(text);
  return new Response(new ReadableStream({
    start(controller) {
      for (let i = 0; i < bytes.length; i += size) controller.enqueue(bytes.slice(i, i + size));
      controller.close();
    },
  }), { headers: { 'content-type': 'text/event-stream' } });
}

test('SSE decoder accepts split CRLF separators, multiline data, comments and an unterminated final event', () => {
  const events = [];
  const parser = new SSEDecoder(data => events.push(data));
  for (const chunk of [': heartbeat\r\ndata: first\r\n', 'data: second\r', '\n\r', '\ndata: final']) parser.push(chunk);
  parser.push('', true);
  assert.deepEqual(events, ['first\nsecond', 'final']);
});

test('stream transport decodes Chinese split across UTF-8 bytes and assembles multiple tool calls', async t => {
  let request;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) };
    return eventStream([
      { choices: [{ delta: { role: 'assistant', content: '你好，' } }] },
      { choices: [{ delta: { content: '世界。' } }] },
      { choices: [{ delta: { tool_calls: [
        { index: 0, id: 'call_python', type: 'function', function: { name: 'py', arguments: '{"co' } },
        { index: 1, id: 'call_other', type: 'function', function: { name: 'other', arguments: '{"x":' } },
      ] } }] },
      { choices: [{ delta: { tool_calls: [
        { index: 1, function: { arguments: '2}' } },
        { index: 0, function: { name: 'thon', arguments: 'de":"print(6*7)"}' } },
      ] }, finish_reason: 'tool_calls' }] },
    ], { size: 1 });
  });
  const deltas = [];
  const controller = new AbortController();
  const result = await streamCompletion({ settings, messages: [{ role: 'user', content: 'hello' }], tools: [PYTHON_TOOL], signal: controller.signal, onDelta: (text, assembled) => deltas.push({ text, content: assembled.content }) });
  assert.equal(request.url, 'https://provider.example/v1/chat/completions');
  assert.equal(request.options.signal, controller.signal);
  assert.equal(request.options.headers.Authorization, 'Bearer test-only-key');
  assert.equal(request.body.stream, true);
  assert.equal(request.body.tool_choice, 'auto');
  assert.deepEqual(request.body.tools, [PYTHON_TOOL]);
  assert.equal(result.content, '你好，世界。');
  assert.deepEqual(deltas.map(delta => delta.text), ['你好，', '世界。']);
  assert.equal(deltas.at(-1).content, result.content);
  assert.equal(result.tool_calls[0].id, 'call_python');
  assert.equal(result.tool_calls[0].function.name, 'python');
  assert.deepEqual(JSON.parse(result.tool_calls[0].function.arguments), { code: 'print(6*7)' });
  assert.deepEqual(JSON.parse(result.tool_calls[1].function.arguments), { x: 2 });
  assert.equal(result.finish_reason, 'tool_calls');
});

test('normal JSON completion fallback preserves text and complete function calls', async t => {
  t.mock.method(globalThis, 'fetch', async () => jsonResponse({ choices: [{ message: { role: 'assistant', content: 'answer', tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'python', arguments: '{"code":"2+2"}' } }] }, finish_reason: 'tool_calls' }] }));
  const deltas = [];
  const result = await streamCompletion({ settings, messages: [], onDelta: text => deltas.push(text) });
  assert.equal(result.content, 'answer');
  assert.deepEqual(deltas, ['answer']);
  assert.equal(result.tool_calls[0].function.name, 'python');
  assert.equal(result.tool_calls[0].function.arguments, '{"code":"2+2"}');
});

test('model discovery normalizes model shapes, sorts IDs and respects an existing /v1 prefix', async t => {
  let requested;
  t.mock.method(globalThis, 'fetch', async url => {
    requested = url;
    return jsonResponse({ data: [{ id: 'z-model' }, 'a-model', { name: 'b-model' }, {}] });
  });
  assert.deepEqual(await getModels({ ...settings, apiBase: 'https://provider.example/v1/' }), ['a-model', 'b-model', 'z-model']);
  assert.equal(requested, 'https://provider.example/v1/models');
});

test('provider HTTP errors retain their actionable message', async t => {
  t.mock.method(globalThis, 'fetch', async () => jsonResponse({ error: { message: 'Model access denied' } }, 403));
  await assert.rejects(streamCompletion({ settings, messages: [] }), /Model access denied/);
  await assert.rejects(getModels(settings), /Model access denied/);
});

test('rate limit errors with non-JSON bodies receive a useful fallback', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('<html>rate limited</html>', { status: 429 }));
  await assert.rejects(streamCompletion({ settings, messages: [] }), /频繁|额度/);
});

test('stream provider errors and malformed events reject rather than becoming assistant text', async t => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => eventStream([{ error: { message: 'Upstream unavailable' } }]));
  await assert.rejects(streamCompletion({ settings, messages: [] }), /Upstream unavailable/);
  fetchMock.mock.mockImplementation(async () => eventStream(['invalid json']));
  await assert.rejects(streamCompletion({ settings, messages: [] }), /无效的流式数据/);
  fetchMock.mock.mockImplementation(async () => eventStream([{ choices: [{ delta: {} }] }]));
  await assert.rejects(streamCompletion({ settings, messages: [] }), /没有返回内容/);
});

test('transport propagates request cancellation', async t => {
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    options.signal.throwIfAborted();
    throw new Error('Expected an aborted request');
  });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(streamCompletion({ settings, messages: [], signal: controller.signal }), error => error.name === 'AbortError');
});

class WorkerDouble {
  static instances = [];
  constructor(url, options) { this.url = url; this.options = options; this.messages = []; this.terminated = false; WorkerDouble.instances.push(this); }
  postMessage(message) { this.messages.push(message); }
  emit(data) { this.onmessage?.({ data }); }
  terminate() { this.terminated = true; }
}

function mockWorker(t) {
  WorkerDouble.instances = [];
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'Worker');
  Object.defineProperty(globalThis, 'Worker', { value: WorkerDouble, writable: true, configurable: true });
  t.after(() => { if (previous) Object.defineProperty(globalThis, 'Worker', previous); else delete globalThis.Worker; });
}

test('PythonRuntime sends uploads and status, resolves artifacts, and serializes runs', async t => {
  mockWorker(t);
  const runtime = new PythonRuntime();
  t.after(() => runtime.terminate());
  const statuses = [];
  const first = runtime.run('x=1', [{ name: '数据.csv', content: 'value\n2\n' }], text => statuses.push(text));
  const second = runtime.run('x+1');
  await turn();
  const worker = WorkerDouble.instances[0];
  assert.equal(worker.options.type, 'module');
  assert.match(worker.url.pathname, /python-worker\.js$/);
  assert.equal(worker.messages.length, 1);
  assert.equal(new TextDecoder().decode(worker.messages[0].files[0].bytes), 'value\n2\n');
  const result = { stdout: '1\n', stderr: '', result: '', files: [], images: [] };
  worker.emit({ id: worker.messages[0].id, type: 'status', message: '正在运行 Python…' });
  worker.emit({ id: worker.messages[0].id, type: 'result', result });
  assert.equal(await first, result);
  await turn();
  assert.equal(worker.messages.length, 2);
  worker.emit({ id: worker.messages[1].id, type: 'result', result: { result: '2' } });
  assert.deepEqual(await second, { result: '2' });
  assert.deepEqual(statuses, ['正在运行 Python…']);
});

test('Stop rejects active and queued Python jobs; a later run gets a fresh worker', async t => {
  mockWorker(t);
  const runtime = new PythonRuntime();
  t.after(() => runtime.terminate());
  const active = runtime.run('while True: pass');
  const queued = runtime.run('print("must not execute")');
  const stopped = Promise.allSettled([active, queued]);
  await turn();
  const original = WorkerDouble.instances[0];
  assert.equal(original.messages.length, 1);
  runtime.terminate();
  for (const result of await stopped) { assert.equal(result.status, 'rejected'); assert.equal(result.reason.name, 'AbortError'); }
  assert.equal(original.terminated, true);
  assert.equal(original.messages.length, 1);
  const fresh = runtime.run('print("fresh")');
  await turn();
  assert.equal(WorkerDouble.instances.length, 2);
  const replacement = WorkerDouble.instances[1];
  replacement.emit({ id: replacement.messages[0].id, type: 'result', result: { stdout: 'fresh\n' } });
  assert.deepEqual(await fresh, { stdout: 'fresh\n' });
});

test('Stop during upload decoding prevents the cancelled job from creating a worker', async t => {
  mockWorker(t);
  let resolveUpload;
  t.mock.method(globalThis, 'fetch', () => new Promise(resolve => { resolveUpload = resolve; }));
  const runtime = new PythonRuntime();
  t.after(() => runtime.terminate());
  const job = runtime.run('print("must not execute")', [{ name: 'input.txt', dataUrl: 'data:text/plain;base64,eA==' }]);
  const outcome = Promise.allSettled([job]);
  await turn();
  runtime.reset();
  resolveUpload(new Response('x'));
  assert.equal((await outcome)[0].reason.name, 'AbortError');
  assert.equal(WorkerDouble.instances.length, 0);
});

test('Python timeout terminates the worker and rejects the active run', async t => {
  mockWorker(t);
  const runtime = new PythonRuntime({ timeout: 15 });
  t.after(() => runtime.terminate());
  await assert.rejects(runtime.run('while True: pass'), /超时/);
  assert.equal(WorkerDouble.instances[0].terminated, true);
  assert.equal(runtime.worker, null);
});
