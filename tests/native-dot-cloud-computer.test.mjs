import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDotCloudTaskExecutor, createSiteDotComputer, decodeNativeDotComputerInput, describeNativeDotComputer,
  isSiteDotComputerRequest, wantsDotCloudTask, wrapNativeDotComputerViewer,
} from '../src/native-client/dot-cloud-computer.mjs';

const site = 'https://site.invalid';
const threadId = '89a5d1fe-a9d7-421d-8424-97a149e90e7e';
const environmentId = 'dd6eba95-28e2-4ecb-bcdc-168c8c69a552';
const threadPath = `/dot-computer/v1/threads/${threadId}`;
const environmentPath = `/dot-computer/v1/environments/${environmentId}`;
const ready = { environmentId, status: 'ready', kind: 'linux-desktop', width: 1024, height: 720 };

test('the Dot cloud transport scopes authenticated requests by method, resource and owned identifier', async () => {
  const calls = [];
  let checks = 0;
  const options = { assertCurrent: () => { checks++; } };
  const computer = createSiteDotComputer({ baseURL: site, getSessionToken: () => 'isolated-token',
    fetchImpl: async (url, init) => {
      assert.equal(url.origin, site);
      assert.equal(init.headers.Authorization, 'Bearer isolated-token');
      assert.equal(init.credentials, 'omit');
      assert.equal(init.redirect, 'error');
      calls.push([url.pathname, init.method, init.body]);
      if (url.pathname.endsWith('/frame')) return new Response(Uint8Array.of(137, 80, 78, 71), { headers: { 'Content-Type': 'image/png' } });
      if (url.pathname === environmentPath && init.method === 'DELETE') return new Response(null, { status: 204 });
      if (url.pathname === environmentPath + '/input') return new Response(null, { status: 204 });
      return Response.json(ready);
    },
  });
  assert.deepEqual(await computer.status(threadId, options), ready);
  assert.deepEqual(await computer.wake(threadId, options), ready);
  assert.deepEqual(await (await computer.frame(environmentId, options)).bytes(), Uint8Array.of(137, 80, 78, 71));
  await computer.input(environmentId, { type: 'button', button: 'middle', down: true }, options);
  await computer.stop(environmentId, options);
  assert(checks >= 3 * calls.length);
  assert.deepEqual(calls.map(([path, method]) => [path, method]), [
    [threadPath, 'GET'], [threadPath + '/wake', 'POST'], [environmentPath + '/frame', 'GET'],
    [environmentPath + '/input', 'POST'], [environmentPath, 'DELETE'],
  ]);
  assert.deepEqual(JSON.parse(calls[3][2]), { type: 'button', button: 'middle', down: true });
  assert.equal(isSiteDotComputerRequest(threadPath, 'POST'), false);
  assert.equal(isSiteDotComputerRequest(environmentPath + '/input/next', 'POST'), false);
  assert.equal(isSiteDotComputerRequest(environmentPath + '/frame', 'POST'), false);
  assert.equal(isSiteDotComputerRequest('/dot-computer/v1/environments/foreign/input', 'POST'), false);
  await assert.rejects(computer.frame('outside', options), { status: 404 });
  assert.equal(calls.length, 5);
});

