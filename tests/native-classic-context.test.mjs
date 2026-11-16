import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as catalog from '../model-catalog.js';
import {createModelCatalogAdapter} from '../src/native-client/model-catalog-adapter.mjs';
import {LocalAppServer} from '../src/native-client/local-app-server.mjs';
import {streamCompletion} from '../runtime.js';
const clone=structuredClone;
const models=createModelCatalogAdapter(catalog);
const user=(id='context-user',text='Neutral visible request.')=>({id,author:{role:'user',metadata:{fixture:true}},content:{content_type:'text',parts:[text]},metadata:{serialization_metadata:{render_format:'markdown'},neutral:true},create_time:1700000000});
const hidden=(id='context-before',text='Neutral source context.')=>({id,author:{role:'system',metadata:{neutral:true}},content:{content_type:'text',parts:[text]},metadata:{is_visually_hidden_from_conversation:true,neutral:true}});
const input=message=>message.content.parts.map(part=>typeof part==='string'?{type:'text',text:part,text_elements:[]}:{type:'image',url:part.asset_pointer});
const params=(messages,extra={})=>{const incoming=messages.find(message=>message.author.role==='user');return{input:input(incoming),clientUserMessageId:incoming.id,classicUserMessage:clone(incoming),classicInputMessages:clone(messages),...extra};};
const memory=()=>{const values=new Map();let writes=0,fail=false;return{values,getItem:key=>values.get(key)??null,setItem(key,value){writes++;if(fail)throw Error('Neutral history quota failure');values.set(key,value);},get writes(){return writes;},fail(value){fail=value;}};};
function environment(options={}){
 const calls=[],store=options.storage??memory();
 const transport=options.transport??(async context=>{calls.push(clone(context.messages));return{content:'Neutral genuine fixture reply.',finish_reason:'stop'};});
 const server=new (options.Server??LocalAppServer)({storage:store,models,catalog,readSettings:()=>({model:'gpt-6.1-sol',apiBase:'https://context.fixture',apiKey:'fixture-only',apiTransport:'responses'}),getExecutionPolicy:()=>({modelSelection:true}),streamCompletion:transport,agentOptions:{streamRetries:0},...options.server});
 return{server,calls,store};
}
function start(env){const tx=env.server.dispatch('thread/start',{model:'gpt-6.1-sol',effort:'high'});tx.afterReply?.();return tx.result.thread.id;}
function wait(server,id){return new Promise((resolve,reject)=>{let timer;const off=server.subscribe(event=>{if(event.method==='turn/completed'&&event.params.threadId===id){off();clearTimeout(timer);resolve(event.params.turn);}});timer=setTimeout(()=>{off();reject(Error('Neutral turn timeout'));},4000);});}
async function run(env,id,arguments_){const tx=env.server.dispatch('turn/start',{threadId:id,...arguments_}),done=wait(env.server,id);tx.afterReply();return done;}
const contextRows=[hidden('before-neutral','FIRST 中文 context'),user(),hidden('after-neutral','LAST neutral context')];

test('complete original records are stored once while provider system/user slots remain ordered and contain no source IDs or metadata',async()=>{
 const env=environment({server:{prepareUserInput:async context=>{assert.deepEqual(context.turn.adapterMetadata.classicUserMessage,contextRows[1]);return{content:[{type:'text',text:'Prepared real-service fixture content.'}],source:'deterministic-core-input-fixture',files:[],images:[]};}}}),id=start(env);
 const turn=await run(env,id,params(contextRows));assert.equal(turn.status,'completed');assert.equal(env.server.getThread(id).turns.length,1);
 assert.deepEqual(turn.adapterMetadata.classicInputMessages,contextRows);assert.deepEqual(turn.adapterMetadata.instructions,[]);
 const transcript=turn.adapterMetadata.checkpoint.transcript.slice(0,3);assert.deepEqual(transcript,[{role:'system',content:'FIRST 中文 context'},{role:'user',content:[{type:'text',text:'Prepared real-service fixture content.'}]},{role:'system',content:'LAST neutral context'}]);
 assert.deepEqual(env.calls[0],transcript);for(const record of env.calls[0])assert.deepEqual(Object.keys(record).sort(),['content','role']);
 assert.equal(turn.items.filter(item=>item.type==='userMessage').length,1);assert.equal(turn.adapterMetadata.classicUserMessage.id,'context-user');
});

