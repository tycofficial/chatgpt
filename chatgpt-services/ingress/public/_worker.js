const workerOrigin = 'https://chatgpt-admin-bridge-tyc.hushedtarragon1.chatgpt.site';
const siteOrigin = 'https://tycofficial.github.io';
const inference = '/inference/v1/responses';
const dotComputer = '/dot-computer/v1';
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const syncId = /^[a-z0-9][a-z0-9._:-]{0,127}$/i;
const jsonType = /^application\/json(?:\s*;|$)/i;
const correlation = ['X-Chat-Request-Id', 'X-Chat-Started-At', 'X-Request-Id', 'X-Inference-Route', 'Retry-After'];
const fixed = new Map([
  ['/health', { methods: ['GET'] }],
  ['/auth/register', { methods: ['POST'] }],
  ['/auth/login', { methods: ['POST'] }],
  ['/auth/session', { methods: ['GET'] }],
  ['/auth/logout', { methods: ['POST'] }],
  ['/auth/site-trial', { methods: ['POST'] }],
  ['/billing/v1/options', { methods: ['GET'] }],
  ['/billing/v1/checkout', { methods: ['POST'], needsBearer: true }],
  ['/billing/v1/portal', { methods: ['POST'], needsBearer: true }],
  ['/bridge/status', { methods: ['GET'], needsBearer: true }],
  ['/jobs', { methods: ['POST'], needsBearer: true }],
  [inference, { methods: ['POST'] }],
  ['/inference/v1/usage', { methods: ['GET'] }],
  ['/sync/conversations', { methods: ['GET'], query: ['cursor', 'limit'] }],
  ['/sync/changes', { methods: ['GET'], query: ['after', 'limit'] }],
  ['/sync/batch', { methods: ['POST'] }],
]);
const dotOperations = new Map([
  ['threads', 'GET'], ['threads/wake', 'POST'], ['environments', 'DELETE'],
  ['environments/frame', 'GET'], ['environments/input', 'POST'], ['environments/task', 'POST'],
]);

function findRoute(pathname) {
  if (fixed.has(pathname)) return fixed.get(pathname);
  if (pathname.startsWith(inference + '/') && uuid.test(pathname.slice(inference.length + 1))) {
    return { methods: ['GET', 'DELETE'], query: ['after'], allowsInitialCursor: true };
  }
  const job = /^\/jobs\/([^/]+)(\/events)?$/.exec(pathname);
  if (job && uuid.test(job[1])) {
    if (job[2]) {
      return { methods: ['GET'], query: ['after'], requiresAfter: true, allowsInitialCursor: true, needsBearer: true };
    }
    return { methods: ['DELETE'], needsBearer: true };
  }
  if (pathname.startsWith(dotComputer + '/')) {
    const [resource, id, action, ...extra] = pathname.slice(dotComputer.length + 1).split('/');
    const method = dotOperations.get(action === undefined ? resource : resource + '/' + action);
    if (method && uuid.test(id ?? '') && extra.length === 0) {
      return { methods: [method], needsBearer: true, desktopFrame: action === 'frame', emptySuccess: action === 'input' };
    }
    return null;
  }
  const found = /^\/sync\/conversations\/([^/]+)$/.exec(pathname);
  if (found) {
    let id;
    try { id = decodeURIComponent(found[1]); } catch { return null; }
    if (syncId.test(id)) return { methods: ['GET', 'PUT', 'DELETE'] };
  }
  return null;
}

function validQuery(input, route, method) {
  if (route.requiresAfter && !input.has('after')) return false;
  for (const [key, value] of input) {
    if (method !== 'GET' || !route.query?.includes(key) || input.getAll(key).length !== 1) return false;
    if (key === 'cursor') {
      if (value !== '' && !syncId.test(value)) return false;
    } else if (key === 'after' && value === '-1') {
      if (!route.allowsInitialCursor) return false;
    } else if (!/^\d{1,16}$/.test(value) || !Number.isSafeInteger(Number(value))) return false;
  }
  return true;
}

function responseHeaders(origin) {
  const headers = new Headers({
    'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
    'Vary': 'Origin',
  });
  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Expose-Headers', correlation.join(', '));
  }
  return headers;
}

function sendError(status, code, message, headers) {
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify({ error: { code, message } }), { status, headers });
}

