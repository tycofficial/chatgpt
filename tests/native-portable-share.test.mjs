import test from 'node:test';
import assert from 'node:assert/strict';
import {createPortableConversationShare} from '../src/native-client/portable-conversation-share.mjs';
const base='https://neutral.example/chatgpt/';
const makeMessage=(id,role,text,extra={})=>({id,message:{id,author:{role},content:{content_type:'text',parts:[text]},status:'finished_successfully',end_turn:role==='assistant',channel:role==='assistant'?'final':null,...extra},parent:null,children:[]});
function conversation(){const root={id:'root',message:null,parent:null,children:['system']},system=makeMessage('system','system','Private internal instructions.'),user=makeMessage('user','user','中性问题 😀'),tool=makeMessage('tool','tool','Private raw tool bytes'),answer=makeMessage('answer','assistant','中性答案。');system.parent='root';system.children=['user'];user.parent='system';user.children=['tool'];tool.parent='user';tool.children=['answer'];answer.parent='tool';answer.message.metadata={secret:'do-not-copy',content_references:[{file_id:'private-file'}]};return{title:'中性分享',mapping:{root,system,user,tool,answer},current_node:'answer',accountId:'must-not-copy',apiKey:'must-not-copy'};}
const request=body=>new Request(base+'__codex-api/share/v2/create',{method:'POST',body:JSON.stringify(body)});
const input={conversation_id:'owned-thread',current_node_id:'answer',is_anonymous:true};

test('original native create contract yields a portable URL read on an independent unauthenticated device',async()=>{
 const first=createPortableConversationShare({baseURL:base,getIdentity:()=>({ownerId:'site-admin',accountId:'local'}),getConversation:()=>conversation()});
 const response=await first.handle(request(input),'/share/v2/create');assert.equal(response.status,200);const ack=await response.json();assert.equal(ack.server_stored,false);assert.equal(ack.is_public,true);assert.equal(ack.is_visible,true);assert.equal(ack.current_node_id,'answer');
 const second=createPortableConversationShare({baseURL:base,getIdentity:()=>null,getConversation:()=>{throw Error('Reader must not access creator data');},getLocation:()=>ack.share_url});
 assert.match(ack.share_id,/^[a-f0-9]{8}-[a-f0-9]{4}-5[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
 const result=await (await second.handle(new Request(base+'__codex-api/share/'+ack.share_id),'/share/'+ack.share_id)).json();assert.equal(result.is_read_only,true);assert.equal(result.mapping.user.message.content.parts[0],'中性问题 😀');assert.equal(result.mapping.answer.message.content.parts[0],'中性答案。');assert.deepEqual(result.mapping.user.children,['answer']);assert.equal(result.continue_conversation_url,'/share/'+ack.share_id+'/continue');assert.equal(result.has_user_editable_context,false);assert.equal(result.is_indexable,false);assert.equal(result.is_public,true);assert.ok(Array.isArray(result.linear_conversation));assert.deepEqual(result.moderation_results,[]);
 assert.deepEqual(result.moderation_state,{});const serialized=JSON.stringify(result);for(const secret of ['must-not-copy','Private internal','Private raw','do-not-copy','private-file'])assert.ok(!serialized.includes(secret));
});

test('the selected parent branch alone is shared, not later or sibling answers',async()=>{
 const data=conversation();data.mapping.other=makeMessage('other','assistant','Unselected sibling');data.mapping.other.parent='user';data.mapping.user.children.push('other');
 const service=createPortableConversationShare({baseURL:base,getIdentity:()=>({ownerId:'site-admin',accountId:'local'}),getConversation:()=>data});const ack=await service.create(input);const decoded=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(new URL(ack.share_url).hash.slice('#snapshot='.length).replaceAll('-','+').replaceAll('_','/')),x=>x.charCodeAt(0))));assert.ok(!JSON.stringify(decoded).includes('Unselected sibling'));
});

test('owner switch while resolving prevents creation; no public URL is returned',async()=>{
 let owner='a';const service=createPortableConversationShare({baseURL:base,getIdentity:()=>({ownerId:owner,accountId:owner}),getConversation:async()=>{owner='b';return conversation();}});const response=await service.handle(request(input),'/share/v2/create');assert.equal(response.status,409);assert.equal((await response.json()).error.code,'SHARE_OWNER_CHANGED');
});

test('anonymous creation, malformed graph and in-progress answer fail visibly',async()=>{
 const none=createPortableConversationShare({baseURL:base,getIdentity:()=>null,getConversation:()=>conversation()});assert.equal((await none.handle(request(input),'/share/create')).status,401);
 for(const mutate of [c=>{c.mapping.answer.parent='answer';},c=>{c.mapping.answer.message.status='in_progress';}]){const c=conversation();mutate(c);const service=createPortableConversationShare({baseURL:base,getIdentity:()=>({ownerId:'a',accountId:'a'}),getConversation:()=>c});assert.ok((await service.handle(request(input),'/share/create')).status>=400);}
});

test('corrupt payload, oversized URL and unknown body fields do not claim a share was saved',async()=>{
 const service=createPortableConversationShare({baseURL:base,getIdentity:()=>({ownerId:'a',accountId:'a'}),getConversation:()=>conversation(),limits:{maxURLCharacters:20}});assert.equal((await service.handle(request(input),'/share/create')).status,413);
 const invalid='00000000-0000-5000-8000-000000000000',reader=createPortableConversationShare({baseURL:base,getIdentity:()=>null,getConversation:()=>null,getLocation:()=>base+'share/'+invalid+'#snapshot=YWJj'});await assert.rejects(reader.read(invalid),{code:'PORTABLE_SHARE_INVALID'});
 const normal=createPortableConversationShare({baseURL:base,getIdentity:()=>({ownerId:'a',accountId:'a'}),getConversation:()=>conversation()});assert.equal((await normal.handle(request({...input,ownerId:'forged'}),'/share/create')).status,400);
});

test('portable snapshots are explicitly immutable rather than fake server revocation',async()=>{
 const id='aaaaaaaa-aaaa-5aaa-8aaa-aaaaaaaaaaaa',service=createPortableConversationShare({baseURL:base,getIdentity:()=>null,getConversation:()=>null});const result=await service.handle(new Request(base+'share/'+id,{method:'DELETE'}),'/share/'+id);assert.equal(result.status,405);assert.equal((await result.json()).error.code,'PORTABLE_SHARE_IMMUTABLE');
});
