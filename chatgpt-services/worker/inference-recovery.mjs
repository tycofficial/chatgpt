import { prepareDocodeRequest, sendDocodeRequest } from './site-inference.mjs';

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const retentionMs = 24 * 60 * 60 * 1000;
const staleMs = 45_000;
const executionMs = 10 * 60 * 1000;
const chunkSize = 16_000;
const maxResponseBytes = 4 * 1024 * 1024;
const pageSize = 8;
const encoder = new TextEncoder();
const query = (env, sql, ...values) => env.DB.prepare(sql).bind(...values);
const changes = result => result?.meta?.changes ?? 0;
const receiptError = (code, message) => ({ code, message });
const unknownExecution = receiptError('INFERENCE_INTERRUPTED', '服务端流式连接已中断，请保留已有正文并手动选择是否另发。');
const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
});
const fail = (status, code, message, headers) => json({ error: receiptError(code, message) }, status, headers);
const scope = actor => actor.role === 'administrator' ? 'administrator:' + actor.id : 'user:' + actor.id;

function correlationHeaders(id, startedAt) {
  return {
    'X-Chat-Request-Id': id,
    'X-Chat-Started-At': String(startedAt),
    'Access-Control-Expose-Headers': 'X-Chat-Request-Id, X-Chat-Started-At, X-Request-Id, Retry-After, X-Inference-Route',
  };
}

async function payloadHash(body) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(body)));
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
}

function positiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}

function reportedCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function refreshStale(env, owner, id) {
  const now = Date.now();
  return query(env, "UPDATE inference_receipts SET status='interrupted',finished_at=?,error_json=? WHERE owner_id=? AND id=? AND status='running' AND (updated_at<? OR started_at<?)",
    now, JSON.stringify(unknownExecution), owner, id, now - staleMs, now - executionMs).run();
}

async function getReceipt(env, owner, id, after = -1) {
  const find = () => query(env, 'SELECT * FROM inference_receipts WHERE owner_id=? AND id=?', owner, id).first();
  let row = await find();
  if (!row) return null;
  const now = Date.now();
  if (row.status === 'running' && (row.updated_at < now - staleMs || row.started_at < now - executionMs)) {
    await refreshStale(env, owner, id);
    row = await find();
  }
  const replayExpired = row.updated_at < Date.now() - retentionMs;
  const rows = replayExpired ? [] : (await query(env,
    'SELECT seq,data FROM inference_response_chunks WHERE owner_id=? AND request_id=? AND seq>? ORDER BY seq LIMIT ?',
    owner, id, after, pageSize + 1).all()).results;
  return {
    id, status: row.status, startedAt: row.started_at, finishedAt: row.finished_at,
    httpStatus: row.http_status, contentType: row.content_type, providerRequestId: row.provider_request_id,
    model: row.received_model, serviceTier: row.service_tier,
    error: row.error_json ? JSON.parse(row.error_json) : null,
    chunks: rows.slice(0, pageSize), hasMore: rows.length > pageSize, replayExpired,
  };
}

function rememberOutcome(receipt, response) {
  if (!response || typeof response !== 'object') return;
  if (typeof response.model === 'string') receipt.model = response.model.slice(0, 120);
  if (typeof response.service_tier === 'string') receipt.tier = response.service_tier.slice(0, 30);
  if (response.usage) {
    receipt.input = reportedCount(response.usage.input_tokens);
    receipt.output = reportedCount(response.usage.output_tokens);
  }
  if (response.status === 'completed') receipt.status = 'completed';
  if (['failed', 'cancelled', 'incomplete'].includes(response.status) || response.error) {
    const detail = response.error ?? response.incomplete_details;
    receipt.status = 'failed';
    receipt.error = receiptError(
      String(detail?.code ?? detail?.reason ?? 'INFERENCE_FAILED').slice(0, 128),
      String(detail?.message ?? '模型未完成当前请求。').slice(0, 1024),
    );
  }
}

