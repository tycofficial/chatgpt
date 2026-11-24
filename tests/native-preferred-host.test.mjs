import test from 'node:test';import assert from 'node:assert/strict';
import {createPreferredHostTransport,createReplayDeltaGate,cancelTurnHostRequests} from '../src/native-client/preferred-host-transport.mjs';
const admin={id:'site-admin',role:'administrator',planType:'pro',membershipSource:'site-administrator'};
const payload=()=>({model:'fixture-model',input:[{role:'user',content:'Neutral relay fixture'}],stream:true,store:false,reasoning:{effort:'high'}});
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
const uuid='00000000-0000-4000-8000-000000000001';
function fixture(extra={}){
 const state={account:admin,offline:false,quota:false,networkFail:false,dropAdmission:false,dropped:false,posts:0,api:0,deletes:0,polls:[],jobs:new Map(),diagnostics:[],events:[{seq:0,data:{type:'headers',status:200,contentType:'text/event-stream'}},{seq:1,data:{type:'data',text:'data: {"type":"response.completed","response":{"output_text":"fixture complete"}}\n\n'}},{seq:2,data:{type:'end'}}],jobStatus:'complete',...extra};
 const fetch=async(input,options)=>{
  const u=new URL(input);assert.equal(u.origin,'https://fixture-relay.example');assert.equal(options.headers.Authorization,'Bearer fixture-site-session');
  if(u.pathname==='/bridge/status')return json({online:!state.offline,protocolVersion:4,profile:{authenticated:true,capabilities:{protocolVersion:4,maxConcurrentJobs:3,cancelInference:true},models:[{slug:'fixture-model'}],quota:state.quota?{state:'request-paused',errorCode:'subscription_sharing_usage_limit_exceeded',remaining:null}:null}});
  if(u.pathname==='/jobs'){state.posts++;const data=JSON.parse(options.body);if(state.raceOffline)return json({error:{code:'BRIDGE_OFFLINE',message:'Fixture offline before admission'}},409);const previous=state.jobs.get(data.id);if(previous)assert.deepEqual(previous,data.payload);else state.jobs.set(data.id,data.payload);if(state.malformedAdmission&&state.posts===1)return new Response('invalid fixture JSON',{status:202});if(state.alwaysDropAdmission||state.dropAdmission&&!state.dropped){state.dropped=true;throw Error('Fixture lost admission acknowledgement');}if(state.holdAdmission)await state.holdAdmission;return json({id:data.id,status:'queued',reattached:!!previous},202);}
  if(options.method==='DELETE'){state.deletes++;if(state.holdDelete)await state.holdDelete;if(state.terminalDelete)return json({cancelled:false,alreadyTerminal:true,status:state.terminalDelete});state.jobStatus='cancelled';return json({cancelled:true});}
  const after=Number(u.searchParams.get('after'));state.polls.push(after);
  if(state.networkFail)throw Error('Fixture poll network unavailable');
  if(state.eventResponse)return state.eventResponse(after);
  return json({id:uuid,status:state.jobStatus,error:state.jobError||null,events:state.events.filter(e=>e.seq>after).slice(0,100)});
 };
 const router=createPreferredHostTransport({baseURL:'https://fixture-relay.example',getSiteAccount:()=>state.account,getSiteSessionToken:()=>state.account?'fixture-site-session':null,fetchImpl:fetch,fallbackResponses:async()=>{state.api++;return new Response('fixture fallback',{headers:{'Content-Type':'text/plain'}});},uuid:()=>uuid,pollIntervalMs:1,retryDelayMs:0,maxNetworkRetries:1,onDiagnostic:event=>state.diagnostics.push(event)});
 return{state,router};
}

