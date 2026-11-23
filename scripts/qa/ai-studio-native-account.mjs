import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { chromium } from 'playwright-core';

const pages = 'https://tycofficial.github.io';
const home = pages + '/chatgpt/';
const studio = 'https://chatgptapi.ai.studio';
const account = 'qastudio' + randomBytes(7).toString('hex');
const passphrase = randomBytes(24).toString('base64url');
const neutral = 'Native site connection check. Please answer with one short sentence.';
const workspace = resolve('.');
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.wasm': 'application/wasm',
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (!['GET', 'HEAD'].includes(request.method) || !url.pathname.startsWith('/chatgpt/')) return response.writeHead(404).end();
    const relative = decodeURIComponent(url.pathname.slice('/chatgpt/'.length));
    if (relative.split('/').some(piece => piece.startsWith('.'))) return response.writeHead(404).end();
    let file = resolve(workspace, relative.endsWith('/') ? relative + 'index.html' : relative || 'index.html');
    if (!file.startsWith(workspace + sep)) return response.writeHead(404).end();
    let bytes = await readFile(file).catch(error => error.code === 'ENOENT' || error.code === 'EISDIR' ? null : Promise.reject(error));
    if (!bytes && !extname(relative)) {
      file = resolve(workspace, 'index.html');
      bytes = await readFile(file);
    }
    if (!bytes) return response.writeHead(404).end();
    response.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : bytes);
  } catch {
    if (!response.headersSent) response.writeHead(500);
    response.end();
  }
});

let phase = 'launch', browser, modelPosts = 0;
const mark = (step, fields) => console.log('Studio native QA ' + JSON.stringify({ step, ...fields }));
const nextResponse = (page, path, method) => page.waitForResponse(
  response => response.url() === studio + path && response.request().method() === method, { timeout: 30000 },
);

async function readStudio(response, step, expectedStatus) {
  const cors = response.headers()['access-control-allow-origin'] === pages;
  const requestOrigin = (await response.request().allHeaders()).origin === pages;
  mark(step, { status: response.status(), cors, requestOrigin });
  assert.equal(response.status(), expectedStatus);
  assert.ok(cors && requestOrigin, 'The live response did not accept requests from the Pages origin');
  return response.json();
}

async function openSite(loopback) {
  const context = await browser.newContext({ locale: 'zh-CN', serviceWorkers: 'block' });
  // Fulfil only the site document/assets. The browser itself calls the actual Studio origin.
  await context.route(url => url.origin === pages, async route => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/chatgpt/') || !['GET', 'HEAD'].includes(route.request().method())) return route.abort();
    const response = await route.fetch({ url: loopback + url.pathname + url.search, maxRedirects: 0, timeout: 30000 });
    return route.fulfill({ response });
  });
  const page = await context.newPage();
  page.on('request', request => {
    if (request.url() === studio + '/inference/v1/responses' && request.method() === 'POST') modelPosts++;
  });
  return { context, page };
}

async function submitAccount(page, kind) {
  await page.goto(home + 'auth/' + kind + '/', { waitUntil: 'domcontentloaded', timeout: 35000 });
  await page.locator('#site-username').fill(account, { timeout: 15000 });
  await page.locator('#site-password').fill(passphrase, { timeout: 15000 });
  const request = nextResponse(page, kind === 'signup' ? '/auth/register' : '/auth/login', 'POST');
  await page.getByRole('button', { name: '继续', exact: true }).click({ timeout: 12000 });
  const result = await readStudio(await request, kind === 'signup' ? 'register' : 'login', 200);
  assert.equal(result.user?.role, 'user');
  assert.equal(result.user?.planType, 'free');
  assert.ok(typeof result.user.id === 'string' && result.user.id.startsWith('site-user:'));
  await page.waitForURL(home, { timeout: 35000 });
  return result.user.id;
}

try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const loopback = 'http://127.0.0.1:' + server.address().port;
  const active = await fetch(loopback + '/chatgpt/native-client/active.json').then(response => response.json());
  browser = await chromium.launch({ channel: 'msedge' });
  phase = 'register';
  const signup = await openSite(loopback);
  const accountId = await submitAccount(signup.page, 'signup');
  await signup.context.close();

  phase = 'login';
  const login = await openSite(loopback);
  const { page } = login;
  const session = nextResponse(page, '/auth/session', 'GET');
  assert.ok(await submitAccount(page, 'login') === accountId, 'The new browser context did not restore the same registered identity');
  const confirmed = await readStudio(await session, 'session', 200);
  assert.ok(confirmed.user?.id === accountId && confirmed.user?.planType === 'free');
  const editor = page.locator('#prompt-textarea[contenteditable="true"], .ProseMirror[contenteditable="true"]').filter({ visible: true }).first();
  await editor.waitFor({ state: 'visible', timeout: 45000 });
  const release = await page.evaluate(() => globalThis.__CHATGPT_REPLICA_ENV__?.release);
  assert.equal(release, active.release);
  mark('composer', { release, registeredFree: true });

  phase = 'inference';
  await editor.fill(neutral);
  const sent = nextResponse(page, '/inference/v1/responses', 'POST');
  const send = page.locator('#composer-submit-button, button[data-testid="send-button"], button[aria-label="发送"], button[aria-label="发送消息"]').filter({ visible: true }).first();
  if (await send.isVisible() && await send.isEnabled()) await send.click();
  else await editor.press('Enter');
  const failure = await readStudio(await sent, 'inference', 503);
  assert.equal(failure.error?.code, 'DOCODE_NOT_CONFIGURED');
  mark('provider-unavailable', { code: 'DOCODE_NOT_CONFIGURED' });

  phase = 'failure-wording';
  const message = failure.error?.message;
  assert.ok(typeof message === 'string' && message.length > 1 && message.length < 240);
  await page.getByText(message, { exact: false }).filter({ visible: true }).first().waitFor({ state: 'visible', timeout: 20000 });
  await page.getByText(neutral, { exact: true }).filter({ visible: true }).first().waitFor({ state: 'visible', timeout: 10000 });
  assert.equal(modelPosts, 1);
  mark('ui-result', { release, serverMessageVisible: true, promptRetained: true, modelPosts });
  await login.context.close();
} catch (error) {
  // Automation errors can include locator input, so report only the attempted phase and error class.
  mark('failure', { phase, error: error?.name ?? 'unknown', modelPosts });
  process.exitCode = 1;
} finally {
  await browser?.close();
  server.close();
}
