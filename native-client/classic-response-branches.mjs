/** Real Classic response variants, with a new execution turn and a shared prompt node. */
const requests=new WeakMap();
const clone=value=>structuredClone(value);
const error=(code,message,status=400)=>Object.assign(Error(message),{code,status});
const identity=value=>value&&typeof value.ownerId==='string'&&value.ownerId&&typeof value.accountId==='string'&&value.accountId?JSON.stringify([value.ownerId,value.accountId]):null;
const branchOf=turn=>turn.adapterMetadata?.classicResponseBranch;
function ancestry(thread,target){
 const prior=new Map(),seen=new Set();let path=[];
 for(const turn of thread.turns){
  if(!turn?.id||seen.has(turn.id))throw error('CLASSIC_BRANCH_INVALID','Conversation turn IDs are invalid',409);seen.add(turn.id);
  const branch=branchOf(turn);
  if(branch){if(branch.version!==1||!['regenerate','next'].includes(branch.kind)||!Array.isArray(branch.ancestorTurnIds)||new Set(branch.ancestorTurnIds).size!==branch.ancestorTurnIds.length||branch.ancestorTurnIds.some(id=>!prior.has(id)))throw error('CLASSIC_BRANCH_INVALID','The saved response branch is invalid',409);path=[...branch.ancestorTurnIds];}
  if(turn.id===target.id)return{before:[...path],including:[...path,turn.id]};
  path.push(turn.id);prior.set(turn.id,turn);
 }
 throw error('CLASSIC_BRANCH_INVALID','The response turn is missing',409);
}
/** Core reads only a request branded by this host module, never a JSON body field. */
export const readClassicBranchRequest=params=>requests.has(params)?clone(requests.get(params)):null;
export function getClassicExecutionThread(thread,turn){
 if(!thread.turns.some(entry=>branchOf(entry)))return thread;
 const ids=ancestry(thread,turn).including,map=new Map(thread.turns.map(entry=>[entry.id,entry]));
 return{...thread,turns:ids.map(id=>map.get(id))};
}
export function projectClassicBranchGraph(thread,baseDetail,projectItem){
 const root=thread.adapterMetadata.classicRootId??'local-root-'+thread.id,mapping={[root]:{id:root,message:null,parent:null,children:[]}},nodeTurns=new Map();let current=root;
 for(const turn of thread.turns){
  const branch=branchOf(turn);if(branch)ancestry(thread,turn);
  let parent=branch?.parentMessageId??current;if(!mapping[parent])throw error('CLASSIC_BRANCH_INVALID','The saved parent node is unavailable',409);
  for(const item of turn.items){
   if(branch?.kind==='regenerate'&&item.type==='userMessage')continue;
   for(const message of projectItem(thread,turn,item)){
    if(!message?.id||mapping[message.id])throw error('CLASSIC_BRANCH_INVALID','A conversation message ID was reused',409);
    mapping[message.id]={id:message.id,message,parent,children:[]};mapping[parent].children.push(message.id);nodeTurns.set(message.id,turn.id);parent=message.id;
   }
  }
  current=parent;
 }
 return{detail:{...baseDetail,mapping,current_node:current},nodeTurns};
}

