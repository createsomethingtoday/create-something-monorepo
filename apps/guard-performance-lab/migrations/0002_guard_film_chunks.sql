CREATE TABLE IF NOT EXISTS guard_film_chunks (
  analysis_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  frames_json TEXT NOT NULL,
  PRIMARY KEY (analysis_id, chunk_index)
);
