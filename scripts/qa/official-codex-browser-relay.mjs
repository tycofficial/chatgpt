import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openCodexAppServer } from '../codex-runtime/app-server.mjs';
import { createLocalUi } from '../../local-bridge/server.mjs';
import { createCodexBrowserSession } from '../../local-bridge/codex-browser-session.mjs';
import { connectLocalCodex } from '../../local-bridge/codex-browser-client.mjs';

const root = await realpath(await mkdtemp(join(tmpdir(), 'tyc-test-codex-')));
const workspace = join(root, 'workspace');
const state = join(root, 'codex-state');
await Promise.all([mkdir(workspace), mkdir(state)]);

const command = 'python3 -c "print(17 * 13)"';
const includeTool = process.env.QA_CODEX_TEST_MODE !== 'conversation';
const firstStageRequestCount = includeTool ? 2 : 1;
const requested = [];
const fixtureErrors = [];
let releaseFirst;
const waitForReattachedReader = new Promise(resolve => { releaseFirst = resolve; });
function completed(id) {
  return { type: 'response.completed', response: {
    id, usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, input_tokens_details: null, output_tokens_details: null },
  } };
}
const fixture = createServer(async (req, res) => {
  if (req.method !== 'POST' || new URL(req.url, 'http://127.0.0.1').pathname !== '/v1/responses') {
    res.writeHead(404).end(); return;
  }
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    requested.push(payload);
    const number = requested.length;
    if (number === 1) await waitForReattachedReader;
    const id = 'resp-' + number;
    const item = includeTool && number === 1 ? {
      type: 'function_call', call_id: 'test-exec', name: 'exec_command', arguments: JSON.stringify({ cmd: command }),
    } : {
      type: 'message', id: 'msg-' + number, role: 'assistant', phase: 'final_answer',
      content: [{ type: 'output_text', text: number <= firstStageRequestCount ? 'The result is 221.' : 'The previous result was 221.' }],
    };
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    for (const event of [{ type: 'response.created', response: { id } }, { type: 'response.output_item.done', item }, completed(id)]) {
      res.write('event: ' + event.type + '\ndata: ' + JSON.stringify(event) + '\n\n');
    }
    res.end();
  } catch (cause) {
    fixtureErrors.push(cause.name + ': ' + cause.message);
    res.writeHead(400).end();
  }
});

async function hostBrowserBridge() {
  const env = { PATH: process.env.PATH, HOME: state, CODEX_HOME: state };
  const appServer = await openCodexAppServer({ workspace, env });
  const record = new Map();
  const local = createLocalUi({
    codex: createCodexBrowserSession({ workspace, appServer }),
    store: { write: (key, value) => record.set(key, value) },
    sessions: { accounts: async () => ({ registrations: [] }) },
    bridge: { status: async () => ({ paired: false }), stop: async () => {} },
    port: 0,
  });
  try {
    const { origin } = await local.start();
    const unauthenticated = await fetch(origin + '/local/codex/v1/status');
    assert.equal(unauthenticated.status, 403);
    const launch = await fetch(record.get('ui.json').launchUrl, { redirect: 'manual' });
    assert.equal(launch.status, 303);
    const cookie = launch.headers.get('set-cookie')?.split(';')[0];
    assert.ok(cookie);
    async function browserFetch(path, options = {}) {
      const headers = new Headers(options.headers);
      headers.set('Cookie', cookie);
      if (options.method === 'POST') headers.set('Origin', origin);
      return fetch(origin + path, { ...options, headers });
    }
    const setup = await browserFetch('/local/status').then(response => response.json());
    const module = await browserFetch('/local/codex/v1/client.mjs');
    assert.match(module.headers.get('content-type'), /javascript/);
    await module.text();
    return {
      connect: fetchImpl => connectLocalCodex({ csrf: setup.csrf, fetchImpl: fetchImpl ?? browserFetch }),
      browserFetch, close: local.close, server: appServer.server,
    };
  } catch (error) {
    await local.close();
    throw error;
  }
}

async function collectTurn(client, threadId, turnId, after = 0) {
  const events = [];
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    const page = await client.readEvents(threadId, { after });
    after = page.next;
    events.push(...page.events.map(event => event.message));
    const terminal = events.find(event => event.method === 'turn/completed' && event.params.turn.id === turnId);
    if (terminal) {
      assert.equal(terminal.params.turn.status, 'completed', JSON.stringify(terminal.params.turn.error));
      return { events: events.filter(event => event.params.turnId === turnId || event.params.turn?.id === turnId), after };
    }
    await delay(50);
  }
  throw new Error('Codex turn did not complete: ' + JSON.stringify({
    notifications: events.map(event => [event.method, event.params?.item?.type]),
    received: requested.length, fixtureErrors,
  }));
}

