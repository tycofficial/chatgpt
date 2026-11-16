/** Site-admin session. OpenAI credentials are never stored by this module. */
export const SITE_ACCOUNT_SERVICE='https://chatgpt-admin-bridge-tyc.hushedtarragon1.chatgpt.site';
const storageKey='chatgpt-site-admin-session:v1';
let verifiedAccount=null,remembered=null,lastError=null;
try{remembered=JSON.parse(globalThis.localStorage.getItem(storageKey)||'null');}catch{}
export const getSiteAccount=()=>verifiedAccount;
export const hasModelSelectionAccess=()=>verifiedAccount?.role==='administrator'&&verifiedAccount?.planType==='pro';
export const getSiteSessionToken=()=>verifiedAccount?remembered?.token:null;
export const getSiteAccountError=()=>lastError;
export function getSiteLoginUrl(){return new URL((globalThis.__CHATGPT_REPLICA_ENV__?.basePath||'/')+'login',globalThis.location.origin);}
async function api(path,{body,token,signal}={}){
 const response=await fetch(SITE_ACCOUNT_SERVICE+path,{method:body===undefined?'GET':'POST',credentials:'omit',redirect:'error',cache:'no-store',headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body),signal});
 const result=await response.json();if(!response.ok)throw Object.assign(Error(result.error?.message||'账户服务暂时不可用。'),{status:response.status,code:result.error?.code});return result;
}
export async function initializeSiteAccount(){
 if(!remembered?.token||remembered.expiresAt<=Date.now()){remembered=null;return null;}
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{const data=await api('/auth/session',{token:remembered.token,signal:controller.signal});if(data.user?.role!=='administrator'||data.user?.planType!=='pro')throw Error('账户权限验证失败。');verifiedAccount=data.user;remembered.user=data.user;globalThis.localStorage.setItem(storageKey,JSON.stringify(remembered));return verifiedAccount;}
 catch(error){lastError=error.message;if(error.status===401){remembered=null;globalThis.localStorage.removeItem(storageKey);}return null;}
 finally{clearTimeout(timer);}
}
export async function loginSiteAccount(username,password){
 const result=await api('/auth/login',{body:{username,password}});
 if(!/^[a-f0-9]{64}$/.test(result.token)||result.user?.role!=='administrator')throw Error('账户服务返回了无效的登录结果。');
 remembered=result;verifiedAccount=result.user;lastError=null;globalThis.localStorage.setItem(storageKey,JSON.stringify(result));globalThis.sessionStorage.setItem('original-client-prototype-local-session','1');return result.user;
}
export async function logoutSiteAccount(){
 const token=remembered?.token;verifiedAccount=null;remembered=null;globalThis.localStorage.removeItem(storageKey);
 if(token)try{await api('/auth/logout',{body:{},token});}catch{}
}
export function safeSiteReturnUrl(value){const base=globalThis.__CHATGPT_REPLICA_ENV__?.basePath||'/';try{const target=new URL(value||base,location.origin);if(target.origin===location.origin&&target.pathname.startsWith(base)&&!target.pathname.endsWith('/login')){target.searchParams.delete('localSession');target.searchParams.delete('refresh_account');target.searchParams.delete('startup_account_refresh');return target;}}catch{}return new URL(base,location.origin);}
export function renderSiteLoginPage(){
 const style=document.createElement('style');style.textContent=`:root{color-scheme:light dark}body{margin:0;background:#fff;color:#111;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif}.site-login{min-height:100dvh;display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:72px 24px}.site-login-brand{position:absolute;top:24px;left:28px;font-size:21px;font-weight:600}.site-login-panel{width:100%;max-width:352px;text-align:center}.site-login h1{font-size:32px;line-height:40px;letter-spacing:-.6px;margin:0 0 12px;font-weight:600}.site-login p{font-size:14px;line-height:22px;color:#666;margin:0 0 28px}.site-login label{display:block;text-align:left;font-size:14px;margin:20px 0 8px}.site-login input{width:100%;height:54px;border:1px solid #aaa;border-radius:28px;box-sizing:border-box;padding:0 20px;font:inherit;background:transparent;color:inherit;outline:none}.site-login input:focus{border-color:#111;box-shadow:0 0 0 1px currentColor}.site-login button{width:100%;height:52px;border:0;border-radius:28px;margin-top:28px;background:#111;color:white;font:inherit;cursor:pointer}.site-login button:disabled{opacity:.45;cursor:wait}.site-login .site-login-error{color:#c22;min-height:22px;margin-top:16px}.site-login a{color:inherit;text-decoration:underline;font-size:14px}.site-login footer{position:absolute;bottom:24px;font-size:12px;color:#777}@media(prefers-color-scheme:dark){body{background:#212121;color:#ececec}.site-login p{color:#aaa}.site-login input:focus{border-color:#eee}.site-login button{background:#fff;color:#111}}`;
 document.head.append(style);document.body.replaceChildren();
 const main=document.createElement('main');main.className='site-login';
 main.innerHTML='<div class="site-login-brand">ChatGPT</div><section class="site-login-panel"><h1>欢迎回来</h1><p>登录你的本站管理员账户</p><form><label for="site-username">用户名</label><input id="site-username" name="username" autocomplete="username" autocapitalize="off" spellcheck="false" required><label for="site-password">密码</label><input id="site-password" name="password" type="password" autocomplete="current-password" required><button type="submit">继续</button><p class="site-login-error" role="alert" aria-live="polite"></p></form><a class="site-login-back">返回 ChatGPT</a></section><footer>本站账户登录</footer>';
 const form=main.querySelector('form'),message=main.querySelector('[role=alert]'),button=main.querySelector('button'),back=main.querySelector('a');
 const target=safeSiteReturnUrl(new URL(location.href).searchParams.get('next'));back.href=target.href;
 form.addEventListener('submit',async event=>{event.preventDefault();button.disabled=true;message.textContent='正在验证账户…';try{await loginSiteAccount(form.elements.username.value,form.elements.password.value);form.elements.password.value='';message.textContent='登录成功，正在进入 Pro 账户…';location.assign(target.href);}catch(error){message.textContent=error.message||'登录失败，请重试。';button.disabled=false;}});
 document.body.append(main);document.title='登录 — ChatGPT';
}
