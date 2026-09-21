-- Settle at the server-observed billing transition, before later refreshes can
-- overwrite checked_at. Keep each receipt attached to its original paid period.
CREATE TRIGGER support_billing_time_boundary AFTER UPDATE ON network_billing
WHEN NEW.status<>'active' OR NEW.period_start<>OLD.period_start OR NEW.period_end<>OLD.period_end
BEGIN
 UPDATE remote_sessions SET
 tracked_seconds=tracked_seconds+CASE WHEN timer_started_at IS NULL THEN 0 ELSE MAX(0,MIN(NEW.checked_at,expires_at,support_period_end,CASE WHEN NEW.period_start=support_period_start THEN NEW.period_end ELSE support_period_end END)-timer_started_at) END,
 timer_started_at=NULL,status='ended',receipt_status='pending',
 outcome=CASE WHEN outcome='' THEN 'Billing changed. Review the recorded work with the other participant.' ELSE outcome END,
 updated_by='system:billing',updated_at=NEW.checked_at
 WHERE network_id=NEW.network_id AND status='accepted' AND support_period_start IS NOT NULL;
END;
-- Also applies when a previous Worker version ends a running session after rollback.
CREATE TRIGGER support_closed_timer AFTER UPDATE ON remote_sessions
WHEN NEW.status<>'accepted' AND NEW.timer_started_at IS NOT NULL
BEGIN
 UPDATE remote_sessions SET
 tracked_seconds=tracked_seconds+MAX(0,MIN(NEW.updated_at,expires_at,support_period_end)-timer_started_at),
 timer_started_at=NULL,receipt_status='pending'
 WHERE id=NEW.id;
END;
CREATE TRIGGER support_empty_receipt AFTER UPDATE ON remote_sessions
WHEN NEW.receipt_status='pending' AND NEW.tracked_seconds=0 AND NEW.timer_started_at IS NULL
BEGIN
 UPDATE remote_sessions SET receipt_status='none' WHERE id=NEW.id;
END;
-- Reconcile any pre-existing closed timers without inventing time after closure.
UPDATE remote_sessions SET status=status WHERE status<>'accepted' AND timer_started_at IS NOT NULL;
UPDATE remote_sessions SET receipt_status='none' WHERE receipt_status='pending' AND tracked_seconds=0 AND timer_started_at IS NULL;