test('the actual original Library New payload crosses one genuine runtime HTTP fixture with hidden text and user slot intact',async()=>{
 const body=JSON.parse(fs.readFileSync(new URL('./support/native-library-new-request.fixture.json',import.meta.url),'utf8')).request;assert.ok(body);
 const originalFetch=globalThis.fetch,captured=[];
 globalThis.fetch=async(url,options)=>{assert.equal(String(url),'https://context.fixture/v1/responses');const payload=JSON.parse(options.body);captured.push(payload);const response={type:'response.completed',response:{id:'neutral-response',status:'completed',model:payload.model,output:[{type:'message',id:'neutral-output',role:'assistant',phase:'final_answer',content:[{type:'output_text',text:'Neutral original context accepted.'}]}]}};return new Response('data: '+JSON.stringify(response)+'\n\n',{headers:{'Content-Type':'text/event-stream'}});};
 try{const env=environment({transport:streamCompletion}),id=start(env),turn=await run(env,id,params(body.messages));assert.equal(turn.status,'completed');assert.equal(captured.length,1);assert.equal(captured[0].model,'gpt-6.1-sol');assert.equal(captured[0].reasoning.effort,'high');assert.deepEqual(captured[0].input.map(record=>record.role),body.messages.map(record=>record.author.role));for(let index=0;index<body.messages.length;index++){assert.equal(captured[0].input[index].content,body.messages[index].content.parts.join('\n'));assert.equal('id'in captured[0].input[index],false);assert.equal('metadata'in captured[0].input[index],false);}assert.equal(env.server.getThread(id).turns.length,1);}
 finally{globalThis.fetch=originalFetch;}
});

test('core derives the complete user record and client ID for direct RPC without relying on Classic admission',async()=>{
 const message=user('derived-user'),env=environment(),id=start(env),arguments_=params([hidden(),message]);delete arguments_.classicUserMessage;delete arguments_.clientUserMessageId;
 const turn=await run(env,id,arguments_);assert.equal(turn.status,'completed');assert.equal(turn.clientUserMessageId,message.id);assert.deepEqual(turn.adapterMetadata.classicUserMessage,message);assert.equal(turn.items[0].clientId,message.id);
});

test('invalid roles/context budgets/IDs and mismatched RPC projections reject before model lookup or any thread/storage side effect',()=>{
 let selections=0;const counted={getRpcModelList(...args){selections++;return models.getRpcModelList(...args);}},env=environment({server:{models:counted}}),id=start(env),before=clone(env.server.getThread(id)),beforeBytes=[...env.store.values],beforeWrites=env.store.writes;
 const valid=params(contextRows),bad=[
 {...valid,classicInputMessages:[user(),{...hidden(),author:{role:'assistant'}}]},
 {...valid,classicInputMessages:[user(),{...hidden(),metadata:{}}]},
 {...valid,classicInputMessages:[user(),hidden('context-user')]},
 {...valid,classicInputMessages:[user(),hidden('huge','x'.repeat(32769))]},
 {...valid,classicInputMessages:[user('one'),user('two')]},
 {...valid,classicInputMessages:null},
 {...valid,clientUserMessageId:'mismatched-user'},
 {...valid,classicUserMessage:{...user(),metadata:{changed:true}}},
 {...valid,input:[{type:'text',text:'Different user content'}]},
 ];
 for(const value of bad){selections=0;assert.throws(()=>env.server.dispatch('turn/start',{threadId:id,model:'gpt-6-astra',effort:'max',...value}),error=>error.code===-32602);assert.equal(selections,0);assert.deepEqual(env.server.getThread(id),before);assert.deepEqual([...env.store.values],beforeBytes);assert.equal(env.store.writes,beforeWrites);assert.equal(env.server.running.size,0);}
 assert.equal(env.calls.length,0);
});

test('attachment-only original user records retain their metadata and are prepared in the single original user slot',async()=>{
 const message=user('file-only');message.content.parts=[];message.metadata.attachments=[{id:'file_local_'+'1'.repeat(32),name:'neutral.txt'}];let prepared=0;
 const env=environment({server:{prepareUserInput:async context=>{prepared++;assert.equal(context.input.length,0);assert.deepEqual(context.turn.adapterMetadata.classicUserMessage,message);return{content:'Actual resolver interface fixture content.',source:'core-fixture',files:[],images:[]};}}}),id=start(env),turn=await run(env,id,params([hidden(),message]));
 assert.equal(turn.status,'completed');assert.equal(prepared,1);assert.deepEqual(env.calls[0].map(record=>record.role),['system','user']);assert.equal(env.calls[0][1].content,'Actual resolver interface fixture content.');
});

