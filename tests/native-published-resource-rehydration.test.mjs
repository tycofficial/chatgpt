import os from 'node:os';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {createPublishedResourceRehydrator} from '../src/native-client/published-resource-rehydration.mjs';
import {createLocalFilesService} from '../src/native-client/local-files-service.mjs';
import {createLocalLibraryService} from '../src/native-client/local-library-service.mjs';
import {createBrowserToolExecutor} from '../src/native-client/browser-tool-executor.mjs';
import {createLibraryPublishingExecutor,normalizePublicationReceipt} from '../src/native-client/local-library-publisher.mjs';
import {durablePublicationHost} from './support/generated-publication-host.mjs';
const {LocalAppServer}=await import(pathToFileURL(path.resolve('src/native-client/local-app-server.mjs')));
const {projectChatHistoryThread}=await import(pathToFileURL(path.resolve('src/native-client/chat-history-sync.mjs')));
const {createModelCatalogAdapter}=await import(pathToFileURL(path.resolve('src/native-client/model-catalog-adapter.mjs')));
const catalog=await import(pathToFileURL(path.resolve('model-catalog.js')));
const copy=value=>structuredClone(value),encoder=new TextEncoder(),decoder=new TextDecoder(),sha=value=>createHash('sha256').update(value).digest('hex');
const tool=(name,args,id)=>({id,type:'function',function:{name,arguments:JSON.stringify(args)}});
async function environment(t){
 const parent=path.resolve(process.env.GENERATED_PUBLICATION_TEST_TMPDIR??os.tmpdir());await fs.mkdir(parent,{recursive:true});const root=await fs.mkdtemp(path.join(parent,'owned-'));
 const accountId='rehydration-owner-'+randomUUID();let identity={accountId,userId:'neutral-owner-user',accountUserId:'neutral-owner-user'},clock=1800000000000;
 const host=await durablePublicationHost(root,{accountId});host.storage.list=async()=>{throw Error('Rehydration must not enumerate a workspace');};
 const providers=[],metrics={publishes:0,providerCalls:0,resolves:0},memory=new Map();let server,midToolSnapshot;
 function makeProvider({rawHost=host}={}){
  const base=createBrowserToolExecutor({storage:rawHost.storage,getWorkspaceNamespace:()=>identity?.accountId??'guest'}),getAccountId=()=>identity?.accountId??null;
  const getOwnedSourceWorkspace=async({threadId,signal})=>{signal?.throwIfAborted();if(!identity||threadId!=='owned-thread'||!server?.threads.has(threadId))throw Object.assign(Error('Neutral owned source thread missing'),{status:404});return{accountId:identity.accountId,threadId,prefix:base.getWorkspacePrefix(threadId)};};
  const files=createLocalFilesService({storage:rawHost.storage,metadataStorage:rawHost.metadataStorage,getAccountId,getWorkspacePrefix:base.getWorkspacePrefix,getOwnedSourceWorkspace,storageLocks:rawHost.storageLocks,now:()=>clock});
  const library=createLocalLibraryService({files,metadataStorage:rawHost.metadataStorage,getAccountId,lockManager:navigator.locks,now:()=>clock});
  const publisher=createLibraryPublishingExecutor({baseExecutor:base,publishGeneratedFile:async(...args)=>{metrics.publishes++;return files.publishGeneratedFile(...args);},getIdentity:()=>identity,resolvePublishedResource:library.resolvePublishedResource,ownsObjectURL:library.ownsObjectURL});
  const provider={base,files,library,publisher};providers.push(provider);return provider;
 }
 const provider=makeProvider();let ids=0;
 server=new LocalAppServer({storage:{getItem:key=>memory.get(key),setItem:(key,value)=>memory.set(key,value)},models:createModelCatalogAdapter(catalog),catalog,readSettings:()=>({model:'gpt-6.1-sol',reasoningEffort:'low',apiKey:'',apiBase:'https://neutral-model.invalid'}),getExecutionPolicy:()=>({modelSelection:true}),toolExecutor:provider.publisher,uuid:()=>++ids===1?'owned-thread':randomUUID(),
  onPersist:threads=>{if(!midToolSnapshot){const found=threads.find(thread=>thread.id==='owned-thread'&&thread.turns.some(turn=>turn.adapterMetadata.checkpoint?.pendingCalls?.some(record=>record.state==='completed'&&record.call.function.name==='publish_file')));if(found)midToolSnapshot=copy(found);}},
  streamCompletion:async()=>{metrics.providerCalls++;if(metrics.providerCalls===1)return{finish_reason:'tool_calls',content:'',tool_calls:[tool('create_file',{name:'deliverable.md',content:'Actual neutral saved file 中文, immutable revision one.'},'create-real'),tool('publish_file',{path:'deliverable.md',mime_type:'text/markdown'},'publish-real')]};return{finish_reason:'stop',content:'Neutral task completed after actual file publication.'};},agentOptions:{toolTransport:'responses',streamRetries:0}
 });
 const started=server.dispatch('thread/start',{model:'gpt-6.1-sol',effort:'low',conversationOrigin:'tpp'});started.afterReply?.();const begun=server.dispatch('turn/start',{threadId:'owned-thread',model:'gpt-6.1-sol',effort:'low',input:[{type:'text',text:'Create and explicitly save one neutral markdown deliverable.'}]});begun.afterReply?.();
 for(let i=0;i<500&&server.running.size;i++)await new Promise(resolve=>setTimeout(resolve,10));assert.equal(server.running.size,0);const thread=server.getThread('owned-thread');assert.equal(thread.turns[0].status,'completed');assert.equal(metrics.providerCalls,2);assert.equal(metrics.publishes,1);
 const result=thread.turns[0].items.find(item=>item.type==='mcpToolCall'&&item.tool==='publish_file').result,receipt=result.structuredContent,oldURL=result.content.find(item=>item.type==='resource_link').uri;
 function makeHydrator(fresh,overrides={}){return createPublishedResourceRehydrator({normalizeReceipt:normalizePublicationReceipt,getIdentity:()=>identity,resolvePublishedResource:async(...args)=>{metrics.resolves++;return fresh.library.resolvePublishedResource(...args);},ownsObjectURL:fresh.library.ownsObjectURL,projectThread:projectChatHistoryThread,...overrides});}
 function restoreNative(snapshot){let calls=0;const stored=new Map([['cg-original-app-server:v1',JSON.stringify({schemaVersion:1,threads:[snapshot]})]]);const fresh=new LocalAppServer({storage:{getItem:key=>stored.get(key),setItem:(key,value)=>stored.set(key,value)},models:createModelCatalogAdapter(catalog),catalog,readSettings:()=>({model:'gpt-6.1-sol'}),streamCompletion:async()=>{calls++;throw Error('Rehydration cannot submit a model request');},getExecutionPolicy:()=>({modelSelection:true})});return{server:fresh,calls:()=>calls};}
 t.after(async()=>{for(const p of providers){p.library.dispose();p.base.dispose();}const resolved=path.resolve(root),expected=path.resolve(parent)+path.sep;if(!resolved.startsWith(expected)||!path.basename(resolved).startsWith('owned-'))throw Error('Unexpected fixture cleanup target');await fs.rm(resolved,{recursive:true,force:true});});
 return{root,host,provider,server,thread:copy(thread),midToolSnapshot:copy(midToolSnapshot),receipt:copy(receipt),result:copy(result),oldURL,metrics,memory,makeProvider,makeHydrator,restoreNative,getIdentity:()=>identity,setIdentity:value=>{identity=value;},tick:()=>++clock};
}
function publicationSlots(thread){const turn=thread.turns[0],cp=turn.adapterMetadata.checkpoint,out=[];for(const item of turn.items)if(item.type==='mcpToolCall'&&item.tool==='publish_file'&&item.result)out.push(item.result);for(const record of Object.values(cp?.completedCalls??{}))if(record.name==='publish_file')out.push(record.output);for(const record of cp?.pendingCalls??[])if(record.state==='completed'&&record.call.function.name==='publish_file')out.push(record.output);for(const messages of [cp?.transcript,turn.adapterMetadata.apiTranscript])for(const message of messages??[])if(message.role==='tool'&&message.tool_call_id==='publish-real')out.push(JSON.parse(message.content));return out;}
async function assertResource(result,provider,receipt){assert.equal(result.structuredContent.committed,true);assert.equal(result.isError,false);assert.equal(result.structuredContent.downloadAvailable,true);const link=result.content.find(item=>item.type==='resource_link');assert.ok(link);assert.equal(provider.library.ownsObjectURL(link.uri),true);const response=await fetch(link.uri),bytes=new Uint8Array(await response.arrayBuffer());assert.equal(sha(bytes),receipt.sha256);assert.equal(bytes.length,receipt.size);assert.equal(response.headers.get('Content-Type'),receipt.mimeType);return link.uri;}

