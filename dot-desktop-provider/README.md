# Private Dot Linux desktop provider

This is the single-tenant, loopback Node provider consumed by the site's authenticated Dot Worker. The Worker validates account ownership and keeps durable task receipts. The provider retains admission records for its own lifetime and owns the Xvfb processes, TTLs, and sandbox boundaries.

Run with Node.js 24 or newer on Linux. Install distro Python 3 (including ctypes and resource), Xvfb, libX11, libXtst, and Bubblewrap with user, PID and network namespaces, `--disable-userns`, and sized tmpfs support. Set a private `DOT_DESKTOP_TOKEN` of 32–256 non-whitespace characters. Then run `node dot-desktop-provider/index.mjs` in the provider host. Optional `DOT_DESKTOP_PORT` defaults to 8090. The server listens on 127.0.0.1.

All requests use Authorization Bearer. JSON requests use application/json.

| Route | Request and response |
| --- | --- |
| GET /healthz | Reports readiness after a real Bubblewrap preflight. |
| POST /v1/desktops | UUID and ttlSeconds. Returns the admitted desktop ID. |
| GET /v1/desktops/:id/frame | Live 1024 × 720 PNG. |
| POST /v1/desktops/:id/input | Bounded move, button, wheel, key or UTF-8 clipboard control. Returns 204. |
| POST /v1/desktops/:id/task | Python code and requestId UUID. Returns exitCode, stdout, and stderr. |
| DELETE /v1/desktops/:id | Stops the desktop and any active task. Returns 204. |

Two desktops may be open at a time. Each has a private X authority, a fixed-size virtual screen, and at most one admitted task at a time. A repeated ID returns the original operation and a changed payload with that ID returns 409. Timeout, stop, and normal completion are distinct responses. Host processes and tokens do not cross the sandbox boundary. Tasks see read-only system runtime and workspace, a 16 MiB temporary filesystem, and their own virtual X socket. The provider refuses to start desktops if strict isolation fails. A new provider process has a new in-memory admission ledger, so the Worker is the authority for replay across provider restarts.

Run the independent checks with `node --test dot-desktop-provider/*.test.mjs`. Set `QA_REQUIRE_DOT_SANDBOX=1` on a Linux host that supports the required namespaces to require the real sandbox acceptance test.
