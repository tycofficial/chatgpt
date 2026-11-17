import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalHostSettingsClass} from '../src/native-client/local-host-settings.mjs';

// The public host-settings schema admits Max as well as Ultra; its historical
// default omitted Max. Verify the persisted upgrade through the settings API.
const key='original-client-prototype-host-settings:v1';
const efforts=['none','minimal','low','medium','high','xhigh','max','ultra','persistent'];
function settingsFixture(initial,paid=true){
 const store=new Map(initial?[[key,JSON.stringify(initial)]]:[]);
 globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
 const defs=[{key:'enabled-reasoning-efforts',default:['low','medium','high','xhigh','ultra','persistent']},{key:'show-ultra-in-model-picker-slider',default:false}];
 const parse=(k,v)=>{assert(k===defs[0].key?Array.isArray(v)&&v.every(e=>efforts.includes(e)):typeof v==='boolean');return v;};
 const api={canSelectModels:()=>paid,settings:{Od:defs,lf:{externalBrowserLinkShortcut:{key:'unavailable'}},lh:k=>defs.find(d=>d.key===k),Ij:parse,mh:k=>({parse:v=>parse(k,v)}),uh:()=>[]},browser:{a:()=>null,b:def=>def.default},cookie:{},cookieValue:{}};
 return{Class:createLocalHostSettingsClass(class{},api),store};
}
test('paid persisted host settings gain Max and Ultra once, through reload and write',async()=>{
 const f=settingsFixture({'enabled-reasoning-efforts':['none','low','medium','high','xhigh'],'show-ultra-in-model-picker-slider':false});
 const first=new f.Class();
 assert.deepEqual((await first.read('enabled-reasoning-efforts')).effective,['low','medium','high','xhigh','max','ultra']);
 assert.equal((await first.read('show-ultra-in-model-picker-slider')).effective,true);
 assert.equal(JSON.parse(f.store.get(key))['site-model-slider-version'],2);
 await first.write('show-ultra-in-model-picker-slider',false);
 await first.write('enabled-reasoning-efforts',['low','medium','high','max']);
 const reload=new f.Class();
 assert.equal((await reload.read('show-ultra-in-model-picker-slider')).effective,false);
 assert.deepEqual((await reload.read('enabled-reasoning-efforts')).effective,['low','medium','high','max']);
});
test('Free does not activate the paid slider migration or mutate its stored preferences',async()=>{
 const initial={'enabled-reasoning-efforts':['low','medium']},f=settingsFixture(initial,false);
 const all=await new f.Class().readAll();
 assert.deepEqual(all.values['enabled-reasoning-efforts'],['low','medium']);
 assert.deepEqual(JSON.parse(f.store.get(key)),initial);
});
