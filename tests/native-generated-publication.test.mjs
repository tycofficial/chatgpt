import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createLocalFilesService} from '../src/native-client/local-files-service.mjs';
import {createLocalDocumentExtractor} from '../src/native-client/local-document-extraction.mjs';
import {createNodeDocumentWorkerFactory,canonicalDocumentWorkerURL} from './support/document-worker-host.mjs';
import {makeDocx} from './support/document-fixtures.mjs';
const encoder=new TextEncoder(),decoder=new TextDecoder(),digest=bytes=>createHash('sha256').update(bytes).digest('hex');
function environment(t,options={}){
 let account='publication-owner-a',clock=1800000000000;const actual=new Map(),metadata=new Map(),threads=new Set(['owned-thread']),calls=[];
 const storage={async write(key,bytes){await options.beforeWrite?.(key,bytes);if(options.failWrite?.(key,bytes))throw Error('Neutral write quota failure');actual.set(key,new Uint8Array(bytes));await options.afterWrite?.(key,bytes);},async read(key){await options.beforeRead?.(key);if(options.failRead?.(key))throw Error('Neutral read IO failure');if(!actual.has(key))throw Error('File not found');const value=new Uint8Array(actual.get(key));await options.afterRead?.(key,value);return value;},async remove(key){await options.beforeRemove?.(key);if(options.failRemove?.(key))throw Error('Neutral remove IO failure');if(!options.noOpRemove?.(key))actual.delete(key);await options.afterRemove?.(key);}};
 const metadataStorage={getItem:key=>{if(options.metadataReadError)throw options.metadataReadError;return metadata.get(key)??null;},setItem(key,value){const parsed=JSON.parse(value);options.beforeMetadata?.(parsed);if(options.failMetadata?.(parsed))throw Error('Neutral metadata quota failure');metadata.set(key,value);options.afterMetadata?.(parsed);}};
 const prefix=threadId=>account+'--'+encodeURIComponent(threadId);
 const getOwnedSourceWorkspace=async({threadId,signal})=>{signal?.throwIfAborted();await options.beforeSource?.(threadId);if(!threads.has(threadId))throw Object.assign(Error('Neutral source thread missing'),{status:404,code:'thread_not_found'});if(options.sourceContext)return options.sourceContext({threadId,account,prefix});return{threadId,accountId:account,prefix:prefix(threadId)};};
 let extractor;
 if(options.realDocuments){const workerFactory=createNodeDocumentWorkerFactory();extractor=createLocalDocumentExtractor({workerFactory,workerURL:canonicalDocumentWorkerURL('generated-publication-test')});t.after(()=>extractor.close());options.documentExtractor=extractor;}
 const args={storage,metadataStorage,getAccountId:()=>account,getWorkspacePrefix:prefix,getOwnedSourceWorkspace,storageLocks:globalThis.navigator?.locks,now:()=>clock,documentExtractor:options.documentExtractor,maxTotalBytes:options.maxTotalBytes??256*1024*1024,...options.factory};
 const service=createLocalFilesService(args);
 const source=async(path,text)=>{const bytes=typeof text==='string'?encoder.encode(text):text;await storage.write(prefix('owned-thread')+'/'+path,bytes);return{bytes,sha256:digest(bytes)};};
 const state=()=>JSON.parse([...metadata.values()][0]??'{"version":1,"files":{},"generatedFiles":{},"publicationOps":{}}');
 return{service,storage,metadataStorage,actual,metadata,options,threads,args,source,state,prefix,setAccount:value=>{account=value;},setClock:value=>{clock=value;},restore:()=>createLocalFilesService(args),calls};
}
const spec=(requestId='tool_'+'a'.repeat(64),extra={})=>({requestId,threadId:'owned-thread',path:'report.txt',...extra});
const rawKeys=env=>[...env.actual.keys()].filter(key=>key.includes('--publication-'));
const currentRows=env=>Object.values(env.state().generatedFiles??{});
async function publish(env,request='tool_'+'a'.repeat(64),extra={},signal){return env.service.publishGeneratedFile(spec(request,extra),{signal});}

