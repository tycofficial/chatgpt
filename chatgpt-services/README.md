# ChatGPT site account service

Cloudflare Worker ESM with a Sites-provisioned D1 database. The public GitHub Pages frontend uses this service for its one administrator account and authorized local-host relay.

Edit `worker/service.mjs`; `node scripts/build.mjs` creates the standalone `dist/server/index.js`. Run `node --test tests/auth.test.mjs tests/relay.test.mjs` and `node scripts/validate-artifact.mjs`. Schema migrations live in `drizzle/`.

Runtime secret names: `ADMIN_PASSWORD_HASH`, `ADMIN_PASSWORD_SALT`; runtime setting `ADMIN_USERNAME`. Plaintext passwords and OpenAI OAuth credentials must never enter this repository. Username and password matching is case insensitive by explicit owner request. Administrator sessions are random opaque credentials, hashed in D1, expire after 30 days and can be revoked.

The local-host relay stores queued inference and ordered event checkpoints. Only an authenticated site administrator can create jobs; a separately paired local host can claim its own jobs and append idempotent events. The local process keeps OpenAI credentials on the owner computer. Unpaired/offline means the existing API remains the fallback. Official quota values remain unknown unless returned by the official service; the site Pro membership is not proof of an OpenAI subscription.
