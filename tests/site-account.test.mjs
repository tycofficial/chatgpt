
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { pbkdf2Sync, webcrypto } from 'node:crypto';
import accountWorker from '../chatgpt-services/worker/service.mjs';
import { sqliteD1 } from '../chatgpt-services/tests/fixture-db.mjs';
const identitySource=fs.readFileSync(new URL('../src/native-client/local-identity.mjs',import.meta.url),'utf8');
const pricingSource=fs.readFileSync(new URL('../src/native-client/local-pricing.mjs',import.meta.url),'utf8');
const source=fs.readFileSync(new URL('../src/native-client/site-account.mjs',import.meta.url),'utf8');
const names=['getSiteAccount','hasModelSelectionAccess','getSiteSessionToken','getSiteAccountError','initializeSiteAccount','initializeSiteAccountForDisplay','loginSiteAccount','registerSiteAccount','logoutSiteAccount','getSiteLoginUrl','safeSiteReturnUrl','getSitePlanCapabilities','refreshSiteAccount','isSiteGuestSession','startSiteGuestSession','claimSiteTrial','getSiteHomeUrl'];
// Execute the actual module in an isolated VM; only ESM export keywords change.
// No real browser storage, password, token, account service, or network is used.
const fixtureToken='c'.repeat(64),key='chatgpt-site-admin-session:v1',now=1800000000000;
const user=()=>({id:'site-admin',username:'TYC',name:'TYC',role:'administrator',planType:'pro',membershipSource:'site-administrator',createdAt:now-10000,officialSubscriptionVerified:false});
function fixture(cached, { failWrites = false, online = true, receipts = new Map(), tab = new Map(), href = 'https://tycofficial.github.io/chatgpt/', basePath = '/chatgpt/', verifierPassword } = {}) {
  let clock = now;
  let handler = async () => ({ user: user() });
  const calls = [];
  const values = new Map(cached === undefined ? [] : [[key, typeof cached === 'string' ? cached : JSON.stringify(cached)]]);
  const localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { if (failWrites) throw Error('Fixture storage unavailable'); values.set(key, value); },
    removeItem: key => values.delete(key),
  };
  const sessionStorage = {
    getItem: key => tab.get(key) ?? null,
    setItem: (key, value) => tab.set(key, value),
    removeItem: key => tab.delete(key),
  };
  const events = new EventTarget();
  const navigator = { onLine: online };
  const document = { documentElement: { dataset: {} } };
  const location = { origin: new URL(href).origin, href, pathname: new URL(href).pathname, assign() {} };
  const context = vm.createContext({
    crypto: webcrypto, TextEncoder, URL, AbortController, Response, Event, setTimeout, clearTimeout, navigator, document,
    Date: class extends Date { static now() { return clock; } },
    localStorage, sessionStorage, location, indexedDB: makeIndexedDB(receipts),
    __CHATGPT_REPLICA_ENV__: { basePath },
    addEventListener: (...args) => events.addEventListener(...args),
    removeEventListener: (...args) => events.removeEventListener(...args),
    dispatchEvent: event => events.dispatchEvent(event),
    fetch: async (url, options) => {
      const path = new URL(url).pathname;
      const call = { path, method: options.method, authorizationPresent: typeof options.headers.Authorization === 'string', keepalive: options.keepalive };
      if (path === '/auth/site-trial') call.tier = JSON.parse(options.body).tier;
      calls.push(call);
      const result = await handler(url, options);
      if (result instanceof Response) return result;
      return new Response(JSON.stringify(result.body ?? result), { status: result.status ?? 200, headers: { 'Content-Type': 'application/json' } });
    },
  });
  let authSource = source;
  if (verifierPassword) {
    const salt = '00112233aabbccdd';
    const iterations = 1000;
    const hash = pbkdf2Sync(verifierPassword, Buffer.from(salt, 'hex'), iterations, 32, 'sha256').toString('hex');
    authSource = authSource.replace(/^const offlineAdminVerifier\s*=.*$/m, 'const offlineAdminVerifier = ' + JSON.stringify({ salt, iterations, hash }) + ';');
  }
  const executable = authSource.replace(/^export\s+/gm, '') + '\nglobalThis.fixtureExports={' + names.join(',') + '};';
  new vm.Script(executable, { filename: 'site-account.mjs (isolated fixture)' }).runInContext(context);
  return {
    api: context.fixtureExports, values, calls, receipts, tab, events, document,
    setHandler: value => handler = value, setClock: value => clock = value,
    setOnline: value => { navigator.onLine = value; events.dispatchEvent(new Event(value ? 'online' : 'offline')); },
    loadIdentity() {
      const code = identitySource.replace(/^import .*;\r?$/gm, '').replace(/^export\s+/gm, '')
        .replaceAll('import.meta.url', JSON.stringify(new URL('native-client/local-identity.mjs', new URL('/chatgpt/', location.origin)).href));
      const names = 'getPrototypeLocalAuth,getLocalAccountStorageKey,getLocalAccountCheck,getLocalSignedOutUrl';
      new vm.Script(code + '\nglobalThis.identityExports={' + names + '};').runInContext(context);
      return context.identityExports;
    },
    loadPricing() {
      const code = pricingSource.replace(/^import .*;\r?$/gm, '').replace(/^export\s+/gm, '');
      const names = 'getSiteTrialAction,submitSiteTrial,SITE_TRIAL_TERMS';
      new vm.Script(code + '\nglobalThis.pricingExports={' + names + '};', { filename: 'local-pricing.mjs (isolated fixture)' }).runInContext(context);
      return context.pricingExports;
    },
  };
}

