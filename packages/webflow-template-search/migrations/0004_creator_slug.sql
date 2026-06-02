ALTER TABLE template_documents ADD COLUMN creator_slug TEXT;

CREATE INDEX IF NOT EXISTS idx_template_documents_creator_slug ON template_documents (creator_slug);
CREATE INDEX IF NOT EXISTS idx_template_documents_creator_record_id ON template_documents (creator_record_id);
