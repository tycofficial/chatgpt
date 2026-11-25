import { randomBytes, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:https';
import { extname, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';

const workspace = resolve(process.argv[2] || '.');
const host = '127.0.0.1';
const port = Number(process.env.TYC_IPAD_PORT || '4400');
if (!Number.isSafeInteger(port) || port < 1024 || port > 65535) throw Error('Choose a non-privileged loopback port');
const base = '/chatgpt/';
const fixtureBase = '/__ipad_qa/';
const origin = 'https://' + host + ':' + port;
const productionAccountHost = 'https://chatgpt-admin-bridge-tyc.hushedtarragon1.chatgpt.site';
const token = randomBytes(32).toString('hex');
const accountId = randomUUID();
const expiresAt = Date.now() + 4 * 60 * 60 * 1000;
const planType = process.env.TYC_QA_PLAN || 'plus';
const user = { id: 'site-user:' + accountId, accountId, username: 'qa-codex', name: 'iPad Fixture', role: 'user',
  planType, membershipSource: 'site-registration', createdAt: Date.now(), officialSubscriptionVerified: false,
  siteTrial: planType === 'free' ? null : { tier: planType, expiresAt } };
const active = JSON.parse(await readFile(resolve(workspace, 'native-client/active.json'), 'utf8'));
const release = active.release;
if (!active.active || active.sourceBuild !== 'b6348792a294e8e04a67660959ba41914937938f') throw Error('Expected the pinned b634 graph');
if (!/^[a-f0-9]{16}$/.test(release || '')) throw Error('Could not find a built Pages release');
const prompt = 'Verify the saved Codex conversation with a short acknowledgment.';
const reply = 'iPad Codex recovery fixture response.';
const followPrompt = 'Give a second short acknowledgment in this same saved Codex conversation.';
const followReply = 'iPad Codex saved conversation follow-up response.';
const inferencePath = '/inference/v1/responses';
const workerSource = path => pathToFileURL(resolve(workspace, 'chatgpt-services', path)).href;
const { createSqliteD1 } = await import(workerSource('tests/chat-sync-fixture.mjs'));
const { handleChatSync } = await import(workerSource('worker/chat-sync.mjs'));
const { readJournaledInference, startJournaledInference } = await import(workerSource('worker/inference-recovery.mjs'));
const runtime = { DB: createSqliteD1(), DOCODE_API_KEY: 'runner-local-fixture-token' };
const actor = { role: 'user', id: accountId };
const codexContext = { waitUntil(task) { void task.catch(error => console.error('Fixture journal:', error.message)); } };
const metrics = {
  seedLoads: 0, accountRequests: 0, sessionChecks: 0, documentLoads: 0, inferencePosts: 0, inferenceCalls: 0,
  documentLocations: [], inferenceRequestIds: [], requests: [], disconnectedStreams: 0, unavailableReceiptReads: 0, recoveredReceiptReads: 0,
  syncStatus: {}, recentSync: [],
};
const fixtureStartedAt = Date.now();
let followupRequestId;


globalThis.fetch = async (url, init) => {
  if (String(url) !== 'https://docode.cc/v1/responses') throw Error('Fixture outbound request was rejected');
  const payload = JSON.parse(init.body);
  const input = JSON.stringify(payload.input);
  const latestUser = Array.isArray(payload.input) ? payload.input.findLast(item => item.role === 'user') : payload.input;
  const submittedText = JSON.stringify(latestUser ?? '');
  const followup = submittedText.includes(followPrompt);
  const ordinal = ++metrics.inferenceCalls;
  const observation = {
    model: payload.model, effort: payload.reasoning?.effort ?? null,
    expectedPrompt: submittedText.includes(followup ? followPrompt : prompt), stream: payload.stream === true,
    followup, includesPriorReply: input.includes(reply), outputMode: followup ? 'delayed' : 'immediate',
    providerCompletionQueued: false, providerCompletionMs: null,
  };
  const providerStartedAt = Date.now();
  const markCompletion = () => {
    observation.providerCompletionQueued = true;
    observation.providerCompletionMs = Date.now() - providerStartedAt;
  };
  metrics.requests.push(observation);
  if (!observation.expectedPrompt || (followup && !observation.includesPriorReply)) {
    return Response.json({ error: { code: 'FIXTURE_UNEXPECTED_CONTEXT' } }, { status: 400 });
  }
  const answer = followup ? followReply : reply;
  const part = { type: 'output_text', text: answer, annotations: [] };
  const item = { id: 'msg_ipad_codex_fixture_' + ordinal, type: 'message', role: 'assistant' };
  const message = { ...item, status: 'completed', content: [part] };
  const response = { id: 'resp_ipad_codex_fixture_' + ordinal, object: 'response', model: payload.model, status: 'completed',
    created_at: Math.trunc(Date.now() / 1000), output: [message],
    usage: { input_tokens: 14, output_tokens: 8, total_tokens: 22 } };
  const coordinates = { item_id: item.id, output_index: 0, content_index: 0 };
  const events = [
    { type: 'response.created', response: { ...response, status: 'in_progress', output: [] } },
    { type: 'response.output_item.added', output_index: 0, item: { ...item, status: 'in_progress', content: [] } },
    { type: 'response.content_part.added', ...coordinates, part: { ...part, text: '' } },
    { type: 'response.output_text.delta', ...coordinates, delta: answer },
    { type: 'response.output_text.done', ...coordinates, text: answer },
    { type: 'response.content_part.done', ...coordinates, part },
    { type: 'response.output_item.done', output_index: 0, item: message },
    { type: 'response.completed', response },
  ];
  const frames = events.map(event => 'data: ' + JSON.stringify(event) + '\n\n');
  let completionTimer;
  const output = followup ? new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(frames[0]));
      completionTimer = setTimeout(() => {
        controller.enqueue(encoder.encode(frames.slice(1).join('')));
        markCompletion();
        controller.close();
      }, 3000);
    },
    cancel() { clearTimeout(completionTimer); },
  }) : frames.join('');
  if (!followup) markCompletion();
  return new Response(output, {
    headers: { 'Content-Type': 'text/event-stream', 'X-Request-Id': 'ipad-codex-fixture-' + ordinal },
  });
};

