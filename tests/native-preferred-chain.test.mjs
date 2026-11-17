import { ClassicChatAdapter } from '../src/native-client/classic-chat-adapter.mjs';
import { createLocalFilesService } from '../src/native-client/local-files-service.mjs';
import { createLocalInputPreparer } from '../src/native-client/local-input-preparation.mjs';
import test,{before,after} from 'node:test';
const realFetch=globalThis.fetch;before(()=>{globalThis.fetch=async()=>{throw Error('Unexpected external fetch in preferred-chain fixture');};});after(()=>{globalThis.fetch=realFetch;});import assert from 'node:assert/strict';
import {streamCompletion as runtimeCompletion} from '../runtime.js';
import * as catalog from '../model-catalog.js';import {createModelCatalogAdapter} from '../src/native-client/model-catalog-adapter.mjs';
import {LocalAppServer} from '../src/native-client/local-app-server.mjs';import {createPreferredHostTransport,createPreferredCompletion,turnHostCheckpoints} from '../src/native-client/preferred-host-transport.mjs';
const models=createModelCatalogAdapter(catalog),admin={id:'site-admin',role:'administrator',planType:'pro',membershipSource:'site-administrator'};
const memory=()=>{const values=new Map();return{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
const sse=body=>'data: '+JSON.stringify(body)+'\n\n';
const delta=text=>sse({type:'response.output_text.delta',output_index:0,content_index:0,item_id:'fixture-output',delta:text});
function complete(payload,text){return sse({type:'response.completed',response:{id:'fixture-response',status:'completed',model:payload.model,reasoning:payload.reasoning,usage:{input_tokens:3,output_tokens:4},output:[{id:'fixture-output',type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text}]}]}});}
function relay({mode='complete',account=admin,capacity=3,enabled=true}={}){
 const state={mode,account,capacity,enabled,api:0,posts:0,deletes:0,statuses:0,jobs:new Map(),failAfterPartial:false};
 const fetchImpl=async(input,options)=>{
  const url=new URL(input);assert.equal(url.origin,'https://fixture-relay.test');
  if(url.pathname==='/bridge/status'){state.statuses++;return json({online:state.mode!=='offline',protocolVersion:4,profile:{authenticated:true,planType:null,capabilities:{protocolVersion:4,maxConcurrentJobs:state.capacity,cancelInference:true},models:catalog.WORK_MODEL_IDS.map(slug=>({slug}))}});}
  if(url.pathname==='/jobs'){state.posts++;const body=JSON.parse(options.body);if(state.jobs.has(body.id))assert.deepEqual(state.jobs.get(body.id).payload,body.payload);else state.jobs.set(body.id,{id:body.id,payload:body.payload,status:'streaming',kind:body.payload.tools?.some(tool=>tool.name==='delegate_tasks')?(body.payload.input.some(item=>item.type==='function_call_output')?'synthesis':'delegate'):'analysis'});return json({id:body.id,status:'queued'},202);}
  const id=url.pathname.split('/')[2],job=state.jobs.get(id);assert(job);
  if(options.method==='DELETE'){state.deletes++;job.status='cancelled';return json({cancelled:true,status:'cancelled'});}
  const after=Number(url.searchParams.get('after'));if(state.failAfterPartial&&after>=1)throw Error('Fixture relay poll lost after partial');
  let events,status='streaming';
  if(job.status==='cancelled')return json({id,status:'cancelled',events:[]});
  if(state.ultra){
   const reasoning=job.payload.reasoning;assert.equal(reasoning.effort,'max');assert.equal(job.payload.model,'gpt-6.1-sol');
   if(job.kind==='delegate'){
    const item={id:'fixture-call',type:'function_call',call_id:'native-delegate',name:'delegate_tasks',arguments:JSON.stringify({tasks:[{prompt:'Analyze neutral A'},{prompt:'Analyze neutral B'}]})};
    events=[{seq:0,data:{type:'headers',status:200,contentType:'text/event-stream'}},{seq:1,data:{type:'data',text:sse({type:'response.completed',response:{id:'delegate-response',status:'completed',model:job.payload.model,reasoning,output:[item]}})}},{seq:2,data:{type:'end'}}];status='complete';
   }else if(job.kind==='synthesis'){
    const output=JSON.parse(job.payload.input.find(item=>item.type==='function_call_output').output);assert.equal(output.structuredContent.results.length,2);assert(output.structuredContent.results.every(result=>result.status==='completed'));
    events=[{seq:0,data:{type:'headers',status:200,contentType:'text/event-stream'}},{seq:1,data:{type:'data',text:complete(job.payload,'Actual worker findings synthesized')}},{seq:2,data:{type:'end'}}];status='complete';
   }else{
    const prompt=job.payload.input.at(-1).content, name=String(prompt).includes('neutral A')?'Worker A':'Worker B';
    events=[{seq:0,data:{type:'headers',status:200,contentType:'text/event-stream'}},{seq:1,data:{type:'data',text:delta(name)}}];
    if(state.analysisComplete){events.push({seq:2,data:{type:'data',text:complete(job.payload,name+' complete')}},{seq:3,data:{type:'end'}});status='complete';}
   }
  }else if(state.mode==='quota'){events=[{seq:0,data:{type:'headers',status:429,contentType:'application/json'}},{seq:1,data:{type:'data',text:JSON.stringify({error:{code:'subscription_sharing_usage_limit_exceeded',message:'Fixture official quota pause'}})}},{seq:2,data:{type:'end'}}];status='failed';}
  else{events=[{seq:0,data:{type:'headers',status:200,contentType:'text/event-stream'}},{seq:1,data:{type:'data',text:delta('Saved partial')}}];if(state.mode==='complete'){events.push({seq:2,data:{type:'data',text:complete(job.payload,'Saved partial continued')}},{seq:3,data:{type:'end'}});status='complete';}}
  return json({id,status,error:null,events:events.filter(event=>event.seq>after)});
 };
 const preferred=createPreferredHostTransport({baseURL:'https://fixture-relay.test',fetchImpl,getSiteAccount:()=>state.account,getSiteSessionToken:()=>state.account?'fixture-site-session':null,pollIntervalMs:1,retryDelayMs:0,maxNetworkRetries:0});
 const completion=createPreferredCompletion({runtimeCompletion,preferredTransport:preferred,enabled:()=>state.enabled});
 return{state,preferred,completion};
}
function setup(f,{storage=memory(),free=false}={}){
 let server;
 server=new LocalAppServer({storage,models,catalog,streamCompletion:f.completion,readSettings:()=>({model:'gpt-6.1-sol',apiBase:'https://fixture-gateway.test',apiKey:'fixture-only',apiTransport:'responses'}),getExecutionPolicy:()=>({modelSelection:!free}),agentOptions:{ultraOrchestration:true,retryDelayMs:0,streamRetries:0},onIdleTurnInterrupt:({turn,reason})=>Promise.all(turnHostCheckpoints(turn).map(cp=>(reason==='pagehide'?f.preferred.detach:f.preferred.cancel)(cp,{onCheckpoint:()=>server.persist()})))});
 return{server,storage};
}
function waitTerminal(server,id){return new Promise(resolve=>{const off=server.subscribe(event=>{if(event.method==='turn/completed'&&event.params.threadId===id){off();resolve(event.params.turn);}});});}
function begin(server,{id,clientId=crypto.randomUUID(),model='gpt-6.1-sol',effort='high',systemHints}={}){if(!id){const thread=server.dispatch('thread/start',{model,effort});thread.afterReply();id=thread.result.thread.id;}const tx=server.dispatch('turn/start',{threadId:id,clientUserMessageId:clientId,model,effort,systemHints,input:[{type:'text',text:'Neutral preferred host request'}]}),done=waitTerminal(server,id);tx.afterReply();return{id,done};}
async function until(check){const end=Date.now()+3000;while(!check()){if(Date.now()>end)throw Error('Preferred fixture timed out');await new Promise(resolve=>setTimeout(resolve,1));}}
async function withGateway(f,action){const original=globalThis.fetch;globalThis.fetch=async(input,options)=>{assert.equal(new URL(input).origin,'https://fixture-gateway.test');f.state.api++;const payload=JSON.parse(options.body);(f.state.apiPayloads??=[]).push(payload);return new Response(complete(payload,'Fixture API fallback'),{headers:{'Content-Type':'text/event-stream'}});};try{return await action();}finally{globalThis.fetch=original;}}

