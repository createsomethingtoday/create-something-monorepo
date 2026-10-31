-- 1 when the sync confirmed a live Templates CMS item for the row, 0 when it
-- indexed the row without one (lookup failed, no CMS token, or the listing gate
-- guard kept the batch). NULL for rows indexed before this column existed.
-- The recent-published sweep re-checks any recent row that is not 1, so a
-- fail-open listing gate is retried instead of leaving a blank card that 404s.
ALTER TABLE template_documents ADD COLUMN listing_confirmed INTEGER;
