-- Magic-link one-time tokens (SHA-256 hex of opaque token as primary key)
CREATE TABLE IF NOT EXISTS magic_tokens (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_magic_tokens_expires ON magic_tokens (expires_at);