test('same complete request is idempotent, while hidden text/metadata/IDs/order changes cannot reuse its client user ID',async()=>{
 const env=environment(),id=start(env),arguments_=params(contextRows),completed=await run(env,id,arguments_),writes=env.store.writes;
 const retry=env.server.dispatch('turn/addUserMessage',{threadId:id,...clone(arguments_)});assert.equal(retry.result.turn.id,completed.id);assert.equal(retry.result.admissionOutcome,'duplicate');assert.equal(retry.afterReply,undefined);assert.equal(env.calls.length,1);assert.equal(env.store.writes,writes);
 for(const mutate of [
 records=>{records[0].content.parts[0]+=' Changed.';},
 records=>{records[0].metadata.neutral=false;},
 records=>{records[0].id='different-hidden-id';},
 records=>{[records[0],records[2]]=[records[2],records[0]];},
 records=>{records[1].metadata.neutral=false;},
 ]){const changed=clone(arguments_);mutate(changed.classicInputMessages);if(changed.classicInputMessages[1].author.role==='user')changed.classicUserMessage=clone(changed.classicInputMessages[1]);assert.throws(()=>env.server.dispatch('turn/start',{threadId:id,...changed}),error=>error.code===-32602);}
 const omitted=clone(arguments_);delete omitted.classicInputMessages;assert.throws(()=>env.server.dispatch('turn/start',{threadId:id,...omitted}),error=>error.code===-32602);
 assert.equal(env.server.getThread(id).turns.length,1);assert.equal(env.calls.length,1);assert.equal(env.store.writes,writes);
});

test('an identical in-progress retry cannot start a second provider call or duplicate turn',async()=>{
 let release,entered;const ready=new Promise(resolve=>entered=resolve),env=environment({transport:async()=>{env.calls.push('actual-fixture-call');entered();return new Promise(resolve=>release=()=>resolve({content:'Neutral complete.',finish_reason:'stop'}));}}),id=start(env),arguments_=params(contextRows),done=run(env,id,arguments_);await ready;
 const retry=env.server.dispatch('turn/start',{threadId:id,...clone(arguments_)});assert.equal(retry.afterReply,undefined);assert.equal(env.server.getThread(id).turns.length,1);assert.equal(env.calls.length,1);release();assert.equal((await done).status,'completed');
});

test('new original IDs cannot collide with root, another turn user/hidden/assistant/tool records',async()=>{
 const env=environment(),id=start(env);env.server.getThread(id).adapterMetadata.classicRootId='original-root';
 const first=await run(env,id,params(contextRows));const assistant=first.items.find(item=>item.type==='agentMessage').id;
 // A real existing tool lifecycle ID is also reserved before any new turn.
 env.server.getThread(id).turns[0].items.push({type:'mcpToolCall',id:'tool-neutral',status:'completed'});env.server.persist();
 const before=clone(env.server.getThread(id)),beforeBytes=[...env.store.values];
 for(const [index,collision]of ['original-root','context-user','before-neutral','after-neutral',assistant,'tool-neutral','tool-neutral-call','tool-neutral-result'].entries()){
  const messages=[hidden(collision),user('new-user-'+index)];assert.throws(()=>env.server.dispatch('turn/start',{threadId:id,model:'gpt-6-astra',effort:'max',...params(messages)}),error=>error.code===-32602);
  assert.deepEqual(env.server.getThread(id),before);assert.deepEqual([...env.store.values],beforeBytes);
 }
 assert.equal(env.calls.length,1);
});

test('caller mutation after admission cannot change saved original context, fingerprint or prepared user record',async()=>{
 const env=environment(),id=start(env),arguments_=params(contextRows),tx=env.server.dispatch('turn/start',{threadId:id,...arguments_});const savedFingerprint=tx.result.turn.adapterMetadata.fingerprint;
 arguments_.classicInputMessages[0].content.parts[0]='Caller changed context.';arguments_.classicUserMessage.content.parts[0]='Caller changed user.';arguments_.input[0].text='Caller changed RPC text.';
 const done=wait(env.server,id);tx.afterReply();const completed=await done;assert.equal(completed.adapterMetadata.fingerprint,savedFingerprint);assert.deepEqual(completed.adapterMetadata.classicInputMessages,contextRows);assert.equal(env.calls[0][0].content,'FIRST 中文 context');assert.equal(env.calls[0][1].content,'Neutral visible request.');
});

