-- Additive only: the Gmail/Calendar consent journal and its security triggers
-- are unchanged. Instagram remains unavailable until an existing approved
-- auth config and exact approved scopes are configured by the operator.
CREATE TABLE IF NOT EXISTS gigi_instagram_connections (
 subject TEXT NOT NULL, provider TEXT NOT NULL CHECK(provider = 'instagram'),
 request_id TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('dispatched','linked','active','attention')),
 connected_account_id TEXT, reconnectable INTEGER NOT NULL DEFAULT 0 CHECK(reconnectable IN (0,1)),
 redirect_url TEXT, expires_at TEXT, created_at TEXT NOT NULL, auth_config_id TEXT NOT NULL,
 PRIMARY KEY(subject,provider,request_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS gigi_instagram_connection_owner ON gigi_instagram_connections(connected_account_id) WHERE connected_account_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS gigi_instagram_connection_outstanding ON gigi_instagram_connections(subject,provider) WHERE status IN ('dispatched','linked','active');
CREATE INDEX IF NOT EXISTS gigi_instagram_connection_latest ON gigi_instagram_connections(subject,provider,created_at DESC);
-- Payload bodies/media are not retained remotely, only hash and provider receipt.
CREATE TABLE IF NOT EXISTS gigi_instagram_publishes (
 subject TEXT NOT NULL, request_id TEXT NOT NULL, payload_hash TEXT NOT NULL,
 connected_account_id TEXT NOT NULL, instagram_account_id TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('preparing','publishing','not_published','unknown','published_unverified','published')),
 container_id TEXT, staging_key TEXT, staging_expires_at INTEGER, media_id TEXT, permalink TEXT, reason TEXT, created_at TEXT NOT NULL,
 PRIMARY KEY(subject,request_id)
);

-- Only a definitely unpublished attempt may be explicitly copied and retried.
CREATE UNIQUE INDEX IF NOT EXISTS gigi_instagram_publication_fence ON gigi_instagram_publishes(subject,payload_hash) WHERE state != 'not_published';
