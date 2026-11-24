import { createHash, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { createLinuxDesktopRuntime, screenHeight, screenWidth } from './linux-desktop.mjs';

const uuid = '[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}';
const idPattern = new RegExp('^' + uuid + '$', 'i');
const isId = value => typeof value === 'string' && idPattern.test(value);
const desktopRoute = new RegExp('^/v1/desktops/(' + uuid + ')(?:/(frame|input|task))?$', 'i');
const digest = value => createHash('sha256').update(value).digest();
const validInt = (value, low, high) => Number.isInteger(value) && value >= low && value <= high;
const fail = (status, code, message) => Object.assign(new Error(message), { status, code });
const badInput = () => fail(400, 'INVALID_DESKTOP_INPUT', 'Invalid desktop control input.');
const gone = () => fail(410, 'DESKTOP_ENDED', 'This desktop has ended.');
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

function json(response, status, value, extra = {}) {
  response.writeHead(status, { ...headers, 'Content-Type': 'application/json; charset=utf-8', ...extra });
  response.end(JSON.stringify(value));
}

async function jsonBody(request, maximum = 24_000) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers['content-type'] ?? '')) {
    throw fail(415, 'JSON_REQUIRED', 'A JSON request body is required.');
  }
  if (Number(request.headers['content-length']) > maximum) throw fail(413, 'BODY_TOO_LARGE', 'Request exceeds size limit.');
  let size = 0;
  const parts = [];
  for await (const part of request.iterator({ destroyOnReturn: false })) {
    size += part.length;
    if (size > maximum) throw fail(413, 'BODY_TOO_LARGE', 'Request exceeds size limit.');
    parts.push(part);
  }
  try {
    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(parts)));
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  } catch {}
  throw fail(400, 'INVALID_JSON', 'Invalid JSON request.');
}

export function normalizeDesktopInput(value) {
  const { type, x, y, dx, dy, button, down, key, text } = value;
  if (type === 'move' && validInt(x, 0, screenWidth - 1) && validInt(y, 0, screenHeight - 1)) return { type, x, y };
  if (type === 'wheel' && validInt(dx, -10, 10) && validInt(dy, -10, 10)) return { type, dx, dy };
  if (type === 'button' && ['left', 'middle', 'right'].includes(button) && typeof down === 'boolean') return { type, button, down };
  if (type === 'key' && validInt(key, 1, 0x1fffffff) && typeof down === 'boolean') return { type, key, down };
  if (type === 'text' && typeof text === 'string' && !text.includes('\0') && Buffer.byteLength(text) <= 8192) return { type, text };
  throw badInput();
}

