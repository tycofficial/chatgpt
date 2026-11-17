import test from 'node:test';import assert from 'node:assert/strict';
import { createUltraToolExecutor } from '../src/native-client/site-ultra-orchestrator.mjs';
const delegateCall=(id,tasks)=>({id,function:{name:'delegate_tasks',arguments:JSON.stringify({tasks})}});
const context=()=>({signal:new AbortController().signal});
function fixture(transport,extra={}){const cp={},snapshots=[],turn={model:'gpt-6.1-sol',reasoningEffort:'ultra'};const executor=createUltraToolExecutor({turn,checkpoint:cp,save:async()=>{snapshots.push(structuredClone(cp));},getSettings:()=>({model:turn.model,reasoningEffort:'ultra',apiTransport:'responses',fastMode:false}),getContext:()=>[{role:'user',content:'Neutral fixture request.'}],streamCompletion:transport,...extra});return{executor,cp,snapshots,turn};}

test('two real injected transport calls overlap, preserve same model/max, and return their actual results',async()=>{
 const started=[],ended=[];let release;const both=new Promise(resolve=>release=resolve);
 const f=fixture(async options=>{assert.equal(options.settings.model,'gpt-6.1-sol');assert.equal(options.settings.reasoningEffort,'max');assert.equal(options.tools.length,0);const id=started.length;started.push(id);if(started.length===2)release();await both;assert.equal(ended.length,0);options.onDelta('',{content:'Actual fixture finding '+id});await new Promise(resolve=>setTimeout(resolve,5));ended.push(id);return{content:'Actual fixture finding '+id,finish_reason:'stop',usage:{input_tokens:3,output_tokens:5}};});
 const result=await f.executor.execute(delegateCall('parallel',[{prompt:'Analyze A'},{prompt:'Analyze B'}]),context());
 assert.equal(started.length,2);assert.equal(result.isError,false);assert.deepEqual(result.structuredContent.results.map(x=>x.text),['Actual fixture finding 0','Actual fixture finding 1']);assert.equal(result.structuredContent.officialPrivateUltra,false);assert(f.snapshots.some(s=>s.ultra.calls[0].workers.every(w=>w.status==='running')));assert.equal(f.cp.ultra.calls[0].workers[0].rounds[0].usage.output_tokens,5);
});

test('a genuine injected provider403 stops the group, persists partial worker state and does not retry',async()=>{
 let requests=0,release;const both=new Promise(resolve=>release=resolve);
 const f=fixture(async options=>{const id=requests++;if(requests===2)release();await both;if(id===0)throw Object.assign(Error('Fixture exhausted provider balance'),{status:403,code:'API_QUOTA_EXHAUSTED',retryable:false});options.onDelta('',{content:'Actual partial analysis'});return new Promise((_resolve,reject)=>{if(options.signal.aborted)reject(options.signal.reason);else options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true});});});
 let error;try{await f.executor.execute(delegateCall('quota',[{prompt:'Analyze A'},{prompt:'Analyze B'}]),context());}catch(e){error=e;}
 assert.equal(error.status,403);assert.equal(error.providerFailure,true);assert.equal(requests,2);assert.equal(error.mcpResult.isError,true);assert.equal(f.cp.ultra.calls[0].workers[0].status,'failed');assert.equal(f.cp.ultra.calls[0].workers[1].status,'interrupted');assert.equal(f.cp.ultra.calls[0].workers[1].partialText,'Actual partial analysis');
});

test('recovering an interrupted delegate retains completed findings and never reexecutes the unknown worker',async()=>{
 let requests=0;const f=fixture(async()=>{requests++;throw Error('Recovery must not call inference');});
 const c=delegateCall('saved',[{prompt:'A'},{prompt:'B'}]);f.cp.ultra.calls.push({id:'saved',arguments:c.function.arguments,status:'running',workers:[{index:0,title:'A',status:'completed',text:'Recorded completed finding',rounds:[]},{index:1,title:'B',status:'running',partialText:'Recorded partial finding',rounds:[]}]});
 const result=await f.executor.recoverCall(c);assert.equal(requests,0);assert.equal(result.isError,true);assert.equal(result.structuredContent.results[0].status,'completed');assert.equal(result.structuredContent.results[1].status,'uncertain');assert.equal(result.structuredContent.results[1].text,'Recorded partial finding');
});

test('length-truncated analysis continues with saved output using the same model and effort',async()=>{
 let requests=0;const f=fixture(async options=>{requests++;assert.equal(options.settings.reasoningEffort,'max');if(requests===1)return{content:'First part. ',finish_reason:'length'};assert(options.messages.some(m=>m.role==='assistant'&&m.content==='First part. '));return{content:'Second part.',finish_reason:'stop'};});
 const result=await f.executor.execute(delegateCall('length',[{prompt:'Analyze fixture'}]),context());assert.equal(requests,2);assert.equal(result.structuredContent.results[0].text,'First part. Second part.');assert.equal(result.isError,false);
});