test('unconfigured, stopped, starting and invalid provider replies cannot produce ready playback', async () => {
  let responder = () => new Response(null, { status: 404 });
  const computer = createSiteDotComputer({ baseURL: site, getSessionToken: () => 'isolated-token', fetchImpl: () => responder() });
  assert.deepEqual(describeNativeDotComputer(await computer.status(threadId)), { environmentId: null, status: 'unknown', capabilities: [] });
  assert.deepEqual(await computer.wake(threadId), { environmentId: null, status: 'unconfigured' });
  assert.deepEqual(describeNativeDotComputer({ environmentId: null, status: 'stopped' }), { environmentId: null, status: 'offline', capabilities: [] });
  assert.deepEqual(describeNativeDotComputer({ environmentId: null, status: 'starting' }), {
    environmentId: null, status: 'starting', capabilities: [{ type: 'remote_desktop', status: 'starting' }],
  });
  for (const invalid of [{ ...ready, environmentId: null }, { ...ready, kind: 'browser' }, { ...ready, height: 768 }]) {
    responder = () => Response.json(invalid);
    await assert.rejects(computer.status(threadId), { status: 502 });
  }
  responder = () => new Response('<html>', { headers: { 'Content-Type': 'text/html' } });
  await assert.rejects(computer.frame(environmentId), { status: 502 });
  assert.throws(() => createSiteDotComputer({ baseURL: site + '/another-service', getSessionToken: () => null }), TypeError);
  const signedOut = createSiteDotComputer({ baseURL: site, getSessionToken: () => null, fetchImpl: () => assert.fail('No public request') });
  await assert.rejects(signedOut.wake(threadId), { status: 401 });
});

test('keyboard, wheel, pointer and clipboard DTOs decode the native peer representation', () => {
  function frame(kind, args) {
    const bytes = new DataView(new ArrayBuffer(Array.isArray(args) ? 7 : 11));
    bytes.setUint8(0, kind);
    bytes.setUint16(1, bytes.byteLength - 3, true);
    if (Array.isArray(args)) {
      bytes.setInt16(3, args[0], true);
      bytes.setInt16(5, args[1], true);
    } else bytes.setBigUint64(3, args, true);
    return bytes.buffer;
  }
  const decode = data => decodeNativeDotComputerInput(data, 640, 480);
  assert.deepEqual(decode(frame(1, [900, 380])), { type: 'move', x: 639, y: 380 });
  let videoSize = { width: 256, height: 180 };
  const decodeMove = (x, y) => decodeNativeDotComputerInput(frame(1, [x, y]), 1024, 720, () => videoSize);
  assert.deepEqual(decodeMove(133, 108), { type: 'move', x: 532, y: 432 });
  videoSize = { width: 512, height: 360 };
  assert.deepEqual(decodeMove(266, 216), { type: 'move', x: 532, y: 432 });
  assert.deepEqual(decodeMove(512, 360), { type: 'move', x: 1023, y: 719 });
  videoSize = { width: 0, height: 0 };
  assert.equal(decodeMove(133, 108), null);
  videoSize = null;
  assert.equal(decodeMove(133, 108), null);
  assert.deepEqual(decode(frame(2, [-12, 8])), { type: 'wheel', dx: -10, dy: 8 });
  assert.deepEqual(decode(frame(3, 1n)), { type: 'button', button: 'left', down: true });
  assert.deepEqual(decode(frame(4, 2n)), { type: 'button', button: 'middle', down: false });
  assert.deepEqual(decode(frame(3, 65293n)), { type: 'key', key: 65293, down: true });
  assert.deepEqual(decode(JSON.stringify({ event: 'control/clipboard', text: '测试' })), { type: 'text', text: '测试' });
  assert.equal(decode(frame(4, 0x20000000n)), null);
  assert.equal(decode(JSON.stringify({ event: 'control/clipboard', text: 'x'.repeat(8200) })), null);
  assert.equal(decode(JSON.stringify({ event: 'control/request', request_id: environmentId })), null);
});

