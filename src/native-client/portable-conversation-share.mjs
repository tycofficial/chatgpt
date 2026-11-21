/** Portable text snapshots for the original share REST contract; no cloud storage. */
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const failure=(code,message,status=400)=>Object.assign(Error(message),{code,status});
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
const digest=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(byte=>byte.toString(16).padStart(2,'0')).join('');
function encode(bytes){let text='';for(let start=0;start<bytes.length;start+=8192)text+=String.fromCharCode(...bytes.subarray(start,start+8192));return btoa(text).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');}
function decode(text){try{if(!/^[A-Za-z0-9_-]+$/.test(text))throw Error();return Uint8Array.from(atob(text.replaceAll('-','+').replaceAll('_','/')),character=>character.charCodeAt(0));}catch{throw failure('PORTABLE_SHARE_INVALID','The portable snapshot is malformed');}}
const identity=value=>object(value)&&typeof value.ownerId==='string'&&value.ownerId&&typeof value.accountId==='string'&&value.accountId?JSON.stringify([value.ownerId,value.accountId]):null;
const safeId=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/.test(value);
const shareUUID=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-5[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);
// The original bsEp.b requires a GUID; retain122 content-addressed checksum bits.
const idForDigest=hex=>hex.slice(0,8)+'-'+hex.slice(8,12)+'-5'+hex.slice(13,16)+'-'+(8+(parseInt(hex[16],16)&3)).toString(16)+hex.slice(17,20)+'-'+hex.slice(20,32);

function branchNodes(conversation,currentNode,limits){
 if(!object(conversation?.mapping)||!safeId(currentNode))throw failure('SHARE_NODE_NOT_FOUND','The selected conversation node is unavailable',404);
 const chain=[],seen=new Set();let id=currentNode;
 while(id!==null){if(!safeId(id)||seen.has(id)||chain.length>=limits.maxNodes)throw failure('SHARE_GRAPH_INVALID','The selected conversation branch is invalid');seen.add(id);const node=conversation.mapping[id];if(!object(node)||node.id!==id)throw failure('SHARE_NODE_NOT_FOUND','The selected conversation branch is unavailable',404);chain.push(node);id=node.parent??null;}
 return chain.reverse();
}

function selectedBranch(conversation, messageIds, limits) {
 if (!object(conversation?.mapping)) throw failure('SHARE_NODE_NOT_FOUND', 'The selected conversation is unavailable', 404);
 const requested = new Set(messageIds), found = new Map();
 for (const [id, node] of Object.entries(conversation.mapping)) {
  if (node?.id !== id || !object(node.message)) continue;
  for (const key of new Set([id, node.message.id])) {
   if (!requested.has(key)) continue;
   if (found.has(key) && found.get(key) !== id) throw failure('SHARE_SELECTION_INVALID', 'A selected message ID is ambiguous');
   found.set(key, id);
  }
 }
 if (found.size !== requested.size) throw failure('SHARE_NODE_NOT_FOUND', 'A selected message is unavailable', 404);
 const nodes = new Set(found.values());
 if (nodes.size !== requested.size) throw failure('SHARE_SELECTION_INVALID', 'Each selected message must be unique');
 let currentNode, ancestors = new Set();
 for (const node of nodes) {
  if (ancestors.has(node)) continue;
  const branch = new Set(branchNodes(conversation, node, limits).map(item => item.id));
  if (currentNode && !branch.has(currentNode)) throw failure('SHARE_SELECTION_INVALID', 'Selected messages must belong to one branch');
  currentNode = node;
  ancestors = branch;
 }
 return { currentNode, nodes };
}

function publicSnapshot(conversation,currentNode,limits,selection=null){
 const chain=branchNodes(conversation,currentNode,limits);
 const root=!selection&&chain[0]?.message==null?chain[0].id:'portable-root',mapping={[root]:{id:root,message:null,parent:null,children:[]}};let parent=root,count=0;
 for(const node of chain){const value=node.message;if(!value||selection&&!selection.nodes.has(node.id))continue;const role=value.author?.role;
  if(!['user','assistant'].includes(role)||value.metadata?.is_visually_hidden_from_conversation===true||role==='assistant'&&value.channel!=null&&value.channel!=='final')continue;
  if(selection&&(value.metadata?.clientOnlyMessage!=null||value.metadata?.isOptimistic===true||value.metadata?.is_thinking_preamble_message===true))continue;
  if(value.status==='in_progress')throw failure('SHARE_STILL_RUNNING','Wait for this response to finish before sharing',409);
  if(selection&&!['finished_successfully','finished_partial_completion'].includes(value.status))continue;
  const parts=value.content?.parts;if(!['text','multimodal_text'].includes(value.content?.content_type)||!Array.isArray(parts))continue;
  const text=parts.filter(part=>typeof part==='string').join('\n');if(!text)continue;
  if(text.length>limits.maxMessageCharacters||++count>limits.maxMessages)throw failure('PORTABLE_SHARE_TOO_LARGE','This conversation exceeds the portable-link limit',413);
  if(node.id===root||mapping[node.id])throw failure('SHARE_GRAPH_INVALID','The selected conversation branch is invalid');
  const message={id:node.id,author:{role,name:null,metadata:{}},content:{content_type:'text',parts:[text]},create_time:Number.isFinite(value.create_time)?value.create_time:null,update_time:null,status:value.status==='finished_partial_completion'?'finished_partial_completion':'finished_successfully',end_turn:role==='assistant'?value.end_turn!==false:null,recipient:'all',channel:role==='assistant'?'final':null,weight:1,metadata:{is_complete:true,adapter_source:'portable-conversation-text-snapshot'}};
  mapping[node.id]={id:node.id,message,parent,children:[]};mapping[parent].children.push(node.id);parent=node.id;
 }
 if(selection&&count!==selection.nodes.size)throw failure('SHARE_SELECTION_UNSUPPORTED','Only selected visible text messages can be shared',422);
 if(!count)throw failure('SHARE_TEXT_UNAVAILABLE','There is no supported conversation text to share',422);
 return{title:selection?selection.title:String(conversation.title??'New chat').slice(0,200),mapping,current_node:parent,create_time:!selection&&Number.isFinite(conversation.create_time)?conversation.create_time:null,update_time:!selection&&Number.isFinite(conversation.update_time)?conversation.update_time:null,is_read_only:true,is_temporary_chat:false,conversation_origin:!selection&&conversation.conversation_origin==='tpp'?'tpp':null,moderation_results:[],safe_urls:[],blocked_urls:[],async_status:null};
}

export function createPortableConversationShare({getIdentity,getConversation,baseURL,getLocation=()=>globalThis.location.href,limits={}}){
 const bounds={maxNodes:1000,maxMessages:200,maxMessageCharacters:20000,maxPayloadBytes:24000,maxURLCharacters:33000,...limits};
 const base=new URL(baseURL);if(!['http:','https:'].includes(base.protocol)||base.username||base.password||base.search||base.hash||!base.pathname.endsWith('/'))throw Error('An explicit site base URL is required');
 const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 function requireOwner(){
  const owner=identity(getIdentity());if(!owner)throw failure('SHARE_LOGIN_REQUIRED','Sign in before creating a share link',401);
  return owner;
 }
 async function ownedConversation(conversationId,owner,signal){
  signal?.throwIfAborted();const conversation=await getConversation(conversationId);if(identity(getIdentity())!==owner)throw failure('SHARE_OWNER_CHANGED','The active account changed',409);
  return conversation;
 }
 async function publish(conversation,currentNode,owner,signal,selection){
  const document=publicSnapshot(conversation,currentNode,bounds,selection),payload={version:1,kind:'portable-conversation',document};
  const bytes=encoder.encode(JSON.stringify(payload));if(bytes.length>bounds.maxPayloadBytes)throw failure('PORTABLE_SHARE_TOO_LARGE','This conversation exceeds the portable-link limit',413);
  const checksum=await digest(bytes);signal?.throwIfAborted();if(identity(getIdentity())!==owner)throw failure('SHARE_OWNER_CHANGED','The active account changed',409);
  const shareId=idForDigest(checksum),url=new URL('share/'+shareId,base);url.hash='snapshot='+encode(bytes);
  if(url.href.length>bounds.maxURLCharacters)throw failure('PORTABLE_SHARE_TOO_LARGE','This conversation exceeds the portable-link limit',413);
  return{share_id:shareId,share_url:url.href,current_node_id:currentNode,highlighted_message_id:null,is_anonymous:true,is_public:true,is_visible:true,title:document.title,moderation_state:{},adapter_source:'portable-url-snapshot',server_stored:false,file_bytes_included:false};
 }
 async function create(body,signal){
  const owner=requireOwner();
  if(!object(body)||Object.keys(body).some(key=>!['conversation_id','current_node_id','is_anonymous'].includes(key))||!safeId(body.conversation_id)||!safeId(body.current_node_id)||body.is_anonymous!==true)throw failure('SHARE_INPUT_INVALID','Unsupported share request');
  const conversation=await ownedConversation(body.conversation_id,owner,signal);
  return publish(conversation,body.current_node_id,owner,signal);
 }
 async function createPost(body, signal) {
  const owner = requireOwner();
  if (!object(body) || Object.keys(body).some(key => key !== 'attachments_to_create') ||
      !Array.isArray(body.attachments_to_create) || body.attachments_to_create.length !== 1) {
   throw failure('SHARE_INPUT_INVALID', 'Select one group of text messages to share');
  }
  const attachment = body.attachments_to_create[0];
  if (!object(attachment) || Object.keys(attachment).some(key => !['conversation_id','kind','message_ids'].includes(key)) ||
      !safeId(attachment.conversation_id) || !['message_slice','prompt'].includes(attachment.kind) ||
      !Array.isArray(attachment.message_ids) || !attachment.message_ids.length ||
      attachment.message_ids.length > bounds.maxMessages || !attachment.message_ids.every(safeId) ||
      new Set(attachment.message_ids).size !== attachment.message_ids.length ||
      attachment.kind === 'prompt' && attachment.message_ids.length !== 1) {
   throw failure('SHARE_INPUT_INVALID', 'Unsupported share request');
  }
  const conversation = await ownedConversation(attachment.conversation_id, owner, signal);
  const selection = selectedBranch(conversation, attachment.message_ids, bounds);
  const prompt = attachment.kind === 'prompt';
  if (prompt && conversation.mapping[selection.currentNode]?.message?.author?.role !== 'user') {
   throw failure('SHARE_SELECTION_UNSUPPORTED', 'Select a user prompt to share', 422);
  }
  const shared = await publish(conversation, selection.currentNode, owner, signal,
    { nodes: selection.nodes, title: prompt ? '共享提示词' : '共享消息' });
  return { post: { id: shared.share_id, permissions: { share_setting: 'public' }, permalink: shared.share_url } };
 }
 async function read(shareId){
  const location=new URL(getLocation());if(!shareUUID(shareId)||location.origin!==base.origin||location.pathname!==new URL('share/'+shareId,base).pathname||location.hash.length>bounds.maxURLCharacters)throw failure('PORTABLE_SHARE_NOT_FOUND','This portable share is unavailable',404);
  const hash=new URLSearchParams(location.hash.slice(1));if([...hash.keys()].length!==1||!hash.has('snapshot'))throw failure('PORTABLE_SHARE_INVALID','The portable snapshot is malformed');
  const bytes=decode(hash.get('snapshot'));if(bytes.length>bounds.maxPayloadBytes)throw failure('PORTABLE_SHARE_TOO_LARGE','This conversation exceeds the portable-link limit',413);
  if(idForDigest(await digest(bytes))!==shareId)throw failure('PORTABLE_SHARE_INVALID','The portable snapshot checksum does not match');
  let payload;try{payload=JSON.parse(decoder.decode(bytes));}catch{throw failure('PORTABLE_SHARE_INVALID','The portable snapshot is malformed');}
  if(!object(payload)||payload.version!==1||payload.kind!=='portable-conversation'||!object(payload.document))throw failure('PORTABLE_SHARE_INVALID','Unsupported portable snapshot');
  // Validate and rebuild every public field; never trust arbitrary decoded metadata.
  const document=publicSnapshot(payload.document,payload.document.current_node,bounds);
  return{...document,conversation_id:shareId,shared_conversation_id:shareId,is_read_only:true,is_public:true,is_indexable:false,has_user_editable_context:false,continue_conversation_url:'/share/'+shareId+'/continue',linear_conversation:Object.values(document.mapping),moderation_state:{},adapter_source:'portable-url-snapshot',server_stored:false,file_bytes_included:false};
 }
 return{create,read,async handle(request,pathname=new URL(request.url).pathname){
  try{
   if(request.method==='POST'&&['/share/create','/share/v2/create'].includes(pathname))return json(await create(await request.json(),request.signal));
   if(request.method==='POST'&&pathname==='/share/post')return json(await createPost(await request.json(),request.signal));
   const match=/^\/share\/([a-f0-9-]{36})$/.exec(pathname);if(match&&shareUUID(match[1])&&request.method==='GET')return json(await read(match[1]));
   if(match&&['PATCH','DELETE'].includes(request.method))return json({error:{code:'PORTABLE_SHARE_IMMUTABLE',message:'A portable snapshot is immutable and cannot be revoked on a server'}},405);
   return null;
  }catch(error){if(error.name==='AbortError')throw error;return json({error:{code:error.code??'SHARE_UNAVAILABLE',message:error.code?error.message:'The share link could not be created or read'}},error.status??503);}
 }};
}
