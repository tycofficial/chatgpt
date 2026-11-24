CREATE TABLE IF NOT EXISTS dot_computers (
  owner_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  provider_id TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS dot_computers_owner_thread ON dot_computers (owner_id, thread_id, created_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS dot_computer_tasks (
  environment_id TEXT NOT NULL,
  id TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  result TEXT,
  PRIMARY KEY (environment_id, id),
  FOREIGN KEY (environment_id) REFERENCES dot_computers (id) ON DELETE CASCADE
);
