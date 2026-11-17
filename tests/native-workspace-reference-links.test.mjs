import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {workspaceReferenceHost,identityA,identityB,artifactBaseURL} from './support/real-workspace-reference-host.mjs';
import {parseOriginalMarkdown} from './support/original-markdown.mjs';
import {originalFilePreparer,originalFilePreparerFixture} from './support/original-file-preparer.mjs';
globalThis.__CHATGPT_REPLICA_ENV__={basePath:'/chatgpt/'};globalThis.location={origin:new URL(artifactBaseURL).origin};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),decode=bytes=>new TextDecoder().decode(bytes),encode=value=>new TextEncoder().encode(value);
const rawSpan=(text,ref)=>Array.from(text).slice(ref.start_idx,ref.end_idx).join('');
function nativeNodes(text,type){const pending=[parseOriginalMarkdown(text)],result=[];while(pending.length){const node=pending.shift();if(node.type===type)result.push(node);pending.push(...(node.children??[]));}return result;}
const body=(occurrence,uri,definition='doc')=>'中文🙂 '+occurrence+'\n\n['+definition+']: <'+uri+'>';
for(const [kind,occurrence]of [['full','[Download][doc]'],['collapsed','[doc][]'],['shortcut','[doc]']])test('real create_file '+kind+' reference uses the exact native whole occurrence and unchanged original EGK5 preparer',async t=>{
 const e=await workspaceReferenceHost(t),made=await e.produce();made.item.text=body(occurrence,made.uri);const before=structuredClone(e.thread),io=structuredClone(e.metrics),refs=e.project(made);assert.equal(refs.length,1);const ref=refs[0],node=nativeNodes(made.item.text,'linkReference')[0];
 assert.equal(node.referenceType,kind);assert.equal(ref.start_idx,4);assert.equal(ref.end_idx,4+Array.from(occurrence).length);assert.equal(ref.matched_text,occurrence);assert.equal(rawSpan(made.item.text,ref),occurrence);assert.equal(ref.message_id,made.item.id);assert.equal(ref.sandbox_path,made.file.path);assert.equal('file_id' in ref,false);assert.deepEqual(e.thread,before);assert.deepEqual(e.metrics,io,'Presentation performs no file IO');
 const message={id:made.item.id,author:{role:'assistant'},content:{content_type:'text',parts:[made.item.text]},metadata:{content_references:refs},status:'finished_successfully',end_turn:true,recipient:'all'},messageBefore=JSON.stringify(message),prepared=originalFilePreparer(message),directive=':chatgpt-content-reference{index="0"}';
 assert.equal(originalFilePreparerFixture.originalUIExecuted,false);assert.equal(prepared.markdown,made.item.text.slice(0,node.position.start.offset)+directive+made.item.text.slice(node.position.end.offset));assert.equal(prepared.contentReferences.length,1);assert.equal(JSON.stringify(message),messageBefore);assert.ok(prepared.markdown.includes('[doc]: <'+made.uri+'>'));
 const proof=await e.source.resolve(made.spec);assert.equal(decode(proof.bytes),made.content);assert.equal(proof.sha256,sha(encode(made.content)));assert.equal(e.source.isCurrent(proof),true);
});

test('native identifier normalization, Unicode/escaped labels and escaped identifiers retain exact source slices',async t=>{
 const e=await workspaceReferenceHost(t),made=await e.produce(),samples=[['[a\\] &amp; b][ ReF   ID ]','ref id','ref id'],['[下载][文档 Α]','文档 α','文档 α'],['[Download][a\\]b]','a\\]b','a\\]b'],['[][doc]','doc','doc']];
 for(const[occurrence,definition,identifier]of samples){made.item.text=body(occurrence,made.uri,definition);const parsed=nativeNodes(made.item.text,'linkReference')[0];assert.equal(parsed.identifier,identifier);const refs=e.project(made);assert.equal(refs.length,1);assert.equal(refs[0].matched_text,occurrence);assert.equal(rawSpan(made.item.text,refs[0]),occurrence);assert.equal(refs[0].name,made.file.name);}
 assert.equal(e.metrics.read,0);
});

test('definitions before nested quote/list/emphasis occurrences with CRLF use original positions and leave definitions unchanged',async t=>{
 const e=await workspaceReferenceHost(t),made=await e.produce(),occurrence='[下载][doc]';made.item.text='[doc]: <'+made.uri+'>\r\n\r\n中文🙂\r\n\r\n> - **'+occurrence+'**';const before=made.item.text,ref=e.project(made)[0],node=nativeNodes(before,'linkReference')[0];assert.ok(ref);assert.equal(ref.start_idx,Array.from(before.slice(0,node.position.start.offset)).length);assert.equal(ref.end_idx,Array.from(before.slice(0,node.position.end.offset)).length);assert.equal(ref.matched_text,occurrence);assert.equal(made.item.text,before);assert.equal(e.metrics.read,0);
});