test('actual completed runner output/cache/transcript reload rebuilds a fresh owned Blob from genuine immutable bytes without executing again',async t=>{
 const e=await environment(t),serialized=JSON.stringify(e.thread);e.provider.library.dispose();assert.equal(e.provider.library.ownsObjectURL(e.oldURL),false);await assert.rejects(fetch(e.oldURL));const fresh=e.makeProvider(),native=e.restoreNative(JSON.parse(serialized)),before=copy(native.server.getThread('owned-thread')),hydrator=e.makeHydrator(fresh);const count=copy(e.metrics),value=await hydrator.rehydrateHistory([before]);
 assert.equal(value.pairs.length,1);assert.equal(value.projectionIdentical,true);assert.deepEqual(before,JSON.parse(serialized));assert.deepEqual(value.pairs[0].before,before);assert.equal(value.reports.length,3);assert.equal(e.metrics.resolves-count.resolves,1);assert.equal(e.metrics.publishes,count.publishes);assert.equal(e.metrics.providerCalls,count.providerCalls);assert.equal(native.calls(),0);
 const next=value.pairs[0].after,urls=[];for(const slot of publicationSlots(next))urls.push(await assertResource(slot,fresh,e.receipt));assert.equal(new Set(urls).size,1);assert.notEqual(urls[0],e.oldURL);assert.equal(JSON.stringify(next).includes(e.oldURL),false);assert.deepEqual(projectChatHistoryThread(before),projectChatHistoryThread(next));assert.equal(before.turns[0].status,next.turns[0].status);assert.equal(before.turns[0].adapterMetadata.checkpoint.state,next.turns[0].adapterMetadata.checkpoint.state);
});

