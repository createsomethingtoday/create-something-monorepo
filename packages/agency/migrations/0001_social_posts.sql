-- Social Posts Table
-- Stores scheduled posts for LinkedIn and other platforms
-- Supports the full queue system with drip/longform/immediate modes

CREATE TABLE IF NOT EXISTS social_posts (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,              -- 'linkedin' | 'twitter'
  content TEXT NOT NULL,               -- Post text
  scheduled_for INTEGER NOT NULL,      -- Unix timestamp (ms)
  timezone TEXT DEFAULT 'America/Los_Angeles',
  status TEXT DEFAULT 'pending',       -- pending | queued | posted | failed | cancelled
  post_id TEXT,                        -- Platform's post ID after success
  post_url TEXT,                       -- URL to view post
  error TEXT,                          -- Error message if failed
  campaign TEXT,                       -- Reference to content source (e.g., 'kickstand')
  thread_id TEXT,                      -- Groups posts in a thread
  thread_index INTEGER,                -- Position in thread (1-based)
  thread_total INTEGER,                -- Total posts in thread
  created_at INTEGER NOT NULL,
  posted_at INTEGER,
  metadata TEXT                        -- JSON for additional data (hashtags, links for comments, etc.)
);

-- Index for the cron query: find pending posts ready to send
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled
ON social_posts(status, scheduled_for);

-- Index for finding posts by thread
CREATE INDEX IF NOT EXISTS idx_social_posts_thread
ON social_posts(thread_id, thread_index);

-- Index for finding posts by campaign
CREATE INDEX IF NOT EXISTS idx_social_posts_campaign
ON social_posts(campaign, status);
