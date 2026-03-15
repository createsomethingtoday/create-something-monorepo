-- User Events table for tracking user behavior patterns
-- Captures errors, bottlenecks, and interaction patterns for AI analysis
CREATE TABLE IF NOT EXISTS user_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id TEXT,
  session_id TEXT NOT NULL,
  
  -- Context
  page TEXT NOT NULL,
  component TEXT,
  action TEXT,
  
  -- Event data (JSON)
  metadata TEXT,  -- JSON object with event-specific data
  
  -- Error tracking
  error_message TEXT,
  error_stack TEXT,
  error_component_stack TEXT,
  
  -- Performance tracking
  duration_ms INTEGER,
  performance_metric TEXT,
  
  -- Timestamps
  created_at INTEGER NOT NULL,
  
  -- Foreign keys (optional - user might not be logged in)
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_events_type ON user_events(event_type);
CREATE INDEX IF NOT EXISTS idx_user_events_session ON user_events(session_id);
CREATE INDEX IF NOT EXISTS idx_user_events_user ON user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_page ON user_events(page);
CREATE INDEX IF NOT EXISTS idx_user_events_created ON user_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_type_created ON user_events(event_type, created_at DESC);

-- Bottlenecks table for aggregated flow analysis
-- Tracks where users drop off or experience friction
CREATE TABLE IF NOT EXISTS bottlenecks (
  id TEXT PRIMARY KEY,
  flow_name TEXT NOT NULL,        -- e.g., 'signup', 'checkout', 'video_consumption'
  step_name TEXT NOT NULL,        -- e.g., 'email_entry', 'payment_method', 'gate_shown'
  step_order INTEGER NOT NULL,    -- Order in the flow (1, 2, 3...)
  
  -- Metrics (updated periodically by analysis worker)
  total_entries INTEGER DEFAULT 0,
  total_exits INTEGER DEFAULT 0,
  drop_off_rate REAL DEFAULT 0,   -- exits / entries
  avg_duration_ms INTEGER,
  p90_duration_ms INTEGER,
  
  -- Time window for these metrics
  window_start INTEGER NOT NULL,
  window_end INTEGER NOT NULL,
  
  -- Timestamps
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  
  UNIQUE(flow_name, step_name, window_start)
);

CREATE INDEX IF NOT EXISTS idx_bottlenecks_flow ON bottlenecks(flow_name);
CREATE INDEX IF NOT EXISTS idx_bottlenecks_drop_off ON bottlenecks(drop_off_rate DESC);
CREATE INDEX IF NOT EXISTS idx_bottlenecks_window ON bottlenecks(window_start, window_end);

-- Patterns table for detected behavior patterns
-- Stores patterns identified by AI analysis
CREATE TABLE IF NOT EXISTS patterns (
  id TEXT PRIMARY KEY,
  pattern_type TEXT NOT NULL,     -- 'error', 'bottleneck', 'engagement', 'conversion'
  pattern_name TEXT NOT NULL,     -- Human-readable pattern name
  description TEXT NOT NULL,      -- Detailed description
  
  -- Pattern details
  frequency INTEGER DEFAULT 0,    -- How often this pattern occurs
  affected_users INTEGER DEFAULT 0,
  affected_sessions INTEGER DEFAULT 0,
  
  -- Evidence (JSON array of event IDs or aggregated data)
  evidence TEXT NOT NULL,
  
  -- Impact assessment
  severity TEXT DEFAULT 'low',    -- 'low', 'medium', 'high'
  conversion_impact REAL,         -- Estimated % impact on conversions
  
  -- Status
  status TEXT DEFAULT 'detected', -- 'detected', 'analyzed', 'addressed', 'dismissed'
  
  -- Timestamps
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_patterns_type ON patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_patterns_severity ON patterns(severity);
CREATE INDEX IF NOT EXISTS idx_patterns_status ON patterns(status);
CREATE INDEX IF NOT EXISTS idx_patterns_frequency ON patterns(frequency DESC);
CREATE INDEX IF NOT EXISTS idx_patterns_last_seen ON patterns(last_seen DESC);