test('actual persisted boundary after tool completion restores completed pending output and checkpoint cache without resuming an interrupted model turn',async t=>{
 const e=await environment(t);assert.ok(e.midToolSnapshot);assert.equal(e.midToolSnapshot.turns[0].status,'inProgress');e.provider.library.dispose();const native=e.restoreNative(e.midToolSnapshot),before=copy(native.server.getThread('owned-thread'));assert.equal(before.turns[0].status,'interrupted');const fresh=e.makeProvider(),value=await e.makeHydrator(fresh).rehydrateHistory([before]);assert.equal(value.pairs.length,1);assert.equal(value.reports.some(row=>row.target==='pending-completed-output'),true);for(const slot of publicationSlots(value.pairs[0].after))await assertResource(slot,fresh,e.receipt);assert.equal(native.calls(),0);assert.equal(e.metrics.providerCalls,2);assert.equal(e.metrics.publishes,1);assert.deepEqual(projectChatHistoryThread(before),projectChatHistoryThread(value.pairs[0].after));
});

test('a superseded saved receipt reloads its exact old raw revision rather than latest Library/workspace bytes',async t=>{
 const e=await environment(t);await e.provider.publisher.execute(tool('create_file',{name:'deliverable.md',content:'Actual revision two different bytes.'},'create-two'),{threadId:'owned-thread',turnId:'turn-two'});e.tick();const updated=await e.provider.publisher.execute(tool('publish_file',{path:'deliverable.md',mime_type:'text/markdown',file_id:e.receipt.fileId,expected_revision:e.receipt.revision,expected_raw_file_id:e.receipt.rawFileId},'publish-two'),{threadId:'owned-thread',turnId:'turn-two'});assert.equal(updated.structuredContent.revision,2);e.provider.library.dispose();const fresh=e.makeProvider(),value=await e.makeHydrator(fresh).rehydrateHistory([e.thread]);for(const slot of publicationSlots(value.pairs[0].after))await assertResource(slot,fresh,e.receipt);assert.notEqual(updated.structuredContent.sha256,e.receipt.sha256);assert.equal(value.pairs[0].after.turns[0].items.find(item=>item.tool==='publish_file').result.structuredContent.rawFileId,e.receipt.rawFileId);assert.equal(e.metrics.publishes,2);
});

test('confirmed deleted raw bytes preserve committed fact and explicit unavailable outputs with unchanged actual cloud projection/dedup',async t=>{
 const e=await environment(t);await e.provider.files.permanentDeleteFile(e.receipt.fileId);e.provider.library.dispose();const fresh=e.makeProvider(),value=await e.makeHydrator(fresh).rehydrateHistory([e.thread]);assert.equal(value.pairs.length,1);const after=value.pairs[0].after;for(const slot of publicationSlots(after)){assert.equal(slot.structuredContent.committed,true);assert.equal(slot.structuredContent.rawFileId,e.receipt.rawFileId);assert.equal(slot.structuredContent.downloadAvailable,false);assert.equal(slot.structuredContent.downloadUnavailable,true);assert.equal(slot.content.some(item=>item.type==='resource_link'),false);assert.equal(slot.isError,false);}assert.deepEqual(projectChatHistoryThread(e.thread),projectChatHistoryThread(after));const resources=projectChatHistoryThread(after).turns[0].adapterMetadata.cloudUnavailableResources;assert.equal(new Set(resources.map(value=>JSON.stringify(value))).size,resources.length);assert.equal(e.metrics.publishes,1);assert.equal(e.metrics.providerCalls,2);
});

