-- Preserve the original network while introducing explicit tenant ownership.
CREATE TABLE networks (
 id TEXT PRIMARY KEY,
 slug TEXT NOT NULL UNIQUE COLLATE NOCASE,
 owner_id TEXT,
 name TEXT NOT NULL,
 description TEXT NOT NULL DEFAULT '',
 format TEXT NOT NULL DEFAULT 'academy' CHECK(format IN ('academy','collective','research')),
 access_model TEXT NOT NULL DEFAULT 'members' CHECK(access_model IN ('members','preview')),
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','suspended')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO networks (id,slug,name,status) VALUES ('default','create-something','CREATE SOMETHING','active');
CREATE INDEX networks_owner ON networks(owner_id, created_at);
ALTER TABLE members RENAME TO legacy_members;
CREATE TABLE members (
 network_id TEXT NOT NULL REFERENCES networks(id),
 email TEXT NOT NULL COLLATE NOCASE,
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(network_id,email)
);
INSERT INTO members SELECT 'default',email,active,created_at,updated_at FROM legacy_members;
DROP TABLE legacy_members;
ALTER TABLE videos ADD COLUMN network_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE receipts ADD COLUMN network_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE playback_events ADD COLUMN network_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX videos_network ON videos(network_id,visibility,created_at);
CREATE INDEX receipts_network ON receipts(network_id,created_at);
CREATE INDEX playback_network ON playback_events(network_id,video_id);
