# Local ChatGPT subscription bridge

This independent Node.js program connects the website relay to the official open-source Sign in with ChatGPT and public Responses API. It does not read browser cookies, use the private ChatGPT backend, or reuse OpenAI's OAuth client. The website's administrator membership and an officially granted ChatGPT subscription are separate identities.

## Start on this Windows computer

Node.js 24.5+ is required. From PowerShell:

```powershell
.\local-bridge\Install.ps1
.\local-bridge\Start-Bridge.ps1
```

Dependencies, npm cache, credentials and job journals default to `D:\ChatGPT-Local-Bridge\`. Environment overrides are `LOCAL_BRIDGE_STATE_DIR`, `LOCAL_BRIDGE_DEPS_DIR` and `LOCAL_BRIDGE_NPM_CACHE`. No credential goes into this repository. The state folder is restricted to the current Windows account before writing credentials. On Unix, directory/file permissions are 0700/0600. Failure to establish those permissions stops startup.

`Start-Bridge.ps1 -NoOpen` starts only the program. `Open-UI.ps1` opens its protected loopback management page again, without printing its launch capability. The local HTTP listener accepts only `127.0.0.1`; it chooses another available port if 1455 is occupied. Node honors standard environment proxy settings with its normal TLS validation.

In the local page:

1. Pair using this website's administrator username and password. They are sent only to the configured website login endpoint, used once to obtain a bridge credential, then discarded; the temporary administrator session is logged out.
2. Choose **Continue with ChatGPT**. This explicit click starts the official dynamic-client flow and redirects to `auth.openai.com`. The callback is exactly `http://127.0.0.1:<port>/auth/callback`.
3. If identity consent succeeds without direct plan permission, the identity remains saved but inference stays disabled. **Enable ChatGPT plan usage** explicitly requests consent again for that same registration.
4. Start serving requests. Existing explicitly paired/authorized sessions can reconnect on a later program start. No OAuth authorization starts automatically.

The implementation and fixture tests are prepared. A real user sign-in/consent and official inference smoke test must still be completed during the authorized handoff. No real OAuth authorization was started while building this program.

## Protocol and persistence

The pinned official model catalog comes from `GET https://api.openai.com/v1/models`, using only `models` whose `visibility` is `list`; catalog `slug` is the inference model. `planType` is `null`: this protocol does not establish a verified plan name or a remaining-quota percentage.

Each inference is `POST https://api.openai.com/v1/responses` with `store:false`, `stream:true`, and a complete input-history array. System roles become developer roles. Unsupported preview parameters are omitted. Flat function/custom tools are wrapped in a namespace; unsupported hosted Python, file-search, MCP and computer tools are rejected. Tools are defined/executed by the application, not falsely advertised as official hosted tools.

The bridge profile is posted to `/bridge/poll`; selected jobs are forwarded as raw official SSE. Relay events start at sequence **0**:

```json
{"seq":0,"data":{"type":"headers","status":200,"contentType":"text/event-stream"}}
{"seq":1,"data":{"type":"data","text":"<unmodified official SSE text>"}}
{"seq":2,"data":{"type":"end"}}
```

`POST /bridge/jobs/:id/events` carries an events array and `status:streaming|complete|failed`, plus actual error/usage/model when present. Only `response.completed` counts as complete. HTTP errors, midstream `response.failed`/`response.incomplete`, and EOF without completion remain failures.

Events are fsynced to the protected local JSONL journal before transmission. An acknowledgement is saved atomically; a lost acknowledgement replays the same sequence numbers. A restart during inference reports unknown completion and retransmits saved events. It **does not silently submit that inference again**. A boolean `resume:true` is transport reattachment, not permission to charge a second model request. A fresh continuation requires a new job with complete history (or a future explicit unique attempt ID).

Only an actual `subscription_sharing_usage_limit_exceeded` response creates a persisted usage pause. The profile remains authenticated and reports `quota.state:request-paused`; the website must return the actual limit error rather than silently switching to API billing. The local UI links to ChatGPT Settings → Usage and offers an explicit retry after review. Reset time and used percentage are not fabricated.

Rotating refreshes are serialized with an on-disk per-registration lock and atomic credential replacement. Sign-out attempts official token revocation, then clears local access/refresh/ID tokens while preserving the host and registration mapping. If remote revocation cannot be confirmed, the UI says so and links to Settings → Usage.

## Verification

```powershell
node --test .\local-bridge\test\*.test.mjs
```

Tests use local fixture JWT keys, fake OAuth/inference/relay transports and loopback HTTP only. They cover PKCE/state, ID/access token verification, scope restrictions, refresh serialization, sign-out, credential redaction, sequence replay, incomplete streams, quota pauses, and local cookie/CSRF checks. They never open an authorization browser or call a real account.

The program is online only while this computer and process remain running. A website relay job is not proof of a cloud worker or of continued execution after the local process stops.


## Relay v4: concurrent execution and stop

Use the updated relay with migration0002 applied before starting this bridge version. The local scheduler serves at most3 inference jobs simultaneously (configurable down to1), keeps their job IDs in the polling exclusion list, and renews a per-process lease. Each job has its own AbortController and heartbeat; stopping one job leaves other requests running. A silent stream is checked for cancellation every1.5 seconds plus network latency. A revoked pairing stops its active requests. Temporary network failure cannot guarantee immediate delivery of a stop, and previously consumed inference is subject to official accounting.

Website cancellation is distinct from a browser reader detach. DELETE marks a durable cancellation, and this host actually aborts its official HTTP request when the heartbeat or event acknowledgement reports that state. A cancelled acknowledgement never advances the local outbox cursor. Partial output stays in the protected journal, without a fabricated successful completion. Retrying an outbox does not repeat inference. A resumed claimed job with no protected journal fails explicitly instead of guessing whether it already ran.

The initial data chunk is relayed immediately; lost acknowledgements are retried during a later silent wait. Atomic file replacement tolerates bounded Windows sharing/antivirus contention while keeping the previous credential/checkpoint intact. No OAuth scope or authorization behavior changed.
