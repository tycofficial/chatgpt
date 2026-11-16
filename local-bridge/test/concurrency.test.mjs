import test,{before}from'node:test';import assert from'node:assert/strict';import fs from'node:fs/promises';import path from'node:path';
import {ProtectedStore}from'../secure-store.mjs';import {BridgeClient}from'../bridge-client.mjs';
import worker from'../../chatgpt-services/worker/service.mjs';import {relayFixture}from'../../chatgpt-services/tests/fixture-db.mjs';
let root,lastFixture;
before(async()=>{root=await new ProtectedStore(path.join(process.platform==='win32'?'D:/ChatGPT-Local-Bridge/test-concurrency':'/tmp/bridge-concurrency-tests',crypto.randomUUID())).initialize();});
async function disk(){const directory=root.resolve(crypto.randomUUID());await fs.mkdir(directory,{mode:0o700});for(const sub of['jobs','locks'])await fs.mkdir(path.join(directory,sub),{mode:0o700});return new ProtectedStore(directory);}
async function until(check){const end=Date.now()+6000;while(!check()){if(Date.now()>end)throw Error('Fixture timed out waiting for local bridge state '+JSON.stringify({lastError:lastFixture?.client.lastError,active:lastFixture?[...lastFixture.client.jobs.keys()]:[],rows:lastFixture?.relay.DB.raw.prepare('SELECT id,status,claim_owner,claim_count FROM jobs').all()}));await new Promise(resolve=>setTimeout(resolve,2));}}
const completed=()=>new Response('data: '+JSON.stringify({type:'response.completed',response:{id:'fixture-response',model:'fixture-model',usage:{input_tokens:2,output_tokens:3}}})+'\n\n',{headers:{'Content-Type':'text/event-stream'}});
async function setup(inference,extra={}){
 const relay=await relayFixture(),store=await disk();await store.write('pairing.json',{...relay.pairing,siteOrigin:'https://fixture.test'});
 const official={profile:async()=>({authenticated:true,planType:null,models:[{slug:'fixture-model'}]}),request:inference,recordUsageError:async()=>{},error:async response=>Object.assign(Error('Fixture official error'),{status:response.status})};
 const client=new BridgeClient({store,sessions:{},official,baseURL:'https://fixture.test',idleMs:3,heartbeatMs:8,heartbeatTimeoutMs:1000,fetch:(input,options)=>worker.fetch(new Request(input,options),relay.env),...extra});
 return lastFixture={relay,store,client};
}
test('SQL-backed scheduler performs exactly three simultaneous official fixture requests then fills the freed slot',async()=>{
 let active=0,peak=0,calls=0;const releases=[];
 const f=await setup(async(_payload,signal)=>{calls++;active++;peak=Math.max(peak,active);return new Promise((resolve,reject)=>{let done=false;const stop=()=>{if(done)return;done=true;active--;reject(signal.reason);};signal.addEventListener('abort',stop,{once:true});releases.push(()=>{if(done)return;done=true;signal.removeEventListener('abort',stop);active--;resolve({response:completed()});});});});
 for(let i=0;i<4;i++)await f.relay.create();f.client.start();
 try{await until(()=>calls===3);assert.equal(active,3);assert.equal(f.client.jobs.size,3);assert.equal(peak,3);releases[0]();await until(()=>calls===4);assert.equal(active,3);assert.equal(peak,3);for(const release of releases)release();await until(()=>f.client.jobs.size===0&&f.relay.DB.raw.prepare("SELECT COUNT(*) AS n FROM jobs WHERE status='complete'").get().n===4);assert.equal(calls,4);const status=await(await f.relay.call('/bridge/status',{token:f.relay.token})).json();assert.equal(status.profile.capabilities.maxConcurrentJobs,3);assert.equal(status.profile.capabilities.cancelInference,true);assert.equal((await(await f.relay.call('/usage',{token:f.relay.token})).json()).sources[0].input_tokens,8);}finally{await f.client.stop();}
});
test('website cancellation aborts the actual pending official request before headers and retains an unacknowledged journal',async()=>{
 let started=false,aborted=false,calls=0;
 const f=await setup(async(_payload,signal)=>{calls++;started=true;return new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(signal.reason);},{once:true}));});const id=await f.relay.create();f.client.start();
 try{await until(()=>started);await f.relay.call('/jobs/'+id,{method:'DELETE',token:f.relay.token});await until(()=>aborted&&f.client.jobs.size===0);const loaded=await f.client.journal.load(id);assert.equal(loaded.state.attempts[0].phase,'cancelled');assert.equal(loaded.state.remoteCancelled,true);assert.equal(loaded.state.ackedSeq,-1);assert.equal(calls,1);assert.equal((await(await f.relay.call('/jobs/'+id+'/events',{token:f.relay.token})).json()).status,'cancelled');}finally{await f.client.stop();}
});
test('cancellation during a silent open SSE stream aborts its fetch signal and preserves genuine partial output',async()=>{
 let started=false,aborted=false;
 const f=await setup(async(_payload,signal)=>({response:new Response(new ReadableStream({start(controller){started=true;controller.enqueue(new TextEncoder().encode('data: {"type":"response.output_text.delta","delta":"Genuine fixture partial"}\n\n'));signal.addEventListener('abort',()=>{aborted=true;controller.error(signal.reason);},{once:true});}}),{headers:{'Content-Type':'text/event-stream'}})}));const id=await f.relay.create();f.client.start();
 try{await until(()=>started&&f.relay.DB.raw.prepare('SELECT COUNT(*) AS n FROM job_events WHERE job_id=?').get(id).n>=2);await f.relay.call('/jobs/'+id,{method:'DELETE',token:f.relay.token});await until(()=>aborted&&f.client.jobs.size===0);const saved=await fs.readFile(f.store.resolve(f.client.journal.key(id)+'.jsonl'),'utf8');assert.match(saved,/Genuine fixture partial/);assert.equal((await f.client.journal.load(id)).state.attempts[0].phase,'cancelled');assert.equal((await(await f.relay.call('/jobs/'+id+'/events',{token:f.relay.token})).json()).status,'cancelled');}finally{await f.client.stop();}
});
test('bridge revocation aborts an actual active request and cancels its durable job',async()=>{
 let started=false,aborted=false;const f=await setup(async(_payload,signal)=>{started=true;return new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(signal.reason);},{once:true}));});const id=await f.relay.create();f.client.start();
 try{await until(()=>started);await f.relay.call('/bridge/revoke',{method:'POST',token:f.relay.token,body:{bridgeId:f.relay.pairing.bridgeId}});await until(()=>aborted&&f.client.jobs.size===0);assert.equal((await(await f.relay.call('/jobs/'+id+'/events',{token:f.relay.token})).json()).status,'cancelled');assert.equal((await f.client.journal.load(id)).state.attempts[0].phase,'failed');}finally{await f.client.stop();}
});
test('duplicate local dispatch shares one promise; a resumed job with no local history never calls inference',async()=>{
 let calls=0,release;const f=await setup(async()=>{calls++;return new Promise(resolve=>release=()=>resolve({response:completed()}));});const id=await f.relay.create();const claimed=await(await f.relay.poll({instanceId:f.client.instanceId})).json();
 const first=f.client.runJob(claimed.job,f.relay.pairing),second=f.client.runJob(claimed.job,f.relay.pairing);assert.equal(first,second);await until(()=>calls===1);release();await Promise.all([first,second]);assert.equal(calls,1);
 const unknown=await f.relay.create();const next=await(await f.relay.poll({instanceId:f.client.instanceId})).json();await f.client.runJob({...next.job,resume:true},f.relay.pairing);assert.equal(calls,1);const job=await(await f.relay.call('/jobs/'+unknown+'/events',{token:f.relay.token})).json();assert.equal(job.status,'failed');assert.equal(job.errorDetails.code,'BRIDGE_HISTORY_UNAVAILABLE');await f.client.stop();
});

