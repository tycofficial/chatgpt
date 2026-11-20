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
