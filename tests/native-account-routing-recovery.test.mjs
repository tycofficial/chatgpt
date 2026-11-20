import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as catalog from '../model-catalog.js';
import {createConversationIdentityProvider} from '../src/native-client/local-personalization-context.mjs';
import {LocalAppServer} from '../src/native-client/local-app-server.mjs';
import {ClassicChatAdapter} from '../src/native-client/classic-chat-adapter.mjs';
import {createClassicResponseActions} from '../src/native-client/classic-response-branches.mjs';
import {createModelCatalogAdapter} from '../src/native-client/model-catalog-adapter.mjs';
import {createProviderCompletionRouter} from '../src/native-client/provider-routing.mjs';
import {streamCompletion} from '../runtime.js';
import {createReleaseUpdater} from '../release-updater.js';

function host(identity){
 const models=createModelCatalogAdapter(catalog),requests=[];
 const server=new LocalAppServer({models,catalog,storage:{getItem:()=>null,setItem(){}},getExecutionPolicy:()=>({modelSelection:false,freeChatModel:'gpt-6-sol'}),readSettings:()=>({model:'gpt-6-sol'}),streamCompletion:async options=>{requests.push(options);return{content:'Neutral completion',finish_reason:'stop'};}});
 const classic=new ClassicChatAdapter({appServer:server,models});
 const actions=createClassicResponseActions({appServer:server,classic,models,getIdentity:identity});
 Object.assign(classic,{responseActions:actions,detail:actions.detail,message:actions.message,projectItem:actions.projectItem});
 return{server,classic,requests};
}
const body=()=>({action:'next',model:'auto',parent_message_id:crypto.randomUUID(),messages:[{id:crypto.randomUUID(),author:{role:'user'},content:{content_type:'text',parts:['Neutral input']}}]});
const request=value=>new Request('https://fixture.test/f/conversation',{method:'POST',body:JSON.stringify(value)});
test('signed-out Free conversations use only the guest namespace and cannot survive an account switch',async()=>{
 let site=null;const identity=createConversationIdentityProvider({getSiteAccount:()=>site,getVerifiedIdentity:()=>null,getStorageKey:key=>key+':guest'}),f=host(identity);
 assert.equal(identity().authenticationMode,'browser-guest');
 assert.match(await(await f.classic.handle(request(body()),'/f/conversation')).text(),/Neutral completion/);
 assert.equal(f.requests[0].settings.model,'gpt-6-sol');assert.equal(f.requests[0].settings.reasoningEffort,'none');
 site={id:'different-account'};assert.equal(identity(),null);
 await assert.rejects(f.classic.handle(request(body()),'/f/conversation'),{code:'SITE_ACCOUNT_REQUIRED'});assert.equal(f.server.threads.size,1);
});
test('missing identity is rejected before creating an empty conversation or charging a request',async()=>{
 const f=host(()=>null);await assert.rejects(f.classic.handle(request(body()),'/f/conversation'),{code:'SITE_ACCOUNT_REQUIRED'});
 assert.equal(f.server.threads.size,0);assert.equal(f.requests.length,0);
});
test('native browser-auth cleanup preserves a real site login; actual site logout revokes it',()=>{
 let reloads=0;let account={id:'site-admin',role:'administrator',planType:'pro',username:'TYC',createdAt:1};
 const context=vm.createContext({getSiteAccount:()=>account,URL,Date,Event,location:{href:'https://fixture.test/chatgpt/',origin:'https://fixture.test',reload(){reloads++;}},history:{state:null,replaceState(){}},sessionStorage:{getItem:()=>null,setItem(){}},dispatchEvent(){}});
 const source=fs.readFileSync(new URL('../src/native-client/local-identity.mjs',import.meta.url),'utf8').replace(/^import .*;\r?$/gm,'').replace(/^export\s+/gm,'').replaceAll('import.meta.url',JSON.stringify('https://fixture.test/chatgpt/native-client/local-identity.mjs'));
 new vm.Script(source+'\nglobalThis.api={getPrototypeLocalAuth,clearPrototypeLocalSession};').runInContext(context);
 context.api.clearPrototypeLocalSession();assert.equal(reloads,0);assert.equal(context.api.getPrototypeLocalAuth().planType,'pro');
 account=null;assert.equal(context.api.getPrototypeLocalAuth(),null);
});
test('explicit primary authentication rejection falls back without changing the paid model or effort',async t=>{
 const calls=[];t.mock.method(globalThis,'fetch',async(url,options)=>{const payload=JSON.parse(options.body);calls.push({url:String(url),payload});return calls.length===1?Response.json({error:{code:'invalid_api_key',message:'Neutral rejected'}},{status:401}):Response.json({status:'completed',model:payload.model,reasoning:payload.reasoning,output:[{id:'neutral-answer',type:'message',role:'assistant',content:[{type:'output_text',text:'Neutral fallback'}]}]});});
 const providers=[{id:'primary',apiBase:'https://primary.fixture/v1',apiKey:'neutral-primary',supportedModels:['gpt-6-sol'],fallbackOnRejected:true},{id:'backup',apiBase:'https://backup.fixture',apiKey:'neutral-backup',supportedModels:['gpt-6-sol']}];
 const router=createProviderCompletionRouter({complete:streamCompletion,getProviders:()=>providers});
 const result=await router.complete({settings:{model:'gpt-6-sol',reasoningEffort:'high',reasoningMode:'standard',apiTransport:'responses'},messages:[{role:'user',content:'Neutral'}]});
 assert.equal(result.content,'Neutral fallback');assert.deepEqual(calls.map(c=>c.payload.model),['gpt-6-sol','gpt-6-sol']);assert(calls.every(c=>c.payload.reasoning.effort==='high'));assert.equal(calls[0].url,'https://primary.fixture/v1/responses');
});
test('configured standard compatibility uses Chat Completions with the exact selected GPT model',async t=>{
 let call;t.mock.method(globalThis,'fetch',async(url,options)=>{call={url:String(url),body:JSON.parse(options.body),headers:options.headers};return Response.json({model:call.body.model,choices:[{message:{role:'assistant',content:'Neutral OK'},finish_reason:'stop'}]});});
 const router=createProviderCompletionRouter({complete:streamCompletion,getProviders:()=>[{id:'primary',apiBase:'https://primary.fixture/v1',apiKey:'neutral',supportedModels:['gpt-6-sol'],standardTransport:'chat-completions',apiKeyHeader:'x-api-key'}]});
 assert.equal((await router.complete({settings:{model:'gpt-6-sol',reasoningEffort:'none',reasoningMode:'standard',apiTransport:'responses'},messages:[{role:'user',content:'Neutral'}]})).content,'Neutral OK');
 assert.equal(call.url,'https://primary.fixture/v1/chat/completions');assert.equal(call.body.model,'gpt-6-sol');assert.equal(call.body.reasoning_effort,'none');assert.equal(call.headers['x-api-key'],'neutral');assert.equal(call.headers.Authorization,undefined);
});
test('updating waits for click inactivity and never repeatedly navigates to the same candidate',async()=>{
 const old='1111111111111111',next='2222222222222222',events=new EventTarget(),store=new Map(),navigations=[];let clock=0;
 const options={currentRelease:old,baseURL:'https://fixture.test/chatgpt/',currentURL:()=> 'https://fixture.test/chatgpt/',navigate:url=>navigations.push(url),now:()=>clock,interactionQuietMs:30000,eventTarget:events,document:undefined,storage:{getItem:key=>store.get(key),setItem:(key,value)=>store.set(key,value)},fetchImpl:async url=>url.pathname.endsWith('active.json')?Response.json({active:true,release:next}):new Response(url.pathname.endsWith('index.html')?'<html data-native-client-release="'+next+'"><script src="native-client/bootstrap.mjs?v='+next+'"></script>':'const release="'+next+'";')};
 const updater=createReleaseUpdater(options).start();assert.equal(await updater.check(),false);clock=40000;events.dispatchEvent(new Event('pointerdown'));assert.equal(updater.applyIfSafe(),false);clock=71000;assert.equal(updater.applyIfSafe(),true);updater.stop();
 const again=createReleaseUpdater({...options,interactionQuietMs:0});assert.equal(await again.check(),false);assert.equal(navigations.length,1);again.stop();
});

