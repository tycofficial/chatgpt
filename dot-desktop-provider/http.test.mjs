import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { createDotDesktopServer } from './index.mjs';
import { createLinuxDesktopRuntime } from './linux-desktop.mjs';

const token = 'neutral-desktop-test-token-00000000';
const goodTask = code => ({ requestId: randomUUID(), code });
const png = Buffer.from('89504e470d0a1a0a0000000d4948445200000400000002d0', 'hex');

function openFixture(t, overrides = {}) {
  const calls = { start: 0, close: 0, tasks: 0, input: [], taskStarted: Promise.withResolvers(), finishTask: Promise.withResolvers() };
  const runtime = {
    probe: async () => {},
    async start() {
      calls.start++;
      return {
        close: async () => { calls.close++; },
        frame: async () => png,
        input: async event => calls.input.push(event),
        async task(code, signal) {
          calls.tasks++;
          calls.taskStarted.resolve();
          const completed = await Promise.race([
            calls.finishTask.promise,
            new Promise((resolve, reject) => {
              if (signal.aborted) reject(signal.reason);
              else signal.addEventListener('abort', () => reject(signal.reason), { once: true });
            }),
          ]);
          return { exitCode: 0, stdout: completed ?? code + '\n', stderr: '' };
        },
      };
    },
    ...overrides,
  };
  const server = createDotDesktopServer({ token, runtime, maxDesktops: 1 });
  t.after(async () => { calls.finishTask.resolve(); await server.close(); });
  return { server, calls };
}

function call(origin, path, { method = 'GET', body, auth = token, signal } = {}) {
  return fetch(origin + path, {
    method, signal,
    headers: {
      ...(auth ? { Authorization: 'Bearer ' + auth } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test('private desktop routes verify bearer, UUID, open capacity, frame, and typed input', async t => {
  const { server, calls } = openFixture(t);
  const origin = await server.listen(0);
  assert.equal(new URL(origin).hostname, '127.0.0.1');
  assert.equal((await call(origin, '/healthz', { auth: null })).status, 401);
  assert.equal((await call(origin, '/healthz', { auth: 'different-token' })).status, 401);
  assert.deepEqual(await (await call(origin, '/healthz')).json(), { ready: true });
  const id = randomUUID(), path = '/v1/desktops/' + id;
  assert.equal((await call(origin, '/v1/desktops', { method: 'POST', body: { id: '../bad', ttlSeconds: 600 } })).status, 400);
  const create = (value = id, ttl = 600) => call(origin, '/v1/desktops', { method: 'POST', body: { id: value, ttlSeconds: ttl } });
  const opens = await Promise.all([create(), create()]);
  assert.deepEqual(await Promise.all(opens.map(response => response.json())), [{ id }, { id }]);
  assert.equal(calls.start, 1);
  assert.equal((await create(id, 601)).status, 409);
  assert.equal((await create(randomUUID())).status, 429);
  const frame = await call(origin, path + '/frame');
  assert.equal(frame.headers.get('content-type'), 'image/png');
  assert.deepEqual(Buffer.from(await frame.arrayBuffer()), png);

  const inputs = [{ type: 'move', x: 1023, y: 719 }, { type: 'wheel', dx: -10, dy: 10 },
    { type: 'button', button: 'left', down: true }, { type: 'key', key: 0xffe3, down: false },
    { type: 'text', text: '中⽂ input' }];
  for (const input of inputs) {
    assert.equal((await call(origin, path + '/input', { method: 'POST', body: input })).status, 204);
  }
  assert.deepEqual(calls.input, inputs);
  for (const input of [{ type: 'move', x: 1024, y: 720 }, { type: 'wheel', dx: 11, dy: 0 },
    { type: 'key', key: 0, down: true }, { type: 'text', text: '中'.repeat(3000) },
    { type: 'text', text: '\0invalid' }, { type: 'shell', argv: [] }]) {
    assert.equal((await call(origin, path + '/input', { method: 'POST', body: input })).status, 400);
  }
  assert.equal(calls.input.length, 5);
  assert.equal((await call(origin, path, { method: 'DELETE' })).status, 204);
  assert.equal((await call(origin, path, { method: 'DELETE' })).status, 204);
  assert.equal((await call(origin, path + '/frame')).status, 410);
  assert.equal((await create()).status, 410);
  assert.equal(calls.close, 1);
});

test('lost HTTP response, parallel receipt reads, and same UUID execute one task', async t => {
  const { server, calls } = openFixture(t);
  const origin = await server.listen(0), id = randomUUID(), path = '/v1/desktops/' + id;
  await call(origin, '/v1/desktops', { method: 'POST', body: { id, ttlSeconds: 600 } });
  const body = goodTask('print(17 * 13)');
  const submit = (payload, options = {}) => call(origin, path + '/task', { method: 'POST', body: payload, ...options });
  const abort = new AbortController();
  const detached = submit(body, { signal: abort.signal }).catch(cause => cause);
  await calls.taskStarted.promise;
  abort.abort();
  assert.equal((await detached).name, 'AbortError');
  const duplicates = [submit(body), submit(body)];
  const wrongBody = await submit({ ...body, code: 'print(0)' });
  assert.equal(wrongBody.status, 409);
  assert.equal((await wrongBody.json()).error.code, 'TASK_ID_CONFLICT');
  const busy = await submit(goodTask('print(1)'));
  assert.equal(busy.status, 409);
  assert.equal((await busy.json()).error.code, 'TASK_BUSY');
  calls.finishTask.resolve('221\n');
  const expected = { exitCode: 0, stdout: '221\n', stderr: '' };
  for (const response of await Promise.all(duplicates)) assert.deepEqual(await response.json(), expected);
  assert.deepEqual(await (await submit(body)).json(), expected);
  assert.equal(calls.tasks, 1);
});

test('TTL closes a desktop and aborts its in-flight process, with no ID reuse', async t => {
  const { server, calls } = openFixture(t);
  const origin = await server.listen(0), id = randomUUID(), path = '/v1/desktops/' + id;
  const initial = { id, ttlSeconds: 1 };
  assert.equal((await call(origin, '/v1/desktops', { method: 'POST', body: initial })).status, 200);
  const pending = call(origin, path + '/task', { method: 'POST', body: goodTask('print(5)') });
  assert.equal((await pending).status, 410);
  assert.equal(calls.close, 1);
  assert.equal((await call(origin, '/v1/desktops', { method: 'POST', body: initial })).status, 410);
});

test('missing Bubblewrap refuses health and desktop admission without executing Python tasks', { skip: process.platform !== 'linux' }, async t => {
  const runtime = createLinuxDesktopRuntime({ bwrap: '/unavailable-fixture/bwrap' });
  const server = createDotDesktopServer({ token, runtime });
  t.after(() => server.close());
  const origin = await server.listen(0);
  for (const response of [
    await call(origin, '/healthz'),
    await call(origin, '/v1/desktops', { method: 'POST', body: { id: randomUUID(), ttlSeconds: 600 } }),
  ]) {
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.code, 'LINUX_DEPENDENCY_UNAVAILABLE');
  }
});
