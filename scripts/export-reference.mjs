/** Export existing captured source and literally referenced public assets.
 * Usage: node --use-env-proxy scripts/export-reference.mjs [--offline]
 *        --dependency-plan .test-output/original-client-prototype/all-static-coverage-plan.json
 * The existing full locked plan is selected automatically when available.
 * Does not automate a browser, execute source, use cookies, or call private APIs.
 */
import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(workspace, '.test-output');
const output = path.join(source, 'chatgpt-source-export');
const args = process.argv.slice(2);
const offline = args.includes('--offline');
const planPosition = args.indexOf('--dependency-plan');
if(planPosition>=0&&!args[planPosition+1])throw new Error('--dependency-plan requires a local JSON path');
const defaultDependencyPlan = path.join(source,'original-client-prototype','all-static-coverage-plan.json');
const dependencyPlanPath = planPosition<0?(existsSync(defaultDependencyPlan)?defaultDependencyPlan:null):path.resolve(workspace,args[planPosition+1]);
const literalDependencyPlan = path.join(source,'original-client-prototype','literal-module-assets-plan.json');
const additionalPlans=[];
for(let i=0;i<args.length;i++)if(args[i]==='--additional-plan'){
  if(!args[i+1]||args[i+1].startsWith('--'))throw new Error('--additional-plan requires a local JSON path');
  additionalPlans.push(path.resolve(workspace,args[++i]));
}
const dependencyPlanPaths=[...new Set([dependencyPlanPath,...additionalPlans,existsSync(literalDependencyPlan)?literalDependencyPlan:null].filter(Boolean))];
const option = (name, fallback, max) => {
  const position = args.indexOf(name), value = position < 0 ? fallback : Number(args[position + 1]);
  return Number.isInteger(value) && value >= 0 ? Math.min(value, max) : fallback;
};
const maxDownloads = args.includes('--max-downloads')?option('--max-downloads',1024,4096):dependencyPlanPaths.length?Infinity:1024;
const concurrency = Math.max(1, option('--concurrency', dependencyPlanPaths.length?12:8, 12));
const networkBudgetMs = option('--network-budget-ms',dependencyPlanPaths.length?0:60000,60000);
const within = (root, target) => {const relative=path.relative(root,target);return !relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative);};
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const rel = file => path.relative(output, file).split(path.sep).join('/');
const read = file => fs.readFile(file, 'utf8');
const exists = async file => {try {await fs.stat(file);return true;} catch {return false;}};
const atomicWrite=async(file,data)=>{const temp=file+'.tmp-'+process.pid;await fs.writeFile(temp,data);await fs.rename(temp,file);};
const startedAt = new Date().toISOString();
if (!within(workspace, output)) throw new Error('Export output is outside the workspace');
for (const target of [source, output]) if (await exists(target)) {
  if (!within(workspace, await fs.realpath(target))) throw new Error('Export path resolves outside the workspace');
}
await fs.mkdir(output, {recursive:true});
await fs.writeFile(path.join(output, '.gitignore'), '*\n');

const templates = JSON.parse(await read(path.join(workspace, 'ui', 'templates.json')));
const captures = [...new Map(Object.values(templates.provenance.pages)
  .filter(page => page.kind === 'captured' && typeof page.file === 'string')
  .map(page => [page.file, page])).values()];
