-- Record the auth config at dispatch, before any Composio link POST. The
-- historical Worker omits this column, so an invocation delayed before INSERT
-- cannot create a different old-config Gmail attempt after recovery releases
-- the reviewed linked row. Calendar consent remains independent.
ALTER TABLE gigi_connection_attempts ADD COLUMN auth_config_id TEXT;

CREATE TRIGGER gigi_selected_gmail_insert_guard
BEFORE INSERT ON gigi_connection_attempts
WHEN NEW.provider = 'gmail'
  AND (NEW.auth_config_id IS NULL OR NEW.auth_config_id <> 'ac_qXoEQURadG-h')
BEGIN
  SELECT RAISE(ABORT, 'selected_gmail_auth_config_required');
END;

-- Earlier Gmail attempts may already be retired with an account ID. The old
-- Worker could otherwise reactivate one through its unconditional reconcile
-- UPDATE after the reviewed linked attempt is released. This guard does not
-- block the reviewed linked -> attention transition or selected-config rows.
CREATE TRIGGER gigi_retired_legacy_gmail_update_guard
BEFORE UPDATE ON gigi_connection_attempts
WHEN OLD.provider = 'gmail'
  AND OLD.auth_config_id IS NULL
  AND OLD.status = 'attention'
  AND OLD.reconnectable = 1
BEGIN
  SELECT RAISE(ABORT, 'retired_legacy_gmail_attempt');
END;
