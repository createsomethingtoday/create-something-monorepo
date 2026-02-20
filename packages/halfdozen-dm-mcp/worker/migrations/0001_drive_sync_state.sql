-- Drive sync checkpoint + deterministic upsert index for DM MCP

CREATE TABLE IF NOT EXISTS sync_checkpoints (
  entity_id TEXT PRIMARY KEY,
  last_synced_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS file_sync_index (
  entity_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  notion_page_id TEXT NOT NULL,
  last_seen_modified_time TEXT,
  last_sync_status TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (entity_id, file_id)
);

CREATE INDEX IF NOT EXISTS idx_file_sync_index_notion_page_id
  ON file_sync_index (notion_page_id);
