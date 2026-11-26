import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { syncFixture } from './chat-sync-fixture.mjs';

const prefix = '/dot-computer/v1';
const thread = id => prefix + '/threads/' + id;
const environment = id => prefix + '/environments/' + id;
const code = 'print(29 * 31)';
const token = 'neutral-linux-desktop-provider-token-447';
const ready = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

function configure(fixture) {
  Object.assign(fixture.env, {
    DOT_COMPUTER_PROVIDER_ORIGIN: 'https://isolated-linux.example',
    DOT_COMPUTER_PROVIDER_TOKEN: token,
  });
}

test('cloud computer is unavailable without its provider and requires a verified Pro session', async t => {
  const f = await syncFixture();
  t.after(() => f.DB.raw.close());
  const provider = t.mock.method(globalThis, 'fetch', async () => { throw Error('No upstream call expected'); });
  const path = thread(crypto.randomUUID());
  assert.equal((await f.call(path)).status, 401);
  assert.equal((await f.call(path, { token: f.alice.token })).status, 403);
  const result = await f.call(path + '/wake', { method: 'POST', token: f.admin.token });
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { status: 'unconfigured', kind: 'linux-desktop', environmentId: null, width: 1024, height: 720, expiresAt: null });
  assert.equal(provider.mock.callCount(), 0);
});

test('native Dot Worker owns exactly one Linux desktop and journals each task once', async t => {
  const f = await syncFixture();
  t.after(() => f.DB.raw.close());
  configure(f);
  await f.call('/auth/site-trial', { method: 'POST', token: f.bob.token, body: { tier: 'pro' } });
  const startup = ready(), job = ready(), admitted = ready(), taskAdmitted = ready();
  let provisioned, starts = 0, runs = 0;
  const frame = new Uint8Array(33), png = new DataView(frame.buffer);
  png.setUint32(0, 0x89504e47); png.setUint32(4, 0x0d0a1a0a); png.setUint32(8, 13);
  png.setUint32(12, 0x49484452); png.setUint32(16, 1024); png.setUint32(20, 720);
  const provider = t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(url.origin, 'https://isolated-linux.example');
    assert.equal(init.headers.Authorization, 'Bearer ' + token);
    assert.equal(init.redirect, 'error');
    const body = init.body === undefined ? null : JSON.parse(init.body);
    if (url.pathname === '/v1/desktops' && init.method === 'POST') {
      starts++;
      assert.match(body.id, /^[a-f0-9-]{36}$/);
      assert.equal(body.ttlSeconds, 600);
      provisioned = body.id;
      admitted.resolve();
      await startup.promise;
      return Response.json({ id: provisioned }, { status: 201 });
    }
    assert.ok(provisioned);
    const base = '/v1/desktops/' + provisioned;
    if (url.pathname === base + '/frame' && init.method === 'GET') {
      return new Response(frame, { headers: { 'Content-Type': 'image/png' } });
    }
    if (url.pathname === base + '/input' && init.method === 'POST') {
      assert.deepEqual(body, { type: 'move', x: 25, y: 66 });
      return new Response(null, { status: 204 });
    }
    if (url.pathname === base + '/task' && init.method === 'POST') {
      runs++;
      assert.equal(body.code, code);
      assert.match(body.requestId, /^[a-f0-9-]{36}$/);
      taskAdmitted.resolve();
      await job.promise;
      return Response.json({ exitCode: 0, stdout: '899\n', stderr: '' });
    }
    assert.equal(url.pathname, base);
    assert.equal(init.method, 'DELETE');
    return new Response(null, { status: 204 });
  });

  const options = { token: f.admin.token }, waiters = [];
  const context = { waitUntil(promise) { waiters.push(promise); } };
  const path = thread(crypto.randomUUID());
  const wake = () => f.call(path + '/wake', { method: 'POST', context, ...options });
  const [first, concurrent] = await Promise.all([wake(), wake()]);
  await admitted.promise;
  const starting = await first.json();
  assert.equal(starting.status, 'starting');
  assert.equal((await concurrent.json()).environmentId, starting.environmentId);
  assert.equal(starts, 1);
  startup.resolve();
  await Promise.all(waiters);
  const actual = await (await f.call(path, options)).json();
  assert.equal(actual.status, 'ready');
  assert.equal(actual.environmentId, starting.environmentId);
  const instance = environment(actual.environmentId);
  assert.equal((await f.call(instance + '/frame', { token: f.bob.token })).status, 404);
  const response = await f.call(instance + '/frame', options);
  assert.equal(response.headers.get('content-type'), 'image/png');
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), frame);

  const move = { type: 'move', x: 25, y: 66, unrelated: 'discarded' };
  assert.equal((await f.call(instance + '/input', { method: 'POST', body: move, ...options })).status, 204);
  assert.equal((await f.call(instance + '/input', { method: 'POST', body: { ...move, x: 1024 }, ...options })).status, 400);
  const body = { code, requestId: crypto.randomUUID() };
  const send = body => f.call(instance + '/task', { method: 'POST', body, ...options });
  const pending = send(body);
  await taskAdmitted.promise;
  assert.equal((await send(body)).status, 202);
  assert.equal((await send({ ...body, code: code + ' ' })).status, 409);
  job.resolve();
  const receipt = await pending;
  assert.equal(receipt.status, 200);
  const actualResult = await receipt.json();
  assert.deepEqual(actualResult, { status: 'complete', stdout: '899\n', stderr: '', exitCode: 0 });
  assert.deepEqual(await (await send(body)).json(), actualResult);
  assert.equal(runs, 1);
  assert.equal((await send({ ...body, code: code + ' ' })).status, 409);

  assert.equal((await f.call(instance, { method: 'DELETE', ...options })).status, 200);
  assert.equal((await (await f.call(path, options)).json()).status, 'stopped');
  assert.deepEqual(await (await send(body)).json(), actualResult);
  assert.equal((await send({ ...body, requestId: crypto.randomUUID() })).status, 409);
  assert.equal(provider.mock.callCount(), 5);
});

