import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
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
    assert.match(shell, /<div id="site-load-progress" role="progressbar" aria-label="页面加载中"/);
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

function startupFixture({ stylesheet } = {}) {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const guard = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const notice = { hidden: true };
  const connectedNode = () => ({ get isConnected() { return this.parentNode != null; } });
  const progress = connectedNode(), progressStyle = connectedNode();
  const body = {
    appendChild(node) { node.parentNode = body; },
    removeChild(node) { node.parentNode = null; },
  };
  const head = { appendChild(node) { node.parentNode = head; } };
  body.appendChild(notice);
  body.appendChild(progress);
  head.appendChild(progressStyle);
  let callback, replaced, timeout, onMutation, composer;
  const window = {};
  vm.runInNewContext(guard, {
    window, URL,
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
    location: { href: 'https://fixture.test/chatgpt/c/abc?keep=1#turn', replace: value => { replaced = new URL(value); } },
  });
  return {
    notice, progress, progressStyle, timeout, state: window.__TYC_PAGE_START__,
    triggerTimeout: () => callback?.(), replacement: () => replaced,
    mutate(nextComposer) {
      composer = nextComposer;
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

  fixture.mutate({ getClientRects: () => [{}], visibility: 'visible' });
  assert.equal(fixture.progress.isConnected, false);
  fixture.mutate(null);
  assert.equal(fixture.progress.isConnected, false);
});
