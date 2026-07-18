-- Audited terminal lifecycle for immutable Map-to-Build handoffs.
--
-- Existing payload/version facts remain immutable. A resolution records who
-- accepted or cancelled the handoff and when, without implying deployment.

ALTER TABLE customer_map_handoffs ADD COLUMN resolved_at TEXT;
ALTER TABLE customer_map_handoffs ADD COLUMN resolved_by TEXT;
ALTER TABLE customer_map_handoffs ADD COLUMN resolution_note TEXT
  CHECK (resolution_note IS NULL OR length(resolution_note) <= 240);

-- Preserve legacy accepted rows without inventing an operator identity.
UPDATE customer_map_handoffs
SET resolved_at = COALESCE(accepted_at, created_at),
    resolved_by = 'legacy:unknown',
    resolution_note = 'Migrated legacy accepted handoff; original resolver unavailable.'
WHERE status = 'accepted' AND resolved_at IS NULL;

CREATE TRIGGER customer_map_handoff_insert_requires_consistent_state
BEFORE INSERT ON customer_map_handoffs
WHEN (
    NEW.status = 'prepared'
    AND (
      NEW.resolved_at IS NOT NULL
      OR NEW.resolved_by IS NOT NULL
      OR NEW.resolution_note IS NOT NULL
      OR NEW.accepted_at IS NOT NULL
    )
  )
  OR (
    NEW.status IN ('accepted', 'cancelled')
    AND (
      NEW.resolved_at IS NULL
      OR NEW.resolved_by IS NULL
      OR length(trim(NEW.resolved_by)) = 0
      OR (NEW.status = 'accepted' AND NEW.accepted_at IS NOT NEW.resolved_at)
      OR (NEW.status = 'cancelled' AND NEW.accepted_at IS NOT NULL)
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'Handoff terminal decision requires resolution facts; prepared handoff cannot carry them');
END;

CREATE TRIGGER customer_map_handoff_prepared_has_no_resolution
BEFORE UPDATE OF resolved_at, resolved_by, resolution_note, accepted_at
ON customer_map_handoffs
WHEN NEW.status = 'prepared'
  AND (
    NEW.resolved_at IS NOT NULL
    OR NEW.resolved_by IS NOT NULL
    OR NEW.resolution_note IS NOT NULL
    OR NEW.accepted_at IS NOT NULL
  )
BEGIN
  SELECT RAISE(ABORT, 'Prepared handoff cannot carry resolution facts');
END;

CREATE TRIGGER customer_map_handoff_terminal_requires_resolution
BEFORE UPDATE OF status, resolved_at, resolved_by, resolution_note, accepted_at
ON customer_map_handoffs
WHEN OLD.status = 'prepared'
  AND NEW.status IN ('accepted', 'cancelled')
  AND (
    NEW.resolved_at IS NULL
    OR NEW.resolved_by IS NULL
    OR length(trim(NEW.resolved_by)) = 0
    OR (NEW.status = 'accepted' AND NEW.accepted_at IS NOT NEW.resolved_at)
    OR (NEW.status = 'cancelled' AND NEW.accepted_at IS NOT NULL)
  )
BEGIN
  SELECT RAISE(ABORT, 'Handoff terminal decision requires consistent resolution facts');
END;

CREATE TRIGGER customer_map_handoff_terminal_is_final
BEFORE UPDATE OF status
ON customer_map_handoffs
WHEN OLD.status IN ('accepted', 'cancelled') AND NEW.status IS NOT OLD.status
BEGIN
  SELECT RAISE(ABORT, 'Handoff terminal status cannot change');
END;

CREATE TRIGGER customer_map_handoff_resolution_is_immutable
BEFORE UPDATE OF resolved_at, resolved_by, resolution_note, accepted_at
ON customer_map_handoffs
WHEN OLD.status IN ('accepted', 'cancelled')
  AND (
    NEW.resolved_at IS NOT OLD.resolved_at
    OR NEW.resolved_by IS NOT OLD.resolved_by
    OR NEW.resolution_note IS NOT OLD.resolution_note
    OR NEW.accepted_at IS NOT OLD.accepted_at
  )
BEGIN
  SELECT RAISE(ABORT, 'Handoff terminal resolution is immutable');
END;

CREATE TRIGGER customer_map_handoff_payload_is_immutable
BEFORE UPDATE OF map_id, account_id, map_version, payload_json, created_by, created_at
ON customer_map_handoffs
WHEN NEW.map_id IS NOT OLD.map_id
  OR NEW.account_id IS NOT OLD.account_id
  OR NEW.map_version IS NOT OLD.map_version
  OR NEW.payload_json IS NOT OLD.payload_json
  OR NEW.created_by IS NOT OLD.created_by
  OR NEW.created_at IS NOT OLD.created_at
BEGIN
  SELECT RAISE(ABORT, 'Handoff source and payload are immutable');
END;
