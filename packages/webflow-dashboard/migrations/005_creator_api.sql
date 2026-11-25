-- Creator API (v1) hot-path state.
--
-- Airtable keeps the key records. These tables keep everything an API request
-- touches, so a burst of API calls cannot spend the Airtable rate limit that
-- the dashboard itself depends on.

-- Requests served per API key. key_id is the key's Airtable record ID.
CREATE TABLE IF NOT EXISTS api_key_usage (
    key_id TEXT PRIMARY KEY,
    request_count INTEGER NOT NULL DEFAULT 0,
    last_used_at TEXT NOT NULL
);

-- Fixed-window request counters. subject is "creator:<record id>" for the
-- hourly quota, or "ip:<address>" for key lookups that miss the cache.
CREATE TABLE IF NOT EXISTS api_rate_limits (
    subject TEXT NOT NULL,
    window_start INTEGER NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (subject, window_start)
);

-- Lets each request drop day-old windows of every subject cheaply, so the
-- table stays small even when many addresses send one request each.
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_window ON api_rate_limits (window_start);

-- Short-lived read-through cache: verified keys ("key:<sha256>") and API
-- response data ("assets:<creator ids>", "profile:<creator id>").
-- expires_at is unix seconds.
CREATE TABLE IF NOT EXISTS api_cache (
    cache_key TEXT PRIMARY KEY,
    body TEXT NOT NULL,
    expires_at INTEGER NOT NULL
);
