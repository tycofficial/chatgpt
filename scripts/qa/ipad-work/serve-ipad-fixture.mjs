import { randomBytes, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:https';
import { extname, resolve, sep } from 'node:path';

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
const metrics = { documentLoads: 0, inferenceCalls: 0 };
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
function respondAccount(req, res, route) {
  if (route === '/auth/login' && req.method === 'POST') return json(res, 200, { user, expiresAt, token });
  if (req.headers.authorization !== 'Bearer ' + token) return json(res, 401, { error: { code: 'SITE_AUTH_REQUIRED' } });
  if (route === '/auth/session' && req.method === 'GET') return json(res, 200, { user, expiresAt });
  if (route === '/sync/conversations' && req.method === 'GET') return json(res, 200, { conversations: [], cursor: 0, nextCursor: null });
  if (route === '/sync/changes' && req.method === 'GET') return json(res, 200, { changes: [], cursor: 0, hasMore: false });
  if (route === '/inference/v1/usage' && req.method === 'GET') return json(res, 200, { requests: 0, completed: 0 });
  if (route === '/inference/v1/responses' && req.method === 'POST') {
    metrics.inferenceCalls++;
    return json(res, 409, { error: { code: 'FIXTURE_INFERENCE_DISABLED', message: 'This fixture never sends an inference request.' } });
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
    if (/^\/(?:auth|sync|inference)\//.test(url.pathname)) return respondAccount(req, res, url.pathname);
    if (url.pathname === fixtureBase + 'seed') {
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
      if (req.method === 'GET' && extension === 'html') metrics.documentLoads++;
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