test('explicit publication saves real bytes and one logical Library row without tickets, namespace leaks or auto-imports',async t=>{
 const env=environment(t),source=await env.source('report.txt','Generated neutral version one.');await env.source('.logs/task.txt','A real log stays only in VFS.');
 const receipt=await publish(env);assert.equal(receipt.committed,true);assert.notEqual(receipt.fileId,receipt.rawFileId);assert.equal(receipt.sha256,source.sha256);assert.equal(receipt.fileName,'report.txt');assert.equal(receipt.mimeType,'text/plain');
 const raw=await env.service.readFile(receipt.rawFileId);assert.deepEqual(raw.bytes,source.bytes);assert.equal(raw.record.fileId,receipt.rawFileId);assert.deepEqual(raw.record.generated,{fileId:receipt.fileId,revision:1,operationKey:digest(encoder.encode(receipt.operationId))});assert.equal(raw.record.ticket,undefined);assert.equal(raw.record.uploadURL,undefined);
 const rows=await env.service.listFiles();assert.equal(rows.length,1);assert.equal(rows[0].fileId,receipt.fileId);assert.equal(rows[0].rawFileId,receipt.rawFileId);assert.deepEqual(rows[0].publication,{origin:'generated',revision:1,updatedAt:1800000000000});assert.equal(/ticket|namespace|operationKey|sourcePath/.test(JSON.stringify(rows)),false);
 await assert.rejects(()=>env.service.readFile(receipt.fileId),error=>error.status===404);assert.equal(rawKeys(env).length,1);
});

test('edits keep logical identity, retain charged immutable revisions, and restore across fresh service instances',async t=>{
 const env=environment(t);const first=await env.source('report.txt','Old immutable bytes.'),a=await publish(env);
 const second=await env.source('report.txt','Different new immutable bytes.'),b=await publish(env,'edit-b',{fileId:a.fileId,expectedRevision:a.revision,expectedRawFileId:a.rawFileId});
 assert.equal(a.fileId,b.fileId);assert.notEqual(a.rawFileId,b.rawFileId);assert.equal(b.revision,2);assert.equal(b.createdAt,a.createdAt);
 assert.deepEqual((await env.service.readFile(a.rawFileId)).bytes,first.bytes);assert.deepEqual((await env.restore().readFile(b.rawFileId)).bytes,second.bytes);assert.equal((await env.restore().listFiles()).length,1);assert.equal((await env.restore().listFiles())[0].rawFileId,b.rawFileId);assert.equal(rawKeys(env).length,2);
 await assert.rejects(()=>env.service.cancelUpload(a.rawFileId),error=>error.code==='generated_version_owned');await assert.rejects(()=>env.service.permanentDeleteFile(b.rawFileId),error=>error.code==='generated_version_owned');
});

test('a repeated committed operation recovers its exact old receipt after VFS overwrite and later publication edits',async t=>{
 const env=environment(t);await env.source('report.txt','First snapshot.');const first=await publish(env);
 await env.source('report.txt','Second snapshot.');const second=await publish(env,'edit-two',{fileId:first.fileId,expectedRevision:1,expectedRawFileId:first.rawFileId});
 const repeated=await env.restore().publishGeneratedFile(spec());assert.equal(repeated.rawFileId,first.rawFileId);assert.equal(repeated.revision,1);assert.equal(repeated.superseded,true);assert.equal(repeated.currentRevision,2);assert.equal(currentRows(env).length,1);assert.equal(rawKeys(env).length,2);
 await assert.rejects(()=>env.service.publishGeneratedFile(spec(undefined,{fileName:'changed.txt'})),error=>error.code==='publication_request_changed');assert.equal((await env.service.listFiles())[0].rawFileId,second.rawFileId);
});

test('shared locks and authoritative owned source context are mandatory only for the new publication API',async t=>{
 const env=environment(t,{factory:{storageLocks:null}});await env.source('report.txt','Neutral source.');await assert.rejects(()=>publish(env),error=>error.status===503&&error.code==='publication_lock_unavailable');assert.equal(env.metadata.size,0);
 const allocation=await env.service.handle(new Request('https://fixture.invalid/files',{method:'POST',body:JSON.stringify({file_name:'upload.txt',file_size:2,mime_type:'text/plain'})}),'/files');assert.equal(allocation.status,200);
 for(const context of [{threadId:'other',accountId:'publication-owner-a',prefix:'publication-owner-a--owned-thread'},{threadId:'owned-thread',accountId:'other',prefix:'publication-owner-a--owned-thread'},{threadId:'owned-thread',accountId:'publication-owner-a',prefix:'other-prefix'}]){const bad=environment(t,{sourceContext:()=>context});await bad.source('report.txt','Neutral source.');await assert.rejects(()=>publish(bad),error=>error.status===409);assert.equal(bad.metadata.size,0);}
});