test('full runtime uses one accepted host job, exact selected model/effort, and zero gateway calls',async()=>{
 const f=relay(),{server}=setup(f),{done}=begin(server);const turn=await done;assert.equal(turn.status,'completed');assert.equal(f.state.posts,1);assert.equal(f.state.api,0);const payload=[...f.state.jobs.values()][0].payload;assert.equal(payload.model,'gpt-6.1-sol');assert.equal(payload.reasoning.effort,'high');assert.equal(turn.items.find(item=>item.type==='agentMessage').text,'Saved partial continued');assert.equal(turn.adapterMetadata.checkpoint.metrics.length,1);
});
test('pagehide/reload reattaches seq0 to the same frame and assistant ID without another inference',async()=>{
 const f=relay({mode:'partial'}),first=setup(f),{id,done}=begin(first.server);await until(()=>first.server.getThread(id).turns[0].items.some(item=>item.type==='agentMessage'&&item.text==='Saved partial'));const originalItem=first.server.getThread(id).turns[0].items.find(item=>item.type==='agentMessage').id;
 first.server.interruptAll({reason:'pagehide'});await done;assert.equal(f.state.deletes,0);f.state.mode='complete';const restored=setup(f,{storage:first.storage});const tx=restored.server.dispatch('turn/resume',{threadId:id}),finished=waitTerminal(restored.server,id);tx.afterReply();const result=await finished;
 assert.equal(result.status,'completed');assert.equal(f.state.posts,1);assert.equal(f.state.api,0);const assistants=result.items.filter(item=>item.type==='agentMessage');assert.equal(assistants.length,1);assert.equal(assistants[0].id,originalItem);assert.equal(assistants[0].text,'Saved partial continued');assert.equal(result.adapterMetadata.checkpoint.rounds,1);assert.equal(result.adapterMetadata.checkpoint.metrics[0].resumeCount,1);
});
test('accepted relay interruption resumes the same round instead of starting a continuation API request',async()=>{
 const f=relay({mode:'partial'});f.state.failAfterPartial=true;const {server}=setup(f),{id,done}=begin(server);const failed=await done;assert.equal(failed.status,'failed');assert.equal(failed.adapterMetadata.resumePolicy,'automatic');assert.equal(failed.adapterMetadata.lastFailure.requiresTransportResume,true);assert.equal(f.state.posts,1);
 f.state.failAfterPartial=false;f.state.mode='complete';const tx=server.dispatch('turn/resume',{threadId:id}),finished=waitTerminal(server,id);tx.afterReply();const result=await finished;assert.equal(result.status,'completed');assert.equal(f.state.posts,1);assert.equal(result.items.filter(item=>item.type==='agentMessage').length,1);assert.equal(result.adapterMetadata.checkpoint.metrics.length,1);assert.equal(f.state.api,0);
});
test('manual stop cancels one durable job and does not manufacture completed output',async()=>{
 const f=relay({mode:'partial'}),{server}=setup(f),{id,done}=begin(server);await until(()=>server.getThread(id).turns[0].items.some(item=>item.type==='agentMessage'));server.interrupt(id);const stopped=await done;await until(()=>f.state.deletes===1);assert.equal(stopped.status,'interrupted');assert.equal(stopped.adapterMetadata.resumePolicy,'manual');assert.equal(f.state.posts,1);assert.equal(f.state.api,0);assert.equal([...f.state.jobs.values()][0].status,'cancelled');
});
test('real Responses quota error stays manual and a new explicit turn remains usable',async()=>{
 const f=relay({mode:'quota'}),{server}=setup(f),first=begin(server);const failed=await first.done;assert.equal(failed.status,'failed');assert.equal(failed.adapterMetadata.resumePolicy,'manual');assert.equal(failed.adapterMetadata.lastFailure.code,'SUBSCRIPTION_QUOTA_EXHAUSTED');assert.equal(failed.adapterMetadata.lastFailure.providerCode,'subscription_sharing_usage_limit_exceeded');assert.equal(f.state.api,0);assert.equal(f.state.posts,1);
 f.state.mode='complete';const next=begin(server,{id:first.id,model:'gpt-6-astra',effort:'xhigh'}),result=await next.done;assert.equal(result.status,'completed');assert.equal(result.model,'gpt-6-astra');assert.equal(result.reasoningEffort,'xhigh');assert.equal(f.state.posts,2);
});
test('Free Think uses Luna/medium through API only, and offline Pro falls back exactly once',async()=>{
 const free=relay({account:{id:'site-user:fixture',role:'user',planType:'free'}});await withGateway(free,async()=>{const {server}=setup(free,{free:true}),result=await begin(server,{model:'gpt-6-astra',effort:'ultra',systemHints:['reason']}).done;assert.equal(result.status,'completed');assert.equal(result.model,'gpt-6-luna');assert.equal(result.reasoningEffort,'medium');assert.equal(free.state.api,1);assert.equal(free.state.statuses,0);assert.equal(free.state.posts,0);});
 const offline=relay({mode:'offline'});await withGateway(offline,async()=>{const{server}=setup(offline);assert.equal((await begin(server).done).status,'completed');assert.equal(offline.state.api,1);assert.equal(offline.state.posts,0);});
});
test('Ultra cannot use an online host without the actual protocol4 parallel capacity',async()=>{
 const f=relay({capacity:1}),{server}=setup(f),result=await begin(server,{effort:'ultra'}).done;assert.equal(result.status,'failed');assert.equal(result.adapterMetadata.lastFailure.code,'HOST_CAPABILITY_UNAVAILABLE');assert.equal(f.state.posts,0);assert.equal(f.state.api,0);
});


