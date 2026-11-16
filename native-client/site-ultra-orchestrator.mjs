import { isHostCheckpoint } from './preferred-host-transport.mjs?v=a0a40643d9533070';
/** Site-provided Ultra orchestration. This is not an OpenAI provider effort enum. */
export const ULTRA_MODELS = Object.freeze(['gpt-6.1-sol', 'gpt-6-astra']);
export const ULTRA_TOOL = Object.freeze({
  type: 'function', function: {
    name: 'delegate_tasks',
    description: 'Run 1–3 independent analysis workers in parallel, using the same selected model at its API max effort. Workers return actual findings; they cannot execute tools or create files. Supply all task-specific context. Parent tools remain available for real execution.',
    parameters: { type: 'object', additionalProperties: false, properties: { tasks: { type: 'array', minItems: 1, maxItems: 3, items: { type: 'object', additionalProperties: false, properties: { title: { type: 'string' }, prompt: { type: 'string' }, context: { type: 'string' } }, required: ['prompt'] } } }, required: ['tasks'] },
  },
});
const clone = value => structuredClone(value);
const usage = value => value ? Object.fromEntries(['input_tokens', 'output_tokens', 'total_tokens', 'prompt_tokens', 'completion_tokens', 'input_tokens_details', 'output_tokens_details'].filter(key => value[key] !== undefined).map(key => [key, clone(value[key])])) : null;
const errorRecord = (error, redact) => ({ message: redact(error?.message || error), code: error?.code ?? null, status: error?.status ?? null, retryable: error?.retryable ?? null });
const providerFatal = error => [400, 401, 402, 403, 404, 422, 429].includes(error?.status) || error?.retryable === false;
const workerPolicy = 'You are an analysis worker in this application\'s Ultra orchestration. Analyze only the provided request and context. No execution tools are available to you: never claim to run Python, shell commands, file operations, browser actions or external research. Return concrete findings, evidence, uncertainties and recommendations to the parent, which owns actual tools. This application is coordinating independent API calls; do not claim to be OpenAI\'s private Ultra backend.';

