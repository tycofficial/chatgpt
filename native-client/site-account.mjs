/** Verified site-admin session; cached user fields never grant permission. */
export const SITE_ACCOUNT_SERVICE='https://chatgpt-admin-bridge-tyc.hushedtarragon1.chatgpt.site';
const storageKey='chatgpt-site-admin-session:v1';
let verifiedAccount=null,remembered=null,lastError=null,requestGeneration=0;
const isToken=token=>typeof token==='string'&&/^[a-f0-9]{64}$/.test(token);
const isFutureExpiry=value=>typeof value==='number'&&Number.isFinite(value)&&value>Date.now();
const validSession=record=>record&&isToken(record.token)&&isFutureExpiry(record.expiresAt);
function forgetAccount(error=null){
 verifiedAccount=null;remembered=null;lastError=error;
 try{globalThis.localStorage.removeItem(storageKey);}catch{}
}
try{remembered=JSON.parse(globalThis.localStorage.getItem(storageKey)||'null');}catch{forgetAccount();}
function currentAccount(){
 if(verifiedAccount&&!validSession(remembered)){requestGeneration++;forgetAccount('账户会话已过期，请重新登录。');}
 return verifiedAccount;
}
function accountFromServer(user){
 if(!user||typeof user.username!=='string'||!user.username.trim()||
    typeof user.createdAt!=='number'||!Number.isFinite(user.createdAt)||user.createdAt<0||
    user.officialSubscriptionVerified!==false)throw Error('账户权限验证失败。');
 const common={username:user.username,name:typeof user.name==='string'?user.name:user.username,createdAt:user.createdAt,officialSubscriptionVerified:false};
 if(user.id==='site-admin'&&user.role==='administrator'&&user.planType==='pro'&&user.membershipSource==='site-administrator'){
  return Object.freeze({id:user.id,...common,role:'administrator',planType:'pro',membershipSource:'site-administrator'});
 }
 if(user.role==='user'&&user.planType==='free'&&user.membershipSource==='site-registration'&&
    typeof user.accountId==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.accountId)&&user.id==='site-user:'+user.accountId){
  return Object.freeze({id:user.id,accountId:user.accountId,...common,role:'user',planType:'free',membershipSource:'site-registration'});
 }
 throw Error('账户权限验证失败。');
}
export const getSiteAccount=()=>currentAccount();
export const hasModelSelectionAccess=()=>currentAccount()?.role==='administrator'&&currentAccount()?.planType==='pro';
export const getSiteSessionToken=()=>currentAccount()?remembered.token:null;
export const getSiteAccountError=()=>lastError;
export function getSiteLoginUrl(){return new URL((globalThis.__CHATGPT_REPLICA_ENV__?.basePath||'/')+'login',globalThis.location.origin);}
async function api(path,{body,token,signal}={}){
 const response=await fetch(SITE_ACCOUNT_SERVICE+path,{method:body===undefined?'GET':'POST',credentials:'omit',redirect:'error',cache:'no-store',headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body),signal});
 const result=await response.json();if(!response.ok)throw Object.assign(Error(result.error?.message||'账户服务暂时不可用。'),{status:response.status,code:result.error?.code});return result;
}
export async function initializeSiteAccount(){
 const generation=++requestGeneration;verifiedAccount=null;lastError=null;
 if(!validSession(remembered)){forgetAccount();return null;}
 const candidate={token:remembered.token,expiresAt:remembered.expiresAt};
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{
  const data=await api('/auth/session',{token:candidate.token,signal:controller.signal});
  if(generation!==requestGeneration)return null;
  const user=accountFromServer(data.user);
  // The current service returns only user. Honor an authoritative expiry when supplied.
  if(data.expiresAt!==undefined){if(!isFutureExpiry(data.expiresAt))throw Error('账户会话已过期，请重新登录。');candidate.expiresAt=Math.min(candidate.expiresAt,data.expiresAt);}
  if(!isFutureExpiry(candidate.expiresAt))throw Error('账户会话已过期，请重新登录。');
  const record={...candidate,user};globalThis.localStorage.setItem(storageKey,JSON.stringify(record));
  remembered=record;verifiedAccount=user;return user;
 }catch(error){if(generation===requestGeneration)forgetAccount(error.message||'账户验证失败。');return null;}
 finally{clearTimeout(timer);}
}
async function authenticateSiteAccount(endpoint,username,password){
 const generation=++requestGeneration;forgetAccount();
 try{
  const result=await api(endpoint,{body:{username,password}});
  if(generation!==requestGeneration)throw Error('账户登录已取消。');
  if(!isToken(result.token)||!isFutureExpiry(result.expiresAt))throw Error('账户服务返回了无效的登录结果。');
  const user=accountFromServer(result.user);
  if(endpoint==='/auth/register'&&(user.role!=='user'||user.planType!=='free'))throw Error('注册账户类型无效。');
  const record={token:result.token,expiresAt:result.expiresAt,user};
  globalThis.localStorage.setItem(storageKey,JSON.stringify(record));
  globalThis.sessionStorage.setItem('original-client-prototype-local-session','1');
  remembered=record;verifiedAccount=user;lastError=null;return user;
 }catch(error){if(generation===requestGeneration)forgetAccount(error.message||'登录失败，请重试。');throw error;}
}
export async function loginSiteAccount(username,password){return authenticateSiteAccount('/auth/login',username,password);}
export async function registerSiteAccount(username,password){return authenticateSiteAccount('/auth/register',username,password);}
export async function logoutSiteAccount(){
 const token=remembered?.token;requestGeneration++;forgetAccount();
 if(isToken(token))try{await api('/auth/logout',{body:{},token});}catch{}
}
export function safeSiteReturnUrl(value){const base=globalThis.__CHATGPT_REPLICA_ENV__?.basePath||'/';try{const target=new URL(value||base,location.origin);if(target.pathname===base.replace(/\/$/,''))target.pathname=base;if(target.origin===location.origin&&target.pathname.startsWith(base)&&!/(?:\/auth)?\/(?:login|signup)\/?$/.test(target.pathname)){target.searchParams.delete('localSession');target.searchParams.delete('refresh_account');target.searchParams.delete('startup_account_refresh');return target;}}catch{}return new URL(base,location.origin);}
export function renderSiteLoginPage(){
 const registration=/(?:\/auth)?\/signup\/?$/.test(location.pathname);
 const style=document.createElement('style');style.textContent=`:root{color-scheme:light dark}body{margin:0;background:#fff;color:#111;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif}.site-login{min-height:100dvh;display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:72px 24px}.site-login-brand{position:absolute;top:24px;left:28px;font-size:21px;font-weight:600}.site-login-panel{width:100%;max-width:352px;text-align:center}.site-login h1{font-size:32px;line-height:40px;letter-spacing:-.6px;margin:0 0 12px;font-weight:600}.site-login p{font-size:14px;line-height:22px;color:#666;margin:0 0 28px}.site-login label{display:block;text-align:left;font-size:14px;margin:20px 0 8px}.site-login input{width:100%;height:54px;border:1px solid #aaa;border-radius:28px;box-sizing:border-box;padding:0 20px;font:inherit;background:transparent;color:inherit;outline:none}.site-login input:focus{border-color:#111;box-shadow:0 0 0 1px currentColor}.site-login button{width:100%;height:52px;border:0;border-radius:28px;margin-top:28px;background:#111;color:white;font:inherit;cursor:pointer}.site-login button:disabled{opacity:.45;cursor:wait}.site-login .site-login-error{color:#c22;min-height:22px;margin-top:16px}.site-login a{color:inherit;text-decoration:underline;font-size:14px}.site-login footer{position:absolute;bottom:24px;font-size:12px;color:#777}@media(prefers-color-scheme:dark){body{background:#212121;color:#ececec}.site-login p{color:#aaa}.site-login input:focus{border-color:#eee}.site-login button{background:#fff;color:#111}}`;
 document.head.append(style);document.body.replaceChildren();
 const main=document.createElement('main');main.className='site-login';
 main.innerHTML='<div class="site-login-brand">ChatGPT</div><section class="site-login-panel"><h1>'+(registration?'创建账户':'欢迎回来')+'</h1><p>'+(registration?'使用用户名和密码创建本站免费账户':'登录你的本站账户')+'</p><form><label for="site-username">用户名</label><input id="site-username" name="username" autocomplete="username" autocapitalize="off" spellcheck="false" required><label for="site-password">密码</label><input id="site-password" name="password" type="password" autocomplete="'+(registration?'new-password':'current-password')+'" required'+(registration?' minlength="8" maxlength="128"':'')+'><button type="submit">继续</button><p class="site-login-error" role="alert" aria-live="polite"></p></form><p>'+(registration?'已有账户？':'还没有账户？')+' <a class="site-login-switch">'+(registration?'登录':'注册')+'</a></p><a class="site-login-back">返回 ChatGPT</a></section><footer>本站账户</footer>';
 const form=main.querySelector('form'),message=main.querySelector('[role=alert]'),button=main.querySelector('button'),back=main.querySelector('.site-login-back'),switchLink=main.querySelector('.site-login-switch');
 const target=safeSiteReturnUrl(new URL(location.href).searchParams.get('next'));back.href=target.href;
 const switchURL=new URL((globalThis.__CHATGPT_REPLICA_ENV__?.basePath||'/')+(registration?'login':'signup'),location.origin);switchURL.searchParams.set('next',target.href);switchLink.href=switchURL.href;
 form.addEventListener('submit',async event=>{event.preventDefault();button.disabled=true;message.textContent=registration?'正在创建账户…':'正在验证账户…';try{await(registration?registerSiteAccount:loginSiteAccount)(form.elements.username.value,form.elements.password.value);form.elements.password.value='';message.textContent=registration?'账户已创建，正在进入…':'登录成功，正在进入…';location.assign(target.href);}catch(error){message.textContent=error.message||(registration?'注册失败，请重试。':'登录失败，请重试。');button.disabled=false;}});
 document.body.append(main);document.title=(registration?'注册':'登录')+' — ChatGPT';
}
