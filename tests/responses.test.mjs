import test from 'node:test';
import assert from 'node:assert/strict';
import {streamCompletion,toResponsesInput,toResponsesTools,PYTHON_TOOL} from '../runtime.js';

const settings={apiBase:'https://provider.example/v1',apiKey:'test-only-key',model:'gpt-6.1-sol',apiTransport:'responses',reasoningEffort:'medium',reasoningMode:'standard'};
function eventsResponse(events,size=7){
  const bytes=new TextEncoder().encode(events.map(event=>`event: ${event.type}\r\ndata: ${JSON.stringify(event)}\r\n\r\n`).join(''));
  return new Response(new ReadableStream({start(controller){for(let i=0;i<bytes.length;i+=size)controller.enqueue(bytes.slice(i,i+size));controller.close();}}),{headers:{'content-type':'text/event-stream'}});
}
const textItem=(text,id='msg_1')=>({type:'message',id,role:'assistant',status:'completed',content:[{type:'output_text',text,annotations:[]}]});
const completed=(output,reasoning={effort:'medium',mode:'standard'})=>({id:'resp_1',model:settings.model,status:'completed',reasoning,output});

test('Responses conversion preserves images and separates function call/output using call_id',()=>{
  const input=toResponsesInput([{role:'system',content:'instructions'},{role:'user',content:[{type:'text',text:'look'},{type:'image_url',image_url:{url:'data:image/png;base64,aA==',detail:'low'}}]},{role:'assistant',content:null,tool_calls:[{id:'call_1',type:'function',function:{name:'python',arguments:'{"code":"6*7"}'}}]},{role:'tool',tool_call_id:'call_1',content:'42'}]);
  assert.deepEqual(input,[{role:'system',content:'instructions'},{role:'user',content:[{type:'input_text',text:'look'},{type:'input_image',image_url:'data:image/png;base64,aA==',detail:'low'}]},{type:'function_call',call_id:'call_1',name:'python',arguments:'{"code":"6*7"}'},{type:'function_call_output',call_id:'call_1',output:'42'}]);
  const tools=toResponsesTools([PYTHON_TOOL,{type:'web_search'}]);
  assert.equal(tools[0].name,'python');assert.equal(tools[0].parameters.type,'object');assert.ok(!Object.hasOwn(tools[0],'function'));assert.deepEqual(tools[1],{type:'web_search'});
});

test('Responses SSE decodes split Chinese and does not duplicate completed output text',async t=>{
  let request;const deltas=[];
  t.mock.method(globalThis,'fetch',async(url,options)=>{request={url,body:JSON.parse(options.body)};return eventsResponse([
    {type:'response.output_text.delta',output_index:1,content_index:0,item_id:'msg_1',delta:'你好'},
    {type:'response.output_text.delta',output_index:1,content_index:0,item_id:'msg_1',delta:'，世界'},
    {type:'response.output_text.done',output_index:1,content_index:0,item_id:'msg_1',text:'你好，世界'},
    {type:'response.completed',response:completed([{type:'reasoning',id:'rs_1',summary:[],encrypted_content:'cipher'},textItem('你好，世界')])},
  ],1);});
  const result=await streamCompletion({settings,messages:[{role:'user',content:'hello'}],onDelta:(delta,value)=>deltas.push([delta,value.content])});
  assert.equal(request.url,'https://provider.example/v1/responses');assert.equal(request.body.store,false);assert.deepEqual(request.body.reasoning,{effort:'medium',mode:'standard'});assert.deepEqual(request.body.include,['reasoning.encrypted_content']);
  assert.equal(result.content,'你好，世界');assert.deepEqual(deltas.map(x=>x[0]),['你好','，世界']);assert.equal(result.response_items[0].encrypted_content,'cipher');assert.equal(result.finish_reason,'stop');
});