test('invalid paths, stale target expectations, wrong source SHA and unknown formats never alter a committed logical pointer',async t=>{
 const env=environment(t);await env.source('report.txt','Neutral first.');const first=await publish(env),before=[...env.metadata];
 for(const extra of [{path:'../outside'},{threadId:'missing'},{expectedSourceSHA256:'0'.repeat(64)},{fileId:first.fileId,expectedRevision:9,expectedRawFileId:first.rawFileId}])await assert.rejects(()=>publish(env,'bad-'+JSON.stringify(extra),extra));
 assert.deepEqual([...env.metadata],before);
 await env.source('archive.zip',new Uint8Array([80,75,3,4,1]));await assert.rejects(()=>publish(env,'bad-format',{path:'archive.zip'}),error=>error.status===415);assert.deepEqual([...env.metadata],before);assert.equal(rawKeys(env).length,1);
});

test('real parser sidecars are tied to each DOCX raw SHA, persist and remain immutable after a generated update',async t=>{
 const env=environment(t,{realDocuments:true});const one=await makeDocx('GEN_DOCX_OLD 中文正文');await env.source('report.docx',one);const a=await publish(env,'docx-one',{path:'report.docx'}),rawA=await env.service.readFile(a.rawFileId);assert.equal(rawA.record.storageName,'document.docx');assert.equal(rawA.record.extraction.parser.version,'1.13.0');assert.equal(rawA.record.extraction.sourceSHA256,digest(one));const sideA=await env.storage.read(rawA.record.namespace+'/extracted.txt');assert.match(decoder.decode(sideA),/GEN_DOCX_OLD 中文正文/);assert.equal(digest(sideA),rawA.record.extraction.textSHA256);
 const two=await makeDocx('GEN_DOCX_NEW 新版本');await env.source('report.docx',two);const b=await publish(env,'docx-two',{path:'report.docx',fileId:a.fileId,expectedRevision:1,expectedRawFileId:a.rawFileId}),rawB=await env.restore().readFile(b.rawFileId);assert.notEqual(rawB.record.namespace,rawA.record.namespace);assert.equal(rawB.record.extraction.sourceSHA256,digest(two));assert.deepEqual(await env.storage.read(rawA.record.namespace+'/extracted.txt'),sideA);assert.equal((await env.restore().listFiles())[0].publication.revision,2);
});

test('two real LockManager providers saving against the same revision commit once and loser cleanup preserves the winner',async t=>{
 let arrivals=0,release;const gate=new Promise(resolve=>release=resolve),env=environment(t);await env.source('report.txt','Original.');const first=await publish(env);
 await env.source('edit-a.txt','Competing A.');await env.source('edit-b.txt','Competing B.');
 env.options.afterWrite=async key=>{if(key.includes('--publication-')){arrivals++;if(arrivals===2)release();await gate;}};
 const other=env.restore(),base={fileId:first.fileId,expectedRevision:1,expectedRawFileId:first.rawFileId,fileName:'report.txt'};
 const outcomes=await Promise.allSettled([env.service.publishGeneratedFile(spec('race-a',{...base,path:'edit-a.txt'})),other.publishGeneratedFile(spec('race-b',{...base,path:'edit-b.txt'}))]);
 assert.equal(outcomes.filter(result=>result.status==='fulfilled').length,1);assert.equal(outcomes.filter(result=>result.status==='rejected'&&result.reason.status===409).length,1);assert.equal((await env.service.listFiles())[0].publication.revision,2);assert.equal(Object.values(env.state().files).length,2);assert.equal(rawKeys(env).length,2);
});

test('shared upload reservations and publication stages cannot overcommit configured file quota across providers',async t=>{
 const env=environment(t,{maxTotalBytes:12});await env.source('report.txt','12345678');const other=env.restore();
 const results=await Promise.allSettled([publish(env),other.handle(new Request('https://fixture.invalid/files',{method:'POST',body:JSON.stringify({file_name:'upload.txt',file_size:8,mime_type:'text/plain'})}),'/files')]);
 const pub=results[0],upload=results[1];assert.ok(pub.status==='fulfilled'&&upload.status==='fulfilled'&&upload.value.status===507||pub.status==='rejected'&&pub.reason.status===507&&upload.status==='fulfilled'&&upload.value.status===200);
 assert.ok(Object.values(env.state().files).reduce((n,row)=>n+row.size+(row.extraction?.textSize??row.reservedTextBytes??0),0)<=12);
});

