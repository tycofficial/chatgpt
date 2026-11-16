CREATE TABLE administrators (id INTEGER PRIMARY KEY CHECK(id=1), username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, password_salt TEXT NOT NULL, created_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, admin_id INTEGER NOT NULL REFERENCES administrators(id), expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE login_limits (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE bridges (id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, last_seen INTEGER NOT NULL, profile TEXT NOT NULL DEFAULT '{}', revoked INTEGER NOT NULL DEFAULT 0);
--> statement-breakpoint
CREATE TABLE jobs (id TEXT PRIMARY KEY, bridge_id TEXT NOT NULL REFERENCES bridges(id), payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, error TEXT);
--> statement-breakpoint
CREATE TABLE job_events (job_id TEXT NOT NULL REFERENCES jobs(id), seq INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY(job_id,seq));
--> statement-breakpoint
CREATE TABLE usage_events (id TEXT PRIMARY KEY, source TEXT NOT NULL, model TEXT, input_tokens INTEGER NOT NULL DEFAULT 0, output_tokens INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, error_code TEXT);
