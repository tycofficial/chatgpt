/** Original Search intent and native projection over genuine Responses hosted search. */
const copy = value => structuredClone(value);
const safeURL = value => { try { const u=new URL(value); return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null; } catch { return null; } };
export function nativeWebSearchHint() {
  return {system_hint:'search',name:'搜索网页',action_label:'搜索网页',aliases:[],required_features:[],required_models:[],required_conversation_modes:[],allow_in_temporary_chat:true,requires_personalization:false,description:''};
}
export function readWebSearchIntent(value={}) {
  const hints=value.systemHints??value.system_hints;
  return value.forceUseSearch===true||value.force_use_search===true||Array.isArray(hints)&&hints.includes('search')
    ? Object.freeze({enabled:true,required:true}) : null;
}
export function webSearchRequest(intent,items,tools=[]) {
  if(!intent?.enabled) return {tools};
  const all=tools.some(tool=>tool.type==='web_search')?tools:[...tools,{type:'web_search'}];
  const completed=items.some(item=>item.type==='webSearch'&&item.responseItem?.status==='completed');
  return {tools:all,toolChoice:intent.required&&!completed?{type:'allowed_tools',mode:'required',tools:[{type:'web_search'}]}:'auto'};
}
export function updateHostedSearch(server,running,result={}) {
  const rows=[...(result.web_search_calls??[]),...(result.response_items??[]).filter(item=>item.type==='web_search_call')];
  for(const raw of rows) {
    if(raw?.type!=='web_search_call'||typeof raw.id!=='string'||!raw.id) continue;
    const round=running.turn.adapterMetadata.checkpoint?.rounds??0;
    let item=running.turn.items.find(value=>value.type==='webSearch'&&value.providerCallId===raw.id&&value.round===round);
    if(!item){item={type:'webSearch',id:server.uuid(),providerCallId:raw.id,round,responseItem:null};running.turn.items.push(item);}
    const value=copy(raw),previous=item.responseItem,wasInterrupted=Boolean(item.interruption);
    if(previous?.status==='completed'&&value.status!=='completed') continue;
    if(JSON.stringify(previous)===JSON.stringify(value)&&!wasInterrupted) continue;
    delete item.interruption;
    item.responseItem=value;
    server.notify(previous?'item/webSearch/updated':'item/started',{threadId:running.thread.id,turnId:running.turn.id,item});
  }
}
export function interruptHostedSearch(server,running) {
  for(const item of running.turn.items.filter(value=>value.type==='webSearch'&&!value.interruption&&['in_progress','searching'].includes(value.responseItem?.status))) {
    item.interruption=running.controller.signal.aborted?'cancelled':'failed';
    server.notify('item/webSearch/updated',{threadId:running.thread.id,turnId:running.turn.id,item});
  }
}
export function hostedSearchMessage(thread,turn,item,modelSlug) {
  const raw=copy(item.responseItem),active=!item.interruption&&['in_progress','searching'].includes(raw.status);
  if(item.interruption) raw.status='failed';
  if(raw.status==='searching') raw.status='in_progress';
  return {id:item.id,author:{role:'assistant',name:null,metadata:{}},create_time:turn.startedAt,update_time:turn.completedAt??null,
    content:{content_type:'text',parts:[JSON.stringify(raw)]},status:active?'in_progress':raw.status==='completed'?'finished_successfully':'finished_partial_completion',
    end_turn:false,weight:1,recipient:'all',channel:'analysis',metadata:{model_slug:modelSlug,is_complete:!active,...(raw.status==='failed'?{is_error:true}:{}),...(item.interruption?{finish_details:{type:'interrupted',reason:item.interruption}}:{}),adapter_source:'responses-hosted-web-search'}};
}
/** Character offsets from output_text annotations; only actual provider URLs/titles. */
export function webSearchReferences(text,responseItems=[]) {
  const parts=responseItems.filter(item=>item.type==='message'&&item.role==='assistant').flatMap(item=>(item.content??[]).filter(part=>part.type==='output_text'));
  if(parts.map(part=>part.text??'').join('')!==text) return [];
  let offset=0;const groups=new Map();
  for(const part of parts) {
    const chars=Array.from(part.text??'');
    for(const annotation of part.annotations??[]) {
      if(annotation?.type!=='url_citation') continue;
      const url=safeURL(annotation.url),start=annotation.start_index,end=annotation.end_index;
      if(!url||!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<=start||end>chars.length) continue;
      const key=(offset+start)+':'+(offset+end),group=groups.get(key)??{start_idx:offset+start,end_idx:offset+end,matched_text:chars.slice(start,end).join(''),items:[]};
      if(!group.items.some(item=>item.url===url)) group.items.push({url,title:typeof annotation.title==='string'?annotation.title:undefined});
      groups.set(key,group);
    }
    offset+=chars.length;
  }
  const refs=[];
  for(const group of groups.values()) {
    if(refs.some(ref=>group.start_idx<ref.end_idx&&group.end_idx>ref.start_idx)) continue;
    const {items,...range}=group;
    refs.push(items.length===1?{type:'webpage',...range,...items[0]}:{type:'grouped_webpages',...range,items});
  }
  return refs;
}
export function mergeWebSearchReferences(existing,search) {
  const refs=Array.isArray(existing)?copy(existing):[];
  return refs.concat(search.filter(ref=>!refs.some(item=>Number.isInteger(item.start_idx)&&Number.isInteger(item.end_idx)&&ref.start_idx<item.end_idx&&ref.end_idx>item.start_idx)));
}
