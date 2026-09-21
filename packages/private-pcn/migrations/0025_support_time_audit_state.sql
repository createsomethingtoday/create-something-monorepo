-- Nested normalization triggers may execute in either order. Capture the saved
-- row, rather than a stale outer NEW image, so receipts and audit agree.
DROP TRIGGER support_time_changed;
CREATE TRIGGER support_time_changed AFTER UPDATE ON remote_sessions
WHEN NEW.tracked_seconds<>OLD.tracked_seconds OR NEW.timer_started_at IS NOT OLD.timer_started_at OR NEW.receipt_status<>OLD.receipt_status
BEGIN
 INSERT INTO support_time_events(session_id,actor_id,tracked_seconds,timer_started_at,period_start,period_end,receipt_status,receipt_note,outcome,recorded_at)
 SELECT id,updated_by,tracked_seconds,timer_started_at,support_period_start,support_period_end,receipt_status,receipt_note,outcome,updated_at
 FROM remote_sessions WHERE id=NEW.id;
END;
