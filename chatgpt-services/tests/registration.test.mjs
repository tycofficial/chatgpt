import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import fs from 'node:fs';import worker,{passwordHash} from '../worker/service.mjs';
function database(){const db=new DatabaseSync(':memory:');for(const name of ['0000_admin_bridge.sql','0001_free_users.sql','0002_bridge_parallel_cancel.sql'])db.exec(fs.readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));return{db,prepare(text){let args=[];return{bind(...values){args=values;return this;},async run(){return db.prepare(text).run(...args);},async first(){return db.prepare(text).get(...args)||null;},async all(){return{results:db.prepare(text).all(...args)};}};},async batch(statements){return Promise.all(statements.map(statement=>statement.run()));}};}
test('public registration issues only Free sessions, preserves administrator and enforces role boundaries',async()=>{
 const salt='00112233445566778899aabbccddeeff',env={DB:database(),ADMIN_USERNAME:'TYC',ADMIN_PASSWORD_SALT:salt,ADMIN_PASSWORD_HASH:await passwordHash('Admin-Fixture',salt)};
 const call=async(path,{method='GET',token,body}={})=>worker.fetch(new Request('https://fixture.test'+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined}),env);
 assert.equal((await call('/auth/register',{method:'POST',body:{username:'ＴＹＣ',password:'Free-Fixture'}})).status,409);
 assert.equal((await call('/auth/register',{method:'POST',body:{username:'user',password:'short'}})).status,400);
 const registered=await call('/auth/register',{method:'POST',body:{username:'Alice',password:'Free-Fixture',role:'administrator',planType:'pro'}});assert.equal(registered.status,200);const free=await registered.json();assert.equal(free.user.role,'user');assert.equal(free.user.planType,'free');assert.equal(free.user.membershipSource,'site-registration');assert.match(free.user.accountId,/^[a-f0-9-]{36}$/);
 const session=await (await call('/auth/session',{token:free.token})).json();assert.equal(session.user.id,free.user.id);assert.equal(session.expiresAt,free.expiresAt);
 assert.equal((await call('/bridge/pair',{method:'POST',token:free.token,body:{}})).status,403);assert.equal((await call('/usage',{token:free.token})).status,403);
 assert.equal((await call('/auth/register',{method:'POST',body:{username:'ALICE',password:'Other-Fixture'}})).status,409);
 assert.equal((await call('/auth/login',{method:'POST',body:{username:'aLiCe',password:'free-fixture'}})).status,401);assert.equal((await call('/auth/login',{method:'POST',body:{username:'aLiCe',password:'Free-Fixture'}})).status,200);
 assert.equal((await call('/auth/login',{method:'POST',body:{username:'tyc',password:'ADMIN-FIXTURE'}})).status,200);
 const stored=env.DB.db.prepare('SELECT * FROM users').get();assert.notEqual(stored.password_hash,'Free-Fixture');assert.equal(Object.values(stored).includes('Free-Fixture'),false);
 assert.equal((await call('/auth/logout',{method:'POST',token:free.token,body:{}})).status,200);assert.equal((await call('/auth/session',{token:free.token})).status,401);
});
