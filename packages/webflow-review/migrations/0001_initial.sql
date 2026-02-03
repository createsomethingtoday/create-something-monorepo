-- Webflow Review Platform - Initial Schema

-- Review sessions
CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  report_url TEXT,
  webhook_url TEXT,
  error TEXT,
  metadata TEXT -- JSON for extensibility
);

-- Individual findings
CREATE TABLE findings (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL,
  check_type TEXT NOT NULL CHECK (check_type IN ('seo', 'links', 'a11y', 'performance')),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  page_url TEXT,
  element_selector TEXT,
  message TEXT NOT NULL,
  evidence TEXT, -- JSON with details
  auto_fixable BOOLEAN DEFAULT FALSE,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE
);

-- Pages reviewed (for project reviews)
CREATE TABLE review_pages (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL,
  page_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  score INTEGER CHECK (score >= 0 AND score <= 100),
  findings_count INTEGER DEFAULT 0,
  screenshot_url TEXT,
  error TEXT,
  started_at INTEGER,
  completed_at INTEGER,
  FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE
);

-- API usage tracking
CREATE TABLE api_usage (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  duration_ms INTEGER,
  status_code INTEGER,
  error TEXT
);

-- Create indexes for performance
CREATE INDEX idx_reviews_project ON reviews(project_id);
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_reviews_created ON reviews(created_at DESC);

CREATE INDEX idx_findings_review ON findings(review_id);
CREATE INDEX idx_findings_severity ON findings(severity);
CREATE INDEX idx_findings_check_type ON findings(check_type);

CREATE INDEX idx_review_pages_review ON review_pages(review_id);
CREATE INDEX idx_review_pages_status ON review_pages(status);

CREATE INDEX idx_api_usage_project ON api_usage(project_id);
CREATE INDEX idx_api_usage_created ON api_usage(created_at DESC);