test('all duplicate native identifiers are skipped before URL/ownership filtering while independent inline links still work',async t=>{
 const e=await workspaceReferenceHost(t),a=await e.produce(),b=await e.produce({name:'other.md'}),definitionPairs=[['<'+a.uri+'>','<'+b.uri+'>'],['<'+a.uri+'>','<'+a.uri+'>'],['https://foreign.invalid/file.md','<'+a.uri+'>'],['<bad target with spaces>','<'+a.uri+'>']];
 for(const[first,second]of definitionPairs){b.item.text='[Download][doc]\n\n[doc]: '+first+'\n[DOC]: '+second;assert.equal(nativeNodes(b.item.text,'definition').filter(n=>n.identifier==='doc').length,2);assert.deepEqual(e.project(b),[]);b.item.text+='\n\n[Independent](<'+b.uri+'>)';const refs=e.project(b);assert.equal(refs.length,1);assert.equal(refs[0].matched_text,'[Independent](<'+b.uri+'>)');}
 assert.equal(e.metrics.read,0);
});

test('undefined reference, code/HTML/image reference and sandbox definition do not create new metadata',async t=>{
 const e=await workspaceReferenceHost(t),made=await e.produce(),tick=String.fromCharCode(96);made.item.text='[Unknown][missing]\n\n'+tick+'[Inline][doc]'+tick+'\n\n'+tick.repeat(3)+'md\n[Fenced][doc]\n[doc]: '+made.uri+'\n'+tick.repeat(3)+'\n\n<div>[HTML][doc]</div>\n\n![Image][doc]\n\n[Native][native]\n\n[doc]: <'+made.uri+'>\n[native]: sandbox:'+made.file.path;const before=made.item.text,types=new Set();const pending=[parseOriginalMarkdown(before)];while(pending.length){const node=pending.pop();types.add(node.type);pending.push(...(node.children??[]));}for(const type of ['inlineCode','code','html','imageReference'])assert.ok(types.has(type),type);assert.deepEqual(e.project(made),[]);assert.equal(made.item.text,before);assert.equal(e.metrics.read,0);
});

test('repeated full/collapsed/shortcut and an inline link preserve each ordered occurrence and share the existing link budget',async t=>{
 const e=await workspaceReferenceHost(t),made=await e.produce();made.item.text='🙂 [Full][doc] / [doc][] / [doc] / [Inline](<'+made.uri+'>)\n\n[doc]: <'+made.uri+'>';const refs=e.project(made);assert.equal(refs.length,4);assert.deepEqual(refs.map(x=>x.matched_text),['[Full][doc]','[doc][]','[doc]','[Inline](<'+made.uri+'>)']);for(let i=0;i<refs.length;i++){assert.equal(rawSpan(made.item.text,refs[i]),refs[i].matched_text);if(i)assert.ok(refs[i-1].end_idx<refs[i].start_idx);}assert.deepEqual(e.makeProjector({maxLinks:3}).forAssistant(made.context),[]);assert.deepEqual(e.project(made),refs);assert.equal(e.metrics.read,0);
});

test('boot-bound owner and parser-time or description-time account changes cannot authorize reference links',async t=>{
 const e=await workspaceReferenceHost(t),made=await e.produce();e.setIdentity(identityB);assert.deepEqual(e.project(made),[]);e.setIdentity(identityA);const parseChange=e.makeProjector({parseMarkdown:text=>{e.setIdentity(identityB);return parseOriginalMarkdown(text);}});assert.deepEqual(parseChange.forAssistant(made.context),[]);e.setIdentity(identityA);const descriptionChange=e.makeProjector({describeFile:spec=>{const proof=e.source.describe(spec);e.setIdentity(identityB);return proof;}});assert.deepEqual(descriptionChange.forAssistant(made.context),[]);assert.equal(e.metrics.read,0);
});

