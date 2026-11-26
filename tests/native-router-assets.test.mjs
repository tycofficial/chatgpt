import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { localizeRouterAssets } from '../src/native-client/startup-compatibility.mjs';
import { checkPackagedSiteAccountOrigin, requestedSiteAccountOrigin, retainedSiteAccountOrigin } from '../scripts/site-account-origin.mjs';

test('browser preloads and dynamic navigation resolve inside the Pages project for every archived route', () => {
  const context = { window: {} };
  const archivedHost = 'original-client/public/chatgpt.com';
  const plan = JSON.parse(fs.readFileSync(new URL('../src/native-client/entry-plan.json', import.meta.url), 'utf8'));
  const archive = new URL('../' + archivedHost + plan.manifest, import.meta.url);
  vm.runInNewContext(fs.readFileSync(archive, 'utf8'), context);
  const manifest = context.window.__reactRouterManifest;
  assert.equal(manifest.version, plan.sourceVersion);
  const home = new URL('https://fixture.test/chatgpt/');
  const entry = new URL('native-client/entry-library.mjs?v=fixture', home).href;
  const paths = Object.values(manifest.routes).map(route => route.path);
  localizeRouterAssets(manifest, home, entry);
  assert.equal(manifest.entry.module, entry);
  assert.deepEqual(Object.values(manifest.routes).map(route => route.path), paths);
  const localPaths = new Set();
  for (const record of [manifest.entry, ...Object.values(manifest.routes)]) {
    for (const [key, value] of Object.entries(record)) {
      if (key !== 'module' && !key.endsWith('Module') && key !== 'imports' && key !== 'css') continue;
      for (const reference of [value].flat()) {
        if (typeof reference !== 'string') continue;
        assert.ok(reference.startsWith(home.href), reference);
        localPaths.add(new URL(reference).pathname.slice(home.pathname.length));
      }
    }
  }
  for (const relativePath of localPaths) {
    assert.ok(fs.existsSync(new URL('../' + relativePath, import.meta.url)), 'Missing deployed route resource ' + relativePath);
  }
  assert.equal(new URL(manifest.url).pathname, '/chatgpt/' + archivedHost + plan.manifest);
});

test('the router shares the active site stylesheet, keeping route-specific CSS and valid fallbacks', () => {
  const home = new URL('https://example.test/chatgpt/');
  const entry = home.href + 'native-client/entry-library.mjs';
  const loaded = { rel: 'stylesheet', media: 'all', isConnected: true, sheet: {},
    href: home.href + 'original-client/public/chatgpt.com/cdn/assets/site.css' };
  const manifest = () => ({ entry: { module: '/cdn/assets/entry.js', css: ['/cdn/assets/site.css'] },
    routes: { home: { css: ['/cdn/assets/site.css', '/cdn/assets/home.css'], imports: ['/cdn/assets/module.js'] } } });

  const reused = manifest();
  localizeRouterAssets(reused, home, entry, loaded);
  assert.deepEqual(reused.entry.css, []);
  assert.deepEqual(reused.routes.home.css, [home.href + 'original-client/public/chatgpt.com/cdn/assets/home.css']);
  assert.deepEqual(reused.routes.home.imports, [home.href + 'original-client/public/chatgpt.com/cdn/assets/module.js']);

  for (const stylesheet of [undefined, { ...loaded, media: 'print' }, { ...loaded, disabled: true },
    { ...loaded, sheet: null }, { ...loaded, isConnected: false }]) {
    const independent = manifest();
    localizeRouterAssets(independent, home, entry, stylesheet);
    assert.deepEqual(independent.entry.css, [loaded.href]);
  }
});

