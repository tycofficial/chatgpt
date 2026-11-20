/**
 * OSM raster/provider boundary for the original s2JQ ChatGptMapboxCanvas.
 * Its React tree, camera, markers, gestures and surrounding controls stay native.
 * MapLibre is an explicitly supplied compatible renderer, not a Mapbox auth shim.
 *
 * Original s2JQ/FxuF/eS9I/Y9T5: async/728289.8dbe1d1d50.js.
 * OSM policy: https://operations.osmfoundation.org/policies/tiles/
 * Renderer: https://maplibre.org/maplibre-gl-js/docs/examples/display-a-map/
 */
export const OSM_TILE_TEMPLATE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';
export const MAP_PROVIDER_SOURCE = Object.freeze({
  provider: 'OpenStreetMap Standard raster',
  policy: 'https://operations.osmfoundation.org/policies/tiles/',
  renderer: 'MapLibre GL JS 6.18.0',
  renderComponent: 's2JQ.ChatGptMapboxCanvas',
  rendererModule: 'FxuF', styleModule: 'eS9I',
  capturedLocationUsed: false, prefetch: false, offlineDownload: false,
});

export function createOpenStreetMapStyle() {
  return {
    version: 8,
    name: 'OpenStreetMap',
    metadata: { 'local:provider': 'osm-standard-raster' },
    sources: {
      'local-osm-standard': {
        type: 'raster',
        tiles: [OSM_TILE_TEMPLATE],
        tileSize: 256, minzoom: 0, maxzoom: 19,
        attribution: OSM_ATTRIBUTION,
      },
    },
    layers: [{
      id: 'local-osm-standard', type: 'raster', source: 'local-osm-standard',
      paint: { 'raster-opacity': 1 },
    }],
  };
}

/** Exact allowlist for the network boundary; no query/key/proxy/bulk endpoint. */
export function isOpenStreetMapTileRequest(input) {
  let url;
  try { url = new URL(typeof input === 'string' ? input : input.url); } catch { return false; }
  if (url.origin !== 'https://tile.openstreetmap.org' || url.search || url.hash ||
      url.username || url.password) return false;
  const match = /^\/(\d{1,2})\/(\d+)\/(\d+)\.png$/.exec(url.pathname);
  if (!match) return false;
  const z = Number(match[1]), x = Number(match[2]), y = Number(match[3]);
  return z <= 19 && x < 2 ** z && y < 2 ** z;
}

/**
 * Browser fetch keeps native HTTP caching and a valid site Referer. Do not
 * add no-cache headers, use a server proxy, prewarm views or cache an atlas.
 */
export function fetchOpenStreetMapTile(originalFetch, input, init) {
  const request = new Request(input, init);
  if (request.method !== 'GET' || !isOpenStreetMapTileRequest(request)) {
    throw new TypeError('Only an on-demand OSM standard raster tile GET is allowed');
  }
  const headers = new Headers(request.headers);
  for (const name of ['Authorization', 'Cookie', 'Cache-Control', 'Pragma']) headers.delete(name);
  return originalFetch(new Request(request, {
    headers, credentials: 'omit', cache: 'default',
    referrerPolicy: 'strict-origin-when-cross-origin',
    redirect: 'error',
  }));
}

function aliasOriginalMapClasses(container) {
  if (!container?.querySelectorAll) return;
  for (const element of [container, ...container.querySelectorAll('[class]')]) {
    for (const name of [...element.classList]) {
      if (!name.startsWith('maplibregl-')) continue;
      const alias = 'mapboxgl-' + name.slice(11);
      if (!element.classList.contains(alias)) element.classList.add(alias);
    }
  }
}

/**
 * Supply the official MapLibre module. Original code's mapbox-specific
 * basemap config has no corresponding layer in raster OSM. We declare that
 * capability absent, while its actual camera/markers/gestures remain working.
 */