test('unverified/Free callers use existing API without probing a Pro host',async()=>{
 const f=fixture({account:{id:'site-user:fixture',role:'user',planType:'free'}}),cp={};assert.equal(await(await f.router.request(payload(),{checkpoint:cp})).text(),'fixture fallback');assert.equal(f.state.api,1);assert.equal(f.state.posts,0);assert.equal(cp.fallbackReason,'not-verified-administrator');
});
test('confirmed offline host falls back before admission; online quota/model failures do not bill API',async()=>{
 const f=fixture({offline:true});await f.router.request(payload(),{checkpoint:{}});assert.equal(f.state.api,1);assert.equal(f.state.posts,0);
 const q=fixture({quota:true});await assert.rejects(q.router.request(payload(),{checkpoint:{}}),{code:'SUBSCRIPTION_QUOTA_EXHAUSTED',status:429});assert.equal(q.state.api,0);assert.equal(q.state.posts,0);
 const m=fixture();await assert.rejects(m.router.request({...payload(),model:'unavailable'},{checkpoint:{}}),{code:'SUBSCRIPTION_MODEL_UNAVAILABLE'});assert.equal(m.state.api,0);
});
test('an explicit admission-offline409 is safe to fall back; an unknown admission retries one stable job',async()=>{
 const offline=fixture({raceOffline:true});await offline.router.request(payload(),{checkpoint:{}});assert.equal(offline.state.api,1);assert.equal(offline.state.jobs.size,0);
 const f=fixture({dropAdmission:true}),cp={};const response=await f.router.request(payload(),{checkpoint:cp});assert.match(await response.text(),/fixture complete/);assert.equal(f.state.posts,2);assert.equal(f.state.jobs.size,1);assert.equal(f.state.api,0);assert.equal(cp.accepted,true);assert.equal(cp.jobId,uuid);assert.equal(JSON.stringify(cp).includes('fixture-site-session'),false);
});
test('poll failure after admission never falls back and resume replays the same durable job from seq0',async()=>{
 const f=fixture({networkFail:true}),cp={};await assert.rejects(f.router.request(payload(),{checkpoint:cp}),{code:'HOST_STREAM_INTERRUPTED'});assert.equal(cp.accepted,true);assert.equal(f.state.jobs.size,1);assert.equal(f.state.api,0);
 f.state.networkFail=false;cp.lastDeliveredSeq=2;const response=await f.router.resume(cp);assert.match(await response.text(),/fixture complete/);assert.equal(f.state.posts,1);assert.equal(f.state.api,0);assert.equal(f.state.polls.at(-1),-1);
});
test('partial stream loss keeps one job, then a fresh parser receives its full replay without sequence skipping',async()=>{
 const f=fixture(),cp={};let calls=0;
 f.state.eventResponse=after=>{if(calls++===0)return json({id:uuid,status:'streaming',events:f.state.events.slice(0,2)});throw Error('Fixture stream disconnected after partial data');};
 const response=await f.router.request(payload(),{checkpoint:cp}),reader=response.body.getReader();assert.match(new TextDecoder().decode((await reader.read()).value),/fixture complete/);await assert.rejects(reader.read(),{code:'HOST_STREAM_INTERRUPTED'});assert.equal(cp.lastDeliveredSeq,1);
 f.state.eventResponse=null;const restored=await f.router.resume(cp);assert.match(await restored.text(),/fixture complete/);assert.equal(f.state.posts,1);assert.equal(f.state.api,0);
});
test('explicit stop DELETEs once, whereas pagehide/reader detach never cancels the job',async()=>{
 const page=fixture({jobStatus:'streaming',events:[{seq:0,data:{type:'headers',status:200,contentType:'text/event-stream'}},{seq:1,data:{type:'data',text:'partial'}}]}),cp={},signal=new AbortController();
 const response=await page.router.request(payload(),{checkpoint:cp,signal:signal.signal,getAbortMode:()=> 'pagehide'}),reader=response.body.getReader();await reader.read();signal.abort(new DOMException('Page hidden','AbortError'));await assert.rejects(reader.read());await new Promise(r=>setTimeout(r,2));assert.equal(page.state.deletes,0);assert.equal(cp.state,'detached');
 const user=fixture({jobStatus:'streaming',events:page.state.events}),userCp={};const userResponse=await user.router.request(payload(),{checkpoint:userCp}),userReader=userResponse.body.getReader();await userReader.read();assert.equal((await user.router.cancel(userCp)).cancelled,true);await assert.rejects(userReader.read());await user.router.cancel(userCp);assert.equal(user.state.deletes,1);assert.equal(userCp.state,'cancelled');
});
test('HTTP quota body and status are forwarded unchanged rather than becoming a successful empty stream',async()=>{
 const error={error:{code:'subscription_sharing_usage_limit_exceeded',message:'Fixture actual quota limit'}};
 const f=fixture({jobStatus:'failed',jobError:'[object Object]',events:[{seq:0,data:{type:'headers',status:429,contentType:'application/json'}},{seq:1,data:{type:'data',text:JSON.stringify(error)}},{seq:2,data:{type:'end'}}]});const response=await f.router.request(payload(),{checkpoint:{}});assert.equal(response.status,429);assert.deepEqual(await response.json(),error);assert.equal(f.state.api,0);
});
test('changed payload and missing event sequence cannot create another request or skip output',async()=>{
 const f=fixture(),cp={};await(await f.router.request(payload(),{checkpoint:cp})).text();await assert.rejects(f.router.request({...payload(),reasoning:{effort:'low'}},{checkpoint:cp}),{code:'HOST_PAYLOAD_CHANGED'});assert.equal(f.state.posts,1);
 const gap=fixture({events:[{seq:0,data:{type:'headers',status:200,contentType:'text/event-stream'}},{seq:2,data:{type:'data',text:'must not skip missing seq1'}}],jobStatus:'streaming'});const response=await gap.router.request(payload(),{checkpoint:{}});await assert.rejects(response.text(),{code:'HOST_SEQUENCE_GAP'});assert.equal(gap.state.api,0);
});
test('replay delta gate suppresses persisted prefix, emits only new suffix and rejects divergent text',()=>{
 const seen=[],gate=createReplayDeltaGate({content:'Saved partial',reasoning:''},(delta,assembled)=>seen.push([delta,assembled.content]));gate('',{content:'Saved',reasoning:''});assert.equal(seen.length,0);gate('',{content:'Saved partial',reasoning:''});gate('',{content:'Saved partial continued',reasoning:''});assert.equal(seen.at(-1)[0],' continued');assert.throws(()=>gate('',{content:'Different response',reasoning:''}),{code:'HOST_REPLAY_DIVERGED'});
});


