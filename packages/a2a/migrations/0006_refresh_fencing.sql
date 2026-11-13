-- Ownership fence survives lease expiry and prevents stale refresh writers.
ALTER TABLE auth_sessions ADD COLUMN refresh_lock_token TEXT;
