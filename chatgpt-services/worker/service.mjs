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
function equal(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let difference=0;for(let i=0;i<a.length;i++)difference|=a.charCodeAt(i)^b.charCodeAt(i);return difference===0;}
async function configured(env){if(!env.DB)throw Error('DB unavailable');if(env.ADMIN_USERNAME&&env.ADMIN_PASSWORD_HASH&&env.ADMIN_PASSWORD_SALT)await query(env,'INSERT OR IGNORE INTO administrators(id,username,password_hash,password_salt,created_at) VALUES(1,?,?,?,?)',normalize(env.ADMIN_USERNAME),env.ADMIN_PASSWORD_HASH,env.ADMIN_PASSWORD_SALT,Date.now()).run();return query(env,'SELECT id,username,created_at FROM administrators WHERE id=1').first();}
async function session(request,env){const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');if(!/^[a-f0-9]{64}$/.test(token))return null;return query(env,'SELECT a.id,a.username,a.created_at FROM sessions s JOIN administrators a ON a.id=s.admin_id WHERE s.token_hash=? AND s.expires_at>?',await digest(token),Date.now()).first();}
const account=admin=>({id:'site-admin',username:admin.username.toUpperCase(),name:admin.username.toUpperCase(),role:'administrator',planType:'pro',membershipSource:'site-administrator',createdAt:admin.created_at,officialSubscriptionVerified:false});
async function route(request,env){const path=new URL(request.url).pathname;
 if(path==='/health'){const admin=await configured(env);return json({ready:true,adminConfigured:Boolean(admin),storage:'D1',version:'admin-auth-1'});}
 if(path==='/auth/login'&&request.method==='POST'){
  await configured(env);const data=await readBody(request),username=normalize(data.username);
  if(!username||typeof data.password!=='string'||data.password.length>256)return fail(400,'INVALID_CREDENTIALS','请输入用户名和密码。');
  const bucket=await digest((request.headers.get('cf-connecting-ip')||'unknown')+':'+username+':'+Math.floor(Date.now()/900000));
  await query(env,'INSERT INTO login_limits(key,attempts,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1',bucket,Date.now()+900000).run();
  const limit=await query(env,'SELECT attempts FROM login_limits WHERE key=?',bucket).first();if(limit.attempts>12)return fail(429,'LOGIN_RATE_LIMIT','尝试次数过多，请稍后再试。');
  const admin=await query(env,'SELECT * FROM administrators WHERE id=1 AND username=?',username).first();
  if(!admin||!equal(await passwordHash(data.password,admin.password_salt),admin.password_hash))return fail(401,'INVALID_CREDENTIALS','用户名或密码不正确。');
  const token=hex(crypto.getRandomValues(new Uint8Array(32))),expiresAt=Date.now()+30*86400000;
  await env.DB.batch([query(env,'INSERT INTO sessions(token_hash,admin_id,expires_at,created_at) VALUES(?,1,?,?)',await digest(token),expiresAt,Date.now()),query(env,'DELETE FROM login_limits WHERE expires_at<?',Date.now()),query(env,'DELETE FROM sessions WHERE expires_at<?',Date.now())]);return json({token,expiresAt,user:account(admin)});
 }
 const admin=await session(request,env);if(!admin)return fail(401,'ADMIN_AUTH_REQUIRED','请先登录管理员账户。');
 if(path==='/auth/session')return json({user:account(admin)});
 if(path==='/auth/logout'&&request.method==='POST'){await query(env,'DELETE FROM sessions WHERE token_hash=?',await digest(request.headers.get('authorization').replace(/^Bearer\s+/i,''))).run();return json({signedOut:true});}
 if(path==='/bridge/status')return json({online:false,lastSeen:null,profile:null,source:'not-paired'});
 if(path==='/usage'){const sums=await query(env,'SELECT source,COUNT(*) AS requests,SUM(input_tokens) AS input_tokens,SUM(output_tokens) AS output_tokens FROM usage_events GROUP BY source').all();return json({sources:sums.results,subscription:{remaining:null,source:'not-reported-by-official-service'},officialUsageUrl:'https://chatgpt.com/settings/usage'});}
 return fail(404,'ROUTE_NOT_FOUND','接口不存在。');
}
export default {async fetch(request,env){const origin=request.headers.get('origin'),own=new URL(request.url).origin,allowed=new Set(['https://tycofficial.github.io','http://127.0.0.1:4400','http://127.0.0.1:1455']);if(origin&&!allowed.has(origin)&&origin!==own)return fail(403,'ORIGIN_NOT_ALLOWED','此来源没有访问权限。');let response;try{response=request.method==='OPTIONS'?new Response(null,{status:204}):await route(request,env);}catch{response=fail(503,'SERVICE_UNAVAILABLE','账户服务暂时不可用，请稍后重试。');}const headers=new Headers(response.headers);if(origin){headers.set('Access-Control-Allow-Origin',origin);headers.set('Vary','Origin');headers.set('Access-Control-Allow-Headers','Content-Type,Authorization');headers.set('Access-Control-Allow-Methods','GET,POST,DELETE,OPTIONS');}headers.set('X-Content-Type-Options','nosniff');return new Response(response.body,{status:response.status,headers});}};
