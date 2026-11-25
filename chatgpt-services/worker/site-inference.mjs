const docodeResponses = 'https://docode.cc/v1/responses';
export const freeInferenceModel = 'gpt-6-sol';
const models = new Set([
  freeInferenceModel, 'gpt-6.2-sol', 'gpt-6.2-astra', 'gpt-6.1-terra', 'gpt-6-luna',
  'gpt-6.1-sol', 'gpt-6-astra', 'gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna',
]);
const requestBytes = 8 * 1024 * 1024;
const errorBytes = 64 * 1024;
const acceptedFields = new Set([
  'model', 'input', 'instructions', 'stream', 'store', 'include', 'service_tier',
  'reasoning', 'temperature', 'tools', 'tool_choice', 'max_output_tokens',
  'parallel_tool_calls', 'stream_options', 'text', 'top_p', 'truncation',
]);
const toolTypes = new Set(['function', 'web_search', 'web_search_preview']);
const standardEfforts = new Set(['none', 'low', 'medium']);

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const jsonType = 'application/json; charset=utf-8';
const jsonResponse = (status, error, extraHeaders) => {
  const headers = new Headers(extraHeaders);
  headers.set('Content-Type', jsonType);
  headers.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify({ error }), { status, headers });
};
const failure = (status, code, message) => jsonResponse(status, { code, message });
const cancel = stream => stream?.cancel().catch(() => {});

class BodyTooLarge extends Error {}

async function boundedText(message, limit) {
  if (Number(message.headers.get('content-length')) > limit) {
    await cancel(message.body);
    throw new BodyTooLarge();
  }
  if (!message.body) return '';
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0;
  let text = '';
  for await (const bytes of message.body) {
    size += bytes.byteLength;
    if (size > limit) throw new BodyTooLarge();
    text += decoder.decode(bytes, { stream: true });
  }
  return text + decoder.decode();
}

function validRequest(payload) {
  if (Object.keys(payload).some(field => !acceptedFields.has(field))) return false;
  if (!models.has(payload.model)) return false;
  if (payload.stream !== undefined && typeof payload.stream !== 'boolean') return false;
  if (payload.tools !== undefined && (!Array.isArray(payload.tools) || payload.tools.some(tool => !toolTypes.has(tool?.type)))) return false;
  return typeof payload.input === 'string' || Array.isArray(payload.input) &&
    payload.input.every(item => isObject(item) && item.type !== 'item_reference');
}

function responseRedactor(key) {
  const variants = [...new Set([JSON.stringify(key).slice(1, -1), key])];
  const redact = value => variants.reduce((text, secret) => text.replaceAll(secret, '[redacted]'), value);
  function stream(body) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let tail = '';
    return new ReadableStream({
      async pull(controller) {
        for (;;) {
          const { done, value } = await reader.read();
          const visible = redact(tail + (done ? decoder.decode() : decoder.decode(value, { stream: true })));
          if (done) {
            if (visible) controller.enqueue(encoder.encode(visible));
            reader.releaseLock();
            controller.close();
            return;
          }
          let overlap = 0;
          for (const secret of variants) {
            for (let size = Math.min(secret.length - 1, visible.length); size > overlap; size--) {
              if (secret.startsWith(visible.slice(-size))) {
                overlap = size;
                break;
              }
            }
          }
          // Keep only a potential partial key so ordinary SSE events still flush immediately.
          const end = visible.length - overlap;
          tail = visible.slice(end);
          if (end) {
            controller.enqueue(encoder.encode(visible.slice(0, end)));
            return;
          }
        }
      },
      async cancel(reason) {
        try { await reader.cancel(reason); } finally { reader.releaseLock(); }
      },
    });
  }
  return { redact, stream };
}

async function upstreamError(response, redact, headers) {
  let payload;
  try { payload = JSON.parse(await boundedText(response, errorBytes)); } catch {}
  const detail = isObject(payload?.error) ? payload.error : payload;
  const safe = (value, limit) => typeof value === 'string' ? redact(value).slice(0, limit) : undefined;
  const error = {
    code: safe(detail?.code ?? payload?.code, 128) || 'DOCODE_UPSTREAM_ERROR',
    message: safe(typeof payload?.error === 'string' ? payload.error : detail?.message ?? detail?.detail, 2048)
      || '站内推理服务返回了错误。',
    type: safe(detail?.type, 128),
    param: safe(detail?.param, 128),
    request_id: safe(detail?.request_id ?? payload?.request_id, 256),
  };
  return jsonResponse(response.status, error, headers);
}

