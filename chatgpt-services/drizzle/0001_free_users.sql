CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL, password_hash TEXT NOT NULL, password_salt TEXT NOT NULL, created_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE user_sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL);
