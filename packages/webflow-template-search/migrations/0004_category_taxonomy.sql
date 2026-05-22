CREATE TABLE IF NOT EXISTS category_groups (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  synced_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS category_group_children (
  category_group_slug TEXT NOT NULL,
  child_category_slug TEXT NOT NULL,
  child_category_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  synced_at TEXT NOT NULL,
  PRIMARY KEY (category_group_slug, child_category_slug),
  FOREIGN KEY (category_group_slug) REFERENCES category_groups(slug) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_category_group_children_child ON category_group_children (child_category_slug);
