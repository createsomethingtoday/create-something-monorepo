-- Transcripts table for auto-generated video transcripts
-- Stores timestamped segments for synchronized playback
CREATE TABLE IF NOT EXISTS transcripts (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL UNIQUE,
  segments TEXT NOT NULL, -- JSON array of {start, end, text}
  language TEXT DEFAULT 'en',
  generated_at INTEGER NOT NULL,
  word_count INTEGER,
  duration_covered INTEGER, -- seconds of video covered by transcript
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);

-- Index for video lookup
CREATE INDEX IF NOT EXISTS idx_transcripts_video_id ON transcripts(video_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_language ON transcripts(language);
