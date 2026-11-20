/** Package the intact original client; only our declared host/service seams change. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const referenceInput=path.join(root,'.test-output/original-client-prototype');
const input=path.join(root,'src/native-client');
const output=path.join(root,'native-client');
const helpers=['boot-adapter.mjs','startup-compatibility.mjs','image-input-compression.mjs','service-boundary.mjs','provider-routing.mjs','local-native-read-aloud.mjs','local-web-search.mjs','preferred-host-transport.mjs','synthetic-bootstrap.mjs','public-auth-envelope.mjs','local-identity.mjs','local-token-identity.mjs','site-account.mjs','chat-history-sync.mjs','account-history-coordinator.mjs','native-cloud-sync-feedback.mjs','local-model-selection-policy.mjs','local-configuration.mjs','local-user-preferences.mjs','local-personalization-service.mjs','local-personalization-context.mjs','local-host-settings.mjs','local-work-policy.mjs','local-codex-adapter.mjs','local-dot-adapter.mjs','local-map-provider.mjs','local-maps-service.mjs','local-discovery.mjs','public-plugin-catalog.mjs','local-pubsub.mjs','model-catalog-adapter.mjs','local-app-server.mjs','classic-chat-adapter.mjs','portable-conversation-share.mjs','classic-response-branches.mjs','classic-input-messages.mjs','agent-turn-runner.mjs','site-ultra-orchestrator.mjs','browser-tool-executor.mjs','local-document-extraction.mjs','document-text-worker.mjs','local-ooxml-container.mjs','local-office-xml.mjs','local-xlsx-extraction.mjs','local-pptx-extraction.mjs','local-files-service.mjs','local-library-service.mjs','local-library-publisher.mjs','published-resource-rehydration.mjs','native-library-refresh.mjs','native-publication-references.mjs','native-workspace-references.mjs','native-file-reference-composition.mjs','local-native-upload.mjs','local-native-download.mjs','local-workspace-download-source.mjs','local-workspace-download-service.mjs','owned-download-transport.mjs','local-input-preparation.mjs','local-pricing.mjs','entry-library.mjs'];
if(new Set(helpers).size!==helpers.length)throw Error('Duplicate native helper declaration');
if(process.argv.includes('--from-reference')){
 await fs.mkdir(input,{recursive:true});
 for(const name of [...helpers,'entry-plan.json']){const file=path.join(input,name),temporary=file+'.'+process.pid+'.tmp';await fs.writeFile(temporary,await fs.readFile(path.join(referenceInput,name)));await fs.rename(temporary,file);}
}
const raw=new Map(await Promise.all(helpers.map(async name=>[name,await fs.readFile(path.join(input,name),'utf8')])));
const entryPlanInput=await fs.readFile(path.join(input,'entry-plan.json'),'utf8');
const plan=JSON.parse(entryPlanInput);
const sourceBuild='ef0c3fb941611420d8683bf88f61acf1a8ac6b19';
const publicAssets=[];
async function collectAssets(directory){
 let entries;try{entries=await fs.readdir(path.join(input,directory),{withFileTypes:true});}catch(error){if(error.code==='ENOENT')return;throw error;}
 for(const entry of entries.sort((a,b)=>a.name.localeCompare(b.name))){const relative=directory+'/'+entry.name;if(entry.isDirectory())await collectAssets(relative);else if(entry.isFile())publicAssets.push({relative,bytes:await fs.readFile(path.join(input,relative))});else throw Error('Unexpected resource link: '+relative);}
}
await collectAssets('map-vendor');await collectAssets('plugin-assets');await collectAssets('dot-assets');await collectAssets('document-vendor');await collectAssets('office-vendor');await collectAssets('artifact-assets');
const supplementalManifestFile='original-client/dot-renderer-manifest.json';
const supplementalManifestBytes=await fs.readFile(path.join(root,supplementalManifestFile));
const supplementalManifest=JSON.parse(supplementalManifestBytes);
if(supplementalManifest.format!=='exact-public-dot-renderer-v1'||supplementalManifest.failures.length||supplementalManifest.summary.pending)throw Error('Incomplete public Dot renderer resource graph');
const supplementalAssets=[];
for(const asset of supplementalManifest.assets){
 if(!asset.path.startsWith('_orbit-renderer/')||asset.path.split('/').includes('..'))throw Error('Unexpected original renderer asset path');
 const bytes=await fs.readFile(path.join(root,asset.path));
 if(bytes.length!==asset.bytes||crypto.createHash('sha256').update(bytes).digest('hex')!==asset.sha256)throw Error('Original renderer resource differs: '+asset.path);
 supplementalAssets.push({file:asset.path,bytes});
}
const deploymentBase='/'+(process.env.PUBLIC_BASE_PATH||'chatgpt').replace(/^\/+|\/+$/g,'')+'/';
const builderBytes=await fs.readFile(fileURLToPath(import.meta.url));
const sharedAssetInputs=['config.js','model-catalog.js','runtime.js','python-worker.js','release-updater.js'].map(file=>({file,...(['python-worker.js','model-catalog.js'].includes(file)?{inputFile:'src/native-client/'+file}:{})}));
const sharedAssets=await Promise.all(sharedAssetInputs.map(async asset=>({...asset,bytes:await fs.readFile(path.join(root,asset.inputFile??asset.file))})));
const releaseHash=crypto.createHash('sha256').update([...raw.values()].join('\n')).update(builderBytes).update(entryPlanInput).update(deploymentBase);
for(const asset of sharedAssets)releaseHash.update(asset.file).update(asset.bytes);
for(const asset of publicAssets)releaseHash.update(asset.relative).update(asset.bytes);
releaseHash.update(supplementalManifestFile).update(supplementalManifestBytes);
for(const asset of supplementalAssets)releaseHash.update(asset.file).update(asset.bytes);
const release=releaseHash.digest('hex').slice(0,16);
await fs.mkdir(output,{recursive:true});
async function write(file,data){const temporary=file+'.'+process.pid+'.tmp';await fs.writeFile(temporary,data);await fs.rename(temporary,file);}
// Migrated shared assets have one canonical input; root URLs remain build-derived.
for(const asset of sharedAssets)if(asset.inputFile)await write(path.join(root,asset.file),asset.bytes);
function replace(text,from,to){if(!text.includes(from))throw Error('Missing packaging seam: '+from);return text.replaceAll(from,()=>to);}
for(const asset of publicAssets){const file=path.join(output,asset.relative);await fs.mkdir(path.dirname(file),{recursive:true});await write(file,asset.bytes);}
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
 if(name==='local-app-server.mjs')text=replace(text,"from '../../runtime.js'","from '../runtime.js?v="+release+"'");
 text=text.replace(/(\bfrom\s*|\bimport\s*(?:\(\s*)?)(['"])\.\/(model-catalog|config|runtime)\.js\2/g,(_match,prefix,quote,module)=>prefix+quote+'../'+module+'.js?v='+release+quote);
 text=text.replace(/(\bfrom\s*|\bimport\s*(?:\(\s*)?)(['"])(\.\/[^'"?]+\.mjs)\2/g,(_match,prefix,quote,specifier)=>prefix+quote+specifier+'?v='+release+quote);
 await write(path.join(output,name),text);
 provenance.push({file:name,inputSha256:crypto.createHash('sha256').update(original).digest('hex'),publishedSha256:crypto.createHash('sha256').update(text).digest('hex')});
}
plan.registrationEntry='./entry-library.mjs?v='+release;
plan.status='original-module-graph-with-local-service-adapter';
await write(path.join(output,'entry-plan.json'),JSON.stringify(plan,null,2)+'\n');
const bootstrap=`import { installDirectAssetHost, registerOptionalAssetWorker, showStartupError } from './startup-compatibility.mjs?v=${release}';
try {
const rootURL = new URL('../', import.meta.url);
const releaseFetch = globalThis.fetch.bind(globalThis);
globalThis.__CHATGPT_REPLICA_ENV__ = Object.freeze({basePath:rootURL.pathname,localIdentity:true,useOriginalAuth:true,preferredHostEnabled:true,directAssetHost:true,release:${JSON.stringify(release)},sourceBuild:${JSON.stringify(sourceBuild)}});
const workerURL = new URL('native-client-worker.js?v='+${JSON.stringify(release)}, rootURL);
installDirectAssetHost(rootURL, { fetchImpl: releaseFetch });
// Storage-backed hosting is optional; import maps host the original modules.
void registerOptionalAssetWorker(workerURL, rootURL.pathname);
const siteAccount = await import('./site-account.mjs?v='+${JSON.stringify(release)});
let isBusy;
if(['login','auth/login','signup','auth/signup'].map(route=>rootURL.pathname+route).includes(location.pathname.replace(/\\/$/,''))) {
 siteAccount.renderSiteLoginPage();
 isBusy = () => [...document.querySelectorAll('.site-login input')].some(input=>input===document.activeElement||input.value.length>0)||!!document.querySelector('.site-login button:disabled');
}
else {
 await siteAccount.initializeSiteAccount();
 await import('./boot-adapter.mjs?v='+${JSON.stringify(release)});
 const {localAppServer} = await import('./service-boundary.mjs?v='+${JSON.stringify(release)});
 isBusy = () => localAppServer.running.size>0;
}
const {createReleaseUpdater} = await import('../release-updater.js?v='+${JSON.stringify(release)});
const updater = createReleaseUpdater({currentRelease:${JSON.stringify(release)},baseURL:rootURL,fetchImpl:releaseFetch,isBusy,interactionQuietMs:30000});
updater.start();
globalThis.addEventListener('pagehide',()=>updater.stop(),{once:true});
} catch (error) { showStartupError(error); }
`;
await write(path.join(output,'bootstrap.mjs'),bootstrap);
const worker=`import {BrowserWorkspaceStore,workspacePath} from './native-client/browser-tool-executor.mjs?v=${release}';
const workspace=new BrowserWorkspaceStore();
const SOURCE_BUILD=${JSON.stringify(sourceBuild)};
const BASE=new URL('./',self.location.href).pathname;
const CACHE='chatgpt-original-assets-'+SOURCE_BUILD;
const SHELL_CACHE='chatgpt-native-shell-${release}';
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
`;
await write(path.join(root,'native-client-worker.js'),worker);
const html=`<!DOCTYPE html>
<html class="chatgpt-theme" lang="zh-CN" dir="ltr" data-theme="light" data-appearance-preset="codex" data-ios="false" data-build="${sourceBuild}" data-client-build-revision="${sourceBuild}" data-icon-sprite-url="${deploymentBase}original-client/public/chatgpt.com/cdn/assets/icons-65c0f11497ac4847.svg" data-codex-cli-version="0.171.0-alpha.2" data-codex-window-type="browser" data-window-type="browser" data-native-client-release="${release}">
<head><script type="importmap">${JSON.stringify({imports:{"/cdn/":deploymentBase+"original-client/public/chatgpt.com/cdn/","https://chatgpt.com/cdn/":deploymentBase+"original-client/public/chatgpt.com/cdn/","https://cdn.oaistatic.com/":deploymentBase+"original-client/public/cdn.oaistatic.com/"}})}</script><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="${deploymentBase}original-client/public/chatgpt.com/cdn/assets/c7fcb2505631.css"><link rel="stylesheet" href="${deploymentBase}native-client/map-vendor/maplibre-gl.css?v=${release}"><style data-codex-app-themes></style><title>ChatGPT</title></head>
<body><script type="module" src="${deploymentBase}native-client/bootstrap.mjs?v=${release}"></script></body></html>
`;
await write(path.join(root,'native-client-shell.html'),html);
const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
await write(path.join(output,'adapter-provenance.json'),JSON.stringify({sourceBuild,release,deploymentBase,builderSha256:sha256(builderBytes),entryPlanInputSha256:sha256(entryPlanInput),sourceEntry:plan.sourceEntrySha256,runtime:plan.runtime,manifest:plan.manifest,componentFactoriesModified:false,legacyUiImported:false,serviceAdapter:'Browser-local account/storage and the explicitly configured API; no original private backend or Google authentication is claimed.',sharedAssets:sharedAssets.map(({file,bytes,inputFile})=>({file,...(inputFile?{inputFile,inputSha256:sha256(bytes)}:{}),sha256:sha256(bytes)})),resources:publicAssets.map(({relative,bytes})=>({file:relative,sha256:sha256(bytes)})),supplementalManifest:{file:supplementalManifestFile,sha256:sha256(supplementalManifestBytes)},supplementalResources:supplementalAssets.map(({file,bytes})=>({file,sha256:sha256(bytes)})),helpers:provenance},null,2)+'\n');
if(process.argv.includes('--activate')){
 const backup=path.join(root,'.test-output/index-before-native-client.html');
 try{await fs.access(backup);}catch{await fs.copyFile(path.join(root,'index.html'),backup);}
 await write(path.join(root,'index.html'),html);
 await write(path.join(root,'404.html'),html);
 await write(path.join(output,'active.json'),JSON.stringify({active:true,release,sourceBuild,originalComponentGraph:true,backend:'local-adapters-and-configured-api'},null,2)+'\n');
}
console.log(JSON.stringify({release,helpers:helpers.length,sourceBuild,activated:process.argv.includes('--activate'),shell:'native-client-shell.html'}));
