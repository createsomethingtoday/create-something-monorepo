-- Knock's email status for each sent request (delivered, bounced, ...), copied
-- back by the hourly cron so D1 alone answers "did the creator get it?".
-- `status = 'sent'` only means Knock accepted the trigger.
ALTER TABLE support_requests ADD COLUMN delivery_status TEXT;
ALTER TABLE support_requests ADD COLUMN delivery_checked_at TEXT;
