CREATE TABLE IF NOT EXISTS child_category_taxonomy (
  child_category_slug TEXT NOT NULL,
  child_category_name TEXT NOT NULL,
  category_group_slug TEXT NOT NULL,
  category_group_name TEXT NOT NULL,
  PRIMARY KEY (child_category_slug, category_group_slug)
);

CREATE INDEX IF NOT EXISTS idx_child_category_taxonomy_group
  ON child_category_taxonomy (category_group_slug, child_category_slug);
