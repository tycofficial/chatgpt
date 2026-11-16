/** Publishable static files only; raw signed-in HTML and account state stay local. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const workspace=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(workspace,'.test-output/chatgpt-source-export');
const output=path.join(workspace,'original-client');
const snapshot=JSON.parse(await fs.readFile(path.join(source,'manifest.json'),'utf8'));
const reserveBytes=128*1024*1024;
// Remove a vendor map-service credential rejected by repository publication
// rules. Its original bytes remain in the local source export. UI code is kept.
const blockedCredentialHashes=new Set(['3a256a452853090b10c49b82cc2ad3f412ca817a4140bffaf0621013e5edb8a7']);
const publishBytes=bytes=>Buffer.from(bytes.toString('utf8').replace(/\b[ps]k\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,value=>blockedCredentialHashes.has(crypto.createHash('sha256').update(value).digest('hex'))?'':value),'utf8');
const inside=(base,file)=>{const r=path.relative(base,file);return r!==''&&!r.startsWith('..'+path.sep)&&r!=='..'&&!path.isAbsolute(r);};
await fs.mkdir(output,{recursive:true});
if(!inside(workspace,await fs.realpath(output)))throw Error('Resource output resolves outside workspace');
let previous=new Map();
try{const saved=JSON.parse(await fs.readFile(path.join(output,'resource-manifest.json'),'utf8'));previous=new Map(saved.assets.map(a=>[a.url,a]));}catch{}
let writing=Promise.resolve();
function atomicWrite(file,bytes){
 const operation=writing.then(async()=>{const stat=await fs.statfs(output),free=Number(stat.bavail)*Number(stat.bsize);if(free-bytes.length<reserveBytes)throw Error('Insufficient disk space: preserving 128 MiB reserve');const temp=file+'.tmp-'+process.pid;await fs.writeFile(temp,bytes);await fs.rename(temp,file);});
 writing=operation.catch(()=>{});return operation;
}
const entries=snapshot.assets.map(asset=>{
 const u=new URL(asset.url);if(u.protocol!=='https:'||!(u.origin==='https://chatgpt.com'&&u.pathname.startsWith('/cdn/assets/')||u.origin==='https://cdn.oaistatic.com'))throw Error('Resource is not public static content');
 if(!asset.path.startsWith('public/'))throw Error('Raw captures cannot be published');
 const from=path.resolve(source,asset.path),to=path.resolve(output,asset.path);
 if(!inside(source,from)||!inside(output,to))throw Error('Unsafe resource path');
 return{asset,from,to};
});
let index=0,done=0,copied=0,unchanged=0;
await Promise.all(Array.from({length:4},async()=>{while(index<entries.length){
 const entry=entries[index++],{asset,from,to}=entry,old=previous.get(asset.url);
 let currentSize=-1;try{currentSize=(await fs.stat(to)).size;}catch{}
 if(old&&old.path===asset.path&&(old.originalSha256||old.sha256)===asset.sha256&&currentSize===old.bytes){
  entry.publishedBytes=old.bytes;entry.publishedSha256=old.sha256;unchanged++;
 }else{
  const bytes=await fs.readFile(from),hash=crypto.createHash('sha256').update(bytes).digest('hex');if(hash!==asset.sha256)throw Error('Resource hash mismatch: '+asset.url);
  const published=/\.m?js$/.test(to)?publishBytes(bytes):bytes;entry.publishedBytes=published.length;entry.publishedSha256=crypto.createHash('sha256').update(published).digest('hex');
  await fs.mkdir(path.dirname(to),{recursive:true});await atomicWrite(to,published);copied++;
 }
 done++;if(done%200===0)console.log(JSON.stringify({processed:done,copied,unchanged,total:entries.length}));
}}));
const entryPlan=JSON.parse(await fs.readFile(path.join(workspace,'.test-output/original-client-prototype/entry-plan.json'),'utf8'));
const published={format:'original-public-static-resources/v1',syncedAt:new Date().toISOString(),sourceBuild:'ef0c3fb941611420d8683bf88f61acf1a8ac6b19',runtime:entryPlan.runtime,manifest:entryPlan.manifest,initialRoutes:entryPlan.initialRoutes,assets:entries.map(({asset,publishedBytes,publishedSha256})=>({url:asset.url,path:asset.path,bytes:publishedBytes,sha256:publishedSha256,...(publishedSha256!==asset.sha256?{originalBytes:asset.bytes,originalSha256:asset.sha256,sourceTransform:'removed-vendor-map-credential'}:{})})),coverage:{downloadedPublicAssets:entries.length,knownStaticURLs:snapshot.summary.knownPublicURLs,unfetchableStaticAssets:snapshot.failures.map(({url,reason})=>({url,reason})),frontendExecutionVerified:false,allInteractionsVerified:false,privateBackendIncluded:false}};
await atomicWrite(path.join(output,'resource-manifest.json'),Buffer.from(JSON.stringify(published,null,2)+'\n'));
console.log(JSON.stringify({processed:done,copied,unchanged,sourceBytes:entries.reduce((n,e)=>n+e.asset.bytes,0),publishedBytes:entries.reduce((n,e)=>n+e.publishedBytes,0),manifest:'original-client/resource-manifest.json'}));
