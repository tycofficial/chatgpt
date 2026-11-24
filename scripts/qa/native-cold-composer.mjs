import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readdir, readFile } from 'node:fs/promises';
import { cpus } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import { chromium } from 'playwright-core';

const root = process.cwd(), base = '/chatgpt/';
const baseline = resolve(process.env.QA_BASELINE_ROOT);
const baselineFiles = new Set(['native-client-shell.html', 'native-client-worker.js',
  ...await readdir(join(baseline, 'native-client')).then(files => files.map(file => 'native-client/' + file))]);
const readRelease = basePath => readFile(join(basePath, 'native-client', 'active.json'), 'utf8').then(JSON.parse);
const releases = { before: await readRelease(baseline), after: await readRelease(root) };
assert.equal(releases.before.release, 'c2f360a24cbbe65c');
assert.notEqual(releases.after.release, releases.before.release);
for (const version of Object.values(releases)) assert.equal(version.sourceBuild, '0237c4dd9e54c7e3a619581b909d792de582fee9');
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

let trace = false, delayCss = 0, hashedCache = false, variant = 'before';
const hits = new Map();
const issues = [];
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (!url.pathname.startsWith(base) || request.method !== 'GET') return response.writeHead(404).end();
    const relative = decodeURIComponent(url.pathname.slice(base.length)) || 'native-client-shell.html';
    const target = resolve(root, relative);
    if (!target.startsWith(root + sep) || relative.split('/').some(segment => segment.startsWith('.'))) return response.writeHead(404).end();
    if (/\/cdn\/assets\/(?:zh-CN\.[a-f0-9]+\.json|8c892297a50f\.css)$/.test(relative)) {
      const key = relative.split('/').at(-1);
      if (!hits.has(key)) hits.set(key, []);
      hits.get(key).push([request.headers['sec-fetch-dest'] ?? null, request.headers['sec-fetch-mode'] ?? null, request.headers['sec-purpose'] ?? null]);
    }
    let bytes;
    try {
      const file = variant === 'before' && baselineFiles.has(relative) ? join(baseline, relative) : target;
      bytes = await readFile(file);
    }
    catch { return response.writeHead(404).end(); }
    if (trace && /^native-client\/(?:bootstrap|boot-adapter)\.mjs$/.test(relative)) bytes = traceSource(relative, bytes.toString('utf8'));
    if (delayCss && /\.css$/.test(relative)) await wait(delayCss);
    response.writeHead(200, { 'Content-Type': extTypes.get(extname(target)) || 'application/octet-stream',
      'Cache-Control': hashedCache && relative.includes('/cdn/assets/') ? 'public, max-age=600' : 'no-store', 'X-Content-Type-Options': 'nosniff' });
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
  hits.clear();
  const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
  try {
    const context = await browser.newContext({ locale: 'zh-CN', viewport: { width: 1280, height: 900 } });
    await context.addInitScript(() => {
      sessionStorage.setItem('chatgpt-site-local-guest:v1', '1');
      sessionStorage.setItem('original-client-prototype-local-session', '1');
      performance.setResourceTimingBufferSize(3500);
      window.qaLongTasks = [];
      window.qaStartupLinks = [];
      const capture = (link, state) => {
        if (link.tagName !== 'LINK' || !/zh-CN\.|8c892297a50f/.test(link.href)) return;
        window.qaStartupLinks.push([Math.round(performance.now()), state, link.rel, new URL(link.href).pathname.split('/').at(-1),
          link.id || null, link.getAttribute('as'), link.getAttribute('crossorigin'), link.getAttribute('media'), link.getAttribute('data-precedence')]);
      };
      new MutationObserver(rows => {
        for (const row of rows) for (const [state, nodes] of [['add', row.addedNodes], ['remove', row.removedNodes]]) {
          for (const node of nodes) {
            capture(node, state);
            for (const link of node.querySelectorAll?.('link') ?? []) capture(link, state);
          }
        }
      }).observe(document, { childList: true, subtree: true });
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
        return [url.pathname.split('/').at(-1), rounded(row.fetchStart), rounded(row.responseEnd), row.decodedBodySize, row.initiatorType, row.transferSize, row.encodedBodySize];
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
        baseStyleSheets: [...document.querySelectorAll('link[rel=stylesheet]')].filter(link =>
          /8c892297a50f\.css$/.test(link.href) && link.media !== 'print' && !link.disabled && link.sheet).length,
        styleReceipt: (() => {
          const editor = document.querySelector('#prompt-textarea[contenteditable=true], .ProseMirror[contenteditable=true]');
          const computed = getComputedStyle(editor), shell = getComputedStyle(document.body);
          return [computed.color, computed.fontSize, computed.lineHeight, computed.fontFamily, shell.backgroundColor];
        })(),
        links: window.qaStartupLinks,
        duplicateTimings: entries.filter(row => /zh-CN\.|8c892297a50f/.test(row.name)).map(keys),
        biggest: [...entries].sort((a, b) => b.decodedBodySize - a.decodedBodySize).slice(0, 5).map(keys),
        latest: [...entries].sort((a, b) => b.responseEnd - a.responseEnd).slice(0, 8).map(keys),
      };
    });
    assert.equal(stats.release, releases[variant].release);
    const cpu = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics
      .filter(row => ['TaskDuration', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration'].includes(row.name))
      .map(row => [row.name, Math.round((row.value - (start.get(row.name) || 0)) * 1000)]));
    console.log('Native cold composer ' + JSON.stringify({
      kind, variant, hashedCache, serverHits: Object.fromEntries(hits), browser: browser.version(), cpu, ...stats,
    }));
    return { composerMs: stats.composerMs, typedMs: stats.typedMs, cssRequests: hits.get('8c892297a50f.css')?.length ?? 0, activeCss: stats.baseStyleSheets, styleReceipt: stats.styleReceipt, cpu };
  } finally {
    await browser.close();
  }
}

try {
  console.log('Native composer environment ' + JSON.stringify({ cpu: cpus()[0].model, logical: cpus().length, releases, route: base }));
  const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
  for (const cache of [false, true]) {
    hashedCache = cache;
    const groups = { before: [], after: [] };
    for (const version of (cache ? ['after', 'before', 'before', 'after', 'after', 'before'] : ['before', 'after', 'after', 'before', 'before', 'after'])) {
      variant = version;
      groups[version].push(await sample(cache ? 'pages-like-cache' : 'preview-no-store'));
    }
    assert.ok(groups.before.every(row => row.activeCss === 2));
    assert.ok(groups.after.every(row => row.activeCss === 1));
    assert.ok(groups.before.every(row => row.cssRequests === (cache ? 1 : 2)));
    assert.ok(groups.after.every(row => row.cssRequests === 1));
    for (const row of Object.values(groups).flat()) assert.deepEqual(row.styleReceipt, groups.before[0].styleReceipt);
    console.log('Native composer A/B ' + JSON.stringify({
      cache, results: Object.fromEntries(Object.entries(groups).map(([version, rows]) => [version, {
        composerMs: rows.map(row => row.composerMs), composerMedian: median(rows.map(row => row.composerMs)),
        typedMedian: median(rows.map(row => row.typedMs)), tasksMedian: median(rows.map(row => row.cpu.TaskDuration)),
        cssNetworkRequests: rows.map(row => row.cssRequests), activeCss: rows.map(row => row.activeCss),
      }])),
    }));
  }
  assert.deepEqual(issues, []);
} finally {
  await new Promise(resolve => server.close(resolve));
}
