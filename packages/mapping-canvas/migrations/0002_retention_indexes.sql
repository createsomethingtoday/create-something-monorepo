CREATE INDEX IF NOT EXISTS draw_shares_expires_at ON draw_shares(expires_at);
CREATE INDEX IF NOT EXISTS draw_shares_published_at ON draw_shares(published_at);
CREATE INDEX IF NOT EXISTS draw_publish_limits_window_started_at ON draw_publish_limits(window_started_at);