test('failed/incomplete/foreign producers and failed Python never borrow reference-definition authority',async t=>{
 for(const alter of [m=>{m.producer.status='failed';},m=>{m.producer.status='inProgress';},m=>{m.producer.result.isError=true;},m=>{m.producer.server='plugin';},m=>{m.producer.tool='write_file';}]){const e=await workspaceReferenceHost(t),made=await e.produce();alter(made);assert.deepEqual(e.project(made),[]);assert.equal(e.metrics.read,0);}
 const e=await workspaceReferenceHost(t),made=await e.produce({python:true});made.producer.result.isError=true;const before=e.metrics.read;assert.deepEqual(e.project(made),[]);assert.equal(e.metrics.read,before);
});

test('future producer, same-turn producer after assistant and duplicate actual message IDs cannot authorize reference links',async t=>{
 const e=await workspaceReferenceHost(t),first=await e.produce(),later=await e.produce({name:'future.md'});first.item.text=body('[Future][doc]',later.uri);assert.deepEqual(e.project(first),[]);later.turn.items=[later.item,later.producer];assert.deepEqual(e.project(later),[]);later.turn.items=[later.producer,later.item,{...later.item}];assert.deepEqual(e.project(later),[]);assert.equal(e.metrics.read,0);
});

test('real executor Python manifest/readback authorizes references; missing marker and tool-text JSON never do',async t=>{
 const e=await workspaceReferenceHost(t),made=await e.produce({python:true}),data=made.producer.result.structuredContent;assert.deepEqual(data.artifact_manifest,{version:1,source:'browser-workspace-written-files',algorithm:'sha256',verification:'write-readback'});assert.match(data.files[0].sha256,/^[0-9a-f]{64}$/);const before=structuredClone(e.metrics);assert.equal(e.project(made).length,1);assert.deepEqual(e.metrics,before);const proof=await e.source.resolve(made.spec);assert.equal(proof.sha256,data.files[0].sha256);assert.equal(decode(proof.bytes),made.content);delete data.artifact_manifest;assert.match(made.producer.result.content[0].text,/write-readback/);const reads=e.metrics.read;assert.deepEqual(e.project(made),[]);assert.equal(e.metrics.read,reads);
});

test('reference cards do not turn historical metadata into a byte promise after physical overwrite or deletion',async t=>{
 const e=await workspaceReferenceHost(t),first=await e.produce({content:'AAAA'}),old=e.project(first);await e.produce({content:'BBBB'});assert.deepEqual(e.project(first),old);const writes=e.metrics.write;await assert.rejects(e.source.resolve(first.spec),error=>error.status===409&&error.code.endsWith('VERSION_UNAVAILABLE'));assert.equal(e.metrics.write,writes);await e.remove('report.md');assert.deepEqual(e.project(first),old);await assert.rejects(e.source.resolve(first.spec),error=>error.status===404&&error.code.endsWith('FILE_NOT_FOUND'));assert.equal(e.metrics.write,writes);
});

test('definition URLs use unchanged exact-origin/path/version admission without aliases, fragments or URL ownership preselection',async t=>{
 const e=await workspaceReferenceHost(t),made=await e.produce();for(const uri of [made.uri.replace('reference-style.invalid','foreign.invalid'),made.uri+'?extra=1',made.uri+'#extra',made.uri.replace('/report.md','/%72eport.md'),made.uri.replace(e.thread.id,'different-thread'),made.uri.replace('/report.md','/sub/../report.md'),'blob:unknown']){made.item.text=body('[Download][doc]',uri);assert.deepEqual(e.project(made),[],uri);}made.item.text=body('[Relative][doc]',made.file.url);assert.equal(e.project(made).length,1);assert.equal(e.metrics.read,0);
});

test('same URL with a different descriptor path cannot impersonate its valid producer or authorize an unproduced URI',async t=>{
 const e=await workspaceReferenceHost(t),made=await e.produce(),other=await e.produce({name:'other.md'});other.producer.result.structuredContent.file.url=made.file.url;other.item.text=body('[Actual A][doc]',made.uri);const actual=e.project(other);assert.equal(actual.length,1);assert.equal(actual[0].sandbox_path,made.file.path);assert.notEqual(actual[0].sandbox_path,other.file.path,'A forged B descriptor cannot substitute B bytes for the independently valid A source');made.producer.result.structuredContent.file.url=made.file.url.replace('/report.md','/unproduced.md');other.item.text=body('[Unproduced][doc]',new URL(made.producer.result.structuredContent.file.url,artifactBaseURL).href);assert.deepEqual(e.project(other),[]);assert.equal(e.metrics.read,0);
});

