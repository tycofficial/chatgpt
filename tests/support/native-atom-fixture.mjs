import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { parse } from 'acorn';

const stateModulesByBuild = {
  b6348792a294e8e04a67660959ba41914937938f: ['ouEa', 'HkKI', 'WWxl'],
  '0237c4dd9e54c7e3a619581b909d792de582fee9': ['S20o', 'icog', 'QThm'],
};

/** Load the archived native atom runtime in an isolated VM with no network. */
export function openNativeAtomFixture({
  repositoryRoot = fileURLToPath(new URL('../../', import.meta.url)),
  readAloud = false,
} = {}) {
  const readJson = file => JSON.parse(readFileSync(join(repositoryRoot, file), 'utf8'));
  const plan = readJson('src/native-client/entry-plan.json');
  const manifest = readJson('original-client/resource-manifest.json');
  assert.equal(manifest.sourceBuild, plan.sourceBuild);
  const stateModules = stateModulesByBuild[plan.sourceBuild];
  assert.ok(stateModules, 'Unverified native atom build ' + plan.sourceBuild);
  const [storeId] = stateModules;
  const factoryChunks = {
    109308: ['Q840', 'UQAX', 'AvFJ', 'fbKo', 'J6iR', 'KoFQ', 'PKjX', 'PSDF', 'vMlG', 'XNFm', 'oFsh', 'iwK1', 'm4Vs', 'wFEO', 'tyzk', 'Nmf8', 'jwtq', 'hffr'],
    399565: stateModules,
    447351: ['NxBK', 'D7Ms', 'pEZk', 'HY2m', 'H4sS', 'uyLo', 'wYVE', 'wo6g', 'suje', 'OtRH', 'MtYY', 'OLOS', 'rbzn', 'slNz', 'UKIm'],
    ...(readAloud ? { 646436: ['JE6G', 'WNfO'] } : {}),
  };
  const context = vm.createContext({
    console, setTimeout, clearTimeout, queueMicrotask, performance,
    TextEncoder, TextDecoder, AbortController, AbortSignal, DOMException, crypto: globalThis.crypto,
  });
  const factories = new Map();
  const modules = new Map();
  for (const [chunkId, ids] of Object.entries(factoryChunks)) {
    const chunk = plan.registrationChunks.find(url => url.startsWith('/cdn/assets/' + chunkId + '.'));
    assert.ok(chunk, 'Missing original registration chunk ' + chunkId);
    const url = 'https://chatgpt.com' + chunk;
    const candidates = manifest.assets.filter(asset => asset.url === url);
    assert.equal(candidates.length, 1, 'Expected one captured registration chunk ' + url);
    const [asset] = candidates;
    assert.equal(asset.path, 'public/chatgpt.com' + chunk);
    const bytes = readFileSync(join(repositoryRoot, 'original-client', asset.path));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256, url);
    const source = bytes.toString('utf8');
    const { body } = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
    const table = body.flatMap(statement => (statement.declaration ?? statement).declarations ?? [])
      .find(declaration => declaration.id.name === '__webpack_modules__')?.init;
    assert.equal(table?.type, 'ObjectExpression', 'Missing original factory table ' + url);
    for (const id of ids) {
      const matching = table.properties.filter(property => (property.key?.name ?? property.key?.value) === id);
      assert.equal(matching.length, 1, 'Expected one original factory ' + id + ' in ' + url);
      const [{ value, method }] = matching;
      const prefix = method ? (value.async ? 'async ' : '') + 'function' + (value.generator ? '*' : '') : '';
      const code = prefix + source.slice(value.start, value.end);
      factories.set(id, new vm.Script('(' + code + ')', { filename: url + '#' + id }).runInContext(context, { timeout: 1000 }));
    }
  }

  function define(exports, getters = {}, values = {}) {
    for (const [key, get] of Object.entries(getters)) Object.defineProperty(exports, key, { get, enumerable: true });
    for (const [key, value] of Object.entries(values)) Object.defineProperty(exports, key, { value, enumerable: true });
  }

  function pure(id) {
    if (modules.has(id)) return modules.get(id).exports;
    assert.ok(factories.has(id), 'Unexpected native atom dependency ' + id);
    const module = { exports: {} };
    modules.set(id, module);
    factories.get(id)(module, module.exports, pure);
    return module.exports;
  }
  pure.d = define;
  pure.o = (value, key) => Object.hasOwn(value, key);
  pure.n = module => {
    const get = module?.__esModule ? () => module.default : () => module;
    Object.defineProperty(get, 'a', { get });
    return get;
  };
  pure.r = exports => Object.defineProperty(exports, '__esModule', { value: true });

  function instantiate(id, dependencies) {
    assert.ok(factories.has(id), 'Missing native fixture factory ' + id);
    const require = dependency => {
      assert.ok(Object.hasOwn(dependencies, dependency), 'Unexpected ' + id + ' dependency ' + dependency);
      return dependencies[dependency];
    };
    require.d = define;
    require.n = pure.n;
    const module = { exports: {} };
    factories.get(id)(module, module.exports, require);
    return module.exports;
  }

  const atomDependencies = ['tyzk', 'hffr', 'Nmf8', 'jwtq', 'J6iR', 'rbzn', storeId, 'iwK1', 'wFEO', 'D7Ms', 'AvFJ', 'fbKo', 'PKjX', 'm4Vs', 'vMlG', 'UQAX', 'KoFQ', 'oFsh'];
  const Q840 = instantiate('Q840', {
    ...Object.fromEntries(atomDependencies.map(id => [id, pure(id)])),
    zd8w: { createContext: value => ({ value }) }, suf3: {}, CdjL: {}, ABep: {}, QosV: {}, SZCv: {}, ns1t: {},
  });
  assert.equal(Q840.c, pure('UQAX').a);
  assert.equal(Q840.d, pure('jwtq').a);
  assert.equal(Q840.u, pure('hffr').b);

  function createScope(name) {
    const scopeAtom = pure('tyzk').a(name);
    const nativeStore = pure(storeId);
    const node = {
      token: scopeAtom, parent: null, value: {}, store: nativeStore.b(),
      cachedBindings: new WeakMap(), signalBindings: new WeakMap(),
      familyBindings: new Map(), familyKeysByOwner: new Map(), disposalLifecycles: new Set(),
      autoDisposeScheduler: new (pure('KoFQ').a)({ active: false }), imperativeReadAtoms: new WeakSet(),
      imperativeReadDepth: 0, retainedScopeEntries: new Map(), debugEntries: new Set(),
      contextVersionAtom: nativeStore.a(0),
    };
    const scope = pure('fbKo').g(scopeAtom, new Map([[scopeAtom.id, node]]), node);
    return { scopeAtom, scope };
  }
  return { Q840, createScope, instantiate };
}
