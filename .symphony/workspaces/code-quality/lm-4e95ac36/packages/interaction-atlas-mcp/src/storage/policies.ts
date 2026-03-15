import type { D1Database } from '@create-something/mcp-core';
import { compileConstraintPolicy } from '@create-something/policy-os-engine';
import type { AtlasEntityType } from './versions.js';

export type PolicyStatus = 'draft' | 'active' | 'archived';

export interface PolicyRule {
  id: string;
  priority: number;
  when: {
    toolNames?: string[];
    hasWriteIntent?: boolean;
    hasHumanReviewStep?: boolean;
    introspectionOk?: boolean;
    accountIds?: string[];
  };
  then: {
    decision: 'allow' | 'require_human_review' | 'block';
    reason: string;
  };
}

export interface PolicyGuardrails {
  maxReviewDelta?: number;
  maxBlockDelta?: number;
}

export interface JudgmentPolicy {
  id: string;
  name: string;
  description?: string;
  guardrails?: PolicyGuardrails;
  rules: PolicyRule[];
}

export interface PolicyVersionRow {
  id: string;
  account_id: string;
  entity_type: AtlasEntityType;
  entity_id: string;
  status: PolicyStatus;
  policy_json: string;
  policy_engine?: string | null;
  policy_polar?: string | null;
  policy_hash?: string | null;
  compiler_version?: string | null;
  fallback_ir_json?: string | null;
  created_by: string;
  created_at: number;
}

export interface CompiledPolicyArtifact {
  policy_engine: 'polar_v1';
  policy_polar: string;
  policy_hash: string;
  compiler_version: string;
  fallback_ir_json: string;
}

export interface PolicyEstimateSummary {
  before: { allow: number; require_human_review: number; block: number };
  after: { allow: number; require_human_review: number; block: number };
  delta: { allow: number; require_human_review: number; block: number };
  scenarioCount: number;
}

export interface EstimateReportRow {
  id: string;
  account_id: string;
  entity_type: AtlasEntityType;
  entity_id: string;
  before_policy_version_id: string | null;
  after_policy_version_id: string;
  scenario_set_json: string;
  summary_json: string;
  created_by: string;
  created_at: number;
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
    .slice(0, 64) || 'unknown';
}

function makePolicyVersionId(accountId: string, entityType: AtlasEntityType, entityId: string): string {
  return ['pol', safeIdPart(accountId), safeIdPart(entityType), safeIdPart(entityId), String(nowEpochSeconds()), randSuffix()].join('_');
}

function makeEstimateReportId(accountId: string, entityType: AtlasEntityType, entityId: string): string {
  return ['rep', safeIdPart(accountId), safeIdPart(entityType), safeIdPart(entityId), String(nowEpochSeconds()), randSuffix()].join('_');
}

function compilePolicyArtifact(policy: JudgmentPolicy): CompiledPolicyArtifact {
  const compiled = compileConstraintPolicy(policy);
  return {
    policy_engine: 'polar_v1',
    policy_polar: compiled.policyPolar,
    policy_hash: compiled.policyHash,
    compiler_version: compiled.compilerVersion,
    fallback_ir_json: compiled.fallbackIrJson,
  };
}

function hasCompiledArtifact(row: PolicyVersionRow): boolean {
  return Boolean(row.policy_polar && row.policy_hash && row.compiler_version);
}

async function backfillCompiledArtifact(
  db: D1Database | undefined,
  row: PolicyVersionRow,
  policy: JudgmentPolicy,
): Promise<PolicyVersionRow> {
  if (hasCompiledArtifact(row)) return row;
  const artifact = compilePolicyArtifact(policy);
  const enriched: PolicyVersionRow = { ...row, ...artifact };
  if (!db) return enriched;
  await db
    .prepare(
      `UPDATE judgment_policy_versions
       SET policy_engine = ?, policy_polar = ?, policy_hash = ?, compiler_version = ?, fallback_ir_json = ?
       WHERE id = ? AND account_id = ?`,
    )
    .bind(
      artifact.policy_engine,
      artifact.policy_polar,
      artifact.policy_hash,
      artifact.compiler_version,
      artifact.fallback_ir_json,
      row.id,
      row.account_id,
    )
    .run();
  return enriched;
}

export function createDefaultPolicy(entityId: string): JudgmentPolicy {
  return {
    id: `default-${safeIdPart(entityId)}`,
    name: `Default policy for ${entityId}`,
    description: 'Baseline hard-gate policy for Atlas workflow mapping.',
    guardrails: {
      maxReviewDelta: 2,
      maxBlockDelta: 1,
    },
    rules: [
      {
        id: 'jr_block_readonly_write_01',
        priority: 10,
        when: { hasWriteIntent: true, accountIds: ['public'] },
        then: {
          decision: 'block',
          reason: 'Public read-only account cannot run write-intent path.',
        },
      },
      {
        id: 'jr_review_introspection_failure_02',
        priority: 20,
        when: { toolNames: ['mcp_map_to_workflow'], introspectionOk: false },
        then: {
          decision: 'require_human_review',
          reason: 'Introspection failed; operator review required.',
        },
      },
      {
        id: 'jr_review_missing_human_step_03',
        priority: 30,
        when: { hasWriteIntent: true, hasHumanReviewStep: false },
        then: {
          decision: 'require_human_review',
          reason: 'Write-intent path without explicit human review.',
        },
      },
      {
        id: 'jr_allow_default_99',
        priority: 999,
        when: {},
        then: {
          decision: 'allow',
          reason: 'No restrictive rules matched.',
        },
      },
    ],
  };
}

