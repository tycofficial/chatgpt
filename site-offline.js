const RELEASE = '2026.11.21.1';
const cacheKey = `tyc-workspace-${RELEASE}`;
const home = new URL(self.registration.scope);
const entry = new URL(`src/native-client/workspace-app.mjs?v=${RELEASE}`, home);
const styles = new URL(`workspace.css?v=${RELEASE}`, home);
const staticPaths = new Set(['config.js', 'model-catalog.js', 'runtime.js', 'python-worker.js', 'workspace.css']);
function isWorkspaceAsset(url) {
  if (url.origin !== home.origin || !url.pathname.startsWith(home.pathname)) return false;
  const name = url.pathname.slice(home.pathname.length);
  return staticPaths.has(name) || name.startsWith('src/native-client/') || name.startsWith('vendor/');
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheKey);
    await cache.addAll([home, entry, styles].map(url => new Request(url, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const all = await caches.keys();
    await Promise.all(all.filter(key => key.startsWith('tyc-workspace-') && key !== cacheKey).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'cache-workspace-assets' || !Array.isArray(event.data.resources) || !event.source?.url) return;
  if (new URL(event.source.url).origin !== home.origin) return;
  event.waitUntil((async () => {
    const cache = await caches.open(cacheKey);
    const resources = new Set(event.data.resources.slice(0, 250).filter(value => {
      try { return isWorkspaceAsset(new URL(value)); } catch { return false; }
    }));
    await Promise.allSettled([...resources].map(async value => {
      if (await cache.match(value)) return;
      const result = await fetch(value, { credentials: 'omit' });
      if (result.ok && !result.redirected) await cache.put(value, result);
    }));
  })());
});
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== home.origin || !url.pathname.startsWith(home.pathname)) return;
  const navigation = request.mode === 'navigate';
  if (!navigation && !isWorkspaceAsset(url)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheKey);
    try {
      const response = await fetch(request);
      if (response.ok && !response.redirected) {
        const key = navigation && url.pathname === home.pathname ? home : navigation ? null : request;
        if (key) await cache.put(key, response.clone()).catch(() => {});
      }
      return response;
    } catch {
      return await cache.match(navigation ? home : request) || Response.error();
    }
  })());
});
