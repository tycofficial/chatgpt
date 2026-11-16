/** Public site relay transport. No official subscription credential enters the browser. */
const clone = value => structuredClone(value);
const encoder = new TextEncoder();
const terminal = new Set(['complete', 'failed', 'cancelled']);
const authorizedAdmin = account => account?.id === 'site-admin' && account.role === 'administrator' && account.planType === 'pro' && account.membershipSource === 'site-administrator';
const delay = (ms, signal) => new Promise((resolve, reject) => { const abort = () => { clearTimeout(timer); reject(signal.reason); }; const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, ms); signal?.addEventListener('abort', abort, { once: true }); if (signal?.aborted) abort(); });
export class PreferredHostError extends Error { constructor(code, message, details = {}) { super(message); this.name = 'PreferredHostError'; this.code = code; this.retryable = false; Object.assign(this, details); } }
async function digest(text) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(text)))].map(byte => byte.toString(16).padStart(2, '0')).join(''); }
const abortError = message => new DOMException(message, 'AbortError');
/** Gate a fresh parser's replay against already persisted output. It never repeats a delta. */
export function createReplayDeltaGate(saved, onDelta) {
  const baseline = { content: String(saved?.content || ''), reasoning: String(saved?.reasoning || '') };
  let emittedContent = baseline.content;
  return (_delta, assembled) => {
    for (const key of ['content', 'reasoning']) {
      const value = String(assembled[key] || ''), old = baseline[key];
      if (!old.startsWith(value) && !value.startsWith(old)) throw new PreferredHostError('HOST_REPLAY_DIVERGED', 'Saved output does not match the durable relay stream; it was not silently replaced.');
    }
    if (String(assembled.content || '').length < baseline.content.length || String(assembled.reasoning || '').length < baseline.reasoning.length) return;
    const content = String(assembled.content || '');
    onDelta(content.startsWith(emittedContent) ? content.slice(emittedContent.length) : '', assembled); emittedContent = content;
  };
}