test('the browser discovers the entry modules and stylesheet directly, with a lighter sign-in document', () => {
  const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
  const html = read('../native-client-shell.html'), auth = read('../auth/login/index.html');
  const plan = JSON.parse(read('../native-client/entry-plan.json'));
  const urls = document => [...document.matchAll(/<link rel="modulepreload" href="([^"]+)"/g)].map(match => match[1]);
  const home = urls(html), login = urls(auth);
  assert.match(html, /<script type="module" src="\/chatgpt\/native-client\/bootstrap\.mjs\?v=[a-f0-9]{16}"/);
  assert.match(html, /<link id="site-main-style" rel="stylesheet" href="\/chatgpt\/original-client\//);
  assert.doesNotMatch(auth, /rel="stylesheet"/);
  for (const shell of [html, auth]) {
    assert.doesNotMatch(shell, /正在打开|site-start-status/);
    assert.match(shell, /<title>ChatGPT<\/title>/);
    assert.match(shell, /<div id="site-load-progress">/);
    assert.match(shell, /role="progressbar"[^>]+aria-valuenow="0"/);
    assert.match(shell, /<main id="site-load-error" hidden role="alert"/);
  }
  const originals = [plan.runtime, ...plan.registrationChunks, plan.manifest, ...Object.values(plan.initialRoutes)];
  for (const file of originals) {
    const deployed = '/chatgpt/original-client/public/chatgpt.com' + file;
    assert.equal(home.filter(url => url === deployed).length, 1);
    assert.ok(!login.includes(deployed));
  }
  assert.ok(!home.some(url => /maplibre-gl\.mjs|_orbit-renderer/.test(url)));
  const boot = fs.readFileSync(new URL('../native-client/boot-adapter.mjs', import.meta.url), 'utf8');
  assert.ok(!/fetch\([^\n]*entry-plan\.json/.test(boot));
  const registration = fs.readFileSync(new URL('../native-client/entry-library.mjs', import.meta.url), 'utf8');
  assert.ok(!registration.includes('"/cdn/assets/'));
  assert.ok(registration.includes('/chatgpt/original-client/public/chatgpt.com' + plan.runtime));
});

test('the packaged entry mounts a client root on the static Pages document', () => {
  const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
  const plan = JSON.parse(read('../native-client/entry-plan.json'));
  const boot = read('../native-client/boot-adapter.mjs');
  const embedded = JSON.parse(boot.match(/^const plan = (\{[^\n]+\});$/m)[1]);
  assert.equal(plan.mountMode, 'client');
  assert.equal(embedded.mountMode, plan.mountMode);
});

const builder = fs.readFileSync(new URL('../scripts/build-native-client.mjs', import.meta.url), 'utf8');
const startupScript = html => html.match(/<script>([\s\S]*?)<\/script>/)[1];
const startupWeights = script => JSON.parse(script.slice(script.lastIndexOf('})(') + 3, -1));

test('source separates staged native preloads from the eager boot, auth and stylesheet', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const plan = JSON.parse(fs.readFileSync(path.join(root, 'src/native-client/entry-plan.json'), 'utf8'));
  const release = '0123456789abcdef', deploymentBase = '/chatgpt/';
  const originalOnSite = url => deploymentBase + 'original-client/public/chatgpt.com' + url;
  const cssAsset = originalOnSite(plan.stylesheet).slice(deploymentBase.length);
  // Render the real shell declarations without running the packaging writes.
  const declarations = builder.slice(builder.indexOf('const ownModule ='), builder.indexOf('const html = entryHTML();'));
  const [home, auth] = await vm.runInNewContext('(async () => {\n' + declarations +
    '\nreturn [entryHTML(), entryHTML({ auth: true })];\n})()', {
    fs: fs.promises, path, root, plan, release, deploymentBase, originalOnSite, cssAsset,
    registrationEntry: plan.registrationEntry, upstreamSprite: plan.iconSprite, sourceBuild: plan.sourceBuild, localCSS: '',
  });
  const stage = home.match(/<template id="site-native-module-preloads">([\s\S]*?)<\/template>/);
  assert.ok(stage);
  assert.equal(home.split(stage[0]).length, 2);
  assert.doesNotMatch(auth, /<template|rel="stylesheet"|as="fetch"/);
  const preloads = html => [...html.matchAll(/<link rel="modulepreload" href="([^"]+)"([^>]+)>/g)]
    .map(([, href, attributes]) => {
      assert.equal(attributes, ' crossorigin="anonymous" onload="window.__TYC_PAGE_START__.loadedResource(this.href)"');
      return href;
    });
  const expectedAuth = ['bootstrap.mjs', 'startup-compatibility.mjs', 'site-account.mjs', 'site-signout.mjs', 'site-paths.mjs']
    .map(file => deploymentBase + 'native-client/' + file + '?v=' + release);
  const expectedEager = [...expectedAuth, ...['native-client/boot-adapter.mjs', 'native-client/service-boundary.mjs', 'runtime.js',
    'model-catalog.js'].map(file => deploymentBase + file + '?v=' + release), originalOnSite(plan.runtime)];
  const expectedStage = [deploymentBase + 'native-client/' + plan.registrationEntry.slice(2),
    ...[...new Set([...plan.registrationChunks, plan.manifest, ...Object.values(plan.initialRoutes)])]
      .filter(file => file !== plan.runtime).map(originalOnSite)];
  assert.deepEqual(preloads(auth), expectedAuth);
  assert.deepEqual(preloads(home.replace(stage[0], '')), expectedEager);
  assert.deepEqual(preloads(stage[1]).sort(), expectedStage.sort());
  assert.match(home, /<link id="site-main-style" rel="stylesheet"/);
  const locale = originalOnSite(plan.startupLocale);
  const localeHint = [...home.replace(stage[0], '').matchAll(/<link rel="preload" as="fetch" href="([^"]+)"([^>]+)>/g)];
  assert.deepEqual(localeHint.map(([, href, attrs]) => [href, attrs]), [[locale,
    ' crossorigin="anonymous" fetchpriority="low" onload="window.__TYC_PAGE_START__.loadedResource(this.href)"']]);
  for (const [markup, expected] of [[home, [...expectedEager, ...expectedStage, deploymentBase + cssAsset, locale]], [auth, expectedAuth]]) {
    assert.match(markup, /<noscript>[\s\S]*此页面需要浏览器启用 JavaScript。<\/p><\/noscript>/);
    const entries = startupWeights(startupScript(markup));
    assert.deepEqual(entries.map(([href]) => href).sort(), [...expected].sort());
    for (const [href, bytes] of entries) {
      assert.equal(bytes, fs.statSync(path.join(root, href.slice(deploymentBase.length).split('?')[0])).size);
    }
  }
});

function startupFixture({ stylesheet, requestFrame = callback => callback(), readyState = 'loading', stagePreloads = false } = {}) {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const weights = startupWeights(startupScript(html));
  const declaration = builder.slice(builder.indexOf('const startupGuard ='), builder.indexOf('const startupBody ='));
  const settings = builder.match(/^const (?:errorMessage|delayedMessage|stagedPreloadsId) = [^\r\n]+$/gm).join('\n');
  // Exercise the builder's exact guard without regenerating the saved client.
  const guard = vm.runInNewContext(settings + '\n' + declaration + '\nstartupGuard(weights)', { weights }).slice(8, -9);
  const message = {};
  const notice = { hidden: true, querySelector: () => message };
  const connectedNode = () => ({ get isConnected() { return this.parentNode != null; } });
  const progress = connectedNode(), progressStyle = connectedNode();
  const percent = {}, time = {}, gauge = { value: null, setAttribute(_key, value) { this.value = value; }, style: { setProperty() {} } };
  progress.querySelector = key => key === '[role=progressbar]' ? gauge : key === '[data-percent]' ? percent : time;
  const resources = [...html.matchAll(/<link rel="modulepreload" href="([^"]+)"/g)].map(match => match[1]);
  let noticeAppends = 0;
  const body = {
    appendChild(node) {
      if (node === notice) noticeAppends++;
      node.parentNode = body;
    },
    removeChild(node) { node.parentNode = null; },
  };
  let onDOMReady, appended = 0;
  const preloadFragment = {};
  let template = stagePreloads ? { content: preloadFragment, remove() { template = undefined; } } : undefined;
  const head = {
    appendChild(node) {
      if (node === preloadFragment) appended++;
      else node.parentNode = head;
    },
  };
  body.appendChild(notice);
  body.appendChild(progress);
  head.appendChild(progressStyle);
  let callback, replaced, timeout, onMutation, composer, observeTiming;
  const entries = [];
  const window = {};
  vm.runInNewContext(guard, {
    window, URL,
    performance: { now: () => 2000, getEntriesByType: () => entries },
    setInterval: fn => { observeTiming = fn; return 1; },
    clearInterval: () => { observeTiming = undefined; },
    requestAnimationFrame: requestFrame,
    MutationObserver: class {
      constructor(listener) { onMutation = listener; }
      observe() {}
      disconnect() { onMutation = undefined; }
    },
    getComputedStyle: node => ({ visibility: node.visibility }),
    setTimeout(fn, delay) { callback = fn; timeout = delay; return 1; },
    clearTimeout() { callback = null; },
    document: {
      body, head, readyState,
      addEventListener(type, handler, options) {
        assert.equal(type, 'DOMContentLoaded');
        assert.equal(options.once, true);
        onDOMReady = handler;
      },
      querySelectorAll: () => composer ? [composer] : [],
      getElementById: id => ({
        'site-load-error': notice,
        'site-load-progress': progress,
        'site-load-progress-style': progressStyle,
        'site-main-style': stylesheet,
        'site-native-module-preloads': template,
      })[id],
    },
    location: { origin: 'https://fixture.test', href: 'https://fixture.test/chatgpt/c/abc?keep=1#turn', replace: value => { replaced = new URL(value); } },
  });
  return {
    notice, message, progress, progressStyle, timeout, resources, gauge, time, state: window.__TYC_PAGE_START__,
    recordTiming(...samples) { entries.push(...samples); observeTiming?.(); },
    triggerTimeout: () => callback?.(), replacement: () => replaced,
    documentReady: () => onDOMReady?.(),
    preloads: () => ({ pending: Boolean(template), appended }),
    active: () => ({ timeout: !!callback, progressPolling: !!observeTiming, renderObserver: !!onMutation }),
    noticeAppends: () => noticeAppends,
    mutate(nextComposer) {
      composer = nextComposer && { tagName: 'TEXTAREA', closest: () => null, ...nextComposer };
      onMutation?.();
    },
  };
}

test('staged module hints become live once after parsing, including when initialized late', () => {
  const fixture = startupFixture({ stagePreloads: true });
  assert.deepEqual(fixture.preloads(), { pending: true, appended: 0 });
  fixture.documentReady();
  fixture.documentReady();
  assert.deepEqual(fixture.preloads(), { pending: false, appended: 1 });

  for (const readyState of ['interactive', 'complete']) {
    const late = startupFixture({ readyState, stagePreloads: true });
    assert.deepEqual(late.preloads(), { pending: false, appended: 1 });
    late.documentReady();
    assert.deepEqual(late.preloads(), { pending: false, appended: 1 });
  }

  const auth = startupFixture();
  auth.documentReady();
  assert.deepEqual(auth.preloads(), { pending: false, appended: 0 });
});

test('a soft idle warning keeps staged preloads eligible until startup succeeds or fails', () => {
  for (const action of ['ready', 'fail', 'failStyles']) {
    const settled = startupFixture({ stagePreloads: true });
    settled.state[action]();
    settled.documentReady();
    assert.deepEqual(settled.preloads(), { pending: false, appended: 0 });
  }

  const delayed = startupFixture({ stagePreloads: true });
  delayed.triggerTimeout();
  assert.equal(delayed.notice.hidden, false);
  delayed.documentReady();
  assert.deepEqual(delayed.preloads(), { pending: false, appended: 1 });
});

test('an idle module watchdog allows retry or clears the notice when the late composer is usable', () => {
  const composer = { getClientRects: () => [{}], visibility: 'visible' };
  for (const alreadyWatching of [false, true]) {
    const fixture = startupFixture({ stylesheet: { sheet: {} } });
    const watch = () => {
      fixture.state.attach(fixture.notice);
      fixture.state.waitForComposer();
    };
    fixture.state.loadStyles({});
    if (alreadyWatching) watch();
    assert.equal(fixture.notice.hidden, true);
    assert.ok(fixture.progress.parentNode);
    assert.ok(fixture.timeout < 90000);
    fixture.triggerTimeout();
    if (!alreadyWatching) watch();
    assert.equal(fixture.notice.hidden, false);
    assert.match(fixture.message.textContent, /继续等待/);
    assert.equal(fixture.progress.parentNode, null);
    assert.equal(fixture.replacement(), undefined);
    assert.deepEqual(fixture.active(), { timeout: false, progressPolling: false, renderObserver: true });

    fixture.state.loadedResource(fixture.resources[0]);
    fixture.notice.parentNode = null;
    fixture.mutate({ ...composer, readOnly: true });
    assert.ok(fixture.notice.parentNode);
    assert.equal(fixture.progress.parentNode, null);
    assert.equal(fixture.active().timeout, false);

    fixture.state.retry();
    const target = fixture.replacement();
    assert.equal(target.pathname, '/chatgpt/c/abc');
    assert.equal(target.searchParams.get('keep'), '1');
    assert.ok(target.searchParams.has('__tyc_retry'));
    assert.equal(target.hash, '#turn');

    fixture.notice.parentNode = null;
    const noticeAppends = fixture.noticeAppends();
    fixture.mutate(composer);
    assert.equal(fixture.gauge.value, '100');
    assert.equal(fixture.notice.parentNode, null);
    assert.equal(fixture.noticeAppends(), noticeAppends);
    assert.equal(fixture.progress.parentNode, null);
    assert.deepEqual(fixture.active(), { timeout: false, progressPolling: false, renderObserver: false });
  }
});

test('an idle stylesheet keeps waiting and initializes when the requested CSS arrives', async () => {
  const stylesheet = { media: 'print', disabled: false };
  const stalled = startupFixture({ stylesheet });
  stalled.state.attach(stalled.notice);
  let state = 'pending';
  const pending = stalled.state.waitForStyles().then(value => { state = value; return value; });
  stalled.triggerTimeout();
  await Promise.resolve();
  assert.equal(state, 'pending');
  assert.equal(stylesheet.disabled, false);
  assert.equal(stalled.notice.hidden, false);
  assert.equal(stalled.progress.parentNode, null);

  stalled.state.loadStyles(stylesheet);
  assert.equal(await pending, true);
  assert.equal(stylesheet.media, 'all');
  stalled.state.waitForComposer();
  stalled.mutate({ getClientRects: () => [{}], visibility: 'visible' });
  assert.equal(stalled.gauge.value, '100');
  assert.equal(stalled.notice.parentNode, null);
  assert.deepEqual(stalled.active(), { timeout: false, progressPolling: false, renderObserver: false });
});

test('a definitive stylesheet error stops startup even after an idle notice', async () => {
  const stylesheet = { media: 'print', disabled: false };
  const stalled = startupFixture({ stylesheet });
  stalled.state.attach(stalled.notice);
  const pending = stalled.state.waitForStyles();
  stalled.triggerTimeout();
  stalled.state.failStyles();
  assert.equal(await pending, false);
  stalled.state.loadStyles(stylesheet);
  assert.equal(stylesheet.media, 'print');
  assert.equal(stalled.notice.hidden, false);
  assert.match(stalled.message.textContent, /未能完成加载/);
  assert.equal(stalled.progress.parentNode, null);
});

test('a definitive script error stays visible even if a composer-shaped element arrives', () => {
  const fixture = startupFixture();
  fixture.state.attach(fixture.notice);
  fixture.state.waitForComposer();
  fixture.state.fail();
  fixture.state.waitForComposer();
  fixture.mutate({ getClientRects: () => [{}], visibility: 'visible' });
  fixture.state.ready();
  assert.equal(fixture.notice.hidden, false);
  assert.match(fixture.message.textContent, /未能完成加载/);
  assert.ok(fixture.notice.parentNode);
  assert.notEqual(fixture.gauge.value, '100');
  assert.deepEqual(fixture.active(), { timeout: false, progressPolling: false, renderObserver: false });
});

test('the progress stays visible until the stylesheet and application are ready', async () => {
  const stylesheet = { media: 'print' };
  const ready = startupFixture({ stylesheet });
  const pending = ready.state.waitForStyles();
  ready.state.loadStyles(stylesheet);
  assert.equal(await pending, true);
  assert.equal(stylesheet.media, 'all');
  assert.ok(ready.progress.parentNode);
  ready.state.ready();
  ready.triggerTimeout();
  ready.state.fail();
  assert.equal(ready.notice.parentNode, null);
  assert.equal(ready.progress.parentNode, null);
});

test('the homepage keeps its progress across a document mount until the composer is visible', () => {
  const fixture = startupFixture();
  fixture.state.attach(fixture.notice);
  fixture.state.waitForComposer();
  fixture.progress.parentNode = null;
  fixture.progressStyle.parentNode = null;

  fixture.mutate({ getClientRects: () => [{}], visibility: 'hidden' });
  assert.equal(fixture.progress.isConnected, true);
  assert.equal(fixture.progressStyle.isConnected, true);

  fixture.mutate({ getClientRects: () => [{}], visibility: 'visible', readOnly: true });
  assert.equal(fixture.progress.isConnected, true);
  fixture.mutate({ getClientRects: () => [{}], visibility: 'visible', closest: () => ({ inert: true }) });
  assert.equal(fixture.progress.isConnected, true);
  fixture.mutate({ getClientRects: () => [{}], visibility: 'visible' });
  assert.equal(fixture.progress.isConnected, false);
  fixture.mutate(null);
  assert.equal(fixture.progress.isConnected, false);
});

test('a conversation stays at startup until its transcript, usable composer, or error is visible', () => {
  const loaded = { getClientRects: () => [{}], visibility: 'visible' };
  for (const resolved of [
    { ...loaded, matches: selector => selector.includes('[data-conversation-role]'), textContent: 'Saved reply' },
    { ...loaded, matches: selector => selector.includes('[role="alert"]'), textContent: 'Conversation unavailable' },
    { ...loaded, matches: () => false },
  ]) {
    const fixture = startupFixture();
    fixture.state.attach(fixture.notice);
    fixture.state.waitForConversation();
    fixture.mutate({ ...loaded, matches: () => true, textContent: '   ' });
    assert.notEqual(fixture.gauge.value, '100');
    fixture.mutate({ ...loaded, matches: () => false, disabled: true });
    assert.notEqual(fixture.gauge.value, '100');
    fixture.mutate(resolved);
    assert.equal(fixture.gauge.value, '100');
    assert.equal(fixture.progress.isConnected, false);
  }
});

test('settings keeps measured progress until the settings content has rendered', () => {
  const frames = [];
  const fixture = startupFixture({ requestFrame: callback => frames.push(callback) });
  fixture.state.attach(fixture.notice);
  fixture.state.waitForSettings();
  frames.shift()();
  fixture.progress.parentNode = null;
  fixture.progressStyle.parentNode = null;

  fixture.mutate({ getClientRects: () => [{}], visibility: 'visible', innerText: '' });
  assert.equal(fixture.progress.isConnected, true);
  assert.equal(fixture.progressStyle.isConnected, true);
  assert.notEqual(fixture.gauge.value, '100');
  assert.equal(fixture.time.textContent, '正在初始化页面');
  frames.shift()();

  fixture.mutate({ getClientRects: () => [{}], visibility: 'visible', innerText: '账户设置' });
  frames.shift()();
  assert.equal(fixture.gauge.value, '100');
  frames.shift()();
  assert.equal(fixture.progress.isConnected, false);
});

test('startup tracks completed resources once and estimates the time only after network samples', () => {
  const f = startupFixture();
  f.state.attach(f.notice);
  assert.equal(f.gauge.value, '0');
  const [a, b] = f.resources;
  f.state.loadedResource(a);
  const first = Number(f.gauge.value);
  assert.equal(f.time.textContent, '正在测量加载速度');
  f.state.loadedResource(a);
  assert.equal(Number(f.gauge.value), first);
  f.recordTiming(...[a, b].map((path, index) => ({
    name: new URL(path, 'https://fixture.test').href,
    transferSize: 1200, decodedBodySize: 2400, fetchStart: 100 + index, responseEnd: 1100 + index,
  })));
  assert.match(f.time.textContent, /预计资源还需/);
  const measured = f.gauge.value;
  assert.ok(Number(measured) < 99);
  f.state.waitForComposer();
  assert.equal(f.gauge.value, measured);
  assert.equal(f.time.textContent, '正在初始化页面');
  f.state.ready();
  assert.equal(f.gauge.value, '100');
});

test('account origin retention preserves the verified deployment until an explicit rollback', async () => {
  const original = 'https://original-account.fixture.test', ingress = 'https://verified-ingress.fixture.test';
  const moduleAt = origin => 'export const SITE_ACCOUNT_SERVICE = ' + JSON.stringify(origin) + ';';
  const preceding = { siteAccountOrigin: ingress };
  let priorReads = 0;
  const readPreviousModule = async () => { priorReads++; return moduleAt(ingress); };

  const retained = await retainedSiteAccountOrigin(requestedSiteAccountOrigin(undefined), preceding, readPreviousModule);
  assert.equal(retained, ingress);
  assert.equal(priorReads, 1);
  assert.equal(checkPackagedSiteAccountOrigin({
    publishedModule: moduleAt(retained), canonicalModule: moduleAt(original), recordedOrigin: retained,
    expectedOrigin: requestedSiteAccountOrigin(ingress + '/'),
  }), ingress);

  const rollback = await retainedSiteAccountOrigin(requestedSiteAccountOrigin(original), preceding, readPreviousModule);
  assert.equal(rollback, original);
  assert.equal(priorReads, 1, 'An explicit rollback does not depend on the prior account module');
  assert.equal(checkPackagedSiteAccountOrigin({
    publishedModule: moduleAt(rollback), canonicalModule: moduleAt(original), recordedOrigin: rollback, expectedOrigin: original,
  }), original);
  assert.equal(await retainedSiteAccountOrigin(undefined, null, readPreviousModule), undefined);
  assert.equal(await retainedSiteAccountOrigin(undefined, {}, readPreviousModule), undefined);
  assert.equal(priorReads, 1);
});

test('account origin retention rejects a mismatched prior package and the checker rejects unintended origin', async () => {
  const original = 'https://original-account.fixture.test', ingress = 'https://verified-ingress.fixture.test';
  const moduleAt = origin => 'export const SITE_ACCOUNT_SERVICE = ' + JSON.stringify(origin) + ';';
  await assert.rejects(retainedSiteAccountOrigin(undefined, { siteAccountOrigin: ingress }, async () => moduleAt(original)),
    /differs from the browser module/);
  await assert.rejects(retainedSiteAccountOrigin(undefined, { siteAccountOrigin: ingress + '/' }, async () => moduleAt(ingress)),
    /is not canonical/);
  await assert.rejects(retainedSiteAccountOrigin(undefined, { siteAccountOrigin: 'http://verified-ingress.fixture.test' }, async () => moduleAt(ingress)),
    /must be an HTTPS origin/);
  assert.throws(() => checkPackagedSiteAccountOrigin({
    publishedModule: moduleAt(original), canonicalModule: moduleAt(original), expectedOrigin: ingress,
  }), /requested CHATGPT_SITE_API_ORIGIN/);
  assert.throws(() => checkPackagedSiteAccountOrigin({
    publishedModule: moduleAt(ingress), canonicalModule: moduleAt(original),
  }), /differs from the browser module/);
  assert.throws(() => checkPackagedSiteAccountOrigin({
    publishedModule: moduleAt(ingress + '/'), canonicalModule: moduleAt(original), recordedOrigin: ingress,
  }), /site account module origin is not canonical/);
});

test('only a trusted HTTPS origin can be selected as the packaged account service', () => {
  const builder = fileURLToPath(new URL('../scripts/build-native-client.mjs', import.meta.url));
  for (const origin of ['http://fixture.example', 'https://user:secret@fixture.example',
    'https://fixture.example/account', 'https://fixture.example?a=1', 'https://fixture.example#login']) {
    const run = spawnSync(process.execPath, [builder], {
      env: { ...process.env, CHATGPT_SITE_API_ORIGIN: origin }, encoding: 'utf8',
    });
    assert.equal(run.status, 1);
    assert.match(run.stderr, /CHATGPT_SITE_API_ORIGIN must be an HTTPS origin/);
  }
  const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
  const packaged = JSON.parse(read('../native-client/adapter-provenance.json'));
  assert.doesNotThrow(() => checkPackagedSiteAccountOrigin({
    canonicalModule: read('../src/native-client/site-account.mjs'), publishedModule: read('../native-client/site-account.mjs'),
    recordedOrigin: packaged.siteAccountOrigin,
  }));
});
