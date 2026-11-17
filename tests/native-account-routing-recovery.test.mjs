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
 let account={id:'site-admin',role:'administrator',planType:'pro',username:'TYC',createdAt:1};
 const context=vm.createContext({getSiteAccount:()=>account,URL,Date,Event,location:{href:'https://fixture.test/chatgpt/',origin:'https://fixture.test',reload(){}},history:{state:null,replaceState(){}},sessionStorage:{getItem:()=>null,setItem(){}},dispatchEvent(){}});
 const source=fs.readFileSync(new URL('../src/native-client/local-identity.mjs',import.meta.url),'utf8').replace(/^import .*;\r?$/gm,'').replace(/^export\s+/gm,'').replaceAll('import.meta.url',JSON.stringify('https://fixture.test/chatgpt/native-client/local-identity.mjs'));
 new vm.Script(source+'\nglobalThis.api={getPrototypeLocalAuth,clearPrototypeLocalSession};').runInContext(context);
 context.api.clearPrototypeLocalSession({reload:false});assert.equal(context.api.getPrototypeLocalAuth().planType,'pro');
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
 let call;t.mock.method(globalThis,'fetch',async(url,options)=>{call={url:String(url),body:JSON.parse(options.body)};return Response.json({model:call.body.model,choices:[{message:{role:'assistant',content:'Neutral OK'},finish_reason:'stop'}]});});
 const router=createProviderCompletionRouter({complete:streamCompletion,getProviders:()=>[{id:'primary',apiBase:'https://primary.fixture/v1',apiKey:'neutral',supportedModels:['gpt-6-sol'],standardTransport:'chat-completions'}]});
 assert.equal((await router.complete({settings:{model:'gpt-6-sol',reasoningEffort:'none',reasoningMode:'standard',apiTransport:'responses'},messages:[{role:'user',content:'Neutral'}]})).content,'Neutral OK');
 assert.equal(call.url,'https://primary.fixture/v1/chat/completions');assert.equal(call.body.model,'gpt-6-sol');assert.equal(call.body.reasoning_effort,'none');
});
test('updating waits for click inactivity and never repeatedly navigates to the same candidate',async()=>{
 const old='1111111111111111',next='2222222222222222',events=new EventTarget(),store=new Map(),navigations=[];let clock=0;
 const options={currentRelease:old,baseURL:'https://fixture.test/chatgpt/',currentURL:()=> 'https://fixture.test/chatgpt/',navigate:url=>navigations.push(url),now:()=>clock,interactionQuietMs:30000,eventTarget:events,document:undefined,storage:{getItem:key=>store.get(key),setItem:(key,value)=>store.set(key,value)},fetchImpl:async url=>url.pathname.endsWith('active.json')?Response.json({active:true,release:next}):new Response(url.pathname.endsWith('index.html')?'<html data-native-client-release="'+next+'"><script src="native-client/bootstrap.mjs?v='+next+'"></script>':'const release="'+next+'";')};
 const updater=createReleaseUpdater(options).start();assert.equal(await updater.check(),false);clock=40000;events.dispatchEvent(new Event('pointerdown'));assert.equal(updater.applyIfSafe(),false);clock=71000;assert.equal(updater.applyIfSafe(),true);updater.stop();
 const again=createReleaseUpdater({...options,interactionQuietMs:0});assert.equal(await again.check(),false);assert.equal(navigations.length,1);again.stop();
});
test('generated worker returns fetched HTML and scripts even when browser caching fails',async()=>{
 const source=fs.readFileSync(new URL('../native-client-worker.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/,'');
 for(const failOpen of [false,true]){
  const handlers={},context=vm.createContext({URL,Headers,Response,BrowserWorkspaceStore:class{},workspacePath:x=>x,self:{location:{href:'https://fixture.test/chatgpt/native-client-worker.js',origin:'https://fixture.test'},addEventListener:(name,fn)=>handlers[name]=fn},caches:{open:async()=>{if(failOpen)throw Error('Storage denied');return{match:async()=>null,put:async()=>{throw Error('Quota exceeded');}};}},fetch:async()=>new Response('Neutral fetched bytes',{status:200})});
  new vm.Script(source).runInContext(context);
  for(const [url,mode]of[['https://fixture.test/cdn/assets/neutral.js','cors'],['https://fixture.test/chatgpt/','navigate']]){let response;handlers.fetch({request:{url,mode,method:'GET'},respondWith:value=>response=value});assert.equal(await(await response).text(),'Neutral fetched bytes');}
 }
});
