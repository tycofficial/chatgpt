
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../src/native-client/boot-adapter.mjs',import.meta.url),'utf8');
const a=source.indexOf('function overrideExports('),b=source.indexOf('// Only the map renderer',a);
assert(a>=0&&b>a);
function run({getter=false,options,wrap=false}={}){
 let capturedOptions,transformed;
 const original=value=>'original:'+value;
 const factory=(module,exports,require)=>require.d(exports,getter?{read:()=>original}:{},getter?{}:{read:original,other:7});
 const context=vm.createContext({adaptFactory(_id,transform,givenOptions){capturedOptions=givenOptions;transformed=transform(factory);}});
 new vm.Script(source.slice(a,b)+'\nglobalThis.fixtureOverride=overrideExports;').runInContext(context);
 context.fixtureOverride('fixture',{added:9},options,wrap?{read:reader=>value=>'wrapped:'+reader(value)}:{});
 const require=()=>{};require.d=(exports,getters={},values={})=>{for(const[key,get]of Object.entries(getters))Object.defineProperty(exports,key,{get,enumerable:true});for(const[key,value]of Object.entries(values))Object.defineProperty(exports,key,{value,enumerable:true});};
 const module={exports:{}};transformed(module,module.exports,require);
 return{exports:module.exports,capturedOptions};
}
test('boot export wrappers preserve the third deferred-loader options argument',()=>{const options={deferred:true},result=run({options});assert.strictEqual(result.capturedOptions,options);assert.equal(result.exports.read('fixture'),'original:fixture');assert.equal(result.exports.added,9);});
test('boot export wrappers retain original getter/value exports and wrap only the requested reader',()=>{for(const getter of [false,true]){const result=run({getter,wrap:true});assert.equal(result.exports.read('fixture'),'wrapped:original:fixture');assert.equal(result.exports.added,9);if(!getter)assert.equal(result.exports.other,7);}});
