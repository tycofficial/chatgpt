import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { openCodexAppServer } from '../codex-runtime/app-server.mjs';
import { createLocalUi } from '../../local-bridge/server.mjs';
import { createCodexBrowserSession } from '../../local-bridge/codex-browser-session.mjs';

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

async function hostBrowserBridge(context) {
  const env = { PATH: process.env.PATH, HOME: state, CODEX_HOME: state };
  const appServer = await openCodexAppServer({ workspace, env, experimentalApi: true });
  const request = appServer.request;
  appServer.request = async (method, params) => {
    try { return await request(method, params); }
    catch (error) {
      console.log('Fixture App Server RPC rejection ' + JSON.stringify({ method, code: error.rpcCode, message: error.message.slice(0, 500) }));
      throw error;
    }
  };
  const record = new Map();
  const local = createLocalUi({
    codex: createCodexBrowserSession({ workspace, appServer }),
    store: { write: (key, value) => record.set(key, value) },
    sessions: { accounts: async () => ({ registrations: [] }) },
    bridge: { status: async () => ({ paired: false }), stop: async () => {} },
    port: 0,
  });
  let page = await context.newPage();
  try {
    const { origin } = await local.start();
    const unauthenticated = await fetch(origin + '/local/codex/v1/status');
    assert.equal(unauthenticated.status, 403);
    const launch = await page.goto(record.get('ui.json').launchUrl);
    assert.equal(launch.status(), 200);
    assert.equal(page.url(), origin + '/');
    assert.equal((await page.evaluate(async () => (await fetch('/local/codex/v1/rpc', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    })).status)), 403);
    async function connect({ dropReply = false, reload = false, reopen = false } = {}) {
      if (reload) assert.equal((await page.reload()).status(), 200);
      if (reopen) {
        await page.close();
        page = await context.newPage();
        assert.equal((await page.goto(origin + '/')).status(), 200);
      }
      const status = await page.evaluate(async ({ dropReply }) => {
        const { csrf } = await fetch('/local/status').then(response => response.json());
        const { connectLocalCodex } = await import('/local/codex/v1/client.mjs');
        const fetchImpl = async (path, options) => {
          const response = await fetch(path, options);
          if (dropReply && path.endsWith('/rpc') && response.ok) {
            await response.text();
            throw new TypeError('Reader lost its HTTP response');
          }
          return response;
        };
        window.qaCodex = await connectLocalCodex({ csrf, fetchImpl });
        return window.qaCodex.status;
      }, { dropReply });
      async function call(name, args) {
        const reply = await page.evaluate(async ({ name, args }) => {
          try { return { result: await window.qaCodex[name](...args) }; }
          catch (cause) { return { error: { message: cause.message, code: cause.code, status: cause.status } }; }
        }, { name, args });
        if (reply.error) throw Object.assign(Error(reply.error.message), reply.error);
        return reply.result;
      }
      return {
        status, request: (...args) => call('request', args),
        readReceipt: (...args) => call('readReceipt', args),
        readEvents: (...args) => call('readEvents', args),
      };
    }
    return { connect, close: async () => { await page.close(); await local.close(); }, server: appServer.server };

  } catch (error) {
    await page.close();
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

let host, browser;
try {
  fixture.listen(0, '127.0.0.1');
  await once(fixture, 'listening');
  const url = 'http://127.0.0.1:' + fixture.address().port + '/v1';
  await writeFile(join(state, 'config.toml'), [
    'model = "fixture-codex"', 'approval_policy = "never"', 'model_provider = "fixture"', 'default_permissions = "site-browser-codex"',
    '[model_providers.fixture]', 'name = "Local integration test"', 'base_url = "' + url + '"',
    'wire_api = "responses"', 'request_max_retries = 0', 'stream_max_retries = 0',
    '[features]', 'enable_request_compression = false', 'unified_exec = true', 'shell_snapshot = false',
    '[permissions.site-browser-codex.filesystem]', '":minimal" = "read"', '":workspace_roots" = "write"',
    '[permissions.site-browser-codex.network]', 'enabled = false',
    '[shell_environment_policy]', 'inherit = "core"', 'include_only = ["PATH"]', '',
  ].join('\n'), { mode: 0o600 });

  const { chromium } = await import(pathToFileURL(process.env.QA_PLAYWRIGHT_MODULE).href);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  host = await hostBrowserBridge(context);
  const nativeClient = await host.connect();
  const oldInstanceId = nativeClient.status.instanceId;
  const models = await nativeClient.request('model/list');
  assert.ok(Array.isArray(models.data));
  const mutation = () => ({ requestId: randomUUID() });
  const { thread, activePermissionProfile } = await nativeClient.request('thread/start', { model: 'fixture-codex' }, mutation());
  assert.equal(activePermissionProfile.id, 'site-browser-codex');
  const input = text => [{ type: 'text', text }];
  const prompt = 'Use Python to calculate 17 times 13.';
  const startParams = { threadId: thread.id, input: input(prompt) };
  await assert.rejects(nativeClient.request('command/exec', {}, mutation()), { status: 400, code: 'CODEX_INVALID_REQUEST' });
  await assert.rejects(nativeClient.request('turn/start', { ...startParams, sandbox: 'danger-full-access' }, mutation()), { status: 400, code: 'CODEX_INVALID_REQUEST' });
  await assert.rejects(nativeClient.request('turn/start', { ...startParams, input: [{ type: 'localImage', path: 'example' }] }, mutation()), { status: 400, code: 'CODEX_INVALID_REQUEST' });
  assert.equal(requested.length, 0);
  const flaky = await host.connect({ dropReply: true });
  const firstId = randomUUID();
  await assert.rejects(flaky.request('turn/start', startParams, { requestId: firstId }), /Reader lost its HTTP response/);

  // A fresh browser reader sees the original admission without another dispatch.
  const reopened = await host.connect({ reload: true });
  const receipt = await reopened.readReceipt(firstId, { instanceId: oldInstanceId });
  assert.equal(receipt.state, 'acknowledged');
  assert.ok(Number.isSafeInteger(receipt.admittedAt));
  const firstTurnId = receipt.result.turn.id;
  assert.equal((await reopened.request('turn/start', startParams, { requestId: firstId })).turn.id, firstTurnId);
  await assert.rejects(reopened.request('turn/start', { ...startParams, input: input('A changed request.') }, { requestId: firstId }),
    { status: 409, code: 'CODEX_REQUEST_ID_CONFLICT' });
  const freshTab = await host.connect({ reopen: true });
  assert.equal((await freshTab.readReceipt(firstId)).result.turn.id, firstTurnId);
  const started = await freshTab.readEvents(thread.id);
  assert.ok(started.events.some(event => event.message.method === 'turn/started' && event.message.params.turn.id === firstTurnId));
  releaseFirst();
  const { events } = await collectTurn(freshTab, thread.id, firstTurnId);
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
  host = await hostBrowserBridge(context);
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
    codex: host.server.userAgent, browser: 'Chromium ' + browser.version(), refreshedPage: true, reopenedTab: true, upstream: 'loopback Responses fixture', openaiAccountUsed: false,
    actualCommand: done?.type ?? null, commandExitCode: done?.exitCode ?? null, output: done ? '221' : null,
    unauthorizedRejected: true, sandboxOverrideRejected: true, lostReceiptRecovered: true, duplicateDispatch: false,
    hostRestartDetected: true, sameThreadContinued: true, manualModelAndEffortForwarded: true, upstreamRequests: requested.length,
  }));
} finally {
  releaseFirst();
  await host?.close();
  await browser?.close();
  if (fixture.listening) {
    const closed = once(fixture, 'close');
    fixture.close();
    fixture.closeAllConnections();
    await closed;
  }
  await rm(root, { recursive: true, force: true });
}
