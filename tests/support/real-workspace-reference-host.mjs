import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {durablePublicationHost} from './generated-publication-host.mjs';
import {parseOriginalMarkdown} from './original-markdown.mjs';
import {originalSHA256Bytes} from './original-sync-sha256.mjs';
import {createBrowserToolExecutor,workspacePath} from '../../src/native-client/browser-tool-executor.mjs';
import {createWorkspaceDownloadSource} from '../../src/native-client/local-workspace-download-source.mjs';
import {createNativeWorkspaceReferences} from '../../src/native-client/native-workspace-references.mjs';
import {createLocalFilesService} from '../../src/native-client/local-files-service.mjs';
import {createLocalLibraryService} from '../../src/native-client/local-library-service.mjs';
import {createLibraryPublishingExecutor,normalizePublicationReceipt} from '../../src/native-client/local-library-publisher.mjs';
import {createNativePublicationReferences} from '../../src/native-client/native-publication-references.mjs';
import {createNativeFileReferenceComposition} from '../../src/native-client/native-file-reference-composition.mjs';
export const identityA={accountId:'reference-style-owner-a',userId:'reference-style-user-a',accountUserId:null};
export const identityB={accountId:'reference-style-owner-b',userId:'reference-style-user-b',accountUserId:null};
export const artifactBaseURL='https://reference-style.invalid/chatgpt/';
export async function workspaceReferenceHost(t){
 const parent=path.resolve(process.env.GENERATED_PUBLICATION_TEST_TMPDIR??tmpdir());await fs.mkdir(parent,{recursive:true});const root=await fs.mkdtemp(path.join(parent,'native-reference-links-'));
 let identity=identityA,nextPython,sequence=0;const metrics={read:0,write:0,list:0,remove:0,pythonRuns:0},diagnostics=[],host=await durablePublicationHost(root,{accountId:identityA.accountId}),keys=new Set();
 for(const name of ['read','write','remove']){const original=host.storage[name].bind(host.storage);host.storage[name]=async(...args)=>{metrics[name]++;const result=await original(...args);if(name==='write')keys.add(args[0]);if(name==='remove')keys.delete(args[0]);return result;};}
 host.storage.list=async prefix=>{metrics.list++;const rows=[];for(const key of keys)if(key.startsWith(prefix+'/'))rows.push({name:key.slice(prefix.length+1),size:(await host.storage.read(key)).length});return rows;};
 // Only worker output transport is controlled. The unchanged executor writes,
 // hashes and reads real bytes back. This does not claim a Python engine run.
 class ControlledPythonOutput{async run(){metrics.pythonRuns++;return nextPython;}terminate(){}}
 const base=createBrowserToolExecutor({storage:host.storage,getWorkspaceNamespace:()=>identity?.accountId??'guest',PythonRuntime:ControlledPythonOutput,PYTHON_TOOL:{type:'function',function:{name:'python'}}});
 const thread={id:'reference-style-thread-'+randomUUID(),ephemeral:false,turns:[],adapterMetadata:{classicRootId:'reference-style-root',conversationOrigin:'tpp'}},threads=new Map([[thread.id,thread]]);
 const files=createLocalFilesService({...host,getAccountId:()=>identity?.accountId??null,getWorkspacePrefix:id=>base.getWorkspacePrefix(id),getOwnedSourceWorkspace:async({threadId,signal})=>{signal?.throwIfAborted();if(!identity||!threads.has(threadId))throw Object.assign(Error('Owned source required'),{status:404});return{accountId:identity.accountId,threadId,prefix:base.getWorkspacePrefix(threadId)};}});
 const library=createLocalLibraryService({files,metadataStorage:host.metadataStorage,getAccountId:()=>identity?.accountId??null});
 const tool=createLibraryPublishingExecutor({baseExecutor:base,publishGeneratedFile:files.publishGeneratedFile,getIdentity:()=>identity,resolvePublishedResource:library.resolvePublishedResource,ownsObjectURL:library.ownsObjectURL});
 const source=createWorkspaceDownloadSource({getIdentity:()=>identity,getThread:id=>threads.get(id),getWorkspacePrefix:id=>base.getWorkspacePrefix(id),storage:host.storage,workspacePath,artifactBaseURL,sha256Bytes:originalSHA256Bytes});
 const makeProjector=options=>createNativeWorkspaceReferences({getIdentity:()=>identity,getThread:id=>threads.get(id),parseMarkdown:parseOriginalMarkdown,describeFile:source.describe,isDescriptionCurrent:source.isDescriptionCurrent,onDiagnostic:event=>diagnostics.push(event),...options});
 const projector=makeProjector(),strict=createNativePublicationReferences({getIdentity:()=>identity,normalizeReceipt:normalizePublicationReceipt,ownsPublishedResource:library.ownsPublishedResource});
 const composition=createNativeFileReferenceComposition({getIdentity:()=>identity,getThread:id=>threads.get(id),publicationProjector:strict,workspaceProjector:projector,normalizeReceipt:normalizePublicationReceipt,describePublicationSource:files.describePublicationSource,isPublicationSourceCurrent:files.isPublicationSourceCurrent,getDescriptionSHA:source.getDescriptionSHA});
 async function produce({name='report.md',content='Real reference-style bytes 中文🙂.',python=false,files:outputFiles,stdout=''}={}){
  const n=++sequence,args=python?{code:'Controlled worker-output fixture; no genuine Python execution claim '+n}:{name,content},producer={id:'reference-style-tool-'+n,type:'mcpToolCall',server:'browser_workspace',tool:python?'python':'create_file',status:'inProgress',arguments:structuredClone(args)},turn={id:'reference-style-turn-'+n,status:'inProgress',items:[producer]};thread.turns.push(turn);
  if(python)nextPython={ok:true,stdout,stderr:'',result:'',files:outputFiles??[{name,bytes:new TextEncoder().encode(content)}]};
  producer.result=await tool.execute({id:producer.id,function:{name:producer.tool,arguments:JSON.stringify(args)}},{threadId:thread.id,turnId:turn.id});producer.status='completed';assert.equal(producer.result.isError,false);
  const file=python?producer.result.structuredContent.files.find(f=>f.name===name):producer.result.structuredContent.file;assert.ok(file);
  const uri=new URL(file.url,artifactBaseURL).href,item={id:'reference-style-assistant-'+n,type:'agentMessage',text:'[Download][doc]\n\n[doc]: <'+uri+'>',phase:'final_answer'};turn.items.push(item);turn.status='completed';
  return{producer,turn,item,file,uri,content,spec:{conversationId:thread.id,messageId:item.id,sandboxPath:file.path},context:{thread,turn,item}};
 }
 async function publish(made){const args={path:made.file.name,mime_type:made.file.mime},item={id:randomUUID(),type:'mcpToolCall',server:'browser_workspace',tool:'publish_file',status:'inProgress',arguments:args};made.turn.items.splice(made.turn.items.indexOf(made.item),0,item);item.result=await tool.execute({id:item.id,function:{name:'publish_file',arguments:JSON.stringify(args)}},{threadId:thread.id,turnId:made.turn.id});item.status='completed';assert.equal(item.result.isError,false);return{item,receipt:normalizePublicationReceipt(item.result.structuredContent,item.result.structuredContent.operationId)};}
 t.after(async()=>{base.dispose();library.dispose();const actual=await fs.realpath(root),relative=path.relative(parent,actual);assert.ok(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative)&&path.basename(actual).startsWith('native-reference-links-'));await fs.rm(actual,{recursive:true,force:true});});
 return{thread,threads,host,source,base,files,library,projector,strict,composition,metrics,diagnostics,produce,publish,makeProjector,project:made=>projector.forAssistant(made.context),setIdentity:value=>{identity=value;},write:(name,bytes)=>host.storage.write(base.getWorkspacePrefix(thread.id)+'/'+workspacePath(name),typeof bytes==='string'?new TextEncoder().encode(bytes):bytes),remove:name=>host.storage.remove(base.getWorkspacePrefix(thread.id)+'/'+workspacePath(name))};
}