export function createClassicResponseActions({appServer,classic,models,getIdentity,uuid=()=>crypto.randomUUID()}){
 const originalDetail=classic.detail.bind(classic),originalProject=classic.projectItem.bind(classic),originalMessage=classic.message.bind(classic);
 const graph=thread=>projectClassicBranchGraph(thread,originalDetail(thread),originalProject);
 const assertOwner=owner=>{if(!owner||identity(getIdentity())!==owner)throw error('CONVERSATION_OWNER_CHANGED','The active account is unavailable',401);};
 const admit=thread=>{if(!thread||typeof thread.adapterMetadata?.classicRootId!=='string'||!thread.adapterMetadata.classicRootId||!([null,undefined,'tpp','flora'].includes(thread.adapterMetadata.conversationOrigin)))throw error('CLASSIC_ACTION_UNSUPPORTED','This action applies to original Chat/Work conversations only',422);if(appServer.running.has(thread.id))throw error('CONVERSATION_BUSY','Wait for this response to finish',409);};
 function dispatch(thread,params,metadata,owner){
  assertOwner(owner);admit(thread);const before=clone(thread);requests.set(params,clone(metadata));
  try{
   const transaction=appServer.dispatch('turn/start',params),turn=appServer.getThread(thread.id).turns.find(entry=>entry.id===transaction.result.turn.id);
   if(!branchOf(turn))throw error('CLASSIC_BRANCH_SEAM_MISSING','The branch execution seam is not installed',503);
   assertOwner(owner);return transaction;
  }catch(cause){
   const running=appServer.running.get(thread.id);if(running&&running.turn.id!==before.turns.at(-1)?.id)appServer.running.delete(thread.id);
   appServer.threads.set(thread.id,before);try{appServer.persist();}catch{}
   throw cause;
  }finally{requests.delete(params);}
 }
 function dispatchNext(thread,params,parentMessageId){
  const owner=identity(getIdentity());assertOwner(owner);admit(thread);const {detail,nodeTurns}=graph(thread),parent=parentMessageId??detail.current_node;
  if(!detail.mapping[parent])throw error('CLASSIC_BRANCH_PARENT','The selected conversation parent is unavailable',404);
  const parentTurnId=nodeTurns.get(parent),source=parentTurnId?thread.turns.find(turn=>turn.id===parentTurnId):null;
  const ancestors=source?ancestry(thread,source).including:[];
  return dispatch(thread,params,{version:1,kind:'next',parentMessageId:parent,ancestorTurnIds:ancestors},owner);
 }
 async function handle(request,body){
  if(body?.action!=='variant'||body.regeneration_source==='error_retry')return null;
  try{
   const owner=identity(getIdentity());assertOwner(owner);request.signal?.throwIfAborted();
   if(typeof body.conversation_id!=='string'||typeof body.parent_message_id!=='string'||body.messages!=null&&(!Array.isArray(body.messages)||body.messages.length))throw error('REGENERATION_INPUT_UNSUPPORTED','Regeneration accepts an existing prompt without a new user message',422);
   if(Object.keys(body).some(key=>/^(?:branching_|continue_from_|shared_|rewrite_|business_agent|gizmo_|map_search|codex_config)/.test(key)&&body[key]!=null&&body[key]!==false))throw error('REGENERATION_CONTEXT_UNSUPPORTED','This regeneration context is not implemented',422);
   const thread=appServer.getThread(body.conversation_id);admit(thread);
   const source=thread.turns.filter(turn=>turn.clientUserMessageId===body.parent_message_id);
   if(source.length!==1)throw error('REGENERATION_PROMPT_NOT_FOUND','The original prompt is missing or ambiguous',404);
   const old=source[0];if(old.status==='inProgress')throw error('CONVERSATION_BUSY','Wait for this response to finish',409);
   const original=old.adapterMetadata.classicInputMessages??(old.adapterMetadata.classicUserMessage?[old.adapterMetadata.classicUserMessage]:null);
   if(!original)throw error('REGENERATION_INPUT_UNSUPPORTED','The original input records are unavailable',422);
   const messages=clone(original).map(message=>({...message,id:uuid()})),user=messages.find(message=>message.author?.role==='user');if(!user)throw error('REGENERATION_INPUT_UNSUPPORTED','The original user input is unavailable',422);
   const decoded=classic.decodeModelRequest({...body,model:body.model??old.adapterMetadata?.frontendModelSlug??old.model},thread);
   const params={...decoded,effort:decoded.effort??(body.model==null?old.reasoningEffort:undefined),threadId:thread.id,input:user.content.parts.map(part=>typeof part==='string'?{type:'text',text:part,text_elements:[]}:{type:'image',url:part.asset_pointer}),classicUserMessage:user,classicInputMessages:messages,clientUserMessageId:user.id,serviceTier:body.service_tier??body.serviceTier??old.serviceTier,systemHints:Array.isArray(body.system_hints)?body.system_hints:[],forceUseSearch:body.force_use_search===true||(body.force_use_search==null&&!Array.isArray(body.system_hints)&&old.adapterMetadata?.webSearchIntent?.enabled===true),responsesapiClientMetadata:{adapterOrigin:'classic-chat-rest'}};
   const selected=appServer.selection(params,thread),metadata={version:1,kind:'regenerate',sourceTurnId:old.id,parentMessageId:body.parent_message_id,ancestorTurnIds:ancestry(thread,old).before,frontendSlug:selected.frontendModelSlug};
   const transaction=dispatch(thread,params,metadata,owner),created=appServer.getThread(thread.id);
   return classic.attachStream(request,created,transaction);
  }catch(cause){if(cause.name==='AbortError')throw cause;return classic.json({error:{code:cause.code??'REGENERATION_FAILED',message:cause.code?cause.message:'The answer could not be regenerated'}},cause.status??503);}
 }
 return{handle,dispatchNext,detail:thread=>graph(thread).detail,message(thread,turn,item,role){const result=originalMessage(thread,turn,item,role);if(branchOf(turn)?.frontendSlug)result.metadata.model_slug=branchOf(turn).frontendSlug;return result;},projectItem(thread,turn,item){return branchOf(turn)?.kind==='regenerate'&&item.type==='userMessage'?[]:originalProject(thread,turn,item);},capabilities:Object.freeze({regeneration:'new-turn-shared-prompt-branch',privateCheckpointRetry:false,moreMenuFork:false,providerCallsAreReal:true})};
}
