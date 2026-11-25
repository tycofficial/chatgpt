import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createRelay, gatewayError } from './public/_worker.js';

// Express matches routes case-insensitively by default. Own those paths here
// so unsupported spellings cannot fall through to legacy account handlers.
const accountPath = /^\/(?:health\/?$|(?:auth|sync|bridge|jobs|billing\/v1|inference\/v1|dot-computer\/v1)(?:\/|$))/i;
const requestOrigin = 'https://chatgptapi.ai.studio';

async function sendGatewayError(request, response, status, code, message = '本站账号服务暂时无法连接。') {
  const error = gatewayError(request.headers.origin, status, code, message);
  const body = await error.text();
  response.writeHead(error.status, Object.fromEntries(error.headers));
  response.end(body);
}

/** Mount before the existing AI Studio app's JSON parser and API routes. */
export function createAiStudioAccountGateway({ fetchUpstream, headerTimeoutMs } = {}) {
  const relay = createRelay({ fetchUpstream, headerTimeoutMs });
  return async function accountGateway(request, response, next) {
    const target = request.url ?? '';
    if (!target.startsWith('/') || target.startsWith('//') || target.includes('\\')) {
      return sendGatewayError(request, response, 400, 'INVALID_REQUEST_TARGET');
    }
    const url = new URL(target, requestOrigin);
    if (!accountPath.test(url.pathname) && !accountPath.test(target.split('?')[0])) return next();

    const controller = new AbortController();
    const disconnect = () => {
      if (!response.writableFinished) controller.abort();
    };
    response.once('close', disconnect);
    try {
      const method = request.method ?? 'GET';
      const headers = new Headers();
      for (const [name, value] of Object.entries(request.headers)) {
        if (value === undefined) continue;
        for (const entry of Array.isArray(value) ? value : [value]) headers.append(name, entry);
      }
      const hasBody = !['GET', 'HEAD'].includes(method) &&
        (Number(headers.get('content-length')) > 0 || headers.has('transfer-encoding'));
      if (hasBody && request.readableEnded) {
        await sendGatewayError(request, response, 500, 'SITE_ACCOUNT_GATEWAY_BODY_UNAVAILABLE',
          '本站账号网关配置有误，请联系站点维护者。');
        return;
      }
      const outgoing = await relay(new Request(url, {
        method, headers, signal: controller.signal,
        ...(hasBody ? { body: Readable.toWeb(request), duplex: 'half' } : {}),
      }));
      if (controller.signal.aborted) return;
      response.writeHead(outgoing.status, Object.fromEntries(outgoing.headers));
      if (outgoing.body) {
        // Deliver admission headers even while the upstream stream has no output.
        response.flushHeaders();
        await pipeline(Readable.fromWeb(outgoing.body), response, { signal: controller.signal });
      } else response.end();
    } catch {
      if (controller.signal.aborted) return;
      if (response.headersSent) response.destroy();
      else await sendGatewayError(request, response, 502, 'SITE_ACCOUNT_GATEWAY_FAILED');
    } finally {
      response.off('close', disconnect);
    }
  };
}
