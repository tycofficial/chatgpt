import test from 'node:test';import assert from 'node:assert/strict';
import{streamCompletion}from'../runtime.js';
import{createPreferredCompletion,createPreferredHostTransport}from'../src/native-client/preferred-host-transport.mjs';
import{createProviderCompletionRouter,getProviderRequestAllowlist,isExplicitQuotaExhaustion}from'../src/native-client/provider-routing.mjs';
const primary='https://primary.fixture.test',backup='https://backup.fixture.test';
const providers=()=>[{id:'primary',apiBase:primary,apiKey:'fixture-primary-credential',supportedModels:['gpt-6.1-sol','gpt-6-astra']},{id:'backup',apiBase:backup+'/v1',apiKey:'fixture-backup-credential',supportedModels:['gpt-6.1-sol','gpt-6-astra','gpt-6-luna']}];
const settings={apiBase:'https://outdated.fixture.invalid',apiKey:'outdated-fixture-credential',model:'gpt-6.1-sol',reasoningEffort:'high',apiTransport:'responses'};
const options=extra=>({settings:{...settings},messages:[{role:'user',content:'Neutral provider routing question.'}],...extra});
const browserCompatibleProviders=()=>providers().map((p,index)=>index===0?{...p,standardTransport:'chat-completions',browserResponses:false,fallbackOnRejected:true}:p);
const jsonError=(status,code='insufficient_quota',message='余额不足')=>new Response(JSON.stringify({error:{code,message}}),{status,headers:{'Content-Type':'application/json'}});
function success(payload){const result={id:'neutral-response',status:'completed',model:payload.model,reasoning:payload.reasoning,output:[{id:'neutral-output',type:'message',role:'assistant',phase:'final_answer',status:'completed',content:[{type:'output_text',text:'Neutral actual completion.'}]}]};if(payload.messages)return new Response(JSON.stringify({model:payload.model,choices:[{message:{role:'assistant',content:'Neutral actual completion.'},finish_reason:'stop'}]}),{headers:{'Content-Type':'application/json'}});return new Response('data: '+JSON.stringify({type:'response.completed',response:result})+'\n\n',{headers:{'Content-Type':'text/event-stream'}});}
const stream=events=>new Response(events.map(event=>'data: '+JSON.stringify(event)+'\n\n').join(''),{headers:{'Content-Type':'text/event-stream'}});
const quotaEvent={type:'error',error:{code:'insufficient_quota',message:'余额不足'}};
async function fixture(handler,action){const previous=globalThis.fetch,requests=[];globalThis.fetch=async(input,init)=>{const url=new URL(typeof input==='string'||input instanceof URL?input:input.url);assert.ok([primary,backup].includes(url.origin),'No external inference is permitted');assert.equal(init.method,'POST');const payload=JSON.parse(init.body),route=url.origin===primary?'primary':'backup';assert.equal(new Headers(init.headers).get('Authorization'),'Bearer fixture-'+route+'-credential');requests.push({route,path:url.pathname,payload});return handler({route,payload,index:requests.length,init});};try{return await action(requests);}finally{globalThis.fetch=previous;}}
function router(extra={}){return createProviderCompletionRouter({complete:streamCompletion,getProviders:providers,...extra});}

