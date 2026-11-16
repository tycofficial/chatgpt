import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {relayFixture,sqliteD1} from './fixture-db.mjs';
const event=(seq,data)=>({seq,data});
const complete=[event(0,{type:'headers',status:200,contentType:'text/event-stream'}),event(1,{type:'data',text:'data: {"type":"response.completed"}\n\n'}),event(2,{type:'end'})];

test('0002 migration upgrades existing claims without changing earlier schemas',()=>{
 const DB=sqliteD1({migrations:false});for(const name of ['0000_admin_bridge.sql','0001_free_users.sql'])DB.raw.exec(fs.readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
 DB.raw.exec("INSERT INTO bridges(id,token_hash,last_seen)VALUES('fixture','fixture',0);INSERT INTO jobs(id,bridge_id,payload,status,created_at,updated_at)VALUES('old','fixture','{}','claimed',0,0)");
 DB.raw.exec(fs.readFileSync(new URL('../drizzle/0002_bridge_parallel_cancel.sql',import.meta.url),'utf8'));assert.equal(DB.raw.prepare('SELECT claim_count FROM jobs WHERE id=?').get('old').claim_count,1);assert.equal(DB.raw.prepare('SELECT COUNT(*) AS n FROM users').get().n,0);
});
test('four concurrent polls claim only three distinct jobs and expose only truthful bounded host capacity',async()=>{
 const f=await relayFixture();for(let i=0;i<4;i++)await f.create();
 const ids=Array.from({length:4},()=>crypto.randomUUID());const responses=await Promise.all(ids.map(instanceId=>f.poll({instanceId})));const jobs=await Promise.all(responses.map(response=>response.json()));
 assert.equal(jobs.filter(result=>result.job).length,3);assert.equal(new Set(jobs.filter(result=>result.job).map(result=>result.job.id)).size,3);assert.equal(f.DB.raw.prepare("SELECT COUNT(*) AS n FROM jobs WHERE status='claimed'").get().n,3);
 const status=await(await f.call('/bridge/status',{token:f.token})).json();assert.equal(status.protocolVersion,4);assert.equal(status.profile.capabilities.maxConcurrentJobs,3);assert.equal(status.profile.capabilities.cancelInference,true);assert.equal(status.profile.planType,null);
 const picked=jobs.findIndex(result=>result.job);const first=jobs[picked].job.id;
 await f.call('/bridge/jobs/'+first+'/events',{method:'POST',token:f.pairing.bridgeToken,body:{instanceId:ids[picked],events:complete,status:'complete'}});
 const next=await(await f.poll({instanceId:ids[picked]})).json();assert(next.job);assert.notEqual(next.job.id,first);assert.equal(f.DB.raw.prepare("SELECT COUNT(*) AS n FROM jobs WHERE status IN ('claimed','streaming')").get().n,3);
});
test('active exclusions renew a lease; expired claims resume and reject an obsolete process heartbeat',async()=>{
 const f=await relayFixture(),id=await f.create(),claimed=await(await f.poll()).json();assert.equal(claimed.job.resume,false);
 assert.equal((await(await f.poll({activeJobIds:[id]})).json()).job,null);assert(f.DB.raw.prepare('SELECT claim_expires_at FROM jobs WHERE id=?').get(id).claim_expires_at>Date.now());
 f.DB.raw.prepare('UPDATE jobs SET claim_expires_at=0 WHERE id=?').run(id);const other=crypto.randomUUID(),resumed=await(await f.poll({instanceId:other})).json();assert.equal(resumed.job.id,id);assert.equal(resumed.job.resume,true);
 const stale=await f.call('/bridge/jobs/'+id+'/heartbeat',{method:'POST',token:f.pairing.bridgeToken,body:{instanceId:f.instanceId}});assert.equal(stale.status,409);assert.equal((await stale.json()).error.code,'JOB_CLAIM_CHANGED');
});
test('a cancellation tombstone blocks a late admission, and completed jobs cannot be downgraded',async()=>{
 const f=await relayFixture(),id=crypto.randomUUID();assert.equal((await(await f.call('/jobs/'+id,{method:'DELETE',token:f.token})).json()).cancelled,true);
 const late=await(await f.call('/jobs',{method:'POST',token:f.token,body:{id,payload:f.payload}})).json();assert.equal(late.status,'cancelled');assert.equal(f.DB.raw.prepare('SELECT COUNT(*) AS n FROM jobs WHERE id=?').get(id).n,0);assert.equal((await(await f.call('/jobs/'+id+'/events',{token:f.token})).json()).status,'cancelled');
 const completeId=await f.create();await f.poll();await f.call('/bridge/jobs/'+completeId+'/events',{method:'POST',token:f.pairing.bridgeToken,body:{instanceId:f.instanceId,events:complete,status:'complete'}});
 const cancelled=await(await f.call('/jobs/'+completeId,{method:'DELETE',token:f.token})).json();assert.equal(cancelled.cancelled,false);assert.equal(cancelled.alreadyTerminal,true);assert.equal((await(await f.call('/jobs/'+completeId+'/events',{token:f.token})).json()).status,'complete');
});
test('seq0 idempotency detects gaps/conflicting duplicates and heartbeat confirms real cancellation',async()=>{
 const f=await relayFixture(),id=await f.create();await f.poll();const send=body=>f.call('/bridge/jobs/'+id+'/events',{method:'POST',token:f.pairing.bridgeToken,body:{instanceId:f.instanceId,...body}});
 assert.equal((await send({events:[complete[1]]})).status,409);assert.equal((await send({events:[complete[0]]})).status,200);assert.equal((await send({events:[complete[0]]})).status,200);assert.equal((await send({events:[event(0,{type:'headers',status:403,contentType:'application/json'})]})).status,409);
 await f.call('/jobs/'+id,{method:'DELETE',token:f.token});const heartbeat=await(await f.call('/bridge/jobs/'+id+'/heartbeat',{method:'POST',token:f.pairing.bridgeToken,body:{instanceId:f.instanceId}})).json();assert.equal(heartbeat.cancelled,true);assert.equal(heartbeat.ackSeq,0);
 await send({events:[complete[1]],status:'complete'});assert.equal((await(await f.call('/jobs/'+id+'/events',{token:f.token})).json()).status,'cancelled');
});
test('structured failures preserve error details and never manufacture a remaining quota',async()=>{
 const f=await relayFixture(),id=await f.create();await f.poll();await f.call('/bridge/jobs/'+id+'/events',{method:'POST',token:f.pairing.bridgeToken,body:{instanceId:f.instanceId,events:complete,status:'failed',error:{message:'Fixture actual quota error',code:'subscription_sharing_usage_limit_exceeded',httpStatus:429,access_token:'must-not-persist'}}});
 const result=await(await f.call('/jobs/'+id+'/events',{token:f.token})).json();assert.equal(result.error,'Fixture actual quota error');assert.equal(result.errorDetails.code,'subscription_sharing_usage_limit_exceeded');assert.equal(JSON.stringify(result).includes('must-not-persist'),false);
 await f.poll({profile:{...f.profile,quota:{state:'request-paused',code:'subscription_sharing_usage_limit_exceeded'}}});const response=await f.call('/jobs',{method:'POST',token:f.token,body:{id:crypto.randomUUID(),payload:f.payload}});assert.equal(response.status,429);assert.equal((await(await f.call('/bridge/status',{token:f.token})).json()).profile.quota.remaining,null);
});
