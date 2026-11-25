import assert from 'node:assert/strict';
import test from 'node:test';
import { createRelay } from '../ingress/public/_worker.js';

const origin = 'https://tycofficial.github.io';
const worker = 'https://chatgpt-admin-bridge-tyc.hushedtarragon1.chatgpt.site';
const local = 'https://ingress.fixture';
const id = 'af9a9082-af76-4147-8135-ce9230a0d420';
const inference = '/inference/v1/responses';
const hostJob = '/jobs/' + id;
const hostEvents = hostJob + '/events';
const dotThread = '/dot-computer/v1/threads/' + id;
const dotEnvironment = '/dot-computer/v1/environments/' + id;
const request = (path, init = {}) => new Request(local + path, {
  ...init, headers: { Origin: origin, ...init.headers },
});

test('unapproved Origin, method, path, query, media type or request ID makes no upstream request', async () => {
  const relay = createRelay({ fetchUpstream() { assert.fail('unexpected upstream invocation'); } });
  const invalid = [
    [request('/health', { headers: { Origin: 'https://tycofficial.github.io.other.example' } }), 403],
    [new Request(local + '/auth/session'), 403],
    [request('/bridge/pair', { method: 'POST' }), 404],
    [request('/auth/login?upstream=https://other.example', { method: 'POST' }), 400],
    [request('/auth/register'), 405],
    [request('/sync/conversations/%2fadmin'), 404],
    [request('/sync/conversations', { method: 'PUT' }), 405],
    [request(inference + '/' + id + '?after=0&after=1'), 400],
    [request(inference + '/' + id + '?after=9007199254740992'), 400],
    [request(inference + '/not-a-uuid'), 404],
    [request(inference + '/' + id + '?after=-1', { method: 'DELETE' }), 400],
    [request('/auth/login', { method: 'POST', body: '<html>' }), 415],
    [request(inference, { method: 'POST', headers: { 'X-Chat-Request-Id': 'bad' } }), 400],
    [request('/auth/session', { headers: { Authorization: 'Basic abc' } }), 401],
    [request('/bridge/status'), 401],
    [request('/bridge/status', { method: 'POST' }), 405],
    [request('/bridge/status?after=0'), 400],
    [request('/bridge/revoke', { method: 'POST' }), 404],
    [request('/bridge/jobs/' + id + '/events', { method: 'POST' }), 404],
    [request('/jobs', { method: 'POST' }), 401],
    [request('/jobs'), 405],
    [request(hostJob, { method: 'DELETE' }), 401],
    [request(hostJob), 405],
    [request(hostJob + '?after=0', { method: 'DELETE' }), 400],
    [request(hostEvents + '?after=-1'), 401],
    [request(hostEvents + '?after=-1', { method: 'DELETE' }), 405],
    [request(hostEvents), 400],
    [request(hostEvents + '?after=-2'), 400],
    [request(hostEvents + '?after=1.5'), 400],
    [request(hostEvents + '?after=9007199254740992'), 400],
    [request(hostEvents + '?after=0&after=1'), 400],
    [request(hostEvents + '?after=0&upstream=other.example'), 400],
    [request(hostEvents + '/more?after=0'), 404],
    [request('/jobs/not-a-uuid/events?after=0'), 404],
    [request(dotThread), 401],
    [request(dotThread + '/wake', { method: 'POST' }), 401],
    [request(dotThread + '/wake'), 405],
    [request(dotEnvironment + '/frame?url=other.example'), 400],
    [request(dotEnvironment + '/desktop'), 404],
    [request('/dot-computer/v1/threads/not-a-uuid'), 404],
  ];
  for (const [input, status] of invalid) {
    const result = await relay(input);
    assert.equal(result.status, status, input.url);
    assert.equal(result.headers.get('Cache-Control'), 'private, no-store');
  }
});