test('issued references retain branded currentness and reject cloned or later-changed source metadata',async t=>{
 const e=await workspaceReferenceHost(t),made=await e.produce(),ref=e.project(made)[0],description=e.projector.getReferenceDescription(ref);assert.ok(description);assert.equal(description.bytesVerified,false);assert.equal(e.projector.getReferenceDescription({...ref}),null);const forged=e.makeProjector({describeFile:()=>({...description})});assert.deepEqual(forged.forAssistant(made.context),[]);made.item.text+=' changed';assert.equal(e.projector.getReferenceDescription(ref),null);made.item.text=made.item.text.slice(0,-8);const late=e.makeProjector({parseMarkdown:text=>{made.producer.arguments.content+=' changed';return parseOriginalMarkdown(text);}});assert.deepEqual(late.forAssistant(made.context),[]);assert.equal(e.metrics.read,0);
});

test('malformed reference positions, surrogate splits, cycles and oversized AST preserve bounded fail-closed behavior',async t=>{
 const e=await workspaceReferenceHost(t),made=await e.produce();made.item.text='🙂[Download][doc]\n\n[doc]: <'+made.uri+'>';const invalid=()=>{const ast=parseOriginalMarkdown(made.item.text);nativeNodes(made.item.text,'linkReference');ast.children[0].children.find(x=>x.type==='linkReference').position.start.offset=1;return ast;};assert.deepEqual(e.makeProjector({parseMarkdown:invalid}).forAssistant(made.context),[]);assert.deepEqual(e.makeProjector({maxNodes:1}).forAssistant(made.context),[]);const cycle={type:'root',children:[]};cycle.children.push(cycle);assert.deepEqual(e.makeProjector({parseMarkdown:()=>cycle}).forAssistant(made.context),[]);assert.deepEqual(e.makeProjector({parseMarkdown:()=>Promise.resolve({})}).forAssistant(made.context),[]);assert.equal(e.metrics.read,0);
});

test('actual Library publication dedup composes a reference occurrence without body/definition changes or a second appended card',async t=>{
 const e=await workspaceReferenceHost(t),made=await e.produce(),saved=await e.publish(made),before=structuredClone(e.thread),refs=e.composition.forAssistant(made.context);assert.equal(refs.length,1);assert.equal(refs[0].file_id,saved.receipt.rawFileId);assert.equal(refs[0].library_file_id,saved.receipt.fileId);assert.equal(refs[0].matched_text,'[Download][doc]');assert.equal('sandbox_path' in refs[0],false);assert.deepEqual(e.thread,before);const prepared=originalFilePreparer({id:made.item.id,author:{role:'assistant'},content:{content_type:'text',parts:[made.item.text]},metadata:{content_references:refs},status:'finished_successfully',end_turn:true});assert.equal(prepared.markdown.split(':chatgpt-content-reference{').length-1,1);assert.ok(prepared.markdown.includes('[doc]: <'+made.uri+'>'));const downloaded=await e.files.readFile(saved.receipt.rawFileId);assert.equal(sha(downloaded.bytes),saved.receipt.sha256);made.item.text='[First][doc] and [doc][]\n\n[doc]: <'+made.uri+'>';const repeated=e.composition.forAssistant(made.context);assert.equal(repeated.length,3,'The unchanged composer conservatively keeps two workspace spans and one unbound Library reference for an ambiguous multi-link association');
});

test('unlinked Python scratch outputs and automatic logs stay unenumerated despite reference definitions elsewhere',async t=>{
 const e=await workspaceReferenceHost(t),made=await e.produce({python:true,files:[{name:'report.md',bytes:encode('Visible')},{name:'scratch.bin',bytes:Uint8Array.of(1,2,3)}],stdout:'Neutral long log line.\n'.repeat(3000)}),data=made.producer.result.structuredContent;assert.ok(data.files.some(x=>x.name==='scratch.bin'));assert.ok(data.files.some(x=>x.path.includes('/.logs/')));const before=structuredClone(e.metrics),refs=e.project(made);assert.equal(refs.length,1);assert.equal(refs[0].name,'report.md');made.item.text='No file link.\n\n[doc]: <'+made.uri+'>';assert.deepEqual(e.project(made),[]);assert.deepEqual(e.metrics,before);
});

test('native prototype-looking identifiers resolve through a Map, not inherited object properties',async t=>{
 const e=await workspaceReferenceHost(t),made=await e.produce();for(const id of ['__proto__','constructor','toString']){made.item.text=body('[Download]['+id+']',made.uri,id);const refs=e.project(made);assert.equal(refs.length,1);assert.equal(refs[0].matched_text,'[Download]['+id+']');}assert.equal(e.metrics.read,0);
});
