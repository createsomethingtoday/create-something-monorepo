-- Isolated network: never apply to an existing Outerfields database.
CREATE TABLE members (
 email TEXT PRIMARY KEY COLLATE NOCASE,
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE videos (
 id TEXT PRIMARY KEY,
 stream_uid TEXT NOT NULL UNIQUE,
 title TEXT NOT NULL,
 description TEXT NOT NULL DEFAULT '',
 series TEXT NOT NULL DEFAULT 'Field notes',
 visibility TEXT NOT NULL DEFAULT 'draft' CHECK(visibility IN ('draft','published','archived')),
 access TEXT NOT NULL DEFAULT 'members' CHECK(access IN ('public','members')),
 ingest_status TEXT NOT NULL DEFAULT 'pending_upload' CHECK(ingest_status IN ('pending_upload','processing','ready','failed')),
 duration REAL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE receipts (
 id TEXT PRIMARY KEY,
 actor TEXT NOT NULL,
 action TEXT NOT NULL,
 target TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE playback_events (
 id TEXT PRIMARY KEY,
 video_id TEXT NOT NULL REFERENCES videos(id),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX videos_catalog ON videos(visibility, ingest_status, created_at);
CREATE INDEX playback_video ON playback_events(video_id, created_at);
