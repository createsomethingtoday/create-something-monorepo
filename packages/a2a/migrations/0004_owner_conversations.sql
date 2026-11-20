-- D1 applies each migration in a transaction. Stage referencing rows inside the
-- same database, empty child tables, replace their parent, then restore children
-- under normal FK enforcement. Defer-only parent replacement can leave SQLite's
-- deferred violation counter stale at COMMIT even when foreign_key_check is clear.
-- No credentials or message content are copied outside this atomic migration.
CREATE TABLE a2a_delivery_rows_v4 AS SELECT * FROM deliveries;
CREATE TABLE a2a_outbox_rows_v4 AS SELECT * FROM outbox_events;
CREATE TABLE a2a_idempotency_rows_v4 AS SELECT * FROM idempotency;
DELETE FROM deliveries;
DELETE FROM outbox_events;
DELETE FROM idempotency;
CREATE TABLE a2a_message_cursor_v4 (cursor INTEGER NOT NULL);
INSERT INTO a2a_message_cursor_v4 SELECT COALESCE((SELECT seq FROM sqlite_sequence WHERE name='messages'),0);
CREATE TABLE messages_v4 (
  cursor INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  thread_id TEXT NOT NULL REFERENCES threads(id),
  sequence INTEGER NOT NULL CHECK (sequence >= 1),
  from_agent_id TEXT NOT NULL REFERENCES agents(id),
  to_agent_id TEXT NOT NULL REFERENCES agents(id),
  text TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('posted','pending','claimed','completed','rejected','approval_required')),
  claimed_until INTEGER,
  claim_token TEXT,
  content_deleted_at INTEGER,
  author_kind TEXT NOT NULL DEFAULT 'legacy' CHECK (author_kind IN ('owner','agent','legacy')),
  author_name TEXT NOT NULL DEFAULT 'Legacy sender',
  kind TEXT NOT NULL DEFAULT 'request' CHECK (kind IN ('conversation','request')),
  from_agent_name TEXT NOT NULL DEFAULT '',
  to_agent_name TEXT NOT NULL DEFAULT '',
  UNIQUE (thread_id, sequence),
  CHECK (from_agent_id <> to_agent_id),
  CHECK ((kind='conversation' AND state='posted') OR (kind='request' AND state<>'posted')),
  CHECK ((state='claimed' AND claim_token IS NOT NULL AND claimed_until IS NOT NULL) OR (state<>'claimed' AND claim_token IS NULL AND claimed_until IS NULL))
);
INSERT INTO messages_v4(cursor,id,thread_id,sequence,from_agent_id,to_agent_id,text,created_at,expires_at,state,claimed_until,claim_token,content_deleted_at,from_agent_name,to_agent_name)
SELECT m.cursor,m.id,m.thread_id,m.sequence,m.from_agent_id,m.to_agent_id,m.text,m.created_at,m.expires_at,m.state,m.claimed_until,m.claim_token,m.content_deleted_at,f.name,t.name
FROM messages m JOIN agents f ON f.id=m.from_agent_id JOIN agents t ON t.id=m.to_agent_id;
DROP TABLE messages;
ALTER TABLE messages_v4 RENAME TO messages;
INSERT INTO sqlite_sequence(name,seq) SELECT 'messages',cursor FROM a2a_message_cursor_v4 WHERE NOT EXISTS(SELECT 1 FROM sqlite_sequence WHERE name='messages');
UPDATE sqlite_sequence SET seq=MAX(seq,(SELECT cursor FROM a2a_message_cursor_v4)) WHERE name='messages';
DROP TABLE a2a_message_cursor_v4;
CREATE INDEX messages_inbox_cursor ON messages(to_agent_id,cursor);
CREATE INDEX messages_sender_created ON messages(from_agent_id,created_at);
CREATE INDEX messages_recipient_created ON messages(to_agent_id,created_at);
CREATE INDEX messages_retention ON messages(created_at) WHERE content_deleted_at IS NULL;
CREATE INDEX messages_thread_kind ON messages(thread_id,kind,cursor);
INSERT INTO idempotency SELECT * FROM a2a_idempotency_rows_v4;
INSERT INTO outbox_events SELECT * FROM a2a_outbox_rows_v4;
INSERT INTO deliveries SELECT * FROM a2a_delivery_rows_v4;
DROP TABLE a2a_idempotency_rows_v4;
DROP TABLE a2a_outbox_rows_v4;
DROP TABLE a2a_delivery_rows_v4;
