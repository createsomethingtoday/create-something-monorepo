ALTER TABLE remote_sessions ADD COLUMN tracked_seconds INTEGER NOT NULL DEFAULT 0 CHECK(tracked_seconds>=0);
ALTER TABLE remote_sessions ADD COLUMN timer_started_at INTEGER;
ALTER TABLE remote_sessions ADD COLUMN support_period_start INTEGER;
ALTER TABLE remote_sessions ADD COLUMN support_period_end INTEGER;
ALTER TABLE remote_sessions ADD COLUMN receipt_status TEXT NOT NULL DEFAULT 'none' CHECK(receipt_status IN ('none','pending','confirmed','disputed'));
ALTER TABLE remote_sessions ADD COLUMN receipt_note TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX remote_creator_timer ON remote_sessions(creator_id) WHERE timer_started_at IS NOT NULL;
CREATE TABLE support_time_events (
 id INTEGER PRIMARY KEY,
 session_id TEXT NOT NULL REFERENCES remote_sessions(id),
 actor_id TEXT NOT NULL,
 tracked_seconds INTEGER NOT NULL,
 timer_started_at INTEGER,
 period_start INTEGER,
 period_end INTEGER,
 receipt_status TEXT NOT NULL,
 receipt_note TEXT NOT NULL,
 outcome TEXT NOT NULL,
 recorded_at INTEGER NOT NULL
);
CREATE TRIGGER support_time_changed AFTER UPDATE ON remote_sessions
WHEN NEW.tracked_seconds<>OLD.tracked_seconds OR NEW.timer_started_at IS NOT OLD.timer_started_at OR NEW.receipt_status<>OLD.receipt_status
BEGIN
 INSERT INTO support_time_events(session_id,actor_id,tracked_seconds,timer_started_at,period_start,period_end,receipt_status,receipt_note,outcome,recorded_at)
 VALUES(NEW.id,NEW.updated_by,NEW.tracked_seconds,NEW.timer_started_at,NEW.support_period_start,NEW.support_period_end,NEW.receipt_status,NEW.receipt_note,NEW.outcome,NEW.updated_at);
END;
CREATE TRIGGER support_time_no_update BEFORE UPDATE ON support_time_events BEGIN SELECT RAISE(ABORT,'Support time audit is immutable'); END;
CREATE TRIGGER support_time_no_delete BEFORE DELETE ON support_time_events BEGIN SELECT RAISE(ABORT,'Support time audit is immutable'); END;
