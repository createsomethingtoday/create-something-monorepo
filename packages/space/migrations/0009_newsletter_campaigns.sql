-- Newsletter campaigns tracking table
CREATE TABLE IF NOT EXISTS newsletter_campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject TEXT NOT NULL,
    sent_at DATETIME NOT NULL,
    total_recipients INTEGER NOT NULL DEFAULT 0,
    successful INTEGER NOT NULL DEFAULT 0,
    failed INTEGER NOT NULL DEFAULT 0
);

-- Add unsubscribed_at column to existing subscribers table if not exists
-- (SQLite doesn't support ADD COLUMN IF NOT EXISTS, so we handle this in code)
