import { BrowserWorkspaceStore, workspacePath } from './native-client/browser-tool-executor.mjs?v=771721901c169502';
const workspace = new BrowserWorkspaceStore();
const artifactPrefix = new URL('./__local_artifacts/', self.location.href).pathname;
const contentTypes = {
 png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
 svg: 'image/svg+xml', pdf: 'application/pdf', txt: 'text/plain', md: 'text/markdown',
 csv: 'text/csv', json: 'application/json', html: 'text/html',
};
const privateHeaders = { 'Cache-Control': 'private,no-store', 'X-Content-Type-Options': 'nosniff' };

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
 if (event.request.method !== 'GET') return;
 const url = new URL(event.request.url);
 if (url.origin !== self.location.origin || !url.pathname.startsWith(artifactPrefix)) return;

 event.respondWith((async () => {
  try {
   const parts = url.pathname.slice(artifactPrefix.length).split('/');
   const thread = decodeURIComponent(parts.shift());
   const name = workspacePath(parts.map(decodeURIComponent).join('/'));
   const bytes = await workspace.read(encodeURIComponent(thread) + '/' + name);
   const extension = name.split('.').at(-1);
   return new Response(bytes, { headers: {
    ...privateHeaders,
    'Content-Type': typeof contentTypes[extension] === 'string' ? contentTypes[extension] : 'application/octet-stream',
    'Content-Disposition': "attachment; filename*=UTF-8''" + encodeURIComponent(name.split('/').at(-1)),
   } });
  } catch {
   return new Response('File not found in this browser workspace', { status: 404, headers: privateHeaders });
  }
 })());
});