const manifest = {
  format: 'captured-reference-source-export/v1', startedAt, finishedAt:null,
  sourceWorkspace: workspace, outputDirectory: output,
  privacy: 'PRIVATE LOCAL EXPORT. Raw signed-in captures can contain original account identities, histories, locations, prompts, and images. This folder is ignored and must not be published as the public clone.',
  networkPolicy: {allowed:['https://chatgpt.com/cdn/assets/','https://cdn.oaistatic.com/'],credentials:'omit',redirects:'error',browserAutomation:false,privateAPIs:false,maxDownloads:Number.isFinite(maxDownloads)?maxDownloads:'all-known-plan-assets',concurrency,networkBudgetMs,requestTimeoutMs:15000,maxAttempts:3},
  limits: ['This is an export of the supplied captured frontend and referenced public static assets, not the entire ChatGPT source code.','Uncaptured routes, server implementation, account services, model services, original credentials, and backend behavior are not reconstructed.','No guessed runtime chunk URLs or private endpoints are requested.','Raw captures are preserved, not rewritten into an offline executable application. Opening a raw capture can execute its original scripts or follow its original network URLs.'],
  captures:[], builds:[], entrypoints:[], files:[], assets:[], dependencyEdges:[], failures:[], deferred:[], skipped:[], summary:{},
};
const cache = new Map();
const discovered = new Map();
const scanned = new Set();
const failedURLs = new Set();
const edgeKeys = new Set();
const priorityURLs = [];
const planCategories = new Map();
let routeCoverage = [], planRouteCount = null;
let previousAvailable = new Set();
const trustedAssets=new Map(),journalPath=path.join(output,'asset-journal.jsonl');
try{const previous=JSON.parse(await read(path.join(output,'manifest.json')));for(const asset of previous.assets||[])if(typeof asset.url==='string'&&typeof asset.path==='string'&&within(output,path.join(output,asset.path))&&existsSync(path.join(output,asset.path))){trustedAssets.set(asset.url,asset);previousAvailable.add(asset.url);}}catch{}
try{for(const line of (await read(journalPath)).split('\n'))if(line){try{const asset=JSON.parse(line);if(typeof asset.url==='string'&&typeof asset.path==='string'&&typeof asset.sha256==='string'&&within(output,path.join(output,asset.path))&&existsSync(path.join(output,asset.path))){trustedAssets.set(asset.url,asset);previousAvailable.add(asset.url);}}catch{}}}catch{}
let journalWrite=Promise.resolve();
function rememberAsset(asset){const record={url:asset.url,path:asset.path,bytes:asset.bytes,sha256:asset.sha256};journalWrite=journalWrite.then(()=>fs.appendFile(journalPath,JSON.stringify(record)+'\n'));return journalWrite;}
const assetExtension = /\.(?:m?js|css|map|svg|woff2?|ttf|otf|eot|png|jpe?g|webp|gif|avif|ico|json|webmanifest|wasm|bin|mp3|mp4|m4a|ogg|wav|webm|xlsx|pptx|docx|task|icc)$/i;
const textExtension = /\.(?:html|css|js|mjs|json|map|svg)(?:\.下载)?$/i;
function recordURL(value, owner, baseURL, relation='literal-url') {
  const raw = value.replaceAll('&amp;', '&').replace(/[),;]+$/, '');
  let url;try {url=new URL(raw.startsWith('/cdn/assets/')?'https://chatgpt.com'+raw:raw,baseURL);} catch {return;}
  if (url.protocol !== 'https:' || url.username || url.password) return;
  const allowed = url.origin === 'https://chatgpt.com' && url.pathname.startsWith('/cdn/assets/') || url.origin === 'https://cdn.oaistatic.com';
  // A hash-locked AST plan already identifies a public static file. Preserve
  // uncommon original formats as well as the common extensions found in text.
  const lockedStatic=relation.startsWith('locked-')&&!url.pathname.endsWith('/');
  if (!allowed || !assetExtension.test(url.pathname)&&!lockedStatic) return;
  // Static asset cache/version parameters are allowed. Never transmit tokens,
  // signatures, account identifiers, coordinates, or arbitrary captured queries.
  if ([...url.searchParams.keys()].some(key => !['v','version','hash','build'].includes(key))) {
    const key=url.origin+url.pathname;
    if (!manifest.skipped.some(entry=>entry.url===key)) manifest.skipped.push({url:key,reason:'Query parameters are not on the static cache/version allowlist'});
    return;
  }
  url.hash='';
  if (!discovered.has(url.href)) discovered.set(url.href,{url:url.href,referencedBy:new Set()});
  discovered.get(url.href).referencedBy.add(owner);
  if(baseURL){const key=baseURL+'|'+url.href+'|'+relation;if(!edgeKeys.has(key)){edgeKeys.add(key);manifest.dependencyEdges.push({from:baseURL,to:url.href,relation,referencedBy:owner});}}
}
function discoverText(text, owner, baseURL) {
  const normalized=text.replaceAll('\\/','/').replaceAll('\\u002F','/').replaceAll('\\u002f','/').replaceAll('\\u0026','&');
  for (const match of normalized.matchAll(/https:\/\/(?:chatgpt\.com\/cdn\/assets\/|cdn\.oaistatic\.com\/)[^\s"'<>`\\)\]}]+/g)) recordURL(match[0],owner,baseURL);
  for (const match of normalized.matchAll(/(?<![\w:/])\/cdn\/assets\/[^\s"'<>`\\)\]}]+/g)) recordURL(match[0],owner,baseURL);
  if(!baseURL)return;
  // Resolve only literal dependency specifiers against their observed original
  // module/CSS URL. No runtime chunk-name construction or endpoint guessing.
  for(const match of normalized.matchAll(/\b(?:import|export)\s*(?!\s*\()(?:[^;\n]{0,700}?)\bfrom\s*["']([^"'\s]+)["']/g))if(/^(?:\.{1,2}\/|\/|https:\/\/)/.test(match[1]))recordURL(match[1],owner,baseURL,'esm-from');
  for(const match of normalized.matchAll(/\bimport\s*(?:\(\s*)?["']([^"'\s]+)["']/g))if(/^(?:\.{1,2}\/|\/|https:\/\/)/.test(match[1]))recordURL(match[1],owner,baseURL,'esm-import');
  for(const match of normalized.matchAll(/new\s+URL\(\s*["']([^"'\s]+)["']\s*,\s*import\.meta\.url\s*\)/g))recordURL(match[1],owner,baseURL,'import-meta-url');
  for(const match of normalized.matchAll(/(?:\/\/[#@]|\/\*[#@])\s*sourceMappingURL\s*=\s*([^\s*]+)/g))if(!match[1].startsWith('data:'))recordURL(match[1],owner,baseURL,'source-map-comment');
  if(new URL(baseURL).pathname.endsWith('.css')){
    for(const match of normalized.matchAll(/url\(\s*(["']?)([^)"'\s]+)\1\s*\)/g))recordURL(match[2],owner,baseURL,'css-url');
    for(const match of normalized.matchAll(/@import\s*["']([^"'\s]+)["']/g))recordURL(match[1],owner,baseURL,'css-import');
  }
}
for(const [planIndex,dependencyPlanPath]of dependencyPlanPaths.entries()){
  if(!within(workspace,dependencyPlanPath)||!within(workspace,await fs.realpath(dependencyPlanPath)))throw new Error('Dependency plan must stay inside the workspace');
  const text=await read(dependencyPlanPath),plan=JSON.parse(text),owner=planIndex===0?'evidence/dependency-plan.json':`evidence/dependency-plan-${planIndex+1}.json`;
  await fs.mkdir(path.join(output,'evidence'),{recursive:true});await fs.writeFile(path.join(output,owner),text);
  if(plan.runtimeFile&&plan.runtimeSha256){const runtime=path.resolve(workspace,plan.runtimeFile);if(!within(workspace,runtime)||digest(await fs.readFile(runtime))!==plan.runtimeSha256)throw new Error('Dependency plan runtime hash does not match the locked source');}
  if(plan.runtimeSha256&&manifest.dependencyPlan?.runtimeSha256&&plan.runtimeSha256!==manifest.dependencyPlan.runtimeSha256)throw new Error('Dependency plans refer to different runtime builds');
  if(plan.manifestVersion&&manifest.dependencyPlan?.manifestVersion&&plan.manifestVersion!==manifest.dependencyPlan.manifestVersion)throw new Error('Dependency plans refer to different route manifests');
  const entryURLs=plan.entryClosure?.missingLazyJavascriptURLs||plan.categories?.entry||[];
  for(const value of entryURLs){recordURL(value,owner,undefined,'locked-entry-plan');const url=new URL(value,'https://chatgpt.com').href;if(discovered.has(url))priorityURLs.push(url);}
  const sections=[];
  for(const [name,section]of Object.entries(plan))if(section&&typeof section==='object'){
    let count=0;
    for(const value of section.missingLazyJavascriptURLs||[]){recordURL(value,owner,undefined,'locked-lazy-plan');count++;}
    for(const chunk of section.missingLazyChunks||[])for(const key of ['javascriptURL','cssURL','assetURL'])if(typeof chunk[key]==='string'){recordURL(chunk[key],owner,undefined,'locked-lazy-plan');count++;}
    if(count)sections.push({name,exactReferences:count});
  }
  for(const [name,values]of Object.entries(plan.categories||{}))if(Array.isArray(values)){
    const urls=new Set();for(const value of values)if(typeof value==='string'){recordURL(value,owner,undefined,'locked-category');let url;try{url=new URL(value,'https://chatgpt.com').href;}catch{}if(discovered.has(url))urls.add(url);}
    const existing=planCategories.get(name)||new Set();for(const url of urls)existing.add(url);planCategories.set(name,existing);
    if(['entry','routeModules','routeImports','routeCSS','localeCatalogs','htmlResources'].includes(name))priorityURLs.push(...urls);
  }
  for(const value of plan.allURLs||[])recordURL(value,owner,undefined,'locked-all-static-plan');
  planRouteCount=plan.routeCount||planRouteCount;
  const inventoryPath=path.join(path.dirname(dependencyPlanPath),'inventory.json');
  if(await exists(inventoryPath)){
    const inventory=JSON.parse(await read(inventoryPath));
    if(!plan.manifestVersion||inventory.manifest?.version===plan.manifestVersion){
      const refs=value=>{const urls=new Set();const walk=v=>{if(Array.isArray(v)){v.forEach(walk);return;}if(v&&typeof v==='object'){Object.values(v).forEach(walk);return;}if(typeof v==='string'&&(/^(?:\/cdn\/assets\/|https:\/\/(?:chatgpt\.com\/cdn\/assets\/|cdn\.oaistatic\.com\/))/.test(v))){recordURL(v,owner,undefined,'locked-route');const url=new URL(v,'https://chatgpt.com').href;if(discovered.has(url))urls.add(url);}};walk(value);return[...urls];};
      routeCoverage=(inventory.manifest?.routes||[]).map(route=>({id:route.id,path:route.path??null,index:!!route.index,urls:refs(route),runtimeInteractions:'unverified'}));
    }
  }
  const planRecord={file:path.relative(workspace,dependencyPlanPath).split(path.sep).join('/'),sha256:digest(text),runtimeSha256:plan.runtimeSha256||null,manifestVersion:plan.manifestVersion||null,entryPriorityURLs:[...new Set(priorityURLs)],sections,categories:Object.fromEntries([...planCategories].map(([name,urls])=>[name,urls.size])),routeCount:planRouteCount,overallTimeLimit:networkBudgetMs>0?networkBudgetMs:false};
  if(!manifest.dependencyPlan)manifest.dependencyPlan=planRecord;
  (manifest.dependencyPlans||=[]).push(planRecord);
  console.log(JSON.stringify({stage:'dependency-plan',file:planRecord.file,entryPriority:priorityURLs.length,knownPlanURLs:discovered.size,sections}));
}
async function scanFile(file, owner) {
  if(scanned.has(file)||!textExtension.test(file))return;scanned.add(file);
  const stat=await fs.stat(file);if(stat.size>32*1024*1024)return;
  discoverText(await read(file),owner);
}
async function copyFile(input, relativePath, kind) {
  const target=path.join(output,relativePath);
  if(!within(output,target))throw new Error('Unsafe export target');
  await fs.mkdir(path.dirname(target),{recursive:true});
  const stat=await fs.stat(input);
  let alreadyCurrent=false;try{const previous=await fs.stat(target);alreadyCurrent=previous.size===stat.size&&previous.mtimeMs>=stat.mtimeMs;}catch{}
  if(!alreadyCurrent)await fs.copyFile(input,target);
  manifest.files.push({path:rel(target),bytes:stat.size,kind,originalLocalPath:path.relative(workspace,input).split(path.sep).join('/')});
  const name=path.basename(input);if(!cache.has(name))cache.set(name,input);
  await scanFile(input,rel(target));
}
async function walk(directory) {
  const result=[];
  for(const entry of await fs.readdir(directory,{withFileTypes:true})){
    const file=path.join(directory,entry.name);
    if(entry.isSymbolicLink())continue;
    if(entry.isDirectory())result.push(...await walk(file));else if(entry.isFile())result.push(file);
  }
  return result;
}
async function batches(items, action, size=concurrency) {
  for(let offset=0;offset<items.length;offset+=size){
    const batch=items.slice(offset,offset+size),results=await Promise.allSettled(batch.map(action));
    for(let i=0;i<results.length;i++)if(results[i].status==='rejected')throw new Error(`Local export failed for ${String(batch[i])}: ${results[i].reason?.message||results[i].reason}`);
  }
}

// Preserve verified raw HTML, including the original saved-from-URL header.
for(const capture of captures){
  const input=path.join(source,capture.file),raw=await read(input);
  if(!/<!--\s*saved from url=/i.test(raw))throw new Error(`Capture lost its verified full-save marker: ${capture.file}`);
  const clientBuildRevision=raw.match(/data-client-build-revision=["']([^"']+)["']/)?.[1]||null;
  const build=raw.match(/data-build=["']([^"']+)["']/)?.[1]||null;
  manifest.captures.push({file:capture.file,path:'raw/'+capture.file,sourceSha256:digest(raw),sourceURL:raw.match(/saved from url=\(\d+\)([^\s>]+)/i)?.[1]||null,build,clientBuildRevision});
}
manifest.builds=[...new Set(manifest.captures.map(c=>c.clientBuildRevision||c.build).filter(Boolean))].map(revision=>({revision,captures:manifest.captures.filter(c=>(c.clientBuildRevision||c.build)===revision).map(c=>c.file)}));
await batches(captures,capture=>copyFile(path.join(source,capture.file),path.join('raw',capture.file),'verified-raw-html'));
const sourceEntries=await fs.readdir(source,{withFileTypes:true});
const directories=sourceEntries.filter(entry=>entry.isDirectory()&&(entry.name.endsWith('_files')||['reference-assets','reference-js'].includes(entry.name)));
const localWork=[];
// Prefer explicit public caches over repeated browser resources for URL reuse.
directories.sort((a,b)=>(a.name==='reference-assets'?-2:a.name==='reference-js'?-1:0)-(b.name==='reference-assets'?-2:b.name==='reference-js'?-1:0));
for(const dir of directories)for(const input of await walk(path.join(source,dir.name)))localWork.push({input,destination:path.join('raw',dir.name,path.relative(path.join(source,dir.name),input))});
await batches(localWork,item=>copyFile(item.input,item.destination,'saved-reference-resource'),12);
const evidenceFiles=sourceEntries.filter(entry=>entry.isFile()&&/^(?:capture-.*\.json|reference-.*\.(?:json|svg|css|vert|frag)|signed-ui-specs\.json|chatgpt-public\.(?:html|css))$/.test(entry.name));
await batches(evidenceFiles,entry=>copyFile(path.join(source,entry.name),path.join('evidence',entry.name),'capture-evidence'),12);
for(const directory of ['ui/assets','companion-assets'])if(await exists(path.join(workspace,directory))){
  await batches(await walk(path.join(workspace,directory)),input=>copyFile(input,path.join('public-cache',directory,path.relative(path.join(workspace,directory),input)),'existing-public-cache'),12);
}
const iconSprite=path.join(source,'reference-icons.svg');
if(await exists(iconSprite)){
  const spriteHash=digest(await fs.readFile(iconSprite));
  for(const [url]of discovered){const match=new URL(url).pathname.match(/\/icons-([\da-f]+)\.svg$/);if(match&&spriteHash.startsWith(match[1]))cache.set(path.posix.basename(new URL(url).pathname),iconSprite);}
}
console.log(JSON.stringify({stage:'copied-local-source',captures:captures.length,files:manifest.files.length,knownPublicURLs:discovered.size}));

function publicTarget(urlString){
  const url=new URL(urlString),parts=url.pathname.split('/').filter(Boolean);
  if(parts.some(part=>part==='.'||part==='..'||/[<>:"|?*\\]/.test(part)))throw new Error('Unsupported public asset filename');
  if(url.search){const last=parts.pop(),ext=path.posix.extname(last);parts.push(last.slice(0,-ext.length)+'.query-'+digest(url.search).slice(0,12)+ext);}
  const target=path.join(output,'public',url.hostname,...parts);if(!within(output,target))throw new Error('Unsafe public asset target');return target;
}
const complete = new Set();let requests=0,networkCompleted=0,lastProgress=0,entryReadySent=false;
const networkStartedAt=Date.now(),networkDeadline=networkBudgetMs>0?networkStartedAt+networkBudgetMs:Infinity;
let lastCoverage=0,coverageWrite=Promise.resolve();
function counts(urls){let available=0,unfetchable=0;const missingExamples=[],failureExamples=[];for(const url of urls){if(complete.has(url)||previousAvailable.has(url))available++;else if(failedURLs.has(url)){unfetchable++;if(failureExamples.length<20)failureExamples.push(url);}else if(missingExamples.length<20)missingExamples.push(url);}return{known:urls.size,available,missing:urls.size-available-unfetchable,unfetchable,missingExamples,failureExamples};}
function coverage(){
  const categories=Object.fromEntries([...planCategories].map(([name,urls])=>[name,counts(urls)]));
  const known=new Set(discovered.keys());
  categories.allKnownStatic=counts(known);
  categories.iconSprites=counts(new Set([...known].filter(url=>/\/(?:[^/]*icons?[-.]|[^/]*sprite)[^/]*\.(?:svg|png|webp)$/i.test(new URL(url).pathname))));
  categories.sourceMaps=counts(new Set([...known].filter(url=>new URL(url).pathname.endsWith('.map'))));
  const dotResources=new Set(planCategories.get('literalDotResources')||[]);
  for(const url of known)if(/(?:^|[-_/])(?:dot|orbit|beacon)(?:[-_/.]|$)/i.test(new URL(url).pathname))dotResources.add(url);
  categories.literalDotResources={...counts(dotResources),classification:'Exact literal module or pathname references only; does not establish all DOT features or native integration.'};
  return{schemaVersion:1,generatedAt:new Date().toISOString(),sourceBuild:manifest.builds.map(b=>b.revision),runtimeLock:manifest.dependencyPlan?.runtimeSha256||null,manifestVersion:manifest.dependencyPlan?.manifestVersion||manifest.entrypoints[0]?.version||null,manifestRouteCount:planRouteCount,routeRecords:routeCoverage.length,categories,routes:routeCoverage.map(route=>({...route,staticFiles:counts(new Set(route.urls))})),unverifiedRuntime:{clicksAndStateBranches:'not exercised by this static exporter',settingsSuboptions:'files may be present; option branches and service results remain unverified',DOT:'native host integration and product-specific runtime behavior remain unverified',authenticatedAccountServices:'not copied or requested',modelsAndToolExecution:'remote/backend services are not included',sourceAvailabilityBoundary:'Queue completion proves only the known static asset set, not complete website behavior or backend implementation.'},manifest:'manifest.json'};
}
function queueCoverage(force=false){if(!force&&networkCompleted-lastCoverage<100)return;lastCoverage=networkCompleted;coverageWrite=coverageWrite.then(async()=>{const target=path.join(output,'coverage.json'),temp=target+'.tmp';await fs.writeFile(temp,JSON.stringify(coverage(),null,2)+'\n');await fs.rename(temp,target);});}
function reportProgress(){
  if(!entryReadySent&&priorityURLs.length&&priorityURLs.every(url=>complete.has(url))){entryReadySent=true;console.log(JSON.stringify({stage:'entry-plan-ready',available:priorityURLs.length,total:priorityURLs.length}));}
  if(networkCompleted-lastProgress>=20){lastProgress=networkCompleted;console.log(JSON.stringify({stage:'download-progress',completedNetworkAssets:networkCompleted,available:complete.size,requests,failed:failedURLs.size,known:discovered.size,remaining:discovered.size-complete.size-failedURLs.size}));}
  queueCoverage();
}
async function materialize(entry){
  const target=publicTarget(entry.url),url=new URL(entry.url),name=decodeURIComponent(path.posix.basename(url.pathname));
  await fs.mkdir(path.dirname(target),{recursive:true});
  let origin,bytes;
  const previous=trustedAssets.get(entry.url);
  if(previous&&await exists(target)){
    const existing=await fs.readFile(target);
    if(existing.length===previous.bytes&&digest(existing)===previous.sha256){origin='previous-export';bytes=existing;}
    else previousAvailable.delete(entry.url);
  }
  if(!bytes&&cache.has(name)&&path.resolve(cache.get(name))!==path.resolve(target)){origin='existing-local-source';bytes=await fs.readFile(cache.get(name));await atomicWrite(target,bytes);}
  if(!bytes){
    if(offline||requests>=maxDownloads||Date.now()>=networkDeadline)return false;
    let lastError,attempts=0;
    for(let attempt=0;attempt<3;attempt++){
      if(Date.now()>=networkDeadline||requests>=maxDownloads)return false;
      requests++;attempts++;
      try{
        const response=await fetch(entry.url,{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(Math.max(1,Math.min(15000,networkDeadline-Date.now())))});
        if(!response.ok){const error=new Error(`HTTP ${response.status}`);error.status=response.status;throw error;}
        const declared=Number(response.headers.get('content-length')||0);if(declared>128*1024*1024)throw new Error('Asset exceeds 128 MiB bound');
        bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>128*1024*1024)throw new Error('Asset exceeds 128 MiB bound');
        await atomicWrite(target,bytes);cache.set(name,target);origin='downloaded-public-static';lastError=null;break;
      }catch(error){lastError=error;if(error.status===404||error.status===410||/exceeds .*bound/.test(error.message))break;if(attempt<2)await new Promise(resolve=>setTimeout(resolve,100*(attempt+1)));}
    }
    networkCompleted++;
    if(lastError){failedURLs.add(entry.url);manifest.failures.push({url:entry.url,reason:String(lastError.message||lastError),attempts,referencedBy:[...entry.referencedBy]});reportProgress();return true;}
  }
  const asset={url:entry.url,path:rel(target),bytes:bytes.length,sha256:digest(bytes),origin,referencedBy:[...entry.referencedBy]};
  if(origin!=='previous-export')await rememberAsset(asset);
  complete.add(entry.url);
  manifest.assets.push(asset);
  // Follow literal imports/URLs; every original module remains a separate file.
  if(textExtension.test(url.pathname))discoverText(bytes.toString('utf8'),rel(target),entry.url);
  reportProgress();
  return true;
}
queueCoverage(true);
for(let pass=0;;pass++){
  const ordered=[...new Set([...priorityURLs,...discovered.keys()])];
  const pending=ordered.map(url=>discovered.get(url)).filter(entry=>!complete.has(entry.url)&&!failedURLs.has(entry.url));
  if(!pending.length)break;
  const beforeComplete=complete.size,beforeFailed=failedURLs.size,beforeKnown=discovered.size;
  for(let offset=0;offset<pending.length;offset+=concurrency){
    const batch=pending.slice(offset,offset+concurrency),results=await Promise.allSettled(batch.map(materialize));
    for(let i=0;i<results.length;i++)if(results[i].status==='rejected'){
      failedURLs.add(batch[i].url);manifest.failures.push({url:batch[i].url,reason:String(results[i].reason?.message||results[i].reason),referencedBy:[...batch[i].referencedBy]});
    }
  }
  console.log(JSON.stringify({stage:'public-assets',pass:pass+1,available:manifest.assets.length,downloadRequests:requests,failed:manifest.failures.length,knownPublicURLs:discovered.size}));
  if(complete.size===beforeComplete&&failedURLs.size===beforeFailed&&discovered.size===beforeKnown)break;
}
manifest.deferred=[...discovered.values()].filter(entry=>!complete.has(entry.url)&&!failedURLs.has(entry.url)).map(entry=>({url:entry.url,referencedBy:[...entry.referencedBy],reason:offline?'offline export':Date.now()>=networkDeadline?'60-second public network budget reached':requests>=maxDownloads?'public download bound reached':'bounded discovery passes completed'}));
for(const asset of manifest.assets.filter(a=>/\/manifest-[\w-]+\.js$/.test(new URL(a.url).pathname))){
  const text=await read(path.join(output,asset.path));
  const version=text.match(/["']version["']\s*:\s*["']([^"']+)["']/)?.[1]||null;
  const module=text.match(/["']entry["']\s*:\s*\{\s*["']module["']\s*:\s*["']([^"']+)["']/)?.[1];
  const imports=text.match(/["']entry["']\s*:\s*\{[^}]*?["']imports["']\s*:\s*\[([^\]]*)\]/)?.[1]||'';
  if(module)manifest.entrypoints.push({manifestURL:asset.url,version,moduleURL:new URL(module,asset.url).href,importURLs:[...imports.matchAll(/["']([^"']+)["']/g)].map(m=>new URL(m[1],asset.url).href)});
}
manifest.finishedAt=new Date().toISOString();
manifest.summary={verifiedCaptures:captures.length,copiedLocalFiles:manifest.files.length,copiedLocalBytes:manifest.files.reduce((sum,f)=>sum+f.bytes,0),knownPublicURLs:discovered.size,availablePublicAssets:manifest.assets.length,reusedPublicAssets:manifest.assets.filter(a=>a.origin!=='downloaded-public-static').length,downloadedPublicAssets:manifest.assets.filter(a=>a.origin==='downloaded-public-static').length,downloadRequests:requests,publicAssetBytes:manifest.assets.reduce((sum,a)=>sum+a.bytes,0),dependencyEdges:manifest.dependencyEdges.length,failedAssets:manifest.failures.length,deferredAssets:manifest.deferred.length,skippedQueries:manifest.skipped.length,publicAssetPhaseMs:Date.now()-networkStartedAt};
await journalWrite;
await atomicWrite(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
queueCoverage(true);await coverageWrite;
await fs.writeFile(path.join(output,'README.txt'),`PRIVATE LOCAL CAPTURED SOURCE EXPORT\n\nGenerated by: node --use-env-proxy scripts/export-reference.mjs\n\nraw/ preserves the verified original HTML and browser-saved resource folders.\nevidence/ contains supplied public-source capture metadata and the selected dependency plan.\npublic/ mirrors exact referenced public static asset URLs.\npublic-cache/ preserves existing downloaded public assets, fonts, icons, and companion atlases.\nmanifest.json maps original asset URLs to local paths and records failures and bounds.\ncoverage.json records static resource categories, every manifest route, and unverified runtime behavior.\n\nThis is ${captures.length} supplied frontend captures and the known static dependency graph, not the entire ChatGPT source code.\nNo browser automation, cookies, authentication, private API requests, or original script execution was used to build it.\nRaw signed-in captures may contain original account data, histories, locations, prompts, and images. Keep this ignored folder private; do not publish it with the clone.\nRaw HTML was not rewritten into an offline application; opening it can execute its original scripts and contact its original hosts.\n\nRerun command: node --use-env-proxy scripts/export-reference.mjs\nThe existing all-static-coverage-plan.json is selected automatically.\nExplicit plan: --dependency-plan .test-output/original-client-prototype/all-static-coverage-plan.json\nOffline reuse only: node scripts/export-reference.mjs --offline\nOptional bounded completion: --max-downloads 512 --concurrency 8\n\nSummary:\n${JSON.stringify(manifest.summary,null,2)}\n`);
console.log(JSON.stringify({stage:'complete',output,manifest:path.join(output,'manifest.json'),...manifest.summary}));
