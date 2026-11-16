# ChatGPT site account service

Cloudflare Worker ESM with a Sites-provisioned D1 database. The public GitHub Pages frontend uses this service for its administrator and registered Free accounts, plus an authorized local-host relay.

Edit `worker/service.mjs`; `node scripts/build.mjs` creates the standalone `dist/server/index.js`. Run `node --test tests/*.test.mjs` and `node scripts/validate-artifact.mjs`. Schema migrations live in `drizzle/`.

Runtime secret names: `ADMIN_PASSWORD_HASH`, `ADMIN_PASSWORD_SALT`; runtime setting `ADMIN_USERNAME`. Plaintext passwords and OpenAI OAuth credentials must never enter this repository. Username and password matching is case insensitive by explicit owner request. Administrator sessions are random opaque credentials, hashed in D1, expire after 30 days and can be revoked.

The local-host relay stores queued inference and ordered event checkpoints. Only an authenticated site administrator can create jobs; a separately paired local host can claim its own jobs and append idempotent events. The local process keeps OpenAI credentials on the owner computer. Unpaired/offline means the existing API remains the fallback. Official quota values remain unknown unless returned by the official service; the site Pro membership is not proof of an OpenAI subscription.


Relay protocol v4 adds migration0002_bridge_parallel_cancel (0000 and0001 remain unchanged). A paired host reports capabilities {protocolVersion:4,maxConcurrentJobs:1..3,cancelInference:true}, instanceId and activeJobIds. Claims use atomic compare-and-swap, a30-second renewed lease and a global maximum of3 occupied slots per bridge. Freshly claimed jobs cannot be dispatched a second time to another poll. Expired claims return resume:true; hosts must recover their own journal or fail explicitly without another model call.

POST /bridge/jobs/:id/heartbeat renews a current process claim and reports cancellation/terminal state. DELETE /jobs/:id installs a cancellation tombstone even before admission, closing the late-create race. It never rewrites completed/failed jobs. Revoking a bridge cancels its nonterminal jobs. The host must act on these states by aborting that job's official fetch; cancellation does not imply previously consumed tokens were free.

Events retain the original seq0 headers/data/end shape. Gaps and conflicting duplicates are rejected; terminal publication requires an end event. Structured failures remain available as errorDetails while error preserves a human-readable message. The browser never receives official OAuth tokens. Protocol/host capacity is a local execution capability, not proof of an official subscription, plan name or remaining quota.

Meaningful Node/SQLite tests include concurrent claims, lease recovery, cancellation before admission, token revocation, sequence idempotency, structured errors and compatibility with the earlier relay client. The local-bridge tests also exercise real per-job AbortSignals and three simultaneously pending fixture transports against this SQL-backed worker, without real OAuth or subscription inference.