function responseOutcome(contentType) {
  const receipt = { status: 'interrupted', error: unknownExecution, model: null, tier: null, input: null, output: null };
  let fragment = '';
  let hasPublicText = false;
  const sse = contentType?.includes('text/event-stream');
  const event = frame => {
    if (receipt.status !== 'interrupted') return;
    const data = frame.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5)).join('\n');
    if (!data) return;
    let value;
    try {
      value = JSON.parse(data);
    } catch { return; }
    if (value?.type === 'response.output_text.delta' && typeof value.delta === 'string' && value.delta.trim()) {
      hasPublicText = true;
    }
    const response = value?.response;
    const status = response?.status;
    if (['completed', 'failed', 'incomplete'].includes(status) && value.type === 'response.' + status) {
      rememberOutcome(receipt, { ...response, error: value.error ?? response.error });
    } else if (value?.type === 'error' && (value.error || typeof value.code === 'string' || typeof value.message === 'string')) {
      rememberOutcome(receipt, { status: 'failed', error: value.error ?? value });
    }
  };
  return {
    add(text) {
      fragment += text;
      if (!sse) return false;
      const hadPublicText = hasPublicText;
      let boundary;
      while ((boundary = /\r?\n\r?\n/.exec(fragment))) {
        event(fragment.slice(0, boundary.index));
        fragment = fragment.slice(boundary.index + boundary[0].length);
      }
      return !hadPublicText && hasPublicText;
    },
    hasTerminalEvent() {
      return sse && receipt.status !== 'interrupted';
    },
    finish(ok) {
      if (!sse) {
        try {
          const response = JSON.parse(fragment);
          rememberOutcome(receipt, response);
          if (ok && !response.error && response.output && !response.status) receipt.status = 'completed';
        } catch {}
      }
      if (!ok && receipt.status !== 'failed') {
        receipt.status = 'failed';
        receipt.error = receiptError('INFERENCE_FAILED', '模型请求失败。');
      }
      if (receipt.status === 'completed') receipt.error = null;
      return receipt;
    },
  };
}

async function finishReceipt(env, owner, id, result) {
  const finishedAt = Date.now();
  await query(env, "UPDATE inference_receipts SET status=?,updated_at=?,finished_at=?,received_model=?,service_tier=?,error_json=?,input_tokens=?,output_tokens=? WHERE owner_id=? AND id=? AND status='running'",
    result.status, finishedAt, finishedAt, result.model ?? null, result.tier ?? null, result.error ? JSON.stringify(result.error) : null,
    result.input ?? null, result.output ?? null, owner, id).run();
}

const timedOut = Symbol('flush pending inference bytes');
async function waitForBytes(pending, remaining) {
  if (remaining <= 0) return timedOut;
  let timer;
  try {
    return await Promise.race([pending, new Promise(resolve => { timer = setTimeout(resolve, remaining, timedOut); })]);
  } finally {
    clearTimeout(timer);
  }
}