test('Ultra rejects Luna and more than three workers before any transport',async()=>{
 assert.throws(()=>fixture(async()=>{}, {turn:{model:'gpt-6-luna',reasoningEffort:'ultra'}}));let calls=0;const f=fixture(async()=>{calls++;});await assert.rejects(f.executor.execute(delegateCall('oversized',Array.from({length:4},()=>({prompt:'A'}))),context()));assert.equal(calls,0);
});

import { LocalAppServer } from '../src/native-client/local-app-server.mjs';
import { createModelCatalogAdapter } from '../src/native-client/model-catalog-adapter.mjs';
import * as catalog from '../src/native-client/model-catalog.js';
const models=createModelCatalogAdapter(catalog);
function server(transport){const data=new Map();return new LocalAppServer({storage:{getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)},models,catalog,getExecutionPolicy:()=>({modelSelection:true}),readSettings:()=>({apiBase:'https://fixture.invalid',apiKey:'fixture-only',model:'gpt-6.1-sol'}),agentOptions:{ultraOrchestration:true,verifiedPriority:false},streamCompletion:transport});}
const providerCall=(id,name,args)=>({id,type:'function',function:{name,arguments:JSON.stringify(args)}});
function begin(s,model='gpt-6.1-sol'){const create=s.dispatch('thread/start',{model,effort:'ultra'});create.afterReply();const id=create.result.thread.id;const tx=s.dispatch('turn/start',{threadId:id,clientUserMessageId:'neutral-ultra-fixture',input:[{type:'text',text:'Compare two neutral analysis approaches.'}],effort:'ultra'});const done=new Promise(resolve=>{const off=s.subscribe(e=>{if(e.method==='turn/completed'){off();resolve(e.params.turn);}});});tx.afterReply();return done;}

test('full native runner executes a genuine parallel delegate tool then synthesizes its actual outputs',async()=>{
 let mainCalls=0,workers=0,release;const barrier=new Promise(resolve=>release=resolve),requests=[];
 const s=server(async options=>{requests.push({model:options.settings.model,effort:options.settings.reasoningEffort,tools:options.tools.length});assert.equal(options.settings.model,'gpt-6.1-sol');assert.equal(options.settings.reasoningEffort,'max');
  if(options.tools.length){mainCalls++;if(mainCalls===1)return{content:'Delegating the two analyses.',tool_calls:[providerCall('delegate-actual','delegate_tasks',{tasks:[{title:'A',prompt:'Analyze neutral A'},{title:'B',prompt:'Analyze neutral B'}]})],finish_reason:'tool_calls'};const result=JSON.parse(options.messages.at(-1).content);assert.equal(result.structuredContent.results.length,2);assert.equal(result.structuredContent.results[0].text,'Actual fixture analysis1');assert.equal(result.structuredContent.results[1].text,'Actual fixture analysis2');return{content:'Synthesized actual fixture findings.',finish_reason:'stop'};}
  const id=++workers;if(workers===2)release();await barrier;return{content:'Actual fixture analysis'+id,finish_reason:'stop',usage:{input_tokens:2,output_tokens:4}};
 });
 const result=await begin(s);assert.equal(result.status,'completed');assert.equal(mainCalls,2);assert.equal(workers,2);assert.equal(requests.length,4);assert.equal(result.reasoningEffort,'ultra');assert.equal(result.adapterMetadata.requestedEffort,'ultra');assert.equal(result.adapterMetadata.underlyingApiEffort,'max');assert(result.adapterMetadata.checkpoint.metrics.every(m=>m.effort==='ultra'&&m.underlyingApiEffort==='max'));
 const tool=result.items.find(x=>x.type==='mcpToolCall');assert.equal(tool.status,'completed');assert.equal(tool.tool,'delegate_tasks');assert.equal(tool.result.structuredContent.officialPrivateUltra,false);assert.equal(s.running.size,0);
});

test('full native runner retains worker403/error checkpoint without another model request',async()=>{
 let mainCalls=0,workerCalls=0,release;const barrier=new Promise(resolve=>release=resolve);
 const s=server(async options=>{if(options.tools.length){mainCalls++;return{tool_calls:[providerCall('quota-delegate','delegate_tasks',{tasks:[{prompt:'Analyze A'},{prompt:'Analyze B'}]})],finish_reason:'tool_calls'};}const id=workerCalls++;if(workerCalls===2)release();await barrier;if(id===0)throw Object.assign(Error('Fixture quota exhausted'),{status:403,retryable:false,code:'API_QUOTA_EXHAUSTED'});return new Promise((_resolve,reject)=>{if(options.signal.aborted)reject(options.signal.reason);else options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true});});});
 const result=await begin(s,'gpt-6-astra');assert.equal(result.status,'failed');assert.equal(mainCalls,1);assert.equal(workerCalls,2);assert.equal(result.adapterMetadata.lastFailure.status,403);assert.equal(result.adapterMetadata.resumePolicy,'manual');assert.equal(result.items.find(x=>x.type==='mcpToolCall').result.isError,true);assert.equal(s.running.size,0);
});
