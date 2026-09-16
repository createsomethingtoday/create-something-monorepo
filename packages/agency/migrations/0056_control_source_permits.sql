-- Agency owns activation authority; Control owns the referenced runtime attempt.
-- A redeemed permit is a durable authorization decision, never a retry token.
CREATE TABLE customer_control_source_permits (
  permit_id TEXT PRIMARY KEY,
  activation_id TEXT NOT NULL REFERENCES customer_control_activations(id) ON DELETE RESTRICT,
  activation_version INTEGER NOT NULL CHECK (activation_version >= 1),
  account_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  workspace_account_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  attempt_id TEXT NOT NULL,
  request_sha256 TEXT NOT NULL CHECK (length(request_sha256) = 71 AND substr(request_sha256, 1, 7) = 'sha256:' AND substr(request_sha256, 8) NOT GLOB '*[^0-9a-f]*'),
  tool TEXT NOT NULL,
  resource TEXT NOT NULL,
  redeemed_at TEXT NOT NULL,
  UNIQUE (run_id, step_id, attempt_id)
);
CREATE TRIGGER customer_control_source_permits_no_update
BEFORE UPDATE ON customer_control_source_permits BEGIN
  SELECT RAISE(ABORT, 'source_permit_immutable');
END;
CREATE TRIGGER customer_control_source_permits_no_delete
BEFORE DELETE ON customer_control_source_permits BEGIN
  SELECT RAISE(ABORT, 'source_permit_immutable');
END;
CREATE TRIGGER customer_control_source_permits_no_replace
BEFORE INSERT ON customer_control_source_permits
WHEN EXISTS (SELECT 1 FROM customer_control_source_permits p
  WHERE p.permit_id = NEW.permit_id OR
    (p.run_id = NEW.run_id AND p.step_id = NEW.step_id AND p.attempt_id = NEW.attempt_id))
BEGIN
  SELECT RAISE(ABORT, 'source_permit_already_redeemed');
END;