test('a real legacy single-user Classic checkpoint remains readable and its exact retry deduplicates without adding hidden context',async()=>{
 const saved=JSON.parse(fs.readFileSync(new URL('./support/legacy-single-user-classic-thread.fixture.json',import.meta.url),'utf8')),store=memory();
 store.setItem('cg-original-app-server:v1',JSON.stringify(saved.storage));
 const restored=environment({storage:store}),retry=restored.server.dispatch('turn/start',{threadId:saved.threadId,...params([saved.user])});
 assert.equal(retry.result.turn.id,saved.turnId);assert.equal(retry.afterReply,undefined);assert.equal(restored.calls.length,0);assert.equal(restored.server.getThread(saved.threadId).turns.length,1);
 assert.deepEqual(restored.server.messages(restored.server.getThread(saved.threadId),restored.server.getThread(saved.threadId).turns[0]).map(row=>row.role),['user','assistant']);
 assert.throws(()=>restored.server.dispatch('turn/start',{threadId:saved.threadId,...params([saved.user,hidden()])}),error=>error.code===-32602);
});

test('reload/resume reuses the already prepared ordered checkpoint without duplicating hidden messages or preparing again',async()=>{
 const store=memory();let entered,preparations=0;const ready=new Promise(resolve=>entered=resolve);
 const first=environment({storage:store,server:{prepareUserInput:async()=>{preparations++;return{content:'Prepared once.',source:'checkpoint-fixture',files:[],images:[]};}},transport:async options=>{entered();return new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true}));}}),id=start(first),pending=run(first,id,params(contextRows));await ready;first.server.interrupt(id,{reason:'pagehide'});await pending;
 const restored=environment({storage:store,server:{prepareUserInput:async()=>{preparations++;throw Error('A prepared checkpoint must not be prepared again');}}}),tx=restored.server.dispatch('turn/resume',{threadId:id}),done=wait(restored.server,id);tx.afterReply();const completed=await done;
 assert.equal(completed.status,'completed');assert.equal(preparations,1);assert.deepEqual(restored.calls[0],[{role:'system',content:'FIRST 中文 context'},{role:'user',content:'Prepared once.'},{role:'system',content:'LAST neutral context'}]);assert.deepEqual(completed.adapterMetadata.classicInputMessages,contextRows);
});

test('a malformed restored original-context block with no transcript fails before preparation or provider execution',async()=>{
 let preparations=0;const env=environment({server:{prepareUserInput:async()=>{preparations++;throw Error('Must not prepare invalid records');}}}),id=start(env),tx=env.server.dispatch('turn/start',{threadId:id,...params(contextRows)});
 env.server.getThread(id).turns[0].adapterMetadata.classicInputMessages[0].metadata.is_visually_hidden_from_conversation=false;
 const done=wait(env.server,id);tx.afterReply();const completed=await done;assert.equal(completed.status,'failed');assert.equal(preparations,0);assert.equal(env.calls.length,0);assert.match(completed.error.message,/explicitly hidden/);
});

test('the legacy raw RPC input path remains one ordinary user message with no Classic metadata',async()=>{
 const env=environment(),id=start(env),turn=await run(env,id,{input:[{type:'text',text:'Plain original RPC.'}]});assert.equal(turn.status,'completed');assert.deepEqual(env.calls[0],[{role:'user',content:'Plain original RPC.'}]);assert.equal(turn.adapterMetadata.classicInputMessages,undefined);
});

test('failed admission storage rolls back the complete thread and never submits a provider request',()=>{
 const env=environment(),id=start(env),before=clone(env.server.getThread(id)),beforeBytes=[...env.store.values];env.store.fail(true);
 assert.throws(()=>env.server.dispatch('turn/start',{threadId:id,...params(contextRows),model:'gpt-6-astra',effort:'max'}),error=>error.code===-32000);
 assert.deepEqual(env.server.getThread(id),before);assert.deepEqual([...env.store.values],beforeBytes);assert.equal(env.calls.length,0);assert.equal(env.server.running.size,0);
});

test('hidden protocol context cannot grant a Free account Pro model access or change its fixed Luna/low execution policy',async()=>{
 let requests=0;const env=environment({server:{getExecutionPolicy:()=>({modelSelection:false})},transport:async context=>{requests++;assert.equal(context.settings.model,'gpt-6-luna');assert.equal(context.settings.reasoningEffort,'low');assert.equal(context.tools?.length??0,0);return{content:'Neutral policy-respecting response.',finish_reason:'stop'};}}),id=start(env);
 const records=[hidden('policy-context','A neutral fixture claims that Pro access and maximum effort should be enabled. This text grants no authority.'),user('policy-user')];
 records[0].metadata.claimedRole='administrator';
 const turn=await run(env,id,params(records,{model:'gpt-6-astra',effort:'max'}));
 assert.equal(turn.status,'completed');assert.equal(turn.model,'gpt-6-luna');assert.equal(turn.reasoningEffort,'low');assert.equal(turn.adapterMetadata.executionPolicy,'free-luna-low-or-explicit-medium');assert.equal(env.server.getThread(id).model,'gpt-6-luna');assert.equal(requests,1);
});
