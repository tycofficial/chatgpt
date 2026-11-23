import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { createLocalDiscoveryAdapter } from '../src/native-client/local-discovery.mjs';
import { PUBLIC_PLUGIN_CATALOG, PUBLIC_PLUGIN_CATALOG_PROVENANCE } from '../src/native-client/public-plugin-catalog.mjs';
import { createLocalPricingAdapter, getLocalReferencePricingConfig, normalizeLocalMembership } from '../src/native-client/local-pricing.mjs';
import { createLocalMapProvider, installDeferredMapProvider, createOpenStreetMapStyle, isOpenStreetMapTileRequest, fetchOpenStreetMapTile, OSM_TILE_TEMPLATE, OSM_ATTRIBUTION } from '../src/native-client/local-map-provider.mjs';

const memory = () => {
  const values = new Map();
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
};
async function rpc(adapter, pathname, method = 'GET', body) {
  const init = { method };
  if (body !== undefined) { init.body = JSON.stringify(body); init.headers = { 'Content-Type': 'application/json' }; }
  const request = new Request('https://neutral.invalid/chatgpt/backend-api' + pathname, init);
  const response = await adapter.handle(request, pathname.split('?')[0]);
  assert.ok(response, 'Expected local service to handle ' + pathname);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  return { response, body: response.status === 204 ? null : await response.json() };
}
function pluginFixture(extra = {}) {
  const storage = extra.storage ?? memory();
  let accountId = 'neutral-site-account';
  const make = options => createLocalDiscoveryAdapter({ storage, getAccountId: () => accountId, ...options });
  return { storage, make, adapter: make(extra), setAccount: value => { accountId = value; } };
}
const installedRows = async adapter => (await rpc(adapter, '/ps/plugins/installed')).body.plugins;

