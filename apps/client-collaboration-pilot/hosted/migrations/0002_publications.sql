CREATE TABLE IF NOT EXISTS collaboration_publications (
 project TEXT PRIMARY KEY REFERENCES collaboration_projects(id),
 revision INTEGER NOT NULL DEFAULT 0,
 record TEXT CHECK(record IS NULL OR json_valid(record))
);
INSERT OR IGNORE INTO collaboration_publications(project) VALUES ('maverickx');
CREATE TABLE IF NOT EXISTS collaboration_execution (
 project TEXT NOT NULL REFERENCES collaboration_projects(id),
 job_id TEXT NOT NULL,
 fingerprint TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('prepared','published','conflict')),
 record TEXT NOT NULL CHECK(json_valid(record)),
 PRIMARY KEY(project,job_id)
);