// Production uses the private defaults. The overrides support isolated local
// protocol tests only; they are never populated from an HTTP request or binding.
export function createRelay({ fetchUpstream = (...args) => fetch(...args), allowedOrigin = siteOrigin, headerTimeoutMs } = {}) {
  return async function relay(request) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const headers = responseHeaders(origin === allowedOrigin ? origin : null);
    const error = (status, code, message) => sendError(status, code, message, headers);
    if (origin !== allowedOrigin && !(origin === null && request.method === 'GET' && url.pathname === '/health')) {
      return error(403, 'ORIGIN_NOT_ALLOWED', '此来源没有访问权限。');
    }
    const route = findRoute(url.pathname);
    if (!route) return error(404, 'ROUTE_NOT_FOUND', '接口不存在。');
    const preflight = request.method === 'OPTIONS';
    const method = preflight ? request.headers.get('Access-Control-Request-Method') : request.method;
    if (!route.methods.includes(method)) {
      headers.set('Allow', [...route.methods, 'OPTIONS'].join(', '));
      return error(405, 'METHOD_NOT_ALLOWED', '此接口不接受该请求方法。');
    }
    if (!validQuery(url.searchParams, route, method)) {
      return error(400, 'INVALID_QUERY', '此接口不接受该查询参数。');
    }
    const journalPost = method === 'POST' && url.pathname === inference;
    const permittedHeaders = journalPost
      ? ['authorization', 'content-type', 'x-chat-request-id']
      : ['authorization', 'content-type'];
    if (preflight) {
      const requested = request.headers.get('Access-Control-Request-Headers');
      if (requested && requested.toLowerCase().split(',').some(name => !permittedHeaders.includes(name.trim()))) {
        return error(403, 'HEADER_NOT_ALLOWED', '此接口不接受该请求头。');
      }
      headers.set('Vary', 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
      headers.set('Access-Control-Allow-Methods', route.methods.join(', '));
      headers.set('Access-Control-Allow-Headers', permittedHeaders.join(', '));
      return new Response(null, { status: 204, headers });
    }
    const accept = journalPost ? 'text/event-stream, application/json' :
      route.desktopFrame ? 'image/png, application/json' : 'application/json';
    const upstreamHeaders = new Headers({ Accept: accept });
    if (origin) upstreamHeaders.set('Origin', origin);
    const bearer = request.headers.get('Authorization');
    const requestId = request.headers.get('X-Chat-Request-Id');
    if (bearer !== null || route.needsBearer) {
      if (!bearer || !/^Bearer [a-f0-9]{64}$/i.test(bearer)) return error(401, 'SITE_AUTH_REQUIRED', '请重新登录本站账号。');
      upstreamHeaders.set('Authorization', bearer);
    }
    if (requestId !== null) {
      if (!journalPost || !uuid.test(requestId)) return error(400, 'INVALID_INFERENCE_ID', '请求编号必须是 UUID。');
      upstreamHeaders.set('X-Chat-Request-Id', requestId);
    }
    if (request.body) {
      const type = request.headers.get('Content-Type');
      if (!type || !jsonType.test(type)) return error(415, 'JSON_REQUIRED', '请发送 JSON 请求。');
      upstreamHeaders.set('Content-Type', 'application/json');
    }
    const upstreamURL = new URL(workerOrigin);
    upstreamURL.pathname = url.pathname;
    upstreamURL.search = url.search;
    let response;
    const journaled = journalPost && requestId !== null;
    const shortRequest = url.pathname === '/health' || url.pathname.startsWith('/auth/') ||
      method === 'GET' && url.pathname.startsWith(inference + '/');
    const deadline = journaled || shortRequest ? new AbortController() : null;
    const timer = deadline ? setTimeout(() => deadline.abort(), headerTimeoutMs ?? (journaled ? 12000 : 7500)) : null;
    try {
      response = await fetchUpstream(upstreamURL, {
        method, headers: upstreamHeaders,
        signal: deadline ? AbortSignal.any([request.signal, deadline.signal]) : request.signal, redirect: 'manual',
        ...(request.body ? { body: request.body, duplex: 'half' } : {}),
      });
    } catch {
      if (deadline?.signal.aborted && !request.signal.aborted) {
        return error(504, 'SITE_UPSTREAM_TIMEOUT', '等待本站账号服务响应超时。');
      }
      return error(502, 'SITE_UPSTREAM_UNAVAILABLE', '本站账号服务暂时无法连接。');
    } finally {
      // This deadline covers upstream headers. The streaming body keeps the caller's cancellation signal.
      clearTimeout(timer);
    }
    if (response.status >= 300 && response.status < 400) {
      void response.body?.cancel().catch(() => {});
      return error(502, 'SITE_UPSTREAM_REDIRECT', '本站账号服务返回了意外跳转。');
    }
    const contentType = response.headers.get('Content-Type')?.split(';', 1)[0].trim().toLowerCase();
    const expectedType = response.ok && route.desktopFrame ? 'image/png' : 'application/json';
    const acceptsEventStream = response.ok && journalPost && contentType === 'text/event-stream';
    const hasBody = Boolean(response.body) && response.headers.get('Content-Length') !== '0';
    const validBody = response.ok && route.emptySuccess ? response.status === 204 && !response.body :
      hasBody && (contentType === expectedType || acceptsEventStream);
    if (response.headers.get('CF-Mitigated') === 'challenge' || !validBody) {
      void response.body?.cancel().catch(() => {});
      return error(502, 'SITE_UPSTREAM_INVALID_RESPONSE', '本站账号服务入口暂时不可用，请稍后重试。');
    }
    for (const key of ['Content-Type', ...correlation]) {
      const value = response.headers.get(key);
      if (value !== null) headers.set(key, value);
    }
    return new Response(response.body, { status: response.status, headers });
  };
}

export default { fetch: createRelay() };