const workerSource = fs.readFileSync(new URL('../native-client-worker.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/, '');
const workerURL = new URL('https://fixture.test/chatgpt/native-client-worker.js');

function workerFixture({ failure } = {}) {
  const handlers = new Map();
  const cached = new Map();
  const operations = { opens: [], reads: [], writes: [], requests: [] };
  let fetcher = async url => new Response('Network ' + url.pathname, {
    headers: { 'Content-Type': url.pathname.endsWith('/') ? 'text/html; charset=utf-8' : 'application/javascript' },
  });
  const context = vm.createContext({
    URL, Headers, Response,
    BrowserWorkspaceStore: class { async read() { return new TextEncoder().encode('Fixture private artifact'); } },
    workspacePath: path => path,
    self: { location: workerURL, addEventListener: (name, handler) => handlers.set(name, handler) },
    caches: {
      async open(name) {
        operations.opens.push(name);
        if (failure === 'open') throw Error('Fixture storage unavailable');
        if (!cached.has(name)) cached.set(name, new Map());
        const values = cached.get(name);
        return {
          async match(key) {
            operations.reads.push(String(key));
            if (failure === 'read') throw Error('Fixture cache read failure');
            return values.get(String(key))?.clone();
          },
          async put(key, response) {
            operations.writes.push(String(key));
            if (failure === 'write') throw Error('Fixture cache write failure');
            values.set(String(key), response.clone());
          },
        };
      },
    },
    async fetch(input) {
      const url = new URL(input.url ?? input, workerURL);
      operations.requests.push(url.href);
      return fetcher(url);
    },
  });
  new vm.Script(workerSource, { filename: 'generated native-client-worker.js' }).runInContext(context);
  const release = new vm.Script('SHELL_CACHE.slice("chatgpt-native-shell-".length)').runInContext(context);
  assert.match(release, /^[a-f0-9]{16}$/);
  return {
    operations,
    release,
    setFetch: value => { fetcher = value; },
    async dispatch(input, { mode = 'cors', headers, method = 'GET' } = {}) {
      const request = { url: new URL(input, workerURL).href, mode, method, headers: new Headers(headers) };
      let response;
      const lifetime = [];
      handlers.get('fetch')({ request, respondWith: value => { response = value; }, waitUntil: value => lifetime.push(value) });
      if (response === undefined) return undefined;
      const result = await response;
      await Promise.all(lifetime);
      return result;
    },
  };
}
const immutableChunk = 'original-client/public/chatgpt.com/cdn/assets/807489.36023b676b.js';

test('generated worker reuses release-pinned modules and direct hashed assets when the network is unavailable', async () => {
  const f = workerFixture();
  const paths = ['native-client/bootstrap.mjs?v=' + f.release, 'native-client/entry-plan.json?v=' + f.release,
    'runtime.js?v=' + f.release, immutableChunk];
  for (const path of paths) {
    const url = new URL(path, workerURL);
    const result = await f.dispatch(url);
    assert.equal(await result.text(), 'Network ' + url.pathname);
  }
  const fetched = paths.map(path => new URL(path, workerURL).href);
  assert.deepEqual(f.operations.requests, fetched);
  assert.deepEqual(f.operations.writes, fetched);
  f.setFetch(() => { throw new TypeError('Fixture network offline'); });
  for (const path of paths) {
    const url = new URL(path, workerURL);
    assert.equal(await (await f.dispatch(url)).text(), 'Network ' + url.pathname);
  }
  assert.deepEqual(f.operations.requests, fetched);
});

test('the generated worker leaves release checks, unrelated remote requests, and account data out of cache', async () => {
  const f = workerFixture();
  for (const [path, options] of [
    ['native-client/active.json?check=123'],
    ['native-client/active.json?v=' + f.release],
    ['native-client/active.json', { mode: 'navigate' }],
    ['native-client/bootstrap.mjs?v=' + f.release + '&check=123'],
    ['index.html?check_release=' + f.release + '&t=123'],
    ['native-client/bootstrap.mjs?v=' + (f.release === 'aaaaaaaaaaaaaaaa' ? 'bbbbbbbbbbbbbbbb' : 'aaaaaaaaaaaaaaaa')],
    [immutableChunk + '?check=123'],
    ['native-client/bootstrap.mjs?v=' + f.release, { headers: { Authorization: 'Bearer fixture-token' } }],
    [immutableChunk, { headers: { Range: 'bytes=0-15' } }],
    ['https://remote.fixture/chatgpt/native-client/bootstrap.mjs?v=' + f.release],
    ['https://remote.fixture/auth/session'],
    ['__codex-api/conversations'],
    ['__codex-api/conversations', { mode: 'navigate' }],
    ['backend-api/conversation/fixture'],
    ['api/auth/session'],
  ]) {
    assert.equal(await f.dispatch(path, options), undefined, new URL(path, workerURL).href);
  }
  const artifact = await f.dispatch('__local_artifacts/fixture/report.txt');
  assert.equal(artifact.headers.get('Cache-Control'), 'private,no-store');
  assert.equal(await artifact.text(), 'Fixture private artifact');
  assert.deepEqual(f.operations.opens, []);
  assert.deepEqual(f.operations.writes, []);
  assert.deepEqual(f.operations.requests, []);
});

test('generated worker caches a successful HTML navigation and leaves JSON navigation responses off disk', async () => {
  const f = workerFixture();
  const root = await f.dispatch('./', { mode: 'navigate' });
  assert.match(root.headers.get('Content-Type'), /^text\/html\b/);
  const shell = new URL('index.html', workerURL).href;
  assert.deepEqual(f.operations.writes, [shell]);
  f.setFetch(async () => Response.json({ data: 'Fixture JSON response' }));
  const json = await f.dispatch('unexpected-response', { mode: 'navigate' });
  assert.deepEqual(await json.json(), { data: 'Fixture JSON response' });
  assert.deepEqual(f.operations.writes, [shell]);
  f.setFetch(() => { throw new TypeError('Fixture network offline'); });
  const offline = await f.dispatch('./', { mode: 'navigate' });
  assert.match(offline.headers.get('Content-Type'), /^text\/html\b/);
  assert.equal(await offline.text(), 'Network /chatgpt/');
});

test('generated worker returns fetched HTML and scripts despite rejected cache opens, reads or writes', async t => {
  for (const failure of ['open', 'read', 'write']) {
    await t.test(failure, async () => {
      const f = workerFixture({ failure });
      for (const [path, mode, responsePath] of [
        ['/cdn/assets/neutral.js', 'cors', '/chatgpt/original-client/public/chatgpt.com/cdn/assets/neutral.js'],
        ['./', 'navigate', '/chatgpt/'],
        ['native-client/bootstrap.mjs?v=' + f.release, 'cors', '/chatgpt/native-client/bootstrap.mjs'],
        [immutableChunk, 'cors', '/chatgpt/' + immutableChunk],
      ]) {
        const response = await f.dispatch(path, { mode });
        assert.equal(await response.text(), 'Network ' + responsePath);
      }
      assert.equal(f.operations.requests.length, 4);
      assert(f.operations[{ open: 'opens', read: 'reads', write: 'writes' }[failure]].length > 0);
    });
  }
});

test('the service worker retries a transient static asset response once without reissuing API requests', async () => {
  const f = workerFixture();
  let requests = 0;
  f.setFetch(() => ++requests === 1 ? new Response('', { status: 503 }) : Response.json({ value: 'ready' }));
  const asset = 'native-client/entry-plan.json?v=' + f.release;
  const response = await f.dispatch(asset);
  assert.deepEqual(await response.json(), { value: 'ready' });
  assert.equal(requests, 2);
  await f.dispatch(asset);
  assert.equal(requests, 2);
  assert.equal(await f.dispatch('api/auth/session'), undefined);
});
