import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const migrationRoot = new URL('../migrations/', import.meta.url);

function sqlite(database: string, sql: string): string {
  return execFileSync('sqlite3', [database], { input: sql, encoding: 'utf8' }).trim();
}

test('Control activation migration pins accepted sources and immutable projection evidence', () => {
  const directory = mkdtempSync(join(tmpdir(), 'control-activation-'));
  const database = join(directory, 'test.sqlite');
  try {
    sqlite(
      database,
      readFileSync(new URL('0035_customer_map_workspaces.sql', migrationRoot), 'utf8')
    );
    sqlite(
      database,
      readFileSync(new URL('0037_customer_map_handoff_resolution.sql', migrationRoot), 'utf8')
    );
    sqlite(
      database,
      readFileSync(new URL('0039_customer_control_activations.sql', migrationRoot), 'utf8')
    );
    sqlite(
      database,
      `INSERT INTO customer_maps
			 (id, title, account_id, tenant_id, workspace_account_id, created_by, current_version, review_state, created_at, updated_at)
			 VALUES ('map_a', 'Approved map', 'acct_a', 'tenant_a', 'workspace_a', 'identity|alice', 1, 'approved', '2026-07-18T00:00:00.000Z', '2026-07-18T00:00:00.000Z');
			 INSERT INTO customer_map_versions
			 (id, map_id, account_id, version, canvas_json, message, created_by, created_at)
			 VALUES ('map_version_a', 'map_a', 'acct_a', 1, '{"nodes":[],"edges":[]}', NULL, 'identity|alice', '2026-07-18T00:00:00.000Z');
			 INSERT INTO customer_map_handoffs
			 (id, map_id, account_id, map_version, status, payload_json, created_by, created_at, accepted_at, resolved_at, resolved_by)
			 VALUES ('handoff_a', 'map_a', 'acct_a', 1, 'accepted', '{}', 'identity|alice', '2026-07-18T00:10:00.000Z', '2026-07-18T00:20:00.000Z', '2026-07-18T00:20:00.000Z', 'identity|operator');
			 INSERT INTO customer_map_handoffs
			 (id, map_id, account_id, map_version, status, payload_json, created_by, created_at)
			 VALUES ('handoff_prepared', 'map_a', 'acct_a', 1, 'prepared', '{}', 'identity|alice', '2026-07-18T00:30:00.000Z');`
    );
    sqlite(
      database,
      `INSERT INTO customer_control_build_evidence (
			 id, account_id, tenant_id, workspace_account_id,
			 map_id, map_version_id, map_version, map_canvas_sha256, handoff_id, handoff_receipt_sha256,
			 build_release_id, build_manifest_sha256, build_artifact_set_sha256,
			 build_acceptance_receipt_id, build_acceptance_receipt_sha256, build_acceptance_status,
			 verified_by, verified_at
			) VALUES (
			 'build_evidence_a', 'acct_a', 'tenant_a', 'workspace_a',
			 'map_a', 'map_version_a', 1, '${'1'.repeat(64)}', 'handoff_a', '${'2'.repeat(64)}',
			 'release_a', '${'3'.repeat(64)}', '${'4'.repeat(64)}',
			 'acceptance_a', '${'5'.repeat(64)}', 'accepted',
			 'identity|operator', '2026-07-18T00:50:00.000Z'
			);`
    );

    const insert = (id: string, handoffId: string, version: number, status = 'active') =>
      `INSERT INTO customer_control_activation_commands
			 (id, account_id, tenant_id, workspace_account_id, idempotency_key, command_type, command_sha256, created_at)
			 VALUES ('cmd_${id}', 'acct_a', 'tenant_a', 'workspace_a', 'key_${id}', 'create_version', '${'9'.repeat(64)}', '2026-07-18T01:00:00.000Z');
			 INSERT INTO customer_control_activations (
			 id, activation_version, account_id, tenant_id, workspace_account_id,
			 map_id, map_version_id, map_version, map_canvas_sha256, handoff_id, handoff_receipt_sha256,
			 build_release_id, build_manifest_sha256, build_artifact_set_sha256,
			 build_acceptance_receipt_id, build_acceptance_receipt_sha256, build_acceptance_status,
			 policy_version, policy_sha256, allowed_tools_json, allowed_resources_json, contract_sha256,
			 entitlement_snapshot_json, entitlement_snapshot_sha256, actor_subject, actor_role,
			 status, activation_kind, idempotency_key, command_sha256, command_id, activated_at, created_at
			) VALUES (
			 '${id}', ${version}, 'acct_a', 'tenant_a', 'workspace_a',
			 'map_a', 'map_version_a', 1, '${'1'.repeat(64)}', '${handoffId}', '${'2'.repeat(64)}',
			 'release_a', '${'3'.repeat(64)}', '${'4'.repeat(64)}',
			 'acceptance_a', '${'5'.repeat(64)}', 'accepted',
			 'policy@1', '${'6'.repeat(64)}', '["tool.read"]', '["resource://map"]', '${'7'.repeat(64)}',
			 '{"allowed":true}', '${'8'.repeat(64)}', 'identity|operator', 'agency_operator',
			 '${status}', 'initial', 'key_${id}', '${'9'.repeat(64)}', 'cmd_${id}', '2026-07-18T01:00:00.000Z', '2026-07-18T01:00:00.000Z'
			);`;

    assert.throws(
      () => sqlite(database, insert('activation_bad', 'handoff_prepared', 1)),
      /verified accepted Map and Build evidence/i
    );
    sqlite(database, insert('activation_a', 'handoff_a', 1));
    assert.equal(sqlite(database, 'SELECT COUNT(*) FROM customer_control_activations;'), '1');
    assert.throws(
      () =>
        sqlite(
          database,
          "UPDATE customer_control_build_evidence SET build_manifest_sha256 = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' WHERE id = 'build_evidence_a';"
        ),
      /immutable/i
    );
    assert.throws(
      () => sqlite(database, insert('activation_parallel', 'handoff_a', 2)),
      /current-version precondition|unique/i
    );
    assert.throws(
      () =>
        sqlite(
          database,
          "UPDATE customer_control_activations SET policy_sha256 = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' WHERE id = 'activation_a';"
        ),
      /immutable/i
    );

    sqlite(
      database,
      `INSERT INTO customer_control_activation_outbox
			 (id, activation_id, account_id, tenant_id, workspace_account_id, event_type, event_version, payload_json, payload_sha256, command_id, created_at)
			 VALUES ('event_a', 'activation_a', 'acct_a', 'tenant_a', 'workspace_a', 'activated', 1, '{"activationId":"activation_a"}', '${'a'.repeat(64)}', 'cmd_activation_a', '2026-07-18T01:00:00.000Z');`
    );
    assert.throws(
      () =>
        sqlite(
          database,
          `INSERT INTO customer_control_activation_outbox
			 (id, activation_id, account_id, tenant_id, workspace_account_id, event_type, event_version, payload_json, payload_sha256, command_id, created_at)
			 VALUES ('event_b', 'activation_a', 'acct_a', 'tenant_a', 'workspace_a', 'activated', 1, '{}', '${'b'.repeat(64)}', 'cmd_activation_a', '2026-07-18T01:01:00.000Z');`
        ),
      /unique/i
    );
    assert.throws(
      () =>
        sqlite(
          database,
          "UPDATE customer_control_activation_outbox SET payload_json = '{}' WHERE id = 'event_a';"
        ),
      /immutable/i
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
