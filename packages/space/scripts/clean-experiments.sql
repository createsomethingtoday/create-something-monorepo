-- Clean Up Experiments: Remove Duplicates & Low Quality
-- Run with: npx wrangler d1 execute create-something-db --remote --file=scripts/clean-experiments.sql

-- ============================================================================
-- HIDE DUPLICATE: marketplace-insights-dashboard-experiment
-- ============================================================================
-- This is a duplicate of "privacy-enhanced-analytics-marketplaces"
-- Both cover privacy-first analytics for creator marketplaces
-- Keep the more complete 20-min version, hide the 15-min experiment version

UPDATE papers
SET is_hidden = 1,
    featured = 0,
    archived = 0
WHERE slug = 'marketplace-insights-dashboard-experiment';

-- ============================================================================
-- HIDE LOW QUALITY: Short papers without excerpts
-- ============================================================================

UPDATE papers
SET is_hidden = 1,
    featured = 0
WHERE slug IN (
  'gmail-to-notion-sync',           -- 6 min, no excerpt
  'web-scraper-and-airtable-integration-with-next-js'  -- 2 min, no excerpt
);

-- ============================================================================
-- FEATURE THE QUALITY EXPERIMENTS
-- ============================================================================
-- Only 2 truly complete, high-quality experiments:

UPDATE papers
SET featured = 1,
    published = 1,
    is_hidden = 0,
    archived = 0
WHERE slug IN (
  'cloudflare-kv-quick-start',              -- Interactive, 25 min
  'zoom-transcript-automation-experiment'   -- Complete, 12 min
);

-- ============================================================================
-- KEEP PUBLISHED BUT NOT FEATURED
-- ============================================================================
-- These are good quality but not "featured" level

UPDATE papers
SET featured = 0,
    published = 1,
    is_hidden = 0,
    archived = 0
WHERE slug IN (
  'api-key-authentication-edge-functions',       -- 22 min, good content
  'privacy-enhanced-analytics-marketplaces'      -- 20 min, complete version
);

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

SELECT
  CASE
    WHEN featured = 1 THEN '⭐ FEATURED'
    WHEN is_hidden = 1 THEN '🔒 HIDDEN'
    WHEN published = 1 THEN '✅ PUBLISHED'
    ELSE '📝 DRAFT'
  END as status,
  slug,
  title,
  reading_time || ' min' as read_time,
  CASE WHEN excerpt_short IS NOT NULL THEN '✓' ELSE '✗' END as has_excerpt
FROM papers
WHERE published = 1
ORDER BY
  featured DESC,
  is_hidden ASC,
  reading_time DESC;