test('permanent logical deletion removes every actual immutable version before metadata and prevents old operation resurrection',async t=>{
 const env=environment(t);await env.source('report.txt','One');const a=await publish(env);await env.source('report.txt','Two');await publish(env,'update',{fileId:a.fileId,expectedRevision:1,expectedRawFileId:a.rawFileId});
 assert.deepEqual(await env.service.permanentDeleteFile(a.fileId),{deleted:true,fileId:a.fileId});assert.equal(rawKeys(env).length,0);assert.deepEqual(await env.service.listFiles(),[]);assert.equal(Object.keys(env.state().files).length,0);await assert.rejects(()=>publish(env),error=>error.status===410);
});


test('raw write/readback, corrupt actual bytes and parser failures leave the previous publication intact and no false ready record',async t=>{
 for(const fault of ['write','read','corrupt','parser']){
  const env=environment(t);await env.source('report.txt','Old saved.');const a=await publish(env);
  await env.source('report.txt','New candidate.');
  if(fault==='write')env.options.failWrite=key=>key.includes('--publication-');
  if(fault==='read')env.options.failRead=key=>key.includes('--publication-')&&!key.includes(a.rawFileId.slice('file_local_'.length));
  if(fault==='corrupt')env.options.afterWrite=(key,bytes)=>{if(key.includes('--publication-'))env.actual.set(key,new Uint8Array(bytes.length).fill(65));};
  let extra={};
  if(fault==='parser'){await env.source('invalid.docx',new Uint8Array([80,75,3,4,0]));extra={path:'invalid.docx'};}
  await assert.rejects(()=>publish(env,'failed-'+fault,{fileId:a.fileId,expectedRevision:1,expectedRawFileId:a.rawFileId,...extra}));
  assert.equal((await env.service.listFiles())[0].rawFileId,a.rawFileId);assert.equal(decoder.decode((await env.service.readFile(a.rawFileId)).bytes),'Old saved.');
  assert.equal(Object.values(env.state().publicationOps).some(op=>op.operationId==='failed-'+fault&&op.phase==='committed'),false);
 }
});

test('atomic pointer commit failure preserves old bytes and a same-operation retry publishes only once after storage recovers',async t=>{
 const env=environment(t);await env.source('report.txt','Old.');const a=await publish(env);await env.source('report.txt','Replacement.');
 env.options.failMetadata=state=>Object.values(state.publicationOps).some(op=>op.operationId==='commit-fails'&&op.phase==='committed');
 const update={fileId:a.fileId,expectedRevision:1,expectedRawFileId:a.rawFileId};
 await assert.rejects(()=>publish(env,'commit-fails',update),error=>error.status===507);assert.equal((await env.service.listFiles())[0].rawFileId,a.rawFileId);assert.equal(rawKeys(env).length,1);
 env.options.failMetadata=null;const b=await env.restore().publishGeneratedFile(spec('commit-fails',update));assert.equal(b.fileId,a.fileId);assert.equal(b.revision,2);assert.equal(rawKeys(env).length,2);assert.equal((await env.service.listFiles())[0].rawFileId,b.rawFileId);
});

test('cleanup IO failures and no-op deletes retain a charged durable reservation until true absence is verified',async t=>{
 for(const noOp of [false,true]){
  const env=environment(t,{maxTotalBytes:10});await env.source('report.txt','12345678');
  env.options.afterWrite=(key)=>{if(key.includes('--publication-'))throw Error('Neutral interrupted write acknowledgement');};
  if(noOp)env.options.noOpRemove=key=>key.includes('--publication-');else env.options.failRemove=key=>key.includes('--publication-');
  await assert.rejects(()=>publish(env),error=>error.cleanupPending===true);assert.deepEqual(await env.service.listFiles(),[]);assert.equal(Object.values(env.state().publicationOps)[0].phase,'cleanup_pending');assert.equal(rawKeys(env).length,1);
  const response=await env.service.handle(new Request('https://fixture.invalid/files',{method:'POST',body:JSON.stringify({file_name:'more.txt',file_size:4,mime_type:'text/plain'})}),'/files');assert.equal(response.status,507);
  env.options.afterWrite=null;env.options.noOpRemove=null;env.options.failRemove=null;const recovered=await env.restore().publishGeneratedFile(spec());assert.equal(recovered.committed,true);assert.equal(rawKeys(env).length,1);assert.equal((await env.service.listFiles()).length,1);
 }
});

