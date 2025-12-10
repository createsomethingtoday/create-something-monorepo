-- Migration: Add last_edited_at for activity tracking
-- This column tracks when a user last edited their site content

ALTER TABLE tenants ADD COLUMN last_edited_at TEXT;

-- Initialize existing rows with updated_at value
UPDATE tenants SET last_edited_at = updated_at WHERE last_edited_at IS NULL;
