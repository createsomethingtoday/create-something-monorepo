-- Meeting Transcription Schema
-- "Meetings entering the hermeneutic circle"

-- Core meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,

  -- Temporal
  recorded_at TEXT NOT NULL,           -- ISO timestamp of meeting
  duration_seconds INTEGER,            -- Meeting length
  processed_at TEXT,                   -- When transcription completed

  -- Content
  title TEXT,                          -- Auto-generated or user-provided
  transcript TEXT,                     -- Full transcription
  summary TEXT,                        -- AI-generated summary
  action_items TEXT,                   -- JSON array of action items
  topics TEXT,                         -- JSON array of discussed topics

  -- Participants (for future speaker diarization)
  participants TEXT,                   -- JSON array of participant names/identifiers

  -- Connections to CREATE SOMETHING
  project_id TEXT,                     -- Link to agency project (nullable)
  property TEXT,                       -- Which property: agency, io, space, ltd
  tags TEXT,                           -- JSON array of tags

  -- Storage
  audio_key TEXT,                      -- R2 object key for audio file
  audio_size_bytes INTEGER,            -- File size
  audio_format TEXT,                   -- mp3, wav, etc.

  -- Processing state
  status TEXT DEFAULT 'pending',       -- pending, processing, completed, failed
  error_message TEXT,                  -- If processing failed

  -- Metadata
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_meetings_recorded_at ON meetings(recorded_at);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_project_id ON meetings(project_id);
CREATE INDEX IF NOT EXISTS idx_meetings_property ON meetings(property);

-- Full-text search on transcripts and summaries
CREATE VIRTUAL TABLE IF NOT EXISTS meetings_fts USING fts5(
  id,
  title,
  transcript,
  summary,
  content='meetings',
  content_rowid='rowid'
);

-- Trigger to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS meetings_ai AFTER INSERT ON meetings BEGIN
  INSERT INTO meetings_fts(id, title, transcript, summary)
  VALUES (new.id, new.title, new.transcript, new.summary);
END;

CREATE TRIGGER IF NOT EXISTS meetings_au AFTER UPDATE ON meetings BEGIN
  DELETE FROM meetings_fts WHERE id = old.id;
  INSERT INTO meetings_fts(id, title, transcript, summary)
  VALUES (new.id, new.title, new.transcript, new.summary);
END;

CREATE TRIGGER IF NOT EXISTS meetings_ad AFTER DELETE ON meetings BEGIN
  DELETE FROM meetings_fts WHERE id = old.id;
END;