test('a failed cleanup metadata commit never releases quota or loses the retry journal after the raw bytes were removed',async t=>{
 const env=environment(t,{maxTotalBytes:10});await env.source('report.txt','12345678');env.options.afterWrite=key=>{if(key.includes('--publication-'))throw Error('Neutral raw acknowledgement loss');};env.options.failMetadata=state=>Object.values(state.publicationOps).some(op=>op.phase==='failed');
 await assert.rejects(()=>publish(env),error=>error.cleanupPending===true);assert.equal(rawKeys(env).length,0);assert.equal(Object.values(env.state().files).length,1);assert.equal(Object.values(env.state().publicationOps)[0].phase,'cleanup_pending');
 env.options.failMetadata=null;env.options.afterWrite=null;const saved=await env.restore().publishGeneratedFile(spec());assert.equal(saved.committed,true);assert.equal(rawKeys(env).length,1);
});

test('lost commit acknowledgements recover a genuine durable receipt instead of deleting committed bytes or duplicating a revision',async t=>{
 const env=environment(t);await env.source('report.txt','A real snapshot.');let lost=true;
 env.options.afterMetadata=state=>{if(lost&&Object.values(state.publicationOps).some(op=>op.phase==='committed')){lost=false;throw Error('Neutral commit acknowledgement lost');}};
 const saved=await publish(env);assert.equal(saved.committed,true);assert.equal(saved.revision,1);assert.equal(rawKeys(env).length,1);assert.equal((await env.restore().publishGeneratedFile(spec())).rawFileId,saved.rawFileId);assert.equal(Object.values(env.state().files).length,1);
});

test('abort before grant or during raw IO cannot publish; abort after durable commit does not pretend that committed bytes were rolled back',async t=>{
 const queued=environment(t);await queued.source('report.txt','Queued.');let entered,release;const ready=new Promise(resolve=>entered=resolve),hold=globalThis.navigator.locks.request('chatgpt-local-files:'+encodeURIComponent('publication-owner-a'),{mode:'exclusive'},async()=>{entered();await new Promise(resolve=>release=resolve);});await ready;
 const before=new AbortController(),pending=publish(queued,undefined,{},before.signal);before.abort();await assert.rejects(()=>pending,error=>error.name==='AbortError');release();await hold;assert.equal(queued.metadata.size,0);
 const during=environment(t),controller=new AbortController();await during.source('report.txt','Actual stage.');during.options.afterWrite=key=>{if(key.includes('--publication-'))controller.abort();};await assert.rejects(()=>publish(during,undefined,{},controller.signal),error=>error.name==='AbortError');assert.equal(rawKeys(during).length,0);assert.deepEqual(await during.service.listFiles(),[]);
 const after=environment(t),late=new AbortController();await after.source('report.txt','Actually committed.');after.options.afterMetadata=state=>{if(Object.values(state.publicationOps).some(op=>op.phase==='committed'))late.abort();};const committed=await publish(after,undefined,{},late.signal);assert.equal(committed.committed,true);assert.equal(rawKeys(after).length,1);assert.equal((await after.service.listFiles()).length,1);
});

test('account switches never write the new owner; abandoned old-owner stages are recovered only after returning to that owner',async t=>{
 const early=environment(t);await early.source('report.txt','Owner A source.');early.options.afterRead=key=>{if(key.endsWith('--owned-thread/report.txt'))early.setAccount('publication-owner-b');};await assert.rejects(()=>publish(early),error=>error.status===409);assert.equal(early.metadata.size,0);
 const late=environment(t);await late.source('report.txt','Owner A staged.');late.options.afterWrite=key=>{if(key.includes('--publication-'))late.setAccount('publication-owner-b');};await assert.rejects(()=>publish(late),error=>error.status===409);assert.equal(late.metadata.size,1);assert.ok([...late.metadata.keys()][0].endsWith('publication-owner-a'));assert.deepEqual(await late.service.listFiles(),[]);assert.equal(rawKeys(late).length,1);
 late.options.afterWrite=null;late.setAccount('publication-owner-a');const recovered=await late.restore().publishGeneratedFile(spec());assert.equal(recovered.committed,true);assert.equal((await late.service.listFiles()).length,1);assert.equal(late.metadata.size,1);
});

