import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {createPortableConversationShare} from '../src/native-client/portable-conversation-share.mjs';

// No schema substitutes: bsEp and the entire real Zod closure below execute
// unmodified public factory bodies verified by exact SHA-256. The original CKur
// shared-query callback uses transparent constructor carriers plus explicit host
// request/install observers; this is no React/Scope/QueryClient rendering proof.
const repository=process.env.SHARE_VALIDATOR_REPOSITORY_ROOT??path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=value=>createHash('sha256').update(value).digest('hex');
const originalInputs=JSON.parse(await fs.readFile(new URL('./support/native-portable-share-factories.json',import.meta.url),'utf8'));
const records=new Map(originalInputs.map(row=>[row.id,row]));
const schemaIds=originalInputs.filter(row=>row.id!=='CKur').map(row=>row.id);
const factorySources=new Map(),bundles=new Map();
for(const row of originalInputs){
 assert(row.file.startsWith('original-client/public/chatgpt.com/cdn/assets/')&&!row.file.includes('..'));
 let text=bundles.get(row.file);if(text==null){text=await fs.readFile(path.join(repository,row.file),'utf8');bundles.set(row.file,text);}
 const source=text.slice(row.startUTF16,row.endUTF16);assert.equal(sha(source),row.sha256,'Exact original factory changed: '+row.id);factorySources.set(row.id,source);
}
const context=vm.createContext({URL,TextEncoder,TextDecoder,AbortController,AbortSignal,DOMException,Date,setTimeout,clearTimeout,console});
const factories=new Map([...factorySources].map(([id,source])=>[id,new vm.Script('('+(records.get(id).format==='method'?'function ':'')+source+')',{filename:records.get(id).file+'#'+id}).runInContext(context)]));
function define(exports,getters={},values={}){for(const[key,get]of Object.entries(getters))Object.defineProperty(exports,key,{enumerable:true,get});for(const[key,value]of Object.entries(values))Object.defineProperty(exports,key,{enumerable:true,value});}
const modules=new Map();
function pure(id){if(modules.has(id))return modules.get(id).exports;assert(schemaIds.includes(id),'No schema dependency stubs permitted: '+id);const module={exports:{}};modules.set(id,module);factories.get(id)(module,module.exports,pure);return module.exports;}
pure.d=define;pure.o=(value,key)=>Object.hasOwn(value,key);pure.r=exports=>Object.defineProperty(exports,'__esModule',{value:true});pure.n=module=>{const get=module?.__esModule?()=>module.default:()=>module;Object.defineProperty(get,'a',{get});return get;};
const bsEp=pure('bsEp');
assert.equal(modules.size,schemaIds.length,'The complete original schema dependency closure must execute');
const base='https://neutral-share.fixture/chatgpt/';
const threadId='11111111-1111-4111-8111-111111111111',userId='22222222-2222-4222-8222-222222222222',answerId='33333333-3333-4333-8333-333333333333';
const node=(id,role,text,parent,children=[])=>({id,parent,children,message:{id,author:{role,name:null,metadata:{}},content:{content_type:'text',parts:[text]},status:'finished_successfully',channel:role==='assistant'?'final':null,end_turn:role==='assistant',metadata:{}}});
const conversation={title:'中性便携分享',mapping:{root:{id:'root',parent:null,children:[userId],message:null},[userId]:node(userId,'user','中性问题 😀','root',[answerId]),[answerId]:node(answerId,'assistant','中性答案，仅公开文字。',userId)},current_node:answerId};
let creatorReads=0;
const creator=createPortableConversationShare({baseURL:base,getIdentity:()=>({ownerId:'neutral-owner',accountId:'neutral-account'}),getConversation:id=>{assert.equal(id,threadId);creatorReads++;return conversation;}});
let acknowledgement,readDTO,reader;
await test('Canonical create acknowledgement share_id passes unchanged original bsEp.b GUID validator',async()=>{
 const request=new Request(base+'__codex-api/share/v2/create',{method:'POST',body:JSON.stringify({conversation_id:threadId,current_node_id:answerId,is_anonymous:true})});
 const response=await creator.handle(request,'/share/v2/create');assert.equal(response.status,200);acknowledgement=await response.json();assert.equal(bsEp.b(acknowledgement.share_id),acknowledgement.share_id);assert.equal(bsEp.a(threadId),threadId);assert.equal(creatorReads,1);assert.equal(acknowledgement.server_stored,false);
});
await test('Independent anonymous canonical reader DTO passes unchanged original bsEp.c response validator',async()=>{
 assert(acknowledgement);reader=createPortableConversationShare({baseURL:base,getIdentity:()=>null,getConversation:()=>{throw Error('Recipient must not read creator device data');},getLocation:()=>acknowledgement.share_url});
 const response=await reader.handle(new Request(base+'__codex-api/share/'+acknowledgement.share_id),'/share/'+acknowledgement.share_id);assert.equal(response.status,200);readDTO=await response.json();assert.equal(bsEp.c(readDTO,acknowledgement.share_id),undefined);assert.equal(readDTO.mapping[answerId].message.content.parts[0],'中性答案，仅公开文字。');assert.equal(creatorReads,1);
});
await test('Original GUID and conversation identifier validators reject malformed identifiers',()=>{
 for(const value of ['p_'+'a'.repeat(64),'not-a-guid','',null,{},'a/b'])assert.throws(()=>bsEp.b(value));
 for(const value of ['a/b','space id','https://neutral.example',null,{}])assert.throws(()=>bsEp.a(value));
});
await test('Every original required share response field is independently enforced by real Zod closure',()=>{
 assert(readDTO);for(const field of ['conversation_id','continue_conversation_url','has_user_editable_context','is_indexable','is_public','linear_conversation','moderation_state']){const broken=structuredClone(readDTO);delete broken[field];assert.throws(()=>bsEp.c(broken,acknowledgement.share_id),undefined,field);}
 for(const [field,value] of [['conversation_id',''],['has_user_editable_context','false'],['linear_conversation',{}],['moderation_state',null]]){const broken={...readDTO,[field]:value};assert.throws(()=>bsEp.c(broken,acknowledgement.share_id),undefined,field);}
});
await test('Original continuation URL security/path contract rejects wrong id, protocol, credentials, query and fragment',()=>{
 const id=acknowledgement.share_id;for(const url of ['/share/other/continue','javascript:alert(1)','https://user:pass@neutral.example/share/'+id+'/continue','/share/'+id+'/continue?x=1','/share/'+id+'/continue#x','/chatgpt/share/'+id+'/continue'])assert.throws(()=>bsEp.c({...readDTO,continue_conversation_url:url},id));
 for(const url of ['/share/'+id+'/continue','/share/e/'+id+'/continue','https://neutral.example/share/'+id+'/continue'])assert.equal(bsEp.c({...readDTO,continue_conversation_url:url},id),undefined);
});