function makeIndexedDB(records) {
  const db = {
    transaction() {
      const tx = {
        objectStore() {
          const run = callback => {
            const request = {};
            queueMicrotask(() => { request.result = callback(); tx.oncomplete?.(); });
            return request;
          };
          return {
            get: key => run(() => records.get(key)),
            put: (value, key) => run(() => records.set(key, structuredClone(value))),
            delete: key => run(() => records.delete(key)),
          };
        },
      };
      return tx;
    },
  };
  return { open() { const request = { result: db }; queueMicrotask(() => request.onsuccess?.()); return request; } };
}

const record=(extra={})=>({token:fixtureToken,expiresAt:now+60000,user:{...user(),username:'UNTRUSTED_CACHE',canSelectModels:true},...extra});
test('a successful sign-in cannot redirect to a static login or logout alias', () => {
  const f = fixture();
  for (const target of ['login/index.html', 'auth/logout/index.html', 'signup/index.html']) {
    assert.equal(f.api.safeSiteReturnUrl('/chatgpt/' + target).pathname, '/chatgpt/');
  }
});
function assertFree(f){assert.equal(f.api.getSiteAccount(),null);assert.equal(f.api.hasModelSelectionAccess(),false);assert.equal(f.api.getSiteSessionToken(),null);}
test('no session stays Free and never contacts the account service',async()=>{const f=fixture();assertFree(f);assert.equal(await f.api.initializeSiteAccount(),null);assert.equal(f.calls.length,0);});
test('invalid or expired cached sessions are removed without granting permissions',async t=>{
 for(const [label,cached]of [['malformed','{'],['missing-token',{expiresAt:now+100}],['invalid-token',record({token:'fixture-not-a-token'})],['expired',record({expiresAt:now})],['missing-expiry',record({expiresAt:undefined})],['string-expiry',record({expiresAt:String(now+1000)})]]){
  await t.test(label,async()=>{const f=fixture(cached);assertFree(f);await f.api.initializeSiteAccount();assertFree(f);assert.equal(f.values.has(key),false);assert.equal(f.calls.length,0);});
 }
});
test('forged cached administrator fields never bypass server validation',async()=>{const f=fixture(record());f.setHandler(async()=>({status:401,body:{error:{code:'UNAUTHORIZED',message:'Fixture rejected'}}}));await f.api.initializeSiteAccount();assertFree(f);assert.equal(f.values.has(key),false);assert.equal(f.calls[0].path,'/auth/session');});
test('only the server user becomes the immutable verified identity',async()=>{const f=fixture(record());await f.api.initializeSiteAccount();assert.equal(f.api.getSiteAccount().username,'TYC');assert.equal(f.api.hasModelSelectionAccess(),true);assert.equal(f.api.getSiteSessionToken(),fixtureToken);assert.equal('canSelectModels'in f.api.getSiteAccount(),false);assert.throws(()=>{f.api.getSiteAccount().planType='free';},/read only|Cannot assign/);});
test('session responses with invalid permission or identity fields fail closed',async t=>{
 for(const [label,change]of [['free',{planType:'free'}],['non-admin',{role:'member'}],['wrong-id',{id:'claimed-admin'}],['missing-time',{createdAt:undefined}],['wrong-source',{membershipSource:'browser-cache'}],['official-claim',{officialSubscriptionVerified:true}]]){
  await t.test(label,async()=>{const f=fixture(record());f.setHandler(async()=>({user:{...user(),...change}}));await f.api.initializeSiteAccount();assertFree(f);assert.equal(f.values.has(key),false);});
 }
});
test('revalidation withholds the cloud token until the server confirms the existing account',async()=>{const f=fixture(record());await f.api.initializeSiteAccount();let release;f.setHandler(()=>new Promise(resolve=>release=resolve));const pending=f.api.refreshSiteAccount();assert.equal(f.api.getSiteAccount().id,'site-admin');assert.equal(f.api.getSiteSessionToken(),null);release({status:401,body:{error:{message:'Fixture expired'}}});await pending;assertFree(f);assert.equal(f.values.has(key),false);});
test('a transport failure keeps locally verified identity and withholds its cloud token',async()=>{const f=fixture(record());await f.api.initializeSiteAccount();f.setHandler(async()=>{throw new TypeError('Fixture network unavailable');});await f.api.refreshSiteAccount();assert.equal(f.api.getSiteAccount().id,'site-admin');assert.equal(f.api.getSiteAccount().authenticationMode,'site-offline-cache');assert.equal(f.api.getSiteSessionToken(),null);assert.equal(f.values.has(key),true);});
test('expiry is checked by permission and token getters without another initialization',async()=>{const f=fixture(record());await f.api.initializeSiteAccount();f.setClock(now+60001);assertFree(f);assert.equal(f.values.has(key),false);});
test('an optional authoritative session expiry can shorten a remembered expiry',async()=>{const f=fixture(record());f.setHandler(async()=>({user:user(),expiresAt:now+1000}));await f.api.initializeSiteAccount();f.setClock(now+1001);assertFree(f);});
test('logout wins a race against an outstanding session verification',async()=>{const f=fixture(record());let release;f.setHandler(url=>new URL(url).pathname==='/auth/session'?new Promise(resolve=>release=resolve):Promise.resolve({ok:true}));const pending=f.api.initializeSiteAccount();await f.api.logoutSiteAccount();release({user:user()});await pending;assertFree(f);assert.equal(f.values.has(key),false);});
test('login validates token, plan, role and future millisecond expiry',async t=>{
 const valid={token:fixtureToken,expiresAt:now+60000,user:user()};
 for(const [label,change]of [['token',{token:'fixture-invalid'}],['expired',{expiresAt:now}],['missing-expiry',{expiresAt:undefined}],['string-expiry',{expiresAt:String(now+60000)}],['free-plan',{user:{...user(),planType:'free'}}],['member',{user:{...user(),role:'member'}}]]){
  await t.test(label,async()=>{const f=fixture();f.setHandler(async()=>({...valid,...change}));await assert.rejects(f.api.loginSiteAccount('fixture-user','fixture-input'));assertFree(f);assert.equal(f.values.has(key),false);});
 }
});
test('a successful login uses the verified server account and persists its issued expiry',async()=>{const f=fixture();f.setHandler(async()=>({token:fixtureToken,expiresAt:now+60000,user:user()}));await f.api.loginSiteAccount('fixture-user','fixture-input');assert.equal(f.api.hasModelSelectionAccess(),true);assert.equal(JSON.parse(f.values.get(key)).expiresAt,now+60000);});
test('logout wins a race against an outstanding login response',async()=>{const f=fixture();let release;f.setHandler(()=>new Promise(resolve=>release=resolve));const pending=f.api.loginSiteAccount('fixture-user','fixture-input');await f.api.logoutSiteAccount();release({token:fixtureToken,expiresAt:now+60000,user:user()});await assert.rejects(pending,/取消/);assertFree(f);assert.equal(f.values.has(key),false);});
test('a storage failure cannot leave an unpersisted privileged identity',async()=>{const f=fixture(record(),{failWrites:true});await f.api.initializeSiteAccount();assertFree(f);assert.equal(f.values.has(key),false);});
test('return URLs remain within the repository and discard old auth flags',()=>{const f=fixture();assert.equal(f.api.safeSiteReturnUrl('https://example.invalid/x').pathname,'/chatgpt/');const u=f.api.safeSiteReturnUrl('/chatgpt/c/fixture?localSession=1&draft=1&refresh_account=1#tail');assert.equal(u.pathname,'/chatgpt/c/fixture');assert.equal(u.search,'?draft=1');assert.equal(u.hash,'#tail');});