test('structured replay checks each saved part even when an earlier item is still catching up', () => {
 const saved = {
   content: 'Earlier body.Latest body.',
   output_messages: [{ index: 1, text: 'Earlier body.' }, { index: 2, text: 'Latest body.' }],
   reasoning_parts: [{ index: 0, summaryIndex: 1, text: 'Public summary.' }],
 };
 const gate = createReplayDeltaGate(saved, () => assert.fail('A divergent frame must not be emitted'));
 assert.throws(() => gate('', {
   output_messages: [{ index: 1, text: 'Earlier ' }, { index: 2, text: 'Different body.' }],
 }), { code: 'HOST_REPLAY_DIVERGED' });
 assert.throws(() => gate('', {
   output_messages: saved.output_messages,
   reasoning_parts: [{ index: 0, summaryIndex: 1, text: 'Unrelated summary.' }],
 }), { code: 'HOST_REPLAY_DIVERGED' });
});

test('permanently ambiguous admission persists exact payload and later resumes the same job without API billing',async()=>{
 const f=fixture({alwaysDropAdmission:true}),cp={};await assert.rejects(f.router.request(payload(),{checkpoint:cp}),{code:'HOST_ADMISSION_UNCERTAIN'});assert.equal(f.state.jobs.size,1);assert.equal(f.state.api,0);assert.deepEqual(cp.admissionPayload,payload());
 f.state.alwaysDropAdmission=false;const response=await f.router.resume(cp);assert.match(await response.text(),/fixture complete/);assert.equal(f.state.jobs.size,1);assert.equal(f.state.api,0);assert.equal(cp.jobId,uuid);
});