// Boundary carriers only capture original query-factory callbacks. They do not
// substitute validators or execute React/Scope/QueryClient state machinery.
const carrier=(scope,factory)=>Object.freeze({scope,factory});
const BolX=Object.fromEntries(['u','q','d','c','r'].map(key=>[key,carrier]));
let responseTransform=value=>value;const requestLog=[],installed=[];
const dependencies=Object.fromEntries(records.get('CKur').requires.map(id=>[id,{}]));
Object.assign(dependencies,{Q840:BolX,OWtl:{a:Symbol('neutral-application-scope')},bsEp,rvFo:{b:{ONE_MINUTE:60000,INFINITE:Infinity}},dQRk:{mc:(scope,data)=>{assert.equal(scope,scopeFixture);installed.push(data);}},Kwur:{Request:{safeGet:async(template,options)=>{
 assert.equal(template,'/share/{shared_conversation_id}');assert.equal(options.redirect,'error');assert(options.signal instanceof AbortSignal);options.signal.throwIfAborted();
 const id=options.parameters.path.shared_conversation_id;requestLog.push({template,id,redirect:options.redirect});
 const response=await reader.handle(new Request(base+'__codex-api/share/'+id,{signal:options.signal}),'/share/'+id);assert.equal(response.status,200);return responseTransform(await response.json());
}}}});
const requireRoute=id=>{assert(Object.hasOwn(dependencies,id),'Unexpected isolated route dependency '+id);return dependencies[id];};requireRoute.d=define;requireRoute.n=pure.n;
const routeModule={exports:{}};factories.get('CKur')(routeModule,routeModule.exports,requireRoute);
const scopeFixture=Object.freeze({kind:'isolated-share-query-host'});
await test('Unchanged original CKur.n shared-route query consumes real canonical anonymous GET and forwards validated complete mapping',async()=>{
 const query=routeModule.exports.n.factory(acknowledgement.share_id,{scope:scopeFixture});assert.equal(query.enabled,true);assert.equal(query.retry,false);assert.equal(JSON.stringify(query.queryKey),JSON.stringify(['chatgpt-shared-conversation',acknowledgement.share_id]));
 const before=requestLog.length,answer=await query.queryFn({signal:new AbortController().signal});assert.equal(requestLog.length,before+1);assert.equal(installed.at(-1),answer);assert.equal(answer.current_node,answerId);assert.equal(answer.mapping[userId].children[0],answerId);assert.equal(creatorReads,1);assert.equal(bsEp.c(answer,acknowledgement.share_id),undefined);
});
await test('Unchanged shared-route query rejects missing native field before mapping-install callback',async()=>{
 const before=installed.length;responseTransform=value=>{delete value.is_public;return value;};try{const query=routeModule.exports.n.factory(acknowledgement.share_id,{scope:scopeFixture});await assert.rejects(query.queryFn({signal:new AbortController().signal}),/Invalid shared conversation response/);assert.equal(installed.length,before);}finally{responseTransform=value=>value;}
});
await test('Null/invalid share IDs and already-aborted original query make no host read or state install',async()=>{
 const before=requestLog.length,priorInstalls=installed.length;const empty=routeModule.exports.n.factory(null,{scope:scopeFixture});assert.equal(empty.enabled,false);assert.equal(await empty.queryFn({signal:new AbortController().signal}),null);
 await assert.rejects(routeModule.exports.n.factory('bad',{scope:scopeFixture}).queryFn({signal:new AbortController().signal}),/Invalid shared conversation identifier/);
 const controller=new AbortController();controller.abort();await assert.rejects(routeModule.exports.n.factory(acknowledgement.share_id,{scope:scopeFixture}).queryFn({signal:controller.signal}),{name:'AbortError'});assert.equal(requestLog.length,before);assert.equal(installed.length,priorInstalls);
});

