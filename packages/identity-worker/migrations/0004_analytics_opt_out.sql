-- Migration: Add analytics opt-out support
-- Allows users to disable analytics tracking (GDPR compliance)

-- Add analytics_opt_out column to users table
-- Default is 0 (false) - analytics enabled by default
ALTER TABLE users ADD COLUMN analytics_opt_out INTEGER DEFAULT 0;

-- Index for quick lookups when checking analytics preference
CREATE INDEX idx_users_analytics_opt_out ON users(analytics_opt_out);
