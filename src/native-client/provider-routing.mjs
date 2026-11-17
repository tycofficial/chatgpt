/** Explicit configured API routes; this module never rewrites model/effort or logs credentials. */
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const routeError=(code,message)=>Object.assign(Error(message),{code,retryable:false});
function routes(value){
 if(!Array.isArray(value)||!value.length||value.length>2)throw routeError('API_PROVIDER_CONFIG_INVALID','Configure one primary and at most one backup API provider.');
 const ids=new Set();return value.map((entry,index)=>{
  if(!object(entry)||typeof entry.id!=='string'||!/^[a-z][a-z0-9_-]{0,39}$/.test(entry.id)||ids.has(entry.id))throw routeError('API_PROVIDER_CONFIG_INVALID','API provider IDs must be unique.');ids.add(entry.id);
  let url;try{url=new URL(entry.apiBase);}catch{throw routeError('API_PROVIDER_CONFIG_INVALID','An API provider URL is invalid.');}
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||typeof entry.apiKey!=='string'||!entry.apiKey.trim())throw routeError('API_PROVIDER_CONFIG_INVALID','Each API provider needs an HTTPS base and a configured credential.');
  if(!Array.isArray(entry.supportedModels)||!entry.supportedModels.length||entry.supportedModels.length>500||new Set(entry.supportedModels).size!==entry.supportedModels.length||entry.supportedModels.some(model=>typeof model!=='string'||!model||model.length>160))throw routeError('API_PROVIDER_CONFIG_INVALID','Each API provider needs an exact recorded supported-model list.');
  const base=url.href.replace(/\/+$/,''),path=url.pathname.replace(/\/+$/,'');
  return{id:entry.id,apiBase:base,apiKey:entry.apiKey,supportedModels:[...entry.supportedModels],index,origin:url.origin,apiPath:path.endsWith('/v1')?path:path+'/v1'};
 });
}
export function getProviderRequestAllowlist(providers){return routes(providers).flatMap(route=>[
 {id:route.id,origin:route.origin,method:'GET',path:route.apiPath+'/models'},
 {id:route.id,origin:route.origin,method:'POST',path:route.apiPath+'/responses'},
 {id:route.id,origin:route.origin,method:'POST',path:route.apiPath+'/chat/completions'},
]);}
const billingCodes=new Set(['insufficient_quota','insufficient_balance','credit_balance_exhausted','billing_hard_limit_reached']);
const deniedCodes=new Set(['invalid_api_key','authentication_error','permission_denied','model_not_found','invalid_request_error']);
const permissionText=/invalid.{0,12}(?:api.?key|credential)|permission denied|not authori[sz]ed|unauthori[sz]ed|forbidden|认证失败|密钥无效|无权访问/i;
export function isExplicitQuotaExhaustion(error){
 if(!error||error.status===401||error.transportStatus===401||deniedCodes.has(error.providerCode)||permissionText.test(String(error.message??'')))return false;
 if(billingCodes.has(error.providerCode))return true;
 if(error.code!=='API_QUOTA_EXHAUSTED')return false;
 return /insufficient[_\s-]*(?:balance|quota|credit)|(?:credit|balance).{0,24}(?:exhaust|insufficient)|(?:余额不足|余额已耗尽|额度(?:已)?(?:耗尽|用尽|不足))/i.test(String(error.message??''));
}
function priorEffects(options){
 if(options.providerRoutingContext?.hasCommittedSideEffects===true)return true;
 return(options.messages??[]).some(message=>message.role==='tool'||message.tool_calls?.length||message.response_items?.some(item=>['function_call','function_call_output'].includes(item.type)));
}
const hostAdmitted=checkpoint=>checkpoint?.accepted===true||checkpoint?.route==='host'&&Boolean(checkpoint.jobId||checkpoint.admissionPayload);
function redact(error,providers){
 if(error?.name==='AbortError')return error;
 const clean=value=>providers.reduce((text,provider)=>text.replaceAll(provider.apiKey,'[redacted]'),String(value??''));
 let message=clean(error?.message??'The API request failed.'),code=error?.code,retryable=error?.retryable;
 if(error?.status===401||error?.transportStatus===401){message='API 认证失败（HTTP 401）。请检查该服务的密钥。';code='API_AUTHENTICATION_FAILED';retryable=false;}
 else if(error?.status===403&&(deniedCodes.has(error.providerCode)||permissionText.test(message))){message='API 访问被拒绝（HTTP 403）。请检查模型权限。';code='API_PERMISSION_DENIED';retryable=false;}
 else if(code==='API_QUOTA_EXHAUSTED'&&!isExplicitQuotaExhaustion(error)){message='API 请求失败，未确认额度耗尽。';code=error?.status===429?'API_RATE_LIMITED':'API_REQUEST_FAILED';retryable=error?.status===429||error?.status>=500;}
 const safe=new Error(message);safe.name=clean(error?.name??'Error');
 for(const key of ['status','transportStatus'])if(Number.isInteger(error?.[key]))safe[key]=error[key];
 for(const key of ['providerCode','param','requestId','jobId'])if(error?.[key]!==undefined)safe[key]=typeof error[key]==='string'?clean(error[key]):null;
 if(typeof error?.requiresTransportResume==='boolean')safe.requiresTransportResume=error.requiresTransportResume;
 if(code!==undefined)safe.code=typeof code==='string'?clean(code):code;if(retryable!==undefined)safe.retryable=retryable;return safe;
}

