-- Authorization changes settle timers in the same transaction as revocation.
CREATE TRIGGER support_partner_time_revoked AFTER UPDATE ON support_partners
WHEN NEW.approved=0
BEGIN
 UPDATE remote_sessions SET
 tracked_seconds=tracked_seconds+CASE WHEN timer_started_at IS NULL THEN 0 ELSE MAX(0,MIN(unixepoch(),expires_at,support_period_end)-timer_started_at) END,
 timer_started_at=NULL,status='ended',receipt_status='pending',
 outcome=CASE WHEN outcome='' THEN 'Partner authorization ended. Review the recorded work with the other participant.' ELSE outcome END,
 updated_by='system:authorization',updated_at=unixepoch()
 WHERE creator_id=NEW.subject AND status='accepted' AND support_period_start IS NOT NULL;
END;
CREATE TRIGGER support_creator_time_revoked AFTER UPDATE ON creator_applications
WHEN NEW.status<>'approved'
BEGIN
 UPDATE remote_sessions SET
 tracked_seconds=tracked_seconds+CASE WHEN timer_started_at IS NULL THEN 0 ELSE MAX(0,MIN(unixepoch(),expires_at,support_period_end)-timer_started_at) END,
 timer_started_at=NULL,status='ended',receipt_status='pending',
 outcome=CASE WHEN outcome='' THEN 'Partner authorization ended. Review the recorded work with the other participant.' ELSE outcome END,
 updated_by='system:authorization',updated_at=unixepoch()
 WHERE creator_id=NEW.subject AND status='accepted' AND support_period_start IS NOT NULL;
END;