const headers = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; connect-src 'self' blob: data:; img-src 'self' data: blob:; media-src 'self' data: blob:; font-src 'self' data:; frame-src 'self' data: blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'",
};
const contentTypes = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8', json: 'application/json; charset=utf-8', svg: 'image/svg+xml', woff: 'font/woff',
  woff2: 'font/woff2', ttf: 'font/ttf', wasm: 'application/wasm', webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg',
  gif: 'image/gif', ico: 'image/x-icon', webm: 'video/webm', avif: 'image/avif', mp4: 'video/mp4', wav: 'audio/wav' };
function send(res, status, mime, body) {
  res.writeHead(status, { ...headers, 'Content-Type': mime }).end(body);
}
function json(res, status, body) {
  send(res, status, contentTypes.json, JSON.stringify(body));
}
function storedConversations() {
  return runtime.DB.raw.prepare(
    'SELECT conversation_id, document_json FROM chat_sync_conversations WHERE owner_key = ? AND deleted = 0'
  ).all('user:' + accountId).map(row => ({ id: row.conversation_id, document: JSON.parse(row.document_json) }));
}

function savedCodexThreads(rows) {
  return rows.flatMap(({ id, document }) => {
    const turn = document.turns.find(turn => turn.executionSurface === 'codex' && turn.status === 'completed' &&
      turn.items.some(item => item.type === 'agentMessage' && item.text?.trim() === reply));
    if (!turn) return [];
    const userMessage = turn.items.find(item => item.type === "userMessage");
    const firstUserText = userMessage?.content.filter(part => part.type === "text").map(part => part.text).join("\n").trim() ?? "";
    const replyItems = text => document.turns.filter(saved => saved.executionSurface === 'codex' && saved.status === 'completed')
      .flatMap(saved => saved.items).filter(item => item.type === 'agentMessage' && item.text?.trim() === text).length;
    return [{ id, title: document.name, firstUserText, model: turn.model, effort: turn.reasoningEffort,
      replyItems: replyItems(reply), followupItems: replyItems(followReply) }];
  });
}

function storedTurnMetrics(rows) {
  const totals = {
    conversationCount: rows.length, codexPartial: 0, codexCompleted: 0, codexFailedOrCancelled: 0, otherTurns: 0,
    exactFirstReplyItems: 0, exactFollowupReplyItems: 0,
  };
  for (const { document } of rows) {
    for (const turn of document.turns) {
      if (turn.executionSurface !== 'codex') totals.otherTurns++;
      else if (turn.status === 'completed') totals.codexCompleted++;
      else if (['failed', 'cancelled'].includes(turn.status)) totals.codexFailedOrCancelled++;
      else totals.codexPartial++;
      for (const item of turn.items) {
        if (item.type !== 'agentMessage') continue;
        if (item.text?.trim() === reply) totals.exactFirstReplyItems++;
        if (item.text?.trim() === followReply) totals.exactFollowupReplyItems++;
      }
    }
  }
  return totals;
}

