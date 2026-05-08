-- Bettermode Marketplace Creator Agent: query indexes for the
-- per-post draft lookup performed on every dynamic-block render.
--
-- We reuse the existing community_signals + community_queue tables.
-- Bettermode-specific data lives in metadata JSON on community_signals:
--   { network_id, space_id, parent_post_id, is_top_level,
--     author_member_id, author_email, author_name }
-- The post ID is stored in community_signals.source_id with platform='bettermode'.

CREATE INDEX IF NOT EXISTS idx_signals_platform_source
  ON community_signals(platform, source_id);

CREATE INDEX IF NOT EXISTS idx_queue_signal_status
  ON community_queue(signal_id, status);