export function createUltraToolExecutor({ baseExecutor=null,streamCompletion,turn,checkpoint,save,getSettings,getContext=()=>[],getAbortMode=()=> 'user',now=Date.now,redact=value=>String(value) }) {
 if(!ULTRA_MODELS.includes(turn.model)||turn.reasoningEffort!=='ultra')throw Object.assign(Error('Ultra orchestration is available only for GPT-6.1 Sol and GPT-6 Astra.'),{code:'ULTRA_MODEL_NOT_SUPPORTED',retryable:false});
 const state=checkpoint.ultra??={schemaVersion:1,productExecutionMode:'ultra',orchestration:'site-parallel-agents',underlyingModel:turn.model,underlyingReasoningEffort:'max',officialPrivateUltra:false,calls:[]};
 if(state.underlyingModel!==turn.model||state.underlyingReasoningEffort!=='max')throw Object.assign(Error('The saved Ultra checkpoint does not match this turn selection.'),{code:'ULTRA_CHECKPOINT_MISMATCH',retryable:false});
 let queue=Promise.resolve();const persist=()=>{const next=queue.then(save);queue=next.catch(()=>{});return next;};
 const project=entry=>{const results=entry.workers.map(worker=>({index:worker.index,title:worker.title,status:worker.status,text:worker.partialText||worker.text||'',...(worker.error?{error:clone(worker.error)}:{}),rounds:worker.rounds.map(round=>({model:round.model,effort:round.effort,startedAt:round.startedAt,endedAt:round.endedAt??null,ttftMs:round.firstOutputAt==null?null:round.firstOutputAt-round.startedAt,...(round.usage?{usage:clone(round.usage)}:{}),...(round.reportedModel?{reportedModel:round.reportedModel}:{})}))}));const data={productExecutionMode:'ultra',orchestration:'site-parallel-agents',underlyingModel:turn.model,underlyingReasoningEffort:'max',officialPrivateUltra:false,results};return{isError:results.some(worker=>worker.status!=='completed'),structuredContent:data,content:[{type:'text',text:JSON.stringify(data)}]};};
 const common=()=>getContext().filter(message=>['system','developer','user','assistant'].includes(message.role)&&typeof message.content==='string'&&message.content).map(message=>({role:message.role,content:message.content}));
 const pendingHost=worker=>{const round=worker.rounds.at(-1);return round&&isHostCheckpoint(round.transport)&&!round.applied&&!round.transport.cancelRequested&&round.transport.state!=='cancelled';};
 function uncertain(worker){if(!['completed','failed','interrupted','uncertain'].includes(worker.status))worker.status='uncertain';if(worker.status!=='completed')worker.error={code:'ULTRA_WORKER_INTERRUPTED',message:'Completion of this worker is unknown after interruption; it was not submitted again.',status:null,retryable:false};}
 async function runWorker(entry,worker,context,group,recover){
  const signal=group.signal;let current;
  try{
   signal.throwIfAborted();worker.status='running';worker.error=null;await persist();
   const first=recover?Math.max(0,worker.rounds.length-1):0;
   for(let index=first;index<3;index++){
    signal.throwIfAborted();
    const previous=worker.rounds.slice(0,index),prefix=previous.map(round=>round.result?.content||'').join('');
    const messages=[{role:'system',content:workerPolicy},...clone(group.common),{role:'user',content:worker.prompt+(worker.context?'\n\nTask-specific context:\n'+worker.context:'')}];
    for(const old of previous)if(old.result)messages.push({role:'assistant',content:old.result.content||'',...(old.result.response_items?.length?{response_items:clone(old.result.response_items)}:{})},{role:'user',content:'Continue this unfinished analysis without repeating the saved text. No tool has been executed.'});
    const round=current=worker.rounds[index]??{model:turn.model,effort:'max',startedAt:now(),firstOutputAt:null,partialText:'',partialReasoning:'',transport:{}};if(!worker.rounds[index])worker.rounds.push(round);
    if(recover&&index===first&&!round.result&&!pendingHost(worker)){uncertain(worker);await persist();return;}
    const reattach=isHostCheckpoint(round.transport);const saved={content:round.partialText||'',reasoning:round.partialReasoning||''};
    const settings={...getSettings(),model:turn.model,reasoningEffort:'max',autoPython:false};await persist();let lastSaved=now();
    const result=round.result?clone(round.result):await streamCompletion({settings,messages:clone(messages),tools:[],signal,
     transportContext:{checkpoint:round.transport,requestId:turn.id+':'+entry.id+':'+worker.index+':'+index,onCheckpoint:persist,reattach,savedPartial:saved,requiredConcurrency:3,getAbortMode:()=>signal.reason?.requiresTransportResume?'transport':getAbortMode()},
     onActivity:()=>{round.firstOutputAt??=now();},onDelta:(_delta,assembled)=>{if(signal.aborted)return;if(assembled.content||assembled.reasoning)round.firstOutputAt??=now();round.partialText=assembled.content||'';round.partialReasoning=assembled.reasoning||'';worker.partialText=prefix+round.partialText;if(now()-lastSaved>=1000){lastSaved=now();persist().catch(()=>{});}}
    });
    signal.throwIfAborted();round.result=clone(result);round.endedAt=now();round.finishReason=result.finish_reason;round.usage=usage(result.usage);round.reportedModel=result.model??null;await persist();
    const text=result.content||'';worker.text=prefix+text;worker.partialText=worker.text;round.partialText=text;round.applied=true;
    if(result.tool_calls?.length)throw Object.assign(Error('An Ultra analysis worker requested a tool although none was enabled.'),{code:'ULTRA_WORKER_UNEXPECTED_TOOL',retryable:false});
    if(result.finish_reason==='length'){await persist();continue;}
    if(result.finish_reason!=='stop'||!text)throw Object.assign(Error('The Ultra worker did not confirm a complete analysis.'),{code:'ULTRA_WORKER_INCOMPLETE',retryable:false});
    worker.status='completed';worker.completedAt=now();await persist();context.onStatus?.(entry.workers.filter(worker=>worker.status==='completed').length+'/'+entry.workers.length+' analysis workers completed');return;
   }
   throw Object.assign(Error('The worker saved three truncated analysis rounds; its analysis is incomplete.'),{code:'ULTRA_WORKER_LENGTH_LIMIT',retryable:false});
  }catch(error){
   worker.status=signal.aborted||error.requiresTransportResume?'interrupted':'failed';
   worker.error=signal.aborted?{message:context.signal?.aborted?'The parent stopped this analysis; completion is unknown and it was not retried.':'A sibling failure stopped this analysis before completion could be confirmed; it was not retried.',code:'ULTRA_WORKER_INTERRUPTED',status:null,retryable:false}:errorRecord(error,redact);
   if(current&&!current.endedAt){current.endedAt=now();current.error=clone(worker.error);}
   if(error.requiresTransportResume&&current)current.needsReattach=true;
   if(!context.signal?.aborted&&(providerFatal(error)||error.requiresTransportResume)&&!group.fatal){group.fatal=error;group.controller.abort(error);}
   await persist();
  }
 }
 async function runEntry(entry,context,recover){
  const controller=new AbortController(),signal=context.signal?AbortSignal.any([context.signal,controller.signal]):controller.signal,group={controller,signal,common:common(),fatal:null};
  await Promise.all(entry.workers.map(async worker=>{if(worker.status==='completed')return;if(recover&&!pendingHost(worker)&&!worker.rounds.at(-1)?.result){uncertain(worker);return;}return runWorker(entry,worker,context,group,recover);}));
  await queue;entry.status=entry.workers.every(worker=>worker.status==='completed')?'completed':context.signal?.aborted?'interrupted':'failed';entry.completedAt=now();await persist();const output=project(entry);
  if(context.signal?.aborted)throw context.signal.reason;
  if(group.fatal){group.fatal.providerFailure=true;group.fatal.mcpResult=output;throw group.fatal;}
  return output;
 }
 async function recoverCall(call,context={}){
  if(call.function?.name!=='delegate_tasks')return baseExecutor?.recoverCall?.(call,context)??null;
  const entry=state.calls.find(entry=>entry.id===call.id);if(!entry)return null;
  if(entry.workers.some(pendingHost))return runEntry(entry,context,true);
  for(const worker of entry.workers)uncertain(worker);entry.status=entry.workers.every(worker=>worker.status==='completed')?'completed':'interrupted';await persist();return project(entry);
 }
 async function delegate(call,context){
  context.signal?.throwIfAborted();let args;try{args=JSON.parse(call.function.arguments||'{}');}catch{throw Error('delegate_tasks arguments must be valid JSON');}
  if(!Array.isArray(args.tasks)||args.tasks.length<1||args.tasks.length>3||args.tasks.some(task=>!task||typeof task.prompt!=='string'||!task.prompt.trim()||task.context!=null&&typeof task.context!=='string'||task.title!=null&&typeof task.title!=='string'))throw Error('delegate_tasks requires1–3 tasks with nonempty prompt strings');
  const old=state.calls.find(entry=>entry.id===call.id);if(old){if(old.arguments!==call.function.arguments)throw Error('An Ultra delegate call ID cannot be reused with different arguments');return recoverCall(call,context);}
  const entry={id:call.id,arguments:call.function.arguments,status:'running',startedAt:now(),workers:args.tasks.map((task,index)=>({index,title:task.title||'Analysis '+(index+1),prompt:task.prompt,context:task.context||'',status:'queued',text:'',partialText:'',rounds:[]}))};state.calls.push(entry);await persist();return runEntry(entry,context,false);
 }
 return{...(baseExecutor||{}),tools:[...(baseExecutor?.tools||[]),ULTRA_TOOL],capabilitySource:'site-ultra-plus-browser-tools',recoverCall,async execute(call,context){if(call.function?.name==='delegate_tasks')return delegate(call,context);if(!baseExecutor?.execute)throw Error('Tool is unavailable: '+call.function?.name);return baseExecutor.execute(call,context);}};
}
