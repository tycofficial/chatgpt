import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openCodexAppServer } from '../codex-runtime/app-server.mjs';

const root = await mkdtemp(join(tmpdir(), 'tyc-test-codex-'));
const workspace = join(root, 'workspace');
const state = join(root, 'codex-state');
await Promise.all([mkdir(workspace), mkdir(state)]);

const command = 'python3 -c "print(17 * 13)"';
const requested = [];
const fixtureErrors = [];
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
    const id = 'resp-' + number;
    const item = number === 1 ? {
      type: 'function_call', call_id: 'test-exec', name: 'exec_command', arguments: JSON.stringify({ cmd: command }),
    } : {
      type: 'message', id: 'msg-' + number, role: 'assistant', phase: 'final_answer',
      content: [{ type: 'output_text', text: number === 2 ? 'The result is 221.' : 'The previous result was 221.' }],
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

async function runTurn(client, threadId, text) {
  const observed = [];
  let unsubscribe, timer;
  try {
    const terminal = new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(Error('Timed out waiting for a Codex turn')), 45_000);
      unsubscribe = client.subscribe(event => {
        if (event.params?.threadId !== threadId) return;
        observed.push(event);
        if (event.method === 'turn/completed') resolve(event.params.turn);
      });
    });
    const [start, done] = await Promise.all([
      client.request('turn/start', {
        threadId, input: [{ type: 'text', text, textElements: [] }],
        // GitHub-hosted Ubuntu cannot set up an isolated loopback interface in bwrap.
        // Only this deterministic test uses the runner's network namespace.
        ...(process.env.QA_CODEX_LINUX_NETWORK === '1' ? {
          sandboxPolicy: { type: 'workspaceWrite', writableRoots: [workspace], networkAccess: true },
        } : {}),
      }),
      terminal,
    ]);
    assert.equal(start.turn.id, done.id);
    assert.equal(done.status, 'completed', JSON.stringify(done.error));
    return observed;
  } catch (cause) {
    console.log('Turn diagnostics ' + JSON.stringify({ events: observed.map(e => [e.method, e.params?.item?.type]), received: requested.length, fixtureErrors }));
    throw cause;
  } finally {
    clearTimeout(timer);
    unsubscribe?.();
  }
}

let client;
try {
  fixture.listen(0, '127.0.0.1');
  await once(fixture, 'listening');
  const url = 'http://127.0.0.1:' + fixture.address().port + '/v1';
  await writeFile(join(state, 'config.toml'), [
    'model = "fixture-codex"', 'approval_policy = "never"', 'model_provider = "fixture"',
    '[model_providers.fixture]', 'name = "Local integration test"', 'base_url = "' + url + '"',
    'wire_api = "responses"', 'request_max_retries = 0', 'stream_max_retries = 0',
    '[features]', 'enable_request_compression = false', 'unified_exec = true', 'shell_snapshot = false', '',
  ].join('\n'), { mode: 0o600 });
  const env = { ...process.env, CODEX_HOME: state };
  delete env.OPENAI_API_KEY;
  delete env.CODEX_API_KEY;
  const connect = () => openCodexAppServer({ workspace, env });
  client = await connect();
  const { thread } = await client.request('thread/start', { model: 'fixture-codex', cwd: workspace, sandbox: 'workspace-write', approvalPolicy: 'never' });
  const direct = await runTurn(client, thread.id, 'Use Python to calculate 17 times 13.');
  const done = direct.find(event => event.method === 'item/completed' && event.params.item.type === 'commandExecution')?.params.item;
  assert.ok(done, 'The real Codex process did not emit a command item: ' + JSON.stringify({
    events: direct.map(event => [event.method, event.params?.item?.type]),
    requests: requested.map(payload => (payload.tools ?? []).map(tool => tool.name ?? tool.type)),
    results: requested.flatMap(payload => (payload.input ?? []).filter(item => item.type === 'function_call_output')
      .map(item => [item.call_id, JSON.stringify(item.output).slice(0, 500)])),
    warnings: direct.filter(event => event.method === 'warning').map(event => event.params?.message?.slice(0, 360)),
    fixtureErrors,
  }));
  assert.equal(done.exitCode, 0, JSON.stringify(done));
  assert.match(done.aggregatedOutput, /221/);
  assert.ok(direct.some(event => event.method === 'item/completed' && event.params.item.type === 'agentMessage' && /221/.test(event.params.item.text)));
  assert.equal(requested.length, 2);
  assert.ok(requested[1].input.some(item => item.type === 'function_call_output' && item.call_id === 'test-exec' && JSON.stringify(item.output).includes('221')));
  await client.close();
  client = await connect();
  const resumed = await client.request('thread/resume', { threadId: thread.id, excludeTurns: true });
  assert.equal(resumed.thread.id, thread.id);
  const next = await runTurn(client, thread.id, 'What was the previous result?');
  assert.ok(next.some(event => event.method === 'item/completed' && event.params.item.type === 'agentMessage' && /221/.test(event.params.item.text)));
  assert.equal(requested.length, 3);
  assert.match(JSON.stringify(requested[2].input), /Use Python to calculate 17 times 13/);
  console.log('Real Codex App Server QA ' + JSON.stringify({
    server: client.server?.userAgent, upstream: 'loopback Responses fixture', openaiAccountUsed: false,
    tool: done.type, commandExitCode: done.exitCode, pythonOutput: '221', restarted: true,
    resumedSameThread: true, turns: 2, upstreamRequests: requested.length,
  }));
} finally {
  await client?.close();
  if (fixture.listening) {
    const closed = once(fixture, 'close');
    fixture.close();
    fixture.closeAllConnections();
    await closed;
  }
  await rm(root, { recursive: true, force: true });
}
