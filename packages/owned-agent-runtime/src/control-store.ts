import {
  ControlRunConflictError,
  type ControlActivationAuthority,
  type ControlRunRecord,
  type ControlRunRepository,
  type ControlScope,
  type FrozenControlActivation
} from './control.js';

type ActivationRow = {
  id: string;
  activation_version: number;
  activation_kind: FrozenControlActivation['activationKind'];
  status: 'active';
  account_id: string;
  tenant_id: string;
  workspace_account_id: string;
  map_id: string;
  map_version_id: string;
  map_version: number;
  map_canvas_sha256: string;
  handoff_id: string;
  handoff_receipt_sha256: string;
  build_release_id: string;
  build_manifest_sha256: string;
  build_artifact_set_sha256: string;
  build_acceptance_receipt_id: string;
  build_acceptance_receipt_sha256: string;
  policy_version: string;
  policy_sha256: string;
  contract_sha256: string;
  entitlement_snapshot_sha256: string;
  allowed_tools_json: string;
  allowed_resources_json: string;
};

type RunRow = {
  id: string;
  account_id: string;
  tenant_id: string;
  workspace_account_id: string;
  activation_json: string;
  status: ControlRunRecord['status'];
  version: number;
  attempt: number;
  concurrency_key: string;
  requested_tools_json: string;
  requested_resources_json: string;
  pending_approval_kind: string | null;
  recovery: string | null;
  last_error: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type ReceiptRow = { receipt_json: string };
type CommandRow = { id: string; command_sha256: string; result_json: string | null };

function parseArray(value: string, label: string): string[] {
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) {
    throw new Error(`${label} is not a string array`);
  }
  return parsed;
}