export function createProviderCompletionRouter({complete,getProviders,isCurrent=()=>true,onDiagnostic=()=>{}}){
 if(typeof complete!=='function'||typeof getProviders!=='function')throw Error('A real completion function and trusted configured provider source are required.');
 const emit=event=>{try{onDiagnostic(event);}catch{}};
 async function run(options){
  const providers=routes(getProviders());
  try{
   options.signal?.throwIfAborted();if(!isCurrent())throw routeError('API_ROUTE_OWNER_CHANGED','The active account changed before the API request.');
   const eligible=providers.filter(provider=>provider.supportedModels.includes(options.settings?.model));
   if(!eligible.length)throw routeError('API_MODEL_UNAVAILABLE','No configured API provider advertises the exact selected model.');
   const checkpoint=options.transportContext?.checkpoint;
   if(hostAdmitted(checkpoint)&&typeof options.responsesTransport!=='function')throw routeError('API_HOST_CHECKPOINT_REQUIRED','An accepted host task must be reattached through its existing transport.');
   let start=0;
   if(checkpoint?.apiProviderId!=null){start=eligible.findIndex(provider=>provider.id===checkpoint.apiProviderId);if(start<0)throw routeError('API_SAVED_PROVIDER_UNAVAILABLE','The saved API provider no longer advertises this exact model.');}
   let observed=Boolean(options.transportContext?.savedPartial?.content||options.transportContext?.savedPartial?.reasoning),sideEffects=priorEffects(options);
   const originalTransport=options.responsesTransport;
   async function pin(provider){
    if(!checkpoint||checkpoint.apiProviderId===provider.id)return;
    options.signal?.throwIfAborted();if(!isCurrent()||hostAdmitted(checkpoint))throw routeError('API_ROUTE_OWNER_CHANGED','The API route cannot be changed for this task.');
    const had=Object.hasOwn(checkpoint,'apiProviderId'),previous=checkpoint.apiProviderId;checkpoint.apiProviderId=provider.id;
    try{await options.transportContext?.onCheckpoint?.(checkpoint);options.signal?.throwIfAborted();if(!isCurrent())throw routeError('API_ROUTE_OWNER_CHANGED','The active account changed while saving the route.');}
    catch(error){if(had)checkpoint.apiProviderId=previous;else delete checkpoint.apiProviderId;if(error?.name==='AbortError'||error?.code==='API_ROUTE_OWNER_CHANGED')throw error;throw routeError('API_ROUTE_CHECKPOINT_FAILED','The API route could not be saved; the backup request was not submitted.');}
   }
   for(let index=start;index<eligible.length;index++){
    const provider=eligible[index];let directUsed=typeof originalTransport!=='function'||index>start;
    const activity=event=>{observed=true;options.onActivity?.(event);};
    const delta=(text,assembled)=>{if(text||assembled?.content||assembled?.reasoning||assembled?.tool_calls?.length)observed=true;options.onDelta?.(text,assembled);};
    const responsesTransport=originalTransport&&index===start?async(payload,transport)=>originalTransport(payload,{...transport,fallbackResponses:async()=>{
     if(hostAdmitted(checkpoint))throw routeError('API_HOST_CHECKPOINT_REQUIRED','An accepted host request cannot fall back to a different API.');
     directUsed=true;await pin(provider);return transport.fallbackResponses();
    }}):undefined;
    if(directUsed)await pin(provider);
    emit({type:'api-provider-attempt',providerId:provider.id,model:options.settings.model,reason:index>start?'explicit-quota-fallback':provider.index?'model-admission-or-saved-route':'configured-primary'});
    try{
     const result=await complete({...options,settings:{...options.settings,apiBase:provider.apiBase,apiKey:provider.apiKey},onActivity:activity,onDelta:delta,responsesTransport});
     return result;
    }catch(error){
     options.signal?.throwIfAborted();if(!isCurrent())throw routeError('API_ROUTE_OWNER_CHANGED','The active account changed during the API request.');
     const quota=isExplicitQuotaExhaustion(error),canSwitch=quota&&directUsed&&!observed&&!sideEffects&&!hostAdmitted(checkpoint)&&index+1<eligible.length;
     emit({type:'api-provider-failed',providerId:provider.id,code:error?.status===401?'API_AUTHENTICATION_FAILED':quota?'API_QUOTA_EXHAUSTED':'API_REQUEST_FAILED',status:Number.isInteger(error?.status)?error.status:null,fallback:canSwitch});
     if(!canSwitch)throw error;
     await pin(eligible[index+1]);
    }
   }
   throw routeError('API_PROVIDER_UNAVAILABLE','No supported API route completed the request.');
  }catch(error){throw redact(error,providers);}
 }
 return{complete:run,getAllowedRequests:()=>getProviderRequestAllowlist(getProviders())};
}
