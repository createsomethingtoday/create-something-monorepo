-- Soft Delete Support
--
-- Canon: Deletion with grace.
-- Users have 30 days to recover before permanent removal.

-- Add soft delete column to users
ALTER TABLE users ADD COLUMN deleted_at TEXT;

-- Index for cleanup queries
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
