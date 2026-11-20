-- Restore two indexes that production lost.
--
-- On 2026-11-10 the production database had none of the 17 indexes that migrations 0001-0011
-- define. The ledger records those migrations as applied, so `migrations apply` will never
-- recreate them. These two serve the heaviest queries:
--   - creator_slug: with the profile URL index from 0019, a creator page reads only that
--     creator's rows. Without it, the OR in the creator filter still scans every row.
--   - creator_name: the creator-name branch of text search.
-- On a database built from the migrations both indexes already exist, and these statements
-- do nothing. The README lists the indexes that are still missing in production.
CREATE INDEX IF NOT EXISTS idx_template_documents_creator_slug ON template_documents (creator_slug);

CREATE INDEX IF NOT EXISTS idx_template_documents_creator_name_nocase
  ON template_documents (creator_name COLLATE NOCASE);
