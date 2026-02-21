import type { D1Database } from '@create-something/mcp-core';

type AutomationStatus = 'enabled' | 'disabled' | 'paused' | 'archived';
type ExecutionMode = 'direct' | 'guided' | 'autonomous';
type OwnerType = 'user' | 'service';
type ApprovalMode = 'untrusted' | 'on-failure' | 'on-request' | 'never';
type AssignmentMode = 'none' | 'pinned' | 'routed' | 'hybrid';
type ApprovalState = 'pending' | 'approved' | 'denied' | 'expired' | 'cancelled';

export interface AutomationContractRow {
  id: string;
  account_id: string;
  automation_id: string;
  version: number;
  status: AutomationStatus;
  name: string;
  owner_type: OwnerType;
  owner_id: string;
  execution_mode: ExecutionMode;
  policy_pack_id: string;
  policy_version_id: string;
  approval_mode: ApprovalMode;
  trigger_type: 'schedule' | 'event' | 'manual';
  trigger_cron: string | null;
  trigger_timezone: string | null;
  mcp_profile_id: string;
  spec_json: string;
  created_by: string;
  created_at: number;
  is_active: number;
}

export interface ApprovalInboxRow {
  approval_id: string;
  run_id: string;
  account_id: string;
  automation_id: string;
  state: ApprovalState;
  action_type: string;
  reason: string | null;
  proposed_change_json: string | null;
  requested_at: number;
  expires_at: number | null;
  decided_at: number | null;
  decided_by: string | null;
  decision_comment: string | null;
}

export interface UpsertAutomationInput {
  accountId: string;
  automationId: string;
  name: string;
  status: AutomationStatus;
  ownerType: OwnerType;
  ownerId: string;
  executionMode: ExecutionMode;
  policyPackId: string;
  policyVersionId: string;
  approvalMode: ApprovalMode;
  triggerType: 'schedule' | 'event' | 'manual';
  triggerCron?: string;
  triggerTimezone?: string;
  mcpProfileId: string;
  spec: Record<string, unknown>;
  labels?: string[];
  createdBy: string;
  isActive?: boolean;
  agentAssignment?: {
    mode: AssignmentMode;
    primaryAgentId?: string;
    routingPolicyId?: string;
    fallbackAgentIds?: string[];
  };
}

function nowEpochSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function randSuffix(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function safeIdPart(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'unknown';
}

function newId(prefix: string, ...parts: string[]): string {
  return [prefix, ...parts.map(safeIdPart), randSuffix()].join('_');
}

export async function listActiveAutomationContracts(
  db: D1Database | undefined,
  accountId: string,
): Promise<AutomationContractRow[]> {
  if (!db) return [];
  const result = await db
    .prepare(
      `SELECT * FROM automation_contracts
       WHERE account_id = ? AND is_active = 1
       ORDER BY created_at DESC`,
    )
    .bind(accountId)
    .all<AutomationContractRow>();
  return result.results;
}

export async function getActiveAutomationContract(
  db: D1Database | undefined,
  accountId: string,
  automationId: string,
): Promise<AutomationContractRow | null> {
  if (!db) return null;
  return db
    .prepare(
      `SELECT * FROM automation_contracts
       WHERE account_id = ? AND automation_id = ? AND is_active = 1
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .bind(accountId, automationId)
    .first<AutomationContractRow>();
}

export async function upsertAutomationContract(
  db: D1Database | undefined,
  input: UpsertAutomationInput,
): Promise<AutomationContractRow> {
  const now = nowEpochSeconds();
  const id = newId('actr', input.accountId, input.automationId);
  const isActive = input.isActive ?? true;

  const row: AutomationContractRow = {
    id,
    account_id: input.accountId,
    automation_id: input.automationId,
    version: 1,
    status: input.status,
    name: input.name,
    owner_type: input.ownerType,
    owner_id: input.ownerId,
    execution_mode: input.executionMode,
    policy_pack_id: input.policyPackId,
    policy_version_id: input.policyVersionId,
    approval_mode: input.approvalMode,
    trigger_type: input.triggerType,
    trigger_cron: input.triggerCron ?? null,
    trigger_timezone: input.triggerTimezone ?? null,
    mcp_profile_id: input.mcpProfileId,
    spec_json: JSON.stringify(input.spec),
    created_by: input.createdBy,
    created_at: now,
    is_active: isActive ? 1 : 0,
  };

  if (!db) return row;

  const currentVersion = await db
    .prepare(
      `SELECT COALESCE(MAX(version), 0) AS version
       FROM automation_contracts
       WHERE account_id = ? AND automation_id = ?`,
    )
    .bind(input.accountId, input.automationId)
    .first<{ version: number }>();

  row.version = (currentVersion?.version ?? 0) + 1;

  if (row.is_active === 1) {
    await db
      .prepare(
        `UPDATE automation_contracts
         SET is_active = 0
         WHERE account_id = ? AND automation_id = ? AND is_active = 1`,
      )
      .bind(input.accountId, input.automationId)
      .run();
  }

  await db
    .prepare(
      `INSERT INTO automation_contracts
       (id, account_id, automation_id, version, status, name, owner_type, owner_id, execution_mode, policy_pack_id, policy_version_id, approval_mode, trigger_type, trigger_cron, trigger_timezone, mcp_profile_id, spec_json, created_by, created_at, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      row.id,
      row.account_id,
      row.automation_id,
      row.version,
      row.status,
      row.name,
      row.owner_type,
      row.owner_id,
      row.execution_mode,
      row.policy_pack_id,
      row.policy_version_id,
      row.approval_mode,
      row.trigger_type,
      row.trigger_cron,
      row.trigger_timezone,
      row.mcp_profile_id,
      row.spec_json,
      row.created_by,
      row.created_at,
      row.is_active,
    )
    .run();

  if (input.labels && input.labels.length > 0) {
    for (const label of input.labels) {
      await db
        .prepare(
          `INSERT OR IGNORE INTO automation_labels
           (account_id, automation_id, version, label, created_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(input.accountId, input.automationId, row.version, label, now)
        .run();
    }
  }

  if (input.agentAssignment) {
    const assignmentId = newId('asg', input.accountId, input.automationId);
    await db
      .prepare(
        `INSERT INTO automation_assignments
         (id, account_id, automation_id, version, mode, primary_agent_id, routing_policy_id, assignment_json, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        assignmentId,
        input.accountId,
        input.automationId,
        row.version,
        input.agentAssignment.mode,
        input.agentAssignment.primaryAgentId ?? null,
        input.agentAssignment.routingPolicyId ?? null,
        JSON.stringify(input.agentAssignment),
        input.createdBy,
        now,
      )
      .run();

    const fallbacks = input.agentAssignment.fallbackAgentIds ?? [];
    for (let i = 0; i < fallbacks.length; i += 1) {
      await db
        .prepare(
          `INSERT INTO automation_assignment_fallbacks
           (assignment_id, ordinal, fallback_agent_id, created_at)
           VALUES (?, ?, ?, ?)`,
        )
        .bind(assignmentId, i, fallbacks[i], now)
        .run();
    }
  }

  return row;
}

export async function createAutomationRun(
  db: D1Database | undefined,
  input: {
    accountId: string;
    automationId: string;
    triggerSource?: 'schedule' | 'event' | 'manual' | 'retry';
    actorId: string;
  },
): Promise<{ runId: string; state: string; contractVersion: number } | null> {
  if (!db) return null;
  const active = await getActiveAutomationContract(db, input.accountId, input.automationId);
  if (!active) return null;

  const runId = newId('run', input.accountId, input.automationId);
  const now = nowEpochSeconds();
  await db
    .prepare(
      `INSERT INTO automation_runs
       (run_id, account_id, automation_id, contract_version, trigger_source, state, policy_pack_id, policy_version_id, approval_mode, execution_mode, assigned_agent_mode, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      runId,
      input.accountId,
      input.automationId,
      active.version,
      input.triggerSource ?? 'manual',
      'queued',
      active.policy_pack_id,
      active.policy_version_id,
      active.approval_mode,
      active.execution_mode,
      'none',
      now,
    )
    .run();

  await db
    .prepare(
      `INSERT INTO run_events
       (event_id, run_id, account_id, automation_id, event_type, event_ts, actor_type, actor_id, payload_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      newId('evt', runId),
      runId,
      input.accountId,
      input.automationId,
      'run_queued',
      now,
      'user',
      input.actorId,
      JSON.stringify({ triggerSource: input.triggerSource ?? 'manual' }),
    )
    .run();

  return { runId, state: 'queued', contractVersion: active.version };
}

export async function listPendingApprovals(
  db: D1Database | undefined,
  accountId: string,
): Promise<ApprovalInboxRow[]> {
  if (!db) return [];
  const result = await db
    .prepare(
      `SELECT * FROM approval_requests
       WHERE account_id = ? AND state = 'pending'
       ORDER BY requested_at DESC`,
    )
    .bind(accountId)
    .all<ApprovalInboxRow>();
  return result.results;
}

export async function decideApproval(
  db: D1Database | undefined,
  input: {
    accountId: string;
    approvalId: string;
    decision: 'approved' | 'denied';
    decidedBy: string;
    comment?: string;
  },
): Promise<{ approvalId: string; state: string } | null> {
  if (!db) return null;

  const row = await db
    .prepare(
      `SELECT * FROM approval_requests
       WHERE account_id = ? AND approval_id = ?
       LIMIT 1`,
    )
    .bind(input.accountId, input.approvalId)
    .first<ApprovalInboxRow>();
  if (!row) return null;

  const now = nowEpochSeconds();
  await db
    .prepare(
      `UPDATE approval_requests
       SET state = ?, decided_at = ?, decided_by = ?, decision_comment = ?
       WHERE approval_id = ? AND account_id = ?`,
    )
    .bind(input.decision, now, input.decidedBy, input.comment ?? null, input.approvalId, input.accountId)
    .run();

  await db
    .prepare(
      `INSERT INTO approval_events
       (approval_event_id, approval_id, run_id, account_id, automation_id, from_state, to_state, actor_id, actor_type, event_ts, payload_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      newId('aevt', input.approvalId),
      row.approval_id,
      row.run_id,
      row.account_id,
      row.automation_id,
      row.state,
      input.decision,
      input.decidedBy,
      'user',
      now,
      JSON.stringify({ comment: input.comment ?? null }),
    )
    .run();

  const nextRunState = input.decision === 'approved' ? 'running' : 'terminated';
  await db
    .prepare(`UPDATE automation_runs SET state = ? WHERE run_id = ?`)
    .bind(nextRunState, row.run_id)
    .run();

  await db
    .prepare(
      `INSERT INTO run_events
       (event_id, run_id, account_id, automation_id, event_type, event_ts, actor_type, actor_id, payload_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      newId('evt', row.run_id),
      row.run_id,
      row.account_id,
      row.automation_id,
      input.decision === 'approved' ? 'approval_approved' : 'approval_denied',
      now,
      'user',
      input.decidedBy,
      JSON.stringify({ approvalId: row.approval_id }),
    )
    .run();

  return { approvalId: input.approvalId, state: input.decision };
}
