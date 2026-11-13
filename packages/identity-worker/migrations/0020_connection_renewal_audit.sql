-- Independent of expiring consumption/recovery rows. No credentials or claims.
CREATE TABLE connection_renewal_audit (
 grant_id TEXT PRIMARY KEY,
 owner_subject TEXT NOT NULL,
 client_id TEXT NOT NULL,
 resource TEXT NOT NULL,
 connection_id TEXT NOT NULL DEFAULT 'a2a-inbox',
 contract_revision TEXT NOT NULL DEFAULT '2026-11-13.1',
 commit_mode TEXT NOT NULL DEFAULT 'recovery_committed' CHECK(commit_mode IN ('recovery_committed','response_prepared')),
 replay_count INTEGER NOT NULL DEFAULT 0,
 last_recovered_at INTEGER,
 committed_at INTEGER NOT NULL
);
CREATE INDEX connection_renewal_owner ON connection_renewal_audit(owner_subject,client_id,resource,committed_at);
