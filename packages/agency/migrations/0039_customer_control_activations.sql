-- Canonical tenant-scoped Control activation ledger.
--
-- Agency customer state owns these records. Interaction Atlas and runtime
-- consumers receive immutable outbox projections; they do not own a competing
-- activation definition. This migration creates no activation rows.
-- Raw D1 administration remains a privileged trust boundary. Application and
-- projection adapters must not receive direct write access to these tables.

CREATE TABLE customer_control_activation_commands (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  workspace_account_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  command_type TEXT NOT NULL
    CHECK (command_type IN ('create_version', 'suspend', 'propose_change')),
  command_sha256 TEXT NOT NULL CHECK (length(command_sha256) = 64),
  result_json TEXT CHECK (result_json IS NULL OR json_valid(result_json)),
  created_at TEXT NOT NULL,
  UNIQUE (account_id, tenant_id, workspace_account_id, idempotency_key)
);

CREATE TABLE customer_control_build_evidence (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  workspace_account_id TEXT NOT NULL,
  map_id TEXT NOT NULL,
  map_version_id TEXT NOT NULL,
  map_version INTEGER NOT NULL CHECK (map_version >= 1),
  map_canvas_sha256 TEXT NOT NULL CHECK (length(map_canvas_sha256) = 64),
  handoff_id TEXT NOT NULL,
  handoff_receipt_sha256 TEXT NOT NULL CHECK (length(handoff_receipt_sha256) = 64),
  build_release_id TEXT NOT NULL,
  build_manifest_sha256 TEXT NOT NULL CHECK (length(build_manifest_sha256) = 64),
  build_artifact_set_sha256 TEXT NOT NULL CHECK (length(build_artifact_set_sha256) = 64),
  build_acceptance_receipt_id TEXT NOT NULL,
  build_acceptance_receipt_sha256 TEXT NOT NULL CHECK (length(build_acceptance_receipt_sha256) = 64),
  build_acceptance_status TEXT NOT NULL CHECK (build_acceptance_status = 'accepted'),
  verified_by TEXT NOT NULL,
  verified_at TEXT NOT NULL,
  UNIQUE (account_id, tenant_id, workspace_account_id, build_release_id),
  UNIQUE (account_id, tenant_id, workspace_account_id, build_manifest_sha256),
  UNIQUE (account_id, tenant_id, workspace_account_id, build_acceptance_receipt_id),
  UNIQUE (account_id, tenant_id, workspace_account_id, build_acceptance_receipt_sha256),
  FOREIGN KEY (map_id) REFERENCES customer_maps(id) ON DELETE RESTRICT,
  FOREIGN KEY (map_version_id) REFERENCES customer_map_versions(id) ON DELETE RESTRICT,
  FOREIGN KEY (handoff_id) REFERENCES customer_map_handoffs(id) ON DELETE RESTRICT
);