const freeAccount=()=>({id:'site-user:66666666-6666-4666-8666-666666666666',accountId:'66666666-6666-4666-8666-666666666666',username:'Fixture Free',name:'Fixture Free',role:'user',planType:'free',membershipSource:'site-registration',createdAt:now-10000,officialSubscriptionVerified:false});
test('verified registered Free DTO is accepted without model selection access',async()=>{const f=fixture(record());f.setHandler(async()=>({user:freeAccount(),expiresAt:now+30000}));await f.api.initializeSiteAccount();assert.equal(f.api.getSiteAccount().role,'user');assert.equal(f.api.getSiteAccount().planType,'free');assert.equal(f.api.hasModelSelectionAccess(),false);assert.equal(f.api.getSiteSessionToken(),fixtureToken);assert.equal(f.api.getSiteAccount().accountId,freeAccount().accountId);});
test('registered Free login is validated by the server and stays Free',async()=>{const f=fixture();f.setHandler(async()=>({token:fixtureToken,expiresAt:now+60000,user:freeAccount()}));await f.api.loginSiteAccount('fixture-user','fixture-input');assert.equal(f.api.hasModelSelectionAccess(),false);assert.equal(f.api.getSiteAccount().membershipSource,'site-registration');});
test('registration uses the real endpoint and accepts only the strict Free DTO',async()=>{const f=fixture();f.setHandler(async()=>({token:fixtureToken,expiresAt:now+60000,user:freeAccount()}));await f.api.registerSiteAccount('fixture-user','fixture-input');assert.equal(f.calls[0].path,'/auth/register');assert.equal(f.api.getSiteAccount().planType,'free');assert.equal(f.api.hasModelSelectionAccess(),false);});
test('registration cannot accept an administrator response',async()=>{const f=fixture();f.setHandler(async()=>({token:fixtureToken,expiresAt:now+60000,user:user()}));await assert.rejects(f.api.registerSiteAccount('fixture-user','fixture-input'));assertFree(f);});
test('malformed or escalated Free DTOs fail closed',async t=>{for(const change of [{planType:'pro'},{role:'administrator'},{membershipSource:'site-administrator'},{accountId:'invalid'},{id:'site-user:other'},{officialSubscriptionVerified:true}])await t.test(JSON.stringify(change),async()=>{const f=fixture(record());f.setHandler(async()=>({user:{...freeAccount(),...change}}));await f.api.initializeSiteAccount();assertFree(f);assert.equal(f.values.has(key),false);});});

