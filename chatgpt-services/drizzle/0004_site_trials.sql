CREATE TABLE site_trials (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK(tier IN ('plus', 'prolite', 'pro', 'promax')),
  expires_at INTEGER NOT NULL CHECK(expires_at > 0)
);
