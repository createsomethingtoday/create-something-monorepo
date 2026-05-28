CREATE TABLE IF NOT EXISTS taxonomy_metadata (
  taxonomy_type TEXT NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description_short TEXT NOT NULL DEFAULT '',
  description_landing_page TEXT NOT NULL DEFAULT '',
  related_keywords_json TEXT NOT NULL DEFAULT '[]',
  parent_category_group_slug TEXT,
  parent_category_group_name TEXT,
  synced_at TEXT NOT NULL,
  PRIMARY KEY (taxonomy_type, slug)
);

CREATE INDEX IF NOT EXISTS idx_taxonomy_metadata_parent
  ON taxonomy_metadata (taxonomy_type, parent_category_group_slug);