CREATE TABLE customer_control_activations (
  id TEXT PRIMARY KEY,
  activation_version INTEGER NOT NULL CHECK (activation_version >= 1),
  account_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  workspace_account_id TEXT NOT NULL,
  map_id TEXT NOT NULL,
  map_version_id TEXT NOT NULL,
  map_version INTEGER NOT NULL CHECK (map_version >= 1),
  map_canvas_sha256 TEXT NOT NULL CHECK (length(map_canvas_sha256) = 64),
  handoff_id TEXT NOT NULL,
  handoff_receipt_sha256 TEXT NOT NULL CHECK (length(handoff_receipt_sha256) = 64),
  build_release_id TEXT NOT NULL,
  build_manifest_sha256 TEXT NOT NULL CHECK (length(build_manifest_sha256) = 64),
  build_artifact_set_sha256 TEXT NOT NULL CHECK (length(build_artifact_set_sha256) = 64),
  build_acceptance_receipt_id TEXT NOT NULL,
  build_acceptance_receipt_sha256 TEXT NOT NULL CHECK (length(build_acceptance_receipt_sha256) = 64),
  build_acceptance_status TEXT NOT NULL CHECK (build_acceptance_status = 'accepted'),
  policy_version TEXT NOT NULL,
  policy_sha256 TEXT NOT NULL CHECK (length(policy_sha256) = 64),
  allowed_tools_json TEXT NOT NULL CHECK (json_valid(allowed_tools_json) AND json_type(allowed_tools_json) = 'array'),
  allowed_resources_json TEXT NOT NULL CHECK (json_valid(allowed_resources_json) AND json_type(allowed_resources_json) = 'array'),
  contract_sha256 TEXT NOT NULL CHECK (length(contract_sha256) = 64),
  entitlement_snapshot_json TEXT NOT NULL CHECK (json_valid(entitlement_snapshot_json)),
  entitlement_snapshot_sha256 TEXT NOT NULL CHECK (length(entitlement_snapshot_sha256) = 64),
  actor_subject TEXT NOT NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('agency_operator', 'account_owner')),
  status TEXT NOT NULL CHECK (status IN ('active', 'suspended', 'superseded')),
  activation_kind TEXT NOT NULL CHECK (activation_kind IN ('initial', 'supersession', 'rollback')),
  predecessor_activation_id TEXT,
  rollback_target_activation_id TEXT,
  idempotency_key TEXT NOT NULL,
  command_sha256 TEXT NOT NULL CHECK (length(command_sha256) = 64),
  command_id TEXT NOT NULL,
  activated_at TEXT NOT NULL,
  suspended_at TEXT,
  superseded_at TEXT,
  suspended_by_command_id TEXT,
  superseded_by_command_id TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (account_id, tenant_id, workspace_account_id, activation_version),
  UNIQUE (account_id, tenant_id, workspace_account_id, idempotency_key),
  FOREIGN KEY (map_id) REFERENCES customer_maps(id) ON DELETE RESTRICT,
  FOREIGN KEY (map_version_id) REFERENCES customer_map_versions(id) ON DELETE RESTRICT,
  FOREIGN KEY (handoff_id) REFERENCES customer_map_handoffs(id) ON DELETE RESTRICT,
  FOREIGN KEY (predecessor_activation_id) REFERENCES customer_control_activations(id) ON DELETE RESTRICT,
  FOREIGN KEY (rollback_target_activation_id) REFERENCES customer_control_activations(id) ON DELETE RESTRICT,
  FOREIGN KEY (command_id) REFERENCES customer_control_activation_commands(id) ON DELETE RESTRICT,
  FOREIGN KEY (suspended_by_command_id) REFERENCES customer_control_activation_commands(id) ON DELETE RESTRICT,
  FOREIGN KEY (superseded_by_command_id) REFERENCES customer_control_activation_commands(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX idx_customer_control_activation_current
  ON customer_control_activations(account_id, tenant_id, workspace_account_id)
  WHERE status IN ('active', 'suspended');

CREATE INDEX idx_customer_control_activation_source
  ON customer_control_activations(account_id, map_id, map_version, build_release_id);

CREATE TABLE customer_control_change_references (
  id TEXT PRIMARY KEY,
  activation_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  workspace_account_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('runtime_drift', 'incident')),
  external_reference TEXT NOT NULL,
  target TEXT NOT NULL CHECK (target IN ('map_revision', 'build_change_request')),
  status TEXT NOT NULL CHECK (status = 'proposed'),
  created_by TEXT NOT NULL,
  command_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (activation_id, account_id, tenant_id, workspace_account_id, kind, external_reference, target),
  FOREIGN KEY (activation_id) REFERENCES customer_control_activations(id) ON DELETE RESTRICT,
  FOREIGN KEY (command_id) REFERENCES customer_control_activation_commands(id) ON DELETE RESTRICT
);

CREATE TABLE customer_control_activation_outbox (
  id TEXT PRIMARY KEY,
  activation_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  workspace_account_id TEXT NOT NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('activated', 'superseded', 'suspended', 'rolled_back', 'change_proposed')),
  event_version INTEGER NOT NULL CHECK (event_version >= 1),
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  payload_sha256 TEXT NOT NULL CHECK (length(payload_sha256) = 64),
  command_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  published_at TEXT,
  UNIQUE (account_id, tenant_id, workspace_account_id, command_id),
  FOREIGN KEY (activation_id) REFERENCES customer_control_activations(id) ON DELETE RESTRICT,
  FOREIGN KEY (command_id) REFERENCES customer_control_activation_commands(id) ON DELETE RESTRICT
);

CREATE INDEX idx_customer_control_activation_outbox_pending
  ON customer_control_activation_outbox(account_id, tenant_id, workspace_account_id, created_at)
  WHERE published_at IS NULL;

