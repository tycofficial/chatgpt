import test from 'node:test';
import assert from 'node:assert/strict';
import * as catalog from '../src/native-client/model-catalog.js';
import {createModelCatalogAdapter} from '../src/native-client/model-catalog-adapter.mjs';
import {LocalAppServer,LocalProtocolSocket} from '../src/native-client/local-app-server.mjs';
import {ClassicChatAdapter} from '../src/native-client/classic-chat-adapter.mjs';
import {createUltraToolExecutor,ULTRA_MODELS} from '../src/native-client/site-ultra-orchestrator.mjs';
import {projectChatHistoryThread} from '../src/native-client/chat-history-sync.mjs';
import {allowedReasoningEfforts,streamCompletion} from '../runtime.js';
const models=createModelCatalogAdapter(catalog);
const expected=['gpt-6-luna','gpt-6.1-sol','gpt-6-astra','gpt-6.1-terra','gpt-6.2-sol','gpt-6.2-astra','gpt-6-sol','gpt-5.6-sol','gpt-5.6-terra','gpt-5.6-luna'];
const sleep=()=>new Promise(resolve=>setImmediate(resolve));
function fixture({privileged=true,storage=new Map(),transport}={}){
 const requests=[];const server=new LocalAppServer({storage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},models,catalog,getExecutionPolicy:()=>({modelSelection:privileged}),readSettings:()=>({apiBase:'https://neutral-model.fixture',apiKey:'neutral-only',model:'gpt-6.1-sol'}),streamCompletion:transport??(async options=>{requests.push({model:options.settings.model,effort:options.settings.reasoningEffort,mode:options.settings.reasoningMode});return{content:'Neutral actual fixture reply',finish_reason:'stop',actual_reasoning:{mode:options.settings.reasoningMode}};}),agentOptions:{toolTransport:'responses',ultraOrchestration:true}});
 return{server,requests,storage,classic:new ClassicChatAdapter({appServer:server,models,heartbeatMs:100})};
}
function nextBody(model='auto',thinking_effort='standard',extra={}){return{action:'next',model,thinking_effort,parent_message_id:crypto.randomUUID(),messages:[{id:crypto.randomUUID(),author:{role:'user'},content:{content_type:'text',parts:['Neutral manual model correction input']},metadata:{}}],...extra};}
async function classicTurn(f,body){const response=f.classic.stream(new Request('https://site.fixture/f/conversation'),body);assert.equal(response.status,200);const sse=await response.text();const thread=[...f.server.threads.values()].at(-1),turn=thread.turns.at(-1);return{thread,turn,sse};}
test('Work/Codex exact IDs, Luna five levels, supported reasoning tiers and one original curated default',()=>{
 assert.deepEqual(catalog.WORK_MODEL_IDS,expected);assert.deepEqual(models.getRpcModelList().data.map(row=>row.model),expected);
 for(const row of models.getRpcModelList().data){const expectedEfforts=row.model.endsWith('-luna')||row.model.startsWith('gpt-6.2-')?['low','medium','high','xhigh','max']:['low','medium','high','xhigh','max','ultra'];assert.deepEqual(row.supportedReasoningEfforts.map(value=>value.reasoningEffort),expectedEfforts);}
 const work=models.getWorkModels();assert.equal(work.models.length,10);assert.equal(work.versions.filter(value=>value.display_text==='默认').length,1);assert.equal(work.versions.length,11);
 assert.deepEqual(models.getSliderModelsConfig().presets[0].map(value=>value.model+':'+value.reasoning_effort),['gpt-6-luna:high','gpt-6.1-sol:low','gpt-6.1-sol:medium','gpt-6-astra:low','gpt-6-astra:medium','gpt-6-astra:xhigh']);
 assert(!work.models.some(row=>row.thinking_efforts.some(value=>value.thinking_effort==='zero')));
});
test('Chat exposes only GPT-6/GPT-5.6 Sol families, each Pro row stays in the same version with a legal raw effort',()=>{
 const raw=models.getChatGptModels();assert.deepEqual(raw.versions.map(value=>value.display_text),['GPT-6','GPT-5.6 Sol']);assert.deepEqual(raw.categories.map(value=>value.title),['GPT-6','GPT-5.6 Sol']);
 assert(!raw.categories.some(row=>/ChatGPT|Work|Luna|Astra|Terra/.test(row.title)));
 const aliases=raw.models.filter(row=>!row.is_work_mode_model);assert.equal(aliases.length,4);assert.equal(raw.models.filter(row=>row.is_work_mode_model).length,10);
 for(const version of raw.versions){assert.equal(version.slugs.length,2);assert.equal(version.intelligence_presets.length,5);assert.deepEqual(version.intelligence_presets.map(row=>row.thinking_effort),['zero','standard','extended','xhigh','standard']);const pro=version.intelligence_presets.at(-1);assert.equal(pro.lane,'pro');assert.equal(pro.reasoning_type,'pro');assert(version.slugs.includes(pro.model_slug));assert.equal(raw.models.find(row=>row.slug===pro.model_slug).reasoning_type,'pro');}
 assert(!raw.versions.some(value=>value.id==='auto'||value.id==='latest'));assert.equal(raw.default_model_slug,'auto');
});
test('Chat frontend aliases resolve to their real API model plus independent mode',()=>{
 assert.deepEqual(catalog.resolveChatSelection('auto',{effort:'none'}),{model:'gpt-6-sol',effort:'none',reasoningMode:'standard',frontendModelSlug:'auto',chatFamily:'gpt-6'});
 assert.equal(catalog.resolveChatSelection('chat-gpt-6-pro').model,'gpt-6-astra');assert.equal(catalog.resolveChatSelection('chat-gpt-6-pro').reasoningMode,'pro');
 const older=catalog.resolveChatSelection('chat-gpt-5.6-sol-pro');assert.equal(older.model,'gpt-5.6-sol');assert.equal(older.reasoningMode,'pro');assert.equal(older.effort,'medium');
 for(const value of ['low','max','ultra','pro'])assert.throws(()=>catalog.resolveChatSelection('auto',{effort:value}));assert.throws(()=>catalog.resolveChatSelection('chat-gpt-6-pro',{effort:'high'}));
});
test('the reusable Classic decode keeps aliases and delegates role/model resolution to core',()=>{
 const f=fixture(),decoded=f.classic.decodeModelRequest({model:'chat-gpt-6-pro',thinking_effort:'standard'});
 assert.equal(decoded.model,'chat-gpt-6-pro');assert.equal(decoded.frontendModelSlug,'chat-gpt-6-pro');assert.equal(decoded.effort,'medium');assert.equal(decoded.executionSurface,'chat');
 const selected=f.server.selection(decoded);assert.equal(selected.model,'gpt-6-astra');assert.equal(selected.reasoningMode,'pro');assert.equal(selected.chatFamily,'gpt-6');
 const work=f.classic.decodeModelRequest({model:'gpt-5.6-terra',thinking_effort:'min'},{adapterMetadata:{conversationOrigin:'tpp'}});assert.equal(work.executionSurface,'work');assert.equal(work.effort,'low');assert.equal(work.frontendModelSlug,undefined);
});
test('paid Chat admission excludes Work-only families while Work/RPC retains ten; failed admission mutates nothing',()=>{
 const f=fixture();for(const model of ['gpt-6-luna','gpt-6.1-sol','gpt-6.1-terra','gpt-5.6-terra','gpt-5.6-luna'])assert.throws(()=>f.server.dispatch('thread/start',{executionSurface:'chat',model,effort:'medium'}),{code:-32602});
 assert.equal(f.server.threads.size,0);assert.equal(f.storage.size,0);assert.equal(f.requests.length,0);
 for(const model of expected)assert.equal(f.server.selection({executionSurface:'work',model,effort:'low'}).model,model);
 assert.throws(()=>f.server.selection({executionSurface:'work',model:'auto',effort:'medium'}),{code:-32602});
 for(const model of ['gpt-6-luna','gpt-5.6-luna','gpt-6-sol','gpt-5.6-terra']){assert(allowedReasoningEfforts(model).includes('none'));assert.equal(f.server.selection({executionSurface:'work',model,effort:'none'}).reasoningEffort,'none');}
});
test('Free Chat uses 5.6 Luna Instant or explicit Think and cannot obtain Work/Pro/Ultra',async()=>{
 const f=fixture({privileged:false});const first=await classicTurn(f,nextBody('chat-gpt-6-pro','ultra'));assert.equal(first.turn.model,'gpt-5.6-luna');assert.equal(first.turn.reasoningEffort,'none');assert.equal(first.turn.reasoningMode,'standard');assert.equal(first.turn.adapterMetadata.frontendModelSlug,'auto');
 const second=await classicTurn(f,nextBody('auto','standard',{conversation_id:first.thread.id,system_hints:['reason']}));assert.equal(second.turn.reasoningEffort,'medium');assert.equal(second.turn.model,'gpt-5.6-luna');assert(f.requests.every(row=>row.mode==='standard'));
 for(const executionSurface of ['work','codex'])assert.throws(()=>f.server.selection({executionSurface,model:'gpt-6-luna',effort:'low'}),{code:-32003});
});
test('actual native RPC transport cannot label a Free mutation as Chat to bypass its Work/Codex policy',async()=>{
 const f=fixture({privileged:false}),socket=new LocalProtocolSocket(f.server);await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));const result=new Promise(resolve=>socket.addEventListener('message',event=>{const data=JSON.parse(event.data);if(data.id===123)resolve(data);},{once:true}));socket.send(JSON.stringify({id:123,method:'thread/start',params:{executionSurface:'chat',model:'auto',effort:'medium'}}));assert.equal((await result).error.code,-32003);assert.equal(f.server.threads.size,0);socket.close();
});
test('Classic Pro alias/mode survives real turn persistence and source-shaped history projection',async()=>{
 const f=fixture(),first=await classicTurn(f,nextBody('chat-gpt-6-pro','standard'));assert.equal(first.turn.status,'completed');assert.equal(first.turn.model,'gpt-6-astra');assert.equal(first.turn.reasoningMode,'pro');assert.equal(first.turn.reasoningEffort,'medium');
 assert.deepEqual(f.requests,[{model:'gpt-6-astra',effort:'medium',mode:'pro'}]);
 const message=f.classic.message(first.thread,first.turn,first.turn.items.find(item=>item.type==='agentMessage'),'assistant');assert.equal(message.metadata.model_slug,'chat-gpt-6-pro');assert.equal(message.metadata.thinking_effort,'standard');assert.equal(message.metadata.reasoning_type,'pro');assert.equal(message.metadata.reasoning_mode,'pro');
 const restored=fixture({storage:f.storage}),thread=restored.server.getThread(first.thread.id);assert.equal(thread.turns[0].reasoningMode,'pro');assert.equal(thread.adapterMetadata.classicModelSlugs[thread.turns[0].id],'chat-gpt-6-pro');
 const projected=projectChatHistoryThread(thread);assert.equal(projected.reasoningMode,'pro');assert.equal(projected.executionSurface,'chat');assert.equal(projected.turns[0].reasoningMode,'pro');assert.equal(projected.turns[0].adapterMetadata.frontendModelSlug,'chat-gpt-6-pro');assert.equal(projected.turns[0].adapterMetadata.resumable,false);assert(!projected.turns[0].adapterMetadata.checkpoint);
});
test('mode participates in idempotent admission and changing the next family/mode leaves old turns intact',async()=>{
 const f=fixture(),body=nextBody('chat-gpt-5.6-sol-pro','standard'),first=await classicTurn(f,body);assert.equal(first.turn.model,'gpt-5.6-sol');assert.equal(first.turn.reasoningMode,'pro');
 const second=await classicTurn(f,nextBody('chat-gpt-5.6-sol','extended',{conversation_id:first.thread.id}));assert.equal(second.turn.model,'gpt-5.6-sol');assert.equal(second.turn.reasoningMode,'standard');assert.equal(second.turn.reasoningEffort,'high');assert.equal(first.thread.turns[0].reasoningMode,'pro');
 assert.throws(()=>f.server.dispatch('turn/start',{threadId:first.thread.id,executionSurface:'chat',model:'chat-gpt-5.6-sol',effort:'medium',clientUserMessageId:body.messages[0].id,input:[{type:'text',text:body.messages[0].content.parts[0]}],classicUserMessage:body.messages[0],classicInputMessages:body.messages}),{code:-32602});
});
test('legacy Free no-surface 6 Luna low/medium compatibility is read-only; new Free Pro checkpoints cannot resume',()=>{
 const f=fixture({privileged:false});assert.equal(f.server.selection({model:'gpt-6-astra',effort:'high'}).model,'gpt-6-luna');f.server.assertExecutionAllowed({model:'gpt-6-luna',reasoningEffort:'low',adapterMetadata:{executionPolicy:'free-luna-low-or-explicit-medium'}});
 assert.throws(()=>f.server.assertExecutionAllowed({model:'gpt-6-astra',reasoningEffort:'medium',reasoningMode:'pro',executionSurface:'chat'}),{code:-32003});
});
test('a legacy Classic fingerprint cannot reuse a Standard input ID for the same-model Pro mode',async()=>{
 const f=fixture(),body=nextBody('chat-gpt-5.6-sol','standard'),first=await classicTurn(f,body),old=first.turn;
 delete old.adapterMetadata.classicInputMessages;
 old.adapterMetadata.fingerprint=JSON.stringify([old.items[0].content,old.model,old.reasoningEffort,old.serviceTier]);
 const calls=f.requests.length;
 assert.throws(()=>f.server.dispatch('turn/start',{threadId:first.thread.id,executionSurface:'chat',model:'chat-gpt-5.6-sol-pro',effort:'medium',clientUserMessageId:body.messages[0].id,input:old.items[0].content,classicUserMessage:body.messages[0],classicInputMessages:body.messages}),{code:-32602});
 assert.equal(f.requests.length,calls);assert.equal(first.thread.turns.length,1);assert.equal(old.reasoningMode,'standard');
});
test('all six non-Luna Ultra families execute two genuine fixture workers using the same model at max',async()=>{
 assert.deepEqual(ULTRA_MODELS,catalog.SITE_ULTRA_ORCHESTRATION.models);
 for(const model of ULTRA_MODELS){let count=0,release;const barrier=new Promise(resolve=>release=resolve),cp={};const executor=createUltraToolExecutor({turn:{model,reasoningEffort:'ultra'},checkpoint:cp,save:async()=>{},getSettings:()=>({model,reasoningEffort:'ultra',reasoningMode:'standard'}),getContext:()=>[{role:'user',content:'Neutral analysis'}],streamCompletion:async options=>{assert.equal(options.settings.model,model);assert.equal(options.settings.reasoningEffort,'max');const id=++count;if(count===2)release();await barrier;return{content:'Actual fixture worker '+id,finish_reason:'stop'};}});const result=await executor.execute({id:'neutral-'+model,function:{name:'delegate_tasks',arguments:JSON.stringify({tasks:[{prompt:'A'},{prompt:'B'}]})}},{signal:new AbortController().signal});assert.equal(result.isError,false);assert.equal(count,2);assert(cp.ultra.calls[0].workers.every(worker=>worker.rounds[0].effort==='max'));}
 for(const model of expected.filter(value=>value.endsWith('-luna')))assert.throws(()=>createUltraToolExecutor({turn:{model,reasoningEffort:'ultra'},checkpoint:{}}));
});
for(const [alias,apiModel]of [['chat-gpt-6-pro','gpt-6-astra'],['chat-gpt-5.6-sol-pro','gpt-5.6-sol']])test('actual runtime sends '+alias+' as mode=pro on '+apiModel+' and rejects an unfulfilled mode',async t=>{
 const payloads=[];let fulfill=true;
 t.mock.method(globalThis,'fetch',async(_url,options)=>{const body=JSON.parse(options.body);payloads.push(body);const output={id:'msg-neutral',type:'message',role:'assistant',phase:'final_answer',content:[{type:'output_text',text:'Neutral verified response'}]};return new Response('data: '+JSON.stringify({type:'response.completed',response:{id:'resp-neutral',status:'completed',model:body.model,reasoning:{effort:body.reasoning.effort,...(fulfill?{mode:'pro'}:{mode:'standard'})},output:[output]}})+'\n\n',{headers:{'Content-Type':'text/event-stream'}});});
 const f=fixture({transport:options=>streamCompletion(options)}),first=await classicTurn(f,nextBody(alias,'standard'));assert.equal(first.turn.status,'completed');assert.equal(payloads[0].model,apiModel);assert.deepEqual(payloads[0].reasoning,{effort:'medium',mode:'pro'});assert.equal(first.turn.adapterMetadata.checkpoint.metrics[0].actualReasoningMode,'pro');
 fulfill=false;const failed=await classicTurn(f,nextBody(alias,'standard'));assert.equal(failed.turn.status,'failed');assert.match(failed.turn.error.message,/原生 Pro 模式/);assert.equal(failed.turn.reasoningMode,'pro');assert(!failed.turn.items.some(item=>item.type==='agentMessage'&&item.text==='Neutral verified response'));
});