// Save the same UTF-8 prefix before delivering it to the originating browser.
async function recordBody(env, owner, id, response, liveChunk, abortSignal) {
  const outcome = responseOutcome(response.headers.get('Content-Type'));
  if (!response.body) return outcome.finish(response.ok);
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let bytes = 0;
  let seq = 0;
  let pending = '';
  let flushAt = 0;
  const flush = async () => {
    while (pending.length) {
      let stop = Math.min(pending.length, chunkSize);
      const finalCode = pending.charCodeAt(stop - 1);
      if (finalCode >= 0xD800 && finalCode <= 0xDBFF) stop--;
      const data = pending.slice(0, stop);
      pending = pending.slice(stop);
      const now = Date.now();
      const saved = await query(env, "INSERT INTO inference_response_chunks (owner_id,request_id,seq,data,created_at) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM inference_receipts WHERE owner_id=? AND id=? AND status='running')",
        owner, id, seq++, data, now, owner, id).run();
      if (!changes(saved)) throw new Error('Inference receipt no longer running');
      liveChunk(encoder.encode(data));
    }
  };
  try {
    let next = reader.read();
    for (;;) {
      let read;
      try {
        read = pending ? await waitForBytes(next, flushAt - Date.now()) : await next;
      } catch (error) {
        if (abortSignal.aborted || !outcome.hasTerminalEvent()) throw error;
        // The provider sent a complete terminal event before its connection failed.
        break;
      }
      if (read === timedOut) {
        await flush();
        continue;
      }
      if (abortSignal.aborted) throw abortSignal.reason;
      if (read.done) break;
      bytes += encoder.encode(read.value).byteLength;
      if (bytes > maxResponseBytes) throw new Error('Inference response exceeded the recovery storage limit');
      const firstPublicText = outcome.add(read.value);
      if (!pending) flushAt = Date.now() + 200;
      pending += read.value;
      if (pending.length >= chunkSize || seq === 0 || firstPublicText) await flush();
      next = reader.read();
    }
    await flush();
    return outcome.finish(response.ok);
  } catch (error) {
    await flush().catch(() => {});
    await reader.cancel(error).catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
}

async function runInference(env, owner, id, startedAt, prepared, respond) {
  const abort = new AbortController();
  const signal = AbortSignal.any([abort.signal, AbortSignal.timeout(executionMs)]);
  let controller;
  let running = true;
  let heartbeatPending = false;
  const heartbeat = setInterval(async () => {
    if (!running || heartbeatPending) return;
    heartbeatPending = true;
    try {
      const result = await query(env, "UPDATE inference_receipts SET updated_at=? WHERE owner_id=? AND id=? AND status='running'",
        Date.now(), owner, id).run();
      if (!changes(result)) abort.abort();
    } catch {
      abort.abort();
    } finally {
      heartbeatPending = false;
    }
  }, 4_000);

  try {
    const response = await sendDocodeRequest(prepared, signal);
    const updated = await query(env, "UPDATE inference_receipts SET http_status=?,content_type=?,provider_request_id=?,updated_at=? WHERE owner_id=? AND id=? AND status='running'",
      response.status, response.headers.get('Content-Type'), response.headers.get('X-Request-Id'), Date.now(), owner, id).run();
    if (!changes(updated)) {
      abort.abort();
      await response.body?.cancel().catch(() => {});
      respond(fail(409, 'INFERENCE_ENDED', '此请求已结束，请查看已保存状态。', correlationHeaders(id, startedAt)));
      return;
    }
    const live = new ReadableStream({
      start(target) { controller = target; },
      cancel() { controller = null; },
    });
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(correlationHeaders(id, startedAt))) headers.set(key, value);
    respond(new Response(live, { status: response.status, headers }));
    const result = await recordBody(env, owner, id, response, chunk => controller?.enqueue(chunk), signal);
    await finishReceipt(env, owner, id, result);
    controller?.close();
  } catch {
    abort.abort();
    await finishReceipt(env, owner, id, { status: 'interrupted', error: unknownExecution }).catch(() => {});
    respond(fail(503, unknownExecution.code, unknownExecution.message, correlationHeaders(id, startedAt)));
    controller?.error(new Error(unknownExecution.message));
  } finally {
    running = false;
    clearInterval(heartbeat);
  }
}

