import { RESOURCE, SITE_ORIGIN, APP_NAME, BridgeError, diagnostic } from './constants.mjs';
import { normalizeResponsesRequest, ResponsesObserver } from './protocol.mjs';
import { JobJournal } from './journal.mjs';
const sleep = (ms, signal) => new Promise(resolve => { const stop = () => { clearTimeout(timer); resolve(); }; const timer = setTimeout(() => { signal?.removeEventListener('abort', stop); resolve(); }, ms); signal?.addEventListener('abort', stop, { once: true }); if (signal?.aborted) stop(); });
const quotaCodes = new Set(['subscription_sharing_usage_limit_exceeded']);
export class OfficialResponses {
  constructor({ sessions, store, fetch = globalThis.fetch }) { this.sessions = sessions; this.store = store; this.fetch = fetch; this.catalogs = new Map(); }
  async catalog(force = false) {
    const account = (await this.sessions.accounts()).activeId;
    if (!account) throw new BridgeError('SIGN_IN_REQUIRED', 'Continue with ChatGPT from this computer first');
    const cached = this.catalogs.get(account); if (!force && cached && Date.now() - cached.at < 300000) return cached;
    const token = await this.sessions.accessToken(account), response = await this.fetch(RESOURCE + '/models', { headers: { Authorization: 'Bearer ' + token }, redirect: 'error', signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw await this.error(response);
    const body = await response.json();
    if (!Array.isArray(body.models)) throw new BridgeError('INVALID_CATALOG', 'The official account model catalog did not contain a models array');
    const models = body.models.filter(model => model.visibility === 'list' && typeof model.slug === 'string').map(model => ({ slug: model.slug, display_name: model.display_name || model.slug }));
    const catalog = { account, models, at: Date.now() }; this.catalogs.set(account, catalog); return catalog;
  }
  async error(response) {
    let body; try { body = await response.json(); } catch { body = { detail: 'The official server returned a non-JSON error' }; }
    const error = new BridgeError(body.error?.code || 'OFFICIAL_HTTP_ERROR', String(body.error?.message || body.detail || 'Official inference request failed'), { status: response.status, requestId: response.headers.get('x-request-id') || response.headers.get('openai-request-id'), param: body.error?.param, responseBody: body });
    return error;
  }
  async profile() {
    try {
      const catalog = await this.catalog();
      // A cached catalog does not prove that the selected renewable session is still usable.
      await this.sessions.accessToken(catalog.account);
      const pauses = await this.store.read('usage-pauses.json', {}), quota = pauses[catalog.account];
      return { authenticated: true, planType: null, models: catalog.models, ...(quota ? { quota } : {}) };
    } catch (error) { return { authenticated: false, planType: null, models: [], error: diagnostic(error) }; }
  }
  async clearUsagePause() { const id = (await this.sessions.accounts()).activeId; await this.store.withLock('usage-pauses', async () => { const value = await this.store.read('usage-pauses.json', {}); delete value[id]; await this.store.write('usage-pauses.json', value); }); }
  async recordUsageError(error) {
    if (!quotaCodes.has(error.code)) return;
    const id = (await this.sessions.accounts()).activeId;
    await this.store.withLock('usage-pauses', async () => { const value = await this.store.read('usage-pauses.json', {}); value[id] = { state: 'request-paused', code: error.code, httpStatus: error.status || null, requestId: error.requestId || null, usageUrl: 'https://chatgpt.com/settings/usage', observedAt: Date.now() }; await this.store.write('usage-pauses.json', value); });
  }
  async request(payload, signal) {
    const catalog = await this.catalog(), pauses = await this.store.read('usage-pauses.json', {});
    if (pauses[catalog.account]) throw new BridgeError('SUBSCRIPTION_PAUSED', 'ChatGPT plan requests are paused after an actual usage-limit error. Review ChatGPT Settings → Usage, then explicitly retry from the local UI.');
    const normalized = normalizeResponsesRequest(payload, catalog.models), token = await this.sessions.accessToken(catalog.account);
    const response = await this.fetch(RESOURCE + '/responses', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(normalized.payload), redirect: 'error', signal });
    return { response, omittedFields: normalized.omittedFields };
  }
}
export class BridgeClient {
  constructor({ store, sessions, official, baseURL = SITE_ORIGIN, fetch = globalThis.fetch, idleMs = 2000, maxConcurrentJobs = 3, heartbeatMs = 1500, heartbeatTimeoutMs = 8000 }) {
    this.store=store;this.sessions=sessions;this.official=official;this.baseURL=new URL(baseURL);this.fetch=fetch;this.idleMs=idleMs;this.journal=new JobJournal(store);this.running=false;this.controller=null;this.lastError=null;
    this.maxConcurrentJobs=Number.isInteger(maxConcurrentJobs)?Math.max(1,Math.min(3,maxConcurrentJobs)):3;this.heartbeatMs=heartbeatMs;this.heartbeatTimeoutMs=heartbeatTimeoutMs;this.instanceId=crypto.randomUUID();this.jobs=new Map();
    if(this.baseURL.protocol!=='https:'&&!(this.baseURL.protocol==='http:'&&this.baseURL.hostname==='127.0.0.1'))throw Error('Bridge server must use HTTPS');
  }
  async remote(path,body,bearer,signal,timeoutMs=30000){
    const url=new URL(path,this.baseURL);if(url.origin!==this.baseURL.origin)throw Error('Unexpected bridge origin');
    const response=await this.fetch(url,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json',...(bearer?{Authorization:'Bearer '+bearer}:{})},body:JSON.stringify(body),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(timeoutMs)]):AbortSignal.timeout(timeoutMs)});
    if(!response.ok){let data;try{data=await response.json();}catch{}throw new BridgeError(data?.error?.code||'SITE_HTTP_ERROR','Paired website request failed: '+response.status,{status:response.status});}
    return response.json().catch(()=>({}));
  }
  async pair(username,password){let session;try{session=await this.remote('/auth/login',{username,password});if(typeof session.token!=='string'||session.user?.role!=='administrator')throw new BridgeError('ADMIN_REQUIRED','Pairing requires this website’s administrator account');const pairing=await this.remote('/bridge/pair',{hostId:await this.store.hostId(),appName:APP_NAME},session.token);if(typeof pairing.bridgeId!=='string'||typeof pairing.bridgeToken!=='string'||!pairing.bridgeToken)throw new BridgeError('INVALID_PAIR_RESPONSE','The bridge pairing endpoint returned an invalid response');await this.store.write('pairing.json',{bridgeId:pairing.bridgeId,bridgeToken:pairing.bridgeToken,siteOrigin:this.baseURL.origin,pairedAt:Date.now()});return{bridgeId:pairing.bridgeId};}finally{password=null;if(session?.token)await this.remote('/auth/logout',{},session.token).catch(()=>{});}}
  async status(){const paired=await this.store.read('pairing.json');return{paired:Boolean(paired?.bridgeToken),bridgeId:paired?.bridgeId||null,running:this.running,jobId:this.jobs.keys().next().value||null,jobIds:[...this.jobs.keys()],activeJobs:this.jobs.size,maxConcurrentJobs:this.maxConcurrentJobs,protocolVersion:4,lastError:this.lastError,siteOrigin:this.baseURL.origin};}
  abortRemote(task,kind,message){if(!task)return;const error=new BridgeError(kind,message,{retryable:false});if(kind==='SITE_JOB_CANCELLED')task.remoteCancelled=true;else task.remoteTerminal=true;task.controller.abort(error);return error;}
  async checkJob(id,pairing,task,signal=task.signal){
    let response;try{response=await this.remote('/bridge/jobs/'+encodeURIComponent(id)+'/heartbeat',{instanceId:this.instanceId},pairing.bridgeToken,signal,this.heartbeatTimeoutMs);}catch(error){if([401,403].includes(error.status)||error.code==='JOB_CLAIM_CHANGED')this.abortRemote(task,'SITE_JOB_ACCESS_REVOKED','The website revoked this job or bridge; its official request was stopped.');throw error;}
    if(response.cancelled||response.status==='cancelled')throw this.abortRemote(task,'SITE_JOB_CANCELLED','The user cancelled this job on the website; the official request was aborted.');
    if(response.terminal&&!['complete','failed','cancelled'].includes(task.loaded?.attempt.phase))throw this.abortRemote(task,'SITE_JOB_ALREADY_TERMINAL','The relay already marked this job terminal. The current official request was stopped; no replacement inference was submitted.');
    return response;
  }
  flush(loaded,pairing){const operation=(loaded.flushQueue||Promise.resolve()).then(()=>this.flushCore(loaded,pairing));loaded.flushQueue=operation.catch(()=>{});return operation;}
  async flushCore(loaded,pairing){
    const {state}=loaded;if(state.remoteCancelled||state.remoteTerminal)return;
    while(loaded.events.length){
      const events=loaded.events.slice(0,32),last=state.attempts.at(-1),finalBatch=events.at(-1).data.type==='end';let response;
      try{response=await this.remote('/bridge/jobs/'+encodeURIComponent(state.jobId)+'/events',{instanceId:this.instanceId,events,status:finalBatch?last.phase==='complete'?'complete':'failed':'streaming',...(finalBatch&&last.error?{error:last.error}:{}),...(finalBatch&&last.usage?{usage:last.usage}:{}),...(last.model?{model:last.model}:{})},pairing.bridgeToken);}catch(error){if([401,403].includes(error.status)||error.code==='JOB_CLAIM_CHANGED')this.abortRemote(this.jobs.get(state.jobId),'SITE_JOB_ACCESS_REVOKED','The website revoked this job or bridge; its official request was stopped.');throw error;}
      if(response.cancelled||response.status==='cancelled'){state.remoteCancelled=true;last.phase='cancelled';await this.journal.save(state);const error=this.abortRemote(this.jobs.get(state.jobId),'SITE_JOB_CANCELLED','The website cancelled this job; no event was falsely acknowledged.');throw error||new BridgeError('SITE_JOB_CANCELLED','The website cancelled this job');}
      if(response.terminal&&response.status!==last.phase){state.remoteTerminal=response.status;await this.journal.save(state);this.abortRemote(this.jobs.get(state.jobId),'SITE_JOB_ALREADY_TERMINAL','The durable job is already terminal; no replacement inference was started.');return;}
      const ack=response.ackSeq===undefined?events.at(-1).seq:response.ackSeq;
      if(!Number.isSafeInteger(ack)||ack<events[0].seq||ack>events.at(-1).seq)throw new BridgeError('INVALID_EVENT_ACK','The website returned an invalid event acknowledgement');
      state.ackedSeq=Math.max(state.ackedSeq,ack);await this.journal.save(state);loaded.events=loaded.events.filter(event=>event.seq>state.ackedSeq);
    }
  }
  runJob(job,pairing,parentSignal){
    if(this.jobs.has(job.id))return this.jobs.get(job.id).promise;
    if(this.jobs.size>=this.maxConcurrentJobs)return Promise.reject(new BridgeError('LOCAL_CAPACITY_BUSY','The local bridge already has its maximum active jobs'));
    const controller=new AbortController(),signal=parentSignal?AbortSignal.any([parentSignal,controller.signal]):controller.signal,task={controller,signal,promise:null,loaded:null,remoteCancelled:false,remoteTerminal:false};
    this.jobs.set(job.id,task);task.promise=this.executeJob(job,pairing,task).finally(()=>{if(this.jobs.get(job.id)===task)this.jobs.delete(job.id);});return task.promise;
  }
  async executeJob(job,pairing,task){
    const signal=task.signal,loaded=await this.journal.claim(job),{state,attempt}=loaded;task.loaded=loaded;
    if(state.remoteCancelled||state.remoteTerminal||attempt.phase==='cancelled')return;
    if(!loaded.fresh){
      if(['admitted','requesting','streaming'].includes(attempt.phase)){attempt.phase='failed';attempt.error={code:'BRIDGE_RESTART_INTERRUPTED',message:'The previous inference completion is unknown. It was not submitted again after restart.'};const failed=attempt.headersSent?[]:[{type:'headers',status:502,contentType:'application/json'},{type:'data',text:JSON.stringify({error:attempt.error,source:'local-bridge'})}];attempt.headersSent=true;loaded.events.push(...await this.journal.append(state,[...failed,{type:'end'}]));}
      await this.flush(loaded,pairing);return;
    }
    const append=async values=>{loaded.events.push(...await this.journal.append(state,values));};
    const monitorStop=new AbortController(),monitorSignal=AbortSignal.any([signal,monitorStop.signal]);let monitor=null,observer=new ResponsesObserver(),response,pending='';
    const monitorLoop=async()=>{while(!monitorSignal.aborted){await sleep(this.heartbeatMs,monitorSignal);if(monitorSignal.aborted)break;try{await this.checkJob(job.id,pairing,task,monitorSignal);if(loaded.events.length)await flushSafely();}catch(error){if(monitorSignal.aborted)break;this.lastError=diagnostic(error);}}};
    const flushSafely=async()=>{try{await this.flush(loaded,pairing);}catch(error){if(task.remoteCancelled||task.remoteTerminal)throw error;this.lastError=diagnostic(error);}};
    try{
      if(job.resume===true)throw new BridgeError('BRIDGE_HISTORY_UNAVAILABLE','The relay reports a previously claimed job but its protected local journal is missing. No replacement inference was submitted.',{status:502});
      signal.throwIfAborted();await this.checkJob(job.id,pairing,task);signal.throwIfAborted();monitor=monitorLoop();
      attempt.phase='requesting';await this.journal.save(state);
      ({response}=await this.official.request(job.payload,signal));signal.throwIfAborted();
      attempt.phase='streaming';attempt.headersSent=true;await append([{type:'headers',status:response.status,contentType:response.headers.get('content-type')||'text/event-stream'}]);
      if(!response.ok){const error=await this.official.error(response);await this.official.recordUsageError(error);await append([{type:'data',text:JSON.stringify(error.responseBody||{error:diagnostic(error)})}]);throw error;}
      if(!response.body||!/text\/event-stream/i.test(response.headers.get('content-type')||''))throw new BridgeError('SSE_REQUIRED','Official plan inference did not return a streaming event response');
      const reader=response.body.getReader(),decoder=new TextDecoder();let lastFlush=Date.now();await flushSafely();
      try{while(true){signal.throwIfAborted();const{value,done}=await reader.read();if(done)break;const text=decoder.decode(value,{stream:true});observer.push(text);pending+=text;if(pending&&(!attempt.firstDataSent||pending.length>=16384||Date.now()-lastFlush>=100)){attempt.firstDataSent=true;await append([{type:'data',text:pending}]);pending='';await flushSafely();lastFlush=Date.now();}}const tail=decoder.decode();pending+=tail;observer.push(tail,true);if(pending){await append([{type:'data',text:pending}]);pending='';}}
      finally{if(signal.aborted)await reader.cancel(signal.reason).catch(()=>{});reader.releaseLock();}
      if(observer.failed){const error=new BridgeError(observer.error?.code||'RESPONSE_FAILED',String(observer.error?.message||'The official response failed'),{param:observer.error?.param,status:response.status,requestId:response.headers.get('x-request-id')||response.headers.get('openai-request-id')});await this.official.recordUsageError(error);throw error;}
      if(!observer.completed)throw new BridgeError('STREAM_INTERRUPTED','The stream ended without response.completed; no successful completion was reported');
      attempt.phase='complete';attempt.usage=observer.usage;attempt.model=observer.model||job.payload.model;attempt.completedAt=Date.now();
    }catch(error){
      if(task.remoteCancelled||task.remoteTerminal){attempt.phase=task.remoteCancelled?'cancelled':'failed';attempt.error=diagnostic(signal.reason||error);state.remoteCancelled=task.remoteCancelled;state.remoteTerminal=task.remoteTerminal?state.remoteTerminal||'terminal':null;if(pending)await append([{type:'data',text:pending}]);await this.journal.save(state);return;}
      if(!attempt.headersSent){const status=error.status||(['SIGN_IN_REQUIRED','PLAN_SCOPE_MISSING'].includes(error.code)?401:error.code==='SUBSCRIPTION_PAUSED'?429:400);attempt.headersSent=true;await append([{type:'headers',status,contentType:'application/json'},{type:'data',text:JSON.stringify({error:diagnostic(error),source:'local-bridge'})}]);}
      if(pending){await append([{type:'data',text:pending}]);pending='';}
      attempt.phase=observer.completed&&!observer.failed?'complete':'failed';if(attempt.phase!=='complete')attempt.error=diagnostic(error);else{attempt.usage=observer.usage;attempt.model=observer.model||job.payload.model;}this.lastError=attempt.error||null;
    }finally{monitorStop.abort();if(monitor)await monitor;}
    await append([{type:'end'}]);await this.flush(loaded,pairing);
  }
  async flushPending(pairing){
    const entries=await import('node:fs/promises').then(fs=>fs.readdir(this.store.resolve('jobs')));
    const activeFiles=new Set([...this.jobs.keys()].map(id=>this.journal.key(id).split('/').at(-1)+'.json'));
    for(const name of entries.filter(name=>name.endsWith('.json')&&!activeFiles.has(name))){const state=await this.store.read('jobs/'+name);if(!state?.jobId||this.jobs.has(state.jobId)||state.remoteCancelled||state.remoteTerminal)continue;const loaded=await this.journal.load(state.jobId),last=loaded.state.attempts.at(-1);if(last?.phase==='cancelled')continue;if(last&&['admitted','requesting','streaming'].includes(last.phase)){last.phase='failed';last.error={code:'BRIDGE_RESTART_INTERRUPTED',message:'The previous local stream completion is unknown; this attempt was not submitted again after restart.'};const failed=last.headersSent?[]:[{type:'headers',status:502,contentType:'application/json'},{type:'data',text:JSON.stringify({error:last.error,source:'local-bridge'})}];last.headersSent=true;loaded.events.push(...await this.journal.append(loaded.state,[...failed,{type:'end'}]));}if(loaded.events.length)await this.flush(loaded,pairing);}
  }
  start(){
    if(this.running)return;this.running=true;this.controller=new AbortController();const signal=this.controller.signal;
    this.loop=(async()=>{let failures=0;while(!signal.aborted){try{const pairing=await this.store.read('pairing.json');let launched=false;if(pairing?.bridgeToken){await this.flushPending(pairing);const profile={...await this.official.profile(),capabilities:{protocolVersion:4,maxConcurrentJobs:this.maxConcurrentJobs,cancelInference:true}};const result=await this.remote('/bridge/poll',{profile,instanceId:this.instanceId,activeJobIds:[...this.jobs.keys()]},pairing.bridgeToken,signal);if(result.job&&!this.jobs.has(result.job.id)&&this.jobs.size<this.maxConcurrentJobs){launched=true;this.runJob(result.job,pairing,signal).catch(error=>{this.lastError=diagnostic(error);});}}failures=0;await sleep(launched&&this.jobs.size<this.maxConcurrentJobs?0:this.idleMs,signal);}catch(error){if(signal.aborted)break;this.lastError=diagnostic(error);await sleep(Math.min(30000,1000*2**Math.min(failures++,5)),signal);}}this.running=false;})();
  }
  async stop(){this.controller?.abort(new DOMException('Local bridge stopped','AbortError'));for(const task of this.jobs.values())task.controller.abort(new DOMException('Local bridge stopped','AbortError'));if(this.loop)await this.loop;await Promise.allSettled([...this.jobs.values()].map(task=>task.promise));this.running=false;}
}
