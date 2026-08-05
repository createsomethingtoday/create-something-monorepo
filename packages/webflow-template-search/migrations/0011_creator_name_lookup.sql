CREATE INDEX IF NOT EXISTS idx_template_documents_creator_name_nocase
  ON template_documents (creator_name COLLATE NOCASE);
