import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedReasoningEfforts, streamCompletion} from '../runtime.js';
import {searchWeb} from '../web.js';

const settings={apiBase:'https://provider.example/v1',apiKey:'test-only-key',model:'gpt-6.1-sol'};
const efforts=['low','medium','high','xhigh','max'];
const chatResponse=()=>Response.json({choices:[{message:{role:'assistant',content:'OK'},finish_reason:'stop'}]});
const webResponse=()=>Response.json({output:[{type:'web_search_call'},{type:'message',content:[{type:'output_text',text:'Verified result'}]}]});

test('capability list covers only the documented exact model and cannot be mutated by a caller',()=>{
  assert.deepEqual(allowedReasoningEfforts('gpt-6.1-sol'),efforts);
  const copy=allowedReasoningEfforts('gpt-6.1-sol');copy.length=0;
  assert.deepEqual(allowedReasoningEfforts('gpt-6.1-sol'),efforts);
  for(const model of ['gpt-6.1-sol-xhigh','gpt-6.1-sol-unknown','auto','other-model','toString',undefined])assert.deepEqual(allowedReasoningEfforts(model),[]);
});

test('all supported selections reach the serialized Chat Completions reasoning_effort field',async t=>{
  const requests=[];
  t.mock.method(globalThis,'fetch',async(url,options)=>{requests.push({url,body:JSON.parse(options.body)});return chatResponse();});
  for(const effort of efforts)await streamCompletion({settings:{...settings,reasoningEffort:effort},messages:[{role:'user',content:'question'}]});
  assert.deepEqual(requests.map(x=>x.body.reasoning_effort),efforts);
  assert.ok(requests.every(x=>x.url==='https://provider.example/v1/chat/completions'&&x.body.model===settings.model&&x.body.stream===true));
  assert.ok(requests.every(x=>!Object.hasOwn(x.body,'reasoning')));
});

test('missing effort leaves the upstream default untouched and unknown model effort is not injected',async t=>{
  const bodies=[];
  t.mock.method(globalThis,'fetch',async(_url,options)=>{bodies.push(JSON.parse(options.body));return chatResponse();});
  for(const effort of [undefined,null,''])await streamCompletion({settings:{...settings,reasoningEffort:effort},messages:[]});
  await streamCompletion({settings:{...settings,model:'unknown-model',reasoningEffort:'max',temperature:0.4},messages:[]});
  assert.ok(bodies.every(body=>!Object.hasOwn(body,'reasoning_effort')));
  assert.equal(bodies.at(-1).temperature,0.4);
});

test('unsupported known-model selections fail before making any API request',async t=>{
  let requests=0;
  t.mock.method(globalThis,'fetch',async()=>{requests++;return chatResponse();});
  for(const effort of ['none','minimal','ultra','HIGH',0])await assert.rejects(streamCompletion({settings:{...settings,reasoningEffort:effort},messages:[]}),/不支持思考等级/);
  assert.equal(requests,0);
});

test('the verified model never sends incompatible temperature, even when effort is left at its default',async t=>{
  const bodies=[];
  t.mock.method(globalThis,'fetch',async(_url,options)=>{bodies.push(JSON.parse(options.body));return chatResponse();});
  for(const effort of [undefined,'high'])await streamCompletion({settings:{...settings,reasoningEffort:effort,temperature:0.5},messages:[]});
  assert.ok(bodies.every(body=>!Object.hasOwn(body,'temperature')));
});

test('search serializes every supported selection into Responses reasoning.effort',async t=>{
  const requests=[];
  t.mock.method(globalThis,'fetch',async(url,options)=>{requests.push({url,body:JSON.parse(options.body)});return webResponse();});
  for(const effort of efforts)await searchWeb({...settings,reasoningEffort:effort},'question');
  assert.deepEqual(requests.map(x=>x.body.reasoning),efforts.map(effort=>({effort})));
  assert.ok(requests.every(x=>x.url==='https://provider.example/v1/responses'&&x.body.tools[0].type==='web_search'));
  assert.ok(requests.every(x=>!Object.hasOwn(x.body,'reasoning_effort')));
});

test('search omits effort for defaults and unknown models, and rejects invalid known selections before fetch',async t=>{
  const bodies=[];
  t.mock.method(globalThis,'fetch',async(_url,options)=>{bodies.push(JSON.parse(options.body));return webResponse();});
  await searchWeb(settings,'question');
  await searchWeb({...settings,model:'unknown-model',reasoningEffort:'max'},'question');
  assert.ok(bodies.every(body=>!Object.hasOwn(body,'reasoning')));
  await assert.rejects(searchWeb({...settings,reasoningEffort:'none'},'question'),/不支持思考等级/);
  assert.equal(bodies.length,2);
});
