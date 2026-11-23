import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';

const url = new URL(process.env.STUDIO_API_ORIGIN);
assert.equal(url.protocol, 'https:');
assert.match(url.hostname, /\.(?:ai\.studio|run\.app)$/);
assert.equal(url.href, url.origin + '/');
assert.ok(!url.username && !url.password);
const pages = 'https://tycofficial.github.io';
const options = { method:'OPTIONS', headers:{Origin:pages, 'Access-Control-Request-Method':'POST',
  'Access-Control-Request-Headers':'authorization,content-type,x-chat-request-id'} };
async function request(path, init) {
  const started = performance.now();
  const reply = await fetch(new URL(path, url), { redirect:'manual', signal:AbortSignal.timeout(15000), ...init });
  console.log(JSON.stringify({ path, method:init?.method ?? 'GET', status:reply.status, ms:Math.round(performance.now()-started),
    cors:reply.headers.get('access-control-allow-origin'), type:reply.headers.get('content-type'),
    redirectOrigin:reply.headers.get('location') ? new URL(reply.headers.get('location'), url).origin : null }));
  return reply;
}
const [health, loginCors, inferenceCors, wrongOrigin] = await Promise.all([
  request('/health'), request('/auth/login', options), request('/inference/v1/responses', options),
  request('/auth/login',{...options,headers:{...options.headers, Origin:'https://origin-check.invalid'}}),
]);
assert.equal(health.status,200);
const healthBody = await health.json();
console.log(JSON.stringify({persistentStorage:healthBody.storage ?? healthBody.database ?? null,
  applicationVersion:healthBody.version ?? null}));
for (const reply of [loginCors,inferenceCors]) {
  assert.equal(reply.status,204);
  assert.equal(reply.headers.get('access-control-allow-origin'),pages);
  const allowed = (reply.headers.get('access-control-allow-headers') ?? '').toLowerCase().split(/\s*,\s*/);
  for (const header of ['content-type','authorization','x-chat-request-id']) assert.ok(allowed.includes(header));
}
assert.notEqual(wrongOrigin.headers.get('access-control-allow-origin'),'*');
assert.notEqual(wrongOrigin.headers.get('access-control-allow-origin'),'https://origin-check.invalid');
const suffix = randomBytes(8).toString('hex');
const user = {username:'qa_' + suffix,password:randomBytes(24).toString('base64url')};
const jsonHeaders = {Origin:pages,'Content-Type':'application/json'};
async function post(path, body, token) {
  return request(path,{method:'POST', headers:token ? {...jsonHeaders,Authorization:'Bearer '+token} : jsonHeaders, body:JSON.stringify(body)});
}
async function read(path, token) {
  return request(path,{headers:{Origin:pages,Authorization:'Bearer '+token}});
}
const register = await post('/auth/register',user);
assert.ok([200,201].includes(register.status),'Synthetic account registration failed');
const principal = await register.json();
assert.match(principal.token, /^[a-f0-9]{64}$/);
assert.equal(typeof principal.user?.id,'string');
assert.equal(principal.user.role,'user');
assert.equal(principal.user.planType,'free');
assert.equal(principal.user.membershipSource,'site-registration');
assert.equal(principal.user.officialSubscriptionVerified,false);
const sync = await read('/sync/conversations',principal.token);
assert.equal(sync.status,200);
const id = randomUUID(), document = { id, title: 'Deployment smoke conversation' };
const syncPath = '/sync/conversations/' + id;
const mutation = { baseRevision: 0, mutationId: randomUUID(), document };
const syncWrite = await request(syncPath, { method:'PUT', headers:{...jsonHeaders, Authorization:'Bearer '+principal.token},
  body:JSON.stringify(mutation) });
assert.equal(syncWrite.status,200);
assert.equal((await syncWrite.json()).revision,1);
const retry = await request(syncPath, { method:'PUT', headers:{...jsonHeaders, Authorization:'Bearer '+principal.token},
  body:JSON.stringify(mutation) });
assert.equal(retry.status,200);
const duplicate = await retry.json();
assert.equal(duplicate.revision,1);
assert.equal(duplicate.replayed,true);
assert.equal((await post('/auth/logout',{},principal.token)).status,200);
assert.equal((await read('/auth/session',principal.token)).status,401);
const login = await post('/auth/login',user);
assert.equal(login.status,200);
const restored = await login.json();
assert.equal(restored.user.id,principal.user.id);
const session = await read('/auth/session',restored.token);
assert.equal(session.status,200);
assert.equal((await session.json()).user.id,principal.user.id);
try {
  const secondSession = await read(syncPath,restored.token);
  assert.equal(secondSession.status,200);
  assert.deepEqual((await secondSession.json()).document,document);
  if (process.env.STUDIO_TEST_MODEL === '1') {
    const requestId = randomUUID(), route = '/inference/v1/responses';
    const makeRequest = () => request(route,{
      method:'POST', headers:{...jsonHeaders, Authorization:'Bearer '+restored.token, 'X-Chat-Request-Id':requestId},
      body: JSON.stringify({model:'gpt-6-sol',stream:true,store:false,max_output_tokens:32,
        input:[{role:'user',content:[{type:'input_text',text:'Reply with API QA.'}]}]})
    });
    const reply = await makeRequest();
    assert.equal(reply.status,200);
    assert.match(reply.headers.get('content-type'),/^text\/event-stream\b/);
    const stream = await reply.text();
    assert.match(stream,/response\.completed/);
    const repeat = await makeRequest();
    assert.equal(repeat.status,202);
    assert.equal((await repeat.json()).reattached,true);
    const receipt = await read(route+'/'+requestId+'?after=-1',restored.token);
    assert.equal(receipt.status,200);
    console.log('Live inference and same-request reattachment passed');
  }
  console.log('Live API smoke passed with an isolated test account and restored conversation');
} finally {
  await post('/auth/logout',{},restored.token);
}
