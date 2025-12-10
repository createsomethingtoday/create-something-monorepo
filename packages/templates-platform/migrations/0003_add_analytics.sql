-- Migration: Add analytics events table
-- Tracks template deploys, workflow activations, and user engagement

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,  -- 'deploy', 'workflow_activation', 'page_view', 'upgrade_click', 'agency_contact'
  tenant_id TEXT,            -- NULL for anonymous events
  template_id TEXT,
  user_id TEXT,

  -- Event-specific data
  metadata TEXT,             -- JSON blob for event-specific data

  -- Context
  source TEXT,               -- 'landing', 'dashboard', 'deploy_wizard', 'template_page'
  referrer TEXT,
  user_agent TEXT,
  ip_country TEXT,

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for common queries
CREATE INDEX idx_events_type ON analytics_events(event_type);
CREATE INDEX idx_events_tenant ON analytics_events(tenant_id);
CREATE INDEX idx_events_template ON analytics_events(template_id);
CREATE INDEX idx_events_created ON analytics_events(created_at);

-- Aggregated daily stats for fast dashboard queries
CREATE TABLE IF NOT EXISTS analytics_daily (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,        -- YYYY-MM-DD

  -- Template metrics
  template_id TEXT,
  deploys INTEGER DEFAULT 0,
  page_views INTEGER DEFAULT 0,

  -- Funnel metrics
  landing_views INTEGER DEFAULT 0,
  template_views INTEGER DEFAULT 0,
  deploy_starts INTEGER DEFAULT 0,
  deploy_completions INTEGER DEFAULT 0,

  -- Conversion metrics
  agency_clicks INTEGER DEFAULT 0,
  upgrade_clicks INTEGER DEFAULT 0,

  -- Workflow metrics
  workflow_activations INTEGER DEFAULT 0,

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  UNIQUE(date, template_id)
);

CREATE INDEX idx_daily_date ON analytics_daily(date);
CREATE INDEX idx_daily_template ON analytics_daily(template_id);

-- Feedback submissions for SDK features
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  tenant_id TEXT,

  -- Feedback content
  type TEXT NOT NULL,        -- 'feature_request', 'bug_report', 'sdk_feedback', 'general'
  title TEXT,
  description TEXT NOT NULL,

  -- Context
  source TEXT,               -- Where the feedback was submitted from
  metadata TEXT,             -- JSON blob for additional context

  -- Status tracking
  status TEXT DEFAULT 'new', -- 'new', 'reviewed', 'planned', 'implemented', 'wont_fix'

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_feedback_type ON feedback(type);
CREATE INDEX idx_feedback_status ON feedback(status);
