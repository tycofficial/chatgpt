export const WEB_TOOL={type:'function',function:{name:'search_web',description:'Search live web sources through the configured provider Responses web_search tool. Use for recent facts, research and URLs. Returns findings and source links; do not claim success if the service reports an error.',parameters:{type:'object',properties:{query:{type:'string'}},required:['query'],additionalProperties:false}}};

export async function searchWeb(settings,query,signal){
  const base=settings.apiBase.trim().replace(/\/+$/,'').replace(/\/v1$/,'');
  const response=await fetch(base+'/v1/responses',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+settings.apiKey},signal,body:JSON.stringify({model:settings.model,input:'Search the live web for the following request. Give concise accurate findings in the request language. Include direct source URLs and dates when relevant. Clearly distinguish facts from inference. Request: '+query,tools:[{type:'web_search'}],include:['web_search_call.action.sources']})});
  const body=await response.json();
  if(!response.ok||body.error)throw new Error(body.error?.message||`联网搜索失败（HTTP ${response.status}）`);
  const content=(body.output||[]).filter(x=>x.type==='message').flatMap(x=>x.content||[]);
  const text=content.filter(x=>x.type==='output_text').map(x=>x.text).join('\n');
  const annotations=content.flatMap(x=>x.annotations||[]).filter(x=>x.type==='url_citation').map(x=>({title:x.title||x.url,url:x.url}));
  const sources=(body.output||[]).filter(x=>x.type==='web_search_call').flatMap(x=>x.action?.sources||[]).map(x=>({title:x.title||x.url,url:x.url}));
  const unique=[...new Map([...annotations,...sources].filter(x=>/^https?:\/\//.test(x.url||'')).map(x=>[x.url,x])).values()];
  if(!text)throw new Error('服务商没有返回搜索结果');
  return {text,sources:unique,searched:(body.output||[]).some(x=>x.type==='web_search_call')};
}