function receiptMetrics() {
  return runtime.DB.raw.prepare(
    'SELECT id, status, http_status, started_at, finished_at FROM inference_receipts WHERE owner_id = ? ORDER BY started_at'
  ).all('user:' + accountId).map(row => ({
    id: row.id, status: row.status, httpStatus: row.http_status,
    durationMs: row.finished_at == null ? null : row.finished_at - row.started_at,
  }));
}

async function recordSync(path, method, response) {
  const category = path === '/sync/changes' ? 'changes' :
    path === '/sync/conversations' ? 'conversations' :
    path === '/sync/batch' ? 'batch' : 'conversation';
  const key = method + ' ' + category;
  const counts = metrics.syncStatus[key] ??= {};
  counts[response.status] = (counts[response.status] ?? 0) + 1;
  const event = { category, method, status: response.status, atMs: Date.now() - fixtureStartedAt };
  if (!response.ok || category === 'batch') {
    const body = await response.clone().json().catch(() => null);
    if (Array.isArray(body?.results)) event.batchStatuses = body.results.map(result => result.status);
    if (/^[A-Z][A-Z0-9_]{0,62}$/.test(body?.error?.code ?? '')) event.errorCode = body.error.code;
  }
  if (metrics.recentSync.length >= 40) metrics.recentSync.shift();
  metrics.recentSync.push(event);
}

function sendCodexerResponse(res, response) {
  res.writeHead(response.status, { ...headers, ...Object.fromEntries(response.headers) });
  if (response.body) Readable.fromWeb(response.body).pipe(res);
  else res.end();
}