test('Responses exposes actual commentary before its first text delta and preserves its phase on follow-up',async t=>{
  const commentary={...textItem('Working on the actual task.'),phase:'commentary'},final={...textItem('Completed.','msg_2'),phase:'final_answer'};
  const requests=[],deltas=[];
  t.mock.method(globalThis,'fetch',async(_url,options)=>{
    requests.push(JSON.parse(options.body));
    const item=requests.length===1?commentary:final;
    return eventsResponse([{type:'response.output_item.added',output_index:0,item:{...item,status:'in_progress',content:[]}},{type:'response.output_text.delta',output_index:0,content_index:0,item_id:item.id,delta:item.content[0].text},{type:'response.completed',response:completed([item])}]);
  });
  const first=await streamCompletion({settings,messages:[{role:'user',content:'Do the task.'}],onDelta:(text,value)=>deltas.push({text,phase:value.phase})});
  assert.equal(deltas[0].phase,'commentary');assert.equal(first.phase,'commentary');assert.equal(first.response_items[0].phase,'commentary');
  const next=await streamCompletion({settings,messages:[{role:'user',content:'Do the task.'},first]});
  assert.equal(requests[1].input.at(-1).phase,'commentary');assert.equal(next.phase,'final_answer');
  assert.deepEqual(toResponsesInput([{role:'assistant',content:'Retained progress without complete raw items.',phase:'commentary'}]),[{role:'assistant',content:'Retained progress without complete raw items.',phase:'commentary'}]);
});

test('a later phase-unknown assistant message does not inherit an earlier commentary phase',async t=>{
  t.mock.method(globalThis,'fetch',async()=>Response.json(completed([{...textItem('Progress.','msg_progress'),phase:'commentary'},textItem('Legacy completed answer.','msg_legacy')])));
  const result=await streamCompletion({settings,messages:[]});assert.equal(result.phase,undefined);assert.equal(result.response_items[1].phase,undefined);assert.equal(result.finish_reason,'stop');
});

test('EOF and DONE without an actual response terminal event reject complete-looking tool calls',async t=>{
  const item={type:'function_call',id:'fc_unconfirmed',call_id:'call_unconfirmed',name:'python',arguments:'{"code":"6*7"}',status:'completed'};
  for(const withDone of [false,true]){
    const wire='data: '+JSON.stringify({type:'response.output_item.done',output_index:0,item})+'\n\n'+(withDone?'data: [DONE]\n\n':'');
    const transport=async()=>new Response(wire,{headers:{'Content-Type':'text/event-stream'}});
    await assert.rejects(streamCompletion({settings,messages:[],tools:[PYTHON_TOOL],responsesTransport:transport}),error=>error.code==='INCOMPLETE_RESPONSE_STREAM'&&error.retryable===false);
  }
});

test('Responses SSE assembles fragmented parallel function calls without duplicating final arguments',async t=>{
  const first={type:'function_call',id:'fc_1',call_id:'call_1',name:'python',arguments:'{"code":"6*7"}',status:'completed'};
  const second={type:'function_call',id:'fc_2',call_id:'call_2',name:'create_file',arguments:'{"name":"a.txt","content":"x"}',status:'completed'};
  t.mock.method(globalThis,'fetch',async()=>eventsResponse([
    {type:'response.output_item.added',output_index:1,item:{...first,arguments:'',status:'in_progress'}},
    {type:'response.output_item.added',output_index:2,item:{...second,arguments:'',status:'in_progress'}},
    {type:'response.function_call_arguments.delta',output_index:1,item_id:'fc_1',delta:'{"co'},
    {type:'response.function_call_arguments.delta',output_index:2,item_id:'fc_2',delta:'{"name":"a.txt",'},
    {type:'response.function_call_arguments.delta',output_index:1,item_id:'fc_1',delta:'de":"6*7"}'},
    {type:'response.function_call_arguments.done',output_index:1,item_id:'fc_1',arguments:first.arguments},
    {type:'response.output_item.done',output_index:1,item:first},
    {type:'response.output_item.done',output_index:2,item:second},
    {type:'response.completed',response:completed([{type:'reasoning',id:'rs_1',summary:[],encrypted_content:'cipher'},first,second])},
  ]));
  const result=await streamCompletion({settings,messages:[],tools:[PYTHON_TOOL]});
  assert.equal(result.tool_calls.length,2);assert.equal(result.tool_calls[0].id,'call_1');assert.equal(result.tool_calls[1].id,'call_2');assert.equal(result.tool_calls[0].function.arguments,first.arguments);assert.equal(result.tool_calls[1].function.arguments,second.arguments);assert.equal(result.finish_reason,'tool_calls');
});

