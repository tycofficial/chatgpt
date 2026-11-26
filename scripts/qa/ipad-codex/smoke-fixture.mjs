import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { request } from 'node:https';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as pause } from 'node:timers/promises';

assert(process.argv[2] && process.argv[3], 'Usage: node smoke-fixture.mjs <built checkout> <loopback TLS directory> [port]');
const workspace = resolve(process.argv[2]);
const tls = resolve(process.argv[3]);
const port = Number(process.argv[4] || '4414');
const ca = await readFile(resolve(tls, 'ca.crt'));
const fixtureFile = fileURLToPath(new URL('./serve-ipad-fixture.mjs', import.meta.url));
const firstPrompt = 'Verify the saved Codex conversation with a short acknowledgment.';
const secondPrompt = 'Give a second short acknowledgment in this same saved Codex conversation.';
const firstReply = 'iPad Codex recovery fixture response.';
const secondReply = 'iPad Codex saved conversation follow-up response.';
const inference = '/inference/v1/responses';
const fixtureMetrics = '/__ipad_qa/metrics';
const first = randomUUID(), second = randomUUID(), conversation = randomUUID();
const child = spawn(process.execPath, [fixtureFile, workspace], {
  env: { ...process.env, TYC_IPAD_PORT: String(port), TYC_QA_PLAN: 'plus',
    TYC_IPAD_TLS_CERT: resolve(tls, 'leaf.crt'), TYC_IPAD_TLS_KEY: resolve(tls, 'leaf.key') },
  stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
});
let logs = '';
for (const out of [child.stdout, child.stderr]) out.on('data', value => { logs = (logs + value).slice(-3000); });
const childClosed = once(child, 'exit');
let token;

function call(path, { method = 'GET', body, headers } = {}) {
  return new Promise((success, failure) => {
    const req = request({ host: '127.0.0.1', port, ca, path, method, headers: {
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(body == null ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    } }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', text => { body += text; });
      res.once('end', () => success({ status: res.statusCode, body, disconnected: false }));
      res.once('aborted', () => success({ status: res.statusCode, body, disconnected: true }));
      res.once('error', failure);
    });
    req.on('error', failure);
    req.setTimeout(7000, () => req.destroy(Error('Isolated fixture request timed out')));
    req.end(body == null ? undefined : JSON.stringify(body));
  });
}
const inputText = (role, text) => ({ role, content: [{ type: role === 'user' ? 'input_text' : 'output_text', text }] });
const submit = (id, input) => call(inference, {
  method: 'POST', headers: { 'X-Chat-Request-Id': id }, body: {
    model: 'gpt-6.2-sol', reasoning: { effort: 'low' }, stream: true, input,
  },
});
async function waitForResult(read, match) {
  for (let index = 0; index < 45; index++) {
    const result = await read();
    if (match(result)) return result;
    await pause(150);
  }
  throw Error('Fixture condition did not converge');
}
const json = response => JSON.parse(response.body);

try {
  const metrics = await waitForResult(() => call(fixtureMetrics).catch(() => null), value => value?.status === 200);
  const active = JSON.parse(await readFile(resolve(workspace, 'native-client/active.json'), 'utf8'));
  assert.equal(json(metrics).release, active.release);
  assert.equal((await call(inference + '/' + first)).status, 401);
  const account = json(await call('/auth/login', { method: 'POST', body: { username: 'qa-codex', password: 'locally-generated-fixture' } }));
  assert.equal(account.user.planType, 'plus');
  assert.match(account.token, /^[0-9a-f]{64}$/);
  token = account.token;
  assert.equal((await call('/auth/session')).status, 200);
  assert.equal((await call('/chatgpt/native-client/site-account.mjs')).status, 200);
  const initial = await submit(first, [inputText('user', firstPrompt)]);
  assert.equal(initial.status, 200);
  assert.equal(initial.disconnected, false);
  assert(initial.body.includes(firstReply));
  assert.equal(json(await call(inference + '/' + first)).status, 'completed');

  const interrupted = await submit(second, [
    inputText('user', firstPrompt), inputText('assistant', firstReply), inputText('user', secondPrompt),
  ]);
  assert.equal(interrupted.status, 200);
  assert.equal(interrupted.disconnected, true);
  assert(!interrupted.body.includes(secondReply));
  assert.equal((await call(inference + '/' + second)).status, 503);
  const recovered = json(await waitForResult(() => call(inference + '/' + second),
    response => response.status === 200 && json(response).status === 'completed'));
  assert(recovered.chunks.some(chunk => chunk.data.includes(secondReply)));

  const { nativeDocument, mutation } = await import(pathToFileURL(resolve(workspace, 'chatgpt-services/tests/chat-sync-fixture.mjs')));
  const thread = nativeDocument(conversation);
  thread.executionSurface = 'codex';
  thread.model = 'gpt-6.2-sol';
  thread.name = firstPrompt;
  thread.adapterMetadata.conversationOrigin = 'codex';
  thread.turns = [firstReply, secondReply].map((text, index) => ({
    ...thread.turns[0], id: randomUUID(), executionSurface: 'codex', model: 'gpt-6.2-sol',
    input: [{ type: 'text', text: index ? secondPrompt : firstPrompt }],
    items: [{ type: 'agentMessage', id: randomUUID(), text }],
  }));
  assert.equal((await call('/sync/conversations/' + conversation,
    { method: 'PUT', body: mutation(thread) })).status, 200);
  const deepLink = '/chatgpt/local/' + conversation;
  assert.equal((await call('/chatgpt/', { headers: { Accept: 'text/html' } })).status, 200);
  assert.equal((await call(deepLink, { headers: { Accept: 'text/html' } })).status, 200);
  assert.equal((await call(deepLink, { headers: { Accept: 'text/html' } })).status, 200);
  const result = json(await call(fixtureMetrics));
  assert.deepEqual(result.documentLocations, ['/chatgpt/', deepLink, deepLink]);
  assert.deepEqual(result.inferenceRequestIds, [first, second]);
  assert.equal(result.inferencePosts, 2);
  assert.equal(result.inferenceCalls, 2);
  assert.equal(result.disconnectedStreams, 1);
  assert.equal(result.unavailableReceiptReads, 1);
  assert(result.recoveredReceiptReads >= 1);
  assert.equal(result.requests[1].includesPriorReply, true);
  assert.deepEqual(result.savedCodexThreads.map(({ id, replyItems, followupItems }) => [id, replyItems, followupItems]),
    [[conversation, 1, 1]]);
  assert(result.inferenceReceipts.every(row => row.status === 'completed' && row.httpStatus === 200));
  console.log(JSON.stringify({ release: result.release, modelPosts: result.inferencePosts, providerCalls: result.inferenceCalls,
    disconnected: result.disconnectedStreams, receiptOutage: result.unavailableReceiptReads, restoredReceipt: true,
    savedCodexTurns: result.storedTurns.codexCompleted, durableRouteLoads: 2, loopbackFixtureOnly: true }));
} catch (failure) {
  console.error(logs);
  throw failure;
} finally {
  child.kill();
  await childClosed;
}
