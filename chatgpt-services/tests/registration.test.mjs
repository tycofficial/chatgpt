import test from 'node:test';import assert from 'node:assert/strict';import worker,{passwordHash} from '../worker/service.mjs';import {sqliteD1} from './fixture-db.mjs';
test('public registration issues only Free sessions, preserves administrator and enforces role boundaries',async t=>{
 const salt='00112233445566778899aabbccddeeff',env={DB:sqliteD1(),ADMIN_USERNAME:'TYC',ADMIN_PASSWORD_SALT:salt,ADMIN_PASSWORD_HASH:await passwordHash('Admin-Fixture',salt)};
 t.after(()=>env.DB.raw.close());
 const call=async(path,{method='GET',token,body}={})=>worker.fetch(new Request('https://fixture.test'+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined}),env);
 assert.equal((await call('/auth/register',{method:'POST',body:{username:'ＴＹＣ',password:'Free-Fixture'}})).status,409);
 assert.equal((await call('/auth/register',{method:'POST',body:{username:'user',password:'short'}})).status,400);
 const registered=await call('/auth/register',{method:'POST',body:{username:'Alice',password:'Free-Fixture',role:'administrator',planType:'pro',siteTrial:{tier:'pro'}}});assert.equal(registered.status,200);const free=await registered.json();assert.equal(free.user.role,'user');assert.equal(free.user.planType,'free');assert.equal(free.user.membershipSource,'site-registration');assert.equal(free.user.officialSubscriptionVerified,false);assert.equal(free.user.siteTrial,null);assert.match(free.user.accountId,/^[a-f0-9-]{36}$/);
 const session=await (await call('/auth/session',{token:free.token})).json();assert.equal(session.user.id,free.user.id);assert.equal(session.expiresAt,free.expiresAt);
 assert.equal((await call('/bridge/pair',{method:'POST',token:free.token,body:{}})).status,403);assert.equal((await call('/usage',{token:free.token})).status,403);
 assert.equal((await call('/auth/register',{method:'POST',body:{username:'ALICE',password:'Other-Fixture'}})).status,409);
 assert.equal((await call('/auth/login',{method:'POST',body:{username:'aLiCe',password:'free-fixture'}})).status,401);assert.equal((await call('/auth/login',{method:'POST',body:{username:'aLiCe',password:'Free-Fixture'}})).status,200);
 assert.equal((await call('/auth/login',{method:'POST',body:{username:'tyc',password:'ADMIN-FIXTURE'}})).status,200);
 const stored=env.DB.raw.prepare('SELECT * FROM users').get();assert.notEqual(stored.password_hash,'Free-Fixture');assert.equal(Object.values(stored).includes('Free-Fixture'),false);
 assert.equal((await call('/auth/logout',{method:'POST',token:free.token,body:{}})).status,200);assert.equal((await call('/auth/session',{token:free.token})).status,401);
});
