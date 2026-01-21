-- Community Layer: Agent-Managed Presence
-- Enables deep work while maintaining community growth

-- Signals: Inbound mentions, conversations, opportunities
CREATE TABLE IF NOT EXISTS community_signals (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,              -- linkedin, twitter, github, hackernews, etc.
  signal_type TEXT NOT NULL,           -- mention, reply, question, opportunity, praise
  source_url TEXT,                     -- Link to the original
  source_id TEXT,                      -- Platform-specific ID
  author_id TEXT,                      -- Platform user ID
  author_name TEXT,
  author_handle TEXT,
  author_followers INTEGER,            -- For prioritization
  content TEXT NOT NULL,               -- The actual content
  context TEXT,                        -- Surrounding context if relevant
  relevance_score REAL DEFAULT 0.5,    -- AI-assessed relevance (0-1)
  urgency TEXT DEFAULT 'low',          -- low, medium, high, critical
  status TEXT DEFAULT 'new',           -- new, reviewed, queued, dismissed, responded
  detected_at TEXT NOT NULL,
  reviewed_at TEXT,
  metadata TEXT,                       -- JSON for platform-specific data
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Response Queue: AI-drafted responses awaiting approval
CREATE TABLE IF NOT EXISTS community_queue (
  id TEXT PRIMARY KEY,
  signal_id TEXT REFERENCES community_signals(id),
  draft_content TEXT NOT NULL,         -- AI-generated response
  draft_reasoning TEXT,                -- Why the AI drafted this response
  tone TEXT DEFAULT 'methodology',     -- methodology, helpful, appreciative, promotional
  action_type TEXT NOT NULL,           -- reply, comment, share, dm, follow
  platform TEXT NOT NULL,
  target_url TEXT,                     -- Where to post
  priority INTEGER DEFAULT 5,          -- 1-10, higher = more important
  status TEXT DEFAULT 'pending',       -- pending, approved, sent, rejected, expired
  expires_at TEXT,                     -- Some opportunities are time-sensitive
  approved_at TEXT,
  approved_content TEXT,               -- Final content if edited
  sent_at TEXT,
  result TEXT,                         -- Success/failure info
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Relationships: Track engagement patterns over time
CREATE TABLE IF NOT EXISTS community_relationships (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  person_id TEXT NOT NULL,             -- Platform user ID
  person_name TEXT,
  person_handle TEXT,
  person_title TEXT,
  person_company TEXT,
  person_url TEXT,
  person_followers INTEGER,
  
  -- Engagement metrics
  interactions_count INTEGER DEFAULT 0,
  our_responses_count INTEGER DEFAULT 0,
  their_responses_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  
  -- Relationship signals
  first_interaction TEXT,
  last_interaction TEXT,
  warmth_score REAL DEFAULT 0,         -- 0-1, AI-calculated based on patterns
  lead_potential TEXT DEFAULT 'unknown', -- unknown, cold, warm, hot, client
  
  -- Context
  interests TEXT,                      -- JSON array of detected interests
  notes TEXT,                          -- Human-added notes
  tags TEXT,                           -- JSON array of tags
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(platform, person_id)
);

-- Amplification Queue: Content worth sharing/boosting
CREATE TABLE IF NOT EXISTS community_amplification (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_author TEXT,
  source_content TEXT,                 -- Preview of what we're amplifying
  
  amplification_type TEXT NOT NULL,    -- share, quote, reply_thread, reference
  draft_content TEXT,                  -- Our commentary if quote/reply
  reason TEXT,                         -- Why this is worth amplifying
  
  priority INTEGER DEFAULT 5,
  status TEXT DEFAULT 'pending',       -- pending, approved, scheduled, posted, rejected
  scheduled_for TEXT,
  posted_at TEXT,
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Monitor runs: Track when monitors last ran
CREATE TABLE IF NOT EXISTS community_monitor_runs (
  id TEXT PRIMARY KEY,
  monitor_type TEXT NOT NULL,          -- linkedin, twitter, github, etc.
  started_at TEXT NOT NULL,
  completed_at TEXT,
  signals_found INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running',       -- running, completed, failed
  error TEXT,
  metadata TEXT                        -- JSON for cursor/pagination state
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_signals_status ON community_signals(status);
CREATE INDEX IF NOT EXISTS idx_signals_platform ON community_signals(platform);
CREATE INDEX IF NOT EXISTS idx_signals_urgency ON community_signals(urgency, status);
CREATE INDEX IF NOT EXISTS idx_signals_detected ON community_signals(detected_at);

CREATE INDEX IF NOT EXISTS idx_queue_status ON community_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_priority ON community_queue(priority DESC, created_at);
CREATE INDEX IF NOT EXISTS idx_queue_expires ON community_queue(expires_at);

CREATE INDEX IF NOT EXISTS idx_relationships_warmth ON community_relationships(warmth_score DESC);
CREATE INDEX IF NOT EXISTS idx_relationships_platform ON community_relationships(platform, person_handle);
CREATE INDEX IF NOT EXISTS idx_relationships_lead ON community_relationships(lead_potential);

CREATE INDEX IF NOT EXISTS idx_amplification_status ON community_amplification(status);
CREATE INDEX IF NOT EXISTS idx_amplification_scheduled ON community_amplification(scheduled_for);
