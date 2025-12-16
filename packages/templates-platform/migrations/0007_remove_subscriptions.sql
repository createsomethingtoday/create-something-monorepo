-- Migration: Remove Subscriptions
-- All templates are now free - no billing or subscription tracking needed.

-- Drop subscription-related tables
DROP TABLE IF EXISTS payment_history;
DROP TABLE IF EXISTS subscriptions;

-- Note: We're keeping the following columns in the users table for backwards compatibility:
-- - stripe_customer_id (may be useful for future integrations)
-- - plan (existing data, harmless)
-- - site_limit (existing data, harmless)
-- These columns are simply ignored by the application code.
