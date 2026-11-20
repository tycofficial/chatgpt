import {BrowserWorkspaceStore,workspacePath} from './native-client/browser-tool-executor.mjs?v=9e6124f65633571c';
const workspace=new BrowserWorkspaceStore();
const SOURCE_BUILD="ef0c3fb941611420d8683bf88f61acf1a8ac6b19";
const BASE=new URL('./',self.location.href).pathname;
const CACHE='chatgpt-original-assets-'+SOURCE_BUILD;
const SHELL_CACHE='chatgpt-native-shell-9e6124f65633571c';
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
function mirror(url){
 if(url.origin===self.location.origin&&url.pathname.startsWith('/cdn/assets/'))return new URL(BASE+'original-client/public/chatgpt.com'+url.pathname,self.location.origin);
 if(url.origin==='https://chatgpt.com'&&url.pathname.startsWith('/cdn/assets/'))return new URL(BASE+'original-client/public/chatgpt.com'+url.pathname,self.location.origin);
 if(url.origin==='https://cdn.oaistatic.com')return new URL(BASE+'original-client/public/cdn.oaistatic.com'+url.pathname,self.location.origin);
 return null;
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
 if(event.request.mode==='navigate'&&requested.origin===self.location.origin&&requested.pathname.startsWith(BASE)&&!requested.pathname.startsWith(BASE+'_orbit-renderer/')){
  event.respondWith((async()=>{const cache=await caches.open(SHELL_CACHE).catch(()=>null),key=new URL(BASE+'index.html',self.location.origin).href;
   try{let page=await fetch(event.request,{cache:'no-store'});if(page.status===404)page=await fetch(key,{cache:'no-store'});if(page.ok&&cache)await cache.put(key,page.clone()).catch(()=>{});return page;}
   catch(error){const saved=cache?await cache.match(key).catch(()=>null):null;if(saved)return saved;throw error;}
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
