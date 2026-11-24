import { randomBytes, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:https';
import { extname, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';

const workspace = resolve(process.argv[2] || '.');
const host = '127.0.0.1';
const port = 4400;
const base = '/chatgpt/';
const fixtureBase = '/__ipad_qa/';
const origin = 'https://' + host + ':' + port;
const productionAccountHost = 'https://chatgpt-admin-bridge-tyc.hushedtarragon1.chatgpt.site';
const token = randomBytes(32).toString('hex');
const accountId = randomUUID();
const expiresAt = Date.now() + 4 * 60 * 60 * 1000;
const planType = process.env.TYC_QA_PLAN || 'plus';
const user = { id: 'site-user:' + accountId, accountId, username: 'qa-work', name: 'iPad Fixture', role: 'user',
  planType, membershipSource: 'site-registration', createdAt: Date.now(), officialSubscriptionVerified: false,
  siteTrial: planType === 'free' ? null : { tier: planType, expiresAt } };
const release = JSON.parse(await readFile(resolve(workspace, 'native-client/active.json'), 'utf8')).release;
if (!/^[a-f0-9]{16}$/.test(release || '')) throw Error('Could not find a built Pages release');
const prompt = 'Verify the saved Work conversation with a short acknowledgment.';
const reply = 'iPad Work recovery fixture response.';
const inferencePath = '/inference/v1/responses';
const workerSource = path => pathToFileURL(resolve(workspace, 'chatgpt-services', path)).href;
const { createSqliteD1 } = await import(workerSource('tests/chat-sync-fixture.mjs'));
const { handleChatSync } = await import(workerSource('worker/chat-sync.mjs'));
const { readJournaledInference, startJournaledInference } = await import(workerSource('worker/inference-recovery.mjs'));
const runtime = { DB: createSqliteD1(), DOCODE_API_KEY: 'runner-local-fixture-token' };
const actor = { role: 'user', id: accountId };
const workContext = { waitUntil(task) { void task.catch(error => console.error('Fixture journal:', error.message)); } };
const metrics = {
  seedLoads: 0, accountRequests: 0, sessionChecks: 0, documentLoads: 0, inferencePosts: 0, inferenceCalls: 0,
  documentLocations: [], clientLocation: null, inferenceRequestIds: [], request: null,
};

globalThis.fetch = async (url, init) => {
  if (String(url) !== 'https://docode.cc/v1/responses') throw Error('Fixture outbound request was rejected');
  const payload = JSON.parse(init.body);
  metrics.inferenceCalls++;
  metrics.request = {
    model: payload.model, effort: payload.reasoning?.effort ?? null,
    expectedPrompt: JSON.stringify(payload.input).includes(prompt), stream: payload.stream === true,
  };
  if (!metrics.request.expectedPrompt) {
    return Response.json({ error: { code: 'FIXTURE_UNEXPECTED_PROMPT' } }, { status: 400 });
  }
  const part = { type: 'output_text', text: reply, annotations: [] };
  const item = { id: 'msg_ipad_work_fixture', type: 'message', role: 'assistant' };
  const message = { ...item, status: 'completed', content: [part] };
  const response = { id: 'resp_ipad_work_fixture', object: 'response', model: payload.model, status: 'completed',
    created_at: Math.trunc(Date.now() / 1000), output: [message],
    usage: { input_tokens: 14, output_tokens: 8, total_tokens: 22 } };
  const coordinates = { item_id: item.id, output_index: 0, content_index: 0 };
  const events = [
    { type: 'response.created', response: { ...response, status: 'in_progress', output: [] } },
    { type: 'response.output_item.added', output_index: 0, item: { ...item, status: 'in_progress', content: [] } },
    { type: 'response.content_part.added', ...coordinates, part: { ...part, text: '' } },
    { type: 'response.output_text.delta', ...coordinates, delta: reply },
    { type: 'response.output_text.done', ...coordinates, text: reply },
    { type: 'response.content_part.done', ...coordinates, part },
    { type: 'response.output_item.done', output_index: 0, item: message },
    { type: 'response.completed', response },
  ];
  return new Response(events.map(event => 'data: ' + JSON.stringify(event) + '\n\n').join(''), {
    headers: { 'Content-Type': 'text/event-stream', 'X-Request-Id': 'ipad-work-fixture' },
  });
};

// Observe the candidate router's actual path without replacing navigation or application handlers.
const observeLocation = `<script>
let reportedFixtureLocation;
function reportFixtureLocation() {
  const current = location.pathname + location.search;
  if (current === reportedFixtureLocation) return;
  reportedFixtureLocation = current;
  void fetch('/__ipad_qa/location', { method: 'POST', body: current }).catch(() => {});
}
reportFixtureLocation();
setInterval(reportFixtureLocation, 250);
</script>`;
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
async function readLocation(req) {
  req.setEncoding('utf8');
  let path = '';
  for await (const chunk of req) {
    path += chunk;
    if (path.length > 512) return null;
  }
  return path.startsWith(base) ? path : null;
}

function sendWorkerResponse(res, response) {
  res.writeHead(response.status, { ...headers, ...Object.fromEntries(response.headers) });
  if (response.body) Readable.fromWeb(response.body).pipe(res);
  else res.end();
}

async function respondAccount(req, res, url) {
  const route = url.pathname;
  if (route === '/auth/login' && req.method === 'POST') {
    metrics.accountRequests++;
    return json(res, 200, { user, expiresAt, token });
  }
  if (req.headers.authorization !== 'Bearer ' + token) return json(res, 401, { error: { code: 'SITE_AUTH_REQUIRED' } });
  if (route === '/auth/session' && req.method === 'GET') {
    metrics.sessionChecks++;
    return json(res, 200, { user, expiresAt });
  }
  if (route === '/inference/v1/usage' && req.method === 'GET') return json(res, 200, { requests: metrics.inferencePosts, completed: metrics.inferenceCalls });
  if (route.startsWith('/sync/') || route === inferencePath || route.startsWith(inferencePath + '/')) {
    const body = ['POST', 'PUT'].includes(req.method) ? Readable.toWeb(req) : null;
    const request = new Request(url, { method: req.method, headers: req.headers, ...(body ? { body, duplex: 'half' } : {}) });
    let response;
    if (route.startsWith('/sync/')) response = await handleChatSync(request, runtime, actor);
    else if (route === inferencePath && req.method === 'POST') {
      metrics.inferencePosts++;
      const requestId = request.headers.get('X-Chat-Request-Id');
      if (!requestId) return json(res, 400, { error: { code: 'FIXTURE_EXPECTS_JOURNALED_WORK_REQUEST' } });
      metrics.inferenceRequestIds.push(requestId);
      response = await startJournaledInference(request, runtime, workContext, actor, requestId, false);
    } else if (route.startsWith(inferencePath + '/')) {
      response = await readJournaledInference(request, runtime, actor, route.slice(inferencePath.length + 1));
    }
    if (response) return sendWorkerResponse(res, response);
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
    if (url.pathname === fixtureBase + 'metrics') return json(res, 200, { ...metrics, release, planType });
    if (url.pathname === fixtureBase + 'location' && req.method === 'POST') {
      const path = await readLocation(req);
      if (path === null) return json(res, 400, {});
      metrics.clientLocation = path;
      return send(res, 204, contentTypes.json, '');
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
    const account = await loginSiteAccount('qa-work', 'locally-generated-fixture');
    if (account?.planType !== '${planType}' || !account.cloudSessionVerified) throw new Error('Fixture account did not validate');
  }
  location.replace('/chatgpt/');
} catch {
  document.querySelector('#status').textContent = 'Isolated fixture setup failed';
}
</script></html>`);
    }
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
        const html = await readFile(candidate, 'utf8');
        return send(res, 200, mime, html.replace('</body>', observeLocation + '</body>'));
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
