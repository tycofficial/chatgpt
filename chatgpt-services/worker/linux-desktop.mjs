const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const encoder = new TextEncoder();
const tokenFormat = /^[A-Za-z0-9_-]{24,256}$/;
const maxFrameBytes = 4 * 1024 * 1024;
export const desktopSize = Object.freeze({ width: 1024, height: 720 });
export const desktopSeconds = 600;

function providerError(status, message) {
  return Object.assign(new Error(message), { status });
}

function endpoint(env) {
  const { DOT_COMPUTER_PROVIDER_ORIGIN: origin, DOT_COMPUTER_PROVIDER_TOKEN: token } = env;
  if (typeof origin !== 'string' || typeof token !== 'string' || !tokenFormat.test(token)) return null;
  try {
    const url = new URL(origin);
    const secure = url.protocol === 'https:' || url.protocol === 'http:' && url.hostname === '127.0.0.1';
    if (secure && [url.origin, url.origin + '/'].includes(origin)) return { url, token };
  } catch {}
  return null;
}

export const desktopConfigured = env => Boolean(endpoint(env));

async function call(env, suffix, { method = 'GET', body, timeout = 15000, missingIsOK = false } = {}) {
  const target = endpoint(env);
  if (!target) throw providerError(503, 'Linux desktop provider is not configured');
  const reply = await fetch(new URL('/v1/desktops' + suffix, target.url), {
    method, redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(timeout),
    headers: { Authorization: 'Bearer ' + target.token, ...(body !== undefined && { 'Content-Type': 'application/json' }) },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  if (reply.ok || missingIsOK && [404, 410].includes(reply.status)) return reply;
  void reply.body?.cancel().catch(() => {});
  throw providerError(reply.status, 'Linux desktop provider rejected the operation');
}

function sessionPath(id, action) {
  if (!uuid.test(id)) throw providerError(400, 'Invalid Linux desktop identifier');
  return '/' + id + (action ? '/' + action : '');
}

async function boundedReply(reply, limit) {
  if (!reply.body || Number(reply.headers.get('content-length')) > limit) {
    void reply.body?.cancel().catch(() => {});
    throw providerError(502, 'Invalid Linux desktop response size');
  }
  const reader = reply.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw providerError(502, 'Linux desktop response is too large');
      chunks.push(value);
    }
  } finally {
    void reader.cancel().catch(() => {});
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function jsonReply(reply, limit) {
  if (!/^application\/json(?:\s*;|$)/i.test(reply.headers.get('content-type') ?? '')) {
    void reply.body?.cancel().catch(() => {});
    throw providerError(502, 'Linux desktop provider returned an unexpected content type');
  }
  try { return JSON.parse(new TextDecoder().decode(await boundedReply(reply, limit))); }
  catch { throw providerError(502, 'Linux desktop provider returned invalid JSON'); }
}

export async function createDesktop(env, id) {
  if (!uuid.test(id)) throw providerError(400, 'Invalid Linux desktop identifier');
  const reply = await call(env, '', { method: 'POST', body: { id, ttlSeconds: desktopSeconds } });
  if ((await jsonReply(reply, 1024))?.id !== id) throw providerError(502, 'Linux desktop provider returned a different identifier');
}

export async function stopDesktop(env, id) {
  const reply = await call(env, sessionPath(id), { method: 'DELETE', missingIsOK: true });
  await reply.body?.cancel().catch(() => {});
}

export async function desktopFrame(env, id) {
  const reply = await call(env, sessionPath(id, 'frame'));
  if (!/^image\/png(?:\s*;|$)/i.test(reply.headers.get('content-type') ?? '')) {
    await reply.body?.cancel().catch(() => {});
    throw providerError(502, 'Linux desktop provider did not return PNG');
  }
  const png = await boundedReply(reply, maxFrameBytes);
  const header = new DataView(png.buffer);
  if (png.byteLength < 33 || header.getUint32(0) !== 0x89504e47 || header.getUint32(4) !== 0x0d0a1a0a ||
      header.getUint32(12) !== 0x49484452 || header.getUint32(16) !== desktopSize.width ||
      header.getUint32(20) !== desktopSize.height) {
    throw providerError(502, 'Linux desktop provider did not return the configured frame geometry');
  }
  return png;
}

function nativeInput(input) {
  switch (input?.type) {
    case 'move': {
      const { x, y } = input;
      if (Number.isInteger(x) && x >= 0 && x < desktopSize.width && Number.isInteger(y) && y >= 0 && y < desktopSize.height) return { type: 'move', x, y };
      break;
    }
    case 'wheel': {
      const { dx, dy } = input;
      if ([dx, dy].every(value => Number.isInteger(value) && Math.abs(value) <= 10)) return { type: 'wheel', dx, dy };
      break;
    }
    case 'button': {
      const { button, down } = input;
      if (['left', 'middle', 'right'].includes(button) && typeof down === 'boolean') return { type: 'button', button, down };
      break;
    }
    case 'key': {
      const { key, down } = input;
      if (Number.isInteger(key) && key >= 1 && key <= 0x1fffffff && typeof down === 'boolean') return { type: 'key', key, down };
      break;
    }
    case 'text': {
      const { text } = input;
      if (typeof text === 'string' && !text.includes('\0') && encoder.encode(text).byteLength <= 8192) return { type: 'text', text };
      break;
    }
  }
  throw providerError(400, 'Invalid Linux desktop input');
}

export async function desktopInput(env, id, input) {
  const body = nativeInput(input);
  const reply = await call(env, sessionPath(id, 'input'), { method: 'POST', body });
  await reply.body?.cancel().catch(() => {});
}

export async function desktopTask(env, id, code, requestId) {
  if (!uuid.test(requestId) || typeof code !== 'string' || !code.trim() || code.length > 4000 || code.includes('\0')) {
    throw providerError(400, 'Invalid Linux desktop task');
  }
  const path = sessionPath(id, 'task');
  const body = { code, requestId };
  const readReceipt = async timeout => {
    const reply = await call(env, path, { method: 'POST', body, timeout });
    const result = await jsonReply(reply, 72 * 1024);
    if (!Number.isInteger(result?.exitCode) || result.exitCode < 0 || result.exitCode > 255 ||
        typeof result.stdout !== 'string' || typeof result.stderr !== 'string') {
      throw providerError(502, 'Linux desktop provider returned no execution receipt');
    }
    return { exitCode: result.exitCode, stdout: result.stdout.slice(0, 12000), stderr: result.stderr.slice(0, 12000) };
  };
  const deadline = Date.now() + 27000;
  try {
    return await readReceipt(18000);
  } catch (error) {
    if (![408, 502, 503, 504].includes(error?.status) &&
        !['AbortError', 'TimeoutError', 'TypeError'].includes(error?.name)) throw error;
    // The provider returns the original execution promise when the same request ID is replayed.
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw error;
    return readReceipt(remaining);
  }
}
