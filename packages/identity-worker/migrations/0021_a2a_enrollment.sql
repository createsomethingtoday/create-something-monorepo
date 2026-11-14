-- Preserve pending GiGi/invitation proofs while adding scoped A2A provenance.
-- No inbound FKs reference enrollment_challenges; retain its invitation FK/index.
CREATE TABLE enrollment_challenges_a2a (
 token_hash TEXT PRIMARY KEY,
 email TEXT NOT NULL,
 purpose TEXT NOT NULL CHECK(purpose IN ('signup','recovery')),
 expires_at INTEGER NOT NULL,
 claimed_at INTEGER,
 created_at INTEGER NOT NULL,
 invitation_id TEXT REFERENCES enrollment_invitations(id),
 application TEXT CHECK(application IS NULL OR application IN ('gigi','a2a'))
);
INSERT INTO enrollment_challenges_a2a(token_hash,email,purpose,expires_at,claimed_at,created_at,invitation_id,application)
 SELECT token_hash,email,purpose,expires_at,claimed_at,created_at,invitation_id,application FROM enrollment_challenges;
DROP TABLE enrollment_challenges;
ALTER TABLE enrollment_challenges_a2a RENAME TO enrollment_challenges;
CREATE INDEX enrollment_expiry ON enrollment_challenges(expires_at);
