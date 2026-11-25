-- Existing JSON stores recovery attempts and exact provider anchors durably.
CREATE INDEX IF NOT EXISTS npg_analyst_recovery_scan ON npg_analyst_conversations(scope,status,lease_until,updated_at);
