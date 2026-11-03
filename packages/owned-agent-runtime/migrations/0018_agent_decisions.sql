-- Additive advisory evidence. These tables grant no Control or tool authority.
CREATE TABLE agent_decisions (
  scope TEXT NOT NULL CHECK (length(scope) BETWEEN 1 AND 128),
  decision_id TEXT NOT NULL CHECK (length(decision_id) BETWEEN 1 AND 128),
  request_hash TEXT NOT NULL CHECK (length(request_hash) = 64 AND request_hash NOT GLOB '*[^a-f0-9]*'),
  selected_id TEXT,
  reason TEXT NOT NULL CHECK (reason IN ('selected', 'pinned', 'resumed', 'abstained', 'invalid_response', 'unavailable', 'selector_failed', 'timeout', 'state_changed')),
  fallback INTEGER NOT NULL CHECK (fallback IN (0, 1)),
  receipt_json TEXT NOT NULL CHECK (length(CAST(receipt_json AS BLOB)) <= 100000 AND json_valid(receipt_json)),
  PRIMARY KEY (scope, decision_id),
  UNIQUE (scope, decision_id, request_hash),
  CHECK (json_extract(receipt_json, '$.schema') IS 'agent-decision/v1'),
  CHECK (json_extract(receipt_json, '$.authority') IS 'advisory_only'),
  CHECK (json_extract(receipt_json, '$.request.scope') IS scope),
  CHECK (json_extract(receipt_json, '$.request.id') IS decision_id),
  CHECK (json_extract(receipt_json, '$.requestHash') IS request_hash),
  CHECK (json_type(receipt_json, '$.selectedId') IS 'text' OR json_type(receipt_json, '$.selectedId') IS 'null'),
  CHECK (json_extract(receipt_json, '$.selectedId') IS selected_id),
  CHECK (json_extract(receipt_json, '$.reason') IS reason),
  CHECK (json_type(receipt_json, '$.fallback') IN ('true', 'false')),
  CHECK (json_extract(receipt_json, '$.fallback') IS fallback),
  CHECK (
    (reason IN ('state_changed', 'timeout') AND selected_id IS NULL AND fallback = 0)
    OR (reason IN ('pinned', 'resumed') AND fallback = 0
      AND json_extract(receipt_json, '$.request.mode') IS reason
      AND selected_id IS NOT NULL AND selected_id IS json_extract(receipt_json, '$.request.fixedChoiceId')
      AND json_type(receipt_json, '$.selector') IS 'null')
    OR (reason = 'selected' AND selected_id IS NOT NULL AND fallback = 0
      AND json_extract(receipt_json, '$.request.mode') IS 'fresh'
      AND json_type(receipt_json, '$.selector') IS 'object')
    OR (reason IN ('abstained', 'invalid_response', 'unavailable', 'selector_failed') AND fallback = 1
      AND selected_id IS NOT NULL AND selected_id IS json_extract(receipt_json, '$.request.fallbackId')
      AND json_extract(receipt_json, '$.request.mode') IS 'fresh'
      AND ((reason = 'unavailable' AND json_type(receipt_json, '$.selector') IS 'null')
        OR (reason <> 'unavailable' AND json_type(receipt_json, '$.selector') IS 'object')))
  )
);

CREATE TRIGGER agent_decisions_candidate_guard BEFORE INSERT ON agent_decisions
WHEN NEW.selected_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM json_each(NEW.receipt_json, '$.request.candidates')
  WHERE json_extract(value, '$.id') IS NEW.selected_id
)
BEGIN SELECT RAISE(ABORT, 'agent_decision_candidate_missing'); END;

CREATE TRIGGER agent_decisions_no_update BEFORE UPDATE ON agent_decisions
BEGIN SELECT RAISE(ABORT, 'agent_decisions_immutable'); END;
CREATE TRIGGER agent_decisions_no_delete BEFORE DELETE ON agent_decisions
BEGIN SELECT RAISE(ABORT, 'agent_decisions_immutable'); END;
-- REPLACE may skip DELETE triggers when recursive_triggers is disabled.
CREATE TRIGGER agent_decisions_no_replace BEFORE INSERT ON agent_decisions
WHEN EXISTS (SELECT 1 FROM agent_decisions WHERE scope = NEW.scope AND decision_id = NEW.decision_id
  AND receipt_json <> NEW.receipt_json)
BEGIN SELECT RAISE(ABORT, 'agent_decisions_immutable'); END;

CREATE TABLE agent_decision_outcomes (
  scope TEXT NOT NULL,
  decision_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('verified_success', 'verified_failure', 'unknown')),
  outcome_json TEXT NOT NULL CHECK (length(CAST(outcome_json AS BLOB)) <= 100000 AND json_valid(outcome_json)),
  PRIMARY KEY (scope, decision_id),
  FOREIGN KEY (scope, decision_id, request_hash) REFERENCES agent_decisions(scope, decision_id, request_hash),
  CHECK (json_extract(outcome_json, '$.scope') IS scope),
  CHECK (json_extract(outcome_json, '$.decisionId') IS decision_id),
  CHECK (json_extract(outcome_json, '$.requestHash') IS request_hash),
  CHECK (json_extract(outcome_json, '$.status') IS status)
);

CREATE TRIGGER agent_decision_outcomes_binding_guard BEFORE INSERT ON agent_decision_outcomes
WHEN NOT EXISTS (
  SELECT 1 FROM agent_decisions WHERE scope = NEW.scope AND decision_id = NEW.decision_id
    AND request_hash = NEW.request_hash AND selected_id IS NOT NULL
)
BEGIN SELECT RAISE(ABORT, 'agent_decision_outcome_binding_missing'); END;

CREATE TRIGGER agent_decision_outcomes_no_update BEFORE UPDATE ON agent_decision_outcomes
BEGIN SELECT RAISE(ABORT, 'agent_decision_outcomes_immutable'); END;
CREATE TRIGGER agent_decision_outcomes_no_delete BEFORE DELETE ON agent_decision_outcomes
BEGIN SELECT RAISE(ABORT, 'agent_decision_outcomes_immutable'); END;
CREATE TRIGGER agent_decision_outcomes_no_replace BEFORE INSERT ON agent_decision_outcomes
WHEN EXISTS (SELECT 1 FROM agent_decision_outcomes WHERE scope = NEW.scope AND decision_id = NEW.decision_id
  AND outcome_json <> NEW.outcome_json)
BEGIN SELECT RAISE(ABORT, 'agent_decision_outcomes_immutable'); END;