test('same account on a different byte store gets unavailable rather than a fabricated cross-device download',async t=>{
 const e=await environment(t),otherRoot=path.join(e.root,'other-device'),otherHost=await durablePublicationHost(otherRoot,{accountId:e.getIdentity().accountId}),fresh=e.makeProvider({rawHost:otherHost});const cloud=projectChatHistoryThread(e.thread),value=await e.makeHydrator(fresh).rehydrateHistory([cloud]);assert.equal(value.pairs.length,1);const result=value.pairs[0].after.turns[0].items.find(item=>item.tool==='publish_file').result;assert.equal(result.structuredContent.committed,true);assert.equal(result.structuredContent.downloadAvailable,false);assert.equal(result.content.some(item=>item.type==='resource_link'),false);assert.deepEqual(projectChatHistoryThread(cloud),projectChatHistoryThread(value.pairs[0].after));assert.equal(e.metrics.publishes,1);
});

test('owner loss before resolution performs no byte lookup and cannot produce an applicable old-owner result',async t=>{
 const e=await environment(t),fresh=e.makeProvider(),hydrator=e.makeHydrator(fresh);e.setIdentity(null);const before=e.metrics.resolves,value=await hydrator.rehydrateResult(e.result);assert.equal(value.state,'unavailable');assert.equal(value.safeToApply,false);assert.equal(value.result.structuredContent.committed,true);assert.equal(value.result.structuredContent.downloadAvailable,false);assert.equal(e.metrics.resolves,before);await assert.rejects(hydrator.rehydrateHistory([e.thread]),{code:'LOCAL_LIBRARY_REHYDRATION_ACCOUNT_CHANGED'});
});

test('owner replacement after a real byte read revokes the new owned Blob and aborts the whole presentation plan',async t=>{
 const e=await environment(t),fresh=e.makeProvider();let uri;const hydrator=e.makeHydrator(fresh,{resolvePublishedResource:async(...args)=>{const resource=await fresh.library.resolvePublishedResource(...args);uri=resource.uri;e.setIdentity({accountId:'another-account',userId:'another-user',accountUserId:'another-user'});return resource;}});await assert.rejects(hydrator.rehydrateHistory([e.thread]),{code:'LOCAL_LIBRARY_REHYDRATION_ACCOUNT_CHANGED'});assert.ok(uri);assert.equal(fresh.library.ownsObjectURL(uri),false);await assert.rejects(fetch(uri));assert.equal(e.metrics.publishes,1);assert.equal(e.metrics.providerCalls,2);
});

test('corrupt genuine raw bytes cannot yield a success link even when saved receipt remains valid',async t=>{
 const e=await environment(t),raw=await e.provider.files.readFile(e.receipt.rawFileId);await e.host.storage.write(raw.record.namespace+'/'+raw.record.storageName,encoder.encode('Tampered actual byte store'));e.provider.library.dispose();const fresh=e.makeProvider(),value=await e.makeHydrator(fresh).rehydrateHistory([e.thread]);for(const slot of publicationSlots(value.pairs[0].after)){assert.equal(slot.structuredContent.committed,true);assert.equal(slot.structuredContent.downloadAvailable,false);assert.equal(slot.content.some(item=>item.type==='resource_link'),false);}assert.deepEqual(projectChatHistoryThread(e.thread),projectChatHistoryThread(value.pairs[0].after));
});

test('mismatched resolver raw revision/SHA/MIME/name or an unowned URI becomes explicit unavailable, never latest or foreign bytes',async t=>{
 const e=await environment(t),fresh=e.makeProvider();for(const field of ['rawFileId','revision','sha256','mimeType','name','uri']){const hydrator=e.makeHydrator(fresh,{resolvePublishedResource:async(...args)=>({...await fresh.library.resolvePublishedResource(...args),[field]:field==='revision'?2:field==='uri'?'blob:foreign-not-owned':'wrong-value'})});const value=await hydrator.rehydrateResult(e.result);assert.equal(value.state,'unavailable',field);assert.equal(value.result.structuredContent.committed,true);assert.equal(value.result.structuredContent.downloadAvailable,false);assert.equal(value.result.content.some(item=>item.type==='resource_link'),false);}
});