test('permanent deletion failures retain a deleting logical tombstone and confirm all raw/sidecar versions on retry',async t=>{
 const env=environment(t,{realDocuments:true});await env.source('report.docx',await makeDocx('Delete actual document body.'));const a=await publish(env,'doc-delete',{path:'report.docx'});
 env.options.failRemove=key=>key.endsWith('/extracted.txt');await assert.rejects(()=>env.service.permanentDeleteFile(a.fileId),error=>error.status===503);assert.equal((await env.service.listFiles())[0].status,'deleting');assert.equal(currentRows(env).length,1);
 await assert.rejects(()=>env.service.publishGeneratedFile(spec('delete-update',{path:'report.docx',fileId:a.fileId,expectedRevision:1,expectedRawFileId:a.rawFileId})),error=>error.code==='publication_deleted');
 env.options.failRemove=null;assert.equal((await env.restore().permanentDeleteFile(a.fileId)).deleted,true);assert.equal(rawKeys(env).length,0);assert.deepEqual(await env.service.listFiles(),[]);
});

test('an in-flight update cannot resurrect a logical publication after concurrent permanent deletion',async t=>{
 const env=environment(t);await env.source('report.txt','Old saved.');const a=await publish(env);await env.source('report.txt','Pending new.');
 let entered,release;const ready=new Promise(resolve=>entered=resolve),gate=new Promise(resolve=>release=resolve);
 env.options.afterWrite=async key=>{if(key.includes('--publication-')&&!key.includes(a.rawFileId.slice('file_local_'.length))){entered();await gate;}};
 const update=env.service.publishGeneratedFile(spec('delete-race',{fileId:a.fileId,expectedRevision:1,expectedRawFileId:a.rawFileId}));await ready;
 const other=env.restore(),deletion=other.permanentDeleteFile(a.fileId);await new Promise(resolve=>setTimeout(resolve,15));release();
 await assert.rejects(()=>update,error=>error.code==='publication_cancelled'||error.code==='publication_deleted');assert.equal((await deletion).deleted,true);assert.equal(rawKeys(env).length,0);assert.deepEqual(await env.service.listFiles(),[]);
});


test('native cross-worker locks serialize real filesystem metadata and two update processes cannot overwrite each other',async t=>{
 const {durablePublicationHost,publicationWorker}=await import('./support/generated-publication-host.mjs');
 const fs=await import('node:fs/promises'),path=await import('node:path'),os=await import('node:os');
 const parent=process.env.GENERATED_PUBLICATION_TEST_TMPDIR??os.tmpdir(),root=await fs.mkdtemp(path.join(parent,'native-generated-publication-'));
 t.after(async()=>{const actualRoot=await fs.realpath(root),actualParent=await fs.realpath(parent),relative=path.relative(actualParent,actualRoot);assert(!relative.startsWith('..')&&!path.isAbsolute(relative)&&path.basename(actualRoot).startsWith('native-generated-publication-'));await fs.rm(actualRoot,{recursive:true,force:true});});
 const metrics=new Int32Array(new SharedArrayBuffer(12)),host=await durablePublicationHost(root,{metrics}),service=createLocalFilesService(host);
 await host.source('report.txt','Original durable.');const a=await service.publishGeneratedFile(spec());
 await host.source('edit-a.txt','Durable writer A.');await host.source('edit-b.txt','Durable writer B.');
 const barrier=new Int32Array(new SharedArrayBuffer(4)),common={root,serviceURL:new URL('../src/native-client/local-files-service.mjs',import.meta.url).href,metrics,barrier},base={fileId:a.fileId,expectedRevision:1,expectedRawFileId:a.rawFileId,fileName:'report.txt'};
 const workers=[publicationWorker({...common,spec:spec('worker-a',{...base,path:'edit-a.txt'})}),publicationWorker({...common,spec:spec('worker-b',{...base,path:'edit-b.txt'})})];t.after(()=>Promise.allSettled(workers.map(worker=>worker.terminate())));
 const results=await Promise.all(workers.map(worker=>worker.result)),detail=JSON.stringify(results);assert.equal(results.filter(result=>result.ok).length,1,detail);assert.equal(results.filter(result=>!result.ok&&result.error.status===409).length,1,detail);assert.equal(Atomics.load(metrics,1),0);assert.ok(Atomics.load(metrics,2)>5);assert.equal((await service.listFiles())[0].publication.revision,2);assert.equal(Object.values(host.state().files).length,2);
});