export async function savePolicyVersion(
  db: D1Database | undefined,
  input: {
    accountId: string;
    entityType: AtlasEntityType;
    entityId: string;
    status?: PolicyStatus;
    policy: JudgmentPolicy;
    createdBy: string;
  },
): Promise<PolicyVersionRow> {
  const status = input.status ?? 'draft';
  const artifact = compilePolicyArtifact(input.policy);
  const id = makePolicyVersionId(input.accountId, input.entityType, input.entityId);
  const row: PolicyVersionRow = {
    id,
    account_id: input.accountId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    status,
    policy_json: JSON.stringify(input.policy),
    ...artifact,
    created_by: input.createdBy,
    created_at: nowEpochSeconds(),
  };

  if (!db) return row;

  await db
    .prepare(
      `INSERT INTO judgment_policy_versions
       (id, account_id, entity_type, entity_id, status, policy_json, policy_engine, policy_polar, policy_hash, compiler_version, fallback_ir_json, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      row.id,
      row.account_id,
      row.entity_type,
      row.entity_id,
      row.status,
      row.policy_json,
      row.policy_engine ?? 'polar_v1',
      row.policy_polar ?? null,
      row.policy_hash ?? null,
      row.compiler_version ?? null,
      row.fallback_ir_json ?? null,
      row.created_by,
      row.created_at,
    )
    .run();

  return row;
}

export async function getPolicyVersionById(
  db: D1Database | undefined,
  accountId: string,
  policyVersionId: string,
): Promise<PolicyVersionRow | null> {
  if (!db) return null;
  const row = await db
    .prepare(`SELECT * FROM judgment_policy_versions WHERE account_id = ? AND id = ? LIMIT 1`)
    .bind(accountId, policyVersionId)
    .first<PolicyVersionRow>();
  if (!row) return null;
  let parsed: JudgmentPolicy;
  try {
    parsed = JSON.parse(row.policy_json) as JudgmentPolicy;
  } catch {
    return row;
  }
  return backfillCompiledArtifact(db, row, parsed);
}

export async function listPolicyVersions(
  db: D1Database | undefined,
  accountId: string,
  entityType: AtlasEntityType,
  entityId: string,
): Promise<PolicyVersionRow[]> {
  if (!db) return [];
  const result = await db
    .prepare(
      `SELECT * FROM judgment_policy_versions
       WHERE account_id = ? AND entity_type = ? AND entity_id = ?
       ORDER BY created_at DESC`,
    )
    .bind(accountId, entityType, entityId)
    .all<PolicyVersionRow>();
  const rows = result.results;
  const output: PolicyVersionRow[] = [];
  for (const row of rows) {
    let parsed: JudgmentPolicy | null = null;
    try {
      parsed = JSON.parse(row.policy_json) as JudgmentPolicy;
    } catch {
      // keep raw row on parse failure
    }
    if (!parsed) {
      output.push(row);
      continue;
    }
    output.push(await backfillCompiledArtifact(db, row, parsed));
  }
  return output;
}

export async function getActivePolicySelection(
  db: D1Database | undefined,
  accountId: string,
  entityType: AtlasEntityType,
  entityId: string,
): Promise<string | null> {
  if (!db) return null;
  const row = await db
    .prepare(
      `SELECT active_policy_version_id FROM judgment_policy_selection
       WHERE account_id = ? AND entity_type = ? AND entity_id = ?
       LIMIT 1`,
    )
    .bind(accountId, entityType, entityId)
    .first<{ active_policy_version_id: string }>();
  return row?.active_policy_version_id ?? null;
}

export async function activatePolicyVersion(
  db: D1Database | undefined,
  input: {
    accountId: string;
    entityType: AtlasEntityType;
    entityId: string;
    policyVersionId: string;
    updatedBy: string;
  },
): Promise<void> {
  if (!db) return;

  await db
    .prepare(
      `UPDATE judgment_policy_versions
       SET status = 'draft'
       WHERE account_id = ? AND entity_type = ? AND entity_id = ? AND status = 'active'`,
    )
    .bind(input.accountId, input.entityType, input.entityId)
    .run();

  await db
    .prepare(
      `INSERT INTO judgment_policy_selection
       (account_id, entity_type, entity_id, active_policy_version_id, updated_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(account_id, entity_type, entity_id) DO UPDATE SET
         active_policy_version_id = excluded.active_policy_version_id,
         updated_by = excluded.updated_by,
         updated_at = excluded.updated_at`,
    )
    .bind(
      input.accountId,
      input.entityType,
      input.entityId,
      input.policyVersionId,
      input.updatedBy,
      nowEpochSeconds(),
    )
    .run();

  await db
    .prepare(`UPDATE judgment_policy_versions SET status = 'active' WHERE account_id = ? AND id = ?`)
    .bind(input.accountId, input.policyVersionId)
    .run();
}

export async function resolveActivePolicy(
  db: D1Database | undefined,
  input: {
    accountId: string;
    entityType: AtlasEntityType;
    entityId: string;
  },
): Promise<{ policyVersionId: string; policy: JudgmentPolicy; compiled: CompiledPolicyArtifact }> {
  const fallback = createDefaultPolicy(input.entityId);
  const fallbackCompiled = compilePolicyArtifact(fallback);
  if (!db) {
    return {
      policyVersionId: `default-${safeIdPart(input.entityId)}`,
      policy: fallback,
      compiled: fallbackCompiled,
    };
  }

  const selectedId = await getActivePolicySelection(db, input.accountId, input.entityType, input.entityId);
  if (selectedId) {
    const selected = await getPolicyVersionById(db, input.accountId, selectedId);
    if (selected) {
      const policy = JSON.parse(selected.policy_json) as JudgmentPolicy;
      const enriched = await backfillCompiledArtifact(db, selected, policy);
      const compiled = compilePolicyArtifact(policy);
      return {
        policyVersionId: enriched.id,
        policy,
        compiled: {
          policy_engine: 'polar_v1',
          policy_polar: enriched.policy_polar ?? compiled.policy_polar,
          policy_hash: enriched.policy_hash ?? compiled.policy_hash,
          compiler_version: enriched.compiler_version ?? compiled.compiler_version,
          fallback_ir_json: enriched.fallback_ir_json ?? compiled.fallback_ir_json,
        },
      };
    }
  }

  const latest = await db
    .prepare(
      `SELECT * FROM judgment_policy_versions
       WHERE account_id = ? AND entity_type = ? AND entity_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .bind(input.accountId, input.entityType, input.entityId)
    .first<PolicyVersionRow>();

  if (latest) {
    const policy = JSON.parse(latest.policy_json) as JudgmentPolicy;
    const enriched = await backfillCompiledArtifact(db, latest, policy);
    const compiled = compilePolicyArtifact(policy);
    return {
      policyVersionId: enriched.id,
      policy,
      compiled: {
        policy_engine: 'polar_v1',
        policy_polar: enriched.policy_polar ?? compiled.policy_polar,
        policy_hash: enriched.policy_hash ?? compiled.policy_hash,
        compiler_version: enriched.compiler_version ?? compiled.compiler_version,
        fallback_ir_json: enriched.fallback_ir_json ?? compiled.fallback_ir_json,
      },
    };
  }

  return {
    policyVersionId: `default-${safeIdPart(input.entityId)}`,
    policy: fallback,
    compiled: fallbackCompiled,
  };
}

export async function saveEstimateReport(
  db: D1Database | undefined,
  input: {
    accountId: string;
    entityType: AtlasEntityType;
    entityId: string;
    beforePolicyVersionId: string | null;
    afterPolicyVersionId: string;
    scenarioSet: unknown;
    summary: PolicyEstimateSummary;
    createdBy: string;
  },
): Promise<EstimateReportRow> {
  const id = makeEstimateReportId(input.accountId, input.entityType, input.entityId);
  const row: EstimateReportRow = {
    id,
    account_id: input.accountId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    before_policy_version_id: input.beforePolicyVersionId,
    after_policy_version_id: input.afterPolicyVersionId,
    scenario_set_json: JSON.stringify(input.scenarioSet),
    summary_json: JSON.stringify(input.summary),
    created_by: input.createdBy,
    created_at: nowEpochSeconds(),
  };

  if (!db) return row;

  await db
    .prepare(
      `INSERT INTO judgment_estimate_reports
       (id, account_id, entity_type, entity_id, before_policy_version_id, after_policy_version_id, scenario_set_json, summary_json, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      row.id,
      row.account_id,
      row.entity_type,
      row.entity_id,
      row.before_policy_version_id,
      row.after_policy_version_id,
      row.scenario_set_json,
      row.summary_json,
      row.created_by,
      row.created_at,
    )
    .run();

  return row;
}

export async function getEstimateReportById(
  db: D1Database | undefined,
  accountId: string,
  reportId: string,
): Promise<EstimateReportRow | null> {
  if (!db) return null;
  return db
    .prepare(`SELECT * FROM judgment_estimate_reports WHERE account_id = ? AND id = ? LIMIT 1`)
    .bind(accountId, reportId)
    .first<EstimateReportRow>();
}

export async function getLatestEstimateReport(
  db: D1Database | undefined,
  accountId: string,
  entityType: AtlasEntityType,
  entityId: string,
): Promise<EstimateReportRow | null> {
  if (!db) return null;
  return db
    .prepare(
      `SELECT * FROM judgment_estimate_reports
       WHERE account_id = ? AND entity_type = ? AND entity_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .bind(accountId, entityType, entityId)
    .first<EstimateReportRow>();
}