test('stateless JSON fallback roundtrip preserves encrypted reasoning and original function identifiers',async t=>{
  const output=[{type:'reasoning',id:'rs_1',summary:[],encrypted_content:'cipher'},{type:'function_call',id:'fc_item',call_id:'call_execute',name:'python',arguments:'{"code":"6*7"}',status:'completed'}];
  const requests=[];
  t.mock.method(globalThis,'fetch',async(_url,options)=>{requests.push(JSON.parse(options.body));return Response.json(completed(requests.length===1?output:[textItem('42')]));});
  const messages=[{role:'user',content:'calculate 6*7'}];
  const first=await streamCompletion({settings,messages,tools:[PYTHON_TOOL]});
  messages.push({...first},{role:'tool',tool_call_id:first.tool_calls[0].id,content:'42'});
  const final=await streamCompletion({settings,messages,tools:[PYTHON_TOOL]});
  assert.equal(final.content,'42');assert.deepEqual(requests[1].input.slice(1,3),output);assert.deepEqual(requests[1].input.at(-1),{type:'function_call_output',call_id:'call_execute',output:'42'});assert.equal(requests[1].input.filter(x=>x.type==='function_call').length,1);
});

test('Responses errors and silent reasoning downgrades remain visible errors',async t=>{
  const mock=t.mock.method(globalThis,'fetch',async()=>eventsResponse([{type:'response.failed',response:{error:{message:'Upstream failed'}}}]));
  await assert.rejects(streamCompletion({settings,messages:[]}),/Upstream failed/);
  mock.mock.mockImplementation(async()=>eventsResponse([{type:'error',message:'Stream rejected'}]));
  await assert.rejects(streamCompletion({settings,messages:[]}),/Stream rejected/);
  mock.mock.mockImplementation(async()=>Response.json(completed([textItem('answer')],{effort:'low',mode:'standard'})));
  await assert.rejects(streamCompletion({settings,messages:[]}),/未采用请求的思考等级/);
  mock.mock.mockImplementation(async()=>Response.json(completed([textItem('answer')])));
  await assert.rejects(streamCompletion({settings:{...settings,reasoningMode:'pro'},messages:[]}),/未启用请求的原生 Pro/);
});

test('Pro explicitly selects Responses and malformed function results are rejected before the app loop',async t=>{
  let url;
  t.mock.method(globalThis,'fetch',async(nextUrl)=>{url=nextUrl;return Response.json(completed([{type:'function_call',id:'item_without_call_id',name:'python',arguments:'{}'}],{effort:'medium',mode:'pro'}));});
  await assert.rejects(streamCompletion({settings:{...settings,apiTransport:undefined,reasoningMode:'pro'},messages:[]}),/缺少 call_id/);assert.equal(url,'https://provider.example/v1/responses');
});

test('Chat compatibility never sends local Responses history metadata to the upstream Chat API',async t=>{
  let body;
  t.mock.method(globalThis,'fetch',async(_url,options)=>{body=JSON.parse(options.body);return Response.json({choices:[{message:{role:'assistant',content:'OK'}}]});});
  await streamCompletion({settings:{...settings,apiTransport:undefined},messages:[{role:'assistant',content:'prior',phase:'commentary',response_items:[{type:'reasoning',encrypted_content:'cipher'}]}]});
  assert.deepEqual(body.messages,[{role:'assistant',content:'prior'}]);
});

test('a quota failure inside HTTP200 SSE preserves actual code, parameter and request ID without becoming retryable',async t=>{
  t.mock.method(globalThis,'fetch',async()=>eventsResponse([{type:'response.failed',request_id:'request_fixture',response:{status:'failed',error:{code:'subscription_sharing_usage_limit_exceeded',message:'Actual fixture plan limit',param:'model'}}}]));
  await assert.rejects(streamCompletion({settings,messages:[]}),error=>{
    assert.equal(error.code,'SUBSCRIPTION_QUOTA_EXHAUSTED');assert.equal(error.providerCode,'subscription_sharing_usage_limit_exceeded');assert.equal(error.transportStatus,200);assert.equal(error.status,undefined);assert.equal(error.param,'model');assert.equal(error.requestId,'request_fixture');assert.equal(error.retryable,false);assert.match(error.message,/ChatGPT 订阅额度/);return true;
  });
});

