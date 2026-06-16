CREATE TABLE IF NOT EXISTS template_category_memberships (
  template_document_id TEXT NOT NULL,
  category_group_name TEXT NOT NULL,
  category_group_slug TEXT NOT NULL,
  child_category_name TEXT NOT NULL,
  child_category_slug TEXT NOT NULL,
  PRIMARY KEY (template_document_id, category_group_slug, child_category_slug),
  FOREIGN KEY (template_document_id) REFERENCES template_documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_template_category_memberships_group
  ON template_category_memberships (category_group_slug);

CREATE INDEX IF NOT EXISTS idx_template_category_memberships_child
  ON template_category_memberships (child_category_slug);

CREATE INDEX IF NOT EXISTS idx_template_category_memberships_group_child
  ON template_category_memberships (category_group_slug, child_category_slug);