test('Free Plus and Pro expose distinct product capabilities',()=>{const f=fixture();for(const [plan,work,dot]of[['free',false,false],['plus',true,false],['pro',true,true]]){const caps=f.api.getSitePlanCapabilities(plan);assert.equal(caps.chat,true);assert.equal(caps.work,work);assert.equal(caps.codex,work);assert.equal(caps.modelSelection,work);assert.equal(caps.dot,dot);}});
test('wrong local administrator password fails without any network request',async()=>{const f=fixture();f.setHandler(()=>{throw Error('No network permitted');});await assert.rejects(f.api.loginSiteAccount('tYc','wrong-neutral-input'),/用户名或密码/);assertFree(f);assert.equal(f.calls.length,0);});
test('an offline administrator authenticated by the local verifier restores without the account server', async () => {
  const verifierPassword = 'neutral-verifier-fixture';
  const f = fixture(undefined, { verifierPassword });
  f.setHandler(fetchUnavailable);
  await f.api.loginSiteAccount('tYc', verifierPassword.toUpperCase());
  assert.equal(f.api.getSiteAccount().authenticationMode, 'offline-administrator');
  assert.equal(f.api.getSiteAccount().planType, 'pro');
  assert.equal(f.api.getSiteSessionToken(), null);
  assert.equal(f.calls.length, 0);
  const stored = f.values.get(key);
  assert.equal(stored.includes(verifierPassword), false);
  const fresh = fixture(stored, { receipts: f.receipts, online: false, verifierPassword });
  fresh.setHandler(fetchUnavailable);
  assert.equal((await fresh.api.initializeSiteAccount()).id, 'site-admin');
  assert.equal(fresh.api.getSiteSessionToken(), null);
  assert.equal(fresh.calls.length, 0);
  fresh.api.logoutSiteAccount();
  assertFree(fresh);
});

const trialDuration = 30 * 86400000;
const trialPlansByTier = { plus: 'plus', prolite: 'pro', pro: 'pro', promax: 'pro' };
const trialUser = (tier, expiresAt = now + trialDuration) => ({
  ...freeAccount(), planType: trialPlansByTier[tier], siteTrial: { tier, expiresAt },
});
const serverLogin = profile => ({ user: profile, token: fixtureToken, expiresAt: now + 7 * 86400000 });
const fetchUnavailable = () => { throw new TypeError('Fixture transport is offline'); };

test('a previously verified registered account uses its own saved identity offline and revalidates on reconnect', async () => {
  const origin = fixture();
  origin.setHandler(() => serverLogin(freeAccount()));
  await origin.api.loginSiteAccount('Fixture Free', 'fixture-password');
  assert.equal(origin.calls[0].path, '/auth/login');
  assert.equal(origin.values.get(key).includes('fixture-password'), false);
  const f = fixture(origin.values.get(key), { receipts: origin.receipts, online: false });
  f.setHandler(fetchUnavailable);
  const cached = await f.api.initializeSiteAccount();
  assert.equal(cached.id, freeAccount().id);
  assert.equal(cached.accountId, freeAccount().accountId);
  assert.equal(cached.authenticationMode, 'site-offline-cache');
  assert.equal(cached.cloudSessionVerified, false);
  assert.equal(f.api.getSiteSessionToken(), null);
  assert.equal(f.api.isSiteGuestSession(), false);

  f.setHandler(() => ({ user: freeAccount() }));
  f.setOnline(true);
  await f.api.refreshSiteAccount();
  assert.deepEqual(f.calls.map(call => call.path), ['/auth/session', '/auth/session']);
  assert.equal(f.api.getSiteAccount().id, freeAccount().id);
  assert.equal(f.api.getSiteAccount().cloudSessionVerified, true);
  assert.equal(f.api.getSiteSessionToken(), fixtureToken);
});