export function createDotDesktopServer({ token, runtime, maxDesktops = 2 } = {}) {
  if (typeof token !== 'string' || !/^[\x21-\x7e]{32,256}$/.test(token) || token.includes(',')) {
    throw new TypeError('DOT_DESKTOP_TOKEN must be 32–256 non-whitespace characters.');
  }
  if (!runtime || !validInt(maxDesktops, 1, 8)) throw new TypeError('A bounded desktop runtime is required.');
  const tokenHash = digest(token), sessions = new Map();
  let closing = false;
  const hasAuth = request => {
    const candidate = /^Bearer ([^\s,]{1,256})$/i.exec(request.headers.authorization ?? '')?.[1];
    return candidate !== undefined && timingSafeEqual(tokenHash, digest(candidate));
  };
  const guard = session => { if (session.state === 'ended' || session.expiresAt <= Date.now()) throw gone(); };

  function stop(session) {
    if (session.stopping) return session.stopping;
    session.state = 'ended';
    clearTimeout(session.timer);
    session.controller.abort(gone());
    session.stopping = (async () => {
      try { await (await session.started).close(); }
      catch {}
      await Promise.allSettled([session.activeTask]);
      session.tasks.clear();
      session.closed = true;
    })();
    return session.stopping;
  }

  async function create({ id, ttlSeconds }) {
    if (!isId(id) || !validInt(ttlSeconds, 1, 3600)) {
      throw fail(400, 'INVALID_DESKTOP', 'A desktop UUID and TTL from 1 to 3600 seconds are required.');
    }
    id = id.toLowerCase();
    const existing = sessions.get(id);
    if (existing) {
      guard(existing);
      if (ttlSeconds !== existing.ttlSeconds) throw fail(409, 'DESKTOP_ID_CONFLICT', 'This desktop ID was used with a different TTL.');
      await existing.started;
      guard(existing);
      return { id };
    }
    if (closing || sessions.size >= 512 || [...sessions.values()].filter(row => row.state !== 'ended' || row.stopping && !row.closed).length >= maxDesktops) {
      throw fail(429, 'DESKTOP_CAPACITY', 'Desktop capacity is exhausted.');
    }
    const session = { id, ttlSeconds, expiresAt: Date.now() + ttlSeconds * 1000, state: 'starting',
      controller: new AbortController(), tasks: new Map(), activeTask: null };
    sessions.set(id, session);
    session.timer = setTimeout(() => void stop(session), ttlSeconds * 1000);
    session.timer.unref();
    session.started = Promise.resolve().then(() => runtime.start({ id, signal: session.controller.signal })).then(async desktop => {
      if (session.controller.signal.aborted) {
        await desktop.close();
        throw gone();
      }
      session.state = 'ready';
      return desktop;
    }).catch(cause => {
      session.state = 'ended';
      clearTimeout(session.timer);
      throw cause;
    });
    await session.started;
    guard(session);
    return { id };
  }

  async function runTask(session, desktop, { code, requestId }) {
    if (!isId(requestId) || typeof code !== 'string' || code.length > 4000 || !code.trim() || code.includes('\0')) {
      throw fail(400, 'INVALID_DESKTOP_TASK', 'A task UUID and up to 4000 characters of Python are required.');
    }
    guard(session);
    requestId = requestId.toLowerCase();
    const hash = digest(code).toString('hex'), existing = session.tasks.get(requestId);
    if (existing) {
      if (existing.hash !== hash) throw fail(409, 'TASK_ID_CONFLICT', 'This task ID was already used with different code.');
      return existing.operation;
    }
    if (session.activeTask) throw fail(409, 'TASK_BUSY', 'A task is already running on this desktop.');
    if (session.tasks.size >= 64) throw fail(429, 'TASK_CAPACITY', 'This desktop has reached its task limit.');
    // Reserve before starting. Disconnecting the HTTP reader does not cancel or repeat execution.
    const operation = Promise.resolve().then(() => desktop.task(code, session.controller.signal));
    session.tasks.set(requestId, { hash, operation });
    session.activeTask = operation;
    const settled = () => { if (session.activeTask === operation) session.activeTask = null; };
    void operation.then(settled, settled);
    return operation;
  }

  const server = createServer({ headersTimeout: 5000, requestTimeout: 10000, keepAliveTimeout: 2500 }, async (request, response) => {
    try {
      if (!hasAuth(request)) return json(response, 401, { error: { code: 'AUTH_REQUIRED', message: 'A provider bearer credential is required.' } },
        { 'WWW-Authenticate': 'Bearer', Connection: 'close' });
      if (closing) throw fail(503, 'PROVIDER_STOPPING', 'The provider is stopping.');
      const { url, method } = request;
      if (url === '/healthz' && method === 'GET') {
        await runtime.probe();
        return json(response, 200, { ready: true });
      }
      if (url === '/v1/desktops' && method === 'POST') {
        return json(response, 200, await create(await jsonBody(request, 1024)));
      }
      const route = desktopRoute.exec(url);
      if (!route) throw fail(404, 'NOT_FOUND', 'Provider route does not exist.');
      const [, id, action] = route;
      const session = sessions.get(id.toLowerCase());
      if (!action && method === 'DELETE') {
        if (session) await stop(session);
        response.writeHead(204, headers).end();
        return;
      }
      if (!session) throw fail(404, 'DESKTOP_NOT_FOUND', 'This desktop does not exist.');
      guard(session);
      const desktop = await session.started;
      guard(session);
      if (action === 'frame' && method === 'GET') {
        const png = await desktop.frame(session.controller.signal);
        guard(session);
        response.writeHead(200, { ...headers, 'Content-Type': 'image/png', 'Content-Length': png.length });
        response.end(png);
        return;
      }
      if (action === 'input' && method === 'POST') {
        const input = normalizeDesktopInput(await jsonBody(request));
        guard(session);
        await desktop.input(input, session.controller.signal);
        response.writeHead(204, headers).end();
        return;
      }
      if (action === 'task' && method === 'POST') {
        return json(response, 200, await runTask(session, desktop, await jsonBody(request)));
      }
      throw fail(405, 'METHOD_NOT_ALLOWED', 'Provider method is unavailable for this route.');
    } catch (cause) {
      if (response.destroyed) return;
      if (response.headersSent) { response.destroy(); return; }
      const safe = validInt(cause?.status, 400, 599) && typeof cause.code === 'string';
      json(response, safe ? cause.status : 500, { error: { code: safe ? cause.code : 'PROVIDER_FAILURE',
        message: safe ? cause.message : 'The desktop operation failed.' } });
    }
  });

  async function listen(port = 8090) {
    if (!validInt(port, 0, 65535)) throw new TypeError('Invalid DOT_DESKTOP_PORT.');
    await new Promise((resolve, reject) => {
      const failed = cause => { server.off('listening', ready); reject(cause); };
      const ready = () => { server.off('error', failed); resolve(); };
      server.once('error', failed);
      server.once('listening', ready);
      server.listen(port, '127.0.0.1');
    });
    return 'http://127.0.0.1:' + server.address().port;
  }

  async function close() {
    closing = true;
    const closed = server.listening ? new Promise(resolve => server.close(resolve)) : Promise.resolve();
    await Promise.allSettled([...sessions.values()].map(stop));
    await closed;
  }
  return { listen, close };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const runtime = createLinuxDesktopRuntime();
    const server = createDotDesktopServer({ token: process.env.DOT_DESKTOP_TOKEN, runtime });
    const origin = await server.listen(Number(process.env.DOT_DESKTOP_PORT ?? 8090));
    console.log('Dot desktop provider listening on ' + origin);
    for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => void server.close());
  } catch {
    console.error('Dot desktop provider startup failed. Check configuration and Linux runtime dependencies.');
    process.exitCode = 1;
  }
}
