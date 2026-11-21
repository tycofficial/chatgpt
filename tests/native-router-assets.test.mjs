import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { localizeRouterAssets } from '../src/native-client/startup-compatibility.mjs';

test('browser preloads and dynamic navigation resolve inside the Pages project for every archived route', () => {
  const context = { window: {} };
  const archive = new URL('../original-client/public/chatgpt.com/cdn/assets/manifest-98f8ff8a.js', import.meta.url);
  vm.runInNewContext(fs.readFileSync(archive, 'utf8'), context);
  const manifest = context.window.__reactRouterManifest;
  const home = new URL('https://fixture.test/chatgpt/');
  const entry = new URL('native-client/entry-library.mjs?v=fixture', home).href;
  const paths = Object.values(manifest.routes).map(route => route.path);
  localizeRouterAssets(manifest, home, entry);
  assert.equal(manifest.entry.module, entry);
  assert.deepEqual(Object.values(manifest.routes).map(route => route.path), paths);
  for (const record of [manifest.entry, ...Object.values(manifest.routes)]) {
    for (const [key, value] of Object.entries(record)) {
      if (key !== 'module' && !key.endsWith('Module') && key !== 'imports' && key !== 'css') continue;
      for (const reference of [value].flat()) {
        if (typeof reference !== 'string') continue;
        assert.ok(reference.startsWith(home.href), reference);
      }
    }
  }
  assert.equal(new URL(manifest.url).pathname, '/chatgpt/original-client/public/chatgpt.com/cdn/assets/manifest-98f8ff8a.js');
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