test('idle stop cancels a saved pending host checkpoint after a transport error',async()=>{
 const f=relay({mode:'partial'});f.state.failAfterPartial=true;const{server}=setup(f),{id,done}=begin(server);await done;assert.equal(server.running.size,0);server.interrupt(id);await until(()=>f.state.deletes===1);assert.equal([...f.state.jobs.values()][0].status,'cancelled');assert.equal(f.state.posts,1);assert.equal(f.state.api,0);
});
test('Ultra worker pagehide recovers original accepted jobs and tool ID before one new synthesis round',async()=>{
 const f=relay();f.state.ultra=true;f.state.analysisComplete=false;const first=setup(f),{id,done}=begin(first.server,{effort:'ultra'});
 await until(()=>[...f.state.jobs.values()].filter(job=>job.kind==='analysis').length===2&&first.server.getThread(id).turns[0].adapterMetadata.checkpoint.ultra?.calls[0]?.workers.every(worker=>worker.rounds[0]?.transport.accepted));
 const turn=first.server.getThread(id).turns[0],toolId=turn.items.find(item=>item.type==='mcpToolCall').id,workerJobs=turn.adapterMetadata.checkpoint.ultra.calls[0].workers.map(worker=>worker.rounds[0].transport.jobId);
 first.server.interruptAll({reason:'pagehide'});await done;await until(()=>turn.adapterMetadata.checkpoint.ultra.calls[0].workers.every(worker=>worker.status==='interrupted'));await new Promise(resolve=>setTimeout(resolve,5));assert.equal(f.state.deletes,0);
 f.state.analysisComplete=true;const restored=setup(f,{storage:first.storage}),tx=restored.server.dispatch('turn/resume',{threadId:id}),finished=waitTerminal(restored.server,id);tx.afterReply();const result=await finished;
 assert.equal(result.status,'completed');assert.equal(f.state.posts,4);assert.equal(f.state.api,0);assert.equal(result.reasoningEffort,'ultra');assert.equal(result.items.filter(item=>item.type==='mcpToolCall').length,1);assert.equal(result.items.find(item=>item.type==='mcpToolCall').id,toolId);assert.equal(result.items.find(item=>item.type==='mcpToolCall').status,'completed');
 const workers=result.adapterMetadata.checkpoint.ultra.calls[0].workers;assert.deepEqual(workers.map(worker=>worker.rounds[0].transport.jobId),workerJobs);assert(workers.every(worker=>worker.status==='completed'&&worker.rounds.length===1));assert.equal(result.adapterMetadata.checkpoint.metrics.length,2);
});