CREATE TRIGGER customer_control_build_evidence_requires_accepted_source
BEFORE INSERT ON customer_control_build_evidence
WHEN NOT EXISTS (
  SELECT 1
  FROM customer_map_handoffs h
  INNER JOIN customer_maps m ON m.id = h.map_id AND m.account_id = h.account_id
  INNER JOIN customer_map_versions v
    ON v.id = NEW.map_version_id
   AND v.map_id = NEW.map_id
   AND v.account_id = NEW.account_id
   AND v.version = NEW.map_version
  WHERE h.id = NEW.handoff_id
    AND h.map_id = NEW.map_id
    AND h.account_id = NEW.account_id
    AND h.map_version = NEW.map_version
    AND h.status = 'accepted'
    AND h.resolved_at IS NOT NULL
    AND m.account_id = NEW.account_id
    AND m.tenant_id = NEW.tenant_id
    AND m.workspace_account_id = NEW.workspace_account_id
)
BEGIN
  SELECT RAISE(ABORT, 'Verified Build evidence requires an accepted Map handoff in the same tenant scope');
END;

CREATE TRIGGER customer_control_build_evidence_is_immutable
BEFORE UPDATE ON customer_control_build_evidence
BEGIN
  SELECT RAISE(ABORT, 'Verified Build evidence is immutable');
END;

CREATE TRIGGER customer_control_activation_requires_accepted_source
BEFORE INSERT ON customer_control_activations
WHEN NOT EXISTS (
  SELECT 1
  FROM customer_map_handoffs h
  INNER JOIN customer_maps m ON m.id = h.map_id AND m.account_id = h.account_id
  INNER JOIN customer_map_versions v
    ON v.id = NEW.map_version_id
   AND v.map_id = NEW.map_id
   AND v.account_id = NEW.account_id
   AND v.version = NEW.map_version
  WHERE h.id = NEW.handoff_id
    AND h.map_id = NEW.map_id
    AND h.account_id = NEW.account_id
    AND h.map_version = NEW.map_version
    AND h.status = 'accepted'
    AND h.resolved_at IS NOT NULL
    AND m.account_id = NEW.account_id
    AND m.tenant_id = NEW.tenant_id
    AND m.workspace_account_id = NEW.workspace_account_id
)
OR NOT EXISTS (
  SELECT 1
  FROM customer_control_build_evidence evidence
  WHERE evidence.account_id = NEW.account_id
    AND evidence.tenant_id = NEW.tenant_id
    AND evidence.workspace_account_id = NEW.workspace_account_id
    AND evidence.map_id = NEW.map_id
    AND evidence.map_version_id = NEW.map_version_id
    AND evidence.map_version = NEW.map_version
    AND evidence.map_canvas_sha256 = NEW.map_canvas_sha256
    AND evidence.handoff_id = NEW.handoff_id
    AND evidence.handoff_receipt_sha256 = NEW.handoff_receipt_sha256
    AND evidence.build_release_id = NEW.build_release_id
    AND evidence.build_manifest_sha256 = NEW.build_manifest_sha256
    AND evidence.build_artifact_set_sha256 = NEW.build_artifact_set_sha256
    AND evidence.build_acceptance_receipt_id = NEW.build_acceptance_receipt_id
    AND evidence.build_acceptance_receipt_sha256 = NEW.build_acceptance_receipt_sha256
    AND evidence.build_acceptance_status = NEW.build_acceptance_status
)
BEGIN
  SELECT RAISE(ABORT, 'Control activation requires verified accepted Map and Build evidence in the same tenant scope');
END;

