import {
  RuntimeValidationError,
  verifyWorkflowRuntimeRun,
  workflowRuntimeCheckpointHash,
  type WorkflowRuntimeCheckpointStore,
  type RuntimeDigest,
  type WorkflowRuntimeManifest,
  type WorkflowRuntimeRun,
  type WorkflowRuntimeScope
} from '@createsomething/workflow-runtime';
import {
  WORKFLOW_RUNTIME_APPROVAL_COMMAND,
  type WorkflowRuntimeApprovalSurface,
  type WorkflowRuntimeApprovalSurfaceAuthority,
  type WorkflowRuntimeManifestAuthority
} from './workflow-runtime-manifest-authority.js';

type RuntimeRow = { run_json: string };
type CommandRow = {
  id: string;
  run_id: string;
  command_sha256: string;
  result_json: string | null;
};

type WorkflowRuntimeApprovalContextV1 = {
  schema: 'create-something/workflow-runtime-approval-context@1';
  version: 1;
  scope: WorkflowRuntimeScope;
  runVersion: number;
  stepVersion: number;
  attempt: { type: 'no_capability_attempt' };
  activation: WorkflowRuntimeRun['activation'];
  artifactManifestSha256: WorkflowRuntimeRun['artifactManifestSha256'];
  runtimeManifestSha256: WorkflowRuntimeRun['runtimeManifestSha256'];
  workflow: WorkflowRuntimeManifest['workflow'];
  actionId: string;
  evidenceDigest: RuntimeDigest;
};

type WorkflowRuntimeApprovalContextV2 = Omit<
  WorkflowRuntimeApprovalContextV1,
  'schema' | 'version'
> & {
  schema: 'create-something/workflow-runtime-approval-context@2';
  version: 2;
  registration: NonNullable<WorkflowRuntimeRun['registration']>;
  runtimeManifestSchema: WorkflowRuntimeManifest['schemaVersion'];
};

type WorkflowRuntimeApprovalContext =
  | WorkflowRuntimeApprovalContextV1
  | WorkflowRuntimeApprovalContextV2;

const COMMAND_DIGEST = /^[a-f0-9]{64}$/;
const RUNTIME_DIGEST = /^sha256:[a-f0-9]{64}$/;
const LIVE_PARENT_STATUSES = "'queued', 'running', 'waiting_for_approval'";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parsedRun(value: string, label: string): WorkflowRuntimeRun {
  const parsed: unknown = JSON.parse(value);
  if (
    !isRecord(parsed) ||
    (parsed.schema !== 'workflow_runtime_run.v0.1' && parsed.schema !== 'workflow_runtime_run.v0.2')
  ) {
    throw new RuntimeValidationError('INVALID_STATE', `${label} is not a Workflow Runtime run`);
  }
  return parsed as unknown as WorkflowRuntimeRun;
}

function commandDigest(value: string): string {
  if (!COMMAND_DIGEST.test(value)) {
    throw new RuntimeValidationError(
      'INVALID_EVENT',
      'Workflow Runtime command digest must be a sha256 hex digest'
    );
  }
  return value;
}

/**
 * The Control-owned durable port for the deliberately zero-write runtime.
 * It has no executor dependency: it only persists the verified checkpoint,
 * command replay result, and receipt chain supplied by the runtime core.
 */
export class D1WorkflowRuntimeCheckpointStore implements WorkflowRuntimeCheckpointStore {
  constructor(
    private readonly database: D1Database,
    private readonly manifests?: WorkflowRuntimeManifestAuthority,
    private readonly approvalSurfaces?: WorkflowRuntimeApprovalSurfaceAuthority
  ) {}

