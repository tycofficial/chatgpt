# Next-version preferred-host transport

Prepared separately from the frozen release. No runtime, runner, service-boundary, builder, browser or OAuth session was changed. `tests/native-preferred-host.test.mjs` uses only fixture transports and neutral text.

## New helper API

```js
const preferred = createPreferredHostTransport({
  fetchImpl: allowedFetch,
  getSiteAccount,            // verified in-memory site account; never cached user JSON
  getSiteSessionToken,       // website bearer only; not an official OAuth token
  fallbackResponses,        // ordinary authorized gateway fetch, returns Response
});
const response = await preferred.request(responsesPayload, {
  checkpoint: currentRound.transport,
  onCheckpoint: saveCurrentTurn,
  signal: running.controller.signal,
  getAbortMode: () => running.interruptReason === 'pagehide' ? 'pagehide' : 'user',
  fallbackResponses: ordinaryGatewayFetch,
});
```

The helper returns a raw `Response`, so the existing Responses decoder still owns text, reasoning, tool calls, actual usage and `response.completed`/`response.failed` interpretation. It does not duplicate that parser or translate Responses SSE into Chat Completions SSE.

Other methods are `resume(checkpoint, options)`, `cancel(checkpoint, options)`, `detach(checkpoint, options)`, and `status()`. `createReplayDeltaGate(savedPartial, onDelta)` suppresses already saved prefixes while a new parser replays the durable stream; divergent text is an explicit error.

Only verified `site-admin` / `administrator` / `pro` / `site-administrator` identity is eligible for the host route. Free/guest requests use the existing API without querying the host. An offline/unavailable host may fall back before admission. Online quota pauses, unsupported selected models and authentication failures do not silently select another billing path.

## Exact deployed v3 contracts

Source: `chatgpt-services/worker/service.mjs`, read without modification.

- `GET /bridge/status` with website bearer: `{online,lastSeen,profile,source}`. Profile supplies `authenticated`, catalog `models`, and optional `quota.state:'request-paused'`. Plan name, reset time and percentages are not inferred.
- `POST /jobs` body `{id:<stable UUID>,payload:<Responses request>}`: HTTP202 `{id,status,reattached?}`. Exact same ID/payload reattaches; a different payload is409 `JOB_ID_CONFLICT`. Explicit409 `BRIDGE_OFFLINE` occurs before insertion and may safely use the API. A network/5xx ambiguity retries the same ID, then requires transport resume; it never selects API billing.
- `GET /jobs/:id/events?after=-1`: `{id,status,updated_at,error,events:[{seq,data}]}`, at most100 events, ordered by sequence. Sequence begins0. Data is exactly `headers{status,contentType}`, `data{text}`, or `end`.
- `DELETE /jobs/:id`: `{cancelled:true}` marks the job cancelled.

The checkpoint keeps its stable job ID, exact payload fingerprint, route/admission state, owner, delivered high-water mark and cancellation intent. The original payload is kept only while admission is uncertain. It never stores gateway headers, the website bearer or an official subscription token.

Network polling resumes at the current reader's cursor. A **fresh decoder** reattaches from sequence0, regardless of the persisted high-water mark, so no text/tool event is silently dropped. Within a reader, duplicates are ignored, gaps are retried and then reported as errors. Accepted jobs never fall back to the API. API fallback attempts also reject reuse of the same already-started checkpoint.

## Minimal runtime integration

Add one optional raw-Responses transport seam to `streamCompletion` → `streamResponses`, keeping the existing codec unchanged:

```js
const ordinaryGatewayFetch = () => fetch(apiURL(settings.apiBase, 'responses'), {
  method:'POST', headers:requestHeaders(settings),
  body:JSON.stringify(payload), signal,
});
const response = responsesTransport
  ? await responsesTransport(payload, {signal, fallbackResponses:ordinaryGatewayFetch})
  : await ordinaryGatewayFetch();
```

The service can inject a closure calling `preferred.request(payload, ...)` with the current round checkpoint. Existing non-Responses transports remain unchanged; do not feed official Responses events to the Chat Completions parser. Gateway credentials stay inside the ordinary-fetch closure.

## Runner/checkpoint integration required before activation

Each API round needs one persisted transport checkpoint, separate from the turn's overall task checkpoint. Save it before dispatch and pass the same object through network retries and page reloads. Include model/effort and round ID in the owning metric.

For errors with `requiresTransportResume:true`, preserve the same in-flight round, original assistant/reasoning item IDs and partial output. Reattach through `preferred.resume`; do **not** take the existing generic path that appends a continuation prompt and starts a new API round. That would create a second inference while the first host job may still be running.

A fresh parser replays the old stream. Restore the original running assistant/reasoning items and wrap `onDelta` with `createReplayDeltaGate(cp.partialResponse, originalOnDelta)`. Early prefix deltas are suppressed; once replay catches up, ordinary monotonic append resumes. On completed replay, the returned assembled response contains the full text/tool calls for the normal agent loop. A changed payload fingerprint is rejected rather than silently assigned another job.

Explicit user stop must call `cancel`, while pagehide and reader cancellation call `detach`. Admission is confirmed using an independent bounded HTTP timeout, then any user cancellation is applied to that same job. The saved cancellation intent prevents a later resume from starting a different request. Site logout should stop owned work before discarding the bearer.

## Remaining host/backend work — not implemented or claimed by this helper

1. **Actual host cancellation:** deployed DELETE currently changes the database only. Frozen `local-bridge/bridge-client.mjs` does not yet interpret event acknowledgement `{cancelled:true}` as a per-job abort. Add a per-job AbortController and a bounded cancellation heartbeat while waiting for official stream output. On a confirmed cancellation, abort that official request; do not report a successful end. An empty `/bridge/jobs/:id/events` POST can already check the cancelled flag, but host code must act on it. Cancellation before an ambiguous admission also benefits from a backend cancellation tombstone so a late create cannot escape the saved stop intent.
2. **Actual host parallelism:** frozen bridge serves one job at a time, and v3 poll chooses an existing claimed/streaming job before another queued one. Add an explicit bounded running-job exclusion/claim contract and host capacity, e.g. three jobs, before routing Ultra parallel workers through it. The helper does not claim serial queued host jobs are parallel inference. Until that is implemented, keep Ultra workers on their already tested direct API transport or reject the unavailable host capability explicitly; do not silently change billing after admission.
3. **Structured in-stream errors:** raw HTTP status/body and SSE are preserved. The existing runtime should preserve `response.failed` error code/param/request ID as well as message, so a quota error inside an HTTP200 SSE response remains a quota error. A top-level v3 job error currently stringifies an object as `[object Object]`; use raw official event data rather than inventing a machine-readable code from that text.
4. Add this helper to the builder and retain only the already allowed website `/bridge/status` and `/jobs` methods. No official OAuth token or private ChatGPT endpoint is needed by the browser.

The helper is ready for the next integration step after the current release. It is intentionally not activated by adding this source file.