test('invalid receipts never reach the resolver or manufacture a verified saved result',async t=>{
 const e=await environment(t),fresh=e.makeProvider(),hydrator=e.makeHydrator(fresh);for(const patch of [{revision:0},{sha256:'wrong'},{operationId:{private:'not-a-string'}},{fileId:e.receipt.rawFileId},{publication:{origin:'generated',revision:2,updatedAt:e.receipt.publication.updatedAt}}]){const result=copy(e.result);Object.assign(result.structuredContent,patch);const before=e.metrics.resolves;await assert.rejects(hydrator.rehydrateResult(result),{code:'LOCAL_LIBRARY_PUBLICATION_RECEIPT_INVALID'});assert.equal(e.metrics.resolves,before);}
});

test('unrelated tools, arbitrary assistant/user JSON and original tool-call/provider IDs are preserved rather than scanned',async t=>{
 const e=await environment(t),input=copy(e.thread),turn=input.turns[0],cp=turn.adapterMetadata.checkpoint;const userText=JSON.stringify(e.result);turn.items.push({id:'unrelated-user',type:'userMessage',content:[{type:'text',text:userText}]},{id:'unrelated-assistant',type:'agentMessage',text:'Keep this literal blob:example unchanged',phase:'commentary'},{id:'unrelated-tool',type:'mcpToolCall',tool:'read_file',server:'browser_workspace',status:'completed',arguments:{path:'file.txt'},result:copy(e.result)});cp.transcript.push({role:'tool',tool_call_id:'unrelated-call',content:JSON.stringify(e.result)});const existingCalls=copy(cp.transcript.find(message=>message.tool_calls)?.tool_calls);e.provider.library.dispose();const fresh=e.makeProvider(),value=await e.makeHydrator(fresh).rehydrateHistory([input]),after=value.pairs[0].after.turns[0];assert.deepEqual(after.items.slice(-3),turn.items.slice(-3));assert.deepEqual(after.adapterMetadata.checkpoint.transcript.at(-1),cp.transcript.at(-1));assert.deepEqual(after.adapterMetadata.checkpoint.transcript.find(message=>message.tool_calls)?.tool_calls,existingCalls);
});

test('legacy API transcript exact tool output is refreshed only for its known publish_file call ID',async t=>{
 const e=await environment(t),input=copy(e.thread);input.turns[0].adapterMetadata.apiTranscript=copy(input.turns[0].adapterMetadata.checkpoint.transcript);e.provider.library.dispose();const fresh=e.makeProvider(),value=await e.makeHydrator(fresh).rehydrateHistory([input]);assert.equal(value.reports.some(row=>row.target==='api-transcript'),true);for(const slot of publicationSlots(value.pairs[0].after))await assertResource(slot,fresh,e.receipt);assert.deepEqual(projectChatHistoryThread(input),projectChatHistoryThread(value.pairs[0].after));
});

test('active/ephemeral records are not rewritten, and abort cannot emit a partially applied plan',async t=>{
 const e=await environment(t),fresh=e.makeProvider(),hydrator=e.makeHydrator(fresh),active=copy(e.thread);active.turns[0].status='inProgress';const before=e.metrics.resolves,value=await hydrator.rehydrateHistory([active]);assert.equal(value.pairs.length,0);assert.equal(e.metrics.resolves,before);const temporary=copy(e.thread);temporary.ephemeral=true;assert.equal((await hydrator.rehydrateHistory([temporary])).pairs.length,0);
 const controller=new AbortController();controller.abort();await assert.rejects(hydrator.rehydrateHistory([e.thread],{signal:controller.signal}),{name:'AbortError'});assert.equal(e.metrics.resolves,before);
});

test('a foreign MCP server tool named publish_file remains byte-exact and performs no resolver lookup',async t=>{
 const e=await environment(t),foreign=copy(e.thread),originalItem=copy(foreign.turns[0].items.find(item=>item.tool==='publish_file'));originalItem.server='foreign_plugin';foreign.turns[0].items=[originalItem];foreign.turns[0].adapterMetadata={instructions:[]};const before=copy(foreign),fresh=e.makeProvider(),calls=e.metrics.resolves,value=await e.makeHydrator(fresh).rehydrateHistory([foreign]);assert.equal(value.pairs.length,0);assert.equal(value.safeToApply,true);assert.equal(e.metrics.resolves,calls);assert.deepEqual(foreign,before);
});
