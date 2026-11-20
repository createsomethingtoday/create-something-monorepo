-- Immutable text context. Message transport, credentials and existing rows are untouched.
CREATE TABLE context_resources (
  cursor INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  thread_id TEXT NOT NULL REFERENCES threads(id),
  owner_subject TEXT NOT NULL,
  owner_label TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  mime_type TEXT NOT NULL CHECK(mime_type IN ('text/plain','text/markdown')),
  byte_length INTEGER NOT NULL CHECK(byte_length BETWEEN 1 AND 1048576),
  sha256 TEXT NOT NULL,
  chunk_count INTEGER NOT NULL CHECK(chunk_count BETWEEN 1 AND 65),
  idempotency_key TEXT NOT NULL,
  body_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  content_deleted_at INTEGER,
  UNIQUE(owner_subject,idempotency_key)
);
CREATE TABLE context_chunks (
  resource_id TEXT NOT NULL REFERENCES context_resources(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL CHECK(chunk_index >= 0),
  content TEXT NOT NULL,
  byte_length INTEGER NOT NULL CHECK(byte_length BETWEEN 1 AND 16384),
  PRIMARY KEY(resource_id,chunk_index)
);
CREATE INDEX context_thread_cursor ON context_resources(thread_id,cursor);
CREATE INDEX context_owner_created ON context_resources(owner_subject,created_at);
CREATE INDEX context_retention ON context_resources(created_at);
