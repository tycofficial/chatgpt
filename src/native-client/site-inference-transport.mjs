/** Durable Responses transport for the site's authenticated inference Worker. */
const route = '/inference/v1/responses';
const checkpointRoute = 'site-inference';
const uuidPattern = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
const statuses = new Set(['running', 'completed', 'failed', 'interrupted', 'cancelled']);
const metadataCursor = Number.MAX_SAFE_INTEGER;
const encoder = new TextEncoder();
const admissionRetryMs = 60 * 60 * 1000;
// These models accepted the public summary option through the site's gateway.
const summaryModels = new Set(['gpt-6-sol', 'gpt-6.2-sol', 'gpt-6.2-astra']);
async function bodyDigest(text) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(text));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
const error = (code, message, details) => Object.assign(new Error(message), { code, retryable: false, ...details });
const reconnect = () => error('SITE_INFERENCE_RECONNECT', '推理连接中断，已保留回复和请求记录。恢复网络后可重新连接此请求。', { requiresTransportResume: true });
const abortError = message => new DOMException(message, 'AbortError');
const timestamp = value => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};
const statusCode = value => Number.isInteger(value) && value >= 200 && value <= 599 ? value : null;
const isTerminal = status => statuses.has(status) && status !== 'running';

export const isSiteInferenceCheckpoint = checkpoint => checkpoint?.route === checkpointRoute && uuidPattern.test(checkpoint.siteRequestId ?? '');

export function terminalSiteInferenceReason(turn) {
  if (turn?.status !== 'failed' && turn?.status !== 'interrupted') return null;
  const transport = turn.adapterMetadata?.checkpoint?.inFlight?.transport;
  if (!isSiteInferenceCheckpoint(transport)) return null;
  const code = turn.adapterMetadata?.lastFailure?.code;
  if (code === 'SITE_INFERENCE_REPLAY_EXPIRED' && isTerminal(transport.state)) return 'expired';
  return code === 'INFERENCE_INTERRUPTED' && transport.state === 'interrupted' ? 'interrupted' : null;
}

export function turnSiteInferenceCheckpoints(turn) {
  const checkpoint = turn?.adapterMetadata?.checkpoint;
  const candidates = [checkpoint?.inFlight?.transport];
  for (const call of checkpoint?.ultra?.calls ?? []) {
    for (const worker of call.workers) for (const round of worker.rounds) candidates.push(round.transport);
  }
  return [...new Map(candidates.filter(isSiteInferenceCheckpoint).map(value => [value.siteRequestId, value])).values()];
}

function delay(ms, signal) {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, ms);
    signal?.addEventListener('abort', abort, { once: true });
  });
}

function receiptError(receipt) {
  if (receipt.replayExpired) return error('SITE_INFERENCE_REPLAY_EXPIRED', '服务端回放记录已到期。仍可查看本机已保存的回复并发送新消息继续。', { status: 410 });
  return error(receipt.error?.code || 'SITE_INFERENCE_' + receipt.status.toUpperCase(),
    receipt.error?.message || '本次推理已停止，已保存收到的进度。可在此对话中发送新消息继续。',
    { status: statusCode(receipt.httpStatus), requestId: receipt.providerRequestId || null });
}

/** A connected parser can consume the suffix after the live stream drops. */
function deliveredPrefix() {
  let pieces = [], index = 0, offset = 0;
  return {
    push(bytes) { if (bytes.byteLength) pieces.push(bytes); },
    get empty() { return index === pieces.length; },
    removeFrom(bytes) {
      let consumed = 0;
      while (consumed < bytes.length && index < pieces.length) {
        const piece = pieces[index], length = Math.min(bytes.length - consumed, piece.length - offset);
        for (let at = 0; at < length; at++) {
          if (bytes[consumed + at] !== piece[offset + at]) throw error('SITE_INFERENCE_REPLAY_DIVERGED', '服务端保存的回复与已收到的内容不一致，请继续查看原回复。');
        }
        consumed += length;
        offset += length;
        if (offset === piece.length) { pieces[index++] = null; offset = 0; }
      }
      if (index === pieces.length) { pieces = []; index = 0; }
      return bytes.subarray(consumed);
    },
    clear() { pieces = []; index = 0; offset = 0; },
  };
}

