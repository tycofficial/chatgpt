import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { cpus } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import { chromium } from 'playwright-core';

const root = process.cwd(), base = '/chatgpt/';
const wanted = process.env.QA_EXPECTED_RELEASE || 'c2f360a24cbbe65c';
const active = JSON.parse(await readFile(join(root, 'native-client', 'active.json'), 'utf8'));
assert.equal(active.release, wanted);
assert.equal(active.sourceBuild, '0237c4dd9e54c7e3a619581b909d792de582fee9');
const extTypes = new Map(Object.entries({
  '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json',
  '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.wasm': 'application/wasm',
}));
const marker = name => 'performance.mark("tyc:' + name + '");\n';
function traceSource(relative, source) {
  function before(needle, name) {
    const position = source.indexOf(needle);
    if (position < 0) throw Error('Trace anchor absent: ' + name);
    source = source.slice(0, position) + marker(name) + source.slice(position);
  }
  if (relative === 'native-client/bootstrap.mjs') {
    before('try {', 'bootstrap');
    before('const [siteAccount, signOut,', 'site-account-import');
    before('signOut.installSiteSignOutRestore', 'site-account-imported');
    before('const [styleLoaded] = await Promise.all', 'wait-account-and-css');
    before('if (!styleLoaded) throw', 'after-account-and-css');
    before("await import('./boot-adapter", 'load-host-adapter');
    before('startup?.markResourcesReady', 'host-adapter-ready');
  }
  if (relative === 'native-client/boot-adapter.mjs') {
    before('const boundary = installNetworkBoundary', 'host-adapter-evaluation');
    before('const { __webpack_require__', 'native-runtime');
    before('const entryLibrary = await import', 'native-registration');
    before('registerNativeFileReferenceSources({', 'native-registered');
    before('await import(plan.manifest)', 'native-manifest');
    before('const routeModules = Object.fromEntries', 'native-routes');
    before('window.__reactRouterRouteModules = routeModules', 'native-routes-ready');
    before('await entryLibrary.startOriginalClient()', 'native-mount');
  }
  return source;
}

let trace = false, delayCss = 0;
const issues = [];
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (!url.pathname.startsWith(base) || request.method !== 'GET') return response.writeHead(404).end();
    const relative = decodeURIComponent(url.pathname.slice(base.length)) || 'native-client-shell.html';
    const target = resolve(root, relative);
    if (!target.startsWith(root + sep) || relative.split('/').some(segment => segment.startsWith('.'))) return response.writeHead(404).end();
    let bytes;
    try { bytes = await readFile(target); }
    catch { return response.writeHead(404).end(); }
    if (trace && /^native-client\/(?:bootstrap|boot-adapter)\.mjs$/.test(relative)) bytes = traceSource(relative, bytes.toString('utf8'));
    if (delayCss && /\.css$/.test(relative)) await wait(delayCss);
    response.writeHead(200, { 'Content-Type': extTypes.get(extname(target)) || 'application/octet-stream',
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(bytes);
  } catch (cause) {
    issues.push(cause.message);
    if (!response.headersSent) response.writeHead(500);
    response.end();
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
const selector = '#prompt-textarea[contenteditable="true"], .ProseMirror[contenteditable="true"]';

async function sample(kind) {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext({ locale: 'zh-CN', viewport: { width: 1280, height: 900 } });
    await context.route(url => url.origin !== origin && /^https?:/.test(url.protocol), route => route.abort());
    await context.addInitScript(() => {
      sessionStorage.setItem('chatgpt-site-local-guest:v1', '1');
      sessionStorage.setItem('original-client-prototype-local-session', '1');
      performance.setResourceTimingBufferSize(3500);
      window.qaLongTasks = [];
      new PerformanceObserver(list => { for (const entry of list.getEntries()) window.qaLongTasks.push([entry.startTime, entry.duration]); })
        .observe({ type: 'longtask', buffered: true });
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Performance.enable');
    const start = new Map((await cdp.send('Performance.getMetrics')).metrics.map(row => [row.name, row.value]));
    const initial = await page.goto(origin + base, { waitUntil: 'commit', timeout: 45000 });
    assert.equal(initial.status(), 200);
    await page.waitForFunction(selector => {
      const ready = Array.from(document.querySelectorAll(selector)).find(node =>
        node.getClientRects().length && !node.closest('[inert]') && !node.closest('[aria-disabled="true"]'));
      if (!ready) return false;
      performance.mark('tyc:composer-available');
      return true;
    }, selector, { timeout: 45000 });
    assert.equal(page.url(), origin + base);
    const composer = page.locator(selector).filter({ visible: true }).first();
    await composer.fill('Neutral startup QA');
    assert.equal((await composer.textContent()).trim(), 'Neutral startup QA');
    const stats = await page.evaluate(() => {
      if (window.__CHATGPT_STARTUP_ERROR__) throw Error('Native startup error');
      const rounded = Math.round;
      const ready = performance.getEntriesByName('tyc:composer-available').at(-1).startTime;
      const entries = performance.getEntriesByType('resource').filter(row => row.responseEnd <= ready && row.decodedBodySize > 0);
      const keys = row => {
        const url = new URL(row.name);
        return [url.pathname.split('/').at(-1), rounded(row.fetchStart), rounded(row.responseEnd), row.decodedBodySize, row.initiatorType];
      };
      const nav = performance.getEntriesByType('navigation')[0];
      return {
        release: window.__CHATGPT_REPLICA_ENV__?.release,
        route: location.pathname, composerMs: rounded(ready), typedMs: rounded(performance.now()),
        firstPaintMs: rounded(performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0),
        documentMs: rounded(nav.responseEnd), domMs: rounded(nav.domContentLoadedEventEnd),
        scripts: entries.filter(row => /\.m?js$/.test(new URL(row.name).pathname)).length,
        bytesBeforeComposer: entries.reduce((n, row) => n + row.decodedBodySize, 0),
        maxLongTaskMs: rounded(Math.max(0, ...window.qaLongTasks.filter(row => row[0] <= ready).map(row => row[1]))),
        phases: Object.fromEntries(performance.getEntriesByType('mark').filter(x => x.name.startsWith('tyc:')).map(x => [x.name.slice(4), rounded(x.startTime)])),
        biggest: [...entries].sort((a, b) => b.decodedBodySize - a.decodedBodySize).slice(0, 5).map(keys),
        latest: [...entries].sort((a, b) => b.responseEnd - a.responseEnd).slice(0, 8).map(keys),
      };
    });
    assert.equal(stats.release, wanted);
    const cpu = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics
      .filter(row => ['TaskDuration', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration'].includes(row.name))
      .map(row => [row.name, Math.round((row.value - (start.get(row.name) || 0)) * 1000)]));
    console.log('Native cold composer ' + JSON.stringify({
      kind, trace, delayCss, browser: browser.version(), cpu, ...stats,
    }));
    return stats.composerMs;
  } finally {
    await browser.close();
  }
}

try {
  console.log('Native composer environment ' + JSON.stringify({ cpu: cpus()[0].model, logical: cpus().length, active, route: base }));
  const cold = [];
  for (let i = 0; i < 3; i++) cold.push(await sample('cold'));
  trace = true;
  await sample('trace');
  delayCss = 900;
  await sample('trace-delayed-stylesheet');
  assert.deepEqual(issues, []);
  console.log('Native cold composer summary ' + JSON.stringify({ exactRelease: wanted, rawMs: cold, medianMs: cold.sort((a,b) => a - b)[1] }));
} finally {
  await new Promise(resolve => server.close(resolve));
}
