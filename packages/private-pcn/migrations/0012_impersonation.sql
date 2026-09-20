CREATE TABLE impersonation_sessions (
 id TEXT PRIMARY KEY,
 token_hash TEXT NOT NULL UNIQUE,
 actor_subject TEXT NOT NULL,
 actor_email TEXT NOT NULL,
 target_subject TEXT NOT NULL,
 target_email TEXT NOT NULL,
 reason TEXT NOT NULL,
 expires_at INTEGER NOT NULL,
 revoked_at INTEGER,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE impersonation_requests (
 id TEXT PRIMARY KEY,
 session_id TEXT NOT NULL REFERENCES impersonation_sessions(id),
 actor_subject TEXT NOT NULL,
 target_subject TEXT NOT NULL,
 method TEXT NOT NULL,
 path TEXT NOT NULL,
 status INTEGER,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX impersonation_actor ON impersonation_sessions(actor_subject, expires_at);
CREATE INDEX impersonation_request_session ON impersonation_requests(session_id, created_at);