test('cancelling one parallel job leaves the other official request alive and able to complete',async()=>{
 const pending=new Map();
 const f=await setup(async(payload,signal)=>new Promise((resolve,reject)=>{pending.set(payload.input[0].content,{signal,release:()=>resolve({response:completed()})});signal.addEventListener('abort',()=>reject(signal.reason),{once:true});}));
 const ids=[];for(const label of['Neutral A','Neutral B']){const id=crypto.randomUUID();ids.push(id);await f.relay.call('/jobs',{method:'POST',token:f.relay.token,body:{id,payload:{...f.relay.payload,input:[{role:'user',content:label}]}}});}f.client.start();
 try{await until(()=>pending.size===2);await f.relay.call('/jobs/'+ids[0],{method:'DELETE',token:f.relay.token});await until(()=>pending.get('Neutral A').signal.aborted);assert.equal(pending.get('Neutral B').signal.aborted,false);pending.get('Neutral B').release();await until(()=>f.client.jobs.size===0);assert.equal((await(await f.relay.call('/jobs/'+ids[0]+'/events',{token:f.relay.token})).json()).status,'cancelled');assert.equal((await(await f.relay.call('/jobs/'+ids[1]+'/events',{token:f.relay.token})).json()).status,'complete');}finally{await f.client.stop();}
});

test('a lost data acknowledgement is retried during a silent model wait without another inference',async()=>{
 let calls=0,started=false;const f=await setup(async(_payload,signal)=>{calls++;return{response:new Response(new ReadableStream({start(controller){started=true;controller.enqueue(new TextEncoder().encode('data: {"type":"response.output_text.delta","delta":"Saved actual fixture output"}\n\n'));signal.addEventListener('abort',()=>controller.error(signal.reason),{once:true});}}),{headers:{'Content-Type':'text/event-stream'}})};});
 let dropped=false;const original=f.client.fetch;f.client.fetch=async(input,options)=>{const response=await original(input,options);if(new URL(input).pathname.endsWith('/events')){const data=JSON.parse(options.body);if(!dropped&&data.events.some(event=>event.seq===1)){dropped=true;throw Error('Fixture lost data ACK after SQL commit');}}return response;};
 const id=await f.relay.create();f.client.start();try{await until(()=>started&&dropped);await until(()=>f.client.jobs.get(id)?.loaded.state.ackedSeq>=1);assert.equal(calls,1);assert.equal(f.relay.DB.raw.prepare('SELECT COUNT(*) AS n FROM job_events WHERE job_id=?').get(id).n,2);await f.relay.call('/jobs/'+id,{method:'DELETE',token:f.relay.token});await until(()=>f.client.jobs.size===0);}finally{await f.client.stop();}
});
