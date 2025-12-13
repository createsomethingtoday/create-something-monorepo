-- Contact form submissions
CREATE TABLE IF NOT EXISTS contact_submissions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

    -- Contact info
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT,
    phone TEXT,

    -- Category and product info
    category_id TEXT NOT NULL,
    product_id TEXT,
    application_id TEXT,

    -- For LithX
    metals TEXT,  -- JSON array of selected metal IDs

    -- Message
    message TEXT,

    -- Metadata
    created_at TEXT DEFAULT (datetime('now')),
    ip_address TEXT,
    user_agent TEXT,

    -- Status tracking
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived'))
);

-- Index for querying by status and date
CREATE INDEX idx_submissions_status ON contact_submissions(status, created_at DESC);
CREATE INDEX idx_submissions_email ON contact_submissions(email);
CREATE INDEX idx_submissions_category ON contact_submissions(category_id);