function parseObject<T>(value: string, label: string): T {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} is not an object`);
  }
  return parsed as T;
}

export class D1ControlActivationAuthority implements ControlActivationAuthority {
  constructor(private readonly database: D1Database) {}

  async findActive(scope: ControlScope, activationId: string) {
    const row = await this.database
      .prepare(
        `SELECT id, activation_version, activation_kind, status,
                account_id, tenant_id, workspace_account_id,
                map_id, map_version_id, map_version, map_canvas_sha256,
                handoff_id, handoff_receipt_sha256,
                build_release_id, build_manifest_sha256, build_artifact_set_sha256,
                build_acceptance_receipt_id, build_acceptance_receipt_sha256,
                policy_version, policy_sha256, contract_sha256,
                entitlement_snapshot_sha256, allowed_tools_json, allowed_resources_json
         FROM customer_control_activations
         WHERE id = ?1 AND account_id = ?2 AND tenant_id = ?3
           AND workspace_account_id = ?4 AND status = 'active'`
      )
      .bind(
        activationId,
        scope.accountId,
        scope.tenantId,
        scope.workspaceAccountId
      )
      .first<ActivationRow>();
    if (!row) return undefined;
    return {
      id: row.id,
      activationVersion: row.activation_version,
      activationKind: row.activation_kind,
      status: 'active' as const,
      accountId: row.account_id,
      tenantId: row.tenant_id,
      workspaceAccountId: row.workspace_account_id,
      mapId: row.map_id,
      mapVersionId: row.map_version_id,
      mapVersion: row.map_version,
      mapCanvasSha256: row.map_canvas_sha256,
      handoffId: row.handoff_id,
      handoffReceiptSha256: row.handoff_receipt_sha256,
      buildReleaseId: row.build_release_id,
      buildManifestSha256: row.build_manifest_sha256,
      buildArtifactSetSha256: row.build_artifact_set_sha256,
      buildAcceptanceReceiptId: row.build_acceptance_receipt_id,
      buildAcceptanceReceiptSha256: row.build_acceptance_receipt_sha256,
      policyVersion: row.policy_version,
      policySha256: row.policy_sha256,
      contractSha256: row.contract_sha256,
      entitlementSnapshotSha256: row.entitlement_snapshot_sha256,
      allowedTools: parseArray(row.allowed_tools_json, 'Activation allowed tools'),
      allowedResources: parseArray(row.allowed_resources_json, 'Activation allowed resources')
    } satisfies FrozenControlActivation;
  }
}

export class D1ControlRunRepository implements ControlRunRepository {
  constructor(private readonly database: D1Database) {}

  private command(scope: ControlScope, idempotencyKey: string) {
    return this.database
      .prepare(
        `SELECT id, command_sha256, result_json
         FROM control_run_commands
         WHERE account_id = ?1 AND tenant_id = ?2 AND workspace_account_id = ?3
           AND idempotency_key = ?4`
      )
      .bind(scope.accountId, scope.tenantId, scope.workspaceAccountId, idempotencyKey)
      .first<CommandRow>();
  }

  async find(scope: ControlScope, runId: string): Promise<ControlRunRecord | undefined> {
    const row = await this.database
      .prepare(
        `SELECT id, account_id, tenant_id, workspace_account_id, activation_json,
                status, version, attempt, concurrency_key, requested_tools_json,
                requested_resources_json, pending_approval_kind, recovery, last_error,
                created_by, created_at, updated_at
         FROM control_runs
         WHERE id = ?1 AND account_id = ?2 AND tenant_id = ?3 AND workspace_account_id = ?4`
      )
      .bind(runId, scope.accountId, scope.tenantId, scope.workspaceAccountId)
      .first<RunRow>();
    if (!row) return undefined;
    const receiptResult = await this.database
      .prepare(
        `SELECT receipt_json FROM control_run_receipts
         WHERE run_id = ?1 AND account_id = ?2 AND tenant_id = ?3 AND workspace_account_id = ?4
         ORDER BY event_index`
      )
      .bind(runId, scope.accountId, scope.tenantId, scope.workspaceAccountId)
      .all<ReceiptRow>();
    return {
      id: row.id,
      accountId: row.account_id,
      tenantId: row.tenant_id,
      workspaceAccountId: row.workspace_account_id,
      activation: parseObject(row.activation_json, 'Frozen activation'),
      status: row.status,
      version: row.version,
      attempt: row.attempt,
      concurrencyKey: row.concurrency_key,
      requestedTools: parseArray(row.requested_tools_json, 'Requested tools'),
      requestedResources: parseArray(row.requested_resources_json, 'Requested resources'),
      pendingApprovalKind: row.pending_approval_kind,
      recovery: row.recovery,
      lastError: row.last_error,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      receipts: receiptResult.results.map((receipt) =>
        parseObject(receipt.receipt_json, 'Control run receipt')
      )
    };
  }

  async replay(scope: ControlScope, idempotencyKey: string, commandSha256: string) {
    const row = await this.command(scope, idempotencyKey);
    return row ? this.currentReplay(scope, row, commandSha256) : undefined;
  }

  async apply(input: {
    scope: ControlScope;
    idempotencyKey: string;
    commandSha256: string;
    expectedVersion: number | null;
    run: ControlRunRecord;
  }) {
    const replay = await this.command(input.scope, input.idempotencyKey);
    if (replay) {
      return {
        run: await this.currentReplay(input.scope, replay, input.commandSha256),
        applied: false
      };
    }

    const commandId = crypto.randomUUID();
    const commandInsert = this.database
      .prepare(
        `INSERT INTO control_run_commands
          (id, account_id, tenant_id, workspace_account_id, run_id,
           idempotency_key, command_sha256, result_json, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, NULL, ?8)
         ON CONFLICT(account_id, tenant_id, workspace_account_id, idempotency_key)
         DO NOTHING`
      )
      .bind(
        commandId,
        input.scope.accountId,
        input.scope.tenantId,
        input.scope.workspaceAccountId,
        input.run.id,
        input.idempotencyKey,
        input.commandSha256,
        input.run.updatedAt
      );

    const statements: D1PreparedStatement[] = [commandInsert];
    if (input.expectedVersion === null) {
      statements.push(
        this.database
          .prepare(
            `INSERT INTO control_runs
              (id, account_id, tenant_id, workspace_account_id, activation_id,
               activation_version, activation_json, status, version, attempt,
               concurrency_key, requested_tools_json, requested_resources_json,
               pending_approval_kind, recovery, last_error, created_by, created_at, updated_at)
             SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13,
                    ?14, ?15, ?16, ?17, ?18, ?19
             WHERE EXISTS (SELECT 1 FROM control_run_commands WHERE id = ?20)`
          )
          .bind(
            input.run.id,
            input.scope.accountId,
            input.scope.tenantId,
            input.scope.workspaceAccountId,
            input.run.activation.id,
            input.run.activation.activationVersion,
            JSON.stringify(input.run.activation),
            input.run.status,
            input.run.version,
            input.run.attempt,
            input.run.concurrencyKey,
            JSON.stringify(input.run.requestedTools),
            JSON.stringify(input.run.requestedResources),
            input.run.pendingApprovalKind,
            input.run.recovery,
            input.run.lastError,
            input.run.createdBy,
            input.run.createdAt,
            input.run.updatedAt,
            commandId
          )
      );
    } else {
      statements.push(
        this.database
          .prepare(
            `UPDATE control_runs SET
               status = ?1, version = ?2, attempt = ?3,
               pending_approval_kind = ?4, recovery = ?5, last_error = ?6,
               updated_at = ?7
             WHERE id = ?8 AND account_id = ?9 AND tenant_id = ?10
               AND workspace_account_id = ?11 AND version = ?12
               AND EXISTS (SELECT 1 FROM control_run_commands WHERE id = ?13)`
          )
          .bind(
            input.run.status,
            input.run.version,
            input.run.attempt,
            input.run.pendingApprovalKind,
            input.run.recovery,
            input.run.lastError,
            input.run.updatedAt,
            input.run.id,
            input.scope.accountId,
            input.scope.tenantId,
            input.scope.workspaceAccountId,
            input.expectedVersion,
            commandId
          )
      );
    }

    const serializedResult = JSON.stringify(input.run);
    statements.push(
      this.database
        .prepare(
          `UPDATE control_run_commands
           SET result_json = CASE
             WHEN changes() = 1 THEN ?1
             ELSE '{"error":"concurrent_update"}'
           END
           WHERE id = ?2`
        )
        .bind(serializedResult, commandId)
    );

    for (const receipt of input.run.receipts) {
      statements.push(
        this.database
          .prepare(
            `INSERT INTO control_run_receipts
              (id, run_id, account_id, tenant_id, workspace_account_id, event_index,
               status, receipt_json, receipt_sha256, previous_receipt_sha256, created_at)
             SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11
             WHERE EXISTS (
               SELECT 1 FROM control_run_commands
               WHERE id = ?12 AND result_json = ?13
             )
             ON CONFLICT(run_id, event_index) DO NOTHING`
          )
          .bind(
            receipt.id,
            input.run.id,
            input.scope.accountId,
            input.scope.tenantId,
            input.scope.workspaceAccountId,
            receipt.eventIndex,
            receipt.status,
            JSON.stringify(receipt),
            receipt.receiptSha256,
            receipt.previousReceiptSha256,
            receipt.createdAt,
            commandId,
            serializedResult
          )
      );
    }

    try {
      await this.database.batch(statements);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/UNIQUE constraint|state transition|version|immutable/i.test(message)) {
        throw new ControlRunConflictError('Control run changed concurrently or conflicts with an active run');
      }
      throw error;
    }

    const stored = await this.command(input.scope, input.idempotencyKey);
    if (!stored) throw new Error('Control run command did not persist');
    return {
      run: await this.currentReplay(input.scope, stored, input.commandSha256),
      applied: stored.id === commandId
    };
  }

  private async currentReplay(
    scope: ControlScope,
    row: CommandRow,
    commandSha256: string
  ): Promise<ControlRunRecord> {
    const result = this.replayResult(row, commandSha256);
    if (result.status !== 'running') return result;
    return (await this.find(scope, result.id)) ?? result;
  }

  private replayResult(row: CommandRow, commandSha256: string): ControlRunRecord {
    if (row.command_sha256 !== commandSha256) {
      throw new ControlRunConflictError('Idempotency key was already used for another command');
    }
    if (!row.result_json) throw new ControlRunConflictError('Control run command is still pending');
    const result = parseObject<ControlRunRecord | { error: string }>(row.result_json, 'Command result');
    if ('error' in result) throw new ControlRunConflictError('Control run changed concurrently');
    return result;
  }
}
