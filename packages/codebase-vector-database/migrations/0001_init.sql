PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS code_bundles (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_uri TEXT,
  repository TEXT,
  ref TEXT,
  commit_sha TEXT,
  bundle_hash TEXT NOT NULL,
  file_count INTEGER NOT NULL,
  scanned_file_count INTEGER NOT NULL,
  chunk_count INTEGER NOT NULL,
  total_bytes INTEGER NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  indexed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_code_bundles_source ON code_bundles (source_type, repository);
CREATE INDEX IF NOT EXISTS idx_code_bundles_hash ON code_bundles (bundle_hash);
CREATE INDEX IF NOT EXISTS idx_code_bundles_indexed_at ON code_bundles (indexed_at DESC);

CREATE TABLE IF NOT EXISTS code_chunks (
  id TEXT PRIMARY KEY,
  bundle_id TEXT NOT NULL,
  vector_id TEXT NOT NULL UNIQUE,
  file_path TEXT NOT NULL,
  ext TEXT NOT NULL,
  language TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  start_line INTEGER NOT NULL,
  end_line INTEGER NOT NULL,
  size_bytes INTEGER NOT NULL,
  content_hash TEXT NOT NULL,
  content TEXT NOT NULL,
  tags_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  FOREIGN KEY (bundle_id) REFERENCES code_bundles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_code_chunks_bundle ON code_chunks (bundle_id, file_path, chunk_index);
CREATE INDEX IF NOT EXISTS idx_code_chunks_content_hash ON code_chunks (content_hash);
CREATE INDEX IF NOT EXISTS idx_code_chunks_language ON code_chunks (language);

CREATE TABLE IF NOT EXISTS ingest_runs (
  id TEXT PRIMARY KEY,
  bundle_id TEXT,
  status TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_uri TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  file_count INTEGER NOT NULL DEFAULT 0,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  indexed_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (bundle_id) REFERENCES code_bundles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ingest_runs_bundle ON ingest_runs (bundle_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ingest_runs_status ON ingest_runs (status, started_at DESC);

CREATE VIRTUAL TABLE IF NOT EXISTS code_chunks_fts USING fts5(
  chunk_id UNINDEXED,
  bundle_id UNINDEXED,
  file_path,
  language,
  content,
  tokenize = 'unicode61 remove_diacritics 2'
);

CREATE TRIGGER IF NOT EXISTS code_chunks_ai AFTER INSERT ON code_chunks BEGIN
  INSERT INTO code_chunks_fts (
    chunk_id,
    bundle_id,
    file_path,
    language,
    content
  ) VALUES (
    new.id,
    new.bundle_id,
    new.file_path,
    new.language,
    new.content
  );
END;

CREATE TRIGGER IF NOT EXISTS code_chunks_au AFTER UPDATE ON code_chunks BEGIN
  DELETE FROM code_chunks_fts WHERE chunk_id = old.id;
  INSERT INTO code_chunks_fts (
    chunk_id,
    bundle_id,
    file_path,
    language,
    content
  ) VALUES (
    new.id,
    new.bundle_id,
    new.file_path,
    new.language,
    new.content
  );
END;

CREATE TRIGGER IF NOT EXISTS code_chunks_ad AFTER DELETE ON code_chunks BEGIN
  DELETE FROM code_chunks_fts WHERE chunk_id = old.id;
END;
