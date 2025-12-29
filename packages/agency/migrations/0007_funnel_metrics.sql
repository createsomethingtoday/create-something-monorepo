-- Funnel Metrics Table
-- Tracks GTM funnel: Awareness → Consideration → Decision → Conversion
--
-- Run: wrangler d1 migrations apply agency-db

-- =============================================================================
-- FUNNEL METRICS (Daily Snapshots)
-- =============================================================================

CREATE TABLE IF NOT EXISTS funnel_metrics (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL, -- YYYY-MM-DD

  -- Awareness (LinkedIn top-of-funnel)
  linkedin_impressions INTEGER DEFAULT 0,
  linkedin_reach INTEGER DEFAULT 0,
  linkedin_followers INTEGER DEFAULT 0,
  linkedin_follower_delta INTEGER DEFAULT 0,

  -- Consideration (Engagement + Website)
  linkedin_engagements INTEGER DEFAULT 0, -- likes + comments + shares
  linkedin_profile_views INTEGER DEFAULT 0,
  website_visits INTEGER DEFAULT 0,
  website_unique_visitors INTEGER DEFAULT 0,
  content_downloads INTEGER DEFAULT 0,

  -- Decision (Active Interest)
  discovery_calls_scheduled INTEGER DEFAULT 0,
  discovery_calls_completed INTEGER DEFAULT 0,
  proposals_sent INTEGER DEFAULT 0,

  -- Conversion (Revenue)
  deals_closed INTEGER DEFAULT 0,
  revenue_closed REAL DEFAULT 0,

  -- Metadata
  notes TEXT, -- Optional notes for the day
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  UNIQUE(date)
);

CREATE INDEX IF NOT EXISTS idx_funnel_metrics_date ON funnel_metrics(date);

-- =============================================================================
-- LINKEDIN POSTS TRACKING
-- =============================================================================

CREATE TABLE IF NOT EXISTS linkedin_post_metrics (
  id TEXT PRIMARY KEY,
  post_id TEXT, -- LinkedIn's post ID if available
  social_post_id TEXT, -- Our social_posts.id if scheduled via our system
  date TEXT NOT NULL, -- When it was posted

  -- Content
  content_preview TEXT,
  thread_id TEXT,
  thread_index INTEGER,
  campaign TEXT,

  -- Metrics (updated over time)
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,

  -- Calculated
  engagement_rate REAL, -- (likes + comments + shares) / impressions

  -- Metadata
  last_updated TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_linkedin_posts_date ON linkedin_post_metrics(date);
CREATE INDEX IF NOT EXISTS idx_linkedin_posts_campaign ON linkedin_post_metrics(campaign);
CREATE INDEX IF NOT EXISTS idx_linkedin_posts_thread ON linkedin_post_metrics(thread_id);

-- =============================================================================
-- LEADS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,

  -- Contact
  name TEXT NOT NULL,
  email TEXT,
  company TEXT,
  role TEXT,
  linkedin_url TEXT,

  -- Source
  source TEXT CHECK (source IN ('linkedin', 'website', 'referral', 'cold', 'event', 'other')),
  source_detail TEXT, -- e.g., "Subtractive Triad thread", "Kickstand referral"
  campaign TEXT,

  -- Status
  stage TEXT DEFAULT 'awareness' CHECK (stage IN ('awareness', 'consideration', 'decision', 'won', 'lost')),

  -- Value
  estimated_value REAL,
  actual_value REAL,
  service_interest TEXT, -- e.g., "automation", "agentic-systems"

  -- Activity
  first_touch_at TEXT,
  last_touch_at TEXT,
  discovery_call_at TEXT,
  proposal_sent_at TEXT,
  closed_at TEXT,

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_campaign ON leads(campaign);