test('a stop during in-flight admission confirms the stable job then cancels it rather than starting API',async()=>{
 let release;const held=new Promise(resolve=>release=resolve),f=fixture({holdAdmission:held}),cp={},signal=new AbortController();
 const pending=f.router.request(payload(),{checkpoint:cp,signal:signal.signal});while(f.state.posts===0)await new Promise(r=>setTimeout(r,1));signal.abort(new DOMException('Explicit user stop','AbortError'));release();await assert.rejects(pending);assert.equal(f.state.posts,1);assert.equal(f.state.deletes,1);assert.equal(f.state.api,0);assert.equal(cp.state,'cancelled');assert.equal(cp.cancelRequested,true);
});

test('malformed success acknowledgement remains an uncertain admission and retries only the same UUID',async()=>{
 const f=fixture({malformedAdmission:true}),cp={};const response=await f.router.request(payload(),{checkpoint:cp});assert.match(await response.text(),/fixture complete/);assert.equal(f.state.posts,2);assert.equal(f.state.jobs.size,1);assert.equal(f.state.api,0);
});

test('changing to a Free identity cannot read or restart an accepted administrator job through API fallback',async()=>{
 const f=fixture(),cp={};await(await f.router.request(payload(),{checkpoint:cp})).text();f.state.account={id:'site-user:fixture',role:'user',planType:'free'};await assert.rejects(f.router.resume(cp),{code:'SITE_ADMIN_AUTH_REQUIRED'});assert.equal(f.state.api,0);assert.equal(f.state.posts,1);
});


test('simultaneous signal/explicit cancellation shares exactly one HTTP DELETE',async()=>{
 let release;const held=new Promise(resolve=>release=resolve),f=fixture({holdDelete:held}),cp={route:'host',jobId:uuid,ownerId:'site-admin',accepted:true,state:'streaming'};
 const first=f.router.cancel(cp),second=f.router.cancel(cp);assert.equal(first,second);while(f.state.deletes===0)await new Promise(resolve=>setTimeout(resolve,1));assert.equal(f.state.deletes,1);release();assert.equal((await first).cancelled,true);await second;assert.equal(f.state.deletes,1);
});
test('logout coordinator awaits the deduplicated host stop before discarding the verified site bearer',async()=>{
 let release;const held=new Promise(resolve=>release=resolve),f=fixture({holdDelete:held}),cp={route:'host',jobId:uuid,ownerId:'site-admin',accepted:true,state:'streaming'},turn={adapterMetadata:{checkpoint:{inFlight:{transport:cp}}}};
 const signalStop=f.router.cancel(cp);let cleared=false;
 const logout=(async()=>{const results=await cancelTurnHostRequests(f.router,[turn,turn]);assert.equal(results.length,1);assert.equal(results[0].status,'fulfilled');f.state.account=null;cleared=true;})();
 while(f.state.deletes===0)await new Promise(resolve=>setTimeout(resolve,1));assert.equal(cleared,false);assert.equal(f.state.deletes,1);release();await Promise.all([logout,signalStop]);assert.equal(cleared,true);assert.equal(cp.state,'cancelled');
});
test('cancellation racing a completed response preserves its actual terminal state',async()=>{
 const f=fixture({terminalDelete:'complete'}),cp={route:'host',jobId:uuid,ownerId:'site-admin',accepted:true,state:'streaming'};const result=await f.router.cancel(cp);assert.equal(result.cancelled,false);assert.equal(result.alreadyTerminal,true);assert.equal(cp.state,'complete');assert.equal(cp.cancelRequested,false);
});
