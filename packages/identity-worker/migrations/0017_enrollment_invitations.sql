-- Additive, disabled-by-default Identity signup admission; never application access.
CREATE TABLE enrollment_invitations (
 id TEXT PRIMARY KEY,
 email TEXT NOT NULL,
 scope TEXT NOT NULL CHECK(scope='identity:signup'),
 request_id TEXT NOT NULL,
 created_by TEXT NOT NULL,
 reason TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 revoked_at INTEGER,
 redeemed_at INTEGER,
 UNIQUE(created_by,request_id),
 CHECK(expires_at>created_at)
);
CREATE INDEX enrollment_invitation_email ON enrollment_invitations(email,expires_at);
CREATE TABLE enrollment_invitation_events (
 id TEXT PRIMARY KEY,
 invitation_id TEXT NOT NULL REFERENCES enrollment_invitations(id),
 action TEXT NOT NULL CHECK(action IN ('issued','revoked','redeemed')),
 actor TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
ALTER TABLE enrollment_challenges ADD COLUMN invitation_id TEXT REFERENCES enrollment_invitations(id);
