CREATE TABLE remote_sessions (
 id TEXT PRIMARY KEY,
 network_id TEXT NOT NULL REFERENCES networks(id),
 buyer_id TEXT NOT NULL,
 creator_id TEXT NOT NULL,
 method TEXT NOT NULL CHECK(method IN ('rustdesk','zoom')),
 scope TEXT NOT NULL,
 budget_cents INTEGER NOT NULL CHECK(budget_cents BETWEEN 0 AND 100000),
 consent_version TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','accepted','ended','declined')),
 meeting_url TEXT NOT NULL DEFAULT '',
 outcome TEXT NOT NULL DEFAULT '',
 updated_by TEXT NOT NULL,
 created_at INTEGER NOT NULL DEFAULT (unixepoch()),
 expires_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX remote_sessions_buyer ON remote_sessions(buyer_id,created_at);
CREATE INDEX remote_sessions_creator ON remote_sessions(creator_id,created_at);
CREATE UNIQUE INDEX remote_sessions_open ON remote_sessions(network_id,buyer_id) WHERE status IN ('requested','accepted');
CREATE TABLE remote_session_events (
 id INTEGER PRIMARY KEY,
 session_id TEXT NOT NULL REFERENCES remote_sessions(id),
 actor_id TEXT NOT NULL,
 status TEXT NOT NULL,
 created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TRIGGER remote_session_created AFTER INSERT ON remote_sessions BEGIN
 INSERT INTO remote_session_events(session_id,actor_id,status) VALUES(NEW.id,NEW.updated_by,NEW.status);
END;
CREATE TRIGGER remote_session_changed AFTER UPDATE OF status ON remote_sessions WHEN NEW.status<>OLD.status BEGIN
 INSERT INTO remote_session_events(session_id,actor_id,status) VALUES(NEW.id,NEW.updated_by,NEW.status);
END;
