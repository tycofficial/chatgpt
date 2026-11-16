
import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalHostClaimsReader,LOCAL_HOST_ACCESS_MARKER} from '../src/native-client/local-token-identity.mjs';
function fixture({active=true,token=LOCAL_HOST_ACCESS_MARKER,adapterIdentity='prototype-local-only',changeAuth={},changeSession={}}={}){
 const auth={accessToken:token,adapterIdentity,accountId:'fixture-account',userId:'fixture-user',accountUserId:'fixture-account-owner',planType:'pro',computeResidency:null,...changeAuth};
 const session={accessToken:token,account:{id:auth.accountId,userId:auth.accountUserId,planType:auth.planType},user:{id:auth.userId},...changeSession};
 const original={fromOriginal:true},calls=[];
 const read=createLocalHostClaimsReader(value=>{calls.push(value);return original;},{getSession:()=>session,getAuth:()=>auth,isLocalSession:()=>active});
 return{read,auth,session,original,calls};
}
test('one active local marker produces explicit local-host claims with separate user/account-user IDs',()=>{const f=fixture(),claims=f.read(LOCAL_HOST_ACCESS_MARKER);assert.equal(claims.source,'local-host-identity');assert.equal(claims.openaiAuthenticated,false);assert.equal(claims.userId,'fixture-user');assert.equal(claims.accountUserId,'fixture-account-owner');assert.equal(claims.accountId,'fixture-account');assert.equal(f.calls.length,0);assert.equal('accessToken'in claims,false);assert(Object.isFrozen(claims));});
test('a local Free identity remains Free and never becomes an OpenAI subscription',()=>{const f=fixture({changeAuth:{planType:'free'}});assert.equal(f.read(LOCAL_HOST_ACCESS_MARKER).planType,'free');assert.equal(f.read(LOCAL_HOST_ACCESS_MARKER).openaiAuthenticated,false);});
test('signed-out state always delegates to the unchanged original reader',()=>{const f=fixture({active:false});assert.strictEqual(f.read(LOCAL_HOST_ACCESS_MARKER),f.original);assert.equal(f.calls.length,1);});
test('all other tokens, including site 64hex credentials, are delegated untouched',()=>{for(const token of ['d'.repeat(64),'unknown-opaque-marker','fixture.header.payload',null,undefined]){const f=fixture({token});assert.strictEqual(f.read(token),f.original);assert.strictEqual(f.calls[0],token);}});
test('an unknown local adapter identity cannot supply claims',()=>{const f=fixture({adapterIdentity:'untrusted-cache'});assert.strictEqual(f.read(LOCAL_HOST_ACCESS_MARKER),f.original);});
test('incomplete local identities cannot supply claims',()=>{for(const name of ['accountId','userId','accountUserId','planType']){const f=fixture({changeAuth:{[name]:''}});assert.strictEqual(f.read(LOCAL_HOST_ACCESS_MARKER),f.original);}});
test('a mismatched current session marker cannot supply claims',()=>{const f=fixture({changeSession:{accessToken:'not-the-current-marker'}});assert.strictEqual(f.read(LOCAL_HOST_ACCESS_MARKER),f.original);});
test('mismatched session account and user identities cannot supply claims',()=>{for(const changeSession of [{account:{id:'other',userId:'fixture-account-owner',planType:'pro'}},{account:{id:'fixture-account',userId:'other-owner',planType:'pro'}},{account:{id:'fixture-account',userId:'fixture-account-owner',planType:'free'}},{user:{id:'other-user'}}]){const f=fixture({changeSession});assert.strictEqual(f.read(LOCAL_HOST_ACCESS_MARKER),f.original);}});
test('host state errors are delegated while original-reader behavior stays unchanged',()=>{const sentinel=Error('Original reader sentinel');const read=createLocalHostClaimsReader(()=>{throw sentinel;},{getSession:()=>{throw Error('Host unavailable');},getAuth:()=>null,isLocalSession:()=>true});assert.throws(()=>read(LOCAL_HOST_ACCESS_MARKER),error=>error===sentinel);});