let host;
try {
  fixture.listen(0, '127.0.0.1');
  await once(fixture, 'listening');
  const url = 'http://127.0.0.1:' + fixture.address().port + '/v1';
  await writeFile(join(state, 'config.toml'), [
    'model = "fixture-codex"', 'approval_policy = "never"', 'model_provider = "fixture"',
    '[model_providers.fixture]', 'name = "Local integration test"', 'base_url = "' + url + '"',
    'wire_api = "responses"', 'request_max_retries = 0', 'stream_max_retries = 0',
    '[features]', 'enable_request_compression = false', 'unified_exec = true', 'shell_snapshot = false',
    '[shell_environment_policy]', 'inherit = "core"', 'include_only = ["PATH"]', '',
  ].join('\n'), { mode: 0o600 });

  host = await hostBrowserBridge();
  const browser = await host.connect();
  const oldInstanceId = browser.status.instanceId;
  const models = await browser.request('model/list');
  assert.ok(Array.isArray(models.data));
  const mutation = () => ({ requestId: randomUUID() });
  const { thread } = await browser.request('thread/start', { model: 'fixture-codex' }, mutation());
  const input = text => [{ type: 'text', text }];
  const prompt = 'Use Python to calculate 17 times 13.';
  const startParams = { threadId: thread.id, input: input(prompt) };
  await assert.rejects(browser.request('command/exec', {}, mutation()), { status: 400, code: 'CODEX_INVALID_REQUEST' });
  await assert.rejects(browser.request('turn/start', { ...startParams, sandbox: 'danger-full-access' }, mutation()), { status: 400, code: 'CODEX_INVALID_REQUEST' });
  await assert.rejects(browser.request('turn/start', { ...startParams, input: [{ type: 'localImage', path: 'example' }] }, mutation()), { status: 400, code: 'CODEX_INVALID_REQUEST' });
  const noCsrf = await host.browserFetch('/local/codex/v1/rpc', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
  });
  assert.equal(noCsrf.status, 403);
  assert.equal(requested.length, 0);

  const flaky = await host.connect(async (path, options) => {
    const response = await host.browserFetch(path, options);
    if (path.endsWith('/rpc')) {
      assert.equal(response.status, 200);
      await response.text();
      throw new TypeError('Reader lost its HTTP response');
    }
    return response;
  });
  const firstId = randomUUID();
  await assert.rejects(flaky.request('turn/start', startParams, { requestId: firstId }), /Reader lost its HTTP response/);

  // A fresh browser reader sees the original admission without another dispatch.
  const reopened = await host.connect();
  const receipt = await reopened.readReceipt(firstId, { instanceId: oldInstanceId });
  assert.equal(receipt.state, 'acknowledged');
  assert.ok(Number.isSafeInteger(receipt.admittedAt));
  const firstTurnId = receipt.result.turn.id;
  assert.equal((await reopened.request('turn/start', startParams, { requestId: firstId })).turn.id, firstTurnId);
  await assert.rejects(reopened.request('turn/start', { ...startParams, input: input('A changed request.') }, { requestId: firstId }),
    { status: 409, code: 'CODEX_REQUEST_ID_CONFLICT' });
  releaseFirst();
  const { events } = await collectTurn(reopened, thread.id, firstTurnId);
  const done = events.find(event => event.method === 'item/completed' && event.params.item.type === 'commandExecution')?.params.item;
  if (includeTool) {
    assert.ok(done, 'No command result: ' + JSON.stringify({
      notifications: events.map(event => [event.method, event.params?.item?.type]),
      requests: requested.map(payload => (payload.tools ?? []).map(tool => tool.name ?? tool.type)),
      testOutputs: requested.flatMap(payload => (payload.input ?? []).filter(item => item.type === 'function_call_output')
        .map(item => [item.call_id, JSON.stringify(item.output).slice(0, 500)])),
      fixtureErrors,
    }));
    assert.equal(done.exitCode, 0, JSON.stringify(done));
    assert.match(done.aggregatedOutput, /221/);
    assert.ok(requested[1].input.some(item => item.type === 'function_call_output' && item.call_id === 'test-exec' && JSON.stringify(item.output).includes('221')));
  }
  assert.ok(events.some(event => event.method === 'item/completed' && event.params.item.type === 'agentMessage' && /221/.test(event.params.item.text)));
  assert.equal(requested.length, firstStageRequestCount);

  await host.close();
  host = await hostBrowserBridge();
  const resumed = await host.connect();
  await assert.rejects(resumed.readReceipt(firstId, { instanceId: oldInstanceId }), { status: 409, code: 'CODEX_CONNECTION_CHANGED' });
  const reopenedThread = await resumed.request('thread/resume', { threadId: thread.id });
  assert.equal(reopenedThread.thread.id, thread.id);
  assert.ok(reopenedThread.thread.turns.some(turn => turn.id === firstTurnId && turn.status === 'completed'));
  const next = await resumed.request('turn/start', {
    threadId: thread.id, input: input('What was the previous result?'), model: 'fixture-codex-next', effort: 'medium',
  }, mutation());
  const follow = await collectTurn(resumed, thread.id, next.turn.id);
  assert.ok(follow.events.some(event => event.method === 'item/completed' && event.params.item.type === 'agentMessage' && /221/.test(event.params.item.text)));
  assert.equal(requested.length, firstStageRequestCount + 1);
  assert.match(JSON.stringify(requested[firstStageRequestCount].input), /Use Python to calculate 17 times 13/);
  assert.equal(requested[firstStageRequestCount].model, 'fixture-codex-next');
  assert.equal(requested[firstStageRequestCount].reasoning?.effort, 'medium');

  console.log('Real Codex browser relay QA ' + JSON.stringify({
    codex: host.server.userAgent, upstream: 'loopback Responses fixture', openaiAccountUsed: false,
    actualCommand: done?.type ?? null, commandExitCode: done?.exitCode ?? null, output: done ? '221' : null,
    unauthorizedRejected: true, sandboxOverrideRejected: true, lostReceiptRecovered: true, duplicateDispatch: false,
    hostRestartDetected: true, sameThreadContinued: true, manualModelAndEffortForwarded: true, upstreamRequests: requested.length,
  }));
} finally {
  releaseFirst();
  await host?.close();
  if (fixture.listening) {
    const closed = once(fixture, 'close');
    fixture.close();
    fixture.closeAllConnections();
    await closed;
  }
  await rm(root, { recursive: true, force: true });
}
