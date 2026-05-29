ALTER TABLE code_bundles ADD COLUMN content_manifest_hash TEXT;

UPDATE code_bundles
SET content_manifest_hash = bundle_hash
WHERE content_manifest_hash IS NULL;

CREATE INDEX IF NOT EXISTS idx_code_bundles_content_manifest_hash ON code_bundles (content_manifest_hash);