test('an actually terminated coordinator resumes its persisted genuine DOCX raw+sidecar journal after fresh construction',async t=>{
 const {durablePublicationHost,publicationWorker}=await import('./support/generated-publication-host.mjs');
 const fs=await import('node:fs/promises'),path=await import('node:path'),os=await import('node:os');
 const parent=process.env.GENERATED_PUBLICATION_TEST_TMPDIR??os.tmpdir(),root=await fs.mkdtemp(path.join(parent,'native-generated-publication-'));
 t.after(async()=>{const actualRoot=await fs.realpath(root),actualParent=await fs.realpath(parent),relative=path.relative(actualParent,actualRoot);assert(!relative.startsWith('..')&&!path.isAbsolute(relative)&&path.basename(actualRoot).startsWith('native-generated-publication-'));await fs.rm(actualRoot,{recursive:true,force:true});});
 const host=await durablePublicationHost(root),bytes=await makeDocx('GEN_CRASH_DOCX actual preserved 中文正文');await host.source('report.docx',bytes);
 const request=spec('crash-real-document',{path:'report.docx'}),worker=publicationWorker({root,serviceURL:new URL('../src/native-client/local-files-service.mjs',import.meta.url).href,spec:request,mode:'pause-after-genuine-parser',extractorURL:new URL('../src/native-client/local-document-extraction.mjs',import.meta.url).href,documentHostURL:new URL('./support/document-worker-host.mjs',import.meta.url).href});
 worker.result.catch(()=>{});t.after(()=>worker.terminate());let deadline;try{await Promise.race([worker.ready,worker.result.then(result=>{throw Error('Coordinator ended before its commit pause: '+JSON.stringify(result));}),new Promise((_,reject)=>{deadline=setTimeout(()=>reject(Error('Crash fixture never reached genuine prepared bytes')),5000);})]);}finally{clearTimeout(deadline);}assert.equal(Object.keys(host.state().generatedFiles).length,0);const staged=Object.values(host.state().files)[0];assert.equal(staged.status,'ready');assert.equal(staged.extraction.parser.version,'1.13.0');assert.equal(staged.extraction.sourceSHA256,digest(bytes));
 await worker.terminate();
 const actualWorkers=createNodeDocumentWorkerFactory(),extractor=createLocalDocumentExtractor({workerFactory:actualWorkers,workerURL:canonicalDocumentWorkerURL('publication-recovery')});t.after(()=>extractor.close());
 const restored=createLocalFilesService({...host,documentExtractor:extractor}),receipt=await restored.publishGeneratedFile(request,{signal:AbortSignal.timeout(4000)});
 assert.equal(receipt.committed,true);assert.equal(receipt.rawFileId,staged.fileId);assert.deepEqual((await restored.readFile(receipt.rawFileId)).bytes,bytes);assert.match(decoder.decode(await host.storage.read(staged.namespace+'/extracted.txt')),/GEN_CRASH_DOCX actual preserved 中文正文/);assert.equal(actualWorkers.workers.length,0,'already verified raw+sidecar is recovered without fabricating or rerunning parsing');assert.equal((await restored.listFiles()).length,1);
});