test('actual file context survives in-flight future-model change and same-host replay before a different-model API follow-up',async()=>{
 const f=relay({mode:'partial'}),first=setup(f),metadata=memory(),byteMap=new Map(),storage={async read(key){if(!byteMap.has(key))throw Error('File not found');return byteMap.get(key)},async write(key,bytes){byteMap.set(key,new Uint8Array(bytes))},async remove(key){byteMap.delete(key)}};
 const files=createLocalFilesService({storage,metadataStorage:metadata,getAccountId:()=> 'neutral-account',getWorkspacePrefix:id=>encodeURIComponent(id)}),prepare=createLocalInputPreparer({files});first.server.prepareUserInput=prepare;
 const text=new TextEncoder().encode('Actual cross-protocol neutral attachment.'),allocation=await(await files.handle(new Request('https://local.fixture/files',{method:'POST',body:JSON.stringify({file_name:'neutral-cross.txt',file_size:text.length,mime_type:'text/plain'})}),'/files')).json();
 const form=new FormData();form.append('file',new File([text],'neutral-cross.txt',{type:'text/plain'}));form.append('upload_url',new URL(allocation.upload_url).searchParams.get('upload_url'));await files.upload('POST',allocation.upload_url,{body:form});assert.equal((await files.handle(new Request('https://local.fixture/files/'+allocation.file_id+'/uploaded',{method:'POST',body:'{}'}),'/files/'+allocation.file_id+'/uploaded')).status,200);
 const classic=new ClassicChatAdapter({appServer:first.server,models}),initialBody={conversation_origin:'tpp',model:'gpt-6.1-sol',thinking_effort:'extended',messages:[{id:'neutral-file-first',author:{role:'user'},content:{content_type:'text',parts:['Read the actual neutral file.']},metadata:{attachments:[{id:allocation.file_id,name:'neutral-cross.txt',mime_type:'text/plain',size:text.length}]}}]};
 const initial=await classic.handle(new Request('https://local.fixture/f/conversation',{method:'POST',body:JSON.stringify(initialBody)}),'/f/conversation'),initialWire=initial.text();
 await until(()=>[...first.server.threads.values()][0]?.turns[0]?.items.some(item=>item.type==='agentMessage'));
 const thread=[...first.server.threads.values()][0],id=thread.id,old=thread.turns[0],assistantId=old.items.find(item=>item.type==='agentMessage').id,jobId=old.adapterMetadata.checkpoint.inFlight.transport.jobId;
 const change=first.server.dispatch('thread/settings/update',{threadId:id,model:'gpt-6-astra',effort:'xhigh'});change.afterReply();assert.equal(old.model,'gpt-6.1-sol');assert.equal(old.reasoningEffort,'high');
 first.server.interruptAll({reason:'pagehide'});await initialWire;f.state.mode='complete';
 const restored=setup(f,{storage:first.storage});restored.server.prepareUserInput=async()=>{throw Error('Accepted host replay must not prepare the uploaded bytes again')};const resumedClassic=new ClassicChatAdapter({appServer:restored.server,models});
 const resumed=await resumedClassic.handle(new Request('https://local.fixture/f/conversation/resume',{method:'POST',body:JSON.stringify({conversation_id:id,offset:0})}),'/f/conversation/resume');assert.match(await resumed.text(),/Saved partial continued/);
 const completed=restored.server.getThread(id).turns[0];assert.equal(completed.model,'gpt-6.1-sol');assert.equal(completed.reasoningEffort,'high');assert.equal(completed.items.find(item=>item.type==='agentMessage').id,assistantId);assert.equal([...f.state.jobs.keys()][0],jobId);assert.equal(f.state.posts,1);assert.equal(f.state.api,0);
 restored.server.prepareUserInput=prepare;f.state.mode='offline';
 await withGateway(f,async()=>{const next=await resumedClassic.handle(new Request('https://local.fixture/f/conversation',{method:'POST',body:JSON.stringify({conversation_id:id,model:'gpt-6-astra',thinking_effort:'xhigh',messages:[{id:'neutral-file-second',author:{role:'user'},content:{content_type:'text',parts:['Use that actual earlier document.']},metadata:{attachments:[]}}]})}),'/f/conversation');assert.match(await next.text(),/Fixture API fallback/)});
 assert.equal(f.state.posts,1);assert.equal(f.state.api,1);assert.equal(f.state.apiPayloads[0].model,'gpt-6-astra');assert.equal(f.state.apiPayloads[0].reasoning.effort,'xhigh');assert.match(JSON.stringify(f.state.apiPayloads[0].input),/Actual cross-protocol neutral attachment/);assert.equal(restored.server.running.size,0);
 const users=Object.values(resumedClassic.detail(restored.server.getThread(id)).mapping).map(row=>row.message).filter(message=>message?.author.role==='user');assert.deepEqual(users.map(message=>message.metadata.model_slug),['gpt-6.1-sol','gpt-6-astra']);assert.equal(users[0].metadata.attachments[0].id,allocation.file_id);assert.equal(users[1].metadata.attachments.length,0);
});