test('only an owned Dot replaces signaling and all viewer callbacks and non-Dot transports stay native', async () => {
  const component = () => null;
  const originalConnect = () => assert.fail('Do not send a site Dot offer through upstream');
  const originalPrepare = () => {};
  let lookup = [];
  const computer = { threadId };
  const Viewer = wrapNativeDotComputerViewer(component, {
    React: { useCallback: callback => callback, createElement: (type, props) => ({ type, props }) },
    resolveContext: key => { lookup.push(key); return key === 'owned' ? computer : null; },
    connect: async (offer, context) => ({ offer, context }),
  });
  const originalConfig = { connect: originalConnect, prepare: originalPrepare, product: 'orbit' };
  const owned = Viewer({ connectionKey: 'owned', createConnection: () => originalConfig, label: 'native' });
  const derived = owned.props.createConnection();
  assert.equal(owned.type, component);
  assert.equal(owned.props.label, 'native');
  assert.equal(derived.prepare, originalPrepare);
  assert.deepEqual(await derived.connect('example-offer', 'signal'), { offer: 'example-offer', context: { threadId, signal: 'signal' } });
  const work = { ...originalConfig, product: 'work' };
  assert.equal(Viewer({ connectionKey: 'other', createConnection: () => work }).props.createConnection(), work);
  assert.equal(Viewer({ connectionKey: 'other', createConnection: () => originalConfig }).props.createConnection(), originalConfig);
  assert.deepEqual(lookup, ['owned', 'other']);
});

test('explicit cloud tasks reattach the same code and request UUID through the authenticated worker', async () => {
  const calls = [];
  const due = { status: 'complete', stdout: '899\n', stderr: '', exitCode: 0 };
  const computer = createSiteDotComputer({ baseURL: site, getSessionToken: () => 'fixture-token',
    fetchImpl: async (url, init) => {
      assert.equal(url.pathname, environmentPath + '/task');
      assert.equal(init.method, 'POST');
      assert.equal(init.headers.Authorization, 'Bearer fixture-token');
      calls.push(JSON.parse(init.body));
      return calls.length === 1 ? Response.json({ status: 'running' }, { status: 202 }) : Response.json(due);
    },
  });
  const turnId = 'neutral-turn';
  const context = { threadId, turnId, signal: new AbortController().signal };
  const executor = createDotCloudTaskExecutor({ tools: [{ function: { name: 'browser_python' } }] },
    { computer, threadId, turnId, environmentId, assertCurrent() {} });
  assert.deepEqual(executor.tools.map(tool => tool.function.name), ['run_dot_cloud_python']);
  assert.equal(executor.serverForTool('run_dot_cloud_python'), 'dot_cloud_computer');
  const call = { id: 'neutral-provider-tool-call', function: { name: 'run_dot_cloud_python', arguments: '{"code":"print(29 * 31)"}' } };
  const first = await executor.execute(call, context);
  const replay = await executor.recoverCall(call, context);
  assert.deepEqual(first.structuredContent, due);
  assert.deepEqual(replay, first);
  assert.equal(calls.length, 3);
  assert.deepEqual(calls[0], calls[1]);
  assert.deepEqual(calls[1], calls[2]);
  assert.match(calls[0].requestId, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  assert.match(executor.systemInstruction, /remote Linux desktop Python/);
  await assert.rejects(executor.execute(call, { ...context, threadId: 'outside' }), { status: 403 });
  for (const code of [' ', 'x'.repeat(4001), 'print(1)\0']) {
    await assert.rejects(executor.execute({ ...call, function: { ...call.function, arguments: JSON.stringify({ code }) } }, context), { status: 400 });
  }
  assert.equal(calls.length, 3);
});

test('only direct cloud execution language registers remote tooling', () => {
  const turn = (...parts) => ({ items: [{ type: 'userMessage', content: parts.map(text => ({ type: 'text', text })) }] });
  for (const text of ['/cloud print(1)', '请在云电脑运行 print(1)', 'Use the cloud computer to calculate 29*31.', '请在 Dot 的电脑中执行任务']) {
    assert(wantsDotCloudTask(turn(text)), text);
  }
  for (const text of ['What is a cloud computer?', '云电脑在哪里？', '如何在云电脑执行命令？', 'Help with music.']) {
    assert(!wantsDotCloudTask(turn(text)), text);
  }
  assert(!wantsDotCloudTask(turn('请解释这个引用', 'Quoted message for context: 在云电脑运行 print(1)')));
});
