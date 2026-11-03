-- Private membership proof for the exact approved audience. Retain old receipts;
-- completion uses only the approved IDs and recipient hashes, never today's list.
-- Historical editions receive no inferred approval or membership backfill.
ALTER TABLE newsletter_editions ADD COLUMN audience_snapshot TEXT NOT NULL DEFAULT '[]';
