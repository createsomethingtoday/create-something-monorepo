-- Bettermode Marketplace Creator community operations loop.
--
-- community_events captures raw attention signals from webhooks,
-- notification webhooks, and scheduled sweeps. community_work_items is the
-- operator cockpit state derived from those events plus BetterMode thread
-- state and the existing community_signals/community_queue draft pipeline.

CREATE TABLE IF NOT EXISTS community_events (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_source TEXT NOT NULL DEFAULT 'webhook',
  dedupe_key TEXT,
  source_id TEXT,
  source_url TEXT,
  space_id TEXT,
  actor_id TEXT,
  actor_name TEXT,
  actor_email TEXT,
  status TEXT NOT NULL DEFAULT 'observed',
  received_at TEXT NOT NULL,
  processed_at TEXT,
  payload TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(dedupe_key)
);

CREATE TABLE IF NOT EXISTS community_work_items (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_url TEXT,
  title TEXT,
  lane TEXT NOT NULL DEFAULT 'support_question',
  status TEXT NOT NULL DEFAULT 'new',
  priority INTEGER NOT NULL DEFAULT 5,
  urgency TEXT NOT NULL DEFAULT 'medium',
  next_action TEXT,
  due_at TEXT,
  author_id TEXT,
  author_name TEXT,
  author_email TEXT,
  signal_id TEXT,
  queue_id TEXT,
  draft_status TEXT,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  last_activity_at TEXT,
  last_drafted_at TEXT,
  last_sent_at TEXT,
  escalated_at TEXT,
  escalation_reason TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(platform, source_id)
);

CREATE INDEX IF NOT EXISTS idx_community_events_platform_source
  ON community_events(platform, source_id);

CREATE INDEX IF NOT EXISTS idx_community_events_received
  ON community_events(platform, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_work_status_priority
  ON community_work_items(status, priority DESC, last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_work_lane_status
  ON community_work_items(lane, status, priority DESC);

CREATE INDEX IF NOT EXISTS idx_community_work_due
  ON community_work_items(due_at, status);
