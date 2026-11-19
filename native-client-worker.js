import {BrowserWorkspaceStore,workspacePath} from './native-client/browser-tool-executor.mjs?v=63a859e6c683b1b3';
const workspace=new BrowserWorkspaceStore();
const SOURCE_BUILD="ef0c3fb941611420d8683bf88f61acf1a8ac6b19";
const BASE=new URL('./',self.location.href).pathname;
const CACHE='chatgpt-original-assets-ef0c3fb941611420d8683bf88f61acf1a8ac6b19';
const SHELL_CACHE='chatgpt-native-shell-63a859e6c683b1b3';
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
function bounded(promise,ms){let timer;return Promise.race([Promise.resolve(promise),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Cache operation timed out')),ms);})]).finally(()=>clearTimeout(timer));}
async function removeOldCaches(){
 let names;try{names=await bounded(caches.keys(),1500);}catch{return;}
 await Promise.allSettled(names.filter(name=>(name.startsWith('chatgpt-original-assets-')||name.startsWith('chatgpt-native-shell-'))&&name!==CACHE&&name!==SHELL_CACHE).map(name=>bounded(caches.delete(name),1500)));
}
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 try{await bounded(self.clients.claim(),2000);}catch{}
 await removeOldCaches();
})()));
async function openCache(name){try{return await bounded(caches.open(name),1000);}catch{return null;}}
async function cacheMatch(cache,key){if(!cache)return null;try{return await bounded(cache.match(key),1000);}catch{return null;}}
async function cachePut(cache,key,response){if(!cache)return;try{await bounded(cache.put(key,response),1200);}catch{}}
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
  event.respondWith((async()=>{const cachePromise=openCache(SHELL_CACHE),key=new URL(BASE+'index.html',self.location.origin).href;
   try{let page=await fetch(event.request,{cache:'no-store'});if(page.status===404)page=await fetch(key,{cache:'no-store'});if(page.ok)await cachePut(await cachePromise,key,page.clone());return page;}
   catch(error){const saved=await cacheMatch(await cachePromise,key);if(saved)return saved;throw error;}
  })());return;
 }
 const mapped=mirror(requested);if(!mapped)return;
 event.respondWith((async()=>{
  const cachePromise=openCache(CACHE),cached=await cacheMatch(await cachePromise,event.request.url);if(cached)return cached;
  const fetched=await fetch(mapped,{credentials:'omit',redirect:'error'});
  const headers=new Headers(fetched.headers);headers.delete('content-encoding');headers.delete('content-length');headers.set('Access-Control-Allow-Origin','*');headers.set('Cross-Origin-Resource-Policy','cross-origin');
  const response=new Response(fetched.body,{status:fetched.status,statusText:fetched.statusText,headers});
  if(response.ok)await cachePut(await cachePromise,event.request.url,response.clone());return response;
 })());
});
