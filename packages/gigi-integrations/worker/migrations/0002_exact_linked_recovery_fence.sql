-- Preserve the one reviewed old-config attempt once operator recovery releases it.
-- The linked -> attention CAS remains possible; historical Worker requests cannot
-- turn the released row back into an outstanding or active connection afterward.
CREATE TRIGGER gigi_removed_gmail_attempt_update_fence
BEFORE UPDATE ON gigi_connection_attempts
WHEN OLD.connected_account_id = 'ca_lb1WbyU07_b-'
  AND OLD.created_at = '2026-09-30T14:51:57.225Z'
  AND OLD.status = 'attention'
  AND OLD.reconnectable = 1
BEGIN
  SELECT RAISE(ABORT, 'reviewed_gmail_attempt_released');
END;

CREATE TRIGGER gigi_removed_gmail_attempt_delete_fence
BEFORE DELETE ON gigi_connection_attempts
WHEN OLD.connected_account_id = 'ca_lb1WbyU07_b-'
  AND OLD.created_at = '2026-09-30T14:51:57.225Z'
  AND OLD.status = 'attention'
  AND OLD.reconnectable = 1
BEGIN
  SELECT RAISE(ABORT, 'reviewed_gmail_attempt_released');
END;