test('preferred host status, admission, replay and cancellation use the same authenticated Worker', async () => {
  const calls = [];
  const token = 'Bearer ' + 'c'.repeat(64);
  const jobBody = JSON.stringify({ id, payload: { model: 'gpt-6-sol', input: [] } });
  const relay = createRelay({ async fetchUpstream(url, init) {
    assert.equal(init.headers.get('Authorization'), token);
    assert.equal(init.headers.has('Cookie'), false);
    calls.push([url.href, init.method]);
    if (init.method === 'POST') {
      assert.equal(init.headers.get('Content-Type'), 'application/json');
      assert.equal(await new Response(init.body).text(), jobBody);
      return Response.json({ id, status: 'queued' }, { status: 202 });
    }
    return Response.json({ id });
  } });
  const headers = { Authorization: token, Cookie: 'ignore=1' };
  const operations = [
    ['/bridge/status', 'GET', 200],
    ['/jobs', 'POST', 202],
    [hostEvents + '?after=-1', 'GET', 200],
    [hostEvents + '?after=8', 'GET', 200],
    [hostJob, 'DELETE', 200],
  ];
  for (const [path, method, status] of operations) {
    const options = method === 'POST'
      ? { method, body: jobBody, headers: { ...headers, 'Content-Type': 'application/json' } }
      : { method, headers };
    const response = await relay(request(path, options));
    assert.equal(response.status, status, path);
    assert.equal((await response.json()).id, id);
  }
  assert.deepEqual(calls, operations.map(([path, method]) => [worker + path, method]));
});

test('Dot computer requests forward only the concrete authenticated Worker operations', async () => {
  const calls = [];
  const token = 'Bearer ' + 'b'.repeat(64);
  const relay = createRelay({ fetchUpstream(url, init) {
    assert.equal(init.headers.get('Authorization'), token);
    assert.equal(init.headers.has('Cookie'), false);
    calls.push([url.href, init.method]);
    if (url.pathname.endsWith('/frame')) {
      return new Response(new Uint8Array([137, 80, 78, 71]), { headers: { 'Content-Type': 'image/png' } });
    }
    return Response.json({ status: 'unconfigured' }, { status: 403 });
  } });
  const headers = { Authorization: token, Cookie: 'ignore=1' };
  const allowed = [
    [dotThread, 'GET'], [dotThread + '/wake', 'POST'], [dotEnvironment, 'DELETE'],
    [dotEnvironment + '/frame', 'GET'], [dotEnvironment + '/input', 'POST'], [dotEnvironment + '/task', 'POST'],
  ];
  for (const [path, method] of allowed) {
    const response = await relay(request(path, { method, headers }));
    if (path.endsWith('/frame')) {
      assert.equal(response.headers.get('Content-Type'), 'image/png');
      assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [137, 80, 78, 71]);
    } else {
      assert.equal(response.status, 403);
    }
  }
  assert.deepEqual(calls, allowed.map(([path, method]) => [worker + path, method]));
});

