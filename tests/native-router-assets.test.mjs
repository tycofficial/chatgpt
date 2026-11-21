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

test('the archived shell preloads its entry chunks without preloading them for sign-in', () => {
  const html = fs.readFileSync(new URL('../native-client-shell.html', import.meta.url), 'utf8');
  const plan = JSON.parse(fs.readFileSync(new URL('../native-client/entry-plan.json', import.meta.url), 'utf8'));
  const loader = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]).find(code => code.includes('modulepreload'));
  assert.ok(loader);
  const run = pathname => {
    const links = [];
    const document = { createElement: () => ({}), head: { appendChild(link) { links.push(link); } } };
    vm.runInNewContext(loader, { document, location: { pathname }, window: { Promise, structuredClone } });
    return links.filter(link => link.rel === 'modulepreload').map(link => link.href);
  };
  const home = run('/chatgpt/'), login = run('/chatgpt/auth/login/');
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

test('a revisited Pages homepage reads the live release and keeps a shell for outages', async () => {
  const home = 'https://fixture.test/chatgpt/';
  const worker = fs.readFileSync(new URL('../native-client-worker.js', import.meta.url), 'utf8')
    .replace(/^import[^\n]*\n/, '');
  const html = body => new Response(body, { headers: { 'Content-Type': 'text/html' } });
  let saved = html('previous release');
  const cache = {
    match: async key => {
      assert.equal(key, home + 'index.html');
      return saved.clone();
    },
    put: async (key, response) => {
      assert.equal(key, home + 'index.html');
      saved = response;
    }
  };
  const listeners = new Map();
  let network = 'available';
  let requests = 0;
  vm.runInNewContext(worker, {
    URL,
    Response,
    BrowserWorkspaceStore: class {},
    caches: { open: async () => cache },
    self: {
      location: new URL(home + 'native-client-worker.js'),
      addEventListener: (type, handler) => listeners.set(type, handler)
    },
    fetch: async (request, options) => {
      requests++;
      assert.equal(request.url, home);
      assert.equal(options.cache, 'no-store');
      if (network === 'offline') throw new TypeError('Load failed');
      return network === 'unavailable' ? new Response('unavailable', { status: 503 }) : html('current release');
    }
  });
  async function reopen() {
    let response;
    listeners.get('fetch')({
      request: { url: home, mode: 'navigate' },
      respondWith: value => { response = value; }
    });
    return (await response).text();
  }
  assert.equal(await reopen(), 'current release');
  assert.equal(requests, 1);
  network = 'offline';
  assert.equal(await reopen(), 'current release');
  network = 'unavailable';
  assert.equal(await reopen(), 'current release');
  assert.equal(requests, 3);
});
