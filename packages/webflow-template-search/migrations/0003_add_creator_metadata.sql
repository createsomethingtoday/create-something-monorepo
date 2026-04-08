ALTER TABLE template_documents ADD COLUMN creator_record_id TEXT;
ALTER TABLE template_documents ADD COLUMN creator_profile_url TEXT;
ALTER TABLE template_documents ADD COLUMN creator_avatar_url TEXT;
ALTER TABLE template_documents ADD COLUMN creator_avatar_alt TEXT;

CREATE INDEX IF NOT EXISTS idx_template_documents_creator_record_id ON template_documents (creator_record_id);
