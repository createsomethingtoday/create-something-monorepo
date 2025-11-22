-- Recategorize Experiments Based on Quality/Completeness
-- Run with: wrangler d1 execute create-something-db --remote --file=scripts/recategorize-experiments.sql

-- ============================================================================
-- TIER 3: Hide Incomplete/Stub Papers
-- ============================================================================
-- These have very short content (80-707 chars) and 1-4 min reading time
-- They should be hidden from public view until completed

UPDATE papers
SET is_hidden = 1,
    archived = 0,
    featured = 0
WHERE slug IN (
  'symbotic',
  'event-automation',
  'timesheets-to-quickbooks',
  'the-dual-benefits-of-advanced-automation-systems'
);

-- ============================================================================
-- TIER 2: Unfeature Good-But-Not-Complete Papers
-- ============================================================================
-- These are published and good quality, but not full "experiments"
-- Remove featured status to keep focus on top 3

UPDATE papers
SET featured = 0
WHERE slug IN (
  'privacy-enhanced-analytics-marketplaces',
  'api-key-authentication-edge-functions'
);

-- ============================================================================
-- TIER 1: Ensure Top Experiments Are Featured
-- ============================================================================
-- These are the complete, high-quality experiments that should be showcased

UPDATE papers
SET featured = 1,
    published = 1,
    is_hidden = 0,
    archived = 0
WHERE slug IN (
  'zoom-transcript-automation-experiment',
  'marketplace-insights-dashboard-experiment',
  'cloudflare-kv-quick-start'
);

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this after to verify the changes

SELECT
  slug,
  title,
  category,
  featured,
  published,
  is_hidden,
  archived,
  reading_time,
  is_executable,
  CASE
    WHEN is_hidden = 1 THEN '🔒 HIDDEN'
    WHEN featured = 1 THEN '⭐ FEATURED'
    WHEN published = 1 THEN '✅ PUBLISHED'
    ELSE '📝 DRAFT'
  END as status
FROM papers
ORDER BY
  CASE WHEN featured = 1 THEN 0 ELSE 1 END,
  CASE WHEN is_hidden = 1 THEN 1 ELSE 0 END,
  reading_time DESC;
