-- Insert Webflow Dashboard Refactor paper into D1 database
-- Run this against the io/space/agency D1 databases

INSERT INTO papers (
  id,
  title,
  slug,
  category,
  excerpt_short,
  excerpt_long,
  content,
  reading_time,
  difficulty_level,
  technical_focus,
  featured,
  published,
  is_hidden,
  archived,
  is_executable,
  published_at,
  created_at,
  updated_at
) VALUES (
  'webflow-dashboard-refactor',
  'Webflow Dashboard Refactor: From Next.js to SvelteKit',
  'webflow-dashboard-refactor',
  'case-study',
  '45 min read',
  'Complete refactoring from Next.js/Vercel to SvelteKit/Cloudflare, achieving 100% feature parity while migrating infrastructure. Demonstrates autonomous AI workflows completing 40-50% missing functionality in 83 minutes.',
  '',  -- Content loaded from markdown via paperContent.ts
  45,
  'advanced',
  'SvelteKit, Cloudflare, Autonomous Workflows, Infrastructure Migration, Feature Parity',
  0,  -- not featured initially
  1,  -- published
  0,  -- not hidden
  0,  -- not archived
  0,  -- not executable (research paper, not tutorial)
  datetime('now'),
  datetime('now'),
  datetime('now')
);

-- Verify insertion
SELECT id, title, category, reading_time, published
FROM papers
WHERE slug = 'webflow-dashboard-refactor';

