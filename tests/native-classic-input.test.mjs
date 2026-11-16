
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ClassicChatAdapter,parseClassicInputMessages,CLASSIC_CONTEXT_LIMITS} from '../src/native-client/classic-chat-adapter.mjs';
const golden=JSON.parse(fs.readFileSync(new URL('./support/native-library-new-request.fixture.json',import.meta.url),'utf8')).request;
assert.ok(golden);
const clone=x=>structuredClone(x);
const user=(id='user-neutral')=>({id,author:{role:'user',metadata:{neutral:true}},content:{content_type:'text',parts:['Neutral visible request.']},metadata:{serialization_metadata:{render_format:'markdown'}}});
const hidden=(id='hidden-neutral',text='A structurally valid neutral context. 此为另一种真实结构。')=>({id,author:{role:'system'},content:{content_type:'text',parts:[text]},metadata:{is_visually_hidden_from_conversation:true,neutral_fixture:true}});
test('actual original Library New/send payload is admitted without flattening IDs, metadata, roles or order',()=>{
  const output=parseClassicInputMessages(golden.messages);assert.equal(output.hiddenCount,1);assert.deepEqual(output.originalMessages,golden.messages);assert.equal(output.incoming.author.role,'user');assert.notEqual(output.originalMessages,golden.messages);output.originalMessages[1].content.parts[0]='mutated fixture copy';assert.notEqual(golden.messages[1].content.parts[0],'mutated fixture copy');
});
test('structurally valid neutral hidden context is admitted without body/locale whitelisting and preserves original slots',()=>{
  const messages=[hidden('before','中性附加说明，保留 system 角色。'),user(),hidden('after','Unrelated neutral source context.')],out=parseClassicInputMessages(messages);assert.deepEqual(out.originalMessages,messages);assert.equal(out.hiddenCount,2);assert.deepEqual(out.originalMessages.map(x=>x.author.role),['system','user','system']);
});
test('one original image/text user message retains attachment metadata beside system context',()=>{
  const message=user();message.content={content_type:'multimodal_text',parts:['Neutral image.',{content_type:'image_asset_pointer',asset_pointer:'sediment://file_local_'+'1'.repeat(32)}]};message.metadata.attachments=[{id:'file_local_'+'1'.repeat(32),name:'neutral.png',mime_type:'image/png',size:10}];assert.deepEqual(parseClassicInputMessages([message,hidden()]).incoming,message);
});
test('unsupported roles, multiple/missing users, unmarked context and non-text system content fail explicit protocol admission',()=>{
  const invalid=[[user(),{...hidden(),author:{role:'developer'}}],[user(),{...hidden(),author:{role:'assistant'}}],[user(),{...hidden(),author:{role:'tool'}}],[user('a'),user('b')],[hidden()],[user(),{...hidden(),metadata:{is_visually_hidden_from_conversation:false}}],[user(),{...hidden(),metadata:{}}],[user(),{...hidden(),content:{content_type:'multimodal_text',parts:['No.']}}],[user(),{...hidden(),content:{content_type:'text',parts:[{url:'not text'}]}}]];
  for(const input of invalid)assert.throws(()=>parseClassicInputMessages(input),error=>error.status===400&&error.code==='LOCAL_INPUT_UNSUPPORTED');
});
test('duplicate/empty/oversized IDs and context budgets reject before admission',()=>{
  for(const input of [[user('same'),hidden('same')],[user(),hidden('')],[user(),hidden('x'.repeat(257))],[user(),hidden('one','a'.repeat(CLASSIC_CONTEXT_LIMITS.maxHiddenCharacters+1))],[user(),hidden('one','a'.repeat(32768)),hidden('two','b'.repeat(32768)),hidden('three','c')],[user(),...Array.from({length:9},(_,i)=>hidden('h'+i))]])assert.throws(()=>parseClassicInputMessages(input),error=>error.status===400);
  assert.equal(parseClassicInputMessages([user(),hidden('one','a'.repeat(32768)),hidden('two','b'.repeat(32768))]).hiddenCharacters,65536);
});
test('invalid body produces original structured HTTP400 before models or thread/persistence side effects',async()=>{
  let calls=0;const adapter=new ClassicChatAdapter({appServer:{dispatch(){calls++;throw Error('No dispatch should run')},persist(){calls++}},models:{getRpcModelList(){calls++;throw Error('No model access should run')}}});
  for(const messages of [[user('a'),user('b')],[user(),{...hidden(),metadata:{}}],[user('same'),hidden('same')],[user(),hidden('huge','a'.repeat(32769))]]){const response=adapter.stream(new Request('https://fixture.invalid/f/conversation'),{action:'next',model:'auto',messages});assert.equal(response.status,400);assert.equal((await response.json()).error.code,'LOCAL_INPUT_UNSUPPORTED');}assert.equal(calls,0);
});
test('valid Classic admission passes exact original records through one turn/start, with no synthetic second user turn',async()=>{
  let count=0;const records=[],thread={id:'neutral-thread',model:'gpt-6.1-sol',adapterMetadata:{},turns:[]};const appServer={threads:new Map([[thread.id,thread]]),getThread:()=>thread,persist(){},dispatch(method,params){records.push({method,params:clone(params)});if(method==='thread/start')return{result:{thread:{id:thread.id}}};if(method==='turn/start'){count++;return{result:{turn:{id:'neutral-turn',model:'gpt-6.1-sol',adapterMetadata:{}}}};}throw Error(method)}};
  class Capture extends ClassicChatAdapter{attachStream(_request,_thread,transaction){return this.json({turnId:transaction.result.turn.id})}}
  const adapter=new Capture({appServer,models:{getRpcModelList:()=>({data:[{isDefault:true,model:'gpt-6.1-sol'}]})}});
  const response=adapter.stream(new Request('https://fixture.invalid/f/conversation'),clone(golden));assert.equal(response.status,200);assert.equal(count,1);const turn=records.find(x=>x.method==='turn/start').params;assert.deepEqual(turn.classicInputMessages,golden.messages);assert.deepEqual(turn.classicUserMessage,golden.messages[0]);assert.equal(turn.input.filter(x=>x.type==='text').length,1);assert.equal(turn.input[0].text,golden.messages[0].content.parts[0]);
});
test('Classic detail and JSON-restored history retain hidden system mapping/ID and one visible user, in source order',()=>{
  const messages=[hidden('before'),user('source-user'),hidden('after')],turn={id:'turn',status:'completed',startedAt:1700000000,completedAt:1700000001,model:'gpt-6.1-sol',reasoningEffort:'low',adapterMetadata:{classicInputMessages:clone(messages),classicUserMessage:clone(messages[1])},items:[{type:'userMessage',id:'server-user-item',clientId:'source-user',content:[{type:'text',text:'Neutral visible request.'}]},{type:'agentMessage',id:'assistant',text:'Neutral fixture reply.'}]};const thread={id:'thread',name:'Neutral',createdAt:1700000000,updatedAt:1700000001,adapterMetadata:{classicRootId:'root',classicModelSlugs:{turn:'auto'}},turns:[turn]};const adapter=new ClassicChatAdapter({appServer:{},models:{}}),detail=adapter.detail(JSON.parse(JSON.stringify(thread))),flat=Object.values(detail.mapping).map(x=>x.message).filter(Boolean);assert.deepEqual(flat.map(x=>x.id),['before','source-user','after','assistant']);assert.equal(flat.filter(x=>x.author.role==='user').length,1);for(const message of flat.filter(x=>x.author.role==='system'))assert.deepEqual(message.metadata,messages.find(x=>x.id===message.id).metadata);assert.deepEqual(detail.mapping.root.children,['before']);assert.deepEqual(detail.mapping['source-user'].children,['after']);
});

test('a parent/root ID collision is rejected before model and new-thread side effects',async()=>{
  let effects=0;const adapter=new ClassicChatAdapter({appServer:{dispatch(){effects++;throw Error('Unexpected side effect')},persist(){effects++}},models:{getRpcModelList(){effects++;throw Error('Unexpected model lookup')}}});
  for(const parent of ['user-neutral','hidden-neutral']){const response=adapter.stream(new Request('https://fixture.invalid/f/conversation'),{action:'next',parent_message_id:parent,model:'auto',messages:[user(),hidden()]});assert.equal(response.status,400);assert.match((await response.json()).error.message,/parent/);}assert.equal(effects,0);
});
