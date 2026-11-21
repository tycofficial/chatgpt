CREATE TABLE IF NOT EXISTS inference_receipts (
  owner_id TEXT NOT NULL,
  id TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  model TEXT NOT NULL,
  free_request INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  finished_at INTEGER,
  http_status INTEGER,
  content_type TEXT,
  provider_request_id TEXT,
  received_model TEXT,
  service_tier TEXT,
  error_json TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  PRIMARY KEY (owner_id, id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS inference_receipts_usage ON inference_receipts (owner_id, started_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS inference_receipts_free_budget ON inference_receipts (free_request, started_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS inference_response_chunks (
  owner_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  data TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (owner_id, request_id, seq),
  FOREIGN KEY (owner_id, request_id) REFERENCES inference_receipts (owner_id, id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS inference_response_chunks_retention ON inference_response_chunks (created_at);
