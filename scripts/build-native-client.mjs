/** Package the intact original client; only our declared host/service seams change. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const referenceInput=path.join(root,'.test-output/original-client-prototype');
const input=path.join(root,'src/native-client');
const output=path.join(root,'native-client');
const servicesOnly = process.argv.includes('--services-only');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const helpers=['boot-adapter.mjs','startup-compatibility.mjs','image-input-compression.mjs','service-boundary.mjs','provider-routing.mjs','local-native-read-aloud.mjs','local-web-search.mjs','preferred-host-transport.mjs','synthetic-bootstrap.mjs','public-auth-envelope.mjs','local-identity.mjs','local-token-identity.mjs','site-account.mjs','chat-history-sync.mjs','account-history-coordinator.mjs','native-cloud-sync-feedback.mjs','local-model-selection-policy.mjs','local-configuration.mjs','local-user-preferences.mjs','local-personalization-service.mjs','local-personalization-context.mjs','local-host-settings.mjs','local-work-policy.mjs','local-codex-adapter.mjs','local-dot-adapter.mjs','local-map-provider.mjs','local-maps-service.mjs','local-discovery.mjs','public-plugin-catalog.mjs','local-pubsub.mjs','model-catalog-adapter.mjs','local-app-server.mjs','classic-chat-adapter.mjs','portable-conversation-share.mjs','classic-response-branches.mjs','classic-input-messages.mjs','agent-turn-runner.mjs','site-ultra-orchestrator.mjs','browser-tool-executor.mjs','local-document-extraction.mjs','document-text-worker.mjs','local-ooxml-container.mjs','local-office-xml.mjs','local-xlsx-extraction.mjs','local-pptx-extraction.mjs','local-files-service.mjs','local-library-service.mjs','local-library-publisher.mjs','published-resource-rehydration.mjs','native-library-refresh.mjs','native-publication-references.mjs','native-workspace-references.mjs','native-file-reference-composition.mjs','local-native-upload.mjs','local-native-download.mjs','local-workspace-download-source.mjs','local-workspace-download-service.mjs','owned-download-transport.mjs','local-input-preparation.mjs','local-pricing.mjs','entry-library.mjs'];
helpers.push('native-pricing-trials.mjs', 'site-signout.mjs', 'native-site-login.mjs', 'site-paths.mjs', 'prepared-input-store.mjs', 'site-inference-transport.mjs', 'local-dot-browser-voice.mjs');
helpers.push('local-dot-transcription.mjs');
helpers.push('native-python-activity.mjs', 'restricted-browser-storage.mjs');
if(new Set(helpers).size!==helpers.length)throw Error('Duplicate native helper declaration');
if(process.argv.includes('--from-reference')){
 if (servicesOnly) throw Error('A service update requires a previously published client');
 await fs.mkdir(input,{recursive:true});
 for(const name of [...helpers,'entry-plan.json']){const file=path.join(input,name),temporary=file+'.'+process.pid+'.tmp';await fs.writeFile(temporary,await fs.readFile(path.join(referenceInput,name)));await fs.rename(temporary,file);}
}
const raw=new Map(await Promise.all(helpers.map(async name=>[name,await fs.readFile(path.join(input,name),'utf8')])));
const entryPlanInput=await fs.readFile(path.join(input,'entry-plan.json'),'utf8');
const plan=JSON.parse(entryPlanInput);
const sourceBuild=plan.sourceBuild??'ef0c3fb941611420d8683bf88f61acf1a8ac6b19';
if (!/^[a-f\d]{40}$/.test(sourceBuild)) throw Error('Invalid upstream build identifier');
if (plan.assetManifestSha256) {
 const resourceManifest = await fs.readFile(path.join(root,'original-client/resource-manifest.json'));
 if (sha256(resourceManifest) !== plan.assetManifestSha256 || JSON.parse(resourceManifest).sourceBuild !== sourceBuild) {
  throw Error('The public asset graph does not match the native entry plan');
 }
}
const publicAssets=[];
async function collectAssets(directory){
 let entries;try{entries=await fs.readdir(path.join(input,directory),{withFileTypes:true});}catch(error){if(error.code==='ENOENT')return;throw error;}
 for(const entry of entries.sort((a,b)=>a.name.localeCompare(b.name))){const relative=directory+'/'+entry.name;if(entry.isDirectory())await collectAssets(relative);else if(entry.isFile())publicAssets.push({relative,bytes:await fs.readFile(path.join(input,relative))});else throw Error('Unexpected resource link: '+relative);}
}
await collectAssets('map-vendor');await collectAssets('plugin-assets');await collectAssets('dot-assets');await collectAssets('document-vendor');await collectAssets('office-vendor');await collectAssets('artifact-assets');
await collectAssets('compat-assets');
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
const prior = servicesOnly ? JSON.parse(await fs.readFile(path.join(output, 'adapter-provenance.json'), 'utf8')) : null;
const priorPlan = servicesOnly ? JSON.parse(await fs.readFile(path.join(output, 'entry-plan.json'), 'utf8')) : null;
if (servicesOnly && (prior.deploymentBase !== deploymentBase || prior.sourceBuild !== sourceBuild ||
  !/^\.\/entry-library\.mjs\?v=[a-f0-9]{16}$/.test(priorPlan.registrationEntry))) {
  throw Error('The existing page and module entry must belong to this deployment');
}
const originalOnSite = url => deploymentBase + 'original-client/public/chatgpt.com' + url;
const builderBytes=await fs.readFile(fileURLToPath(import.meta.url));
const sharedAssetInputs=['config.js','model-catalog.js','runtime.js','python-worker.js','release-updater.js'].map(file=>({file,...(['python-worker.js','model-catalog.js'].includes(file)?{inputFile:'src/native-client/'+file}:{})}));
const sharedAssets=await Promise.all(sharedAssetInputs.map(async asset=>({...asset,bytes:await fs.readFile(path.join(root,asset.inputFile??asset.file))})));
const releaseHash=crypto.createHash('sha256').update([...raw.values()].join('\n')).update(builderBytes).update(entryPlanInput).update(deploymentBase);
if (priorPlan) releaseHash.update('\0preserved-registration:').update(priorPlan.registrationEntry);
for(const asset of sharedAssets)releaseHash.update(asset.file).update(asset.bytes);
for(const asset of publicAssets)releaseHash.update(asset.relative).update(asset.bytes);
releaseHash.update(supplementalManifestFile).update(supplementalManifestBytes);
for(const asset of supplementalAssets)releaseHash.update(asset.file).update(asset.bytes);
const release=releaseHash.digest('hex').slice(0,16);
const registrationEntry = priorPlan?.registrationEntry ?? './entry-library.mjs?v=' + release;
await fs.mkdir(output,{recursive:true});
async function write(file,data){const temporary=file+'.'+process.pid+'.tmp';await fs.writeFile(temporary,data);await fs.rename(temporary,file);}
// Migrated shared assets have one canonical input; root URLs remain build-derived.
for(const asset of sharedAssets)if(asset.inputFile)await write(path.join(root,asset.file),asset.bytes);
function replace(text,from,to){if(!text.includes(from))throw Error('Missing packaging seam: '+from);return text.replaceAll(from,()=>to);}
for(const asset of publicAssets){
 const file=path.join(output,asset.relative);
 if (servicesOnly) {
  if (sha256(await fs.readFile(file)) !== sha256(asset.bytes)) throw Error('Shared page asset differs: ' + asset.relative);
 } else {
  await fs.mkdir(path.dirname(file),{recursive:true});await write(file,asset.bytes);
 }
}
// The archived WebGL engine resolves this module relative to its own runtime.
// Keep the site's implementation out of the upstream archive manifest.
const siteResourceAliases = [];
const preparationWorker = publicAssets.find(asset => asset.relative === 'dot-assets/preparation-worker.mjs');
if (preparationWorker && !supplementalManifest.sourceBuild) {
 const file = '_orbit-renderer/assets/orbit-character-16ed1c7d9045dbdf/runtime/single-thread/preparation-worker.mjs';
 if (servicesOnly) {
  if (sha256(await fs.readFile(path.join(root, file))) !== sha256(preparationWorker.bytes)) throw Error('Renderer asset differs: ' + file);
 } else await write(path.join(root, file), preparationWorker.bytes);
 siteResourceAliases.push({ file, source: preparationWorker.relative, sha256: crypto.createHash('sha256').update(preparationWorker.bytes).digest('hex') });
}
const provenance=[];
for(const [name,original]of raw){
 if (servicesOnly && name === 'entry-library.mjs') {
  const registration = prior.helpers.find(helper => helper.file === name);
  const deployed = await fs.readFile(path.join(output, name));
  if (registration?.inputSha256 !== sha256(original) || registration.publishedSha256 !== sha256(deployed)) {
   throw Error('The site service update cannot modify the existing module entry');
  }
  provenance.push(registration);
  continue;
 }
 let text=original;
 if(name==='boot-adapter.mjs'){
  const initialRoutes = Object.fromEntries(Object.entries(plan.initialRoutes).map(([id, url]) => [id, originalOnSite(url)]));
  const bootPlan = {
   mountMode: plan.mountMode,
   runtime: originalOnSite(plan.runtime),
   manifest: originalOnSite(plan.manifest),
   initialRoutes,
   registrationEntry,
  };
  text=replace(text,"await (await fetch('/__prototype/entry-plan.json')).json()",JSON.stringify(bootPlan));
  const installDocument = 'installSyntheticDocumentState(localCodexAdapter.mergeConfiguration);';
  text=replace(text,installDocument,installDocument+"\nif (globalThis.__CHATGPT_REPLICA_ENV__) window.__reactRouterContext.basename = globalThis.__CHATGPT_REPLICA_ENV__.basePath.replace(/\\/$/, '') || '/';");
 }
 if(name==='entry-library.mjs'){
  text=replace(text,'/__prototype/entry-library.mjs','./entry-library.mjs?v='+release);
  text=replace(text,'"/cdn/assets/', '"' + originalOnSite('/cdn/assets/'));
 }
 if(name==='local-identity.mjs'){
  text=replace(text,"enabled = globalThis.sessionStorage.getItem(toggleKey) === '1';","enabled = globalThis.sessionStorage.getItem(toggleKey) === '1' || (globalThis.sessionStorage.getItem(toggleKey) === null && globalThis.__CHATGPT_REPLICA_ENV__?.localIdentity === true);");
  text=text.replaceAll('本地原型','本地账户');
 }
 if(name==='service-boundary.mjs'){
  text=replace(text,"const local = url.origin === location.origin;","const local = url.origin === location.origin;\n    const deploymentBase = globalThis.__CHATGPT_REPLICA_ENV__?.basePath || '/';\n    const adapterPrefix = new URL('./', import.meta.url).pathname;\n    if (local && (url.pathname.startsWith(adapterPrefix) || url.pathname.startsWith(deploymentBase+'original-client/public/'))) {\n      const headers = new Headers(request.headers); headers.delete('Authorization'); headers.delete('Cookie');\n      return originalFetch(new Request(request, {headers,credentials:'omit'}));\n    }");
  text=replace(text,'// Log the contract name, never query parameters, headers or payload values.',"// Normalize the deployment basename at the service boundary.\n    if (local && deploymentBase !== '/' && url.pathname.startsWith(deploymentBase)) url.pathname = '/' + url.pathname.slice(deploymentBase.length);\n    // Log the contract name, never query parameters, headers or payload values.");
 }
 if(name==='local-app-server.mjs')text=replace(text,"from '../../runtime.js'","from '../runtime.js?v="+release+"'");
 text=text.replace(/(\bfrom\s*|\bimport\s*(?:\(\s*)?)(['"])(?:\.\/|\.\.\/\.\.\/)(model-catalog|config|runtime)\.js\2/g,(_match,prefix,quote,module)=>prefix+quote+'../'+module+'.js?v='+release+quote);
 text=text.replace(/(\bfrom\s*|\bimport\s*(?:\(\s*)?)(['"])(\.\/[^'"?]+\.mjs)\2/g,(_match,prefix,quote,specifier)=>prefix+quote+specifier+'?v='+release+quote);
 await write(path.join(output,name),text);
 provenance.push({file:name,inputSha256:crypto.createHash('sha256').update(original).digest('hex'),publishedSha256:crypto.createHash('sha256').update(text).digest('hex')});
}
plan.registrationEntry=registrationEntry;
plan.status='original-module-graph-with-local-service-adapter';
await write(path.join(output,'entry-plan.json'),JSON.stringify(plan,null,2)+'\n');
const bootstrap=`import { installBrowserCompatibility, installDirectAssetHost, registerOptionalAssetWorker, showStartupError } from './startup-compatibility.mjs?v=${release}';
import { installRestrictedBrowserStorage } from './restricted-browser-storage.mjs?v=${release}';
try {
const startup = globalThis.__TYC_PAGE_START__;
if (startup && !await startup.waitForStyles()) throw Error('The page stylesheet could not be loaded.');
const rootURL = new URL('../', import.meta.url);
document.documentElement.dataset.routerBasename = rootURL.pathname.replace(/\\/$/, '') || '/';
await installBrowserCompatibility();
installRestrictedBrowserStorage();
globalThis.__CHATGPT_REPLICA_ENV__ = Object.freeze({basePath:rootURL.pathname,localIdentity:true,useOriginalAuth:true,siteAccountService:true,preferredHostEnabled:true,directAssetHost:true,release:${JSON.stringify(release)},sourceBuild:${JSON.stringify(sourceBuild)}});
const workerURL = new URL('native-client-worker.js?v='+${JSON.stringify(release)}, rootURL);
installDirectAssetHost(rootURL);
const [siteAccount, signOut, {getSiteAuthEntryKind}] = await Promise.all([
 import('./site-account.mjs?v='+${JSON.stringify(release)}),
 import('./site-signout.mjs?v='+${JSON.stringify(release)}),
 import('./site-paths.mjs?v='+${JSON.stringify(release)}),
]);
signOut.installSiteSignOutRestore({home:()=>rootURL});
const pagePath = location.pathname.replace(/\\/index\\.html$/, '/').replace(/\\/$/, '');
const authEntry = getSiteAuthEntryKind(location.href, rootURL);
const homeEntry = !authEntry && pagePath === rootURL.pathname.replace(/\\/$/, '');
if (authEntry === 'logout') {
 await siteAccount.logoutSiteAccount({waitForRemote:true});
 siteAccount.startSiteGuestSession();
 location.replace(signOut.getSiteSignedOutUrl(rootURL));
} else if(authEntry === 'login' || authEntry === 'signup') {
 siteAccount.renderSiteLoginPage();
}
else {
 if (/\\/(?:site-plans(?:\\/index\\.html)?|plans|pricing-plan|purchase\\/[^/]+)$/.test(pagePath)) {
   const pricing = await import('./native-pricing-trials.mjs?v='+${JSON.stringify(release)});
   pricing.normalizeLegacyPricingEntry();
 }
 await siteAccount.initializeSiteAccountForDisplay();
 await import('./boot-adapter.mjs?v='+${JSON.stringify(release)});
 // The worker is only for private browser-created files. It does not load pages.
 void registerOptionalAssetWorker(workerURL, rootURL.pathname);
}
if (homeEntry) startup?.waitForComposer();
else startup?.ready();
} catch (error) { showStartupError(error); }
`;
await write(path.join(output,'bootstrap.mjs'),bootstrap);
const worker=`import { BrowserWorkspaceStore, workspacePath } from './native-client/browser-tool-executor.mjs?v=${release}';
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
`;
await write(path.join(root,'native-client-worker.js'),worker);
const upstreamStylesheet = plan.stylesheet ?? '/cdn/assets/c7fcb2505631.css';
const upstreamSprite = plan.iconSprite ?? '/cdn/assets/icons-65c0f11497ac4847.svg';
if (!/^\/cdn\/assets\/[\w.-]+\.css$/.test(upstreamStylesheet) || !/^\/cdn\/assets\/[\w.-]+\.svg$/.test(upstreamSprite)) throw Error('Invalid native shell asset path');
const cssAsset = 'original-client/public/chatgpt.com' + upstreamStylesheet;
let localCSS;
if (servicesOnly) {
 const existing = await fs.readFile(path.join(root, 'native-client-shell.html'), 'utf8');
 if (!existing.includes('data-native-client-release="' + prior.release + '"') || !existing.includes(priorPlan.registrationEntry.slice(2))) {
  throw Error('The existing page is out of sync with its metadata');
 }
 localCSS = existing.match(/<style data-native-asset-rebase>([\s\S]*?)<\/style>/)?.[1];
 if (localCSS === undefined) throw Error('The existing stylesheet asset rebasing is missing');
} else {
const originalCSS = await fs.readFile(path.join(root, cssAsset), 'utf8');
const rootAsset = /url\((['"]?)\/cdn\//g;
const assetOverrides = [];
for (const rule of originalCSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
 const selector = rule[1].trim(), declarations = rule[2];
 if (!declarations.match(rootAsset)) continue;
 const local = selector === '@font-face' ? declarations : declarations.split(';').filter(value => value.match(rootAsset)).join(';');
 assetOverrides.push(selector + '{' + local + '}');
}
const overrides = assetOverrides.join('\n');
if (overrides.match(rootAsset)?.length !== originalCSS.match(rootAsset)?.length) throw Error('Incomplete stylesheet asset rebasing');
localCSS = overrides.replace(rootAsset, (_, quote) => 'url(' + quote + deploymentBase + 'original-client/public/chatgpt.com/cdn/');
}
const ownModule = name => deploymentBase + name + '?v=' + release;
const earlyModules = ['native-client/bootstrap.mjs', 'native-client/startup-compatibility.mjs', 'native-client/site-account.mjs',
 'native-client/site-signout.mjs', 'native-client/site-paths.mjs'].map(ownModule);
// Start the largest entry chunks early, while the browser fetches smaller dependencies.
const registrationAssets = await Promise.all(plan.registrationChunks.map(async url => ({
 url, bytes: (await fs.stat(path.join(root, 'original-client/public/chatgpt.com', url.slice(1)))).size,
})));
registrationAssets.sort((a, b) => b.bytes - a.bytes);
const archivedModules = new Set([plan.runtime, ...registrationAssets.map(asset => asset.url), plan.manifest, ...Object.values(plan.initialRoutes)]);
const mainModules = [
 ownModule('native-client/boot-adapter.mjs'),
 deploymentBase + 'native-client/' + registrationEntry.slice(2),
 ownModule('native-client/service-boundary.mjs'), ownModule('runtime.js'), ownModule('model-catalog.js'),
 ...Array.from(archivedModules, originalOnSite),
];
const modulePreload = href => `<link rel="modulepreload" href="${href}" crossorigin="anonymous">`;
const importMap = JSON.stringify({imports:{
 '/cdn/': deploymentBase + 'original-client/public/chatgpt.com/cdn/',
 'https://chatgpt.com/cdn/': deploymentBase + 'original-client/public/chatgpt.com/cdn/',
 'https://cdn.oaistatic.com/': deploymentBase + 'original-client/public/cdn.oaistatic.com/',
}});
const entryScript = ownModule('native-client/bootstrap.mjs');
const errorMessage = '页面未能完成加载。请检查网络连接后重试。';
const stylesheetURL = deploymentBase + cssAsset;
const startupProgressStyle = `<style id="site-load-progress-style">
#site-load-progress{position:fixed;z-index:2147483647;top:50%;left:50%;transform:translate(-50%,-50%);width:144px;max-width:45vw;height:4px;border-radius:999px;overflow:hidden;pointer-events:none;background:#ddd5ee}
#site-load-progress::before{content:"";display:block;width:28%;height:100%;background:linear-gradient(90deg,#7154b1,#9b84c4);animation:site-load-sweep 1.35s ease-in-out infinite}
@keyframes site-load-sweep{from{transform:translateX(-100%)}to{transform:translateX(357%)}}
@media(prefers-reduced-motion:reduce){
 #site-load-progress::before{width:100%;animation:none;background:repeating-linear-gradient(120deg,#7154b1 0 7px,#9b84c4 7px 14px)}
}
</style>`;
const startupGuard = `<script>(function(){
 var notice,progress,progressStyle,composerObserver,resolveStyles;
 var stylesLoaded=false,stylesFailed=false,finished=false,failed=false;
 function hideProgress(){
  progress=progress||document.getElementById('site-load-progress');
  if(progress&&progress.parentNode)progress.parentNode.removeChild(progress);
 }
 function showFailure(){
  notice=notice||document.getElementById('site-load-error');
  if(!notice||!document.body)return;
  if(!notice.parentNode)document.body.appendChild(notice);
  notice.hidden=false;
 }
 var timer=setTimeout(function(){
  var sheet=document.getElementById('site-main-style');
  if(sheet&&!stylesLoaded){
   sheet.disabled=true;
   state.failStyles();
  }else state.fail();
 },60000);
 var state=window.__TYC_PAGE_START__={
  loadStyles:function(sheet){
   if(stylesFailed)return;
   sheet.media='all';
   stylesLoaded=true;
   if(resolveStyles)resolveStyles(true);
  },
  failStyles:function(){
   stylesFailed=true;
   if(resolveStyles)resolveStyles(false);
   state.fail();
  },
  waitForStyles:function(){
   if(!document.getElementById('site-main-style')||stylesLoaded)return Promise.resolve(true);
   if(stylesFailed)return Promise.resolve(false);
   return new Promise(function(resolve){resolveStyles=resolve});
  },
  attach:function(node){
   notice=node;
   progress=document.getElementById('site-load-progress');
   progressStyle=document.getElementById('site-load-progress-style');
   if(failed&&!finished){
    hideProgress();
    showFailure();
   }
  },
  waitForComposer:function(){
   var selector='main [contenteditable="true"], main textarea, [contenteditable="true"][role="textbox"]';
   function update(){
    var visible=Array.prototype.some.call(document.querySelectorAll(selector),function(composer){
     return composer.getClientRects().length&&getComputedStyle(composer).visibility==='visible';
    });
    if(visible){
     state.ready();
     return;
    }
    if(failed||finished)return;
    if(progressStyle&&!progressStyle.isConnected&&document.head)document.head.appendChild(progressStyle);
    if(progress&&!progress.isConnected&&document.body)document.body.appendChild(progress);
   }
   composerObserver=new MutationObserver(update);
   composerObserver.observe(document,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','style','contenteditable']});
   update();
  },
  fail:function(){
   if(finished)return;
   failed=true;
   clearTimeout(timer);
   hideProgress();
   showFailure();
  },
  ready:function(){
   finished=true;
   if(composerObserver)composerObserver.disconnect();
   clearTimeout(timer);
   hideProgress();
   notice=notice||document.getElementById('site-load-error');
   if(notice&&notice.parentNode)notice.parentNode.removeChild(notice);
  },
  retry:function(){
   var next=new URL(location.href);
   next.searchParams.set('__tyc_retry',Date.now().toString());
   location.replace(next.href);
  }
 };
 document.addEventListener('DOMContentLoaded',function(){
  if(failed&&!finished)showFailure();
 },{once:true});
})()</script>`;
const startupBody = `<body>
<div id="site-load-progress" role="progressbar" aria-label="页面加载中"></div>
<main id="site-load-error" hidden role="alert" style="max-width:36rem;margin:12vh auto;padding:24px;font:16px/1.6 system-ui">
<h1 style="font-size:22px">ChatGPT</h1><p>${errorMessage}</p><button type="button" onclick="window.__TYC_PAGE_START__.retry()" style="min-height:44px;padding:8px 16px">重新加载</button>
</main>
<noscript><style>#site-load-progress{display:none}</style><p>此页面需要浏览器启用 JavaScript。</p></noscript>
<script>window.__TYC_PAGE_START__.attach(document.getElementById('site-load-error'))</script>
<script nomodule>window.__TYC_PAGE_START__.fail()</script>
<script type="module" src="${entryScript}" onerror="window.__TYC_PAGE_START__.fail()"></script>
</body>`;
const entryHTML = ({ auth = false } = {}) => `<!DOCTYPE html>
<html class="chatgpt-theme" lang="zh-CN" dir="ltr" data-theme="light" data-appearance-preset="codex" data-ios="false" data-build="${sourceBuild}" data-client-build-revision="${sourceBuild}" data-router-basename="${deploymentBase.replace(/\/$/,'') || '/'}" data-icon-sprite-url="${originalOnSite(upstreamSprite)}" data-codex-cli-version="0.171.0-alpha.2" data-codex-window-type="browser" data-window-type="browser" data-native-client-release="${release}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ChatGPT</title>
${startupProgressStyle}
${startupGuard}
<script type="importmap">${importMap}</script>
${auth ? '' : `<link rel="preload" as="style" href="${stylesheetURL}">
<link id="site-main-style" rel="stylesheet" href="${stylesheetURL}" media="print" onload="window.__TYC_PAGE_START__.loadStyles(this)" onerror="window.__TYC_PAGE_START__.failStyles()">\n`}
${earlyModules.map(modulePreload).join('\n')}
${auth ? '' : mainModules.map(modulePreload).join('\n')}
<style data-native-asset-rebase>${localCSS}</style><style data-codex-app-themes></style>
</head>
${startupBody}
</html>
`;
const html = entryHTML();
const authHTML = entryHTML({ auth: true });
await write(path.join(root,'native-client-shell.html'),html);
await write(path.join(output,'adapter-provenance.json'),JSON.stringify({sourceBuild,release,deploymentBase,...(priorPlan?{preservedRegistrationEntry:registrationEntry}:{}),builderSha256:sha256(builderBytes),entryPlanInputSha256:sha256(entryPlanInput),sourceEntry:plan.sourceEntrySha256,runtime:plan.runtime,manifest:plan.manifest,componentFactoriesModified:false,legacyUiImported:false,serviceAdapter:'Browser-local account/storage and the explicitly configured API; no original private backend or Google authentication is claimed.',sharedAssets:sharedAssets.map(({file,bytes,inputFile})=>({file,...(inputFile?{inputFile,inputSha256:sha256(bytes)}:{}),sha256:sha256(bytes)})),resources:publicAssets.map(({relative,bytes})=>({file:relative,sha256:sha256(bytes)})),siteResourceAliases,supplementalManifest:{file:supplementalManifestFile,sha256:sha256(supplementalManifestBytes)},supplementalResources:supplementalAssets.map(({file,bytes})=>({file,sha256:sha256(bytes)})),helpers:provenance},null,2)+'\n');
if(process.argv.includes('--activate')){
 const backup=path.join(root,'.test-output/index-before-native-client.html');
 await fs.mkdir(path.dirname(backup),{recursive:true});
 try{await fs.access(backup);}catch{await fs.copyFile(path.join(root,'index.html'),backup);}
 await write(path.join(root,'index.html'),html);
 await write(path.join(root,'404.html'),html);
 await fs.mkdir(path.join(root,'site-plans'),{recursive:true});
 await write(path.join(root,'site-plans','index.html'),html);
 const planAliases = ['plus', 'pro5x', 'prolite', 'pro', 'promax'].flatMap(tier => ['purchase/' + tier, 'codex/purchase/' + tier]);
 const authAliases = new Set(['login', 'signup', 'auth/login', 'auth/signup', 'auth/logout', 'logout']);
 for (const alias of [...authAliases, 'plans', 'pricing-plan', ...planAliases]) {
   await fs.mkdir(path.join(root,alias),{recursive:true});
   await write(path.join(root,alias,'index.html'),authAliases.has(alias) ? authHTML : html);
 }
 await write(path.join(output,'active.json'),JSON.stringify({active:true,release,sourceBuild,originalComponentGraph:true,backend:'local-adapters-and-configured-api'},null,2)+'\n');
}
console.log(JSON.stringify({release,helpers:helpers.length,sourceBuild,activated:process.argv.includes('--activate'),shell:'native-client-shell.html'}));
