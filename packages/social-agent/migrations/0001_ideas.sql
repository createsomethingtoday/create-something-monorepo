-- Social Agent: Idea Queue Schema
-- 
-- Tracks content ideas from raw capture through to published posts.
-- Integrates with existing social_posts table in packages/agency.

-- =============================================================================
-- Ideas Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS social_ideas (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL CHECK (source IN ('manual', 'repo', 'paper', 'external', 'engagement')),
    source_id TEXT,
    raw_content TEXT NOT NULL,
    platforms TEXT NOT NULL, -- JSON array: ["linkedin", "twitter"]
    status TEXT NOT NULL DEFAULT 'raw' CHECK (status IN ('raw', 'drafted', 'reviewed', 'scheduled', 'posted', 'failed', 'rejected')),
    priority INTEGER NOT NULL DEFAULT 50 CHECK (priority >= 0 AND priority <= 100),
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    metadata TEXT -- JSON object for source-specific data
);

-- Index for finding next idea to process
CREATE INDEX IF NOT EXISTS idx_ideas_status_priority ON social_ideas(status, priority DESC, created_at ASC);

-- Index for checking duplicate source IDs
CREATE INDEX IF NOT EXISTS idx_ideas_source_id ON social_ideas(source, source_id);

-- =============================================================================
-- Drafts Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS social_drafts (
    id TEXT PRIMARY KEY,
    idea_id TEXT NOT NULL REFERENCES social_ideas(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'twitter')),
    content TEXT NOT NULL,
    voice_score INTEGER NOT NULL DEFAULT 0 CHECK (voice_score >= 0 AND voice_score <= 100),
    voice_violations TEXT, -- JSON array of violation objects
    revision_count INTEGER NOT NULL DEFAULT 0,
    reasoning TEXT, -- Claude's reasoning for audit trail
    tokens_used INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- Index for finding drafts by idea
CREATE INDEX IF NOT EXISTS idx_drafts_idea_id ON social_drafts(idea_id);

-- Index for finding latest draft per platform
CREATE INDEX IF NOT EXISTS idx_drafts_platform ON social_drafts(idea_id, platform, created_at DESC);

-- =============================================================================
-- Agent State Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS social_agent_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- Insert default state
INSERT OR IGNORE INTO social_agent_state (key, value) VALUES 
    ('paused', 'false'),
    ('last_run', '0'),
    ('posts_today', '{"linkedin": 0, "twitter": 0}'),
    ('daily_reset', '0');

-- =============================================================================
-- Agent Errors Table (for audit trail)
-- =============================================================================

CREATE TABLE IF NOT EXISTS social_agent_errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    phase TEXT NOT NULL CHECK (phase IN ('monitor', 'generate', 'review', 'schedule', 'post')),
    message TEXT NOT NULL,
    idea_id TEXT REFERENCES social_ideas(id) ON DELETE SET NULL,
    stack_trace TEXT
);

-- Index for recent errors
CREATE INDEX IF NOT EXISTS idx_errors_timestamp ON social_agent_errors(timestamp DESC);

-- =============================================================================
-- Source Checkpoints (for incremental polling)
-- =============================================================================

CREATE TABLE IF NOT EXISTS social_source_checkpoints (
    source TEXT PRIMARY KEY,
    last_checked_at INTEGER NOT NULL DEFAULT 0,
    last_item_id TEXT,
    metadata TEXT -- JSON for source-specific checkpoint data
);

-- Initialize checkpoints for known sources
INSERT OR IGNORE INTO social_source_checkpoints (source) VALUES 
    ('repo'),
    ('paper'),
    ('external');

-- =============================================================================
-- Engagements Table (for tracking replies, mentions, etc.)
-- =============================================================================

CREATE TABLE IF NOT EXISTS social_engagements (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'twitter')),
    type TEXT NOT NULL CHECK (type IN ('reply', 'mention', 'like', 'repost', 'quote')),
    post_id TEXT NOT NULL, -- Our original post
    engager_id TEXT NOT NULL,
    engager_name TEXT,
    content TEXT,
    rule_matched TEXT,
    action_taken TEXT CHECK (action_taken IN ('reply', 'like', 'ignore', 'escalate')),
    response TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    processed INTEGER NOT NULL DEFAULT 0
);

-- Index for finding unprocessed engagements
CREATE INDEX IF NOT EXISTS idx_engagements_processed ON social_engagements(processed, created_at DESC);

-- Index for finding engagements by post
CREATE INDEX IF NOT EXISTS idx_engagements_post_id ON social_engagements(post_id, platform);

-- Index for escalations
CREATE INDEX IF NOT EXISTS idx_engagements_escalations ON social_engagements(action_taken, processed) WHERE action_taken = 'escalate';
