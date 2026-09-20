-- Mailbox proof precedes account creation or password recovery.
CREATE TABLE enrollment_challenges (
 token_hash TEXT PRIMARY KEY,
 email TEXT NOT NULL,
 purpose TEXT NOT NULL CHECK(purpose IN ('signup','recovery')),
 expires_at INTEGER NOT NULL,
 claimed_at INTEGER,
 created_at INTEGER NOT NULL
);
CREATE INDEX enrollment_expiry ON enrollment_challenges(expires_at);
CREATE TABLE enrollment_limits (
 key_hash TEXT PRIMARY KEY,
 window_start INTEGER NOT NULL,
 attempts INTEGER NOT NULL
);
