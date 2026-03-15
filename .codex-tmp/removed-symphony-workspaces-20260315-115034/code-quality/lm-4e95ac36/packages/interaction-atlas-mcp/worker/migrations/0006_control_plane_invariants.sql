CREATE TRIGGER IF NOT EXISTS trg_automation_single_active_insert
BEFORE INSERT ON automation_contracts
WHEN NEW.is_active = 1
BEGIN
  SELECT RAISE(ABORT, 'Only one active contract allowed per account_id+automation_id')
  WHERE EXISTS (
    SELECT 1
    FROM automation_contracts
    WHERE account_id = NEW.account_id
      AND automation_id = NEW.automation_id
      AND is_active = 1
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_automation_single_active_update
BEFORE UPDATE OF is_active ON automation_contracts
WHEN NEW.is_active = 1
BEGIN
  SELECT RAISE(ABORT, 'Only one active contract allowed per account_id+automation_id')
  WHERE EXISTS (
    SELECT 1
    FROM automation_contracts
    WHERE account_id = NEW.account_id
      AND automation_id = NEW.automation_id
      AND is_active = 1
      AND id != NEW.id
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_approval_valid_transition
BEFORE UPDATE OF state ON approval_requests
BEGIN
  SELECT RAISE(ABORT, 'Approval state can transition only from pending')
  WHERE OLD.state != NEW.state
    AND OLD.state != 'pending';
END;

CREATE TRIGGER IF NOT EXISTS trg_approval_decision_fields
BEFORE UPDATE OF state ON approval_requests
WHEN NEW.state IN ('approved', 'denied')
BEGIN
  SELECT RAISE(ABORT, 'approved/denied transitions require decided_by and decided_at')
  WHERE NEW.decided_by IS NULL OR NEW.decided_at IS NULL;
END;

CREATE TRIGGER IF NOT EXISTS trg_run_awaiting_approval_guard
BEFORE UPDATE OF state ON automation_runs
WHEN NEW.state = 'awaiting_approval'
BEGIN
  SELECT RAISE(ABORT, 'Run cannot enter awaiting_approval without pending approvals')
  WHERE NOT EXISTS (
    SELECT 1
    FROM approval_requests
    WHERE run_id = NEW.run_id
      AND state = 'pending'
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_autonomous_requires_assignment_insert
BEFORE INSERT ON automation_contracts
WHEN NEW.execution_mode = 'autonomous'
BEGIN
  SELECT RAISE(ABORT, 'Autonomous execution requires non-none agentAssignment.mode')
  WHERE json_extract(NEW.spec_json, '$.agentAssignment.mode') IS NULL
    OR json_extract(NEW.spec_json, '$.agentAssignment.mode') = 'none';
END;

CREATE TRIGGER IF NOT EXISTS trg_autonomous_requires_assignment_update
BEFORE UPDATE OF execution_mode, spec_json ON automation_contracts
WHEN NEW.execution_mode = 'autonomous'
BEGIN
  SELECT RAISE(ABORT, 'Autonomous execution requires non-none agentAssignment.mode')
  WHERE json_extract(NEW.spec_json, '$.agentAssignment.mode') IS NULL
    OR json_extract(NEW.spec_json, '$.agentAssignment.mode') = 'none';
END;
