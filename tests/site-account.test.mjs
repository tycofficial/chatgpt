
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { pbkdf2Sync, webcrypto } from 'node:crypto';
import accountWorker from '../chatgpt-services/worker/service.mjs';
import { sqliteD1 } from '../chatgpt-services/tests/fixture-db.mjs';
import { getSiteAuthEntryKind, isHistoricalSitePath, resolveSiteHomeUrl } from '../src/native-client/site-paths.mjs';
import { installRestrictedBrowserStorage, isVolatileBrowserStorage } from '../src/native-client/restricted-browser-storage.mjs';
const identitySource=fs.readFileSync(new URL('../src/native-client/local-identity.mjs',import.meta.url),'utf8');
const pricingSource=fs.readFileSync(new URL('../src/native-client/local-pricing.mjs',import.meta.url),'utf8');
const source=fs.readFileSync(new URL('../src/native-client/site-account.mjs',import.meta.url),'utf8');
const names=['getSiteAccount','setAdminModelConnection','getAdminModelConnection','getAdminModelConnectionUrl','hasModelSelectionAccess','getSiteSessionToken','getSiteAccountError','initializeSiteAccount','initializeSiteAccountForDisplay','loginSiteAccount','registerSiteAccount','logoutSiteAccount','getSiteLoginUrl','getSiteRegistrationUrl','safeSiteReturnUrl','getSitePlanCapabilities','refreshSiteAccount','isSiteGuestSession','startSiteGuestSession','claimSiteTrial','getSiteHomeUrl','readSiteBillingOptions','createSiteCheckout','createSiteBillingPortal','refreshSiteBillingReturn'];
// Execute the actual module in an isolated VM with the deployment module URL and URL helpers.
// No real browser storage, password, token, account service, or network is used.
const fixtureToken='c'.repeat(64),key='chatgpt-site-admin-session:v1',now=1800000000000;
const user=()=>({id:'site-admin',username:'TYC',name:'TYC',role:'administrator',planType:'pro',membershipSource:'site-administrator',createdAt:now-10000,officialSubscriptionVerified:false});
function fixture(cached, { failWrites = false, online = true, receipts = new Map(), tab = new Map(), href = 'https://tycofficial.github.io/chatgpt/', basePath = '/chatgpt/', routerBasename, modulePath = '/chatgpt/native-client/site-account.mjs?v=fixture', verifierPassword, siteAccountService = false, volatileStorage = false, indexedDB = makeIndexedDB(receipts) } = {}) {
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
  const document = { documentElement: { dataset: { routerBasename } } };
  const location = { origin: new URL(href).origin, href, pathname: new URL(href).pathname, assign() {} };
  const context = vm.createContext({
    crypto: webcrypto, TextEncoder, URL, AbortController, Response, Event, setTimeout, clearTimeout, navigator, document,
    Date: class extends Date { static now() { return clock; } },
    localStorage, sessionStorage, location, indexedDB,
    __CHATGPT_REPLICA_ENV__: basePath === null ? undefined : { basePath, siteAccountService },
    getSiteAuthEntryKind, isHistoricalSitePath, resolveSiteHomeUrl, isVolatileBrowserStorage,
    addEventListener: (...args) => events.addEventListener(...args),
    removeEventListener: (...args) => events.removeEventListener(...args),
    dispatchEvent: event => events.dispatchEvent(event),
    fetch: async (url, options) => {
      const path = new URL(url).pathname;
      const call = { path, method: options.method, authorizationPresent: typeof options.headers.Authorization === 'string', keepalive: options.keepalive };
      if (path === '/auth/site-trial' || path === '/billing/v1/checkout') call.tier = JSON.parse(options.body).tier;
      calls.push(call);
      const result = await handler(url, options);
      if (result instanceof Response) return result;
      return new Response(JSON.stringify(result.body ?? result), { status: result.status ?? 200, headers: { 'Content-Type': 'application/json' } });
    },
  });
  if (volatileStorage) {
    delete context.localStorage;
    installRestrictedBrowserStorage(context);
  }
  let authSource = source;
  if (verifierPassword) {
    const salt = '00112233aabbccdd';
    const iterations = 1000;
    const hash = pbkdf2Sync(verifierPassword, Buffer.from(salt, 'hex'), iterations, 32, 'sha256').toString('hex');
    authSource = authSource.replace(/^const offlineAdminVerifier\s*=.*$/m, 'const offlineAdminVerifier = ' + JSON.stringify({ salt, iterations, hash }) + ';');
  }
  const executable = authSource.replace(/^import .*;\r?$/gm, '').replace(/^export\s+/gm, '')
    .replaceAll('import.meta.url', JSON.stringify(new URL(modulePath, href).href)) + '\nglobalThis.fixtureExports={' + names.join(',') + '};';
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
      const names = 'getSiteBillingAction,getSiteTrialAction,normalizeLocalMembership,submitSiteTrial,SITE_TRIAL_TERMS';
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

test('login and registration recover the repository basename before the router initializes', () => {
  const origin = 'https://tycofficial.github.io';
  for (const basePath of [null, '/', '//untrusted.invalid/']) {
    const f = fixture(undefined, { href: origin + '/c/neutral-history?draft=1#tail', basePath, modulePath: '/native-client/site-account.mjs?v=cached' });
    const next = '/c/neutral-history?draft=1&localSession=1#tail';
    const target = origin + '/chatgpt/c/neutral-history?draft=1#tail';
    assert.equal(f.api.getSiteHomeUrl().href, origin + '/chatgpt/');
    assert.equal(f.api.getSiteLoginUrl(next).pathname, '/chatgpt/login');
    assert.equal(f.api.getSiteRegistrationUrl(next).pathname, '/chatgpt/signup');
    assert.equal(f.api.getSiteRegistrationUrl(next).searchParams.get('next'), target);
    assert.equal(f.api.safeSiteReturnUrl('work/neutral-task?draft=1').pathname, '/chatgpt/work/neutral-task');
    assert.equal(f.api.safeSiteReturnUrl('/another-repository/c/neutral').pathname, '/chatgpt/');
    assert.equal(f.api.safeSiteReturnUrl('https://untrusted.invalid/c/neutral').href, origin + '/chatgpt/');
  }
});

test('the packaged account module retains its explicit deployment path on cached documents', () => {
  const f = fixture(undefined, { href: 'https://fixture.test/auth/signup/index.html', basePath: '/', routerBasename: '/', modulePath: '/preview/chatgpt/native-client/site-account.mjs?v=cached' });
  assert.equal(f.api.getSiteHomeUrl().pathname, '/preview/chatgpt/');
  assert.equal(f.api.getSiteRegistrationUrl().pathname, '/preview/chatgpt/signup');
  assert.equal(f.api.safeSiteReturnUrl('/preview/chatgpt/auth/signup/index.html').pathname, '/preview/chatgpt/');
});
function assertFree(f){assert.equal(f.api.getSiteAccount(),null);assert.equal(f.api.hasModelSelectionAccess(),false);assert.equal(f.api.getSiteSessionToken(),null);}
test('no session stays Free and never contacts the account service',async()=>{const f=fixture();assertFree(f);assert.equal(await f.api.initializeSiteAccount(),null);assert.equal(f.calls.length,0);});
test('invalid or expired cached sessions are removed without granting permissions',async t=>{
 for(const [label,cached]of [['malformed','{'],['missing-token',{expiresAt:now+100}],['invalid-token',record({token:'fixture-not-a-token'})],['expired',record({expiresAt:now})],['missing-expiry',record({expiresAt:undefined})],['string-expiry',record({expiresAt:String(now+1000)})]]){
  await t.test(label,async()=>{const f=fixture(cached);assertFree(f);await f.api.initializeSiteAccount();assertFree(f);assert.equal(f.values.has(key),false);assert.equal(f.calls.length,0);});
 }
});
test('forged cached administrator fields never bypass server validation',async()=>{const f=fixture(record());f.setHandler(async()=>({status:401,body:{error:{code:'UNAUTHORIZED',message:'Fixture rejected'}}}));await f.api.initializeSiteAccount();assertFree(f);assert.equal(f.values.has(key),false);assert.equal(f.calls[0].path,'/auth/session');});

test('per-page storage can open a guest view but does not start a login or registration that cannot persist', async () => {
  const f = fixture(record(), { volatileStorage: true });
  assert.equal(await f.api.initializeSiteAccountForDisplay(), null);
  await assert.rejects(f.api.loginSiteAccount('fixture-user', 'fixture-password'), /无法保存登录状态/);
  await assert.rejects(f.api.registerSiteAccount('fixture-user', 'fixture-password'), /无法保存登录状态/);
  assert.equal(f.api.getSiteAccount(), null);
  assert.equal(f.api.getSiteSessionToken(), null);
  assert.equal(f.calls.length, 0);
});

test('first display recovers from a stuck receipt database open through verified server identity', { timeout: 4500 }, async () => {
  const receipts = new Map(), normalDatabase = makeIndexedDB(receipts);
  let lateConnectionClosed = false, opens = 0;
  const lateRequest = { result: { close() { lateConnectionClosed = true; } } };
  const indexedDB = { open: () => ++opens === 1 ? lateRequest : normalDatabase.open() };
  const f = fixture(record(), { receipts, indexedDB });
  f.setHandler(async () => ({ user: freeAccount() }));
  const account = await f.api.initializeSiteAccountForDisplay();
  assert.equal(account.id, freeAccount().id);
  assert.equal(account.planType, 'free');
  assert.equal(account.authenticationMode, 'site-server');
  assert.equal(f.api.getSiteSessionToken(), fixtureToken);
  assert.deepEqual(f.calls.map(call => call.path), ['/auth/session']);
  assert.equal(receipts.get(fixtureToken).user.id, freeAccount().id);
  lateRequest.onsuccess();
  assert.equal(lateConnectionClosed, true);
});
test('only the server user becomes the immutable verified identity',async()=>{const f=fixture(record());await f.api.initializeSiteAccount();assert.equal(f.api.getSiteAccount().username,'TYC');assert.equal(f.api.hasModelSelectionAccess(),true);assert.equal(f.api.getSiteSessionToken(),fixtureToken);assert.equal('canSelectModels'in f.api.getSiteAccount(),false);assert.throws(()=>{f.api.getSiteAccount().planType='free';},/read only|Cannot assign/);});
test('session responses with invalid permission or identity fields fail closed',async t=>{
 for(const [label,change]of [['free',{planType:'free'}],['non-admin',{role:'member'}],['wrong-id',{id:'claimed-admin'}],['missing-time',{createdAt:undefined}],['wrong-source',{membershipSource:'browser-cache'}],['official-claim',{officialSubscriptionVerified:true}]]){
  await t.test(label,async()=>{const f=fixture(record());f.setHandler(async()=>({user:{...user(),...change}}));await f.api.initializeSiteAccount();assertFree(f);assert.equal(f.values.has(key),false);});
 }
});
test('revalidation withholds the cloud token until the server confirms the existing account',async()=>{const f=fixture(record());await f.api.initializeSiteAccount();let release;f.setHandler(()=>new Promise(resolve=>release=resolve));const pending=f.api.refreshSiteAccount();assert.equal(f.api.getSiteAccount().id,'site-admin');assert.equal(f.api.getSiteSessionToken(),null);release({status:401,body:{error:{code:'ADMIN_AUTH_REQUIRED',message:'Fixture expired'}}});await pending;assertFree(f);assert.equal(f.values.has(key),false);});
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

test('gateway failure still allows the verified local administrator and a tab-scoped model connection', async () => {
  const verifierPassword = 'neutral-admin-recovery-fixture';
  const f = fixture(undefined, { verifierPassword, siteAccountService: true });
  f.setHandler(() => ({ status: 503, body: { error: { code: 'SERVICE_UNAVAILABLE' } } }));
  assert.equal((await f.api.loginSiteAccount('TYC', verifierPassword)).authenticationMode, 'offline-administrator');
  assert.equal(f.api.getSiteSessionToken(), null);
  assert.equal(f.api.getAdminModelConnection(), null);
  assert.throws(() => f.api.setAdminModelConnection({ apiBase: 'http://provider.invalid/v1', apiKey: 'test-only' }), /HTTPS/);
  f.api.setAdminModelConnection({ apiBase: 'https://provider.invalid/v1/', apiKey: 'test-only' });
  assert.equal(f.api.getAdminModelConnection().apiBase, 'https://provider.invalid/v1');
  const restored = fixture(f.values.get(key), { receipts: f.receipts, tab: f.tab, verifierPassword });
  await restored.api.initializeSiteAccount();
  assert.equal(restored.api.getAdminModelConnection().apiKey, 'test-only');
  await restored.api.logoutSiteAccount();
  assert.equal(restored.api.getAdminModelConnection(), null);
  assert.throws(() => restored.api.setAdminModelConnection({ apiBase: 'https://provider.invalid/', apiKey: 'test-only' }), /管理员/);
});

test('login and registration report a config failure while preserving local administrator fallback', async () => {
  const verifierPassword = 'neutral-gateway-config-fixture';
  const f = fixture(undefined, { verifierPassword, siteAccountService: true });
  f.setHandler(() => ({ status: 500, body: { error: { code: 'SITE_ACCOUNT_GATEWAY_BODY_UNAVAILABLE' } } }));
  await assert.rejects(f.api.loginSiteAccount('fixture-user', 'fixture-password'), /账号网关配置有误/);
  await assert.rejects(f.api.registerSiteAccount('fixture-user', 'fixture-password'), /账号网关配置有误/);
  assert.equal((await f.api.loginSiteAccount('TYC', verifierPassword)).authenticationMode, 'offline-administrator');
  assert.equal(f.api.getSiteSessionToken(), null);
});

test('model settings preserve an internal return URL and reject external destinations and account entry loops', () => {
  const { api } = fixture();
  const settings = api.getAdminModelConnectionUrl('/chatgpt/settings/account?localSession=0');
  assert.equal(settings.pathname, '/chatgpt/login');
  assert.equal(settings.searchParams.get('model_connection'), '1');
  assert.equal(settings.searchParams.get('next'), 'https://tycofficial.github.io/chatgpt/settings/account');
  for (const next of ['https://unrelated.invalid/', '/chatgpt/logout', '/chatgpt/auth/login/']) {
    assert.equal(api.getAdminModelConnectionUrl(next).searchParams.get('next'), 'https://tycofficial.github.io/chatgpt/');
  }
});

test('account gateways preserve a verified administrator and local model selection across revalidation', async t => {
  const responses = [
    ['transport reset', () => { throw new TypeError('Fixture network reset'); }],
    ['manual redirect', () => new Response(null, { status: 302 })],
    ['filtered redirect', () => Object.defineProperty(Response.error(), 'type', { value: 'opaqueredirect' })],
    ['HTML success page', () => new Response('<h1>Gateway</h1>', { headers: { 'Content-Type': 'text/html' } })],
    ['untyped HTML unauthorized', () => new Response('<h1>Gateway</h1>', { status: 401 })],
    ['typed origin denial', () => ({ status: 403, body: { error: { code: 'ORIGIN_NOT_ALLOWED' } } })],
    ['other gateway denial', () => ({ status: 403, body: { error: { code: 'FORBIDDEN' } } })],
    ['request timeout', () => ({ status: 408, body: { error: { code: 'REQUEST_TIMEOUT' } } })],
    ['service throttling', () => ({ status: 429, body: { error: { code: 'RATE_LIMITED' } } })],
    ['service unavailable', () => ({ status: 503, body: { error: { code: 'SERVICE_UNAVAILABLE' } } })],
  ];
  for (const [name, response] of responses) {
    await t.test(name, async () => {
      const f = fixture(undefined, { siteAccountService: true });
      f.setHandler(() => ({ user: user(), token: fixtureToken, expiresAt: now + 60000 }));
      await f.api.loginSiteAccount('TYC', 'neutral-site-account-fixture');
      const connection = { apiBase: 'https://provider.invalid/v1', apiKey: 'neutral-local-key' };
      f.api.setAdminModelConnection(connection);
      const remembered = f.values.get(key);

      f.setHandler(response);
      const cached = await f.api.refreshSiteAccount();
      assert.equal(cached?.id, 'site-admin');
      assert.equal(cached.authenticationMode, 'site-offline-cache');
      assert.equal(cached.cloudSessionVerified, false);
      assert.equal(f.api.getSiteSessionToken(), null);
      assert.equal(f.values.get(key), remembered);
      assert.equal(f.receipts.has(fixtureToken), true);
      assert.equal(f.api.getAdminModelConnection()?.apiBase, connection.apiBase);

      f.setHandler(() => ({ user: user() }));
      assert.equal((await f.api.refreshSiteAccount())?.cloudSessionVerified, true);
      assert.equal(f.api.getSiteSessionToken(), fixtureToken);
      assert.equal(f.api.getAdminModelConnection()?.apiKey, connection.apiKey);

      f.setHandler(() => ({ status: 401, body: { error: { code: 'ADMIN_AUTH_REQUIRED' } } }));
      assert.equal(await f.api.refreshSiteAccount(), null);
      assert.equal(f.values.has(key), false);
      assert.equal(f.api.getAdminModelConnection(), null);
    });
  }
});

test('an authoritative invalid password does not silently replace online verification', async () => {
  const verifierPassword = 'neutral-local-only-fixture';
  const f = fixture(undefined, { verifierPassword, siteAccountService: true });
  f.setHandler(() => ({ status: 401, body: { error: { code: 'INVALID_CREDENTIALS', message: '账户密码不正确。' } } }));
  await assert.rejects(f.api.loginSiteAccount('TYC', verifierPassword), /账户密码不正确/);
  assert.equal(f.api.getSiteAccount(), null);
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

test('a cached logout revokes the current registered session and clears its browser receipt', async () => {
  const currentSession = record({ token: 'd'.repeat(64), user: freeAccount() });
  const f = fixture(record(), { basePath: null, href: 'https://tycofficial.github.io/auth/logout/index.html' });
  f.values.set(key, JSON.stringify(currentSession));
  f.receipts.set(currentSession.token, { identity: currentSession.user });
  let usedCurrentToken = false;
  f.setHandler(async (_url, request) => {
    usedCurrentToken = request.headers.Authorization === 'Bearer ' + currentSession.token;
    return { ok: true };
  });
  f.api.logoutSiteAccount();
  assertFree(f);
  assert.equal(f.values.has(key), false);
  assert.equal(usedCurrentToken, true);
  assert.deepEqual(f.calls, [{ path: '/auth/logout', method: 'POST', authorizationPresent: true, keepalive: true }]);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.receipts.has(currentSession.token), false);
});

test('signing out from a cached guest tab preserves the registered account in another browser tab', async () => {
  const f = fixture(record({ user: freeAccount() }));
  const registered = f.values.get(key);
  f.receipts.set(fixtureToken, { identity: freeAccount() });
  f.tab.set('chatgpt-site-local-guest:v1', '1');
  f.api.logoutSiteAccount();
  assertFree(f);
  assert.equal(f.calls.length, 0);
  assert.equal(f.values.get(key), registered);
  assert.equal(f.receipts.has(fixtureToken), true);
  assert.equal(f.tab.get('original-client-prototype-local-session'), '0');
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

test('a registered owner survives gateway route mistakes on reconnect and honors actual revocation', async t => {
  const DB = sqliteD1();
  t.after(() => DB.raw.close());
  let observedRejection;
  const authority = async (url, options) => {
    const response = await accountWorker.fetch(new Request(url, options), { DB });
    if (response.status === 401) observedRejection = (await response.clone().json()).error.code;
    return response;
  };
  const first = fixture();
  first.setClock(Date.now());
  first.setHandler(authority);
  const user = await first.api.registerSiteAccount('ReconnectFixture', 'Neutral-Fixture-Password');
  const savedRecord = first.values.get(key), savedReceipts = structuredClone(first.receipts);
  const f = fixture(savedRecord, { receipts: structuredClone(savedReceipts), online: false });
  f.setClock(Date.now());
  assert.equal((await f.api.initializeSiteAccountForDisplay()).id, user.id);
  const localIdentity = f.loadIdentity();
  for (const response of [
    () => new Response('<h1>Gateway route not found</h1>', { status: 404, headers: {
      'Content-Type': 'text/html', 'Access-Control-Allow-Origin': 'https://tycofficial.github.io',
    } }),
    () => ({ status: 405, body: { error: { code: 'ROUTE_NOT_AVAILABLE' } } }),
  ]) {
    f.setHandler(response);
    f.setOnline(true);
    const cached = await f.api.refreshSiteAccount();
    assert.equal(cached?.accountId, user.accountId);
    assert.equal(cached.authenticationMode, 'site-offline-cache');
    assert.equal(localIdentity.getLocalAccountStorageKey('history'), 'history:account:' + user.accountId);
    assert.equal(f.api.getSiteSessionToken(), null);
    assert.equal(f.values.get(key), savedRecord);
    assert.equal(f.receipts.size, 1);
    f.setHandler(authority);
    f.events.dispatchEvent(new Event('focus'));
    assert.equal((await f.api.refreshSiteAccount())?.cloudSessionVerified, true);
    f.setOnline(false);
  }
  await first.api.logoutSiteAccount({ waitForRemote: true });
  f.setOnline(true);
  assert.equal(await f.api.refreshSiteAccount(), null);
  assert.equal(observedRejection, 'ADMIN_AUTH_REQUIRED');
  assert.equal(localIdentity.getPrototypeLocalAuth(), null);
  assert.equal(f.values.has(key), false);
  assert.equal(f.receipts.size, 0);
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

const billingPeriodEnd = now + 2 * 86400000;
const subscriptionUser = (tier = 'plus') => ({
  ...freeAccount(), planType: tier === 'go' ? 'go' : trialPlansByTier[tier], siteTrial: null,
  siteSubscription: { tier, expiresAt: billingPeriodEnd, cancelAtPeriodEnd: true },
});

test('verified paid membership preserves the exact tier offline until its real billing expiry', async () => {
  const f = fixture();
  f.setHandler(() => serverLogin(subscriptionUser('promax')));
  const paid = await f.api.loginSiteAccount('Fixture Free', 'fixture-password');
  assert.equal(paid.planType, 'pro');
  assert.equal(paid.siteTrial, null);
  assert.equal(paid.siteSubscription.tier, 'promax');
  assert.equal(Object.isFrozen(paid.siteSubscription), true);
  assert.equal(f.api.getSitePlanCapabilities().dot, true);
  await assert.rejects(f.api.claimSiteTrial('plus'), /管理当前订阅/);
  assert.equal(f.calls.some(call => call.path === '/auth/site-trial'), false);

  const restored = fixture(f.values.get(key), { online: false, receipts: f.receipts, tab: f.tab });
  await restored.api.initializeSiteAccountForDisplay();
  assert.equal(restored.api.getSiteAccount().siteSubscription.tier, 'promax');
  assert.equal(restored.api.getSiteSessionToken(), null);
  const pricing = restored.loadPricing();
  const membership = pricing.normalizeLocalMembership(restored.api.getSiteAccount());
  assert.equal(membership.managed_by, 'site-subscription');
  assert.equal(membership.cancel_at_period_end, true);
  assert.equal(membership.has_openai_subscription, false);
  assert.equal(pricing.getSiteBillingAction('promax', null).disabled, true);
  restored.setClock(billingPeriodEnd + 1);
  assert.equal(restored.api.getSiteAccount().planType, 'free');
  assert.equal(restored.api.getSiteAccount().siteSubscription, null);
  assert.equal(restored.api.getSitePlanCapabilities().dot, false);
});

test('invalid paid receipts cannot grant access', async t => {
  for (const [name, invalid] of [
    ['unknown tier', { planType: undefined, siteSubscription: { tier: 'unknown', expiresAt: billingPeriodEnd, cancelAtPeriodEnd: false } }],
    ['mismatched plan', { planType: 'pro' }],
    ['simultaneous trial', { siteTrial: { tier: 'plus', expiresAt: billingPeriodEnd } }],
    ['nonboolean cancellation', { siteSubscription: { ...subscriptionUser().siteSubscription, cancelAtPeriodEnd: 'false' } }],
    ['official subscription impersonation', { officialSubscriptionVerified: true }],
    ['wrong account ID', { id: 'site-user:wrong-account' }],
  ]) await t.test(name, async () => {
    const f = fixture();
    f.setHandler(() => serverLogin({ ...subscriptionUser(), ...invalid }));
    await assert.rejects(f.api.loginSiteAccount('Fixture Free', 'fixture-password'), /权限验证失败/);
    assert.equal(f.api.hasModelSelectionAccess(), false);
  });
});

test('a verified Go receipt keeps Standard Chat and never grants Plus or Pro access', async () => {
  const f = fixture();
  f.setHandler(() => serverLogin(subscriptionUser('go')));
  const account = await f.api.loginSiteAccount('Fixture Go', 'fixture-password');
  const capabilities = f.api.getSitePlanCapabilities();
  assert.equal(account.siteSubscription.tier, 'go');
  assert.equal(account.siteTrial, null);
  assert.equal(capabilities.planType, 'go');
  assert.equal(capabilities.chat, true);
  for (const feature of ['modelSelection', 'work', 'codex', 'dot']) assert.equal(capabilities[feature], false);
  const identity = f.loadIdentity().getLocalAccountCheck().accounts[account.accountId];
  assert.equal(identity.account.plan_type, 'go');
  assert.equal(identity.entitlement.has_active_subscription, false);
  assert.equal(identity.account.tbo_config.tbo_available, false);
  const pricing = f.loadPricing();
  assert.equal(pricing.normalizeLocalMembership(account).site_subscription_tier, 'go');
  assert.equal(pricing.getSiteBillingAction('go', null).kind, 'portal');
  assert.equal(pricing.getSiteTrialAction('go'), null);
  await assert.rejects(f.api.claimSiteTrial('go'), /有效的本站试用方案/);
  f.setClock(billingPeriodEnd);
  assert.equal(f.api.getSitePlanCapabilities().planType, 'free');
});

test('only server-configured tiers show checkout and the eligible trial remains available', async () => {
  const f = fixture();
  const pricing = f.loadPricing();
  f.setHandler(() => ({ tiers: [], checkoutAvailable: false }));
  assert.equal(pricing.getSiteBillingAction('plus', await f.api.readSiteBillingOptions()), null);
  assert.equal(f.calls.at(-1).authorizationPresent, false);
  assert.equal(f.calls.at(-1).method, 'GET');
  assert.equal(pricing.getSiteTrialAction('plus').status, 'login');

  f.setHandler(() => ({ tiers: ['plus'], checkoutAvailable: true }));
  const options = await f.api.readSiteBillingOptions();
  assert.equal(pricing.getSiteBillingAction('plus', options).status, 'login');
  assert.equal(pricing.getSiteBillingAction('pro', options), null);
  assert.equal(pricing.getSiteBillingAction('go', options).kind, 'availability');
  await assert.rejects(f.api.createSiteCheckout('go'), /先登录本站注册账户/);
  await assert.rejects(f.api.createSiteCheckout('plus'), /先登录本站注册账户/);

  f.setHandler(() => serverLogin(freeAccount()));
  await f.api.loginSiteAccount('Fixture Free', 'fixture-password');
  assert.equal(pricing.getSiteBillingAction('plus', options).kind, 'checkout');
  assert.equal(pricing.getSiteTrialAction('plus').status, 'start');
  f.setHandler(() => ({ tiers: ['go'], checkoutAvailable: true }));
  assert.equal(pricing.getSiteBillingAction('go', await f.api.readSiteBillingOptions()).kind, 'checkout');
  assert.equal(pricing.getSiteTrialAction('go'), null);
  f.setHandler(() => ({ tiers: ['unknown'], checkoutAvailable: true }));
  await assert.rejects(f.api.readSiteBillingOptions(), /无法核实/);
});

test('checkout and portal require site auth and only return their exact trusted HTTPS destinations', async () => {
  const f = fixture();
  f.setHandler(() => serverLogin(freeAccount()));
  await f.api.loginSiteAccount('Fixture Free', 'fixture-password');
  const address = 'https://checkout.stripe.com/c/pay/cs_test_neutral#fixture';
  f.setHandler(() => ({ url: address }));
  assert.equal(await f.api.createSiteCheckout('plus'), address);
  assert.deepEqual(f.calls.at(-1), { path: '/billing/v1/checkout', method: 'POST', authorizationPresent: true, keepalive: false, tier: 'plus' });
  assert.equal(await f.api.createSiteCheckout('go'), address);
  assert.equal(f.calls.at(-1).tier, 'go');
  const portal = 'https://billing.stripe.com/p/session/bps_neutral';
  f.setHandler(() => ({ url: portal }));
  assert.equal(await f.api.createSiteBillingPortal(), portal);
  assert.equal(f.calls.at(-1).path, '/billing/v1/portal');
  assert.equal(f.calls.at(-1).authorizationPresent, true);
  for (const url of [
    'http://checkout.stripe.com/c/pay/cs_test_neutral', 'https://checkout.stripe.com.example.invalid/',
    'https://name@checkout.stripe.com/', 'https://billing.stripe.com/p/session/unexpected', '//checkout.stripe.com/',
  ]) {
    f.setHandler(() => ({ url }));
    await assert.rejects(f.api.createSiteCheckout('plus'), /无法验证的支付页面/);
  }
});

test('a pending checkout is single-flight and logout invalidates its delayed redirect', async () => {
  const f = fixture();
  f.setHandler(() => serverLogin(freeAccount()));
  await f.api.loginSiteAccount('Fixture Free', 'fixture-password');
  const hold = Promise.withResolvers();
  f.setHandler(url => new URL(url).pathname === '/billing/v1/checkout' ? hold.promise : { ok: true });
  const firstFailure = assert.rejects(f.api.createSiteCheckout('plus'), /账户操作已取消/);
  await assert.rejects(f.api.createSiteCheckout('plus'), /正在打开本站账单/);
  await f.api.logoutSiteAccount();
  hold.resolve({ url: 'https://checkout.stripe.com/c/pay/cs_test_neutral' });
  await firstFailure;
  assert.equal(f.calls.filter(call => call.path === '/billing/v1/checkout').length, 1);
});

test('an explicit return refreshes the account using its server receipt and never creates another checkout', async () => {
  const f = fixture(undefined, { href: 'https://tycofficial.github.io/chatgpt/?site_billing=return#pricing' });
  f.setHandler(() => serverLogin(freeAccount()));
  await f.api.loginSiteAccount('Fixture Free', 'fixture-password');
  f.setHandler(() => ({ user: subscriptionUser() }));
  await f.api.refreshSiteBillingReturn();
  assert.equal(f.api.getSiteAccount().siteSubscription.tier, 'plus');
  assert.deepEqual(f.calls.slice(1).map(call => call.path), ['/auth/session']);
});