export async function readDocodeInput(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') ?? '')) {
    return failure(415, 'INFERENCE_JSON_REQUIRED', '请发送 JSON 推理请求。');
  }
  try {
    const payload = JSON.parse(await boundedText(request, requestBytes));
    if (!isObject(payload)) return failure(400, 'INVALID_INFERENCE_REQUEST', '推理请求必须是 JSON 对象。');
    if (payload.store !== undefined && payload.store !== false) {
      return failure(400, 'INVALID_INFERENCE_REQUEST', '此推理接口只接受无服务端存储的请求。');
    }
    return { payload, body: JSON.stringify({ ...payload, store: false }) };
  } catch (error) {
    if (error instanceof BodyTooLarge) return failure(413, 'INFERENCE_REQUEST_TOO_LARGE', '推理请求过大。');
    return failure(400, 'INVALID_INFERENCE_REQUEST', '推理请求必须是有效的 JSON。');
  }
}

export function prepareDocodeInput(input, configuredKey, { planType } = {}) {
  const key = typeof configuredKey === 'string' ? configuredKey.trim() : '';
  if (!key) return failure(503, 'DOCODE_NOT_CONFIGURED', '站内推理服务尚未配置。');
  if (input instanceof Response) return input;
  const { payload, body } = input;
  const standard = planType === 'free' || planType === 'go';
  if (standard && payload.model !== freeInferenceModel) {
    return failure(403, 'SITE_INFERENCE_PLAN_REQUIRED', '当前套餐仅支持标准聊天模型。');
  }
  if (!validRequest(payload)) return failure(400, 'INVALID_INFERENCE_REQUEST', '此推理接口只接受支持的模型及其输入。');
  if (standard && payload.service_tier != null && payload.service_tier !== 'default') {
    return failure(403, 'SITE_INFERENCE_PLAN_REQUIRED', '当前套餐仅支持标准速度。');
  }
  const reasoning = payload.reasoning;
  if (planType === 'go' && reasoning != null &&
      (!isObject(reasoning) || reasoning.mode != null && reasoning.mode !== 'standard' ||
       reasoning.effort != null && !standardEfforts.has(reasoning.effort))) {
    return failure(403, 'SITE_INFERENCE_PLAN_REQUIRED', '当前套餐仅支持标准思考设置。');
  }
  return { key, model: payload.model, body };
}

export async function sendDocodeRequest({ key, body }, signal) {
  let upstream;
  try {
    upstream = await fetch(docodeResponses, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + key,
        'Content-Type': jsonType,
        'Accept': 'text/event-stream, application/json',
      },
      body,
      redirect: 'manual',
      signal,
    });
  } catch {
    return failure(502, 'DOCODE_UNAVAILABLE', '站内推理服务暂时无法连接。');
  }
  if (upstream.status >= 300 && upstream.status < 400) {
    await cancel(upstream.body);
    return failure(502, 'DOCODE_REDIRECT_BLOCKED', '站内推理服务返回了重定向。');
  }

  const { redact, stream } = responseRedactor(key);
  const headers = new Headers({
    'Cache-Control': 'no-store',
    'X-Inference-Route': 'site-docode',
    'Access-Control-Expose-Headers': 'X-Request-Id, Retry-After, X-Inference-Route',
  });
  for (const name of ['X-Request-Id', 'Retry-After']) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, redact(value).slice(0, 256));
  }
  if (!upstream.ok) return upstreamError(upstream, redact, headers);
  const contentType = upstream.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (!upstream.body || !['text/event-stream', 'application/json'].includes(contentType)) {
    await cancel(upstream.body);
    return failure(502, 'DOCODE_INVALID_RESPONSE', '站内推理服务返回了不支持的响应格式。');
  }
  headers.set('Content-Type', contentType === 'text/event-stream' ? 'text/event-stream; charset=utf-8' : jsonType);
  return new Response(stream(upstream.body), { status: upstream.status, headers });
}

export async function proxyDocodeResponses(request, configuredKey, options) {
  const prepared = prepareDocodeInput(await readDocodeInput(request), configuredKey, options);
  return prepared instanceof Response ? prepared : sendDocodeRequest(prepared, request.signal);
}
