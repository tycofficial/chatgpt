CREATE TABLE chat_sync_owners (
  owner_key TEXT PRIMARY KEY,
  sequence INTEGER NOT NULL DEFAULT 0 CHECK(sequence >= 0)
);
--> statement-breakpoint
CREATE TABLE chat_sync_conversations (
  owner_key TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK(revision > 0),
  document_json TEXT,
  document_hash TEXT,
  deleted INTEGER NOT NULL CHECK(deleted IN (0,1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_mutation_id TEXT NOT NULL,
  sequence INTEGER NOT NULL DEFAULT 0 CHECK(sequence >= 0),
  PRIMARY KEY(owner_key, conversation_id),
  CHECK((deleted = 1 AND document_json IS NULL AND document_hash IS NULL) OR
        (deleted = 0 AND document_json IS NOT NULL AND document_hash IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE chat_sync_changes (
  owner_key TEXT NOT NULL,
  sequence INTEGER NOT NULL CHECK(sequence > 0),
  conversation_id TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK(revision > 0),
  deleted INTEGER NOT NULL CHECK(deleted IN (0,1)),
  updated_at INTEGER NOT NULL,
  mutation_id TEXT NOT NULL,
  PRIMARY KEY(owner_key, sequence),
  UNIQUE(owner_key, conversation_id, revision),
  UNIQUE(owner_key, mutation_id)
);
--> statement-breakpoint
CREATE TABLE chat_sync_mutations (
  owner_key TEXT NOT NULL,
  mutation_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK(revision > 0),
  deleted INTEGER NOT NULL CHECK(deleted IN (0,1)),
  sequence INTEGER NOT NULL CHECK(sequence > 0),
  document_hash TEXT,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(owner_key, mutation_id)
);
