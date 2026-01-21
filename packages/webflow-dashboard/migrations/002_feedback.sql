-- Beta feedback table
CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature', 'general')),
    message TEXT NOT NULL,
    page_url TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Index for querying by user
CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_email);

-- Index for querying by type
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(feedback_type);

-- Index for chronological queries
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at DESC);