test('offline restore cannot trust profile or administrator fields in localStorage', async () => {
  const f = fixture(record({ user: trialUser('promax') }), { online: false });
  f.setHandler(fetchUnavailable);
  assert.equal(await f.api.initializeSiteAccount(), null);
  assertFree(f);

  const claimedAdmin = fixture(record({ kind: 'offline-administrator:v1', username: 'TYC' }), { online: false });
  assert.equal(await claimedAdmin.api.initializeSiteAccount(), null);
  assertFree(claimedAdmin);
  assert.equal(claimedAdmin.values.has(key), false);
});

test('a guest ignores the entered name and password, is Free, and has no cloud session', async () => {
  const f = fixture(undefined, { online: false });
  const result = await f.api.loginSiteAccount('Fixture Existing Registered Name', 'fixture-password');
  assert.equal(result.role, 'guest');
  assert.equal(result.authenticationMode, 'browser-guest');
  assert.equal(result.username, undefined);
  assert.equal(f.calls.length, 0);
  assertFree(f);
  const fresh = fixture(record(), { online: false, tab: f.tab });
  assert.equal(fresh.api.isSiteGuestSession(), true);
  assert.equal(await fresh.api.initializeSiteAccount(), null);
  assert.equal(fresh.calls.length, 0);
  assert(![...f.tab.values()].some(value => value.includes('Fixture') || value.includes('password')));
  f.api.logoutSiteAccount();
  assert.equal(f.api.isSiteGuestSession(), false);
  assert.equal(f.tab.get('original-client-prototype-local-session'), '0');
});

test('a genuine transport failure may enter the guest mode, and rejected credentials or invalid responses cannot', async () => {
  const f = fixture();
  f.setHandler(fetchUnavailable);
  assert.equal((await f.api.loginSiteAccount('Neutral', 'irrelevant')).role, 'guest');
  assert.equal(f.calls[0].path, '/auth/login');
  assertFree(f);

  for (const response of [new Response('{}', { status: 401 }), new Response('invalid JSON'), new Response('{}', { status: 502 })]) {
    const rejected = fixture();
    rejected.setHandler(() => response);
    await assert.rejects(rejected.api.loginSiteAccount('Neutral', 'irrelevant'));
    assert.equal(rejected.api.isSiteGuestSession(), false);
    assertFree(rejected);
  }
});

test('explicit guest mode avoids all network calls and offline registration still needs the server', async () => {
  const f = fixture();
  assert.equal(f.api.startSiteGuestSession().role, 'guest');
  assert.equal(f.calls.length, 0);
  f.setHandler(fetchUnavailable);
  await assert.rejects(f.api.registerSiteAccount('Neutral new account', 'fixture-new-password'));
  assert.equal(f.api.isSiteGuestSession(), false);
  assert.equal(f.calls[0].path, '/auth/register');
  assertFree(f);
});

test('local logout returns immediately while the server logout is still pending', async () => {
  const f = fixture();
  f.setHandler(() => serverLogin(freeAccount()));
  await f.api.loginSiteAccount('Neutral', 'fixture-password');
  f.setOnline(false);
  let release;
  f.setHandler(() => new Promise(resolve => { release = resolve; }));
  assert.equal(await Promise.race([Promise.resolve(f.api.logoutSiteAccount()).then(() => 'signed-out'), new Promise(resolve => setImmediate(() => resolve('blocked')))]), 'signed-out');
  assertFree(f);
  assert.equal(f.values.has(key), false);
  assert.equal(f.tab.get('original-client-prototype-local-session'), '0');
  assert.equal(f.calls[1].path, '/auth/logout');
  assert.equal(f.calls[1].keepalive, true);
  release({ ok: true });
});

test('all four site trial tiers can be claimed and manually renewed on the same registered account', async () => {
  const f = fixture();
  f.setHandler(() => serverLogin(freeAccount()));
  await f.api.loginSiteAccount('Neutral', 'fixture-password');
  for (const [tier, plan] of Object.entries(trialPlansByTier)) {
    f.setHandler(() => ({ user: trialUser(tier), expiresAt: now + 7 * 86400000 }));
    const grant = await f.api.claimSiteTrial(tier);
    assert.equal(grant.id, freeAccount().id);
    assert.equal(grant.accountId, freeAccount().accountId);
    assert.equal(grant.planType, plan);
    assert.equal(grant.siteTrial.tier, tier);
    assert.equal(grant.siteTrial.expiresAt, now + trialDuration);
    assert.equal(grant.officialSubscriptionVerified, false);
    assert.equal(f.api.hasModelSelectionAccess(), true);
    assert.deepEqual(f.calls.at(-1), { path: '/auth/site-trial', method: 'POST', authorizationPresent: true, keepalive: false, tier });
  }
  f.setClock(now + 1000);
  f.setHandler(() => ({ user: trialUser('promax', now + trialDuration + 1000) }));
  const renewed = await f.api.claimSiteTrial('promax');
  assert.equal(renewed.siteTrial.expiresAt, now + trialDuration + 1000);
});