export async function startJournaledInference(request, env, ctx, actor, suppliedId, free) {
  const id = suppliedId.toLowerCase();
  if (!uuid.test(id)) return fail(400, 'INVALID_INFERENCE_ID', '请求编号必须是 UUID。');
  const prepared = await prepareDocodeRequest(request, env.DOCODE_API_KEY, { free });
  if (prepared instanceof Response) return prepared;
  if (typeof ctx?.waitUntil !== 'function') return fail(503, 'INFERENCE_RECOVERY_UNAVAILABLE', '当前环境无法保存推理恢复记录。');

  const owner = scope(actor);
  const hash = await payloadHash(prepared.body);
  const startedAt = Date.now();
  const floor = Math.floor(startedAt / retentionMs) * retentionMs;
  const budget = positiveInteger(env.FREE_DAILY_REQUESTS, 20);
  const globalBudget = positiveInteger(env.FREE_GLOBAL_DAILY_REQUESTS, 200);
  const result = await query(env, `
    INSERT OR IGNORE INTO inference_receipts (owner_id,id,payload_hash,model,free_request,status,started_at,updated_at)
    SELECT ?,?,?,?,?,'running',?,? WHERE ?=0 OR (
      (SELECT COUNT(*) FROM inference_receipts WHERE owner_id=? AND free_request=1 AND started_at>=?)<?
      AND (SELECT COUNT(*) FROM inference_receipts WHERE free_request=1 AND started_at>=?)<?
    )
  `, owner, id, hash, prepared.model, free ? 1 : 0, startedAt, startedAt, free ? 1 : 0,
  owner, floor, budget, floor, globalBudget).run();
  if (!changes(result)) {
    const prior = await query(env, 'SELECT payload_hash FROM inference_receipts WHERE owner_id=? AND id=?', owner, id).first();
    if (!prior) return fail(429, 'SITE_FREE_LIMIT', '站内标准聊天已达到当日请求额度。', { 'Retry-After': String(Math.ceil((floor + retentionMs - startedAt) / 1000)) });
    if (prior.payload_hash && prior.payload_hash !== hash) return fail(409, 'INFERENCE_ID_CONFLICT', '此请求编号已对应另一项请求。');
    const receipt = await getReceipt(env, owner, id);
    return json({ ...receipt, reattached: true }, 202, correlationHeaders(id, receipt.startedAt));
  }

  // Only the admission winner starts upstream work. Retain the small receipt even after the stream expires.
  const liveResponse = new Promise(resolve => ctx.waitUntil(runInference(env, owner, id, startedAt, prepared, resolve)));
  ctx.waitUntil(query(env, "DELETE FROM inference_response_chunks WHERE rowid IN (SELECT rowid FROM inference_response_chunks WHERE created_at<? LIMIT 100)",
    startedAt - retentionMs).run().catch(() => {}));
  return liveResponse;
}

export async function readJournaledInference(request, env, actor, suppliedId) {
  const id = suppliedId.toLowerCase();
  if (!uuid.test(id)) return fail(404, 'INFERENCE_NOT_FOUND', '找不到此请求。');
  const owner = scope(actor);
  if (!['GET', 'DELETE'].includes(request.method)) return fail(405, 'METHOD_NOT_ALLOWED', '请读取请求状态或取消该请求。', { Allow: 'GET, DELETE' });
  const value = new URL(request.url).searchParams.get('after');
  const after = value == null ? -1 : Number(value);
  if (!Number.isSafeInteger(after) || after < -1) return fail(400, 'INVALID_CURSOR', '无效的恢复位置。');
  if (request.method === 'DELETE') {
    const now = Date.now();
    await query(env, "INSERT INTO inference_receipts (owner_id,id,payload_hash,model,status,started_at,updated_at,finished_at) VALUES (?,?,'','','cancelled',?,?,?) ON CONFLICT (owner_id,id) DO UPDATE SET status='cancelled',finished_at=excluded.finished_at,updated_at=excluded.updated_at WHERE inference_receipts.status='running'",
      owner, id, now, now, now).run();
  }
  const receipt = await getReceipt(env, owner, id, after);
  return receipt ? json(receipt, 200, correlationHeaders(id, receipt.startedAt))
    : fail(404, 'INFERENCE_NOT_FOUND', '找不到此请求的服务端接收记录。');
}

export async function readSiteInferenceUsage(env, actor) {
  const owner = scope(actor);
  const now = Date.now();
  const floor = Math.floor(now / retentionMs) * retentionMs;
  const totals = await query(env, `
    SELECT COUNT(*) AS requests, COALESCE(SUM(status='completed'),0) AS completed, COUNT(input_tokens) AS token_reports,
           SUM(input_tokens) AS input_tokens, SUM(output_tokens) AS output_tokens
    FROM inference_receipts WHERE owner_id=? AND payload_hash<>''
  `, owner).first();
  const free = await query(env, 'SELECT COUNT(*) AS requests FROM inference_receipts WHERE owner_id=? AND free_request=1 AND started_at>=?', owner, floor).first();
  return {
    source: 'site-docode', ...totals,
    freeDaily: { requests: free.requests, limit: positiveInteger(env.FREE_DAILY_REQUESTS, 20), resetsAt: floor + retentionMs },
  };
}