test('configured primary overrides obsolete cached base/key while retaining model effort and Pro validation',()=>fixture(({payload})=>success(payload),async requests=>{
 const result=await router().complete(options({settings:{...settings,reasoningMode:'pro'}}));assert.equal(result.content,'Neutral actual completion.');assert.deepEqual(requests.map(row=>row.route),['primary']);assert.equal(requests[0].payload.model,settings.model);assert.deepEqual(requests[0].payload.reasoning,{effort:'high',mode:'pro'});
}));
test('explicit HTTP quota rejection before output switches once to an exact-model backup',()=>fixture(({route,payload})=>route==='primary'?jsonError(403):success(payload),async requests=>{
 await router().complete(options());assert.deepEqual(requests.map(row=>row.route),['primary','backup']);assert.deepEqual(requests[0].payload,requests[1].payload);
}));
test('HTTP200 SSE explicit quota before any delta can use the backup',()=>fixture(({route,payload})=>route==='primary'?stream([quotaEvent]):success(payload),async requests=>{
 await router().complete(options());assert.deepEqual(requests.map(row=>row.route),['primary','backup']);
}));
test('unadvertised primary model is bypassed with no rename, downgrade or metadata GET',()=>fixture(({payload})=>success(payload),async requests=>{
 await router().complete(options({settings:{...settings,model:'gpt-6-luna',reasoningEffort:'none'}}));assert.deepEqual(requests.map(row=>row.route),['backup']);assert.equal(requests[0].payload.model,'gpt-6-luna');assert.equal(requests[0].payload.reasoning.effort,'none');
}));
test('no advertised exact model rejects before any network request',()=>fixture(()=>{throw Error('No request expected');},async requests=>{
 await assert.rejects(router().complete(options({settings:{...settings,model:'unadvertised-alias'}})),{code:'API_MODEL_UNAVAILABLE'});assert.equal(requests.length,0);
}));
for(const [name,status,code,message,expected] of [
 ['HTTP401 despite misleading quota body',401,'insufficient_quota','余额不足','API_AUTHENTICATION_FAILED'],
 ['permission denial',403,'permission_denied','permission denied; insufficient quota','API_PERMISSION_DENIED'],
 ['rate limiting',429,'rate_limit_exceeded','Too many requests','rate_limit_exceeded'],
 ['ordinary server failure',500,'server_error','Neutral upstream error','server_error'],
 ['invalid request',400,'invalid_request_error','Neutral unsupported parameter','invalid_request_error'],
])test(name+' does not fail over or falsely report quota',()=>fixture(()=>jsonError(status,code,message),async requests=>{
 let failure;try{await router().complete(options());}catch(error){failure=error;}assert.ok(failure);assert.equal(failure.code,expected);assert.equal(failure.status,status);assert.equal(requests.length,1);if(status===401)assert.doesNotMatch(failure.message,/额度|余额/);
}));
for(const [name,event] of [
 ['text',{type:'response.output_text.delta',delta:'Actual partial text',output_index:0,content_index:0}],
 ['reasoning summary',{type:'response.reasoning_summary_text.delta',delta:'Actual partial summary'}],
 ['tool arguments',{type:'response.function_call_arguments.delta',item_id:'call-item',call_id:'call-id',name:'create_file',delta:'{"name":',output_index:0}],
])test('quota after '+name+' never replays through the backup',()=>fixture(()=>stream([event,quotaEvent]),async requests=>{
 const deltas=[];await assert.rejects(router().complete(options({onDelta:(...args)=>deltas.push(args)})),{code:'API_QUOTA_EXHAUSTED'});assert.equal(requests.length,1);if(name!=='tool arguments')assert.ok(deltas.length);
}));
test('a request after actual tool results cannot blindly switch providers',()=>fixture(()=>jsonError(403),async requests=>{
 await assert.rejects(router().complete(options({messages:[{role:'tool',tool_call_id:'done-call',content:'Actual committed tool result.'}]})),{code:'API_QUOTA_EXHAUSTED'});assert.equal(requests.length,1);
}));
test('explicit committed-side-effect context blocks fallback even without a tool transcript',()=>fixture(()=>jsonError(403),async requests=>{
 await assert.rejects(router().complete(options({providerRoutingContext:{hasCommittedSideEffects:true}})),{code:'API_QUOTA_EXHAUSTED'});assert.equal(requests.length,1);
}));
test('Pro mode not echoed by provider and invalid reasoning effort remain failures, not fallback triggers',()=>fixture(({payload})=>{const response=success({...payload,reasoning:{effort:'high'}});return response;},async requests=>{
 await assert.rejects(router().complete(options({settings:{...settings,reasoningMode:'pro'}})),/未启用请求的原生 Pro/);assert.equal(requests.length,1);
 await assert.rejects(router().complete(options({settings:{...settings,reasoningEffort:'none'}})),/不支持思考等级/);assert.equal(requests.length,1);
}));
test('abort after primary quota prevents a second submission',()=>{const controller=new AbortController();return fixture(()=>{controller.abort();return jsonError(403);},async requests=>{await assert.rejects(router().complete(options({signal:controller.signal})),{name:'AbortError'});assert.equal(requests.length,1);});});
test('backup failure stops at two attempts, never looping back to primary',()=>fixture(()=>jsonError(403),async requests=>{
 await assert.rejects(router().complete(options()),{code:'API_QUOTA_EXHAUSTED'});assert.deepEqual(requests.map(row=>row.route),['primary','backup']);
}));
test('saved backup route is durable metadata without a credential and is reused on explicit continuation',()=>fixture(({route,index,payload})=>route==='primary'?jsonError(403):index===2?jsonError(500,'server_error','Neutral backup outage'):success(payload),async requests=>{
 const checkpoint={},saved=[],context={checkpoint,onCheckpoint:async()=>saved.push(structuredClone(checkpoint))},r=router();
 await assert.rejects(r.complete(options({transportContext:context})),{code:'server_error'});assert.equal(checkpoint.apiProviderId,'backup');
 await r.complete(options({transportContext:context}));assert.deepEqual(requests.map(row=>row.route),['primary','backup','backup']);assert.ok(saved.length>=2);assert.ok(!JSON.stringify(saved).includes('credential'));
}));
test('failure to persist the selected backup prevents its submission and restores the prior pin',()=>fixture(()=>jsonError(403),async requests=>{
 const checkpoint={},context={checkpoint,onCheckpoint:async()=>{if(checkpoint.apiProviderId==='backup')throw Error('Neutral history storage failure');}};
 await assert.rejects(router().complete(options({transportContext:context})),{code:'API_ROUTE_CHECKPOINT_FAILED'});assert.equal(requests.length,1);assert.equal(checkpoint.apiProviderId,'primary');
}));
test('an accepted host response is never blindly replayed on a different API',()=>fixture(()=>{throw Error('No API allowed');},async requests=>{
 const checkpoint={route:'host',accepted:true,jobId:'neutral-accepted-job'};await assert.rejects(router().complete(options({transportContext:{checkpoint},responsesTransport:async()=>jsonError(403)})),{code:'API_QUOTA_EXHAUSTED'});assert.equal(requests.length,0);
}));
test('actual preferred-host offline boundary explicitly permits direct API quota fallback',()=>fixture(({route,payload})=>route==='primary'?jsonError(403):success(payload),async requests=>{
 let statuses=0;const diagnostics=[];
 const preferred=createPreferredHostTransport({baseURL:'https://site.fixture.test',getSiteAccount:()=>({id:'site-admin',role:'administrator',planType:'pro',membershipSource:'site-administrator'}),getSiteSessionToken:()=> 'neutral-site-session',fetchImpl:async(input)=>{assert.equal(new URL(input).pathname,'/bridge/status');statuses++;return new Response(JSON.stringify({online:false,protocolVersion:4}),{headers:{'Content-Type':'application/json'}});}});
 const complete=createPreferredCompletion({runtimeCompletion:router({onDiagnostic:event=>diagnostics.push(event)}).complete,preferredTransport:preferred,enabled:()=>true}),checkpoint={};
 await complete(options({transportContext:{checkpoint,onCheckpoint:async()=>{}}}));assert.equal(statuses,1);assert.equal(checkpoint.route,'api');assert.equal(checkpoint.apiProviderId,'backup');assert.deepEqual(requests.map(row=>row.route),['primary','backup']);assert.ok(!JSON.stringify(diagnostics).includes('credential'));
}));
test('unknown external response transport without an explicit direct fallback never admits another API',()=>fixture(()=>{throw Error('No direct API expected');},async requests=>{
 await assert.rejects(router().complete(options({responsesTransport:async()=>jsonError(403)})),{code:'API_QUOTA_EXHAUSTED'});assert.equal(requests.length,0);
}));
test('Chat Completions transport keeps the exact model/effort on quota fallback',()=>fixture(({route,payload})=>route==='primary'?jsonError(429):success(payload),async requests=>{
 await router().complete(options({settings:{...settings,apiTransport:'chat-completions'}}));assert.deepEqual(requests.map(row=>row.path),['/v1/chat/completions','/v1/chat/completions']);assert.equal(requests[1].payload.reasoning_effort,'high');assert.equal(requests[1].payload.model,settings.model);
}));
test('diagnostics/allowlist expose no credentials and all thrown provider messages redact both configured keys',()=>fixture(()=>jsonError(401,'invalid_api_key','fixture-backup-credential'),async requests=>{
 const diagnostics=[],r=router({onDiagnostic:event=>diagnostics.push(event)});let failure;try{await r.complete(options());}catch(error){failure=error;}assert.ok(failure);for(const text of [failure.message,failure.stack,JSON.stringify(diagnostics),JSON.stringify(r.getAllowedRequests())])assert.ok(!text.includes('fixture-primary-credential')&&!text.includes('fixture-backup-credential'));
 assert.equal(r.getAllowedRequests().length,6);assert.ok(r.getAllowedRequests().every(row=>Object.keys(row).sort().join(',')==='id,method,origin,path'));assert.equal(requests.length,1);
}));
test('malformed trusted configuration and unsupported saved route fail closed',()=>fixture(()=>{throw Error('No request expected');},async requests=>{
 for(const change of [p=>{p[0].apiBase='http://primary.fixture.test';},p=>{p[0].apiBase=primary+'?credential=forbidden';},p=>{p[0].supportedModels=[];},p=>{p[0].responsesModels=['unadvertised-model'];},p=>{p[1].id='primary';}]){const p=providers();change(p);assert.throws(()=>getProviderRequestAllowlist(p),{code:'API_PROVIDER_CONFIG_INVALID'});}
 await assert.rejects(router().complete(options({transportContext:{checkpoint:{apiProviderId:'removed-provider'}}})),{code:'API_SAVED_PROVIDER_UNAVAILABLE'});assert.equal(requests.length,0);
 assert.equal(isExplicitQuotaExhaustion({status:401,providerCode:'insufficient_quota'}),false);
 assert.equal(isExplicitQuotaExhaustion({transportStatus:401,providerCode:'insufficient_quota'}),false);
}));
test('accepted or uncertain host checkpoint cannot enter a plain direct API call',()=>fixture(()=>{throw Error('No API request expected');},async requests=>{
 await assert.rejects(router().complete(options({transportContext:{checkpoint:{route:'host',jobId:'neutral-job',accepted:true}}})),{code:'API_HOST_CHECKPOINT_REQUIRED'});assert.equal(requests.length,0);
}));
test('arbitrary private provider objects and echoed credential codes cannot leak through the thrown error',async()=>{
 const r=router({complete:async()=>{throw Object.assign(Error('fixture-primary-credential'),{code:'fixture-backup-credential',param:{credential:'fixture-backup-credential'},requestId:'fixture-primary-credential'});}});
 let failure;try{await r.complete(options());}catch(error){failure=error;}assert.ok(failure);assert.equal(failure.param,null);assert.ok(!JSON.stringify(failure).includes('fixture-primary-credential')&&!JSON.stringify(failure).includes('fixture-backup-credential'));assert.ok(!failure.stack.includes('fixture-primary-credential'));
});

