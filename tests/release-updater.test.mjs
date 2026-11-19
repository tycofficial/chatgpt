import test from 'node:test';import assert from 'node:assert/strict';import {parseHTML} from 'linkedom/worker';import {createReleaseUpdater,composerHasDraft} from '../release-updater.js';
const old='1111111111111111',next='2222222222222222';
function fixture({busy=false,draft=false,staleHTML=false,unavailable=false,currentURL='https://fixture.test/chatgpt/c/neutral?setting=kept#section'}={}){const navigations=[],requests=[],saved=new Map();const state={busy,draft};const updater=createReleaseUpdater({currentRelease:old,baseURL:'https://fixture.test/chatgpt/',currentURL:()=>currentURL,navigate:url=>navigations.push(url),isBusy:()=>state.busy,hasDraft:()=>state.draft,storage:{getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value)},fetchImpl:async(url,options)=>{requests.push({url:String(url),options});if(unavailable)throw Error('offline');if(url.pathname.endsWith('active.json'))return Response.json({active:true,release:next});if(url.pathname.endsWith('index.html'))return new Response('<html data-native-client-release="'+(staleHTML?old:next)+'"><script src="/chatgpt/native-client/bootstrap.mjs?v='+next+'"></script>');return new Response('export const release="'+next+'";');}});return{updater,navigations,requests,state};}
test('coherent public HTML and bootstrap update the actual route once without losing query or hash',async()=>{const f=fixture();assert.equal(await f.updater.check(),true);assert.equal(await f.updater.check(),false);assert.equal(f.navigations.length,1);const target=new URL(f.navigations[0]);assert.equal(target.pathname,'/chatgpt/c/neutral');assert.equal(target.searchParams.get('setting'),'kept');assert.equal(target.searchParams.get('__native_release'),next);assert.equal(target.hash,'#section');assert.equal(f.requests.every(request=>request.options.cache==='no-store'&&request.options.credentials==='omit'),true);f.updater.stop();});
test('a published manifest with stale HTML never causes a false update or reload loop',async()=>{const f=fixture({staleHTML:true});assert.equal(await f.updater.check(),false);assert.equal(f.navigations.length,0);assert.equal(f.updater.getState().status,'retry-later');f.updater.stop();});
test('active generation and unsent text defer a ready update until both are safe',async()=>{const f=fixture({busy:true,draft:true});assert.equal(await f.updater.check(),false);assert.equal(f.updater.getState().status,'deferred');f.state.busy=false;assert.equal(f.updater.applyIfSafe(),false);f.state.draft=false;assert.equal(f.updater.applyIfSafe(),true);assert.equal(f.navigations.length,1);f.updater.stop();});
test('an offline version check keeps the usable page intact',async()=>{const f=fixture({unavailable:true});assert.equal(await f.updater.check(),false);assert.equal(f.navigations.length,0);f.updater.stop();});
test('a fetch implementation that ignores abort cannot stall the release check',async()=>{let signal;const updater=createReleaseUpdater({currentRelease:old,baseURL:'https://fixture.test/chatgpt/',requestTimeoutMs:5,document:undefined,storage:{getItem:()=>null,setItem(){}},fetchImpl:(_url,options)=>{signal=options.signal;return new Promise(()=>{});}});const result=await Promise.race([updater.check(),new Promise((_,reject)=>setTimeout(()=>reject(Error('The release check exceeded its deadline')),100))]);assert.equal(result,false);assert.equal(signal.aborted,true);assert.equal(updater.getState().status,'retry-later');assert.match(updater.getState().error,/timed out/);updater.stop();});
test('the original router bare repository URL upgrades while preserving the conversation query',async()=>{const f=fixture({currentURL:'https://fixture.test/chatgpt?mode=work#kept'});assert.equal(await f.updater.check(),true);const target=new URL(f.navigations[0]);assert.equal(target.pathname,'/chatgpt/');assert.equal(target.searchParams.get('mode'),'work');assert.equal(target.hash,'#kept');f.updater.stop();});
test('a different application path cannot be reloaded by this updater',async()=>{const f=fixture({currentURL:'https://fixture.test/chatgpt-other/c/neutral'});assert.equal(await f.updater.check(),false);assert.equal(f.navigations.length,0);f.updater.stop();});

test('an attachment-only original composer defers release navigation until the pending file is removed',async()=>{
  const {document}=parseHTML('<html><body><section data-composer-body><div contenteditable="true"></div><div data-composer-attachments data-visible-attachments=""><div data-neutral-file-card><span>neutral.txt</span><button type="button"></button></div></div></section></body></html>');
  const f=fixture();f.state.draft=composerHasDraft(document);
  assert.equal(f.state.draft,true);assert.equal(await f.updater.check(),false);assert.equal(f.navigations.length,0);
  document.querySelector('[data-neutral-file-card]').remove();f.state.draft=composerHasDraft(document);
  assert.equal(f.state.draft,false);assert.equal(f.updater.applyIfSafe(),true);assert.equal(f.navigations.length,1);f.updater.stop();
});

test('history files and composers retained inside hidden React Activity do not block a safe update',()=>{
  const {document}=parseHTML('<html><body><article><button>neutral.txt</button></article><div style="display:none"><section data-composer-body><textarea>retained old mode</textarea><div data-composer-attachments data-visible-attachments=""><div><button>old.txt</button></div></div></section></div><section data-composer-body><div contenteditable="true"></div><div data-composer-attachments><div><button>stale.txt</button></div></div></section></body></html>');
  assert.equal(composerHasDraft(document),false);
  document.querySelector('[style]').style.display='';assert.equal(composerHasDraft(document),true);
});

test('release navigation waits until an input method composition has ended',async()=>{
  const events=new EventTarget(),navigations=[],store=new Map();
  const updater=createReleaseUpdater({currentRelease:old,baseURL:'https://fixture.test/chatgpt/',currentURL:()=> 'https://fixture.test/chatgpt/',navigate:url=>navigations.push(url),eventTarget:events,document:undefined,storage:{getItem:key=>store.get(key),setItem:(key,value)=>store.set(key,value)},fetchImpl:async url=>url.pathname.endsWith('active.json')?Response.json({active:true,release:next}):new Response(url.pathname.endsWith('index.html')?'<html data-native-client-release="'+next+'"><script src="native-client/bootstrap.mjs?v='+next+'"></script>':'const release="'+next+'";')}).start();
  events.dispatchEvent(new Event('compositionstart'));
  assert.equal(await updater.check(),false);
  assert.equal(updater.getState().status,'deferred');
  assert.equal(navigations.length,0);
  events.dispatchEvent(new Event('compositionend'));
  assert.equal(updater.applyIfSafe(),true);
  assert.equal(navigations.length,1);
  updater.stop();
});
