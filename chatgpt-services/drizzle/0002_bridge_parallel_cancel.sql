ALTER TABLE jobs ADD COLUMN claim_owner TEXT;
--> statement-breakpoint
ALTER TABLE jobs ADD COLUMN claim_expires_at INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE jobs ADD COLUMN claim_count INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
UPDATE jobs SET claim_count=1 WHERE status!='queued';
--> statement-breakpoint
CREATE TABLE job_cancellations (job_id TEXT PRIMARY KEY, created_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE INDEX jobs_bridge_claims ON jobs(bridge_id,status,claim_expires_at,created_at);