test('real XLSX saved cells and caches produce a verified sidecar without claiming calculation or chart interpretation',async t=>{
 const {xlsxFixtureBytes}=await import('./support/xlsx-fixtures.mjs');
 const env=environment(t,{realDocuments:true}),bytes=xlsxFixtureBytes('xlsx-multisheet-typed-formula-cache.xlsx');await env.source('report.xlsx',bytes);const saved=await publish(env,'xlsx-real',{path:'report.xlsx'}),raw=await env.service.readFile(saved.rawFileId),text=decoder.decode(await env.storage.read(raw.record.namespace+'/extracted.txt'));
 assert.equal(raw.record.extraction.parser.name,'site-ooxml-spreadsheetml');assert.equal(raw.record.extraction.sourceSHA256,digest(bytes));assert.equal(raw.record.extraction.formulaEvaluation,false);assert.match(text,/XLSX_MAIN_标记/);assert.match(text,/XLSX_INLINE_MARKER/);assert.match(text,/no calculation/);assert.equal(saved.mimeType,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
});

test('historical raw versions stay charged and update quota is checked for the full copied replacement rather than only its size delta',async t=>{
 const env=environment(t,{maxTotalBytes:16});await env.source('report.txt','12345678');const a=await publish(env);await env.source('report.txt','ABCDEFGH');const b=await publish(env,'full-two',{fileId:a.fileId,expectedRevision:1,expectedRawFileId:a.rawFileId});
 await env.source('report.txt','1');await assert.rejects(()=>publish(env,'full-three',{fileId:a.fileId,expectedRevision:2,expectedRawFileId:b.rawFileId}),error=>error.status===507);assert.equal((await env.service.listFiles())[0].revision,undefined);assert.equal((await env.service.listFiles())[0].publication.revision,2);assert.equal(Object.values(env.state().files).reduce((n,row)=>n+row.size,0),16);assert.equal(rawKeys(env).length,2);
});

test('corrupted receipt metadata or stored sidecar cannot turn a recovered operation into a successful save claim',async t=>{
 const env=environment(t);await env.source('report.txt','Neutral source.');const saved=await publish(env),key=[...env.metadata.keys()][0],original=env.metadata.get(key),state=JSON.parse(original),op=Object.values(state.publicationOps)[0];op.receipt.fileName='invented-name.txt';env.metadata.set(key,JSON.stringify(state));
 await assert.rejects(()=>publish(env),error=>error.code==='file_corrupted');assert.equal(env.metadata.get(key),JSON.stringify(state));env.metadata.set(key,original);assert.equal((await publish(env)).rawFileId,saved.rawFileId);
 const doc=environment(t,{realDocuments:true});await doc.source('report.docx',await makeDocx('GEN_SIDECAR neutral verified text.'));const real=await publish(doc,'sidecar-integrity',{path:'report.docx'}),raw=await doc.service.readFile(real.rawFileId),sidecar=raw.record.namespace+'/extracted.txt';doc.actual.set(sidecar,new Uint8Array([1,2,3]));
 await assert.rejects(()=>doc.service.publishGeneratedFile(spec('sidecar-integrity',{path:'report.docx'})),error=>error.code==='file_corrupted');assert.equal((await doc.service.listFiles()).length,1,'corruption does not silently delete the committed catalog evidence');
});


test('the same pending upload ticket cannot race two providers into replacing its immutable bytes',async t=>{
 const env=environment(t),bytesA=encoder.encode('AAAAAAA1'),bytesB=encoder.encode('BBBBBBB2');
 const allocation=await env.service.handle(new Request('https://fixture.invalid/files',{method:'POST',body:JSON.stringify({file_name:'upload.txt',file_size:bytesA.length,mime_type:'text/plain'})}),'/files'),ticket=await allocation.json();
 const form=bytes=>{const value=new FormData();value.append('file',new File([bytes],'upload.txt',{type:'text/plain'}));value.append('upload_url',new URL(ticket.upload_url).searchParams.get('upload_url'));return value;};
 let entered,release,writes=0;const started=new Promise(resolve=>entered=resolve),gate=new Promise(resolve=>release=resolve);
 env.options.afterWrite=async key=>{if(key.includes('--upload-')){writes++;if(writes===1){entered();await gate;}}};
 const first=env.service.upload('POST',ticket.upload_url,{body:form(bytesA)});await started;
 const second=env.restore().upload('POST',ticket.upload_url,{body:form(bytesB)});await new Promise(resolve=>setTimeout(resolve,10));assert.equal(writes,1);release();
 const results=await Promise.allSettled([first,second]);assert.equal(results[0].status,'fulfilled');assert.equal(results[1].status,'rejected');assert.equal(results[1].reason.code,'file_rejected');assert.equal(writes,1);assert.deepEqual((await env.service.readFile(ticket.file_id)).bytes,bytesA);
});

test('an ephemeral/deleted source callback or a thread lost before commit cannot secretly persist a permanent Library publication',async t=>{
 const denied=environment(t);await denied.source('report.txt','Ephemeral source.');denied.options.beforeSource=()=>{throw Object.assign(Error('Temporary source is not permanently publishable'),{status:403,code:'ephemeral_publication_rejected'});};await assert.rejects(()=>publish(denied),error=>error.status===403);assert.equal(denied.metadata.size,0);assert.equal(rawKeys(denied).length,0);
 const removed=environment(t);await removed.source('report.txt','Source removed during publication.');let checks=0;removed.options.beforeSource=()=>{if(++checks===2)throw Object.assign(Error('Source thread was removed'),{status:404,code:'thread_not_found'});};await assert.rejects(()=>publish(removed),error=>error.status===404);assert.equal((await removed.service.listFiles()).length,0);assert.equal(rawKeys(removed).length,0);assert.equal(Object.values(removed.state().publicationOps)[0].phase,'failed');
});
