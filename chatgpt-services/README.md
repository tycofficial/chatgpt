# ChatGPT site account service

Cloudflare Worker ESM with a Sites-provisioned D1 database. The public GitHub Pages frontend uses this service for its administrator and registered site accounts, plus an authorized local-host relay.

Run `node scripts/build.mjs` to package the worker entry point at `dist/server/index.js` with its imports. Run `node --test tests/*.test.mjs` and `node scripts/validate-artifact.mjs` to verify it. Schema migrations live in `drizzle/`.

Registered accounts start on Free. An authenticated `POST /auth/site-trial` accepts a `tier` of `plus`, `prolite`, `pro`, or `promax`. Each selection or renewal sets the account's current trial to 30 days from the server time. Login and session responses include `user.siteTrial` with its tier and expiration in epoch milliseconds while it is active. Migration `0004_site_trials` adds trial storage.

The authenticated `POST /inference/v1/responses` endpoint forwards stateless Responses requests up to 8 MiB to Docode. Administrator, Plus and Pro sessions can use the Worker model list. Free sessions can send the site's Standard Chat model, `gpt-6-sol`, at standard speed with a request ID. `FREE_DAILY_REQUESTS` and `FREE_GLOBAL_DAILY_REQUESTS` control the Free daily capacity, defaulting to 20 per account and 200 across the service. Configure `DOCODE_API_KEY` as a Sites runtime secret to enable model requests.

An active site Go subscription uses the Standard Chat model at standard speed and requires a request ID. `GO_DAILY_REQUESTS` can set its per-account daily request limit above the Free limit. It defaults to twice `FREE_DAILY_REQUESTS`. Go counts all of the account's journaled admissions since midnight UTC, including requests sent on a different plan that day. Go sends do not consume the site's Free global limit.

An optional `X-Chat-Request-Id` UUID persists a request's admission and buffered response before delivering its bytes. A matching second POST returns the existing receipt, including while work is running. Changing the request while reusing an ID returns 409. Read status and stream data through `GET /inference/v1/responses/:id?after=-1`, advancing `after` to the last chunk's sequence. Replay is available for 24 hours. `DELETE /inference/v1/responses/:id` requests cancellation. Work may continue briefly after disconnect, subject to the Workers execution lifetime. Lost executions are marked interrupted and the same ID will never dispatch to the provider again. `GET /inference/v1/usage` reports admitted site requests and the token counts reported by the provider, scoped to the signed-in account.

Runtime secret names: `ADMIN_PASSWORD_HASH`, `ADMIN_PASSWORD_SALT`; runtime setting `ADMIN_USERNAME`. Plaintext passwords and OpenAI OAuth credentials must never enter this repository. Username and password matching is case insensitive by explicit owner request. Administrator sessions are random opaque credentials, hashed in D1, expire after 30 days and can be revoked.

The local-host relay stores queued inference and ordered event checkpoints. Only an authenticated site administrator can create jobs; a separately paired local host can claim its own jobs and append idempotent events. The local process keeps OpenAI credentials on the owner computer. Unpaired/offline means the existing API remains the fallback. Official quota values remain unknown unless returned by the official service; the site Pro membership is not proof of an OpenAI subscription.


Relay protocol v4 adds migration0002_bridge_parallel_cancel (0000 and0001 remain unchanged). A paired host reports capabilities {protocolVersion:4,maxConcurrentJobs:1..3,cancelInference:true}, instanceId and activeJobIds. Claims use atomic compare-and-swap, a30-second renewed lease and a global maximum of3 occupied slots per bridge. Freshly claimed jobs cannot be dispatched a second time to another poll. Expired claims return resume:true; hosts must recover their own journal or fail explicitly without another model call.

POST /bridge/jobs/:id/heartbeat renews a current process claim and reports cancellation/terminal state. DELETE /jobs/:id installs a cancellation tombstone even before admission, closing the late-create race. It never rewrites completed/failed jobs. Revoking a bridge cancels its nonterminal jobs. The host must act on these states by aborting that job's official fetch; cancellation does not imply previously consumed tokens were free.

Events retain the original seq0 headers/data/end shape. Gaps and conflicting duplicates are rejected; terminal publication requires an end event. Structured failures remain available as errorDetails while error preserves a human-readable message. The browser never receives official OAuth tokens. Protocol/host capacity is a local execution capability, not proof of an official subscription, plan name or remaining quota.

Meaningful Node/SQLite tests include concurrent claims, lease recovery, cancellation before admission, token revocation, sequence idempotency, structured errors and compatibility with the earlier relay client. The local-bridge tests also exercise real per-job AbortSignals and three simultaneously pending fixture transports against this SQL-backed worker, without real OAuth or subscription inference.

Cloud computer execution is available to Pro site sessions when the Worker has a trusted Linux desktop provider. Apply migration `0006_dot_computer` and set `DOT_COMPUTER_PROVIDER_ORIGIN` plus the runtime secret `DOT_COMPUTER_PROVIDER_TOKEN`. The browser uses only its site session. Provider credentials stay in the Worker.

A desktop belongs to one account and one Dot conversation. The Worker admits one live desktop per account and keeps each Python task's outcome by request ID so a reconnect can read it without executing it again. The provider must run each desktop in an isolated Linux environment and return 1024×720 PNG frames.

## Site subscriptions

Apply migration `0007_site_billing`. The service can create authenticated Stripe Checkout and Customer Portal sessions for the site's own Go, Plus and Pro products. Configure the Stripe recurring Price IDs as a JSON map in `SITE_STRIPE_PRICES`, keyed by `go`, `plus`, `prolite`, `pro`, or `promax`. Store `SITE_STRIPE_SECRET_KEY` and `SITE_STRIPE_WEBHOOK_SECRET` as runtime secrets. Keep the keys and price mapping in the same Stripe mode.

Register a Stripe webhook at `/billing/v1/webhook` on the account Worker. Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`, `invoice.paid`, and `invoice.payment_failed`. Enable Customer Portal on the merchant account for the site's prices. The Worker verifies each notification and checks the matching customer's subscription and paid invoice before extending entitlement. A return from checkout triggers session refresh. Test-mode payments are stored separately from live entitlements.

The Cloudflare Pages Direct Upload worker under `ingress/public` forwards browser requests to the existing account and model Worker. It retains the original site's allowed origin and passes through its streaming records. The signed payment webhook uses the account Worker URL. Files uploaded as static GitHub Pages assets remain on GitHub Pages.

## Google AI Studio account gateway

The existing AI Studio Node server can use the same account authority as the GitHub Pages app. Keep `ingress/ai-studio.mjs` and `ingress/public/_worker.js` in their relative locations in a Node ESM package. Mount the gateway before the current JSON parser and account endpoints.

```js
import { createAiStudioAccountGateway } from './chatgpt-services/ingress/ai-studio.mjs';

app.use(createAiStudioAccountGateway());
```

The gateway forwards the site API to the fixed account Worker. It passes response streams through the Node server and closes the client stream when the downstream connection ends. The account Worker remains responsible for session revocation, granting trial or subscription entitlements, and journaled inference. The gateway's authentication depends on the site session. It needs no database password or model provider key in the AI Studio app.

In an AI Studio preview, check that the Node runtime can reach the Worker: `GET /health` should report `storage: "D1"`. Verify an existing account and a separate test account, then check logout and one model reply with the same account. The current published AI Studio app has a separate SQLite store. Identify which accounts belong to that store before switching the existing application's public routes.

The account Worker must include the corresponding schema and runtime features for billing and Dot routes. Publishing the existing AI Studio project and changing the Pages API origin are independent deployment steps.