test('plugin directory is the pinned official public catalog with native card DTOs and real exact icon blobs', async () => {
  const env = pluginFixture();
  const home = await rpc(env.adapter, '/ps/plugins/home');
  assert.equal(home.response.status, 200);
  assert.equal(PUBLIC_PLUGIN_CATALOG_PROVENANCE.rows, 62);
  assert.equal(PUBLIC_PLUGIN_CATALOG_PROVENANCE.externalAccountAuthenticated, false);
  const cards = home.body.sections.flatMap(section => section.plugins);
  assert.equal(cards.length, PUBLIC_PLUGIN_CATALOG.length);
  assert.equal(new Set(cards.map(card => card.id)).size, cards.length);
  assert.deepEqual(new Set(cards.map(card => card.id)), new Set(PUBLIC_PLUGIN_CATALOG.map(row => row.id)));
  const icons = new Set();
  for (const row of PUBLIC_PLUGIN_CATALOG) {
    assert.match(row.id, /^plugin_local_[0-9a-f]{40}$/);
    assert.equal(row.id.slice('plugin_local_'.length), row.source.manifestBlobSha);
    assert.equal(row.source.commit, PUBLIC_PLUGIN_CATALOG_PROVENANCE.commit);
    assert.equal(new URL(row.source.manifestUrl).hostname, 'raw.githubusercontent.com');
    for (const relative of Object.values(row.assets).filter(Boolean)) icons.add(new URL(relative, new URL('../src/native-client/local-discovery.mjs', import.meta.url)));
  }
  for (const icon of icons) {
    assert.ok(icon.pathname.includes('/src/native-client/plugin-assets/'));
    const bytes = await fs.readFile(icon);
    assert.ok(bytes.length > 0);
    const expected = /\/([0-9a-f]{40})\.[a-z]+$/.exec(icon.pathname)?.[1];
    assert.ok(expected, 'Public icon path must name its verified Git blob');
    assert.equal(createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex'), expected);
  }
  for (const card of cards) {
    assert.equal(typeof card.display_name, 'string');
    assert.equal(typeof card.short_description, 'string');
    assert.ok(Array.isArray(card.keywords));
    assert.equal(card.status, 'ENABLED');
    assert.equal(card.local_metadata_registration, true);
    assert.ok(!Object.hasOwn(card, 'enabled'), 'Catalog availability must not pretend installed state');
    if (card.icon_url) await fs.access(fileURLToPath(card.icon_url));
  }
  const extraNames = new Set(PUBLIC_PLUGIN_CATALOG_PROVENANCE.unmaterialized.map(row => row.name));
  assert.ok(PUBLIC_PLUGIN_CATALOG.every(row => !extraNames.has(row.name)), 'Unmaterialized external repositories are not offered as complete packages');
});

test('original category pagination covers each public entry once and bounds malformed tokens', async () => {
  const env = pluginFixture();
  const home = (await rpc(env.adapter, '/ps/plugins/home')).body;
  for (const section of home.sections) {
    let token = null;
    const ids = [];
    do {
      const url = '/ps/plugin-categories/' + section.url_slug + '/plugins?limit=2' + (token ? '&page_token=' + encodeURIComponent(token) : '');
      const page = await rpc(env.adapter, url);
      assert.equal(page.response.status, 200);
      assert.equal(page.body.pagination.limit, 2);
      assert.ok(page.body.plugins.length <= 2);
      ids.push(...page.body.plugins.map(row => row.id));
      token = page.body.pagination.next_page_token;
      assert.ok(ids.length <= PUBLIC_PLUGIN_CATALOG.length, 'Pagination must advance');
    } while (token);
    assert.deepEqual(ids, section.plugins.map(row => row.id));
  }
  const category = home.sections.find(section => section.plugins.some(row => row.display_name === 'Linear'));
  const search = await rpc(env.adapter, '/ps/plugin-categories/' + category.url_slug + '/plugins?q=Linear&limit=1');
  assert.equal(search.body.plugins[0].display_name, 'Linear');
  assert.equal((await rpc(env.adapter, '/ps/plugin-categories/' + category.url_slug + '/plugins?page_token=unknown')).response.status, 400);
  assert.equal((await rpc(env.adapter, '/ps/plugin-categories/not-a-category/plugins')).response.status, 404);
  assert.equal((await rpc(env.adapter, '/ps/plugin-categories/' + category.url_slug + '/plugins?page_token=site-plugin-page:99999')).response.status, 400);
});

test('plugin install/disable/enable/uninstall really persist and never grant external account authentication', async () => {
  const env = pluginFixture();
  const row = PUBLIC_PLUGIN_CATALOG.find(entry => entry.appIds.length > 0 && entry.installationPolicy === 'AVAILABLE');
  const before = await rpc(env.adapter, '/ps/plugins/' + row.id);
  assert.ok(!Object.hasOwn(before.body, 'enabled'));
  assert.deepEqual(await installedRows(env.adapter), []);
  const install = await rpc(env.adapter, '/ps/plugins/' + row.id + '/install', 'POST', {});
  assert.equal(install.response.status, 200);
  assert.equal(install.body.plugin.enabled, true);
  assert.equal(install.body.local_metadata_registration, true);
  assert.equal(install.body.plugin.external_account_authentication, 'separate-host-authorization-required');
  assert.deepEqual(install.body.app_ids_needing_auth, row.appIds);
  const firstTimestamp = install.body.plugin.installed_at;
  assert.ok(Number.isFinite(Date.parse(firstTimestamp)));
  const restored = env.make();
  assert.equal((await installedRows(restored))[0].id, row.id);
  assert.equal(restored.getInstalledManifestReferences()[0].externalAccountAuthorizationGranted, false);
  assert.equal(restored.getInstalledManifestReferences()[0].source.manifestBlobSha, row.source.manifestBlobSha);
  assert.equal((await rpc(restored, '/ps/plugins/' + row.id + '/disable', 'POST', {})).body.plugin.enabled, false);
  assert.equal((await installedRows(env.make()))[0].enabled, false);
  assert.equal((await rpc(env.make(), '/ps/plugins/' + row.id + '/enable', 'POST', {})).body.plugin.enabled, true);
  assert.equal((await installedRows(env.make()))[0].installed_at, firstTimestamp);
  const connected = env.make({ readConnectedAppIds: () => [row.appIds[0]] });
  assert.deepEqual((await rpc(connected, '/ps/plugins/' + row.id + '/install', 'POST', {})).body.app_ids_needing_auth, row.appIds.slice(1));
  assert.equal((await installedRows(connected)).length, 1);
  await rpc(restored, '/ps/plugins/' + row.id + '/uninstall', 'POST', {});
  assert.deepEqual(await installedRows(env.make()), []);
  assert.ok(!Object.hasOwn((await rpc(env.make(), '/ps/plugins/' + row.id)).body, 'enabled'));
});

test('plugin registry isolates accounts, refuses unauthenticated mutations and reports storage failure without false installs', async () => {
  const env = pluginFixture();
  const row = PUBLIC_PLUGIN_CATALOG[0];
  await rpc(env.adapter, '/ps/plugins/' + row.id + '/install', 'POST', {});
  env.setAccount('different-neutral-account');
  assert.deepEqual(await installedRows(env.adapter), []);
  assert.equal((await rpc(env.adapter, '/ps/plugins/' + row.id + '/disable', 'POST', {})).response.status, 404);
  env.setAccount(null);
  assert.equal((await rpc(env.adapter, '/ps/plugins/' + row.id + '/install', 'POST', {})).response.status, 401);
  const before = new Map(env.storage.values);
  const failedStorage = { getItem: env.storage.getItem, setItem: () => { throw Error('quota exceeded'); } };
  env.setAccount('neutral-site-account');
  const denied = env.make({ storage: failedStorage });
  assert.equal((await rpc(denied, '/ps/plugins/' + row.id + '/disable', 'POST', {})).response.status, 507);
  assert.deepEqual(env.storage.values, before);
  assert.equal((await installedRows(env.adapter))[0].enabled, true);
  const key = [...env.storage.values.keys()][0];
  env.storage.values.set(key, '{damaged');
  assert.equal((await rpc(env.adapter, '/ps/plugins/installed')).response.status, 500);
  assert.equal((await rpc(env.adapter, '/ps/plugins/' + row.id + '/install', 'POST', {})).response.status, 500);
  assert.equal(env.storage.values.get(key), '{damaged');
  const newEnv = pluginFixture({ readConnectedAppIds: () => Promise.resolve([]) });
  assert.equal((await rpc(newEnv.adapter, '/ps/plugins/' + row.id + '/install', 'POST', {})).response.status, 503);
  assert.equal(newEnv.storage.values.size, 0);
});

test('plugin batch/canonical-app reads use original request names and unavailable operations cannot claim authorization', async () => {
  const env = pluginFixture();
  const row = PUBLIC_PLUGIN_CATALOG.find(entry => entry.appIds.length);
  const batch = await rpc(env.adapter, '/ps/plugins/batch', 'POST', { plugin_ids: [row.id, row.name, 'missing-local-package'] });
  assert.equal(batch.response.status, 200);
  assert.equal(batch.body.results[0].requested_plugin_id, row.id);
  assert.equal(batch.body.results[0].plugin.id, row.id);
  assert.equal(batch.body.results[1].plugin.id, row.id);
  assert.equal(batch.body.results[2].plugin, null);
  assert.equal((await rpc(env.adapter, '/ps/plugins/canonical-app/' + row.appIds[0])).body.plugin_id, row.id);
  assert.equal((await rpc(env.adapter, '/ps/plugins/canonical-app/unknown-public-app')).body.plugin_id, null);
  assert.equal((await rpc(env.adapter, '/ps/plugins/batch', 'POST', { ids: [row.id] })).response.status, 400);
  assert.equal((await rpc(env.adapter, '/ps/plugins/batch', 'POST', { plugin_ids: Array(201).fill(row.id) })).response.status, 400);
  assert.equal((await rpc(env.adapter, '/ps/plugins/unknown/install', 'POST', {})).response.status, 404);
  const unsupported = await rpc(env.adapter, '/ps/plugins/' + row.id + '/connect-account', 'POST', {});
  assert.equal(unsupported.response.status, 501);
  assert.equal(unsupported.body.error.code, 'LOCAL_PLUGIN_CAPABILITY_UNAVAILABLE');
});

test('OSM style and exact tile boundary retain attribution, normal HTTP caching and no authorization', async () => {
  const style = createOpenStreetMapStyle();
  assert.equal(style.version, 8);
  assert.deepEqual(Object.keys(style.sources), ['local-osm-standard']);
  assert.deepEqual(style.sources['local-osm-standard'].tiles, [OSM_TILE_TEMPLATE]);
  assert.equal(style.sources['local-osm-standard'].maxzoom, 19);
  assert.equal(style.sources['local-osm-standard'].attribution, OSM_ATTRIBUTION);
  assert.match(OSM_ATTRIBUTION, /https:\/\/www.openstreetmap.org\/copyright/);
  style.sources['local-osm-standard'].tiles[0] = 'must-not-leak';
  assert.equal(createOpenStreetMapStyle().sources['local-osm-standard'].tiles[0], OSM_TILE_TEMPLATE);
  for (const url of ['https://tile.openstreetmap.org/0/0/0.png', 'https://tile.openstreetmap.org/19/524287/524287.png']) assert.equal(isOpenStreetMapTileRequest(url), true);
  for (const url of [
    'http://tile.openstreetmap.org/0/0/0.png', 'https://tile.openstreetmap.org.evil.invalid/0/0/0.png',
    'https://fixture:password@tile.openstreetmap.org/0/0/0.png', 'https://tile.openstreetmap.org/0/0/0.png?token=fixture',
    'https://tile.openstreetmap.org/0/0/0.png#fragment', 'https://tile.openstreetmap.org/20/0/0.png',
    'https://tile.openstreetmap.org/0/1/0.png', 'https://tile.openstreetmap.org/1/0/2.png',
    'https://tile.openstreetmap.org/1/-1/0.png', 'https://tile.openstreetmap.org/1%2f0/0.png',
    'https://tile.openstreetmap.org/bulk', 'https://api.mapbox.com/0/0/0.png',
  ]) assert.equal(isOpenStreetMapTileRequest(url), false, url);
  let called = 0;
  const transport = async request => {
    called++;
    assert.equal(request.url, 'https://tile.openstreetmap.org/0/0/0.png');
    assert.equal(request.credentials, 'omit');
    assert.equal(request.cache, 'default');
    assert.equal(request.redirect, 'error');
    assert.equal(request.referrerPolicy, 'strict-origin-when-cross-origin');
    for (const header of ['authorization', 'cookie', 'cache-control', 'pragma']) assert.equal(request.headers.has(header), false);
    return new Response('fixture only; no live provider call');
  };
  await fetchOpenStreetMapTile(transport, 'https://tile.openstreetmap.org/0/0/0.png', {
    cache: 'reload', credentials: 'include',
    headers: { Authorization: 'Bearer fixture-not-a-secret', Cookie: 'fixture=only', 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
  });
  assert.equal(called, 1);
  assert.throws(() => fetchOpenStreetMapTile(transport, 'https://tile.openstreetmap.org/0/0/0.png', { method: 'POST', body: 'reject' }), TypeError);
  assert.throws(() => fetchOpenStreetMapTile(transport, 'https://not-the-provider.invalid/0/0/0.png'), TypeError);
  assert.equal(called, 1);
});

test('MapLibre class alias observer settles even when redundant classList.add emits mutations', () => {
  const savedObserver = globalThis.MutationObserver;
  const observers = new Set(), tasks = [];
  let callbacks = 0;
  class Observer {
    constructor(callback) { this.callback = callback; }
    observe(target, options) { this.target = target; this.options = options; this.active = true; observers.add(this); }
    emit() { if (!this.active || this.queued) return; this.queued = true; tasks.push(() => { this.queued = false; if (this.active) { callbacks++; this.callback(); } }); }
    disconnect() { this.active = false; observers.delete(this); }
  }
  function mutate() { for (const observer of observers) observer.emit(); }
  function element(...initial) {
    const names = new Set(initial);
    return {
      children: [],
      classList: { [Symbol.iterator]: () => names.values(), contains: name => names.has(name), add(name) { names.add(name); mutate(); } },
      querySelectorAll() { return this.children.flatMap(child => [child, ...child.querySelectorAll()]); },
      append(child) { this.children.push(child); mutate(); },
    };
  }
  const container = element('maplibregl-map'), queryCalls = [];
  class BaseMap {
    constructor(options) { this.options = options; this.controls = []; this.layers = new Set(['local-osm-standard', 'fixture-marker']); }
    addControl(control, position) { this.controls.push({ control, position }); }
    getContainer() { return container; }
    on() {}
    setStyle(style) { this.style = style; return this; }
    getLayer(id) { return this.layers.has(id) ? { id } : undefined; }
    getSource(id) { return id === 'local-osm-standard' ? {} : undefined; }
    queryRenderedFeatures(geometry, options) { queryCalls.push({ geometry, options }); return [{ fixture: true }]; }
    querySourceFeatures() { return [{ fixture: true }]; }
    remove() { this.removed = true; }
  }
  class AttributionControl { constructor(options) { this.options = options; } }
  let worker;
  globalThis.MutationObserver = Observer;
  try {
    const diagnostics = [];
    const provider = createLocalMapProvider({ renderer: { Map: BaseMap, AttributionControl, setWorkerUrl: url => { worker = url; } }, diagnostics });
    provider.configureRenderer();
    assert.match(worker, /\/map-vendor\/maplibre-gl-worker\.mjs$/);
    const map = new provider.renderer.Map({ container, accessToken: 'fixture-vendor-token-must-be-removed', config: { basemap: {} }, style: 'mapbox://fixture' });
    assert.ok(!Object.hasOwn(map.options, 'accessToken'));
    assert.ok(!Object.hasOwn(map.options, 'config'));
    assert.deepEqual(map.options.style.sources['local-osm-standard'].tiles, [OSM_TILE_TEMPLATE]);
    assert.equal(map.controls[0].control.options.compact, false);
    assert.equal(map.controls[0].control.options.customAttribution, OSM_ATTRIBUTION);
    const control = element('maplibregl-ctrl', 'maplibregl-ctrl-attrib');
    container.append(control);
    while (tasks.length) {
      assert.ok(callbacks < 10, 'Observer must settle instead of recursively rewriting identical class attributes');
      tasks.shift()();
    }
    assert.ok(callbacks > 0 && callbacks <= 3);
    assert.equal(container.classList.contains('mapboxgl-map'), true);
    assert.equal(control.classList.contains('mapboxgl-ctrl-attrib'), true);
    assert.deepEqual(map.queryRenderedFeatures(null, { layers: ['missing-mapbox-poi-layer'] }), []);
    assert.equal(queryCalls.length, 0);
    map.queryRenderedFeatures(null, { layers: ['missing-mapbox-poi-layer', 'fixture-marker'] });
    assert.deepEqual(queryCalls[0].options.layers, ['fixture-marker']);
    assert.deepEqual(map.querySourceFeatures('missing-vendor-source'), []);
    map.setConfigProperty('basemap', 'lightPreset', 'day');
    assert.ok(diagnostics.some(entry => entry.available === false && entry.capability === 'mapbox-basemap-config'));
    assert.equal(provider.capabilities.threeDimensionalBuildings, false);
    map.remove();
    assert.equal(observers.size, 0);
    assert.equal(map.removed, true);
  } finally {
    if (savedObserver === undefined) delete globalThis.MutationObserver;
    else globalThis.MutationObserver = savedObserver;
  }
});


async function deferredNativeMapFixture(name, beforeRendererImport = async () => {}) {
  const assets = new URL('../original-client/public/chatgpt.com/cdn/assets/', import.meta.url);
  const plan = JSON.parse(await fs.readFile(new URL('../src/native-client/entry-plan.json', import.meta.url), 'utf8'));
  const runtimeURL = new URL(plan.runtime.replace('/cdn/assets/', ''), assets);
  runtimeURL.searchParams.set('fixture', name);
  const { __webpack_require__: requireOriginal } = await import(runtimeURL);
  const originalImporter = requireOriginal.ir;
  const requests = [];
  const styleRequests = [];
  let rendererModule;
  requireOriginal.ir = async specifier => {
    if (!String(specifier).includes('/map-vendor/maplibre-gl.mjs')) return originalImporter(specifier);
    requests.push(new URL(specifier));
    await beforeRendererImport(requests.length);
    rendererModule = await originalImporter(specifier);
    return rendererModule;
  };
  const bootURL = new URL('../src/native-client/boot-adapter.mjs', import.meta.url);
  const boot = await fs.readFile(bootURL, 'utf8');
  assert.doesNotMatch(boot, /^import [^;\r\n]* from ['"][^'"]*maplibre-gl\.mjs['"]/m);
  const transformStart = boot.indexOf('const transforms = new Map()');
  const transformEnd = boot.indexOf('let nativeReadAloudBindings;', transformStart);
  const mapStart = boot.indexOf('const mapRendererURL =');
  const mapEnd = boot.indexOf("adaptFactory('ztxE'", mapStart);
  assert(transformStart >= 0 && transformEnd > transformStart && mapStart >= 0 && mapEnd > mapStart);
  const context = vm.createContext({
    URL, requireOriginal, installDeferredMapProvider, nativeAssetVersion: '1234567890abcdef',
    boundary: { diagnostics: [] }, notifyNativeLibrarySourceReady() {},
    document: {
      createElement(tag) {
        assert.equal(tag, 'link');
        return {};
      },
      head: { append(link) {
        assert.equal(link.rel, 'stylesheet');
        styleRequests.push(new URL(link.href));
        queueMicrotask(() => link.onload());
      } },
    },
  });
  const mapAdapter = boot.slice(mapStart, mapEnd).replaceAll('import.meta.url', JSON.stringify(bootURL.href));
  new vm.Script(boot.slice(transformStart, transformEnd) + mapAdapter +
    '\nglobalThis.fixtureMapProvider = localMapProvider;', { filename: 'native map boot fixture' }).runInContext(context);
  return {
    assets, requireOriginal, requests, styleRequests, mapProvider: context.fixtureMapProvider,
    getRendererModule: () => rendererModule,
  };
}

test('native map chunks share one deferred import and retain synchronous renderer and style exports', async () => {
  let release;
  const loading = new Promise(resolve => { release = resolve; });
  const f = await deferredNativeMapFixture('map-lazy-cached', () => loading);
  const native = f.requireOriginal;
  assert.equal(f.requests.length, 0);
  await native.e(685193);
  assert.equal(f.requests.length, 0);
  assert.equal(f.styleRequests.length, 0);

  let settled = false;
  const ready = Promise.all([native.e(118734), native.e(962984), native.e(962984)]).then(() => { settled = true; });
  try {
    await Promise.resolve();
    assert.equal(f.requests.length, 1);
    assert.equal(f.requests[0].searchParams.get('v'), '1234567890abcdef');
    assert.equal(f.styleRequests.length, 1);
    assert.match(f.styleRequests[0].pathname, /\/map-vendor\/maplibre-gl\.css$/);
    assert.equal(f.styleRequests[0].searchParams.get('v'), '1234567890abcdef');
    assert.equal(settled, false);
    assert.throws(() => f.mapProvider.renderer, /must load the renderer/);
  } finally {
    release();
    await ready;
  }
  const chunk = await import(new URL('async/118734.1618351696.js', f.assets));
  assert.equal(native.m.kiov, chunk.__webpack_modules__.kiov);
  const renderer = native('FxuF');
  assert.equal(Object.getPrototypeOf(renderer.Map), f.getRendererModule().Map);
  assert.match(renderer.getWorkerUrl(), /\/map-vendor\/maplibre-gl-worker\.mjs$/);
  const style = native('eS9I');
  assert.deepEqual(style.a.sources['local-osm-standard'].tiles, [OSM_TILE_TEMPLATE]);
  assert.deepEqual(style.b.sources['local-osm-standard'].tiles, [OSM_TILE_TEMPLATE]);
  assert.doesNotThrow(() => style.c(renderer));

  await Promise.all([native.e(118734), native.e(962984)]);
  assert.equal(f.requests.length, 1);
  assert.equal(f.styleRequests.length, 1);
  assert.equal(native('FxuF'), renderer);
  assert.equal(typeof native.m.kiov, 'function');
});

test('native map renderer failures reject awaited chunks and allow a subsequent location-map retry', async () => {
  const f = await deferredNativeMapFixture('map-lazy-retry', async attempt => {
    if (attempt === 1) throw new TypeError('Fixture MapLibre download failure');
  });
  const native = f.requireOriginal;
  await assert.rejects(Promise.all([native.e(118734), native.e(962984), native.e(962984)]), /Fixture MapLibre download failure/);
  assert.equal(f.requests.length, 1);
  assert.equal(native.c.FxuF, undefined);
  assert.throws(() => f.mapProvider.renderer, /must load the renderer/);

  await Promise.all([native.e(118734), native.e(962984)]);
  assert.equal(f.requests.length, 2);
  assert.equal(native('FxuF'), f.mapProvider.renderer);
  assert.equal(native('eS9I').a.name, 'OpenStreetMap');
  const chunk = await import(new URL('async/118734.1618351696.js', f.assets));
  assert.equal(native.m.kiov, chunk.__webpack_modules__.kiov);
});

test('reference pricing retains real USD major units, discloses regional fallback and never invents tax or Plus annual billing', async () => {
  const adapter = createLocalPricingAdapter();
  for (const scope of ['US', 'USD', 'CN']) {
    const quoted = await rpc(adapter, '/checkout_pricing_config/configs/' + scope);
    assert.equal(quoted.response.status, 200);
    assert.equal(quoted.body.country_code, 'US');
    assert.equal(quoted.body.currency_config.symbol_code, 'USD');
    assert.equal(quoted.body.currency_config.plus.month.amount, 20);
    assert.equal(quoted.body.currency_config.prolite.month.amount, 100);
    assert.equal(quoted.body.currency_config.pro.month.amount, 200);
    assert.equal(quoted.body.currency_config.promax.month.amount, 500);
    assert.equal(quoted.body.quote_only, true);
    assert.equal(quoted.body.quote_reference.regional_quote, false);
    assert.equal(quoted.body.quote_reference.requested_scope, scope);
    assert.equal(quoted.body.quote_reference.payment_execution_available, false);
    for (const plan of ['plus', 'prolite', 'pro', 'promax']) {
      assert.equal(quoted.body.currency_config[plan].year, undefined);
      assert.equal(quoted.body.currency_config[plan].month.tax, undefined);
    }
  }
  assert.equal((await rpc(adapter, '/checkout_pricing_config/configs/EUR')).response.status, 404);
  const invalid = await rpc(adapter, '/checkout_pricing_config/configs/%ZZ');
  assert.equal(invalid.response.status, 404);
  assert.equal(invalid.body.detail, 'Country config not found');
  assert.equal((await rpc(adapter, '/checkout_pricing_config/configs/US', 'POST', {})).response.status, 405);
  const changed = getLocalReferencePricingConfig('US');
  changed.currency_config.plus.month.amount = 1;
  assert.equal(getLocalReferencePricingConfig('US').currency_config.plus.month.amount, 20);
});

test('billing reads distinguish no OpenAI subscription, unavailable site balance and real API quota; checkout cannot claim payment', async () => {
  let membership = { planType: 'pro', enabled: true };
  const adapter = createLocalPricingAdapter({ readMembership: () => membership, now: () => Date.parse('2026-11-16T00:00:00Z') });
  assert.equal((await rpc(adapter, '/subscriptions')).body, null);
  assert.deepEqual((await rpc(adapter, '/payments/payment_methods')).body.payment_methods, []);
  assert.deepEqual((await rpc(adapter, '/payments/transaction-history')).body.transactions, []);
  assert.equal((await rpc(adapter, '/subscriptions/auto_top_up/settings')).body.is_enabled, false);
  const balance = (await rpc(adapter, '/accounts/neutral-local-account/customer-balance')).body;
  assert.equal(balance.balance, null);
  assert.equal(balance.api_quota, null);
  assert.equal(balance.adapter_scope, 'site-billing-only');
  const pro = await adapter.getMembershipView();
  assert.equal(pro.plan_type, 'pro');
  assert.equal(pro.has_openai_subscription, false);
  assert.equal(pro.local_only, true);
  membership = { planType: 'pro', expiresAt: '2020-01-01T00:00:00Z' };
  assert.equal((await adapter.getMembershipView()).plan_type, 'free');
  assert.equal(normalizeLocalMembership({ planType: 'pro', expiresAt: 'invalid' }).status, 'disabled');
  for (const endpoint of ['/payments/checkout', '/subscriptions', '/subscriptions/preview', '/payments/setup-intent']) {
    const attempt = await rpc(adapter, endpoint, 'POST', {});
    assert.equal(attempt.response.status, 501);
    assert.equal(attempt.body.payment_executed, false);
    for (const fake of ['client_secret', 'checkout_url', 'invoice', 'customer', 'subscription_id']) assert.ok(!Object.hasOwn(attempt.body, fake));
  }
  const broken = createLocalPricingAdapter({ readMembership: () => { throw Error('Trusted membership source unavailable'); } });
  await assert.rejects(() => broken.getMembershipView(), /Trusted membership source unavailable/);
});

const usageTime = Date.parse('2026-11-21T03:00:00Z');
const usageOwner = { id: 'site-user:fixture', accountId: 'fixture', role: 'user', planType: 'free', membershipSource: 'site-registration' };
const usageIdentity = { accountId: usageOwner.accountId, userId: usageOwner.id };
function workerUsage(plan = usageOwner, fields = {}) {
  return {
    plan,
    sources: [{
      source: 'site-docode', requests: 9, completed: 8, token_reports: 7, input_tokens: 83, output_tokens: 24,
      freeDaily: { requests: 3, limit: 20, resetsAt: Date.parse('2026-11-22T00:00:00Z') }, ...fields,
    }],
  };
}

test('the administrator grant has the Pro 500 reference while Pro trials keep their enrolled tier', () => {
  const admin = normalizeLocalMembership({ id: 'site-admin', role: 'administrator', membershipSource: 'site-administrator', planType: 'pro' });
  assert.equal(admin.plan_type, 'pro');
  assert.equal(admin.pro_tier, 500);
  assert.equal(admin.reference_monthly_amount, 500);
  assert.equal(admin.has_openai_subscription, false);
  assert.equal(normalizeLocalMembership({ id: 'other', planType: 'pro', role: 'user' }).pro_tier, 200);
});

test('native usage reports actual site counts and only makes a daily limit from an active Free meter', async () => {
  let membership = usageOwner, receipt = workerUsage();
  const diagnostic = [];
  const adapter = createLocalPricingAdapter({
    readMembership: () => membership, readUsageIdentity: () => usageIdentity,
    readUsage: ({ signal }) => {
      assert.ok(signal instanceof AbortSignal && !signal.aborted);
      return receipt;
    },
    now: () => usageTime, diagnostics: diagnostic,
  });
  const free = await rpc(adapter, '/wham/usage');
  assert.equal(free.response.status, 200);
  assert.equal(free.body.plan_type, 'free');
  assert.equal(free.body.user_id, usageIdentity.userId);
  assert.equal(free.body.account_id, usageIdentity.accountId);
  assert.deepEqual(free.body.rate_limit, {
    allowed: true, limit_reached: false,
    primary_window: { used_percent: 15, limit_window_seconds: 86400, reset_after_seconds: 75600, reset_at: 1795305600 },
    secondary_window: null,
  });
  assert.deepEqual(free.body.site_usage, { requests: 9, completed: 8, token_reports: 7, input_tokens: 83, output_tokens: 24 });
  assert.deepEqual(free.body.ambient_usage.default.menu.rows.map(row => row.value.text), ['9', '8', '7', '83', '24']);
  assert.equal(diagnostic.at(-1).capability, 'site-inference-usage');
  assert.equal(free.body.credits, null);

  receipt = workerUsage(usageOwner, { freeDaily: { requests: 20, limit: 20, resetsAt: usageTime + 1000 } });
  assert.equal((await rpc(adapter, '/wham/usage')).body.rate_limit.primary_window.used_percent, 100);
  assert.equal((await rpc(adapter, '/wham/usage')).body.rate_limit.limit_reached, true);
  receipt = workerUsage(usageOwner, { freeDaily: { requests: 20, limit: 20, resetsAt: usageTime } });
  assert.equal((await rpc(adapter, '/wham/usage')).body.rate_limit, null);

  membership = { ...usageOwner, planType: 'pro', siteTrial: { tier: 'promax', expiresAt: usageTime + 86400000 } };
  receipt = workerUsage(membership, { requests: 4, completed: 4, token_reports: 0, input_tokens: null, output_tokens: null });
  const paid = (await rpc(adapter, '/wham/usage')).body;
  assert.equal(paid.plan_type, 'pro');
  assert.equal(paid.rate_limit, null);
  assert.equal(paid.credits, null);
  assert.equal(paid.site_usage.input_tokens, null);
  assert.deepEqual(paid.ambient_usage.default.menu.rows.map(row => row.value.text), ['4', '4', '0']);
  assert.equal((await rpc(adapter, '/subscriptions')).body, null);
  assert.equal((await rpc(adapter, '/wham/usage', 'POST', {})).response.status, 405);
});

test('native usage rejects missing, unrelated and superseded usage receipts', async () => {
  let membership = usageOwner, receipt = null, failure = false;
  const adapter = createLocalPricingAdapter({
    readMembership: () => membership, readUsageIdentity: () => usageIdentity,
    readUsage: () => {
      if (failure) throw new Error('Unreachable');
      return receipt;
    },
    now: () => usageTime,
  });
  assert.equal((await rpc(adapter, '/wham/usage')).response.status, 404);
  receipt = workerUsage({ ...usageOwner, id: 'other-owner' });
  assert.equal((await rpc(adapter, '/wham/usage')).response.status, 404);
  receipt = workerUsage(usageOwner, { requests: 2, completed: 3 });
  assert.equal((await rpc(adapter, '/wham/usage')).response.status, 404);
  failure = true;
  assert.equal((await rpc(adapter, '/wham/usage')).response.status, 503);
  membership = null;
  assert.equal((await rpc(adapter, '/wham/usage')).response.status, 401);
  membership = usageOwner;
  const interrupted = createLocalPricingAdapter({
    readMembership: () => membership, readUsageIdentity: () => usageIdentity, now: () => usageTime,
    readUsage: async () => {
      membership = { ...usageOwner, id: 'signed-into-different-account' };
      return workerUsage();
    },
  });
  assert.equal((await rpc(interrupted, '/wham/usage')).response.status, 404);
});

test('actual original usage, pricing and plugin readers accept adapter DTOs', async () => {
  const shareFactories = JSON.parse(await fs.readFile(new URL('./support/native-portable-share-factories.json', import.meta.url), 'utf8'));
  const discoveryFactories = JSON.parse(await fs.readFile(new URL('./support/native-discovery-factories.json', import.meta.url), 'utf8'));
  const ranges = [...shareFactories.filter(row => row.id !== 'CKur' && row.id !== 'bsEp'), ...discoveryFactories];
  const context = vm.createContext({ console, setTimeout, clearTimeout, TextEncoder, TextDecoder, AbortController, AbortSignal, URL });
  const files = new Map(), factories = new Map(), loaded = new Map();
  // Query hooks and unrelated page/RPC branches are never invoked; only the
  // actual pure exported schemas/formatter/converters are exercised.
  const unusedDependencies = new Set(['S2r0', 'ufra', 'yZpl', 'D4ZO', 'SaEY', 'k7G6', 'SlNh', 'ueue', 'IRAT']);
  for (const range of ranges) {
    let source = files.get(range.file);
    if (!source) {
      source = (await fs.readFile(new URL('../' + range.file, import.meta.url), 'utf8'));
      files.set(range.file, source);
    }
    const original = source.slice(range.startUTF16, range.endUTF16);
    assert.equal(createHash('sha256').update(original).digest('hex'), range.sha256, 'Original source changed: ' + range.id);
    const expression = range.format === 'method' ? 'function ' + original : original;
    factories.set(range.id, new vm.Script('(' + expression + ')', { filename: range.file + '#' + range.id }).runInContext(context, { timeout: 1000 }));
  }
  function nativeRequire(id) {
    if (loaded.has(id)) return loaded.get(id).exports;
    if (unusedDependencies.has(id)) return {};
    assert.ok(factories.has(id), 'Pure original billing schema closure unexpectedly requested ' + id);
    const module = { exports: {} };
    loaded.set(id, module);
    factories.get(id)(module, module.exports, nativeRequire);
    return module.exports;
  }
  nativeRequire.d = (exports, getters = {}, values = {}) => {
    for (const [name, get] of Object.entries(getters)) Object.defineProperty(exports, name, { get, enumerable: true });
    for (const [name, value] of Object.entries(values)) Object.defineProperty(exports, name, { value, enumerable: true });
  };
  nativeRequire.o = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  nativeRequire.n = module => {
    const get = module?.__esModule ? () => module.default : () => module;
    Object.defineProperty(get, 'a', { get });
    return get;
  };
  nativeRequire.r = exports => Object.defineProperty(exports, '__esModule', { value: true });
  const schema = nativeRequire('z1SE').a;
  const usageAdapter = createLocalPricingAdapter({
    readMembership: () => usageOwner, readUsageIdentity: () => usageIdentity, readUsage: () => workerUsage(), now: () => usageTime,
  });
  const nativeUsage = nativeRequire('TDk3').a((await rpc(usageAdapter, '/wham/usage')).body);
  assert.equal(nativeUsage.ambient_usage.default.menu.rows[0].value.text, '9');
  assert.equal(nativeUsage.rate_limit.primary_window.limit_window_seconds, 86400);
  for (const scope of ['US', 'USD', 'CN']) {
    const result = schema.safeParse(getLocalReferencePricingConfig(scope));
    assert.equal(result.success, true, 'The real native price schema must parse the read DTO');
    assert.equal(result.data.currency_config.plus.month.amount, 20);
    assert.equal(Object.hasOwn(result.data, 'quote_only'), false, 'Native schema strips extra provider provenance');
  }
  for (const mutate of [
    price => { price.currency_config.plus.month.amount = -20; },
    price => { price.currency_config.plus.month.amount = '20'; },
    price => { price.currency_config.plus.month.tax = 'unverified-tax-label'; },
    price => { price.currency_config.symbol_code = ''; },
    price => { price.currency_config.minor_unit_exponent = 1.5; },
  ]) {
    const invalid = getLocalReferencePricingConfig('US');
    mutate(invalid);
    assert.equal(schema.safeParse(invalid).success, false);
  }
  let formattedAmount;
  const formatted = nativeRequire('PXhB').a({
    intl: { formatNumber(value, options) { formattedAmount = value; return new Intl.NumberFormat('en-US', options).format(value); } },
    amount: getLocalReferencePricingConfig('US').currency_config.plus.month.amount,
    currencyCode: 'USD', minorUnitExponent: 2,
  });
  assert.equal(formattedAmount, 20, 'Native formatter consumes major units directly');
  assert.match(formatted, /^\$20(?:\.00)?$/);
  const nativeCards = nativeRequire('aFrt');
  const env = pluginFixture();
  const home = (await rpc(env.adapter, '/ps/plugins/home')).body;
  for (const card of home.sections.flatMap(section => section.plugins)) {
    const native = nativeCards.e(card);
    assert.equal(native.id, card.id);
    assert.equal(native.displayName, card.display_name);
    assert.equal(native.logoPath, card.icon_url);
    assert.equal(native.source, 'plugin-service');
    assert.equal(native.installationPolicy, card.installation_policy);
    assert.equal(native.installed, undefined);
  }
  const row = PUBLIC_PLUGIN_CATALOG[0];
  const detail = (await rpc(env.adapter, '/ps/plugins/' + row.id)).body;
  const nativeDetail = nativeCards.f(detail);
  assert.equal(nativeDetail.id, row.id);
  assert.equal(nativeDetail.displayName, row.displayName);
  assert.equal(nativeDetail.description, row.shortDescription);
  assert.equal(nativeDetail.logoPath, new URL(row.assets.logo, new URL('../src/native-client/local-discovery.mjs', import.meta.url)).href);
  assert.equal(nativeDetail.status, 'ENABLED');
});