CREATE TRIGGER customer_control_activation_requires_valid_lineage
BEFORE INSERT ON customer_control_activations
WHEN (
    NEW.activation_kind = 'initial'
    AND (
      NEW.activation_version <> 1
      OR NEW.predecessor_activation_id IS NOT NULL
      OR NEW.rollback_target_activation_id IS NOT NULL
      OR EXISTS (
        SELECT 1 FROM customer_control_activations current
        WHERE current.account_id = NEW.account_id
          AND current.tenant_id = NEW.tenant_id
          AND current.workspace_account_id = NEW.workspace_account_id
          AND current.status IN ('active', 'suspended')
      )
    )
  )
  OR (
    NEW.activation_kind IN ('supersession', 'rollback')
    AND NOT EXISTS (
      SELECT 1 FROM customer_control_activations predecessor
      WHERE predecessor.id = NEW.predecessor_activation_id
        AND predecessor.account_id = NEW.account_id
        AND predecessor.tenant_id = NEW.tenant_id
        AND predecessor.workspace_account_id = NEW.workspace_account_id
        AND predecessor.activation_version + 1 = NEW.activation_version
        AND predecessor.status = 'superseded'
        AND predecessor.superseded_by_command_id = NEW.command_id
    )
  )
  OR (NEW.activation_kind = 'supersession' AND NEW.rollback_target_activation_id IS NOT NULL)
  OR (NEW.activation_kind = 'rollback' AND NEW.rollback_target_activation_id IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Control activation lineage or current-version precondition failed');
END;

CREATE TRIGGER customer_control_rollback_copies_frozen_target
BEFORE INSERT ON customer_control_activations
WHEN NEW.activation_kind = 'rollback'
  AND NOT EXISTS (
    SELECT 1 FROM customer_control_activations target
    WHERE target.id = NEW.rollback_target_activation_id
      AND target.account_id = NEW.account_id
      AND target.tenant_id = NEW.tenant_id
      AND target.workspace_account_id = NEW.workspace_account_id
      AND target.activation_version < NEW.activation_version
      AND target.map_id = NEW.map_id
      AND target.map_version_id = NEW.map_version_id
      AND target.map_version = NEW.map_version
      AND target.map_canvas_sha256 = NEW.map_canvas_sha256
      AND target.handoff_id = NEW.handoff_id
      AND target.handoff_receipt_sha256 = NEW.handoff_receipt_sha256
      AND target.build_release_id = NEW.build_release_id
      AND target.build_manifest_sha256 = NEW.build_manifest_sha256
      AND target.build_artifact_set_sha256 = NEW.build_artifact_set_sha256
      AND target.build_acceptance_receipt_id = NEW.build_acceptance_receipt_id
      AND target.build_acceptance_receipt_sha256 = NEW.build_acceptance_receipt_sha256
      AND target.build_acceptance_status = NEW.build_acceptance_status
      AND target.policy_version = NEW.policy_version
      AND target.policy_sha256 = NEW.policy_sha256
      AND target.allowed_tools_json = NEW.allowed_tools_json
      AND target.allowed_resources_json = NEW.allowed_resources_json
      AND target.contract_sha256 = NEW.contract_sha256
  )
BEGIN
  SELECT RAISE(ABORT, 'Rollback must copy the exact frozen source and policy contract');
END;

CREATE TRIGGER customer_control_activation_state_transition
BEFORE UPDATE OF status, suspended_at, superseded_at, suspended_by_command_id, superseded_by_command_id
ON customer_control_activations
WHEN (
    OLD.status = 'active'
    AND NOT (
      (NEW.status = 'suspended' AND NEW.suspended_at IS NOT NULL AND NEW.suspended_by_command_id IS NOT NULL
       AND NEW.superseded_at IS NULL AND NEW.superseded_by_command_id IS NULL)
      OR
      (NEW.status = 'superseded' AND NEW.superseded_at IS NOT NULL AND NEW.superseded_by_command_id IS NOT NULL)
    )
  )
  OR (
    OLD.status = 'suspended'
    AND NOT (
      NEW.status = 'superseded' AND NEW.suspended_at IS OLD.suspended_at
      AND NEW.superseded_at IS NOT NULL AND NEW.superseded_by_command_id IS NOT NULL
    )
  )
  OR (OLD.status = 'superseded')
BEGIN
  SELECT RAISE(ABORT, 'Control activation state transition is invalid or incomplete');
END;

CREATE TRIGGER customer_control_activation_source_is_immutable
BEFORE UPDATE ON customer_control_activations
WHEN NEW.id IS NOT OLD.id
  OR NEW.activation_version IS NOT OLD.activation_version
  OR NEW.account_id IS NOT OLD.account_id
  OR NEW.tenant_id IS NOT OLD.tenant_id
  OR NEW.workspace_account_id IS NOT OLD.workspace_account_id
  OR NEW.map_id IS NOT OLD.map_id
  OR NEW.map_version_id IS NOT OLD.map_version_id
  OR NEW.map_version IS NOT OLD.map_version
  OR NEW.map_canvas_sha256 IS NOT OLD.map_canvas_sha256
  OR NEW.handoff_id IS NOT OLD.handoff_id
  OR NEW.handoff_receipt_sha256 IS NOT OLD.handoff_receipt_sha256
  OR NEW.build_release_id IS NOT OLD.build_release_id
  OR NEW.build_manifest_sha256 IS NOT OLD.build_manifest_sha256
  OR NEW.build_artifact_set_sha256 IS NOT OLD.build_artifact_set_sha256
  OR NEW.build_acceptance_receipt_id IS NOT OLD.build_acceptance_receipt_id
  OR NEW.build_acceptance_receipt_sha256 IS NOT OLD.build_acceptance_receipt_sha256
  OR NEW.build_acceptance_status IS NOT OLD.build_acceptance_status
  OR NEW.policy_version IS NOT OLD.policy_version
  OR NEW.policy_sha256 IS NOT OLD.policy_sha256
  OR NEW.allowed_tools_json IS NOT OLD.allowed_tools_json
  OR NEW.allowed_resources_json IS NOT OLD.allowed_resources_json
  OR NEW.contract_sha256 IS NOT OLD.contract_sha256
  OR NEW.entitlement_snapshot_json IS NOT OLD.entitlement_snapshot_json
  OR NEW.entitlement_snapshot_sha256 IS NOT OLD.entitlement_snapshot_sha256
  OR NEW.actor_subject IS NOT OLD.actor_subject
  OR NEW.actor_role IS NOT OLD.actor_role
  OR NEW.activation_kind IS NOT OLD.activation_kind
  OR NEW.predecessor_activation_id IS NOT OLD.predecessor_activation_id
  OR NEW.rollback_target_activation_id IS NOT OLD.rollback_target_activation_id
  OR NEW.idempotency_key IS NOT OLD.idempotency_key
  OR NEW.command_sha256 IS NOT OLD.command_sha256
  OR NEW.command_id IS NOT OLD.command_id
  OR NEW.activated_at IS NOT OLD.activated_at
  OR NEW.created_at IS NOT OLD.created_at
BEGIN
  SELECT RAISE(ABORT, 'Control activation source, authority, and policy contract are immutable');
END;

CREATE TRIGGER customer_control_change_reference_matches_scope
BEFORE INSERT ON customer_control_change_references
WHEN NOT EXISTS (
  SELECT 1 FROM customer_control_activations activation
  WHERE activation.id = NEW.activation_id
    AND activation.account_id = NEW.account_id
    AND activation.tenant_id = NEW.tenant_id
    AND activation.workspace_account_id = NEW.workspace_account_id
)
BEGIN
  SELECT RAISE(ABORT, 'Control change reference activation scope mismatch');
END;

CREATE TRIGGER customer_control_change_reference_is_immutable
BEFORE UPDATE ON customer_control_change_references
BEGIN
  SELECT RAISE(ABORT, 'Control change references are immutable proposals');
END;

CREATE TRIGGER customer_control_outbox_matches_scope_and_command
BEFORE INSERT ON customer_control_activation_outbox
WHEN NOT EXISTS (
  SELECT 1 FROM customer_control_activations activation
  WHERE activation.id = NEW.activation_id
    AND activation.account_id = NEW.account_id
    AND activation.tenant_id = NEW.tenant_id
    AND activation.workspace_account_id = NEW.workspace_account_id
    AND (
      (NEW.event_type IN ('activated', 'superseded', 'rolled_back') AND activation.command_id = NEW.command_id)
      OR (NEW.event_type = 'suspended' AND activation.suspended_by_command_id = NEW.command_id)
      OR (
        NEW.event_type = 'change_proposed'
        AND EXISTS (
          SELECT 1 FROM customer_control_change_references change_reference
          WHERE change_reference.activation_id = activation.id
            AND change_reference.command_id = NEW.command_id
        )
      )
    )
)
BEGIN
  SELECT RAISE(ABORT, 'Control projection must match activation scope and transition command');
END;

CREATE TRIGGER customer_control_outbox_payload_is_immutable
BEFORE UPDATE OF id, activation_id, account_id, tenant_id, workspace_account_id,
  event_type, event_version, payload_json, payload_sha256, command_id, created_at
ON customer_control_activation_outbox
BEGIN
  SELECT RAISE(ABORT, 'Control projection payload is immutable');
END;

CREATE TRIGGER customer_control_outbox_publish_is_monotonic
BEFORE UPDATE OF published_at ON customer_control_activation_outbox
WHEN OLD.published_at IS NOT NULL AND NEW.published_at IS NOT OLD.published_at
BEGIN
  SELECT RAISE(ABORT, 'Published Control projection cannot be replayed with a different receipt time');
END;
