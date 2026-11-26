/** Package the intact original client; only our declared host/service seams change. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import { sharedNativeAssets } from './shared-native-assets.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const referenceInput=path.join(root,'.test-output/original-client-prototype');
const input=path.join(root,'src/native-client');
const output=path.join(root,'native-client');
const servicesOnly = process.argv.includes('--services-only');
const requestedAccountOrigin = process.env.CHATGPT_SITE_API_ORIGIN?.trim();
let siteAccountOrigin;
if (requestedAccountOrigin) {
 let url;
 try { url = new URL(requestedAccountOrigin); } catch {}
 if (!url || url.protocol !== 'https:' || ![url.origin, url.origin + '/'].includes(requestedAccountOrigin)) {
  throw Error('CHATGPT_SITE_API_ORIGIN must be an HTTPS origin without credentials, a path or a query.');
 }
 siteAccountOrigin = url.origin;
}
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const helpers=['boot-adapter.mjs','startup-compatibility.mjs','image-input-compression.mjs','service-boundary.mjs','provider-routing.mjs','local-native-read-aloud.mjs','local-web-search.mjs','preferred-host-transport.mjs','synthetic-bootstrap.mjs','public-auth-envelope.mjs','local-identity.mjs','local-token-identity.mjs','site-account.mjs','chat-history-sync.mjs','account-history-coordinator.mjs','native-cloud-sync-feedback.mjs','local-model-selection-policy.mjs','local-configuration.mjs','local-user-preferences.mjs','local-personalization-service.mjs','local-personalization-context.mjs','local-host-settings.mjs','local-work-policy.mjs','local-codex-adapter.mjs','local-dot-adapter.mjs','local-map-provider.mjs','local-maps-service.mjs','local-discovery.mjs','public-plugin-catalog.mjs','local-pubsub.mjs','model-catalog-adapter.mjs','local-app-server.mjs','classic-chat-adapter.mjs','portable-conversation-share.mjs','classic-response-branches.mjs','classic-input-messages.mjs','agent-turn-runner.mjs','site-ultra-orchestrator.mjs','browser-tool-executor.mjs','local-document-extraction.mjs','document-text-worker.mjs','local-ooxml-container.mjs','local-office-xml.mjs','local-xlsx-extraction.mjs','local-pptx-extraction.mjs','local-files-service.mjs','local-library-service.mjs','local-library-publisher.mjs','published-resource-rehydration.mjs','native-library-refresh.mjs','native-publication-references.mjs','native-workspace-references.mjs','native-file-reference-composition.mjs','local-native-upload.mjs','local-native-download.mjs','local-workspace-download-source.mjs','local-workspace-download-service.mjs','owned-download-transport.mjs','local-input-preparation.mjs','local-pricing.mjs','entry-library.mjs'];
helpers.push('native-pricing-trials.mjs', 'site-signout.mjs', 'native-site-login.mjs', 'site-paths.mjs', 'prepared-input-store.mjs', 'site-inference-transport.mjs', 'local-dot-browser-voice.mjs');
helpers.push('local-dot-transcription.mjs', 'dot-cloud-computer.mjs');
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
const sharedAssets=await Promise.all(sharedNativeAssets.map(async asset=>({...asset,bytes:await fs.readFile(path.join(root,asset.inputFile??asset.file))})));
const releaseHash=crypto.createHash('sha256').update([...raw.values()].join('\n')).update(builderBytes).update(entryPlanInput).update(deploymentBase);
if (siteAccountOrigin) releaseHash.update('\0site-account-origin:').update(siteAccountOrigin);
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
for (const asset of sharedAssets) {
 if (!asset.inputFile) continue;
 const target = path.join(root, asset.file);
 await fs.mkdir(path.dirname(target), { recursive: true });
 await write(target, asset.bytes);
}
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
 if(name==='site-account.mjs' && siteAccountOrigin){
  const declaration = /^export const SITE_ACCOUNT_SERVICE = '[^'\r\n]+';/m.exec(original)?.[0];
  if (!declaration) throw Error('Missing canonical site account origin');
  text=replace(text,declaration,'export const SITE_ACCOUNT_SERVICE = '+JSON.stringify(siteAccountOrigin)+';');
 }
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
const stylesReady = startup ? startup.waitForStyles() : Promise.resolve(true);
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
const settingsEntry = !authEntry && pagePath.startsWith(new URL('settings/', rootURL).pathname);
const conversationEntry = !authEntry && pagePath.startsWith(rootURL.pathname) &&
 /^(?:c|conversation|tasks|local)\\/[^/]+$/.test(pagePath.slice(rootURL.pathname.length));
if (authEntry === 'logout') {
 await siteAccount.logoutSiteAccount({waitForRemote:true});
 siteAccount.startSiteGuestSession();
 location.replace(signOut.getSiteSignedOutUrl(rootURL));
} else if(authEntry === 'login' || authEntry === 'signup') {
 if (siteAccount.isAdminModelConnectionPage()) await siteAccount.initializeSiteAccountForDisplay();
 siteAccount.renderSiteLoginPage();
}
else {
 if (/\\/(?:site-plans(?:\\/index\\.html)?|plans|pricing-plan|purchase\\/[^/]+)$/.test(pagePath)) {
   const pricing = await import('./native-pricing-trials.mjs?v='+${JSON.stringify(release)});
   pricing.normalizeLegacyPricingEntry();
 }
 const [styleLoaded] = await Promise.all([stylesReady, siteAccount.initializeSiteAccountForDisplay()]);
 if (!styleLoaded) throw Error('The page stylesheet could not be loaded.');
 await import('./boot-adapter.mjs?v='+${JSON.stringify(release)});
 // The worker is only for private browser-created files. It does not load pages.
 void registerOptionalAssetWorker(workerURL, rootURL.pathname);
}
if (homeEntry) startup?.waitForComposer();
else if (settingsEntry) startup?.waitForSettings();
else if (conversationEntry) startup?.waitForConversation();
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
const modulePreload = href => `<link rel="modulepreload" href="${href}" crossorigin="anonymous" onload="window.__TYC_PAGE_START__.loadedResource(this.href)">`;
const importMap = JSON.stringify({imports:{
 '/cdn/': deploymentBase + 'original-client/public/chatgpt.com/cdn/',
 'https://chatgpt.com/cdn/': deploymentBase + 'original-client/public/chatgpt.com/cdn/',
 'https://cdn.oaistatic.com/': deploymentBase + 'original-client/public/cdn.oaistatic.com/',
}});
const entryScript = ownModule('native-client/bootstrap.mjs');
const errorMessage = '页面未能完成加载。请检查网络连接后重试。';
const delayedMessage = '页面加载时间较长。可以继续等待，或选择重新加载。';
const stylesheetURL = deploymentBase + cssAsset;
const startupProgressStyle = `<style id="site-load-progress-style">
#site-load-progress{position:fixed;z-index:2147483647;top:50%;left:50%;transform:translate(-50%,-50%);width:220px;max-width:70vw;pointer-events:none;font:14px/1.45 system-ui;color:#5d478c}
#site-load-progress [role=progressbar]{height:4px;margin:8px 0;border-radius:999px;overflow:hidden;background:#ddd5ee}
#site-load-progress [role=progressbar]::before{content:"";display:block;width:var(--site-loaded,0%);height:100%;background:#7154b1}
#site-load-progress span{display:block;text-align:center}
@media(prefers-color-scheme:dark){#site-load-progress{color:#e5d9ff}}
</style>`;
const startupGuard = assets => `<script>(function(entries){
 var notice,progress,progressStyle,renderObserver,resolveStyles,drawPending=false,watcher,timer;
 var stylesLoaded=false,stylesFailed=false,finished=false,failed=false,delayed=false,waitingForRender=false;
 var resources=new Map(entries),seen=new Set(),timed=new Set();
 var total=entries.reduce(function(a,entry){return a+entry[1]},0),received=0,networkWeight=0,networkStart=Infinity,networkEnd=0;
 var lastProgress=performance.now();
 var composerSelector='main [contenteditable="true"], main textarea, [contenteditable="true"][role="textbox"]';
 var conversationContent='main [data-conversation-role], main [data-message-author-role], main[role="alert"]:not(#site-load-error), main:not(#site-load-error) [role="alert"]';
 function hideProgress(){
  progress=progress||document.getElementById('site-load-progress');
  if(progress&&progress.parentNode)progress.parentNode.removeChild(progress);
 }
 function showFailure(){
  notice=notice||document.getElementById('site-load-error');
  if(!notice||!document.body)return;
  var message=notice.querySelector('p');
  if(message)message.textContent=failed?${JSON.stringify(errorMessage)}:${JSON.stringify(delayedMessage)};
  if(!notice.parentNode)document.body.appendChild(notice);
  notice.hidden=false;
 }
 function updateProgress(){
  if(!progress||finished||failed||delayed)return;
  var portion=Math.floor(100*received/Math.max(1,total));
  var percent=String(Math.min(99,portion));
  var gauge=progress.querySelector('[role=progressbar]');
  gauge.setAttribute('aria-valuenow',percent);
  gauge.style.setProperty('--site-loaded',percent+'%');
  progress.querySelector('[data-percent]').textContent=percent+'%';
  var span=networkEnd-networkStart, detail='正在测量加载速度';
  if(waitingForRender||received>=total) detail='正在初始化页面';
  else if(performance.now()-lastProgress>8000) detail='连接较慢，正在等待资源';
  else if(timed.size>=2&&span>=600&&networkWeight>0) {
   var seconds=Math.max(1,Math.ceil((total-received)*span/networkWeight/1000));
   detail='预计资源还需 '+seconds+' 秒';
  }
  progress.querySelector('[data-time]').textContent=detail;
 }
 function stopWaiting(){
  clearTimeout(timer);
  clearInterval(watcher);
 }
 function restartTimeout(){
  clearTimeout(timer);
  timer=setTimeout(function(){
   delayed=true;
   stopWaiting();
   hideProgress();
   showFailure();
  },60000);
 }
 function resourceReady(value){
  if(finished||failed||delayed)return;
  var url;
  try{url=new URL(value,location.href)}catch(error){return}
  if(url.origin!==location.origin)return;
  var key=url.pathname+url.search;
  if(!resources.has(key)||seen.has(key))return;
  seen.add(key);
  received+=resources.get(key);
  lastProgress=performance.now();
  restartTimeout();
  updateProgress();
 }
 function timing(entry){
  if(!entry||entry.responseStatus>=400||(!entry.decodedBodySize&&!entry.transferSize))return;
  var url;
  try{url=new URL(entry.name)}catch(error){return}
  var key=url.pathname+url.search;
  if(url.origin!==location.origin||!resources.has(key))return;
  if(entry.transferSize>300&&entry.responseEnd>entry.fetchStart&&entry.fetchStart>=0&&!timed.has(key)){
   timed.add(key);
   networkWeight+=resources.get(key);
   networkStart=Math.min(networkStart,entry.fetchStart);
   networkEnd=Math.max(networkEnd,entry.responseEnd);
  }
  resourceReady(entry.name);
 }
 function collect(){
  performance.getEntriesByType('resource').forEach(timing);
  updateProgress();
 }
 function waitForVisibleContent(selector,accept){
  if(failed||finished)return;
  waitingForRender=true;
  collect();
  function check(){
   drawPending=false;
   if(failed||finished)return;
   var visible=Array.prototype.some.call(document.querySelectorAll(selector),function(node){
    if(node.closest('[inert],[aria-hidden="true"],[hidden]')||!node.getClientRects().length||
       getComputedStyle(node).visibility!=='visible')return false;
    return accept(node);
   });
   if(visible)state.ready();
   else if(delayed&&notice&&!notice.parentNode)showFailure();
  }
  function schedule(){
   if(failed||finished)return;
   if(!delayed){
    if(progressStyle&&!progressStyle.isConnected&&document.head)document.head.appendChild(progressStyle);
    if(progress&&!progress.isConnected&&document.body)document.body.appendChild(progress);
   }
   if(!drawPending){drawPending=true;requestAnimationFrame(check)}
  }
  renderObserver=new MutationObserver(schedule);
  renderObserver.observe(document,{childList:true,subtree:true,characterData:true,attributes:true,
   attributeFilter:['class','hidden','style','contenteditable','disabled','readonly','inert','aria-disabled','aria-readonly','aria-hidden',
    'role','data-conversation-role','data-message-author-role']});
  schedule();
 }
 function usableComposer(node){
  if(node.disabled||node.readOnly||node.closest('[aria-disabled="true"],[aria-readonly="true"]'))return false;
  return node.tagName==='TEXTAREA'||node.isContentEditable;
 }
 var state=window.__TYC_PAGE_START__={
  loadedResource:resourceReady,
  loadStyles:function(sheet){
   if(stylesFailed)return;
   sheet.media='all';
   stylesLoaded=true;
   resourceReady(sheet.href);
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
   if(finished)return;
   if(failed||delayed){hideProgress();showFailure();return}
   collect();
   watcher=setInterval(collect,750);
  },
  waitForComposer:function(){
   waitForVisibleContent(composerSelector,usableComposer);
  },
  waitForConversation:function(){
   waitForVisibleContent(composerSelector+', '+conversationContent,function(node){
    return node.matches(conversationContent)?Boolean(node.textContent.trim()):usableComposer(node);
   });
  },
  waitForSettings:function(){
   waitForVisibleContent('main:not(#site-load-error), [role="main"], [role="dialog"]',function(node){
    return Boolean(node.innerText.trim());
   });
  },
  fail:function(){
   if(finished||failed)return;
   failed=true;
   if(renderObserver)renderObserver.disconnect();
   stopWaiting();
   hideProgress();
   showFailure();
  },
  ready:function(){
   if(finished||failed)return;
   finished=true;
   if(renderObserver)renderObserver.disconnect();
   stopWaiting();
   if(progress) {
    var gauge=progress.querySelector('[role=progressbar]');
    gauge.setAttribute('aria-valuenow','100');
    gauge.style.setProperty('--site-loaded','100%');
    progress.querySelector('[data-percent]').textContent='100%';
    progress.querySelector('[data-time]').textContent='加载完成';
   }
   requestAnimationFrame(hideProgress);
   notice=notice||document.getElementById('site-load-error');
   if(notice&&notice.parentNode)notice.parentNode.removeChild(notice);
  },
  retry:function(){
   var next=new URL(location.href);
   next.searchParams.set('__tyc_retry',Date.now().toString());
   location.replace(next.href);
  }
 };
 restartTimeout();
 document.addEventListener('DOMContentLoaded',function(){
  if((failed||delayed)&&!finished)showFailure();
 },{once:true});
})(${JSON.stringify(assets)})</script>`;
const startupBody = `<body>
<div id="site-load-progress"><span data-percent>0%</span><div role="progressbar" aria-label="首屏加载进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"></div><span data-time>准备加载</span></div>
<main id="site-load-error" hidden role="alert" style="max-width:36rem;margin:12vh auto;padding:24px;font:16px/1.6 system-ui">
<h1 style="font-size:22px">ChatGPT</h1><p>${errorMessage}</p><button type="button" onclick="window.__TYC_PAGE_START__.retry()" style="min-height:44px;padding:8px 16px">重新加载</button>
</main>
<noscript><style>#site-load-progress{display:none}</style><p>此页面需要浏览器启用 JavaScript。</p></noscript>
<script>window.__TYC_PAGE_START__.attach(document.getElementById('site-load-error'))</script>
<script nomodule>window.__TYC_PAGE_START__.fail()</script>
<script type="module" src="${entryScript}" onerror="window.__TYC_PAGE_START__.fail()"></script>
</body>`;
async function startupResources(hrefs) {
 return Promise.all([...new Set(hrefs)].map(async href => [
  href, Math.max(1, (await fs.stat(path.join(root, href.slice(deploymentBase.length).split('?')[0]))).size),
 ]));
}
const pagesStartupResources = await startupResources([...earlyModules, ...mainModules, stylesheetURL]);
const authStartupResources = await startupResources(earlyModules);
const entryHTML = ({ auth = false } = {}) => `<!DOCTYPE html>
<html class="chatgpt-theme" lang="zh-CN" dir="ltr" data-theme="light" data-appearance-preset="codex" data-ios="false" data-build="${sourceBuild}" data-client-build-revision="${sourceBuild}" data-router-basename="${deploymentBase.replace(/\/$/,'') || '/'}" data-icon-sprite-url="${originalOnSite(upstreamSprite)}" data-codex-cli-version="0.171.0-alpha.2" data-codex-window-type="browser" data-window-type="browser" data-native-client-release="${release}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ChatGPT</title>
${startupProgressStyle}
${startupGuard(auth ? authStartupResources : pagesStartupResources)}
<script type="importmap">${importMap}</script>
${auth ? '' : `<link rel="preload" as="style" fetchpriority="high" href="${stylesheetURL}">
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
await write(path.join(output,'adapter-provenance.json'),JSON.stringify({sourceBuild,release,deploymentBase,...(siteAccountOrigin?{siteAccountOrigin}:{}),...(priorPlan?{preservedRegistrationEntry:registrationEntry}:{}),builderSha256:sha256(builderBytes),entryPlanInputSha256:sha256(entryPlanInput),sourceEntry:plan.sourceEntrySha256,runtime:plan.runtime,manifest:plan.manifest,componentFactoriesModified:false,legacyUiImported:false,serviceAdapter:'Browser-local account/storage and the explicitly configured API; no original private backend or Google authentication is claimed.',sharedAssets:sharedAssets.map(({file,bytes,inputFile})=>({file,...(inputFile?{inputFile,inputSha256:sha256(bytes)}:{}),sha256:sha256(bytes)})),resources:publicAssets.map(({relative,bytes})=>({file:relative,sha256:sha256(bytes)})),siteResourceAliases,supplementalManifest:{file:supplementalManifestFile,sha256:sha256(supplementalManifestBytes)},supplementalResources:supplementalAssets.map(({file,bytes})=>({file,sha256:sha256(bytes)})),helpers:provenance},null,2)+'\n');
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