test('trial grants expire without switching account or changing cloud authentication', async () => {
  const f = fixture();
  f.setHandler(() => serverLogin(trialUser('prolite', now + 1000)));
  await f.api.loginSiteAccount('Neutral', 'fixture-password');
  assert.equal(f.api.getSiteAccount().planType, 'pro');
  f.setClock(now + 1000);
  const expired = f.api.getSiteAccount();
  assert.equal(expired.accountId, freeAccount().accountId);
  assert.equal(expired.planType, 'free');
  assert.equal(expired.siteTrial, null);
  assert.equal(f.api.hasModelSelectionAccess(), false);
  assert.equal(f.api.getSiteSessionToken(), fixtureToken);
});

test('trial mutations reject mismatched identity, invalid metadata, guest, admin and offline requests', async () => {
  const f = fixture();
  f.setHandler(() => serverLogin(freeAccount()));
  await f.api.loginSiteAccount('Neutral', 'fixture-password');
  const otherId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  for (const grant of [
    trialUser('pro'),
    trialUser('plus', now),
    trialUser('plus', now + 2 * trialDuration),
    trialUser('plus', String(now + trialDuration)),
    { ...trialUser('plus'), planType: 'pro' },
    { ...trialUser('plus'), id: 'site-user:' + otherId, accountId: otherId },
    { ...freeAccount(), siteTrial: { tier: 'unknown', expiresAt: now + 10000 }, planType: undefined },
  ]) {
    f.setHandler(() => ({ user: grant }));
    await assert.rejects(f.api.claimSiteTrial('plus'));
    assert.equal(f.api.getSiteAccount().planType, 'free');
  }
  f.setOnline(false);
  const requestsBefore = f.calls.length;
  await assert.rejects(f.api.claimSiteTrial('plus'), /联网/);
  assert.equal(f.calls.length, requestsBefore);
  const guest = fixture();
  guest.api.startSiteGuestSession();
  await assert.rejects(guest.api.claimSiteTrial('plus'), /登录/);
  assert.equal(guest.calls.length, 0);
  const admin = fixture(record());
  await admin.api.initializeSiteAccount();
  await assert.rejects(admin.api.claimSiteTrial('plus'), /登录/);
  assert.equal(admin.calls.length, 1);
});

test('the native trial action registers, claims, switches and renews against the account worker', async t => {
  const db = sqliteD1();
  t.after(() => db.raw.close());
  let serverClock = now;
  t.mock.method(Date, 'now', () => serverClock);
  const f = fixture();
  const pricing = f.loadPricing();
  f.setHandler((url, options) => accountWorker.fetch(new Request(url, {
    ...options,
    headers: { ...options.headers, Origin: 'https://tycofficial.github.io' },
  }), { DB: db }));
  assert.equal(pricing.getSiteTrialAction('plus').status, 'login');
  assert.equal(pricing.getSiteTrialAction('plus').disabled, false);
  assert.equal(pricing.getSiteTrialAction('business'), null);
  assert.match(pricing.SITE_TRIAL_TERMS, /免费试用 30 天.*仅在本站有效.*无需付款/);
  assert.equal(f.calls.length, 0);

  const username = 'NeutralTrialUser';
  const password = 'neutral-test-registration';
  const registered = await f.api.registerSiteAccount(username, password);
  const identity = f.loadIdentity();
  const ownerNamespace = identity.getLocalAccountStorageKey('history');
  assert.equal(pricing.getSiteTrialAction('plus').status, 'start');

  const opened = await pricing.submitSiteTrial('plus');
  assert.equal(opened.accountId, registered.accountId);
  assert.equal(opened.siteTrial.tier, 'plus');
  assert.equal(opened.siteTrial.expiresAt, serverClock + trialDuration);
  assert.equal(opened.officialSubscriptionVerified, false);
  assert.equal(pricing.getSiteTrialAction('prolite').status, 'switch');

  serverClock += 2 * 86400000;
  f.setClock(serverClock);
  const switched = await pricing.submitSiteTrial('prolite');
  assert.equal(switched.siteTrial.tier, 'prolite');
  assert.equal(switched.planType, 'pro');
  assert.equal(pricing.getSiteTrialAction('prolite').status, 'renew');
  assert.equal(pricing.getSiteTrialAction('prolite').expiresAt, switched.siteTrial.expiresAt);
  assert.equal(identity.getLocalAccountStorageKey('history'), ownerNamespace);

  serverClock += 1000;
  f.setClock(serverClock);
  const renewed = await pricing.submitSiteTrial('prolite');
  assert.equal(renewed.siteTrial.expiresAt, serverClock + trialDuration);
  assert.equal(renewed.siteTrial.expiresAt, switched.siteTrial.expiresAt + 1000);

  serverClock = renewed.siteTrial.expiresAt - 1;
  f.setClock(serverClock);
  await f.api.loginSiteAccount(username, password);
  assert.equal(pricing.getSiteTrialAction('prolite').status, 'renew');
  f.setClock(++serverClock);
  await f.api.refreshSiteAccount();
  assert.equal(pricing.getSiteTrialAction('prolite').status, 'start');
  assert.equal(pricing.getSiteTrialAction('prolite').expiresAt, null);
  assert.equal(f.api.getSiteAccount().accountId, registered.accountId);
  assert.equal(identity.getLocalAccountStorageKey('history'), ownerNamespace);
  const claims = f.calls.filter(call => call.path === '/auth/site-trial');
  assert.deepEqual(claims.map(call => call.tier), ['plus', 'prolite', 'prolite']);
  assert(claims.every(call => call.method === 'POST' && call.authorizationPresent));
  assert(f.calls.every(call => call.path.startsWith('/auth/')));
});

