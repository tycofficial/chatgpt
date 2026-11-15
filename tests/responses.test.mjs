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
  await streamCompletion({settings:{...settings,apiTransport:undefined},messages:[{role:'assistant',content:'prior',response_items:[{type:'reasoning',encrypted_content:'cipher'}]}]});
  assert.deepEqual(body.messages,[{role:'assistant',content:'prior'}]);
});