  async find(scope: WorkflowRuntimeScope, runId: string): Promise<WorkflowRuntimeRun | undefined> {
    const row = await this.database
      .prepare(
        `SELECT runtime.run_json
         FROM control_workflow_runtime_runs runtime
         JOIN control_runs control ON control.id = runtime.run_id
         WHERE runtime.run_id = ?1 AND control.account_id = ?2 AND control.tenant_id = ?3
           AND control.workspace_account_id = ?4`
      )
      .bind(runId, scope.accountId, scope.tenantId, scope.workspaceAccountId)
      .first<RuntimeRow>();
    return row ? parsedRun(row.run_json, 'Stored workflow checkpoint') : undefined;
  }

  async replay(
    scope: WorkflowRuntimeScope,
    idempotencyKey: string,
    commandSha256: string
  ): Promise<WorkflowRuntimeRun | undefined> {
    const row = await this.command(scope, idempotencyKey);
    return row?.result_json ? this.replayResult(row, commandSha256) : undefined;
  }

  async apply(input: Parameters<WorkflowRuntimeCheckpointStore['apply']>[0]) {
    const commandSha256 = commandDigest(input.commandDigest);
    const existing = await this.command(input.scope, input.idempotencyKey);
    if (existing?.result_json) {
      return { run: this.replayResult(existing, input.commandDigest), applied: false };
    }
    if (existing && existing.command_sha256 !== commandSha256) {
      throw new RuntimeValidationError(
        'INVALID_EVENT',
        'Idempotency key was already used for another command'
      );
    }
    if (existing && existing.run_id !== input.run.id) {
      throw new RuntimeValidationError(
        'INVALID_EVENT',
        'Idempotency key is pending for another Workflow Runtime run'
      );
    }
    if (!(await this.parentAuthorizes(input.scope, input.run.id))) {
      throw new RuntimeValidationError(
        'INVALID_STATE',
        'Runtime parent Control run no longer authorizes progress'
      );
    }

    const manifest = await this.trustedManifest(input);
    const approvalContexts = await this.approvalContexts(input, manifest);
    const approvalAttestations = await this.approvalAttestations(input, manifest);
    const registration = input.run.registration;
    if (
      input.run.schema === 'workflow_runtime_run.v0.2' &&
      (!registration || !input.run.runtimeManifestSchema)
    ) {
      throw new RuntimeValidationError(
        'INVALID_STATE',
        'Registration-bound Workflow Runtime checkpoint is missing registration or manifest schema'
      );
    }

    const serialized = JSON.stringify(input.run);
    const issuedAt = input.run.receipts.at(-1)?.createdAt;
    const lastReceipt = input.run.receipts.at(-1);
    if (!issuedAt || !lastReceipt) {
      throw new RuntimeValidationError(
        'INVALID_STATE',
        'Workflow Runtime checkpoint requires a receipt'
      );
    }
    const commandId = existing?.id ?? crypto.randomUUID();
    const statements: D1PreparedStatement[] = [];

    if (input.expectedVersion === null) {
      statements.push(
        this.database
          .prepare(
            `INSERT INTO control_workflow_runtime_runs
             (run_id, artifact_manifest_sha256, runtime_manifest_sha256, status, version,
               run_json, created_at, updated_at, admission_command_id)
             SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7, ?17
             WHERE EXISTS (
               SELECT 1 FROM control_runs
               WHERE id = ?1 AND account_id = ?8 AND tenant_id = ?9 AND workspace_account_id = ?10
                 AND activation_id = ?11 AND activation_version = ?12
                 AND json_extract(activation_json, '$.policySha256') = substr(?13, 8)
                 AND json_extract(activation_json, '$.buildManifestSha256') = substr(?2, 8)
                 AND (
                   (?14 IS NULL AND json_extract(?6, '$.schema') = 'workflow_runtime_run.v0.1')
                   OR (
                     ?14 IS NOT NULL
                     AND json_extract(?6, '$.schema') = 'workflow_runtime_run.v0.2'
                     AND json_extract(activation_json, '$.buildReleaseId') = ?14
                     AND json_extract(activation_json, '$.contractSha256') = substr(?15, 8)
                     AND json_extract(activation_json, '$.policySha256') = substr(?16, 8)
                   )
                 )
                 AND status IN (${LIVE_PARENT_STATUSES})
             )`
          )
          .bind(
            input.run.id,
            input.run.artifactManifestSha256,
            input.run.runtimeManifestSha256,
            input.run.status,
            input.run.version,
            serialized,
            issuedAt,
            input.scope.accountId,
            input.scope.tenantId,
            input.scope.workspaceAccountId,
            input.run.activation.id,
            input.run.activation.version,
            input.run.activation.policySha256,
            registration?.buildReleaseId ?? null,
            registration?.contractSha256 ?? null,
            registration?.runtimePolicySha256 ?? null,
            commandId
          )
      );
    }

    if (existing) {
      statements.push(
        this.database
          .prepare(
            `UPDATE control_workflow_runtime_commands
             SET expected_version = ?1
             WHERE id = ?2 AND command_sha256 = ?3 AND result_json IS NULL
               AND EXISTS (
                 SELECT 1 FROM control_runs control
                 WHERE control.id = control_workflow_runtime_commands.run_id
                   AND control.status IN (${LIVE_PARENT_STATUSES})
               )`
          )
          .bind(input.expectedVersion, commandId, commandSha256)
      );
    } else {
      statements.push(
        this.database
          .prepare(
            `INSERT INTO control_workflow_runtime_commands
            (id, run_id, account_id, tenant_id, workspace_account_id, idempotency_key,
             command_sha256, expected_version, result_json, created_at)
           SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, NULL, ?9
           WHERE EXISTS (
             SELECT 1 FROM control_workflow_runtime_runs runtime
             JOIN control_runs control ON control.id = runtime.run_id
             WHERE runtime.run_id = ?2 AND control.account_id = ?3
               AND control.tenant_id = ?4 AND control.workspace_account_id = ?5
               AND control.status IN (${LIVE_PARENT_STATUSES})
               AND (?8 IS NOT NULL OR runtime.admission_command_id = ?10)
           )`
          )
          .bind(
            commandId,
            input.run.id,
            input.scope.accountId,
            input.scope.tenantId,
            input.scope.workspaceAccountId,
            input.idempotencyKey,
            commandSha256,
            input.expectedVersion,
            issuedAt,
            commandId
          )
      );
    }

    if (input.expectedVersion !== null) {
      statements.push(
        this.database
          .prepare(
            `UPDATE control_workflow_runtime_runs SET
               status = ?1, version = ?2, run_json = ?3, updated_at = ?4
             WHERE run_id = ?5 AND version = ?6
               AND EXISTS (SELECT 1 FROM control_workflow_runtime_commands WHERE id = ?7)
               AND EXISTS (
                 SELECT 1 FROM control_runs control
                 WHERE control.id = control_workflow_runtime_runs.run_id
                   AND control.status IN (${LIVE_PARENT_STATUSES})
               )`
          )
          .bind(
            input.run.status,
            input.run.version,
            serialized,
            issuedAt,
            input.run.id,
            input.expectedVersion,
            commandId
          )
      );
    }

    statements.push(
      this.database
        .prepare(
          `UPDATE control_workflow_runtime_commands
           SET result_json = CASE
             WHEN changes() = 1 THEN ?1
             ELSE NULL
           END
           WHERE id = ?2`
        )
        .bind(serialized, commandId)
    );

    const approvalStatements: D1PreparedStatement[] = [];
    const approvalAttestationStatements: D1PreparedStatement[] = [];
    for (const step of input.run.steps) {
      statements.push(
        this.database
          .prepare(
            `INSERT INTO control_workflow_runtime_steps (run_id, step_id, status, version, step_json)
             SELECT ?1, ?2, ?3, ?4, ?5
             WHERE EXISTS (
               SELECT 1 FROM control_workflow_runtime_commands
               WHERE id = ?6 AND result_json = ?7
             )
             ON CONFLICT(run_id, step_id) DO UPDATE SET
               status = excluded.status, version = excluded.version, step_json = excluded.step_json
             WHERE excluded.version > control_workflow_runtime_steps.version`
          )
          .bind(
            input.run.id,
            step.id,
            step.status,
            step.version,
            JSON.stringify(step),
            commandId,
            serialized
          )
      );
      for (const attempt of step.attempts) {
        statements.push(
          this.database
            .prepare(
              `INSERT INTO control_workflow_runtime_attempts
                (run_id, step_id, attempt_id, status, attempt_json, created_at)
               SELECT ?1, ?2, ?3, ?4, ?5, ?6
               WHERE EXISTS (
                 SELECT 1 FROM control_workflow_runtime_commands
                 WHERE id = ?7 AND result_json = ?8
               )
               ON CONFLICT(run_id, step_id, attempt_id) DO UPDATE SET
                 status = excluded.status, attempt_json = excluded.attempt_json
               WHERE control_workflow_runtime_attempts.status = 'prepared'`
            )
            .bind(
              input.run.id,
              step.id,
              attempt.id,
              attempt.status,
              JSON.stringify(attempt),
              attempt.createdAt,
              commandId,
              serialized
            )
        );
      }
      if (step.approval) {
        const approvalContext = approvalContexts.get(step.approval.id);
        if (!approvalContext) {
          throw new RuntimeValidationError(
            'INVALID_STATE',
            'Workflow Runtime approval context is missing'
          );
        }
        const approvalAttestation = approvalAttestations.get(step.approval.id);
        if (input.run.schema === 'workflow_runtime_run.v0.2' && !approvalAttestation) {
          throw new RuntimeValidationError(
            'INVALID_STATE',
            'Workflow Runtime approval is missing a trusted approval-surface attestation'
          );
        }
        approvalStatements.push(
          this.database
            .prepare(
              `INSERT INTO control_workflow_runtime_approvals
                (approval_id, run_id, step_id, binding_sha256, decision, approval_json,
                 approval_context_json, created_at, decided_at)
               SELECT ?1, ?2, ?3, ?4, NULL, ?5, ?6, ?7, NULL
               WHERE EXISTS (
                 SELECT 1 FROM control_workflow_runtime_commands
                 WHERE id = ?8 AND result_json = ?9
               )
               ON CONFLICT(approval_id) DO NOTHING`
            )
            .bind(
              step.approval.id,
              input.run.id,
              step.id,
              step.approval.bindingSha256,
              JSON.stringify(step.approval),
              JSON.stringify(approvalContext),
              issuedAt,
              commandId,
              serialized
            )
        );
        if (approvalAttestation) {
          approvalAttestationStatements.push(
            this.database
              .prepare(
                `INSERT INTO control_workflow_runtime_approval_attestations
                  (approval_id, run_id, step_id, approval_surface_schema, approval_surface_sha256,
                   approval_command_schema, approval_command_version, decision_actor_role, created_at)
                 SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, NULL, ?8
                 WHERE EXISTS (
                   SELECT 1 FROM control_workflow_runtime_commands
                   WHERE id = ?9 AND result_json = ?10
                 )
                   AND EXISTS (
                     SELECT 1 FROM control_workflow_runtime_approvals
                     WHERE approval_id = ?1 AND run_id = ?2 AND step_id = ?3
                   )
                 ON CONFLICT(approval_id) DO NOTHING`
              )
              .bind(
                step.approval.id,
                input.run.id,
                step.id,
                approvalAttestation.approvalSurface.schemaVersion,
                approvalAttestation.approvalSurface.sha256,
                WORKFLOW_RUNTIME_APPROVAL_COMMAND.schema,
                WORKFLOW_RUNTIME_APPROVAL_COMMAND.version,
                issuedAt,
                commandId,
                serialized
              )
          );
        }
      }
    }

    for (const receipt of input.run.receipts) {
      statements.push(
        this.database
          .prepare(
            `INSERT INTO control_workflow_runtime_receipts
              (id, run_id, event_index, receipt_json, receipt_sha256, previous_receipt_sha256, created_at)
             SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7
             WHERE EXISTS (
               SELECT 1 FROM control_workflow_runtime_commands
               WHERE id = ?8 AND result_json = ?9
             )
             ON CONFLICT(run_id, event_index) DO NOTHING`
          )
          .bind(
            receipt.id,
            input.run.id,
            receipt.eventIndex,
            JSON.stringify(receipt),
            receipt.receiptSha256,
            receipt.previousReceiptSha256,
            receipt.createdAt,
            commandId,
            serialized
          )
      );
      if (receipt.eventType === 'approval_decided' && receipt.stepId) {
        const decision =
          receipt.outcome === 'exact approval accepted'
            ? 'approved'
            : receipt.outcome === 'exact approval rejected'
              ? 'rejected'
              : null;
        if (decision) {
          statements.push(
            this.database
              .prepare(
                `UPDATE control_workflow_runtime_approvals SET decision = ?1, decided_at = ?2
                 WHERE run_id = ?3 AND step_id = ?4 AND decision IS NULL
                   AND EXISTS (
                     SELECT 1 FROM control_workflow_runtime_commands
                     WHERE id = ?5 AND result_json = ?6
                   )`
              )
              .bind(
                decision,
                receipt.createdAt,
                input.run.id,
                receipt.stepId,
                commandId,
                serialized
              )
          );
          const attestedApprovalDecision =
            input.run.schema === 'workflow_runtime_run.v0.2' &&
            ('actorRole' in receipt || 'approvalSurfaceSha256' in receipt);
          if (attestedApprovalDecision) {
            const actorRole = receipt.actorRole;
            if (!actorRole) {
              throw new RuntimeValidationError(
                'INVALID_STATE',
                'Workflow Runtime approval decision is missing its verified Identity role'
              );
            }
            statements.push(
              this.database
                .prepare(
                  `UPDATE control_workflow_runtime_approval_attestations
                   SET decision_actor_role = ?1
                   WHERE run_id = ?2 AND step_id = ?3 AND decision_actor_role IS NULL
                     AND EXISTS (
                       SELECT 1 FROM control_workflow_runtime_approvals
                       WHERE run_id = ?2 AND step_id = ?3 AND decision = ?4 AND decided_at = ?5
                     )
                     AND EXISTS (
                       SELECT 1 FROM control_workflow_runtime_receipts
                       WHERE run_id = ?2 AND event_index = ?6
                         AND json_extract(receipt_json, '$.eventType') = 'approval_decided'
                         AND json_extract(receipt_json, '$.stepId') = ?3
                         AND json_extract(receipt_json, '$.actorRole') = ?1
                         AND created_at = ?5
                     )`
                )
                .bind(
                  actorRole,
                  input.run.id,
                  receipt.stepId,
                  decision,
                  receipt.createdAt,
                  receipt.eventIndex
                )
            );
          }
        }
      }
    }
    // The immutable wait receipt is the D1-side authority for the approval
    // context. Persist it before a new context can reference it.
    statements.push(...approvalStatements);
    statements.push(...approvalAttestationStatements);

    const checkpointSha256 = await workflowRuntimeCheckpointHash(input.run);
    statements.push(
      this.database
        .prepare(
          `INSERT INTO control_workflow_runtime_checkpoints
            (id, run_id, run_version, run_sha256, receipt_sha256, checkpoint_json, created_at)
           SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7
           WHERE EXISTS (
             SELECT 1 FROM control_workflow_runtime_commands
             WHERE id = ?8 AND result_json = ?9
           )
           ON CONFLICT(run_id, run_version) DO NOTHING`
        )
        .bind(
          `checkpoint:${input.run.id}:v${input.run.version}`,
          input.run.id,
          input.run.version,
          checkpointSha256,
          lastReceipt.receiptSha256,
          serialized,
          issuedAt,
          commandId,
          serialized
        )
    );

    try {
      await this.database.batch(statements);
    } catch (error) {
      const replay = await this.command(input.scope, input.idempotencyKey);
      if (replay) return { run: this.replayResult(replay, input.commandDigest), applied: false };
      const message = error instanceof Error ? error.message : String(error);
      if (/UNIQUE constraint|FOREIGN KEY|immutable|version/i.test(message)) {
        throw new RuntimeValidationError('INVALID_STATE', 'Runtime run changed concurrently');
      }
      throw error;
    }

    const stored = await this.command(input.scope, input.idempotencyKey);
    if (!stored)
      throw new RuntimeValidationError('INVALID_STATE', 'Workflow Runtime command did not persist');
    if (!stored.result_json) {
      throw new RuntimeValidationError('INVALID_STATE', 'Runtime run changed concurrently');
    }
    return {
      run: this.replayResult(stored, input.commandDigest),
      applied: stored.id === commandId
    };
  }

