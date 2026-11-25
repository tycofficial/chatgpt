import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { localizeRouterAssets } from '../src/native-client/startup-compatibility.mjs';

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

function startupFixture({ stylesheet, requestFrame = callback => callback() } = {}) {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const guard = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const notice = { hidden: true };
  const connectedNode = () => ({ get isConnected() { return this.parentNode != null; } });
  const progress = connectedNode(), progressStyle = connectedNode();
  const percent = {}, time = {}, gauge = { value: null, setAttribute(_key, value) { this.value = value; }, style: { setProperty() {} } };
  progress.querySelector = key => key === '[role=progressbar]' ? gauge : key === '[data-percent]' ? percent : time;
  const resources = [...html.matchAll(/<link rel="modulepreload" href="([^"]+)"/g)].map(match => match[1]);
  const body = {
    appendChild(node) { node.parentNode = body; },
    removeChild(node) { node.parentNode = null; },
  };
  const head = { appendChild(node) { node.parentNode = head; } };
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
      body, head, addEventListener() {},
      querySelectorAll: () => composer ? [composer] : [],
      getElementById: id => ({
        'site-load-error': notice,
        'site-load-progress': progress,
        'site-load-progress-style': progressStyle,
        'site-main-style': stylesheet,
      })[id],
    },
    location: { origin: 'https://fixture.test', href: 'https://fixture.test/chatgpt/c/abc?keep=1#turn', replace: value => { replaced = new URL(value); } },
  });
  return {
    notice, progress, progressStyle, timeout, resources, gauge, time, state: window.__TYC_PAGE_START__,
    recordTiming(...samples) { entries.push(...samples); observeTiming?.(); },
    triggerTimeout: () => callback?.(), replacement: () => replaced,
    mutate(nextComposer) {
      composer = nextComposer && { tagName: 'TEXTAREA', closest: () => null, ...nextComposer };
      onMutation?.();
    },
  };
}

test('a stalled module exposes a retry without showing a waiting screen or navigating automatically', () => {
  const fixture = startupFixture({ stylesheet: { sheet: {} } });
  fixture.state.loadStyles({});
  assert.equal(fixture.notice.hidden, true);
  assert.ok(fixture.progress.parentNode);
  assert.ok(fixture.timeout < 90000);
  fixture.triggerTimeout();
  assert.equal(fixture.notice.hidden, false);
  assert.equal(fixture.progress.parentNode, null);
  assert.equal(fixture.replacement(), undefined);
  fixture.state.retry();
  const target = fixture.replacement();
  assert.equal(target.pathname, '/chatgpt/c/abc');
  assert.equal(target.searchParams.get('keep'), '1');
  assert.ok(target.searchParams.has('__tyc_retry'));
  assert.equal(target.hash, '#turn');
  fixture.state.ready();
  assert.equal(fixture.notice.parentNode, null);
});

test('a stalled stylesheet releases the startup wait and exposes retry', async () => {
  const stylesheet = { media: 'print' };
  const stalled = startupFixture({ stylesheet });
  const pending = stalled.state.waitForStyles();
  stalled.triggerTimeout();
  assert.equal(await pending, false);
  assert.equal(stylesheet.disabled, true);
  assert.equal(stalled.notice.hidden, false);
  assert.equal(stalled.progress.parentNode, null);
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
  const packaged = JSON.parse(fs.readFileSync(new URL('../native-client/adapter-provenance.json', import.meta.url), 'utf8'));
  if (packaged.siteAccountOrigin) {
    const account = fs.readFileSync(new URL('../native-client/site-account.mjs', import.meta.url), 'utf8');
    assert.ok(account.includes('export const SITE_ACCOUNT_SERVICE = ' + JSON.stringify(packaged.siteAccountOrigin) + ';'));
  }
});