test('browser-incompatible primary Responses route bypasses before submission and keeps Astra Pro on backup',()=>fixture(({route,payload})=>{assert.equal(route,'backup');return success(payload);},async requests=>{
 const r=router({getProviders:browserCompatibleProviders});
 const result=await r.complete(options({settings:{...settings,model:'gpt-6-astra',reasoningMode:'pro'}}));
 assert.equal(result.content,'Neutral actual completion.');assert.equal(requests.length,1);
 assert.equal(requests[0].payload.model,'gpt-6-astra');assert.deepEqual(requests[0].payload.reasoning,{effort:'high',mode:'pro'});
}));
test('real unsupported Pro shape reports capability failure instead of authentication or silent downgrade',()=>fixture(()=>new Response(JSON.stringify({error:{message:'`reasoning.mode` is not supported with this model.',type:'invalid_request_error',param:'reasoning.mode',code:'unsupported_value'}}),{status:400,headers:{'Content-Type':'application/json'}}),async requests=>{
 const r=router({getProviders:browserCompatibleProviders});
 await assert.rejects(r.complete(options({settings:{...settings,model:'gpt-6-astra',reasoningMode:'pro'}})),error=>error.code==='PROVIDER_REASONING_UNSUPPORTED'&&error.retryable===false&&/Pro/.test(error.message)&&!/认证失败/.test(error.message));
 assert.deepEqual(requests.map(x=>x.route),['backup']);assert.equal(requests[0].payload.reasoning.mode,'pro');
}));
test('browser Responses restriction leaves ordinary primary Chat Completions enabled',()=>fixture(({route,payload})=>{assert.equal(route,'primary');return success(payload);},async requests=>{
 await router({getProviders:browserCompatibleProviders}).complete(options({settings:{...settings,reasoningMode:'standard'}}));
 assert.equal(requests.length,1);assert.equal(requests[0].path,'/v1/chat/completions');assert.equal(requests[0].payload.model,settings.model);
}));
test('browser Responses restriction does not block an available real host transport',()=>fixture(()=>{throw Error('No direct request expected');},async requests=>{
 let hosted=0;await router({getProviders:browserCompatibleProviders}).complete(options({settings:{...settings,model:'gpt-6-astra',reasoningMode:'pro'},responsesTransport:async payload=>{hosted++;return success(payload);}}));
 assert.equal(hosted,1);assert.equal(requests.length,0);
}));

test('GPT-6.2 uses the injected Responses transport with the exact model and effort',()=>fixture(()=>{
 throw Error('No direct browser request expected');
},async requests=>{
 const models=['gpt-6.2-sol','gpt-6.2-astra'];
 const config=browserCompatibleProviders();
 config[0].supportedModels.push(...models);
 config[0].responsesModels=models;
 config[0].browserChatCompletions=false;
 const service=router({getProviders:()=>config});
 for(const model of models){
  const settings62={...settings,model,reasoningEffort:'max',reasoningMode:'standard',apiTransport:'chat-completions'};
  const payloads=[];
  const result=await service.complete(options({settings:settings62,responsesTransport:async payload=>{
   payloads.push(payload);
   return success(payload);
  }}));
  assert.equal(result.model,model);
  assert.equal(payloads.length,1);
  assert.equal(payloads[0].model,model);
  assert.equal(payloads[0].reasoning.effort,'max');
  assert.equal(payloads[0].stream,true);
  assert(Array.isArray(payloads[0].input));
  await assert.rejects(service.complete(options({settings:settings62})),{code:'API_BROWSER_RESPONSES_UNAVAILABLE'});
 }
 assert.equal(requests.length,0);
}));