export function createLocalMapProvider({ renderer, diagnostics = [] } = {}) {
  if (typeof renderer?.Map !== 'function' || typeof renderer?.AttributionControl !== 'function') {
    throw new TypeError('The official compatible MapLibre renderer is required');
  }
  const report = capability => diagnostics.push({
    type: 'local-map-capability', capability, available: false,
    provider: 'osm-standard-raster',
  });
  class LocalRasterMap extends renderer.Map {
    constructor(options = {}) {
      const { config, accessToken, ...nativeOptions } = options;
      super({
        ...nativeOptions,
        style: createOpenStreetMapStyle(),
        attributionControl: false,
        // Only normal visible-view requests; no speculative zoom stack.
        cancelPendingTileRequestsWhileZooming: true,
        refreshExpiredTiles: true,
      });
      this.addControl(new renderer.AttributionControl({
        compact: false, customAttribution: OSM_ATTRIBUTION,
      }), 'bottom-right');
      const container = this.getContainer();
      aliasOriginalMapClasses(container);
      if (typeof MutationObserver === 'function') {
        this.localClassObserver = new MutationObserver(() => aliasOriginalMapClasses(container));
        this.localClassObserver.observe(container, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
      }
      this.on('error', event => diagnostics.push({
        type: 'local-map-provider-error',
        message: String(event?.error?.message ?? 'Map renderer failed'),
        provider: 'osm-standard-raster',
      }));
    }
    setStyle(_style, options) {
      // Both original theme constants resolve to this same honest provider.
      return super.setStyle(createOpenStreetMapStyle(), options);
    }
    setConfigProperty() { report('mapbox-basemap-config'); return this; }
    getConfigProperty() { return undefined; }
    getConfig() { return {}; }
    setConfig() { report('mapbox-basemap-config'); return this; }
    queryRenderedFeatures(geometry, options) {
      if (options?.layers) {
        const layers = options.layers.filter(id => !!this.getLayer(id));
        if (!layers.length) return [];
        return super.queryRenderedFeatures(geometry, { ...options, layers });
      }
      return super.queryRenderedFeatures(geometry, options);
    }
    querySourceFeatures(id, options) {
      return this.getSource(id) ? super.querySourceFeatures(id, options) : [];
    }
    remove() {
      this.localClassObserver?.disconnect();
      return super.remove();
    }
  }

  const facade = { ...renderer, Map: LocalRasterMap };
  if (typeof facade.supported !== 'function') {
    facade.supported = () => {
      if (typeof document === 'undefined') return false;
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('webgl2');
      context?.getExtension('WEBGL_lose_context')?.loseContext();
      return !!context;
    };
  }
  return Object.freeze({
    renderer: facade,
    createStyle: createOpenStreetMapStyle,
    // Raster labels are baked into OSM tiles; no Mapbox RTL worker is used.
    configureRenderer() {
      const workerURL = new URL('./map-vendor/maplibre-gl-worker.mjs', import.meta.url);
      workerURL.search = new URL(import.meta.url).search;
      renderer.setWorkerUrl?.(workerURL.href);
    },
    source: MAP_PROVIDER_SOURCE,
    capabilities: Object.freeze({
      rasterMap: true, camera: true, markers: true, gestures: true,
      vectorPoiLabels: false, threeDimensionalBuildings: false,
      capturedPersonalLocation: false,
    }),
  });
}


// s2JQ is registered by three map chunks; FxuF also serves location pickers.
const mapChunks = new Set([728289, 194313, 437896, 962984]);

export function installDeferredMapProvider(requireOriginal, { loadRenderer, diagnostics } = {}) {
  let provider;
  let pending;
  const readProvider = () => {
    if (!provider) throw Error('The native map chunk must load the renderer before accessing its exports.');
    return provider;
  };
  requireOriginal.f.siteMapRenderer = (chunkId, promises) => {
    if (provider || !mapChunks.has(chunkId)) return;
    pending ??= Promise.resolve().then(loadRenderer).then(renderer => {
      const loaded = createLocalMapProvider({ renderer, diagnostics });
      loaded.configureRenderer();
      provider = loaded;
    }).catch(error => {
      pending = undefined;
      throw error;
    });
    promises.push(pending);
  };
  return Object.freeze({
    get renderer() { return readProvider().renderer; },
    createStyle: createOpenStreetMapStyle,
    configureRenderer() { readProvider(); },
  });
}
