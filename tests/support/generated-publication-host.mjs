/** Genuine filesystem persistence plus Node's native cross-worker LockManager. */
import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {Worker,isMainThread,parentPort,workerData,threadId} from 'node:worker_threads';
export async function durablePublicationHost(root,{accountId='publication-owner-fs',metrics,barrier,onSource}={}){
 await fs.mkdir(path.join(root,'raw'),{recursive:true});await fs.mkdir(path.join(root,'metadata'),{recursive:true});
 const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
 const rawPath=key=>path.join(root,'raw',hash(key)),metaPath=key=>path.join(root,'metadata',hash(key));
 const storage={
  async read(key){try{return new Uint8Array(await fs.readFile(rawPath(key)));}catch(error){if(error.code==='ENOENT')throw Error('File not found');throw error;}},
  async write(key,bytes){const target=rawPath(key),temporary=target+'.'+process.pid+'-'+threadId+'.tmp';await fs.writeFile(temporary,bytes);await fs.rename(temporary,target);if(barrier&&key.includes('--publication-')){Atomics.add(barrier,0,1);while(Atomics.load(barrier,0)<2)await new Promise(resolve=>setTimeout(resolve,2));}},
  async remove(key){try{await fs.unlink(rawPath(key));}catch(error){if(error.code!=='ENOENT')throw error;}},
 };
 const metadataStorage={
  getItem(key){try{return fss.readFileSync(metaPath(key),'utf8');}catch(error){if(error.code==='ENOENT')return null;throw error;}},
  setItem(key,value){const target=metaPath(key),temporary=target+'.'+process.pid+'-'+threadId+'.tmp';fss.writeFileSync(temporary,value,'utf8');fss.renameSync(temporary,target);},
 };
 const ownerLock='chatgpt-local-files:'+encodeURIComponent(accountId);
 const storageLocks={request:(name,options,callback)=>globalThis.navigator.locks.request(name,options,async lock=>{
  const measured=metrics&&name===ownerLock;if(measured){const count=Atomics.add(metrics,0,1)+1;Atomics.add(metrics,2,1);if(count>1)Atomics.store(metrics,1,1);await new Promise(resolve=>setTimeout(resolve,3));}
  try{return await callback(lock);}finally{if(measured)Atomics.sub(metrics,0,1);}
 })};
 const getWorkspacePrefix=id=>accountId+'--'+encodeURIComponent(id);let sources=0;
 const getOwnedSourceWorkspace=async({threadId,signal})=>{signal?.throwIfAborted();if(threadId!=='owned-thread')throw Object.assign(Error('Neutral thread missing'),{status:404});sources++;await onSource?.(sources);return{accountId,threadId,prefix:getWorkspacePrefix(threadId)};};
 return{storage,metadataStorage,storageLocks,getAccountId:()=>accountId,getWorkspacePrefix,getOwnedSourceWorkspace,source:(name,bytes)=>storage.write(getWorkspacePrefix('owned-thread')+'/'+name,typeof bytes==='string'?new TextEncoder().encode(bytes):bytes),state:()=>JSON.parse(metadataStorage.getItem('site-local-files:v1:'+encodeURIComponent(accountId))??'{"files":{},"generatedFiles":{},"publicationOps":{}}')};
}
export function publicationWorker(data){
 const node=new Worker(new URL(import.meta.url),{type:'module',workerData:data});
 let readyResolve;const ready=new Promise(resolve=>readyResolve=resolve);
 const result=new Promise((resolve,reject)=>{node.on('message',message=>{if(message.type==='before-commit')readyResolve(message);if(message.type==='result')resolve(message);});node.once('error',reject);node.once('exit',code=>{if(code!==0&&code!==1)reject(Error('Publication worker exited '+code));});});
 return{node,result,ready,terminate:()=>node.terminate()};
}
if(!isMainThread){
 parentPort.on('message',()=>{}); // A real host port keeps an unfinished job alive.
 let extractor;
 try{
  const {createLocalFilesService}=await import(workerData.serviceURL);
  const host=await durablePublicationHost(workerData.root,{metrics:workerData.metrics,barrier:workerData.barrier,onSource:async count=>{if(workerData.mode==='pause-after-genuine-parser'&&count===2){parentPort.postMessage({type:'before-commit'});await new Promise(()=>{});}}});
  if(workerData.mode==='pause-after-genuine-parser'){
   const {createLocalDocumentExtractor}=await import(workerData.extractorURL);
   // The existing host is itself a Worker entry; importing it inside another
   // worker would bootstrap with the coordinator's unrelated workerData.
   // Launch that exact entry using its real message protocol instead.
   const workerFactory=entry=>{
    const node=new Worker(new URL(workerData.documentHostURL),{type:'module',workerData:{entry:entry.href}}),listeners=new Map();
    node.on('error',()=>{});
    return{postMessage:(value,transfer)=>node.postMessage(value,transfer),addEventListener(kind,callback){const fn=kind==='message'?data=>callback({data}):error=>callback({error,message:error.message});listeners.set(callback,{kind,fn});node.on(kind,fn);},removeEventListener(_kind,callback){const value=listeners.get(callback);if(value){node.off(value.kind,value.fn);listeners.delete(callback);}},terminate:()=>node.terminate()};
   };
   const entry=new URL('../../src/native-client/document-text-worker.mjs',workerData.documentHostURL);
   extractor=createLocalDocumentExtractor({workerFactory,workerURL:entry});
  }
  const service=createLocalFilesService({...host,documentExtractor:extractor});
  const receipt=await service.publishGeneratedFile(workerData.spec,{signal:AbortSignal.timeout(10000)});
  parentPort.postMessage({type:'result',ok:true,receipt});
 }catch(error){parentPort.postMessage({type:'result',ok:false,error:{name:error.name,status:error.status,code:error.code,message:error.message,cleanupPending:error.cleanupPending}});}
 finally{extractor?.close();parentPort.close();}
}