test('preflight strictly scopes origin, route, method and headers without calling the Worker', async () => {
  const relay = createRelay({ fetchUpstream() { assert.fail('unexpected upstream invocation'); } });
  const preflight = (path, method, headers, extra = {}) => relay(request(path, {
    method: 'OPTIONS', headers: { 'Access-Control-Request-Method': method, 'Access-Control-Request-Headers': headers, ...extra },
  }));
  const accepted = await preflight(inference, 'POST', 'Authorization, Content-Type, X-Chat-Request-Id');
  assert.equal(accepted.status, 204);
  assert.equal(accepted.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal(accepted.headers.get('Access-Control-Allow-Methods'), 'POST');
  assert.match(accepted.headers.get('Vary'), /Access-Control-Request-Headers/);
  assert.equal(accepted.headers.has('Access-Control-Allow-Credentials'), false);
  const events = await preflight(hostEvents + '?after=-1', 'GET', 'Authorization');
  assert.equal(events.status, 204);
  assert.equal(events.headers.get('Access-Control-Allow-Methods'), 'GET');
  assert.equal((await preflight(hostEvents + '?after=0', 'POST', 'Authorization')).status, 405);
  assert.equal((await preflight('/auth/session', 'GET', 'Cookie')).status, 403);
  assert.equal((await preflight('/auth/session', 'GET', 'x-chat-request-id')).status, 403);
  assert.equal((await preflight('/auth/login', 'PATCH', 'authorization')).status, 405);
  const wrong = await preflight(inference, 'POST', 'authorization', { Origin: 'null' });
  assert.equal(wrong.status, 403);
  assert.equal(wrong.headers.has('Access-Control-Allow-Origin'), false);
});

test('inference streams directly and preserves the request ID while excluding cookies and routing headers', async () => {
  let stream;
  const relay = createRelay({ async fetchUpstream(url, init) {
    assert.equal(url.href, worker + inference);
    assert.equal(init.method, 'POST');
    assert.equal(init.redirect, 'manual');
    assert.equal(init.headers.get('X-Chat-Request-Id'), id);
    assert.equal(init.headers.get('Authorization'), 'Bearer ' + 'a'.repeat(64));
    assert.equal(init.headers.get('Origin'), origin);
    for (const name of ['Cookie', 'Host', 'Forwarded', 'CF-Connecting-IP', 'Proxy-Authorization', 'X-Forwarded-For']) {
      assert.equal(init.headers.has(name), false, name);
    }
    assert.equal(await new Response(init.body).text(), '{"stream":true}');
    return new Response(new ReadableStream({ start(controller) { stream = controller; } }), {
      headers: {
        'Content-Type': 'text/event-stream',
        'X-Chat-Request-Id': id,
        'X-Chat-Started-At': '1795249882563',
        'X-Request-Id': 'neutral-provider',
        'Set-Cookie': 'upstream-secret-cookie=1',
        'Content-Encoding': 'gzip',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } });
  const response = await relay(request(inference, { method: 'POST', body: '{"stream":true}', headers: {
    'Content-Type': 'application/json; charset=utf-8', Authorization: 'Bearer ' + 'a'.repeat(64),
    'X-Chat-Request-Id': id, Cookie: 'unsafe=1', Host: 'other.example',
    Forwarded: 'for=127.0.0.1', 'CF-Connecting-IP': '127.0.0.1', 'Proxy-Authorization': 'Basic abc',
    'X-Forwarded-For': '127.0.0.1',
  } }));
  assert.equal(response.headers.get('Content-Type'), 'text/event-stream');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal(response.headers.get('X-Chat-Started-At'), '1795249882563');
  assert.equal(response.headers.get('X-Request-Id'), 'neutral-provider');
  assert.equal(response.headers.has('Set-Cookie'), false);
  assert.equal(response.headers.has('Content-Encoding'), false);
  const reader = response.body.getReader();
  stream.enqueue(new TextEncoder().encode('data: first\n\n'));
  assert.equal(new TextDecoder().decode((await reader.read()).value), 'data: first\n\n');
  stream.enqueue(new TextEncoder().encode('data: next\n\n'));
  stream.close();
  assert.equal(new TextDecoder().decode((await reader.read()).value), 'data: next\n\n');
  assert.equal((await reader.read()).done, true);
});

test('receipt and legacy conversation IDs route to the same fixed upstream with no URL rewrite or retry', async () => {
  const calls = [];
  const relay = createRelay({ fetchUpstream(url, init) {
    calls.push([url.href, init.method]);
    return Response.json({ source: 'D1' }, { headers: { 'Retry-After': '12' } });
  } });
  const paths = [
    [inference + '/' + id + '?after=9007199254740991', 'GET'],
    [inference + '/' + id, 'DELETE'],
    ['/sync/conversations/legacy%3Aone', 'GET'],
    ['/sync/conversations?cursor=legacy%3Aone&limit=12', 'GET'],
    ['/sync/changes?after=3&limit=12', 'GET'],
  ];
  for (const [path, method] of paths) {
    assert.equal((await relay(request(path, { method }))).headers.get('Retry-After'), '12');
  }
  assert.deepEqual(calls, paths.map(([path, method]) => [worker + path, method]));
});

test('upstream redirects and transport failures are bounded JSON errors and never retried', async () => {
  const a = [];
  const relay = createRelay({ fetchUpstream(url, init) {
    a.push([url.href, init.redirect]);
    if (a.length === 1) return new Response('unauthorized location', { status: 302, headers: { Location: 'https://other.example' } });
    throw Error('sensitive dependency detail');
  } });
  const one = await relay(new Request(local + '/health'));
  assert.equal(one.status, 502);
  assert.equal(one.headers.has('Location'), false);
  assert.equal((await one.json()).error.code, 'SITE_UPSTREAM_REDIRECT');
  const two = await relay(new Request(local + '/health'));
  assert.equal(two.status, 502);
  assert.equal((await two.json()).error.code, 'SITE_UPSTREAM_UNAVAILABLE');
  assert.deepEqual(a, [[worker + '/health', 'manual'], [worker + '/health', 'manual']]);
});

test('the upstream header deadline bounds a stall without timing out an admitted event stream', async () => {
  let calls = 0;
  let upstreamSignal;
  let stream;
  const relay = createRelay({ headerTimeoutMs: 20, fetchUpstream(_url, { signal }) {
    calls++;
    upstreamSignal = signal;
    if (calls === 1) {
      return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
    }
    return new Response(new ReadableStream({ start(controller) { stream = controller; } }), {
      headers: { 'Content-Type': 'text/event-stream', 'X-Chat-Request-Id': id },
    });
  } });
  const post = (signal) => request(inference, { method: 'POST', signal, body: '{"stream":true}', headers: {
    'Content-Type': 'application/json', 'X-Chat-Request-Id': id,
  } });
  const stalled = await relay(post());
  assert.equal(stalled.status, 504);
  assert.equal(stalled.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal((await stalled.json()).error.code, 'SITE_UPSTREAM_TIMEOUT');
  assert.equal(upstreamSignal.aborted, true);
  assert.equal(calls, 1);

  const downstream = new AbortController();
  const admitted = await relay(post(downstream.signal));
  await new Promise(resolve => setTimeout(resolve, 45));
  assert.equal(upstreamSignal.aborted, false);
  stream.enqueue(new TextEncoder().encode('data: next\n\n'));
  stream.close();
  assert.equal(await admitted.text(), 'data: next\n\n');
  downstream.abort();
  assert.equal(upstreamSignal.aborted, true);
  assert.equal(calls, 2);
});

test('checkout, desktop tasks, and legacy inference keep their existing cancellation behavior', async () => {
  let activeRequest;
  const relay = createRelay({ fetchUpstream(_url, init) {
    assert.equal(init.signal, activeRequest.signal);
    return Response.json({ ready: true });
  } });
  for (const path of ['/billing/v1/checkout', dotEnvironment + '/task', inference]) {
    activeRequest = request(path, { method: 'POST', body: '{}', headers: {
      Authorization: 'Bearer ' + 'a'.repeat(64), 'Content-Type': 'application/json',
    } });
    assert.equal((await relay(activeRequest)).status, 200);
  }
});

test('an upstream challenge is a gateway outage, while a genuine session rejection remains a 401', async () => {
  let calls = 0;
  let discarded = 0;
  const authentication = { error: { code: 'SITE_AUTH_REQUIRED', message: '请重新登录本站账号。' } };
  const relay = createRelay({ fetchUpstream() {
    calls++;
    if (calls === 3) return Response.json(authentication, { status: 401 });
    const challenge = new ReadableStream({ cancel() { discarded++; } });
    return new Response(challenge, {
      status: calls === 1 ? 403 : 200,
      headers: { 'Content-Type': 'text/html', ...(calls === 2 && { 'CF-Mitigated': 'challenge' }) },
    });
  } });
  const session = () => request('/auth/session', { headers: { Authorization: 'Bearer ' + 'b'.repeat(64) } });
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await relay(session());
    assert.equal(response.status, 502);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
    assert.equal((await response.json()).error.code, 'SITE_UPSTREAM_INVALID_RESPONSE');
  }
  assert.equal(discarded, 2);
  const expired = await relay(session());
  assert.equal(expired.status, 401);
  assert.deepEqual(await expired.json(), authentication);
  assert.equal(calls, 3);
});

test('relay rejects wrong upstream media or empty success according to the route contract', async () => {
  const cases = [
    ['/health', 'GET', () => new Response('<h1>Intercepted</h1>', { headers: { 'Content-Type': 'text/html' } }), 502],
    ['/auth/login', 'POST', () => new Response(null, { status: 204 }), 502],
    ['/auth/session', 'GET', () => new Response(null, { headers: { 'Content-Type': 'application/json' } }), 502],
    ['/auth/session', 'GET', () => new Response('', { headers: { 'Content-Type': 'application/json', 'Content-Length': '0' } }), 502],
    ['/auth/session', 'GET', () => new Response('data: not a session', { headers: { 'Content-Type': 'text/event-stream' } }), 502],
    [inference, 'POST', () => Response.json({ running: true }, { status: 202 }), 202],
    [dotEnvironment + '/input', 'POST', () => new Response(null, { status: 204 }), 204],
    [dotEnvironment + '/frame', 'GET', () => new Response('png', { headers: { 'Content-Type': 'image/png' } }), 200],
    [dotEnvironment + '/frame', 'GET', () => Response.json({ error: { code: 'DOT_COMPUTER_NOT_READY' } }, { status: 409 }), 409],
    [dotEnvironment + '/frame', 'GET', () => Response.json({}), 502],
  ];
  for (const [path, method, upstreamReply, expected] of cases) {
    const relay = createRelay({ fetchUpstream: upstreamReply });
    const response = await relay(request(path, { method, headers: { Authorization: 'Bearer ' + 'a'.repeat(64) } }));
    assert.equal(response.status, expected, path);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
    if (expected === 502) assert.equal((await response.json()).error.code, 'SITE_UPSTREAM_INVALID_RESPONSE');
  }
});

test('billing options and authenticated checkout and portal use the fixed account Worker', async () => {
  const site = 'https://tycofficial.github.io';
  const token = 'Bearer ' + 'b'.repeat(64);
  const seen = [];
  const relay = createRelay({ fetchUpstream: async (url, request) => {
    seen.push({ url, request });
    return Response.json({ accepted: true });
  } });
  const send = (path, options = {}) => relay(new Request('https://ingress.test' + path, {
    ...options, headers: { Origin: site, ...options.headers },
  }));
  assert.equal((await send('/billing/v1/options')).status, 200);
  assert.equal((await send('/billing/v1/checkout', { method: 'POST' })).status, 401);
  assert.equal((await send('/billing/v1/checkout', {
    method: 'POST', body: '{"tier":"plus"}', headers: { Authorization: token, 'Content-Type': 'application/json' },
  })).status, 200);
  assert.equal((await send('/billing/v1/portal', { method: 'POST', headers: { Authorization: token } })).status, 200);
  assert.equal((await send('/billing/v1/webhook', { method: 'POST', headers: { Authorization: token } })).status, 404);
  assert.equal(seen.length, 3);
  assert.equal(seen[0].request.headers.has('Authorization'), false);
  assert.equal(seen[1].request.headers.get('Authorization'), token);
  assert.equal(seen[1].url.origin, 'https://chatgpt-admin-bridge-tyc.hushedtarragon1.chatgpt.site');
  assert.equal(seen[1].url.pathname, '/billing/v1/checkout');
  assert.deepEqual(await new Response(seen[1].request.body).json(), { tier: 'plus' });
  assert.equal(seen[2].url.pathname, '/billing/v1/portal');
});