export function createPreferredHostTransport({
  baseURL = 'https://chatgpt-admin-bridge-tyc.hushedtarragon1.chatgpt.site', fetchImpl = globalThis.fetch,
  getSiteAccount, getSiteSessionToken, fallbackResponses, now = Date.now, uuid = () => crypto.randomUUID(),
  pollIntervalMs = 350, networkTimeoutMs = 15000, maxNetworkRetries = 5, retryDelayMs = 500,
  onDiagnostic = () => {}, sleep = delay,
} = {}) {
  const base = new URL(baseURL);
  if (base.protocol !== 'https:' && !(base.protocol === 'http:' && base.hostname === '127.0.0.1')) throw Error('The public relay must use HTTPS');
  if (typeof fetchImpl !== 'function' || typeof getSiteAccount !== 'function' || typeof getSiteSessionToken !== 'function') throw Error('Verified site identity and fetch functions are required');
  const active = new Map();
  const diagnostic = (type, extra = {}) => onDiagnostic({ type, ...extra });
  const persist = async (checkpoint, save) => { checkpoint.updatedAt = now(); await save?.(checkpoint); };
  const assertOwner = checkpoint => {
    const account = getSiteAccount();
    if (!authorizedAdmin(account) || checkpoint.ownerId && checkpoint.ownerId !== account.id || !getSiteSessionToken()) throw new PreferredHostError('SITE_ADMIN_AUTH_REQUIRED', 'Sign in again to resume this administrator-owned request.', { status: 401, requiresTransportResume: Boolean(checkpoint.jobId) });
    return account;
  };
  async function remote(path, { method = 'GET', body, signal } = {}) {
    const token = getSiteSessionToken(); if (typeof token !== 'string' || !token) throw new PreferredHostError('SITE_SESSION_REQUIRED', 'A verified website session is required.', { status: 401 });
    const url = new URL(path, base); if (url.origin !== base.origin) throw Error('Unexpected relay origin');
    const response = await fetchImpl(url, { method, credentials: 'omit', redirect: 'error', cache: 'no-store', headers: { Authorization: 'Bearer ' + token, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(networkTimeoutMs)]) : AbortSignal.timeout(networkTimeoutMs) });
    let data; try { data = await response.json(); } catch { throw new PreferredHostError('HOST_INVALID_JSON', 'The relay returned an invalid JSON response.', { status: response.status }); }
    if (!response.ok) throw new PreferredHostError(data.error?.code || 'HOST_HTTP_ERROR', data.error?.message || 'The relay request failed.', { status: response.status, responseBody: data });
    return data;
  }
  async function status() { assertOwner({}); return remote('/bridge/status'); }
  async function detach(checkpoint, { onCheckpoint } = {}) {
    if (!terminal.has(checkpoint.state) && !checkpoint.cancelRequested) checkpoint.state = 'detached';
    active.get(checkpoint.jobId)?.controller.abort(abortError('The local reader detached; the host job was not cancelled.'));
    await persist(checkpoint, onCheckpoint);
    return { detached: true, jobId: checkpoint.jobId ?? null };
  }
  async function cancel(checkpoint, { onCheckpoint } = {}) {
    if (!checkpoint.jobId || checkpoint.route !== 'host') return { cancelled: false, jobId: null };
    if (terminal.has(checkpoint.state)) return { cancelled: false, jobId: checkpoint.jobId, alreadyTerminal: true };
    assertOwner(checkpoint); checkpoint.cancelRequested = true; checkpoint.state = 'cancel-requested'; await persist(checkpoint, onCheckpoint);
    let confirmed = false;
    try { const data = await remote('/jobs/' + checkpoint.jobId, { method: 'DELETE' }); confirmed = data.cancelled === true; }
    catch (error) { if (error.status !== 404) { diagnostic('host-cancel-pending', { jobId: checkpoint.jobId, code: error.code || null }); throw error; } }
    if (confirmed) checkpoint.state = 'cancelled';
    await persist(checkpoint, onCheckpoint); active.get(checkpoint.jobId)?.controller.abort(abortError('The user cancelled the relay job.'));
    return { cancelled: confirmed, jobId: checkpoint.jobId };
  }
  async function fallback(payload, checkpoint, options, reason) {
    const run = options.fallbackResponses ?? fallbackResponses;
    if (checkpoint.accepted || checkpoint.route === 'host' && checkpoint.state !== 'prepared' && reason !== 'explicit-offline') throw new PreferredHostError('HOST_FALLBACK_BLOCKED', 'An admitted or uncertain host request cannot switch to API billing.');
    if (typeof run !== 'function') throw new PreferredHostError('API_FALLBACK_UNAVAILABLE', 'The local host is offline and no API fallback is configured.');
    if (checkpoint.apiAttempted) throw new PreferredHostError('API_ATTEMPT_ALREADY_STARTED', 'This API attempt was already started; use the saved task checkpoint rather than submitting it twice.');
    checkpoint.route = 'api'; checkpoint.state = 'api-in-flight'; checkpoint.apiAttempted = true; checkpoint.fallbackReason = reason; delete checkpoint.admissionPayload; await persist(checkpoint, options.onCheckpoint);
    diagnostic('preferred-host-api-fallback', { reason }); return run(payload, options);
  }
  async function admit(payload, checkpoint, options) {
    if (!/^[a-f0-9-]{36}$/i.test(checkpoint.jobId || '')) throw new PreferredHostError('HOST_INVALID_JOB_ID', 'The saved relay job ID is invalid; no replacement job was created.');
    let failures = 0;
    const stopped = () => {
      if (!options.signal?.aborted) return;
      if (!['pagehide', 'transport'].includes(options.getAbortMode?.() ?? 'user')) checkpoint.cancelRequested = true;
      else checkpoint.detachRequested = true;
      persist(checkpoint, options.onCheckpoint).catch(() => {});
    };
    options.signal?.addEventListener('abort', stopped, { once: true });
    try {
    while (!checkpoint.accepted) {
      assertOwner(checkpoint);
      stopped();
      if (checkpoint.cancelRequested) { await cancel(checkpoint, options); throw abortError('The user cancelled admission.'); }
      options.signal?.throwIfAborted();
      checkpoint.route = 'host'; checkpoint.state = 'admission-uncertain'; checkpoint.admissionPayload ??= clone(payload); await persist(checkpoint, options.onCheckpoint);
      try {
        // Do not abort an in-flight admission with the page signal: confirm the stable job ID, then cancel/detach.
        const result = await remote('/jobs', { method: 'POST', body: { id: checkpoint.jobId, payload: checkpoint.admissionPayload } });
        if (result.id !== checkpoint.jobId || !['queued', 'claimed', 'streaming', 'complete', 'failed', 'cancelled'].includes(result.status)) throw new PreferredHostError('HOST_INVALID_ADMISSION', 'The relay did not acknowledge this exact stable job ID.');
        checkpoint.accepted = true; checkpoint.acceptedAt ??= now(); checkpoint.state = result.status === 'queued' || result.status === 'claimed' ? 'accepted' : result.status; delete checkpoint.admissionPayload; await persist(checkpoint, options.onCheckpoint);
        if (checkpoint.cancelRequested) { await cancel(checkpoint, options); throw abortError('The user cancelled the relay job.'); }
        if (options.signal?.aborted) { await detach(checkpoint, options); throw options.signal.reason; }
        return null;
      } catch (error) {
        if (error.name === 'AbortError' || checkpoint.cancelRequested) throw error;
        if (error.code === 'BRIDGE_OFFLINE' && !checkpoint.accepted) { checkpoint.state = 'prepared'; return fallback(payload, checkpoint, options, 'explicit-offline'); }
        if (error.status >= 400 && error.status < 500) throw error;
        if (failures++ >= maxNetworkRetries) throw new PreferredHostError('HOST_ADMISSION_UNCERTAIN', 'Admission could not be confirmed. The same job ID must be reattached; API billing was not started.', { requiresTransportResume: true, jobId: checkpoint.jobId, cause: error });
        await sleep(Math.min(15000, retryDelayMs * 2 ** Math.min(failures - 1, 5)), options.signal);
      }
    }
    return null;
    } finally { options.signal?.removeEventListener('abort', stopped); }
  }
  async function open(checkpoint, options) {
    assertOwner(checkpoint);
    if (!checkpoint.accepted) throw new PreferredHostError('HOST_NOT_ADMITTED', 'This request must be admitted before reading its events.');
    if (checkpoint.cancelRequested || checkpoint.state === 'cancelled') throw abortError('The relay job was cancelled.');
    if (['detached', 'interrupted'].includes(checkpoint.state)) { checkpoint.state = 'reattaching'; checkpoint.detachRequested = false; await persist(checkpoint, options.onCheckpoint); }
    const local = new AbortController(); let bodyController, responseHeaders, responseStatus, cursor = -1, sawEnd = false, closed = false, headersResolved = false, resolveHeaders, rejectHeaders;
    const ready = new Promise((resolve, reject) => { resolveHeaders = resolve; rejectHeaders = reject; });
    const cleanup = () => { options.signal?.removeEventListener('abort', aborted); if (active.get(checkpoint.jobId)?.controller === local) active.delete(checkpoint.jobId); };
    const fail = error => { if (closed) return; closed = true; cleanup(); if (!headersResolved) rejectHeaders(error); try { bodyController.error(error); } catch {} };
    const finish = () => { if (closed) return; closed = true; cleanup(); if (!headersResolved) return rejectHeaders(new PreferredHostError('HOST_HEADERS_MISSING', 'The job ended before response headers were recorded.')); bodyController.close(); };
    const aborted = () => {
      const mode = options.getAbortMode?.() ?? 'user';
      const operation = mode === 'pagehide' || mode === 'transport' ? detach(checkpoint, options) : cancel(checkpoint, options);
      operation.catch(error => diagnostic('host-stop-pending', { jobId: checkpoint.jobId, code: error.code || null }));
      local.abort(options.signal.reason || abortError('The local request stopped.')); fail(options.signal.reason || abortError('The local request stopped.'));
    };
    const stream = new ReadableStream({ start(controller) { bodyController = controller; }, cancel() { if (closed) return; closed = true; cleanup(); detach(checkpoint, options).catch(() => {}); local.abort(abortError('The parser detached its reader.')); } });
    active.set(checkpoint.jobId, { controller: local }); options.signal?.addEventListener('abort', aborted, { once: true });
    if (options.signal?.aborted) aborted();
    (async () => {
      let failures = 0, gaps = 0;
      while (!closed) {
        local.signal.throwIfAborted(); assertOwner(checkpoint);
        let snapshot;
        try { snapshot = await remote('/jobs/' + checkpoint.jobId + '/events?after=' + cursor, { signal: local.signal }); failures = 0; }
        catch (error) {
          if (local.signal.aborted) throw error;
          if (error.status && error.status < 500) throw error;
          if (failures++ >= maxNetworkRetries) throw new PreferredHostError('HOST_STREAM_INTERRUPTED', 'The durable job remains on the relay. Reattach this job rather than starting another inference.', { requiresTransportResume: true, jobId: checkpoint.jobId, cause: error });
          await sleep(Math.min(15000, retryDelayMs * 2 ** Math.min(failures - 1, 5)), local.signal); continue;
        }
        if (snapshot.id !== checkpoint.jobId || !Array.isArray(snapshot.events)) throw new PreferredHostError('HOST_INVALID_EVENT_RESPONSE', 'The relay returned events for an unexpected job.');
        let hasGap = false;
        for (const event of snapshot.events) {
          if (closed) return;
          if (!Number.isSafeInteger(event.seq) || event.seq < 0) throw new PreferredHostError('HOST_INVALID_SEQUENCE', 'The relay returned an invalid event sequence.');
          if (event.seq <= cursor) continue;
          if (event.seq !== cursor + 1) { hasGap = true; break; }
          const data = event.data;
          if (data?.type === 'headers') {
            if (cursor !== -1 || !Number.isInteger(data.status) || data.status < 200 || data.status > 599 || [204, 205, 304].includes(data.status) || typeof data.contentType !== 'string') throw new PreferredHostError('HOST_INVALID_HEADERS', 'The relay returned invalid or duplicate inference headers.');
            responseStatus = data.status; responseHeaders = { 'Content-Type': data.contentType, 'Cache-Control': 'no-store', 'X-Inference-Route': 'authorized-local-host', 'X-Relay-Job-Id': checkpoint.jobId }; checkpoint.responseStatus = data.status;
            headersResolved = true; resolveHeaders();
          } else if (data?.type === 'data') {
            if (!headersResolved || sawEnd || typeof data.text !== 'string') throw new PreferredHostError('HOST_INVALID_DATA_EVENT', 'The relay returned data outside its response stream.');
            bodyController.enqueue(encoder.encode(data.text));
          } else if (data?.type === 'end') { if (!headersResolved || sawEnd) throw new PreferredHostError('HOST_INVALID_END_EVENT', 'The relay ended an invalid response stream.'); sawEnd = true; }
          else throw new PreferredHostError('HOST_UNKNOWN_EVENT', 'The relay returned an unsupported event type.');
          cursor = event.seq; checkpoint.lastDeliveredSeq = Math.max(checkpoint.lastDeliveredSeq ?? -1, cursor); await persist(checkpoint, options.onCheckpoint);
        }
        if (closed || local.signal.aborted) return;
        if (hasGap) { if (++gaps > maxNetworkRetries) throw new PreferredHostError('HOST_SEQUENCE_GAP', 'Durable relay events are missing. The stream cannot skip content or start a new paid request.', { requiresTransportResume: true }); await sleep(pollIntervalMs, local.signal); continue; }
        gaps = 0;
        if (snapshot.status === 'cancelled') { checkpoint.state = 'cancelled'; await persist(checkpoint, options.onCheckpoint); throw abortError('The relay job was cancelled.'); }
        if (terminal.has(snapshot.status) && sawEnd) { checkpoint.state = snapshot.status; checkpoint.error = snapshot.error ?? null; await persist(checkpoint, options.onCheckpoint); finish(); return; }
        if (terminal.has(snapshot.status) && snapshot.events.length < 100) throw new PreferredHostError(snapshot.status === 'failed' ? 'HOST_JOB_FAILED' : 'HOST_INCOMPLETE_EVENTS', snapshot.error || 'The terminal job did not contain a complete response event sequence.', { requiresTransportResume: snapshot.status !== 'failed', jobId: checkpoint.jobId });
        checkpoint.state = 'streaming'; await persist(checkpoint, options.onCheckpoint); await sleep(snapshot.events.length >= 100 ? 0 : pollIntervalMs, local.signal);
      }
    })().catch(error => { if (!terminal.has(checkpoint.state) && !checkpoint.cancelRequested && checkpoint.state !== 'detached') checkpoint.state = 'interrupted'; if (error?.name !== 'AbortError' && checkpoint.accepted && !terminal.has(checkpoint.state)) { error.requiresTransportResume = true; error.jobId ??= checkpoint.jobId; } persist(checkpoint, options.onCheckpoint).catch(() => {}); fail(error); });
    await ready;
    return new Response(stream, { status: responseStatus, headers: responseHeaders });
  }
  async function request(payload, options = {}) {
    options.signal?.throwIfAborted();
    const checkpoint = options.checkpoint ??= {};
    if (!payload || typeof payload.model !== 'string' || !Array.isArray(payload.input)) throw new PreferredHostError('INVALID_RESPONSES_PAYLOAD', 'The preferred host accepts a complete Responses request.');
    const fingerprint = await digest(JSON.stringify(payload));
    if (checkpoint.payloadFingerprint && checkpoint.payloadFingerprint !== fingerprint) throw new PreferredHostError('HOST_PAYLOAD_CHANGED', 'A stable inference checkpoint cannot be reused with different input or settings.');
    checkpoint.payloadFingerprint ??= fingerprint; checkpoint.requestId ??= options.requestId ?? uuid(); checkpoint.version ??= 1;
    if (checkpoint.route === 'api') return fallback(payload, checkpoint, options, checkpoint.fallbackReason || 'api-selected');
    if (checkpoint.accepted) return open(checkpoint, options);
    if (checkpoint.route === 'host' && checkpoint.admissionPayload) { const fallbackResult = await admit(checkpoint.admissionPayload, checkpoint, options); return fallbackResult || open(checkpoint, options); }
    if (!authorizedAdmin(getSiteAccount())) return fallback(payload, checkpoint, options, 'not-verified-administrator');
    assertOwner(checkpoint); checkpoint.ownerId = getSiteAccount().id;
    let host;
    try { host = await status(); } catch (error) { if (error.status && error.status < 500) throw error; return fallback(payload, checkpoint, options, 'status-unavailable-before-admission'); }
    options.signal?.throwIfAborted();
    if (!host.online || host.profile?.authenticated !== true) return fallback(payload, checkpoint, options, 'host-offline');
    if (host.profile.quota?.state === 'request-paused') throw new PreferredHostError('SUBSCRIPTION_QUOTA_EXHAUSTED', 'ChatGPT plan requests are paused by an actual reported usage-limit error. Check ChatGPT Settings → Usage.', { status: 429, quota: clone(host.profile.quota), usageUrl: 'https://chatgpt.com/settings/usage' });
    if (!host.profile.models?.some(model => model.slug === payload.model)) throw new PreferredHostError('SUBSCRIPTION_MODEL_UNAVAILABLE', 'The online account does not offer the selected model; API billing was not started.', { status: 400 });
    checkpoint.jobId ??= uuid(); checkpoint.state = 'prepared';
    const fallbackResult = await admit(payload, checkpoint, options); return fallbackResult || open(checkpoint, options);
  }
  async function resume(checkpoint, options = {}) {
    if (!checkpoint || checkpoint.route !== 'host' || !checkpoint.jobId) throw new PreferredHostError('HOST_CHECKPOINT_REQUIRED', 'No durable host job is available to reattach.');
    assertOwner(checkpoint);
    if (checkpoint.cancelRequested) { await cancel(checkpoint, options); throw abortError('The user cancelled this job.'); }
    if (!checkpoint.accepted) { if (!checkpoint.admissionPayload) throw new PreferredHostError('HOST_ADMISSION_PAYLOAD_MISSING', 'An uncertain admission needs its exact original payload.'); const fallbackResult = await admit(checkpoint.admissionPayload, checkpoint, options); if (fallbackResult) return fallbackResult; }
    // A new Responses parser must replay from sequence0. Persisted high-water marks are diagnostic, not permission to drop prior text.
    return open(checkpoint, options);
  }
  return { request, resume, cancel, detach, status };
}