export function createSiteInferenceTransport({
  baseURL, getSessionToken, getAccountId, fetchImpl = globalThis.fetch,
  uuid = () => crypto.randomUUID(), pollIntervalMs = 650, requestTimeoutMs = 12000,
  maxNetworkRetries = 4, sleep = delay,
} = {}) {
  const origin = new URL(baseURL);
  if (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname))) throw TypeError('The site inference Worker requires HTTPS.');
  if (typeof getSessionToken !== 'function' || typeof getAccountId !== 'function') throw TypeError('Site inference needs site identity callbacks.');
  const stops = new Map();

  async function authorize(checkpoint, signal) {
    signal?.throwIfAborted();
    const token = await getSessionToken(), accountId = getAccountId();
    signal?.throwIfAborted();
    if (!token || !accountId || checkpoint.ownerId && checkpoint.ownerId !== accountId) {
      throw error('SITE_INFERENCE_SIGN_IN', '请在线验证发送该消息的本站账号。', { status: 401, requiresTransportResume: isSiteInferenceCheckpoint(checkpoint) });
    }
    return { token, accountId };
  }

  function fetchSite(path, token, { headers, ...options }) {
    return fetchImpl(new URL(path, origin), {
      credentials: 'omit', redirect: 'error', cache: 'no-store',
      ...options, headers: { Authorization: 'Bearer ' + token, ...headers },
    });
  }

  const receiptPath = checkpoint => route + '/' + encodeURIComponent(checkpoint.siteRequestId);
  async function saveFields(checkpoint, onCheckpoint, fields) {
    if (!Object.entries(fields).some(([key, value]) => checkpoint[key] !== value)) return;
    Object.assign(checkpoint, fields);
    await onCheckpoint?.(checkpoint);
  }

  async function readReceipt(checkpoint, after, signal) {
    const { token } = await authorize(checkpoint, signal);
    const timeout = AbortSignal.timeout(requestTimeoutMs);
    let response;
    try { response = await fetchSite(receiptPath(checkpoint) + '?after=' + after, token, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout }); }
    catch { signal?.throwIfAborted(); throw reconnect(); }
    if (!response.ok) {
      void response.body?.cancel().catch(() => {});
      if (response.status === 404 || response.status === 410) throw error('SITE_INFERENCE_RECEIPT_UNAVAILABLE', '找不到本次推理的服务端记录，无法确认它是否已经执行。可保留现有回复并发送新消息继续。', { status: response.status, requiresTransportResume: true });
      if (response.status === 429 || response.status >= 500) throw reconnect();
      throw error('SITE_INFERENCE_RECEIPT_DENIED', '当前无法读取本次推理的服务端记录。', { status: response.status, requiresTransportResume: true });
    }
    let receipt;
    try { receipt = await response.json(); }
    catch { signal?.throwIfAborted(); throw reconnect(); }
    if (receipt?.id !== checkpoint.siteRequestId || !statuses.has(receipt.status) || !Array.isArray(receipt.chunks) || typeof receipt.hasMore !== 'boolean') {
      throw error('SITE_INFERENCE_INVALID_RECEIPT', '站内推理服务返回了无效的恢复记录。', { requiresTransportResume: true, status: 422 });
    }
    return receipt;
  }

  async function applyReceipt(checkpoint, options, receipt) {
    await saveFields(checkpoint, options.onCheckpoint, {
      state: receipt.status,
      startedAt: timestamp(receipt.startedAt) ?? checkpoint.startedAt ?? null,
      finishedAt: timestamp(receipt.finishedAt),
      providerRequestId: receipt.providerRequestId ?? null,
    });
  }

  async function pollReceipt(checkpoint, after, options) {
    for (let failures = 0; ; failures++) {
      try {
        const receipt = await readReceipt(checkpoint, after, options.signal);
        await applyReceipt(checkpoint, options, receipt);
        return receipt;
      } catch (cause) {
        if (cause.code !== 'SITE_INFERENCE_RECONNECT' || failures >= maxNetworkRetries) throw cause;
        await sleep(Math.min(5000, pollIntervalMs * 2 ** failures), options.signal);
      }
    }
  }

  async function settle(checkpoint, options) {
    if (isTerminal(checkpoint.state) || !checkpoint.startedAt || options.signal?.aborted) return;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const receipt = await readReceipt(checkpoint, metadataCursor, options.signal);
        await applyReceipt(checkpoint, options, receipt);
        if (isTerminal(receipt.status)) return;
        if (attempt < 2) await sleep(Math.min(250, pollIntervalMs), options.signal);
      } catch { return; }
    }
  }

  async function* replay(checkpoint, options, prefix, initial) {
    let after = -1, receipt = initial;
    for (;;) {
      receipt ??= await pollReceipt(checkpoint, after, options);
      if (receipt.replayExpired) throw receiptError(receipt);
      for (const chunk of receipt.chunks) {
        if (chunk?.seq !== after + 1 || typeof chunk.data !== 'string') throw error('SITE_INFERENCE_REPLAY_GAP', '站内推理记录缺少连续的输出。已保留本机收到的内容。');
        after = chunk.seq;
        const suffix = prefix.removeFrom(encoder.encode(chunk.data));
        if (suffix.length) yield suffix;
      }
      if (!receipt.hasMore) {
        if (isTerminal(receipt.status)) {
          if (!prefix.empty) throw error('SITE_INFERENCE_REPLAY_GAP', '站内推理记录未包含已收到的完整输出。');
          if (receipt.status !== 'completed' && (receipt.status !== 'failed' || !receipt.contentType?.includes('application/json'))) throw receiptError(receipt);
          return;
        }
        await sleep(pollIntervalMs, options.signal);
      } else if (!receipt.chunks.length) {
        throw error('SITE_INFERENCE_REPLAY_GAP', '站内推理服务没有返回下一段输出。');
      }
      receipt = null;
    }
  }

  function stream(checkpoint, options, cleanup, { liveResponse, initial } = {}) {
    const prefix = deliveredPrefix();
    let live = liveResponse?.body?.getReader(), playback;
    const body = new ReadableStream({
      async pull(controller) {
        try {
          options.signal?.throwIfAborted();
          if (live) {
            let piece;
            try { piece = await live.read(); }
            catch { options.signal?.throwIfAborted(); }
            if (piece && !piece.done) {
              prefix.push(piece.value);
              controller.enqueue(piece.value);
              return;
            }
            live.releaseLock(); live = null;
            if (piece?.done && !checkpoint.startedAt) { cleanup(); controller.close(); return; }
          }
          playback ??= replay(checkpoint, options, prefix, initial);
          const next = await playback.next();
          if (!next.done) controller.enqueue(next.value);
          else { cleanup(); controller.close(); }
        } catch (cause) {
          live?.releaseLock(); live = null;
          cleanup(); controller.error(cause);
        }
      },
      async cancel(reason) {
        cleanup(); prefix.clear();
        try { await live?.cancel(reason); }
        catch { /* A disconnected reader is already closed. */ }
        finally { live?.releaseLock(); live = null; }
        void playback?.return().catch(() => {});
        await settle(checkpoint, options);
      },
    });
    const headers = liveResponse ? new Headers(liveResponse.headers) : new Headers({ 'Content-Type': initial.contentType || 'text/event-stream' });
    if (initial?.providerRequestId) headers.set('X-Request-Id', initial.providerRequestId);
    return new Response(body, { status: liveResponse?.status ?? 200, headers });
  }

  async function cancelOnce(checkpoint, onCheckpoint) {
    await saveFields(checkpoint, onCheckpoint, { cancelRequested: true });
    const { token } = await authorize(checkpoint);
    const response = await fetchSite(receiptPath(checkpoint), token, { method: 'DELETE', signal: AbortSignal.timeout(requestTimeoutMs) });
    const receipt = await response.json().catch(() => null);
    if (!response.ok || receipt?.id !== checkpoint.siteRequestId || !statuses.has(receipt.status)) throw error('SITE_INFERENCE_STOP_PENDING', '已停止本机读取，服务端停止状态尚未确认。', { status: response.status });
    await applyReceipt(checkpoint, { onCheckpoint }, receipt);
    return { cancelled: receipt.status === 'cancelled', status: receipt.status };
  }

  function cancel(checkpoint, { onCheckpoint } = {}) {
    if (!isSiteInferenceCheckpoint(checkpoint) || isTerminal(checkpoint.state)) return Promise.resolve({ cancelled: checkpoint?.state === 'cancelled', status: checkpoint?.state ?? null });
    if (!stops.has(checkpoint.siteRequestId)) {
      stops.set(checkpoint.siteRequestId, cancelOnce(checkpoint, onCheckpoint).finally(() => stops.delete(checkpoint.siteRequestId)));
    }
    return stops.get(checkpoint.siteRequestId);
  }

  async function request(payload, { checkpoint = {}, ...options } = {}) {
    const { signal, onCheckpoint } = options;
    const reattach = isSiteInferenceCheckpoint(checkpoint);
    const { token, accountId } = await authorize(checkpoint, signal);
    if (checkpoint.cancelRequested || checkpoint.state === 'cancelled') {
      await cancel(checkpoint, options);
      throw abortError('该请求已停止。');
    }
    const effort = payload.reasoning?.effort;
    const requestSummary = reattach ? checkpoint.requestPublicSummary === true
      : Boolean(effort && effort !== 'none' && payload.reasoning.summary === undefined && summaryModels.has(payload.model));
    const body = JSON.stringify(requestSummary
      ? { ...payload, reasoning: { ...payload.reasoning, summary: 'auto' } }
      : payload);
    if (!reattach && options.ephemeral && !options.isFreeChat) {
      return fetchSite(route, token, {
        method: 'POST', signal, headers: { 'Content-Type': 'application/json' }, body,
      });
    }
    if (!reattach) {
      const id = uuid().toLowerCase();
      if (checkpoint.route === checkpointRoute || !uuidPattern.test(id)) throw error('SITE_INFERENCE_INVALID_CHECKPOINT', '推理请求记录不可用。');
      await saveFields(checkpoint, onCheckpoint, { route: checkpointRoute, siteRequestId: id, ownerId: accountId, state: 'submitted', submittedAt: Date.now(), bodyHash: await bodyDigest(body), ...(requestSummary ? { requestPublicSummary: true } : {}) });
      signal?.throwIfAborted();
      if (getAccountId() !== accountId) throw error('SITE_INFERENCE_SIGN_IN', '推理开始前账号发生了变化。', { status: 401 });
    }
    const onAbort = () => {
      cleanup();
      if ((options.getAbortMode?.() ?? 'user') === 'user') void cancel(checkpoint, options).catch(() => {});
    };
    const cleanup = () => signal?.removeEventListener('abort', onAbort);
    signal?.addEventListener('abort', onAbort, { once: true });
    try {
      async function submit() {
        signal?.throwIfAborted();
        let liveResponse;
        try {
          liveResponse = await fetchSite(route, token, {
            method: 'POST', signal, headers: { 'Content-Type': 'application/json', 'X-Chat-Request-Id': checkpoint.siteRequestId },
            body,
          });
        } catch { signal?.throwIfAborted(); }
        if (liveResponse) {
          const startedAt = timestamp(liveResponse.headers.get('X-Chat-Started-At'));
          if (startedAt) await saveFields(checkpoint, onCheckpoint, { startedAt, state: 'running', providerRequestId: liveResponse.headers.get('X-Request-Id') });
          if (!liveResponse.ok || !liveResponse.body) { cleanup(); await settle(checkpoint, options); return liveResponse; }
          if (liveResponse.status !== 202) return stream(checkpoint, options, cleanup, { liveResponse });
          void liveResponse.body.cancel().catch(() => {});
        }
        return null;
      }
      let response = !reattach && await submit();
      if (response) return response;
      let initial;
      try { initial = await pollReceipt(checkpoint, -1, options); }
      catch (cause) {
        // The first page can close before the Worker admits the POST. The Worker
        // deduplicates by account, request ID and body, even if that POST arrives late.
        const withinWindow = Number.isSafeInteger(checkpoint.submittedAt) && Math.abs(Date.now() - checkpoint.submittedAt) < admissionRetryMs;
        const unacknowledged = checkpoint.state === 'submitted' && !checkpoint.startedAt && !checkpoint.cancelRequested;
        if (cause.status !== 404 || !unacknowledged || !withinWindow || checkpoint.bodyHash !== await bodyDigest(body)) throw cause;
        response = await submit();
        if (response) return response;
        initial = await pollReceipt(checkpoint, -1, options);
      }
      while (initial.status === 'running' && !initial.contentType && !initial.chunks.length) {
        await sleep(pollIntervalMs, signal);
        initial = await pollReceipt(checkpoint, -1, options);
      }
      const httpStatus = statusCode(initial.httpStatus);
      if (initial.replayExpired || isTerminal(initial.status) && !initial.chunks.length || httpStatus >= 400) throw receiptError(initial);
      return stream(checkpoint, options, cleanup, { initial });
    } catch (cause) {
      cleanup(); throw cause;
    }
  }
  return { request, cancel };
}
