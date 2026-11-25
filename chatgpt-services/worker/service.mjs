import {handleChatSync} from './chat-sync.mjs';
import {handleDotComputer} from './dot-computer.mjs';
import {desktopConfigured} from './linux-desktop.mjs';
import {getPaidSitePlan, getPaidSiteSubscription, handleSiteBilling, paidSubscriptionColumns, paidSubscriptionJoin, siteBillingConfigured, siteBillingMode} from './site-billing.mjs';
import {proxyDocodeResponses, siteInferenceConfigured} from './site-inference.mjs';
import {readJournaledInference, readSiteInferenceUsage, startJournaledInference} from './inference-recovery.mjs';
/** Username/password auth is local to this site; no original account token is used. */
const encoder=new TextEncoder();
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
const digest=async value=>hex(await crypto.subtle.digest('SHA-256',encoder.encode(value)));
const normalize=value=>String(value||'').normalize('NFKC').trim().toLowerCase();
const query=(env,sql,...values)=>env.DB.prepare(sql).bind(...values);
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
const fail=(status,code,message)=>json({error:{code,message}},status);
async function readBody(request){const text=await request.text();if(text.length>4096)throw Error('Request too large');return JSON.parse(text||'{}');}
export async function passwordHash(password,salt){const key=await crypto.subtle.importKey('raw',encoder.encode(normalize(password)),{name:'PBKDF2'},false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:Uint8Array.from(salt.match(/../g),x=>parseInt(x,16)),iterations:100000},key,256));}
export async function userPasswordHash(password,salt){const key=await crypto.subtle.importKey('raw',encoder.encode(String(password).normalize('NFKC')),{name:'PBKDF2'},false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:Uint8Array.from(salt.match(/../g),x=>parseInt(x,16)),iterations:100000},key,256));}
function equal(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let difference=0;for(let i=0;i<a.length;i++)difference|=a.charCodeAt(i)^b.charCodeAt(i);return difference===0;}
async function configured(env){if(!env.DB)throw Error('DB unavailable');if(env.ADMIN_USERNAME&&env.ADMIN_PASSWORD_HASH&&env.ADMIN_PASSWORD_SALT)await query(env,'INSERT OR IGNORE INTO administrators(id,username,password_hash,password_salt,created_at) VALUES(1,?,?,?,?)',normalize(env.ADMIN_USERNAME),env.ADMIN_PASSWORD_HASH,env.ADMIN_PASSWORD_SALT,Date.now()).run();return query(env,'SELECT id,username,created_at FROM administrators WHERE id=1').first();}
const siteTrialDuration=30*86400000;
const siteTrialPlanTypes=new Map([
 ['plus','plus'],
 ['prolite','pro'],
 ['pro','pro'],
 ['promax','pro'],
]);
async function session(request,env){
 const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 if(!/^[a-f0-9]{64}$/.test(token))return null;
 const tokenHash=await digest(token);
 const admin=await query(env,"SELECT a.id,a.username,a.created_at,s.expires_at AS sessionExpiresAt,'administrator' AS role FROM sessions s JOIN administrators a ON a.id=s.admin_id WHERE s.token_hash=? AND s.expires_at>?",tokenHash,Date.now()).first();
 if(admin)return admin;
 return query(env,`
  SELECT u.id,u.username,u.display_name,u.created_at,s.expires_at AS sessionExpiresAt,'user' AS role,
         t.tier AS site_trial_tier,t.expires_at AS site_trial_expires_at, ${paidSubscriptionColumns}
  FROM user_sessions s JOIN users u ON u.id=s.user_id
  LEFT JOIN site_trials t ON t.user_id=u.id
  ${paidSubscriptionJoin}
  WHERE s.token_hash=? AND s.expires_at>?`,siteBillingMode(env),Date.now(),tokenHash,Date.now()).first();
}
function account(record){
 if(record.role!=='user'){
  const name=record.username.toUpperCase();
  return {id:'site-admin',username:name,name,role:'administrator',planType:'pro',membershipSource:'site-administrator',createdAt:record.created_at,officialSubscriptionVerified:false};
 }
 const name=record.display_name||record.username;
 const siteSubscription=getPaidSiteSubscription(record);
 const siteTrial=!siteSubscription&&hasActiveSiteTrial(record)
  ? {tier:record.site_trial_tier,expiresAt:record.site_trial_expires_at}
  : null;
 return {
  id:'site-user:'+record.id,accountId:record.id,username:name,name,role:'user',
  planType:(siteSubscription?getPaidSitePlan(siteSubscription.tier):siteTrialPlanTypes.get(siteTrial?.tier))??'free',
  membershipSource:'site-registration',createdAt:record.created_at,officialSubscriptionVerified:false,siteTrial,siteSubscription,
 };
}
const hasActiveSiteTrial=record=>record.site_trial_expires_at>Date.now()&&siteTrialPlanTypes.has(record.site_trial_tier);
async function issueUserSession(env,user,accountInsert){
 const token=hex(crypto.getRandomValues(new Uint8Array(32)));
 const createdAt=Date.now();
 const expiresAt=createdAt+30*86400000;
 const sessionInsert=query(env,'INSERT INTO user_sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)',
  await digest(token),user.id,expiresAt,createdAt);
 if(accountInsert)await env.DB.batch([accountInsert,sessionInsert]);
 else await sessionInsert.run();
 return json({token,expiresAt,user:account({...user,role:'user'})});
}
function postRequired(message){
 const response=fail(405,'METHOD_NOT_ALLOWED',message);
 response.headers.set('Allow','POST');
 return response;
}
async function claimSiteTrial(request,env,actor){
 if(request.method!=='POST')return postRequired('请使用 POST 申请站内试用。');
 if(!actor)return fail(401,'SITE_AUTH_REQUIRED','请先登录本站账户。');
 if(actor.role!=='user')return fail(403,'SITE_TRIAL_USER_REQUIRED','站内试用仅面向本站注册用户。');
 if(getPaidSiteSubscription(actor))return fail(409,'SITE_BILLING_ACTIVE','账号已有付费订阅，请在管理订阅中查看。');
 const data=await readBody(request).catch(()=>null);
 const tier=data?.tier;
 if(!siteTrialPlanTypes.has(tier))return fail(400,'INVALID_SITE_TRIAL_TIER','请选择有效的站内试用方案。');

 const expiresAt=Date.now()+siteTrialDuration;
 await query(env,`
  INSERT INTO site_trials (user_id,tier,expires_at) VALUES (?,?,?)
  ON CONFLICT(user_id) DO UPDATE SET tier=excluded.tier,expires_at=excluded.expires_at`,
 actor.id,tier,expiresAt).run();
 return json({
  user:account({...actor,site_trial_tier:tier,site_trial_expires_at:expiresAt}),
  expiresAt:actor.sessionExpiresAt,
 });
}
async function siteInference(request,env,ctx,actor){
 if(request.method!=='POST')return postRequired('请使用 POST 发送模型请求。');
 if(!actor)return fail(401,'SITE_AUTH_REQUIRED','请先登录本站账户。');
 const {planType}=account(actor);
 const requestId=request.headers.get('x-chat-request-id');
 if(requestId)return startJournaledInference(request,env,ctx,actor,requestId,planType);
 if(planType==='free')return fail(403,'SITE_INFERENCE_PLAN_REQUIRED','请更新至支持标准聊天的本站版本，或开通站内试用。');
 if(planType==='go')return fail(403,'SITE_INFERENCE_PLAN_REQUIRED','请更新至支持请求恢复的本站版本。');
 return proxyDocodeResponses(request,env.DOCODE_API_KEY);
}
async function largeBody(request,limit=2000000){if(Number(request.headers.get('Content-Length'))>limit)throw Error('Request too large');const text=await request.text();if(text.length>limit)throw Error('Request too large');return JSON.parse(text||'{}');}
async function bridgeIdentity(request,env){const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');if(!/^[a-f0-9]{64}$/.test(token))return null;return query(env,'SELECT * FROM bridges WHERE token_hash=? AND revoked=0',await digest(token)).first();}
const leaseMs=30000;
const uuidPattern=/^[a-f0-9-]{36}$/i;
const maxSlots=value=>Number.isInteger(value)?Math.max(1,Math.min(3,value)):1;
const changes=result=>Number(result?.meta?.changes??result?.changes??0);
function safeJobError(value){if(value==null)return null;if(typeof value==='string')return value.slice(0,2000);return JSON.stringify({message:String(value.message||'The local host request failed').slice(0,2000),code:typeof value.code==='string'?value.code:null,httpStatus:Number.isInteger(value.httpStatus)?value.httpStatus:null,requestId:typeof value.requestId==='string'?value.requestId:null,param:typeof value.param==='string'?value.param:null});}
function errorFields(value){if(!value)return{error:null,errorDetails:null};try{const data=JSON.parse(value);if(data&&typeof data==='object')return{error:data.message||'The local host request failed',errorDetails:data};}catch{}return{error:value,errorDetails:null};}
async function eventAck(env,id){return(await query(env,'SELECT MAX(seq) AS seq FROM job_events WHERE job_id=?',id).first()).seq??-1;}
async function bridgeStatus(env){const peer=await query(env,'SELECT id,last_seen,profile FROM bridges WHERE revoked=0 ORDER BY last_seen DESC LIMIT 1').first();return peer?{online:peer.last_seen>Date.now()-75000,lastSeen:peer.last_seen,profile:JSON.parse(peer.profile),source:'authorized-local-host',protocolVersion:4}:{online:false,lastSeen:null,profile:null,source:'not-paired',protocolVersion:4};}
async function bridgeRoute(request,env,path){
 const peer=await bridgeIdentity(request,env);if(!peer)return fail(401,'BRIDGE_AUTH_REQUIRED','本机连接未配对或已撤销。');
 if(path==='/bridge/poll'&&request.method==='POST'){
  const data=await largeBody(request,200000),profile=data.profile||{},modern=uuidPattern.test(data.instanceId||''),owner=modern?data.instanceId:peer.id;
  const active=Array.isArray(data.activeJobIds)?[...new Set(data.activeJobIds)]:[];
  if(active.length>3||active.some(id=>typeof id!=='string'||!uuidPattern.test(id)))return fail(400,'INVALID_ACTIVE_JOBS','活跃任务列表无效。');
  const capacity=modern?maxSlots(profile.capabilities?.maxConcurrentJobs):1;
  const safe={planType:typeof profile.planType==='string'?profile.planType:null,models:Array.isArray(profile.models)?profile.models.slice(0,100).map(m=>({slug:String(m.slug||m.id||''),display_name:String(m.display_name||m.name||m.slug||m.id||''),visibility:m.visibility||'list'})):[],authenticated:profile.authenticated===true,quota:profile.quota?{remaining:typeof profile.quota.remaining==='number'?profile.quota.remaining:null,state:profile.quota.state==='request-paused'?'request-paused':'unknown',errorCode:String(profile.quota.errorCode||profile.quota.code||''),resetAt:profile.quota.resetAt||null,source:String(profile.quota.source||'official-service'),updatedAt:Date.now()}:null,capabilities:{protocolVersion:modern?4:3,maxConcurrentJobs:capacity,cancelInference:modern&&profile.capabilities?.cancelInference===true},updatedAt:Date.now()};
  await query(env,'UPDATE bridges SET last_seen=?,profile=? WHERE id=?',Date.now(),JSON.stringify(safe),peer.id).run();
  for(const id of active)await query(env,"UPDATE jobs SET claim_expires_at=? WHERE id=? AND bridge_id=? AND claim_owner=? AND status IN ('claimed','streaming')",Date.now()+leaseMs,id,peer.id,owner).run();
  if(!safe.authenticated||!safe.models.length||safe.quota?.state==='request-paused'){
   if(safe.quota?.state==='request-paused')await query(env,"UPDATE jobs SET status='failed',updated_at=?,error=? WHERE bridge_id=? AND status='queued'",Date.now(),safeJobError({message:'ChatGPT 订阅额度暂时不可用。',code:safe.quota.errorCode,httpStatus:429}),peer.id).run();
   return json({job:null,capacity,protocolVersion:4});
  }
  if(active.length>=capacity)return json({job:null,capacity,protocolVersion:4});
  const exclude=active.length?' AND id NOT IN ('+active.map(()=>'?').join(',')+')':'';
  for(let retry=0;retry<4;retry++){
   const instant=Date.now();
   const pending=await query(env,"SELECT id,payload,status,claim_count,claim_owner,claim_expires_at FROM jobs WHERE bridge_id=? AND status IN ('queued','claimed','streaming') AND (status='queued' OR claim_expires_at<? OR (?=0 AND claim_owner=?))"+exclude+" ORDER BY CASE WHEN status='queued' THEN 1 ELSE 0 END,created_at,id LIMIT 1",peer.id,instant,modern?1:0,owner,...active).first();
   if(!pending)return json({job:null,capacity,protocolVersion:4});
   const claimed=await query(env,"UPDATE jobs SET status=CASE WHEN status='queued' THEN 'claimed' ELSE status END,claim_owner=?,claim_expires_at=?,claim_count=claim_count+1,updated_at=? WHERE id=? AND bridge_id=? AND status=? AND claim_count=? AND COALESCE(claim_owner,'')=? AND claim_expires_at=? AND NOT EXISTS(SELECT 1 FROM job_cancellations WHERE job_id=jobs.id) AND ((?=0 AND status!='queued' AND claim_owner=?) OR (SELECT COUNT(*) FROM jobs j WHERE j.bridge_id=? AND j.status IN ('claimed','streaming') AND j.claim_expires_at>?)<?)",owner,instant+leaseMs,instant,pending.id,peer.id,pending.status,pending.claim_count,pending.claim_owner||'',pending.claim_expires_at,modern?1:0,owner,peer.id,instant,capacity).run();
   if(changes(claimed))return json({job:{id:pending.id,payload:JSON.parse(pending.payload),resume:pending.status!=='queued'||pending.claim_count>0},capacity,protocolVersion:4});
  }
  return json({job:null,capacity,protocolVersion:4});
 }
 const match=/^\/bridge\/jobs\/([a-f0-9-]+)\/(events|heartbeat)$/.exec(path);
 if(match&&request.method==='POST'){
  const job=await query(env,'SELECT id,status,claim_owner FROM jobs WHERE id=? AND bridge_id=?',match[1],peer.id).first();if(!job)return fail(404,'JOB_NOT_FOUND','任务不存在。');
  if(job.status==='cancelled')return json({cancelled:true,status:'cancelled',ackSeq:await eventAck(env,job.id)});
  if(['complete','failed'].includes(job.status))return json({accepted:true,status:job.status,terminal:true,ackSeq:await eventAck(env,job.id)});
  const data=await largeBody(request,400000),owner=uuidPattern.test(data.instanceId||'')?data.instanceId:peer.id;
  if(job.claim_owner&&job.claim_owner!==owner)return fail(409,'JOB_CLAIM_CHANGED','此任务已属于另一个本机进程；不能继续提交旧进程的结果。');
  if(match[2]==='heartbeat'){
   await env.DB.batch([query(env,'UPDATE bridges SET last_seen=? WHERE id=?',Date.now(),peer.id),query(env,"UPDATE jobs SET claim_expires_at=? WHERE id=? AND status IN ('claimed','streaming')",Date.now()+leaseMs,job.id)]);
   const latest=await query(env,'SELECT status FROM jobs WHERE id=?',job.id).first();return json({accepted:true,cancelled:latest.status==='cancelled',status:latest.status,terminal:['complete','failed'].includes(latest.status),ackSeq:await eventAck(env,job.id)});
  }
  const events=Array.isArray(data.events)?data.events:[];
  if(events.length>100||events.some(event=>!Number.isSafeInteger(event.seq)||event.seq<0||JSON.stringify(event.data||{}).length>100000))return fail(400,'INVALID_EVENTS','任务事件格式不正确。');
  let cursor=await eventAck(env,job.id);
  for(const event of events){if(event.seq<=cursor){const old=await query(env,'SELECT data FROM job_events WHERE job_id=? AND seq=?',job.id,event.seq).first();if(!old||old.data!==JSON.stringify(event.data))return fail(409,'EVENT_SEQUENCE_CONFLICT','重复事件的内容不一致。');}else if(event.seq!==++cursor)return fail(409,'EVENT_SEQUENCE_GAP','事件必须从0开始连续提交。');}
  const state=['complete','failed'].includes(data.status)?data.status:'streaming';
  if(state!=='streaming'){const last=events.at(-1)?.data||JSON.parse((await query(env,'SELECT data FROM job_events WHERE job_id=? ORDER BY seq DESC LIMIT 1',job.id).first())?.data||'null');if(last?.type!=='end')return fail(400,'TERMINAL_END_REQUIRED','终止状态必须包含真实流结束事件。');}
  const writes=events.map(event=>query(env,"INSERT OR IGNORE INTO job_events(job_id,seq,data) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM jobs WHERE id=? AND status NOT IN ('complete','failed','cancelled'))",job.id,event.seq,JSON.stringify(event.data),job.id));
  writes.push(query(env,"UPDATE jobs SET status=?,updated_at=?,error=?,claim_expires_at=? WHERE id=? AND status NOT IN ('complete','failed','cancelled')",state,Date.now(),safeJobError(data.error),Date.now()+leaseMs,job.id));
  writes.push(query(env,'UPDATE bridges SET last_seen=? WHERE id=?',Date.now(),peer.id));
  if(data.usage)writes.push(query(env,'INSERT OR IGNORE INTO usage_events(id,source,model,input_tokens,output_tokens,created_at,error_code) VALUES(?,?,?,?,?,?,?)',job.id,'chatgpt-plan',String(data.model||''),Math.max(0,Number(data.usage.input_tokens)||0),Math.max(0,Number(data.usage.output_tokens)||0),Date.now(),typeof data.error?.code==='string'?data.error.code:data.errorCode?String(data.errorCode):null));
  await env.DB.batch(writes);const latest=await query(env,'SELECT status FROM jobs WHERE id=?',job.id).first();return json({accepted:true,status:latest.status,cancelled:latest.status==='cancelled',ackSeq:await eventAck(env,job.id)});
 }
 return fail(404,'BRIDGE_ROUTE_NOT_FOUND','本机连接接口不存在。');
}

async function route(request,env,ctx){const path=new URL(request.url).pathname;
 if(path==='/health'){
  const admin=await configured(env);
  return json({
   ready:true,adminConfigured:Boolean(admin),storage:'D1',version:'admin-auth-1',
   inferenceConfigured:siteInferenceConfigured(env.DOCODE_API_KEY),
   billingConfigured:siteBillingConfigured(env),
   dotComputerConfigured:desktopConfigured(env),
  });
 }
 if(path==='/auth/register'&&request.method==='POST'){
  const administrator=await configured(env),data=await readBody(request),username=normalize(data.username);
  if(!/^[\p{L}\p{N}_-]{3,32}$/u.test(username)||typeof data.password!=='string'||data.password.length<8||data.password.length>128)return fail(400,'INVALID_REGISTRATION','用户名需为3–32个文字、数字、下划线或短横线，密码需为8–128位。');
  if(username===administrator?.username||await query(env,'SELECT id FROM users WHERE username=?',username).first())return fail(409,'USERNAME_UNAVAILABLE','此用户名已被使用。');
  const salt=hex(crypto.getRandomValues(new Uint8Array(16))),user={id:crypto.randomUUID(),username,display_name:String(data.username).normalize('NFKC').trim(),created_at:Date.now()};
  const accountInsert=query(env,'INSERT INTO users(id,username,display_name,password_hash,password_salt,created_at) VALUES(?,?,?,?,?,?)',
   user.id,user.username,user.display_name,await userPasswordHash(data.password,salt),salt,user.created_at);
  try{
   return await issueUserSession(env,user,accountInsert);
  }catch(error){
   if(/UNIQUE constraint failed:\s*users\.username\b/i.test(error.message))return fail(409,'USERNAME_UNAVAILABLE','此用户名已被使用。');
   throw error;
  }
 }
 if(path==='/auth/login'&&request.method==='POST'){
  await configured(env);const data=await readBody(request),username=normalize(data.username);
  if(!username||typeof data.password!=='string'||data.password.length>256)return fail(400,'INVALID_CREDENTIALS','请输入用户名和密码。');
  const bucket=await digest((request.headers.get('cf-connecting-ip')||'unknown')+':'+username+':'+Math.floor(Date.now()/900000));
  await query(env,'INSERT INTO login_limits(key,attempts,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1',bucket,Date.now()+900000).run();
  const limit=await query(env,'SELECT attempts FROM login_limits WHERE key=?',bucket).first();if(limit.attempts>12)return fail(429,'LOGIN_RATE_LIMIT','尝试次数过多，请稍后再试。');
  const admin=await query(env,'SELECT * FROM administrators WHERE id=1 AND username=?',username).first();
  if(!admin){
   const user=await query(env,`
    SELECT u.*,t.tier AS site_trial_tier,t.expires_at AS site_trial_expires_at, ${paidSubscriptionColumns}
    FROM users u LEFT JOIN site_trials t ON t.user_id=u.id ${paidSubscriptionJoin} WHERE u.username=?`,siteBillingMode(env),Date.now(),username).first();
   if(!user||!equal(await userPasswordHash(data.password,user.password_salt),user.password_hash))return fail(401,'INVALID_CREDENTIALS','用户名或密码不正确。');
   return issueUserSession(env,user);
  }
  if(!equal(await passwordHash(data.password,admin.password_salt),admin.password_hash))return fail(401,'INVALID_CREDENTIALS','用户名或密码不正确。');
  const token=hex(crypto.getRandomValues(new Uint8Array(32))),expiresAt=Date.now()+30*86400000;
  await env.DB.batch([query(env,'INSERT INTO sessions(token_hash,admin_id,expires_at,created_at) VALUES(?,1,?,?)',await digest(token),expiresAt,Date.now()),query(env,'DELETE FROM login_limits WHERE expires_at<?',Date.now()),query(env,'DELETE FROM sessions WHERE expires_at<?',Date.now())]);return json({token,expiresAt,user:account(admin)});
 }
 if(path.startsWith('/bridge/')&&!['/bridge/pair','/bridge/status','/bridge/revoke'].includes(path))return bridgeRoute(request,env,path);
 if(path.startsWith('/sync/'))return handleChatSync(request,env,await session(request,env));
 if(path.startsWith('/billing/v1/'))return handleSiteBilling(request,env,
  path==='/billing/v1/options'||path==='/billing/v1/webhook'?null:await session(request,env));
 const actor=await session(request,env);
 if(path.startsWith('/dot-computer/v1/'))return handleDotComputer(request,env,ctx,actor,actor&&account(actor).planType==='pro');
 if(path==='/auth/site-trial')return claimSiteTrial(request,env,actor);
 if(path==='/inference/v1/responses')return siteInference(request,env,ctx,actor);
 const recoveryPath=/^\/inference\/v1\/responses\/([^/]+)$/.exec(path);
 if(recoveryPath)return actor?readJournaledInference(request,env,actor,recoveryPath[1]):fail(401,'SITE_AUTH_REQUIRED','请先登录本站账户。');
 if(!actor)return fail(401,'ADMIN_AUTH_REQUIRED','请先登录管理员账户。');
 if(path==='/auth/session')return json({user:account(actor),expiresAt:actor.sessionExpiresAt});
 if(path==='/auth/logout'&&request.method==='POST'){const tokenHash=await digest(request.headers.get('authorization').replace(/^Bearer\s+/i,''));await env.DB.batch([query(env,'DELETE FROM sessions WHERE token_hash=?',tokenHash),query(env,'DELETE FROM user_sessions WHERE token_hash=?',tokenHash)]);return json({signedOut:true});}
 if(path==='/inference/v1/usage'&&request.method==='GET'){
  const plan=account(actor);
  const usage=await readSiteInferenceUsage(env,actor,plan.planType);
  return json({sources:[usage],plan,subscription:{remaining:null,source:'not-reported-by-official-service'}});
 }
 if(actor.role!=='administrator')return fail(403,'ADMIN_MEMBERSHIP_REQUIRED','此功能需要管理员 Pro 账户。');
 if(path==='/bridge/status')return json(await bridgeStatus(env));
 if(path==='/bridge/pair'&&request.method==='POST'){const id=crypto.randomUUID(),token=hex(crypto.getRandomValues(new Uint8Array(32)));await query(env,'INSERT INTO bridges(id,token_hash,last_seen,profile) VALUES(?,?,?,?)',id,await digest(token),0,'{}').run();return json({bridgeId:id,bridgeToken:token});}
 if(path==='/bridge/revoke'&&request.method==='POST'){const data=await readBody(request),id=String(data.bridgeId||'');await env.DB.batch([query(env,'UPDATE bridges SET revoked=1 WHERE id=?',id),query(env,"INSERT OR IGNORE INTO job_cancellations(job_id,created_at) SELECT id,? FROM jobs WHERE bridge_id=? AND status NOT IN ('complete','failed','cancelled')",Date.now(),id),query(env,"UPDATE jobs SET status='cancelled',updated_at=? WHERE bridge_id=? AND status NOT IN ('complete','failed','cancelled')",Date.now(),id)]);return json({revoked:true});}
 if(path==='/jobs'&&request.method==='POST'){
  const data=await largeBody(request),payload=data.payload;
  if(typeof payload?.model!=='string'||!Array.isArray(payload.input))return fail(400,'INVALID_INFERENCE','缺少所选模型或对话历史。');
  const id=/^[a-f0-9-]{36}$/i.test(data.id||'')?data.id:crypto.randomUUID();
  const previous=await query(env,'SELECT id,status,payload FROM jobs WHERE id=?',id).first();
  if(previous){if(previous.payload!==JSON.stringify(payload))return fail(409,'JOB_ID_CONFLICT','任务编号已对应另一项请求。');return json({id:previous.id,status:previous.status,reattached:true},202);}
  if(await query(env,'SELECT job_id FROM job_cancellations WHERE job_id=?',id).first())return json({id,status:'cancelled',reattached:true},202);
  const online=await query(env,'SELECT id,profile FROM bridges WHERE revoked=0 AND last_seen>? ORDER BY last_seen DESC LIMIT 1',Date.now()-75000).first();
  if(!online||JSON.parse(online.profile).authenticated!==true)return fail(409,'BRIDGE_OFFLINE','授权的本机未在线，使用备用 API。');
  if(JSON.parse(online.profile).quota?.state==='request-paused')return fail(429,'SUBSCRIPTION_QUOTA_EXHAUSTED','ChatGPT 订阅额度暂时不可用。请到官网用量页面查看恢复时间。');
  const available=JSON.parse(online.profile).models||[];if(!available.some(model=>model.slug===payload.model))return fail(400,'SUBSCRIPTION_MODEL_UNAVAILABLE','本机订阅未提供所选模型，请选择账户支持的模型。');
  await query(env,"INSERT OR IGNORE INTO jobs(id,bridge_id,payload,status,created_at,updated_at) SELECT ?,?,?,'queued',?,? WHERE NOT EXISTS(SELECT 1 FROM job_cancellations WHERE job_id=?)",id,online.id,JSON.stringify(payload),Date.now(),Date.now(),id).run();
  const created=await query(env,'SELECT id,status,payload FROM jobs WHERE id=?',id).first();
  if(!created)return json({id,status:'cancelled',reattached:true},202);
  if(created.payload!==JSON.stringify(payload))return fail(409,'JOB_ID_CONFLICT','任务编号已对应另一项请求。');
  return json({id,status:created.status},202);
 }
 const jobPath=/^\/jobs\/([a-f0-9-]+)(?:\/events)?$/.exec(path);
 if(jobPath){
  const job=await query(env,'SELECT id,status,updated_at,error FROM jobs WHERE id=?',jobPath[1]).first();
  if(request.method==='DELETE'){
   if(job&&['complete','failed'].includes(job.status))return json({cancelled:false,alreadyTerminal:true,status:job.status});
   await env.DB.batch([query(env,'INSERT OR IGNORE INTO job_cancellations(job_id,created_at) VALUES(?,?)',jobPath[1],Date.now()),query(env,"UPDATE jobs SET status='cancelled',updated_at=? WHERE id=? AND status NOT IN ('complete','failed')",Date.now(),jobPath[1])]);
   const latest=await query(env,'SELECT status FROM jobs WHERE id=?',jobPath[1]).first();return latest&&['complete','failed'].includes(latest.status)?json({cancelled:false,alreadyTerminal:true,status:latest.status}):json({cancelled:true,status:'cancelled'});
  }
  if(!job){const stopped=await query(env,'SELECT created_at FROM job_cancellations WHERE job_id=?',jobPath[1]).first();return stopped?json({id:jobPath[1],status:'cancelled',updated_at:stopped.created_at,error:null,errorDetails:null,events:[]}):fail(404,'JOB_NOT_FOUND','任务不存在。');}
  const rawAfter=new URL(request.url).searchParams.get('after'),after=rawAfter===null?-1:Number(rawAfter);if(!Number.isSafeInteger(after)||after< -1)return fail(400,'INVALID_CURSOR','无效的恢复位置。');
  const events=await query(env,'SELECT seq,data FROM job_events WHERE job_id=? AND seq>? ORDER BY seq LIMIT 100',job.id,after).all();return json({...job,...errorFields(job.error),events:events.results.map(event=>({seq:event.seq,data:JSON.parse(event.data)}))});
 }
 if(path==='/usage'){const sums=await query(env,'SELECT source,COUNT(*) AS requests,SUM(input_tokens) AS input_tokens,SUM(output_tokens) AS output_tokens FROM usage_events GROUP BY source').all();return json({sources:sums.results,subscription:{remaining:null,source:'not-reported-by-official-service'},officialUsageUrl:'https://chatgpt.com/settings/usage'});}
 return fail(404,'ROUTE_NOT_FOUND','接口不存在。');
}
export default {async fetch(request,env,ctx){const origin=request.headers.get('origin'),own=new URL(request.url).origin,allowed=new Set(['https://tycofficial.github.io','http://127.0.0.1:4400','http://127.0.0.1:1455']);if(origin&&!allowed.has(origin)&&origin!==own)return fail(403,'ORIGIN_NOT_ALLOWED','此来源没有访问权限。');let response;try{response=request.method==='OPTIONS'?new Response(null,{status:204}):await route(request,env,ctx);}catch{response=fail(503,'SERVICE_UNAVAILABLE','账户服务暂时不可用，请稍后重试。');}const headers=new Headers(response.headers);if(origin){headers.set('Access-Control-Allow-Origin',origin);headers.set('Vary','Origin');headers.set('Access-Control-Allow-Headers','Content-Type,Authorization,X-Chat-Request-Id');headers.set('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');}headers.set('X-Content-Type-Options','nosniff');return new Response(response.body,{status:response.status,headers});}};
