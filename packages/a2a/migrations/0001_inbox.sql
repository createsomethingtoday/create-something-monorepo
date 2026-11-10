PRAGMA foreign_keys = ON;

CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  owner_subject TEXT NOT NULL,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  paused INTEGER NOT NULL DEFAULT 0 CHECK (paused IN (0, 1)),
  created_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE UNIQUE INDEX agents_one_active_owner ON agents(owner_subject) WHERE deleted_at IS NULL;

CREATE TABLE grants (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id),
  sender_agent_id TEXT NOT NULL REFERENCES agents(id),
  created_at INTEGER NOT NULL,
  revoked_at INTEGER,
  UNIQUE (agent_id, sender_agent_id),
  CHECK (agent_id <> sender_agent_id)
);

CREATE TABLE threads (
  id TEXT PRIMARY KEY,
  agent_a_id TEXT NOT NULL REFERENCES agents(id),
  agent_b_id TEXT NOT NULL REFERENCES agents(id),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  CHECK (agent_a_id <> agent_b_id)
);

CREATE TABLE messages (
  cursor INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  thread_id TEXT NOT NULL REFERENCES threads(id),
  sequence INTEGER NOT NULL CHECK (sequence BETWEEN 1 AND 8),
  from_agent_id TEXT NOT NULL REFERENCES agents(id),
  to_agent_id TEXT NOT NULL REFERENCES agents(id),
  text TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'claimed', 'completed', 'rejected', 'approval_required')),
  claimed_until INTEGER,
  claim_token TEXT,
  content_deleted_at INTEGER,
  UNIQUE (thread_id, sequence),
  CHECK (from_agent_id <> to_agent_id),
  CHECK ((state = 'claimed' AND claim_token IS NOT NULL AND claimed_until IS NOT NULL) OR (state <> 'claimed' AND claim_token IS NULL AND claimed_until IS NULL))
);
CREATE INDEX messages_inbox_cursor ON messages(to_agent_id, cursor);
CREATE INDEX messages_sender_created ON messages(from_agent_id, created_at);
CREATE INDEX messages_recipient_created ON messages(to_agent_id, created_at);
CREATE INDEX messages_retention ON messages(created_at) WHERE content_deleted_at IS NULL;

CREATE TABLE idempotency (
  owner_subject TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  body_hash TEXT NOT NULL,
  message_id TEXT NOT NULL REFERENCES messages(id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (owner_subject, idempotency_key)
);

CREATE TABLE outbox_events (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL UNIQUE REFERENCES messages(id),
  recipient_agent_id TEXT NOT NULL REFERENCES agents(id),
  created_at INTEGER NOT NULL,
  published_at INTEGER
);
CREATE INDEX outbox_unpublished ON outbox_events(created_at) WHERE published_at IS NULL;

-- Metadata only. Message text, callback URLs, credentials, and claim tokens never belong here.
CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,
  actor_subject TEXT NOT NULL,
  action TEXT NOT NULL,
  agent_id TEXT,
  message_id TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX audit_retention ON audit_events(created_at);
