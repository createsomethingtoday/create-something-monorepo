-- Content Pipeline: AI-Native Recurring Content System
-- 
-- Three concerns:
-- 1. Ideas Pipeline - content ideas waiting to be developed
-- 2. Topic Coverage - track what themes we've covered
-- 3. Rhythm Enforcement - recurring content patterns

-- =============================================================================
-- Content Ideas Pipeline
-- =============================================================================
-- Ideas flow: discovered → researched → drafted → scheduled → posted
-- Agent discovers ideas from research, signals, inspiration
-- Human reviews and develops into content

CREATE TABLE IF NOT EXISTS content_ideas (
  id TEXT PRIMARY KEY,
  
  -- Source of the idea
  source TEXT NOT NULL,                -- 'research' | 'signal' | 'manual' | 'agent' | 'community'
  source_id TEXT,                      -- Reference to signal, research session, etc.
  
  -- The idea itself
  title TEXT NOT NULL,
  description TEXT,
  target_audience TEXT,
  
  -- Classification
  pillar TEXT,                         -- 'methodology' | 'case_study' | 'industry' | 'behind_scenes' | 'value_share'
  format TEXT,                         -- 'carousel' | 'video' | 'text_only' | 'multi_image' | 'poll'
  
  -- Pipeline state
  status TEXT DEFAULT 'discovered',    -- discovered | researching | drafted | scheduled | posted | archived
  priority INTEGER DEFAULT 5,          -- 1-10, higher = more important
  
  -- Development
  research_notes TEXT,                 -- Agent's research findings
  draft_content TEXT,                  -- Developed content
  draft_format TEXT,                   -- JSON: slides for carousel, script for video, etc.
  
  -- Scheduling
  best_day TEXT,                       -- Recommended day based on pillar
  scheduled_post_id TEXT,              -- Link to social_posts when scheduled
  
  -- Metadata
  tags TEXT,                           -- JSON array of tags
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,                     -- 'agent' | 'human' | agent name
  
  -- Beads integration (for complex content)
  beads_issue_id TEXT                  -- Link to Beads issue if this becomes a project
);

CREATE INDEX IF NOT EXISTS idx_ideas_status ON content_ideas(status);
CREATE INDEX IF NOT EXISTS idx_ideas_pillar ON content_ideas(pillar, status);
CREATE INDEX IF NOT EXISTS idx_ideas_priority ON content_ideas(priority DESC, created_at);

-- =============================================================================
-- Topic Coverage Tracking
-- =============================================================================
-- Track what themes/topics we've posted about to avoid repetition
-- and identify gaps in coverage

CREATE TABLE IF NOT EXISTS content_coverage (
  id TEXT PRIMARY KEY,
  
  -- What was covered
  pillar TEXT NOT NULL,                -- methodology | case_study | industry | behind_scenes | value_share
  topic TEXT NOT NULL,                 -- Specific topic within pillar
  subtopic TEXT,                       -- More specific categorization
  
  -- The post
  post_id TEXT REFERENCES social_posts(id),
  post_date TEXT NOT NULL,
  format TEXT NOT NULL,
  
  -- Performance (updated after posting)
  impressions INTEGER,
  engagement INTEGER,
  engagement_rate REAL,
  
  -- Metadata
  tags TEXT,                           -- JSON array
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coverage_pillar ON content_coverage(pillar, post_date DESC);
CREATE INDEX IF NOT EXISTS idx_coverage_topic ON content_coverage(topic, post_date DESC);
CREATE INDEX IF NOT EXISTS idx_coverage_date ON content_coverage(post_date DESC);

-- =============================================================================
-- Content Rhythm Definitions
-- =============================================================================
-- Define recurring content patterns that agents should maintain

CREATE TABLE IF NOT EXISTS content_rhythm (
  id TEXT PRIMARY KEY,
  
  -- When
  day_of_week TEXT NOT NULL,           -- monday | tuesday | etc.
  frequency TEXT DEFAULT 'weekly',     -- weekly | biweekly | monthly
  
  -- What
  pillar TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Format preferences
  preferred_formats TEXT NOT NULL,     -- JSON array: ['carousel', 'text_only']
  
  -- Constraints
  min_posts_per_week INTEGER DEFAULT 0,
  max_posts_per_week INTEGER DEFAULT 2,
  
  -- Topic rotation
  topic_pool TEXT,                     -- JSON array of topic ideas
  last_topics TEXT,                    -- JSON array of recently used topics (for rotation)
  
  -- State
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- Content Campaigns (links to Beads)
-- =============================================================================
-- For multi-part content series that warrant Beads issue tracking

CREATE TABLE IF NOT EXISTS content_campaigns (
  id TEXT PRIMARY KEY,
  
  -- Identity
  name TEXT NOT NULL,
  description TEXT,
  
  -- Beads integration
  beads_issue_id TEXT,                 -- Parent issue in Beads
  
  -- Campaign structure
  planned_posts INTEGER,
  published_posts INTEGER DEFAULT 0,
  
  -- Timeline
  start_date TEXT,
  end_date TEXT,
  
  -- State
  status TEXT DEFAULT 'planning',      -- planning | active | completed | paused
  
  -- Posts in this campaign
  post_ids TEXT,                       -- JSON array of social_post IDs
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- Seed Default Rhythm (from formats.ts)
-- =============================================================================

INSERT OR REPLACE INTO content_rhythm (id, day_of_week, pillar, description, preferred_formats, topic_pool) VALUES
  ('rhythm_monday', 'monday', 'methodology', 'Canon principles, design philosophy, frameworks', 
   '["carousel", "text_only"]',
   '["Subtractive Triad in action", "Why understanding precedes creation", "The hermeneutic circle of design", "Less, but better - practical examples", "Zuhandenheit: tools that recede into use"]'),
  
  ('rhythm_tuesday', 'tuesday', 'case_study', 'Client work, transformations, results',
   '["carousel", "video", "multi_image"]',
   '["Before/after project reveal", "Problem → Solution → Result", "Client testimonial", "Design decisions explained", "What we learned"]'),
  
  ('rhythm_wednesday', 'wednesday', 'industry', 'Trends, observations, commentary',
   '["text_only", "poll", "carousel"]',
   '["Contrarian take on industry trend", "What most agencies get wrong", "The future of [topic]", "Data or research breakdown", "Industry pattern observation"]'),
  
  ('rhythm_thursday', 'thursday', 'behind_scenes', 'Process, team, culture',
   '["video", "multi_image", "text_only"]',
   '["How we work", "Tool or process we use", "Team moment", "Office/workspace", "Day in the life"]'),
  
  ('rhythm_friday', 'friday', 'value_share', 'Tips, tutorials, frameworks to save',
   '["carousel", "video"]',
   '["How to [practical skill]", "Framework or template share", "Quick tip or hack", "Resource recommendation", "Step-by-step guide"]');
