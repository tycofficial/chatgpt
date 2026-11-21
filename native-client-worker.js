import {BrowserWorkspaceStore,workspacePath} from './native-client/browser-tool-executor.mjs?v=5c7eb02b441bce39';
const workspace=new BrowserWorkspaceStore();
const SOURCE_BUILD="b6348792a294e8e04a67660959ba41914937938f";
const BASE=new URL('./',self.location.href).pathname;
const CACHE='chatgpt-original-assets-'+SOURCE_BUILD;
const SHELL_CACHE='chatgpt-native-shell-5c7eb02b441bce39';
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
function mirror(url){
 if(url.origin===self.location.origin&&url.pathname.startsWith('/cdn/assets/'))return new URL(BASE+'original-client/public/chatgpt.com'+url.pathname,self.location.origin);
 if(url.origin==='https://chatgpt.com'&&url.pathname.startsWith('/cdn/assets/'))return new URL(BASE+'original-client/public/chatgpt.com'+url.pathname,self.location.origin);
 if(url.origin==='https://cdn.oaistatic.com')return new URL(BASE+'original-client/public/cdn.oaistatic.com'+url.pathname,self.location.origin);
 return null;
}
async function fetchPublicAsset(request){
 try{
  const page=await fetch(request);
  if(![502,503,504].includes(page.status)||request.signal?.aborted||self.navigator?.onLine===false)return page;
  if(page.body)void page.body.cancel().catch(()=>{});
 }catch(error){
  if(request.signal?.aborted||self.navigator?.onLine===false)throw error;
 }
 return fetch(request,{cache:'reload'});
}
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const requested=new URL(event.request.url);
 const artifactPrefix=BASE+'__local_artifacts/';
 if(requested.origin===self.location.origin&&requested.pathname.startsWith(artifactPrefix)){
  event.respondWith((async()=>{try{
   const parts=requested.pathname.slice(artifactPrefix.length).split('/'),thread=decodeURIComponent(parts.shift()),name=workspacePath(parts.map(decodeURIComponent).join('/'));
   const bytes=await workspace.read(encodeURIComponent(thread)+'/'+name);
   const types={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',svg:'image/svg+xml',pdf:'application/pdf',txt:'text/plain',md:'text/markdown',csv:'text/csv',json:'application/json',html:'text/html'};
   return new Response(bytes,{headers:{'Content-Type':types[name.split('.').at(-1)]||'application/octet-stream','Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(name.split('/').at(-1)),'Cache-Control':'private,no-store','X-Content-Type-Options':'nosniff'}});
  }catch{return new Response('File not found in this browser workspace',{status:404});}})());return;
 }
 const subpath=requested.pathname.slice(BASE.length);
 const uiNavigation=!/^(?:_orbit-renderer|native-client|original-client|__local_artifacts|__codex-api|backend-api|api|sync)(?:\/|$)/.test(subpath)&&(!/\.[a-z0-9]+$/i.test(subpath)||/\bindex\.html$/.test(subpath));
 if(event.request.mode==='navigate'&&requested.origin===self.location.origin&&requested.pathname.startsWith(BASE)&&uiNavigation){
  event.respondWith((async()=>{const cache=await caches.open(SHELL_CACHE).catch(()=>null),key=new URL(BASE+'index.html',self.location.origin).href;
   const saved=cache&&await cache.match(key).catch(()=>null);
   if(saved&&!requested.searchParams.has('__native_release')&&/^(?:index\.html)?$/.test(subpath))return saved;
   try{let page=await fetch(event.request,{cache:'no-store'});if(page.status===404)page=await fetch(key,{cache:'no-store'});if(page.ok&&cache&&/^text\/html(?:;|$)/i.test(page.headers.get('Content-Type')||''))await cache.put(key,page.clone()).catch(()=>{});return page;}
   catch(error){if(saved)return saved;throw error;}
  })());return;
 }
 // The import map already points most chunks directly at their Pages URLs.
 // Only immutable public assets belong here. Keep account data and release discovery on the network.
 const relative=requested.pathname.slice(BASE.length);
 const own=requested.origin===self.location.origin&&requested.pathname.startsWith(BASE);
 const revision=requested.search==='?v=5c7eb02b441bce39';
 const nativeStatic=revision&&(/^(?:native-client\/[a-zA-Z0-9_./-]+\.(?:mjs|js|json|css)|(?:runtime|config|model-catalog|release-updater|python-worker)\.js)$/.test(relative))&&!relative.endsWith('/active.json');
 const immutable=!requested.search&&/^original-client\/public\/(?:chatgpt\.com\/cdn\/assets|cdn\.oaistatic\.com\/assets)\/(?:[a-zA-Z0-9_-]+\/)*(?:[a-zA-Z0-9_-]+[.-])?[0-9a-f]{8,64}\.(?:js|mjs|json|css|woff2|png|webp|svg)$/.test(relative);
 if(own&&(nativeStatic||immutable)&&!event.request.headers.has('authorization')&&!event.request.headers.has('range')){
  event.respondWith((async()=>{
   const cache=await caches.open(immutable?CACHE:SHELL_CACHE).catch(()=>null);
   const hit=cache&&await cache.match(event.request.url).catch(()=>null);
   if(hit)return hit;
   const response=await fetchPublicAsset(event.request);
   if(cache&&response.ok&&response.status===200){
    const save=cache.put(event.request.url,response.clone()).catch(()=>{});
    event.waitUntil?.(save);
   }
   return response;
  })());return;
 }
 const mapped=mirror(requested);if(!mapped)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE).catch(()=>null),cached=cache?await cache.match(event.request.url).catch(()=>null):null;if(cached)return cached;
  const fetched=await fetch(mapped,{credentials:'omit',redirect:'error'});
  const headers=new Headers(fetched.headers);headers.delete('content-encoding');headers.delete('content-length');headers.set('Access-Control-Allow-Origin','*');headers.set('Cross-Origin-Resource-Policy','cross-origin');
  const response=new Response(fetched.body,{status:fetched.status,statusText:fetched.statusText,headers});
  if(response.ok&&cache)await cache.put(event.request.url,response.clone()).catch(()=>{});return response;
 })());
});
