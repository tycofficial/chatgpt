import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import { chromium } from 'playwright-core';

const root = process.cwd(), api = 'https://site-billing-fixture.invalid';
const base = '/chatgpt/';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.webp': 'image/webp' };
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  if (request.method !== 'GET' || !url.pathname.startsWith(base)) return response.writeHead(404).end();
  const relative = decodeURIComponent(url.pathname.slice(base.length));
  const file = resolve(root, relative.endsWith('/') ? relative + 'index.html' : relative || 'index.html');
  if (!file.startsWith(root + sep) || relative.startsWith('.')) return response.writeHead(404).end();
  let bytes = await readFile(file).catch(() => null), type = types[extname(file)];
  if (!bytes && !extname(relative)) {
    bytes = await readFile('native-client-shell.html');
    type = 'text/html';
  }
  if (!bytes) return response.writeHead(404).end();
  response.writeHead(200, { 'Content-Type': type ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
  response.end(bytes);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const home = 'http://127.0.0.1:' + server.address().port + base;
const release = JSON.parse(await readFile('native-client/active.json', 'utf8')).release;
const accountId = '66666666-6666-4666-8666-666666666666', token = 'c'.repeat(64);
const expires = Date.now() + 4 * 86400000;
const user = paid => ({ id: 'site-user:' + accountId, accountId, username: 'Fixture billing',
  role: 'user', planType: paid ? 'plus' : 'free', membershipSource: 'site-registration',
  createdAt: Date.now() - 86400000, officialSubscriptionVerified: false, siteTrial: null,
  siteSubscription: paid ? { tier: 'plus', expiresAt: expires, cancelAtPeriodEnd: true } : null,
});
const checkout = 'https://checkout.stripe.com/c/pay/cs_test_fixture';
const portal = 'https://billing.stripe.com/p/session/test_fixture';
const calls = { options: 0, login: 0, checkout: 0, portal: 0, trial: 0, afterReturn: 0, externalCheckout: 0, externalPortal: 0 };
let merchant = false, returning = false;
let browser, page;

async function until(condition, timeout = 20_000) {
  const deadline = Date.now() + timeout;
  while (!condition() && Date.now() < deadline) await wait(100);
  assert.ok(condition(), 'Expected website request was not observed');
}
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ locale: 'zh-CN', viewport: { width: 1440, height: 1000 } });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === new URL(home).origin) return route.continue();
    if (url.href === checkout) {
      calls.externalCheckout++;
      return route.fulfill({ contentType: 'text/html', body: '<title>Checkout navigation fixture</title><p>Checkout destination reached</p>' });
    }
    if (url.href === portal) {
      calls.externalPortal++;
      return route.fulfill({ contentType: 'text/html', body: '<title>Portal navigation fixture</title><p>Portal destination reached</p>' });
    }
    if (url.origin !== api) return route.abort();
    const cors = { 'Access-Control-Allow-Origin': new URL(home).origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type' };
    const json = (body, status = 200) => route.fulfill({ status, headers: cors, json: body });
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (url.pathname === '/auth/login' && request.method() === 'POST') {
      calls.login++;
      return json({ token, expiresAt: Date.now() + 6 * 86400000, user: user(false) });
    }
    if (url.pathname === '/auth/session') {
      assert.equal(request.headers().authorization === 'Bearer ' + token, true);
      if (returning) calls.afterReturn++;
      return json({ user: user(returning && calls.afterReturn >= 2) });
    }
    if (url.pathname === '/billing/v1/options') {
      assert.equal(request.method(), 'GET');
      assert.equal(request.headers().authorization === undefined, true);
      calls.options++;
      return json({ tiers: merchant ? ['plus'] : [], checkoutAvailable: merchant });
    }
    if (url.pathname === '/billing/v1/checkout') {
      assert.equal(request.headers().authorization === 'Bearer ' + token, true);
      assert.equal(request.method(), 'POST');
      assert.deepEqual(request.postDataJSON(), { tier: 'plus' });
      calls.checkout++;
      return json({ url: checkout });
    }
    if (url.pathname === '/billing/v1/portal') {
      assert.equal(request.headers().authorization === 'Bearer ' + token, true);
      assert.equal(request.method(), 'POST');
      assert.deepEqual(request.postDataJSON(), {});
      calls.portal++;
      return json({ url: portal });
    }
    if (url.pathname === '/auth/site-trial') {
      calls.trial++;
      return json({ error: { code: 'UNEXPECTED', message: 'No trial was selected' } }, 400);
    }
    if (url.pathname === '/sync/changes') return json({ changes: [], cursor: 0 });
    return json({ error: { code: 'NOT_NEEDED', message: 'Fixture route unavailable' } }, 404);
  });
  page = await context.newPage();
  const signIn = new URL('auth/login/', home);
  signIn.searchParams.set('next', base + 'site-plans/');
  await page.goto(signIn.href, { waitUntil: 'domcontentloaded' });
  await page.locator('#site-username').fill('Fixture billing');
  await page.locator('#site-password').fill('Neutral-fixture-only-pass');
  await page.getByRole('button', { name: '继续', exact: true }).click();
  await page.waitForURL(url => url.pathname === base + 'site-plans/' || url.hash.startsWith('#pricing'), { timeout: 30_000 });
  const trial = () => page.getByRole('button', { name: '免费试用', exact: true }).first();
  await trial().waitFor({ timeout: 35_000 });
  await until(() => calls.options >= 1);
  assert.equal(await page.getByRole('button', { name: '订购本站套餐', exact: true }).count(), 0);
  const go = page.getByRole('button', { name: '查看官方 Go 套餐', exact: true }).filter({ visible: true }).first();
  if (!await go.isVisible()) {
    await page.getByRole('button', { name: /^(?:查看(?:所有|全部|更多|其他).*(?:套餐|方案|计划)|(?:查看)?全部套餐|(?:See|View|Show) (?:all|more).*plans)$/i })
      .filter({ visible: true }).first().click({ timeout: 12_000 });
  }
  await go.waitFor({ timeout: 12_000 });
  assert.equal(await page.evaluate(() => window.__CHATGPT_REPLICA_ENV__.release), release);
  console.log('Site billing QA ' + JSON.stringify({ phase: 'unconfigured', release, trial: true, go: true, paid: false }));

  merchant = true;
  await page.reload({ waitUntil: 'domcontentloaded' });
  const pay = page.getByRole('button', { name: '订购本站套餐', exact: true });
  await pay.waitFor({ timeout: 30_000 });
  assert.equal(await pay.count(), 1);
  assert.equal(await trial().isVisible(), true);
  await pay.click();
  await page.waitForURL(checkout, { timeout: 15_000 });
  await page.getByText('Checkout destination reached', { exact: true }).waitFor();
  assert.equal(calls.checkout, 1);
  assert.equal(calls.externalCheckout, 1);
  console.log('Site billing QA ' + JSON.stringify({ phase: 'native-checkout', checkoutRequests: calls.checkout, fixtureRedirect: true }));

  // The returned URL grants nothing. The fixture confirms membership only on revalidation.
  returning = true;
  await page.goto(home + '?site_billing=return#pricing', { waitUntil: 'domcontentloaded' });
  await until(() => calls.afterReturn >= 2, 30_000);
  await page.goto(new URL('settings/account', home).href, { waitUntil: 'domcontentloaded' });
  await page.getByText('本站订阅', { exact: true }).first().waitFor({ timeout: 30_000 });
  await page.getByText('权益截止', { exact: true }).first().waitFor({ timeout: 30_000 });
  const manage = page.getByRole('button', { name: '管理订阅', exact: true }).first();
  await manage.waitFor({ timeout: 20_000 });
  await manage.click();
  await page.waitForURL(portal, { timeout: 15_000 });
  await page.getByText('Portal destination reached', { exact: true }).waitFor();
  assert.equal(calls.portal, 1);
  assert.equal(calls.externalPortal, 1);
  assert.equal(calls.trial, 0);
  console.log('Site billing QA ' + JSON.stringify({ phase: 'verified-return-and-native-portal', release, ...calls }));
} catch (error) {
  const facts = page ? { path: new URL(page.url()).pathname, calls,
    startupError: await page.evaluate(() => Boolean(window.__CHATGPT_STARTUP_ERROR__)).catch(() => null),
    billingActions: await page.getByRole('button', { name: /管理订阅|免费试用|订购本站套餐|本站账单/ }).allTextContents().catch(() => []),
  } : { calls };
  console.error('Site billing QA failure ' + JSON.stringify(facts));
  throw error;
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