  private command(scope: WorkflowRuntimeScope, idempotencyKey: string): Promise<CommandRow | null> {
    return this.database
      .prepare(
        `SELECT command.id, command.run_id, command.command_sha256, command.result_json
         FROM control_workflow_runtime_commands command
         JOIN control_runs control ON control.id = command.run_id
         WHERE command.idempotency_key = ?1 AND command.account_id = ?2
           AND command.tenant_id = ?3 AND command.workspace_account_id = ?4
           AND control.account_id = command.account_id AND control.tenant_id = command.tenant_id
           AND control.workspace_account_id = command.workspace_account_id`
      )
      .bind(idempotencyKey, scope.accountId, scope.tenantId, scope.workspaceAccountId)
      .first<CommandRow>();
  }

  private async trustedManifest(
    input: Parameters<WorkflowRuntimeCheckpointStore['apply']>[0]
  ): Promise<WorkflowRuntimeManifest | undefined> {
    const approvalSteps = input.run.steps.filter((step) => step.approval !== null);
    if (input.run.schema === 'workflow_runtime_run.v0.1' && approvalSteps.length === 0) {
      return undefined;
    }
    const manifestAuthority = this.manifests;
    if (!manifestAuthority) {
      throw new RuntimeValidationError(
        'INVALID_STATE',
        'Workflow Runtime registration-bound checkpoint requires a trusted manifest authority'
      );
    }
    const manifest = await manifestAuthority.findByRuntimeManifestSha256(
      input.run.runtimeManifestSha256
    );
    if (!manifest) {
      throw new RuntimeValidationError(
        'INVALID_STATE',
        'Workflow Runtime checkpoint manifest is unavailable from the trusted authority'
      );
    }
    await verifyWorkflowRuntimeRun(manifest, input.run);
    return manifest;
  }

