-- Restore five more indexes that production lost (see README, "Index drift").
--
-- Each one serves a query in the top 70 by database time on 2026-11-10:
--   - price and flags: the free filter becomes two index lookups, not a scan.
--   - creator_record_id: the creator record filter.
--   - memberships by child, and by group and child: subcategory pills and the
--     child-to-group lookup.
-- On a database built from the migrations all five already exist, and these statements do
-- nothing.
--
-- Not restored on purpose:
--   - idx_template_documents_type: with it, SQLite filters a type-filtered page through this
--     index and then sorts every match, in place of a sort-index walk that stops at LIMIT
--     (0.03 ms to 11 ms on a 12,000-row replica).
--   - idx_template_category_memberships_group: a prefix of the group and child index.
CREATE INDEX IF NOT EXISTS idx_template_documents_price ON template_documents (price);

CREATE INDEX IF NOT EXISTS idx_template_documents_flags ON template_documents (is_free, is_featured, is_landing_page);

CREATE INDEX IF NOT EXISTS idx_template_documents_creator_record_id ON template_documents (creator_record_id);

CREATE INDEX IF NOT EXISTS idx_template_category_memberships_child
  ON template_category_memberships (child_category_slug);

CREATE INDEX IF NOT EXISTS idx_template_category_memberships_group_child
  ON template_category_memberships (category_group_slug, child_category_slug);