test('HTTP quota errors retain provider details and distinguish API balance from subscription usage',async t=>{
  t.mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify({error:{code:'insufficient_quota',message:'Fixture API credits exhausted',param:'account'}}),{status:429,headers:{'Content-Type':'application/json','x-request-id':'http_fixture'}}));
  await assert.rejects(streamCompletion({settings,messages:[]}),error=>{assert.equal(error.code,'API_QUOTA_EXHAUSTED');assert.equal(error.providerCode,'insufficient_quota');assert.equal(error.status,429);assert.equal(error.param,'account');assert.equal(error.requestId,'http_fixture');assert.equal(error.retryable,false);return true;});
});

test('an optional raw Responses transport uses the existing codec and receives no gateway credentials',async t=>{
  let received;const calls=[];
  t.mock.method(globalThis,'fetch',async()=>{throw Error('The gateway must not run for an accepted custom response');});
  const result=await streamCompletion({settings:{...settings,apiKey:'fixture-private-key'},messages:[{role:'user',content:'neutral transport fixture'}],responsesTransport:async(payload,options)=>{received=payload;assert.equal(typeof options.fallbackResponses,'function');assert.equal(JSON.stringify(payload).includes('fixture-private-key'),false);return eventsResponse([{type:'response.output_text.delta',output_index:0,delta:'transport fixture'}, {type:'response.completed',response:completed([textItem('transport fixture')])}]);},onDelta:delta=>calls.push(delta)});
  assert.equal(received.model,settings.model);assert.equal(received.store,false);assert.equal(result.content,'transport fixture');assert.equal(calls.join(''),'transport fixture');
});

test('custom transport fallback invokes the ordinary authorized Responses request exactly once',async t=>{
  let requests=0;
  t.mock.method(globalThis,'fetch',async(url,options)=>{requests++;assert.equal(url,'https://provider.example/v1/responses');assert.equal(options.headers.Authorization,'Bearer fixture-key');return Response.json(completed([textItem('fallback fixture')]));});
  const result=await streamCompletion({settings:{...settings,apiKey:'fixture-key'},messages:[],responsesTransport:(_payload,{fallbackResponses})=>fallbackResponses()});assert.equal(result.content,'fallback fixture');assert.equal(requests,1);
});

test('Chat compatibility keeps answer text and drops private reasoning from SSE and JSON', async t => {
  const hidden = 'Fixture private reasoning must not be retained.';
  const reply = { model: settings.model, choices: [{ finish_reason: 'stop', message: {
    content: [{ type: 'text', text: 'Public answer.' }, { type: 'reasoning_text', text: hidden }],
    reasoning_content: hidden,
  } }] };
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json(reply));
  const visible = [];
  const run = () => streamCompletion({ settings: { ...settings, apiTransport: 'chat-completions' }, messages: [],
    onDelta: (_text, output) => visible.push(structuredClone(output)),
  });
  assert.equal((await run()).content, 'Public answer.');
  fetch.mock.mockImplementation(async () => eventsResponse([
    { ...reply, choices: [{ delta: { reasoning_content: hidden } }] },
    { ...reply, choices: [{ finish_reason: 'stop', delta: { content: 'Public answer.' } }] },
  ]));
  const streamed = await run();
  assert.equal(streamed.content, 'Public answer.');
  assert.equal(streamed.reasoning, undefined);
  assert(!JSON.stringify({ streamed, visible }).includes(hidden));
});

test('Responses keeps only public summaries and opaque continuation data in reasoning items', async t => {
  const reasoning = { type: 'reasoning', id: 'fixture-summary', encrypted_content: 'fixture-opaque-continuation',
    summary: [{ type: 'summary_text', text: 'Public summary.' }, { type: 'reasoning_text', text: 'Unpublished reasoning.' }],
    content: [{ type: 'reasoning_text', text: 'Unpublished reasoning.' }],
    reasoning_content: 'Unpublished reasoning.',
  };
  t.mock.method(globalThis, 'fetch', async () => eventsResponse([
    { type: 'response.reasoning_text.delta', delta: 'Unpublished reasoning.' },
    { type: 'response.completed', response: completed([reasoning, textItem('Public answer.')]) },
  ]));
  const result = await streamCompletion({ settings, messages: [] });
  assert.equal(result.content, 'Public answer.');
  assert.equal(result.reasoning, 'Public summary.');
  assert.equal(result.response_items[0].encrypted_content, reasoning.encrypted_content);
  assert(!JSON.stringify(result).includes('Unpublished reasoning.'));
  assert(!JSON.stringify(toResponsesInput([{ role: 'assistant', response_items: [reasoning] }])).includes('Unpublished reasoning.'));
});