  private async approvalContexts(
    input: Parameters<WorkflowRuntimeCheckpointStore['apply']>[0],
    manifest: WorkflowRuntimeManifest | undefined
  ): Promise<Map<string, WorkflowRuntimeApprovalContext>> {
    const approvalSteps = input.run.steps.filter((step) => step.approval !== null);
    if (approvalSteps.length === 0) return new Map();
    if (!manifest) {
      throw new RuntimeValidationError(
        'INVALID_STATE',
        'Workflow Runtime approval requires a trusted manifest authority'
      );
    }
    const contexts = new Map<string, WorkflowRuntimeApprovalContext>();
    for (const step of approvalSteps) {
      const definition = manifest.steps.find((candidate) => candidate.id === step.id);
      if (!definition || definition.disposition !== 'wait' || !step.approval) {
        throw new RuntimeValidationError(
          'INVALID_STATE',
          'Workflow Runtime approval does not match a wait definition'
        );
      }
      const context = {
        scope: structuredClone(input.scope),
        runVersion: input.run.version,
        stepVersion: step.version,
        attempt: { type: 'no_capability_attempt' as const },
        activation: structuredClone(input.run.activation),
        artifactManifestSha256: input.run.artifactManifestSha256,
        runtimeManifestSha256: input.run.runtimeManifestSha256,
        workflow: structuredClone(manifest.workflow),
        actionId: definition.actionId,
        evidenceDigest: definition.evidenceDigest
      };
      if (input.run.schema === 'workflow_runtime_run.v0.1') {
        contexts.set(step.approval.id, {
          schema: 'create-something/workflow-runtime-approval-context@1',
          version: 1,
          ...context
        });
        continue;
      }
      if (!input.run.registration || !input.run.runtimeManifestSchema) {
        throw new RuntimeValidationError(
          'INVALID_STATE',
          'Registration-bound Workflow Runtime approval is missing registration or manifest schema'
        );
      }
      contexts.set(step.approval.id, {
        schema: 'create-something/workflow-runtime-approval-context@2',
        version: 2,
        ...context,
        registration: structuredClone(input.run.registration),
        runtimeManifestSchema: input.run.runtimeManifestSchema
      });
    }
    return contexts;
  }

