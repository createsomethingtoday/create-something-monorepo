CREATE TABLE field_notes (
 id TEXT PRIMARY KEY,
 network_id TEXT NOT NULL REFERENCES networks(id),
 title TEXT NOT NULL,context TEXT NOT NULL,implementation TEXT NOT NULL,evaluation TEXT NOT NULL,result TEXT NOT NULL,evidence_url TEXT NOT NULL,
 visibility TEXT NOT NULL DEFAULT 'members' CHECK(visibility IN ('members','public','archived')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX field_notes_network ON field_notes(network_id,visibility);
