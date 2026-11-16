import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import fs from 'node:fs';import worker,{passwordHash} from '../worker/service.mjs';
function database(){const db=new DatabaseSync(':memory:');for(const name of ['0000_admin_bridge.sql','0001_free_users.sql','0002_bridge_parallel_cancel.sql'])db.exec(fs.readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));return{prepare(text){let args=[];return{bind(...values){args=values;return this;},async run(){return db.prepare(text).run(...args);},async first(){return db.prepare(text).get(...args)||null;},async all(){return{results:db.prepare(text).all(...args)};}};},async batch(statements){return Promise.all(statements.map(statement=>statement.run()));}};}
test('durable relay authenticates both sides, reattaches exactly one job and preserves event cursors',async()=>{
 const salt='00112233445566778899aabbccddeeff',env={DB:database(),ADMIN_USERNAME:'TYC',ADMIN_PASSWORD_SALT:salt,ADMIN_PASSWORD_HASH:await passwordHash('fixture',salt)};
 const call=async(path,{method='GET',token,body}={})=>worker.fetch(new Request('https://fixture.test'+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined}),env);
 const signed=await (await call('/auth/login',{method:'POST',body:{username:'tyc',password:'FIXTURE'}})).json(),token=signed.token;
 const id=crypto.randomUUID(),payload={model:'fixture-model',input:[{role:'user',content:'neutral test'}],stream:true,store:false};
 assert.equal((await call('/jobs',{method:'POST',token,body:{id,payload}})).status,409);
 const pairing=await (await call('/bridge/pair',{method:'POST',token,body:{}})).json(),peer=pairing.bridgeToken;
 assert.equal((await call('/bridge/poll',{method:'POST',token,body:{}})).status,401);
 await call('/bridge/poll',{method:'POST',token:peer,body:{profile:{authenticated:true,models:[{slug:'fixture-model',display_name:'Fixture'}],access_token:'NEVER-COPY-THIS'}}});
 const status=await (await call('/bridge/status',{token})).json();assert.equal(status.online,true);assert.equal(status.profile.planType,null);assert.equal(JSON.stringify(status).includes('NEVER-COPY-THIS'),false);
 assert.equal((await call('/jobs',{method:'POST',token,body:{id,payload}})).status,202);assert.equal((await call('/jobs',{method:'POST',token,body:{id,payload}})).status,202);
 assert.equal((await call('/jobs',{method:'POST',token,body:{id,payload:{...payload,model:'another'}}})).status,409);
 const claimed=await (await call('/bridge/poll',{method:'POST',token:peer,body:{profile:status.profile}})).json();assert.equal(claimed.job.id,id);assert.equal(claimed.job.resume,false);
 const resumed=await (await call('/bridge/poll',{method:'POST',token:peer,body:{profile:status.profile}})).json();assert.equal(resumed.job.resume,true);
 const events=[{seq:0,data:{type:'headers',status:200,contentType:'text/event-stream'}},{seq:1,data:{type:'data',text:'data: {"type":"response.completed"}\n\n'}}];
 await call('/bridge/jobs/'+id+'/events',{method:'POST',token:peer,body:{events}});await call('/bridge/jobs/'+id+'/events',{method:'POST',token:peer,body:{events}});
 const page=await (await call('/jobs/'+id+'/events?after=0',{token})).json();assert.deepEqual(page.events.map(x=>x.seq),[1]);
 await call('/bridge/jobs/'+id+'/events',{method:'POST',token:peer,body:{events:[{seq:2,data:{type:'end'}}],status:'complete',model:'fixture-model',usage:{input_tokens:5,output_tokens:2}}});
 await call('/bridge/jobs/'+id+'/events',{method:'POST',token:peer,body:{events,status:'streaming'}});
 assert.equal((await (await call('/jobs/'+id+'/events',{token})).json()).status,'complete');
 assert.equal((await (await call('/usage',{token})).json()).sources[0].input_tokens,5);
 await call('/bridge/revoke',{method:'POST',token,body:{bridgeId:pairing.bridgeId}});assert.equal((await call('/bridge/poll',{method:'POST',token:peer,body:{}})).status,401);
});
