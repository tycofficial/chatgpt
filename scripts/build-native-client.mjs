/** Package the intact original client; only our declared host/service seams change. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const referenceInput=path.join(root,'.test-output/original-client-prototype');
const input=path.join(root,'src/native-client');
const output=path.join(root,'native-client');
const helpers=['boot-adapter.mjs','service-boundary.mjs','synthetic-bootstrap.mjs','public-auth-envelope.mjs','local-identity.mjs','local-configuration.mjs','local-user-preferences.mjs','local-host-settings.mjs','local-work-policy.mjs','local-pubsub.mjs','model-catalog-adapter.mjs','local-app-server.mjs','classic-chat-adapter.mjs','entry-library.mjs'];
if(process.argv.includes('--from-reference')){
 await fs.mkdir(input,{recursive:true});
 for(const name of [...helpers,'entry-plan.json']){const file=path.join(input,name),temporary=file+'.'+process.pid+'.tmp';await fs.writeFile(temporary,await fs.readFile(path.join(referenceInput,name)));await fs.rename(temporary,file);}
}
const raw=new Map(await Promise.all(helpers.map(async name=>[name,await fs.readFile(path.join(input,name),'utf8')])));
const plan=JSON.parse(await fs.readFile(path.join(input,'entry-plan.json'),'utf8'));
const sourceBuild='ef0c3fb941611420d8683bf88f61acf1a8ac6b19';
const deploymentBase='/'+(process.env.PUBLIC_BASE_PATH||'chatgpt').replace(/^\/+|\/+$/g,'')+'/';
const release=crypto.createHash('sha256').update([...raw.values()].join('\n')).update(await fs.readFile(fileURLToPath(import.meta.url))).update(await fs.readFile(path.join(root,'config.js'))).update(await fs.readFile(path.join(root,'model-catalog.js'))).digest('hex').slice(0,16);
await fs.mkdir(output,{recursive:true});
async function write(file,data){const temporary=file+'.'+process.pid+'.tmp';await fs.writeFile(temporary,data);await fs.rename(temporary,file);}
function replace(text,from,to){if(!text.includes(from))throw Error('Missing packaging seam: '+from);return text.replaceAll(from,()=>to);}
const provenance=[];
for(const [name,original]of raw){
 let text=original;
 if(name==='boot-adapter.mjs'){
  text=replace(text,"fetch('/__prototype/entry-plan.json')","fetch(new URL('./entry-plan.json?v="+release+"', import.meta.url))");
  text=replace(text,'installSyntheticDocumentState();',"installSyntheticDocumentState();\nif (globalThis.__CHATGPT_REPLICA_ENV__) window.__reactRouterContext.basename = globalThis.__CHATGPT_REPLICA_ENV__.basePath.replace(/\\/$/, '') || '/';");
 }
 if(name==='entry-library.mjs')text=replace(text,'/__prototype/entry-library.mjs','./entry-library.mjs?v='+release);
 if(name==='local-identity.mjs'){
  text=replace(text,"enabled = globalThis.sessionStorage.getItem(toggleKey) === '1';","enabled = globalThis.sessionStorage.getItem(toggleKey) === '1' || (globalThis.sessionStorage.getItem(toggleKey) === null && globalThis.__CHATGPT_REPLICA_ENV__?.localIdentity === true);");
  text=text.replaceAll('本地原型','本地账户');
 }
 if(name==='service-boundary.mjs'){
  text=replace(text,"const local = url.origin === location.origin;","const local = url.origin === location.origin;\n    const deploymentBase = globalThis.__CHATGPT_REPLICA_ENV__?.basePath || '/';\n    const adapterPrefix = new URL('./', import.meta.url).pathname;\n    if (local && (url.pathname.startsWith(adapterPrefix) || url.pathname.startsWith(deploymentBase+'original-client/public/'))) {\n      const headers = new Headers(request.headers); headers.delete('Authorization'); headers.delete('Cookie');\n      return originalFetch(new Request(request, {headers,credentials:'omit'}));\n    }");
  text=replace(text,'// Log the contract name, never query parameters, headers or payload values.',"// Normalize the deployment basename at the service boundary.\n    if (local && deploymentBase !== '/' && url.pathname.startsWith(deploymentBase)) url.pathname = '/' + url.pathname.slice(deploymentBase.length);\n    // Log the contract name, never query parameters, headers or payload values.");
 }
 text=text.replace(/(\bfrom\s*|\bimport\s*)(['"])\.\/(model-catalog|config|runtime)\.js\2/g,(_match,prefix,quote,module)=>prefix+quote+'../'+module+'.js?v='+release+quote);
 text=text.replace(/(\bfrom\s*|\bimport\s*)(['"])(\.\/[^'"?]+\.mjs)\2/g,(_match,prefix,quote,specifier)=>prefix+quote+specifier+'?v='+release+quote);
 await write(path.join(output,name),text);
 provenance.push({file:name,inputSha256:crypto.createHash('sha256').update(original).digest('hex'),publishedSha256:crypto.createHash('sha256').update(text).digest('hex')});
}
plan.registrationEntry='./entry-library.mjs?v='+release;
plan.status='original-module-graph-with-local-service-adapter';
await write(path.join(output,'entry-plan.json'),JSON.stringify(plan,null,2)+'\n');
const bootstrap=`const rootURL = new URL('../', import.meta.url);
globalThis.__CHATGPT_REPLICA_ENV__ = Object.freeze({basePath:rootURL.pathname,localIdentity:true,useOriginalAuth:true,release:${JSON.stringify(release)},sourceBuild:${JSON.stringify(sourceBuild)}});
const workerURL = new URL('native-client-worker.js?v='+${JSON.stringify(release)}, rootURL);
if (!navigator.serviceWorker) throw Error('This browser does not support the original-client asset host');
await navigator.serviceWorker.register(workerURL,{scope:rootURL.pathname,type:'module',updateViaCache:'none'});
await navigator.serviceWorker.ready;
if (!navigator.serviceWorker.controller || !new URL(navigator.serviceWorker.controller.scriptURL).pathname.endsWith('/native-client-worker.js')) {
 await new Promise((resolve,reject)=>{const done=()=>{clearTimeout(timer);navigator.serviceWorker.removeEventListener('controllerchange',done);resolve();};const timer=setTimeout(()=>reject(Error('Original asset host did not become ready')),20000);navigator.serviceWorker.addEventListener('controllerchange',done);if(navigator.serviceWorker.controller)done();});
}
await import('./boot-adapter.mjs?v='+${JSON.stringify(release)});
`;
await write(path.join(output,'bootstrap.mjs'),bootstrap);
const worker=`const SOURCE_BUILD=${JSON.stringify(sourceBuild)};
const BASE=new URL('./',self.location.href).pathname;
const CACHE='chatgpt-original-assets-'+SOURCE_BUILD;
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
 const mapped=mirror(new URL(event.request.url));if(!mapped)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE),cached=await cache.match(event.request.url);if(cached)return cached;
  const fetched=await fetch(mapped,{credentials:'omit',redirect:'error'});
  const headers=new Headers(fetched.headers);headers.delete('content-encoding');headers.delete('content-length');headers.set('Access-Control-Allow-Origin','*');headers.set('Cross-Origin-Resource-Policy','cross-origin');
  const response=new Response(fetched.body,{status:fetched.status,statusText:fetched.statusText,headers});
  if(response.ok)await cache.put(event.request.url,response.clone());return response;
 })());
});
`;
await write(path.join(root,'native-client-worker.js'),worker);
const html=`<!DOCTYPE html>
<html class="chatgpt-theme" lang="zh-CN" dir="ltr" data-theme="light" data-appearance-preset="codex" data-ios="false" data-build="${sourceBuild}" data-client-build-revision="${sourceBuild}" data-icon-sprite-url="/cdn/assets/icons-65c0f11497ac4847.svg" data-codex-cli-version="0.171.0-alpha.2" data-codex-window-type="browser" data-window-type="browser" data-native-client-release="${release}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="${deploymentBase}original-client/public/chatgpt.com/cdn/assets/c7fcb2505631.css"><style data-codex-app-themes></style><title>ChatGPT</title></head>
<body><script type="module" src="${deploymentBase}native-client/bootstrap.mjs?v=${release}"></script></body></html>
`;
await write(path.join(root,'native-client-shell.html'),html);
await write(path.join(output,'adapter-provenance.json'),JSON.stringify({sourceBuild,release,sourceEntry:plan.sourceEntrySha256,runtime:plan.runtime,manifest:plan.manifest,componentFactoriesModified:false,legacyUiImported:false,serviceAdapter:'Browser-local account/storage and the explicitly configured API; no original private backend or Google authentication is claimed.',helpers:provenance},null,2)+'\n');
if(process.argv.includes('--activate')){
 const backup=path.join(root,'.test-output/index-before-native-client.html');
 try{await fs.access(backup);}catch{await fs.copyFile(path.join(root,'index.html'),backup);}
 await write(path.join(root,'index.html'),html);
 await write(path.join(root,'404.html'),html);
 await write(path.join(output,'active.json'),JSON.stringify({active:true,release,sourceBuild,originalComponentGraph:true,backend:'local-adapters-and-configured-api'},null,2)+'\n');
}
console.log(JSON.stringify({release,helpers:helpers.length,sourceBuild,activated:process.argv.includes('--activate'),shell:'native-client-shell.html'}));