  private async approvalAttestations(
    input: Parameters<WorkflowRuntimeCheckpointStore['apply']>[0],
    manifest: WorkflowRuntimeManifest | undefined
  ): Promise<
    Map<
      string,
      {
        approvalSurface: WorkflowRuntimeApprovalSurface;
        approvalCommand: typeof WORKFLOW_RUNTIME_APPROVAL_COMMAND;
      }
    >
  > {
    const approvalSteps = input.run.steps.filter((step) => step.approval !== null);
    if (approvalSteps.length === 0 || input.run.schema !== 'workflow_runtime_run.v0.2') {
      return new Map();
    }
    if (!manifest || !this.approvalSurfaces) {
      throw new RuntimeValidationError(
        'INVALID_STATE',
        'Registration-bound Workflow Runtime approval requires a trusted approval-surface authority'
      );
    }
    const approvalSurface = await this.approvalSurfaces.findByRuntimeManifestSha256(
      input.run.runtimeManifestSha256
    );
    if (
      !approvalSurface ||
      !RUNTIME_DIGEST.test(approvalSurface.sha256) ||
      approvalSurface.sha256 !== manifest.artifacts.approvalSurfacesSha256
    ) {
      throw new RuntimeValidationError(
        'INVALID_STATE',
        'Workflow Runtime approval surface does not match the trusted compiler manifest'
      );
    }
    return new Map(
      approvalSteps.flatMap((step) =>
        step.approval
          ? [
              [
                step.approval.id,
                {
                  approvalSurface: structuredClone(approvalSurface),
                  approvalCommand: WORKFLOW_RUNTIME_APPROVAL_COMMAND
                }
              ] as const
            ]
          : []
      )
    );
  }

  private async parentAuthorizes(scope: WorkflowRuntimeScope, runId: string): Promise<boolean> {
    const row = await this.database
      .prepare(
        `SELECT id FROM control_runs
         WHERE id = ?1 AND account_id = ?2 AND tenant_id = ?3 AND workspace_account_id = ?4
           AND status IN (${LIVE_PARENT_STATUSES})`
      )
      .bind(runId, scope.accountId, scope.tenantId, scope.workspaceAccountId)
      .first<{ id: string }>();
    return Boolean(row);
  }

  private replayResult(row: CommandRow, digestValue: string): WorkflowRuntimeRun {
    if (row.command_sha256 !== commandDigest(digestValue)) {
      throw new RuntimeValidationError(
        'INVALID_EVENT',
        'Idempotency key was already used for another command'
      );
    }
    if (!row.result_json)
      throw new RuntimeValidationError(
        'INVALID_STATE',
        'Workflow Runtime command is still pending'
      );
    const parsed: unknown = JSON.parse(row.result_json);
    if (isRecord(parsed) && parsed.error === 'concurrent_update') {
      throw new RuntimeValidationError('INVALID_STATE', 'Runtime run changed concurrently');
    }
    return parsedRun(row.result_json, 'Workflow Runtime command result');
  }
}