test('a lost provider response recovers the original task receipt over HTTP', async t => {
  const f = await syncFixture();
  t.after(() => f.DB.raw.close());
  const receipt = { exitCode: 0, stdout: '899\n', stderr: '' };
  const received = [];
  let executions = 0, providerId;
  const provider = createServer(async (req, res) => {
    let raw = '';
    for await (const part of req) raw += part;
    const body = JSON.parse(raw);
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/v1/desktops') {
      providerId = body.id;
      res.end(JSON.stringify({ id: providerId }));
      return;
    }
    if (req.url !== '/v1/desktops/' + providerId + '/task') {
      res.writeHead(404).end();
      return;
    }
    const first = !received.some(task => task.requestId === body.requestId);
    received.push(body);
    if (first) {
      executions++;
      if (executions === 1) req.socket.destroy();
      else {
        res.setHeader('Content-Length', Buffer.byteLength(JSON.stringify(receipt)));
        res.write('{"exitCode":', () => req.socket.destroy());
      }
      return;
    }
    res.end(JSON.stringify(receipt));
  });
  await new Promise(resolve => provider.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => provider.close(resolve)));
  configure(f);
  f.env.DOT_COMPUTER_PROVIDER_ORIGIN = 'http://127.0.0.1:' + provider.address().port;
  const owner = { token: f.admin.token }, path = thread(crypto.randomUUID());
  const work = [];
  const context = { waitUntil(promise) { work.push(promise); } };
  const response = await f.call(path + '/wake', { method: 'POST', context, ...owner });
  const { environmentId } = await response.json();
  await Promise.all(work);
  const expectReceipt = { status: 'complete', ...receipt };
  for (let index = 0; index < 2; index++) {
    const body = { code, requestId: crypto.randomUUID() };
    const send = () => f.call(environment(environmentId) + '/task', { method: 'POST', body, ...owner });
    assert.deepEqual(await (await send()).json(), expectReceipt);
    assert.deepEqual(await (await send()).json(), expectReceipt);
    assert.deepEqual(received.slice(index * 2), [body, body]);
    assert.equal(executions, index + 1);
  }
});

test('stop while a provider is starting prevents a leaked Linux session', async t => {
  const f = await syncFixture();
  t.after(() => f.DB.raw.close());
  configure(f);
  const began = ready(), complete = ready(), stopped = ready();
  let inputId;
  const backend = t.mock.method(globalThis, 'fetch', async (url, init) => {
    if (init.method === 'POST') {
      inputId = JSON.parse(init.body).id;
      began.resolve();
      await complete.promise;
      return Response.json({ id: inputId });
    }
    assert.equal(init.method, 'DELETE');
    assert.equal(url.pathname, '/v1/desktops/' + inputId);
    stopped.resolve();
    return new Response(null, { status: 204 });
  });
  const work = [], context = { waitUntil(promise) { work.push(promise); } };
  const owner = { token: f.admin.token }, path = thread(crypto.randomUUID());
  const opened = await f.call(path + '/wake', { method: 'POST', context, ...owner });
  await began.promise;
  const { environmentId } = await opened.json();
  assert.equal(environmentId, inputId);
  assert.equal((await f.call(environment(environmentId), { method: 'DELETE', ...owner })).status, 200);
  complete.resolve();
  await stopped.promise;
  await Promise.all(work);
  assert.equal((await (await f.call(path, owner)).json()).status, 'stopped');
  assert.equal(backend.mock.callCount(), 2);
});