test('the trial action can revalidate and retry after a transport failure', async () => {
  const f = fixture();
  const pricing = f.loadPricing();
  f.setHandler(() => serverLogin(freeAccount()));
  await f.api.loginSiteAccount('Neutral', 'fixture-password');
  f.setHandler(fetchUnavailable);
  await assert.rejects(pricing.submitSiteTrial('plus'), /暂时无法连接/);
  assert.equal(pricing.getSiteTrialAction('plus').status, 'offline');
  assert.equal(pricing.getSiteTrialAction('plus').disabled, false);
  assert.equal(f.api.getSiteAccount().siteTrial, null);

  f.setHandler(url => new URL(url).pathname === '/auth/session' ?
    { user: freeAccount() } : { user: trialUser('plus') });
  const retried = await pricing.submitSiteTrial('plus');
  assert.equal(retried.siteTrial.tier, 'plus');
  assert.deepEqual(f.calls.map(call => call.path), ['/auth/login', '/auth/site-trial', '/auth/session', '/auth/site-trial']);
  f.setOnline(false);
  const offline = pricing.getSiteTrialAction('plus');
  assert.equal(offline.status, 'offline');
  assert.equal(offline.disabled, true);
  assert.equal(offline.expiresAt, retried.siteTrial.expiresAt);
  await assert.rejects(pricing.submitSiteTrial('plus'), /联网/);
  assert.equal(f.calls.length, 4);

  const admin = fixture(record());
  await admin.api.initializeSiteAccount();
  const adminPricing = admin.loadPricing();
  assert.equal(adminPricing.getSiteTrialAction('pro').status, 'administrator');
  assert.equal(adminPricing.getSiteTrialAction('pro').disabled, true);
  await assert.rejects(adminPricing.submitSiteTrial('pro'), /登录/);
  assert.equal(admin.calls.length, 1);
});

test('trial sign-in returns to the existing pricing view in the application basename', () => {
  const f = fixture();
  const existingPricing = 'https://tycofficial.github.io/chatgpt/#pricing';
  const login = f.api.getSiteLoginUrl(existingPricing);
  assert.equal(login.pathname, '/chatgpt/login');
  assert.equal(login.searchParams.get('next'), existingPricing);
});

test('native account snapshots retain their owner through expiry, and logout normalizes the deployment basename', async () => {
  const f = fixture(undefined, { href: 'https://tycofficial.github.io/chatgpt/c/fixture', basePath: '/chatgpt' });
  f.document.documentElement.dataset.routerBasename = '/';
  f.setHandler(() => serverLogin(trialUser('pro', now + 1000)));
  await f.api.loginSiteAccount('Neutral', 'fixture-password');
  const identity = f.loadIdentity();
  const paid = identity.getPrototypeLocalAuth();
  const historyKey = identity.getLocalAccountStorageKey('history');
  assert.equal(paid.accountId, freeAccount().accountId);
  assert.equal(paid.planType, 'pro');
  assert.equal(historyKey, 'history:account:' + freeAccount().accountId);
  f.setClock(now + 1000);
  assert.equal(identity.getPrototypeLocalAuth().planType, 'free');
  assert.equal(identity.getPrototypeLocalAuth().accountId, paid.accountId);
  assert.equal(identity.getLocalAccountStorageKey('history'), historyKey);
  assert.equal(identity.getLocalAccountCheck().accounts[paid.accountId].account.tbo_config.tbo_available, false);
  const signedOut = new URL(identity.getLocalSignedOutUrl());
  assert.equal(signedOut.pathname, '/chatgpt/');
  assert.equal(signedOut.searchParams.get('localSession'), '0');
  f.setHandler(() => ({ ok: true }));
  f.api.logoutSiteAccount();
  assert.equal(identity.getPrototypeLocalAuth(), null);
});

