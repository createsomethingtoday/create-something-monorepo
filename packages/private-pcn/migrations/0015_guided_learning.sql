-- Creator-authored order is a bounded document; current video permissions remain authoritative.
CREATE TABLE learning_paths (
 id TEXT PRIMARY KEY,
 network_id TEXT NOT NULL REFERENCES networks(id),
 title TEXT NOT NULL,
 outcome TEXT NOT NULL,
 prerequisites TEXT NOT NULL DEFAULT '',
 estimated_minutes INTEGER NOT NULL,
 lesson_ids TEXT NOT NULL,
 visibility TEXT NOT NULL CHECK(visibility IN ('draft','published','archived')),
 revision INTEGER NOT NULL DEFAULT 1,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX learning_paths_network ON learning_paths(network_id,updated_at);
CREATE TABLE lesson_progress (
 network_id TEXT NOT NULL REFERENCES networks(id),
 subject TEXT NOT NULL,
 video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
 position REAL NOT NULL DEFAULT 0,
 watched_at TEXT,
 practice_started_at TEXT,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(network_id,subject,video_id)
);
CREATE INDEX lesson_progress_recent ON lesson_progress(network_id,subject,updated_at);