async function interruptFollowupStream(res, response) {
  res.writeHead(response.status, { ...headers, ...Object.fromEntries(response.headers) });
  const reader = response.body.getReader();
  try {
    const first = await reader.read();
    if (first.done) throw Error('The journal did not stream the follow-up start');
    res.write(first.value);
    await new Promise(resolve => setTimeout(resolve, 300));
    metrics.disconnectedStreams++;
    res.destroy();
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

async function respondAccount(req, res, url) {
  const route = url.pathname;
  if (route === '/auth/login' && req.method === 'POST') {
    metrics.accountRequests++;
    return json(res, 200, { user, expiresAt, token });
  }
  if (req.headers.authorization !== 'Bearer ' + token) {
    const failure = Response.json({ error: { code: 'SITE_AUTH_REQUIRED' } }, { status: 401 });
    if (route.startsWith('/sync/')) await recordSync(route, req.method, failure);
    return sendCodexerResponse(res, failure);
  }
  if (route === '/auth/session' && req.method === 'GET') {
    metrics.sessionChecks++;
    return json(res, 200, { user, expiresAt });
  }
  if (route === '/inference/v1/usage' && req.method === 'GET') return json(res, 200, { requests: metrics.inferencePosts, completed: metrics.inferenceCalls });
  if (route.startsWith('/sync/') || route === inferencePath || route.startsWith(inferencePath + '/')) {
    const body = ['POST', 'PUT'].includes(req.method) ? Readable.toWeb(req) : null;
    const request = new Request(url, { method: req.method, headers: req.headers, ...(body ? { body, duplex: 'half' } : {}) });
    let response;
    if (route.startsWith('/sync/')) {
      response = await handleChatSync(request, runtime, actor);
      await recordSync(route, req.method, response);
    } else if (route === inferencePath && req.method === 'POST') {
      metrics.inferencePosts++;
      const requestId = request.headers.get('X-Chat-Request-Id');
      if (!requestId) return json(res, 400, { error: { code: 'FIXTURE_EXPECTS_JOURNALED_CODEX_REQUEST' } });
      metrics.inferenceRequestIds.push(requestId);
      response = await startJournaledInference(request, runtime, codexContext, actor, requestId, planType);
      if (response.status === 200 && response.body && metrics.requests.at(-1)?.followup && !followupRequestId) {
        followupRequestId = requestId;
        return await interruptFollowupStream(res, response);
      }
    } else if (route.startsWith(inferencePath + '/')) {
      const requestId = route.slice(inferencePath.length + 1);
      if (req.method === 'GET' && followupRequestId === requestId && metrics.disconnectedStreams > 0) {
        if (metrics.unavailableReceiptReads === 0) {
          metrics.unavailableReceiptReads++;
          return json(res, 503, { error: { code: 'FIXTURE_TEMPORARY_TRANSPORT_OUTAGE' } });
        }
        response = await readJournaledInference(request, runtime, actor, requestId);
        if (response.ok) metrics.recoveredReceiptReads++;
      } else {
        response = await readJournaledInference(request, runtime, actor, requestId);
      }
    }
    if (response) return sendCodexerResponse(res, response);
  }
  return json(res, 404, { error: { code: 'FIXTURE_UNSUPPORTED' } });
}

const tls = {
  key: await readFile(process.env.TYC_IPAD_TLS_KEY),
  cert: await readFile(process.env.TYC_IPAD_TLS_CERT),
};
createServer(tls, async (req, res) => {
  try {
    const url = new URL(req.url, origin);
    if (url.pathname === fixtureBase + 'metrics') {
      const rows = storedConversations();
      return json(res, 200, { ...metrics, release, planType, savedCodexThreads: savedCodexThreads(rows),
        storedTurns: storedTurnMetrics(rows), inferenceReceipts: receiptMetrics() });
    }
    if (/^\/(?:auth|sync|inference)\//.test(url.pathname)) return await respondAccount(req, res, url);
    if (url.pathname === fixtureBase + 'seed') {
      metrics.seedLoads++;
      return send(res, 200, contentTypes.html, `<!doctype html><html lang="en"><meta charset="utf-8"><title>Test fixture</title>
<p id="status">Preparing isolated fixture</p>
<script type="module">
import { loginSiteAccount, startSiteGuestSession } from '/chatgpt/native-client/site-account.mjs?v=${release}';
try {
  if (new URL(location.href).searchParams.get('mode') === 'guest') startSiteGuestSession();
  else {
    const account = await loginSiteAccount('qa-codex', 'locally-generated-fixture');
    if (account?.planType !== '${planType}' || !account.cloudSessionVerified) throw new Error('Fixture account did not validate');
  }
  location.replace('/chatgpt/');
} catch {
  document.querySelector('#status').textContent = 'Isolated fixture setup failed';
}
</script></html>`);
    }
    if (url.pathname === '/chatgpt' && req.method === 'GET') { res.writeHead(308, { Location: base + url.search, ...headers }).end(); return; }
    if (!url.pathname.startsWith(base) || !['GET', 'HEAD'].includes(req.method)) return json(res, 404, {});
    let relative;
    try { relative = decodeURIComponent(url.pathname.slice(base.length)); }
    catch { return json(res, 400, {}); }
    if (relative.split('/').some(part => part.startsWith('.')) || relative.startsWith('node_modules/')) return json(res, 404, {});
    const file = resolve(workspace, relative || 'index.html');
    if (!file.startsWith(workspace + sep)) return json(res, 404, {});
    const candidates = [file];
    if (!extname(relative)) {
      candidates.push(resolve(file, 'index.html'));
      if (req.headers.accept?.includes('text/html')) candidates.push(resolve(workspace, '404.html'));
    }
    for (const candidate of candidates) {
      if (!(await stat(candidate).catch(() => null))?.isFile()) continue;
      const extension = extname(candidate).slice(1);
      const mime = contentTypes[extension] || 'application/octet-stream';
      if (req.method === 'GET' && [resolve(workspace, 'index.html'), resolve(workspace, '404.html')].includes(candidate)) {
        metrics.documentLoads++;
        metrics.documentLocations.push(url.pathname + url.search);
      }
      if (req.method === 'HEAD') return send(res, 200, mime, '');
      if (relative === 'native-client/site-account.mjs') {
        const asset = await readFile(candidate, 'utf8');
        if (!asset.includes(productionAccountHost)) throw Error('Could not isolate account service');
        return send(res, 200, mime, asset.replaceAll(productionAccountHost, origin));
      }
      res.writeHead(200, { ...headers, 'Content-Type': mime });
      createReadStream(candidate).pipe(res);
      return;
    }
    return json(res, 404, {});
  } catch (error) {
    console.error('iPad fixture request failed:', error.message);
    if (!res.headersSent) json(res, 500, {});
    else res.end();
  }
}).listen(port, host, () => console.log('Isolated iPad fixture listening on ' + host + ':' + port));