test('a trial response racing with logout cannot restore or alter the account', async () => {
  const f = fixture();
  f.setHandler(() => serverLogin(freeAccount()));
  await f.api.loginSiteAccount('Neutral', 'fixture-password');
  let release;
  f.setHandler(url => new URL(url).pathname === '/auth/site-trial' ?
    new Promise(resolve => { release = resolve; }) : { ok: true });
  const pending = f.api.claimSiteTrial('pro');
  f.api.logoutSiteAccount();
  release({ user: trialUser('pro') });
  await assert.rejects(pending, /取消/);
  assertFree(f);
  assert.equal(f.values.has(key), false);
});


async function savedRegisteredSession() {
  const original = fixture();
  original.setHandler(() => serverLogin(freeAccount()));
  await original.api.loginSiteAccount('Neutral', 'fixture-password');
  return { record: original.values.get(key), receipts: original.receipts };
}

test('first display uses the verified local owner while a single background session request remains pending', async () => {
  const saved = await savedRegisteredSession();
  const f = fixture(saved.record, { receipts: saved.receipts });
  let release;
  const response = new Promise(resolve => { release = resolve; });
  f.setHandler(() => response);
  const cutoff = Symbol('network is still pending');
  const firstDisplay = f.api.initializeSiteAccountForDisplay();
  let readyEvents = 0;
  f.events.addEventListener('codex-site-account-changed', () => {
    if (f.api.getSiteSessionToken()) readyEvents++;
  });
  try {
    const displayed = await Promise.race([firstDisplay, new Promise(resolve => setImmediate(() => resolve(cutoff)))]);
    assert.notEqual(displayed, cutoff);
    assert.equal(displayed.id, freeAccount().id);
    assert.equal(displayed.authenticationMode, 'site-offline-cache');
    assert.equal(displayed.cloudSessionVerified, false);
    assert.equal(f.api.getSiteSessionToken(), null);
    assert.equal(readyEvents, 0);
    const identity = f.loadIdentity();
    const ownerKey = 'history:account:' + freeAccount().accountId;
    assert.equal(identity.getLocalAccountStorageKey('history'), ownerKey);
    assert.equal(identity.getPrototypeLocalAuth().planType, 'free');

    const revalidation = f.api.refreshSiteAccount();
    assert.deepEqual(f.calls.map(call => call.path), ['/auth/session']);
    release({ user: trialUser('plus') });
    assert.equal((await revalidation).cloudSessionVerified, true);
    assert.equal(f.api.getSiteSessionToken(), fixtureToken);
    assert.equal(readyEvents, 1);
    assert.equal(identity.getLocalAccountStorageKey('history'), ownerKey);
    assert.equal(identity.getPrototypeLocalAuth().planType, 'plus');
  } finally {
    release({ user: freeAccount() });
  }
});

test('first display keeps a verified receipt offline and reconciles a server rejection on reconnect', async () => {
  const saved = await savedRegisteredSession();
  const f = fixture(saved.record, { receipts: saved.receipts, online: false });
  assert.equal((await f.api.initializeSiteAccountForDisplay()).id, freeAccount().id);
  assert.equal(f.calls.length, 0);
  assert.equal(f.api.getSiteSessionToken(), null);
  const identity = f.loadIdentity();
  assert.equal(identity.getPrototypeLocalAuth().accountId, freeAccount().accountId);

  f.setHandler(() => ({ status: 401, body: { error: { code: 'SITE_AUTH_REQUIRED', message: 'Fixture session revoked' } } }));
  f.setOnline(true);
  await f.api.refreshSiteAccount();
  assert.deepEqual(f.calls.map(call => call.path), ['/auth/session']);
  assertFree(f);
  assert.equal(f.values.has(key), false);
  assert.equal(identity.getPrototypeLocalAuth(), null);
});

test('first display waits for server verification when the remembered profile lacks a matching receipt', async () => {
  const saved = await savedRegisteredSession();
  const claimed = record({ expiresAt: JSON.parse(saved.record).expiresAt + 1000 });
  const f = fixture(claimed, { receipts: saved.receipts });
  let release;
  const response = new Promise(resolve => { release = resolve; });
  f.setHandler(() => response);
  let settled = false;
  const firstDisplay = f.api.initializeSiteAccountForDisplay().then(account => { settled = true; return account; });
  try {
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(settled, false);
    assertFree(f);
    assert.deepEqual(f.calls.map(call => call.path), ['/auth/session']);
  } finally {
    release({ status: 401, body: { error: { code: 'SITE_AUTH_REQUIRED' } } });
  }
  assert.equal(await firstDisplay, null);
  assert.equal(f.values.has(key), false);
});
