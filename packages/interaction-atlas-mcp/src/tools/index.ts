/**
 * Interaction Atlas — Tools (Automation tier)
 *
 * These tools make the Atlas and workflow mappings AI-native:
 * - search/get Atlas elements
 * - list/get mapped workflows
 * - validate workflow reference IDs against the Atlas
 */

import { jsonContent, errorContent } from '@create-something/mcp-core';
import type { ScopedMcpServer } from '@create-something/mcp-core';
import type { D1Database } from '@create-something/mcp-core';

import {
  getAtlasStats,
  getPattern,
  searchPatterns,
} from '@quietloudlab/ai-interaction-atlas';
import { initBraintrust, getBraintrustLogger, flush as flushBraintrust } from '@create-something/observability/braintrust';

import {
  getBuiltWorkflowTemplate,
  getWorkflowMermaid,
  listWorkflowSummaries,
  validateBuiltWorkflow,
} from '../workflows/index.js';

import { buildWorkflowTemplate } from '../workflows/build.js';
import { workflowTemplateToMermaid } from '../workflows/mermaid.js';
import { mapToolSequenceToWorkflowDefinition } from '../workflows/map.js';

import {
  evaluateConstraintPolicyHybrid,
  evaluateConstraintPolicyWithRollout,
  compileConstraintPolicy,
  type ConstraintEvaluationInput,
  type HybridEvaluatorConfig,
  type RolloutConfig,
} from '@create-something/policy-os-engine';

import {
  AtlasGetSchema,
  AtlasSearchSchema,
  AtlasStudioEdgeAddSchema,
  AtlasStudioNodeAddSchema,
  AtlasStudioObserveSchema,
  AtlasStudioHealSchema,
  AtlasStudioProposalActionReviewSchema,
  AtlasStudioProposalHandoffSchema,
  AtlasStudioProposalSchema,
  AtlasStudioPortalStartSchema,
  AtlasStudioSessionCreateSchema,
  AtlasStudioSessionIdSchema,
  AtlasStudioSuggestionAcceptSchema,
  WorkflowIdSchema,
  WorkflowMapFromToolSequenceSchema,
  McpCatalogListSchema,
  McpIntrospectSchema,
  McpMapSchema,
  VersionSelectionGetSchema,
  VersionSelectionSetSchema,
  JudgmentPolicyActivateSchema,
  JudgmentPolicyCompareReportGetSchema,
  JudgmentDashboardSummaryParamsSchema,
  JudgmentDashboardSummarySchema,
  JudgmentPolicyEstimateSchema,
  JudgmentEngineRolloutGetSchema,
  JudgmentEngineRolloutSetSchema,
  JudgmentSecurityStatusGetSchema,
  JudgmentSecurityAccessSetSchema,
  JudgmentSecurityIncidentResolveSchema,
  JudgmentSecurityIncidentReviewNextSchema,
  JudgmentPolicyGetSchema,
  JudgmentPolicySaveSchema,
  AutomationContractGetSchema,
  AutomationContractUpsertSchema,
  AutomationRunStartSchema,
  ApprovalInboxDecideSchema,
} from '../schemas/index.js';

import type { McpCatalogEntry } from '../mcps/catalog.js';
import {
  findMcpCatalogEntry,
  listMcpCatalog,
  resolveMcpHttpEndpointUrl,
  resolveMcpHttpEndpointUrlFromUrl,
} from '../mcps/catalog.js';
import { introspectMcpServer } from '../mcps/introspect.js';
import { mapMcpToWorkflowDefinition } from '../mcps/map.js';
import type { JudgmentDecision } from '../judgment/types.js';
import {
  bindPolicyToVersion,
  getDefaultSelectedVersionId,
  getLatestVersion,
  getVersionById,
  resolveActiveVersion,
  setDefaultSelectedVersion,
  type AtlasEntityType,
} from '../storage/versions.js';
import { recordVisualization } from '../storage/visualizations.js';
import {
  activatePolicyVersion,
  getEstimateReportById,
  getLatestEstimateReport,
  getPolicyVersionById,
  listPolicyVersions,
  resolveActivePolicy,
  saveEstimateReport,
  savePolicyVersion,
  type JudgmentPolicy,
  type PolicyEstimateSummary,
} from '../storage/policies.js';
import { getEngineRollout, setEngineRollout } from '../storage/rollout.js';
import { getEngineMetricsSummary, recordEngineEvent } from '../storage/engine-events.js';
import {
  claimNextSecurityIncidentForReview,
  evaluateAbusePatternAndMitigate,
  getSecurityIncidentById,
  getAccountAccess,
  listRecentSecurityIncidents,
  resolveSecurityIncident,
  setAccountAccess,
} from '../storage/security.js';
import {
  createAutomationRun,
  decideApproval,
  getActiveAutomationContract,
  listActiveAutomationContracts,
  listPendingApprovals,
  upsertAutomationContract,
} from '../storage/control-plane.js';
import { getJudgmentDashboardSummary } from '../storage/dashboard.js';
import type { JudgmentEstimateScenario } from '../judgment/types.js';
import {
  acceptSuggestion,
  addEdge,
  addNode,
  addObservation,
  createSession,
  exportSessionMarkdown,
  listSessions,
  readSession,
  writeSession,
} from '../studio/store.js';
import {
  getAtlasStudioAppHome,
  getAtlasBrowserPortalStatus,
  startAtlasBrowserPortal,
  stopAtlasBrowserPortal,
} from '../studio/portal.js';
import { healSessionProductionBindings } from '../studio/production-bindings.js';
import {
  createWritebackProposal,
  exportWritebackProposalHandoffForSession,
  reviewWritebackProposalAction,
} from '../studio/writeback-proposals.js';
import { tidyNodeUpdates } from '../studio/client/layout.js';

function slugFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const raw = `${u.host}${u.pathname}`.replace(/\/+$/g, '');
    return raw
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'mcp';
  } catch {
    return url
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'mcp';
  }
}

function makeSyntheticCatalogEntry(url: string, name?: string): McpCatalogEntry {
  return {
    name: name ?? url,
    slug: slugFromUrl(url),
    url,
    description: 'Arbitrary MCP server URL',
    category: 'third-party',
    transports: ['http'],
    requiresAuth: false,
  };
}

function getStringMetadata(ctx: { metadata: Record<string, unknown> }, key: string): string | undefined {
  const value = ctx.metadata[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function getRoleMetadata(ctx: { metadata: Record<string, unknown> }): string {
  const value = ctx.metadata.role;
  return typeof value === 'string' && value.length > 0 ? value : 'unknown';
}

function getDbFromMetadata(ctx: { metadata: Record<string, unknown> }): D1Database | undefined {
  const value = ctx.metadata.db;
  if (value && typeof value === 'object' && 'prepare' in value) {
    return value as D1Database;
  }
  return undefined;
}

function allowVersionOverride(ctx: { policy: { constraints: Record<string, unknown> } }): boolean {
  return ctx.policy.constraints.allowVersionOverride === true;
}

function allowVersionSelectionWrite(ctx: { policy: { constraints: Record<string, unknown> } }): boolean {
  return ctx.policy.constraints.allowVersionSelectionWrite === true;
}

function allowControlPlaneWrite(ctx: { policy: { constraints: Record<string, unknown> } }): boolean {
  return ctx.policy.constraints.allowControlPlaneWrite === true;
}

function allowApprovalDecide(ctx: { policy: { constraints: Record<string, unknown> } }): boolean {
  return ctx.policy.constraints.allowApprovalDecide === true;
}

function buildVisualizationUrl(baseUrl: string | undefined, pagePath: string): string {
  if (!baseUrl) return pagePath;
  return `${baseUrl}${pagePath}`;
}

function hasWriteLikeName(input: string): boolean {
  return /(^|_)(create|add|insert|new|update|modify|patch|upsert|set|delete|remove|archive|trash|purge|send|post)(_|$)/i.test(input);
}

function hasHumanReviewReference(input: string): boolean {
  return /(human_review|review|approve|approval)/i.test(input);
}

function atlasSignals(input: ConstraintEvaluationInput): JudgmentDecision['atlasSignals'] {
  return {
    touchpoint: 'mcp_server',
    aiTask: input.toolName === 'mcp_map_to_workflow' ? 'analyze' : 'orchestrate',
    humanOversight: input.hasHumanReviewStep ? 'recommended' : 'optional',
    constraint: input.hasWriteIntent ? 'compliance' : 'permission',
  };
}

function jsonError(data: unknown): ReturnType<typeof errorContent> {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    isError: true,
  };
}

function atlasStudioCwd(): string {
  process.env.CREATE_SOMETHING_ATLAS_HOME ??= getAtlasStudioAppHome();
  return process.cwd();
}

function parseJsonRecord(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function guardrailsFromPolicy(policy: unknown): { maxReviewDelta: number | null; maxBlockDelta: number | null } {
  if (!policy || typeof policy !== 'object') {
    return { maxReviewDelta: null, maxBlockDelta: null };
  }
  const g = (policy as { guardrails?: { maxReviewDelta?: unknown; maxBlockDelta?: unknown } }).guardrails;
  return {
    maxReviewDelta: typeof g?.maxReviewDelta === 'number' ? g.maxReviewDelta : null,
    maxBlockDelta: typeof g?.maxBlockDelta === 'number' ? g.maxBlockDelta : null,
  };
}

type VersionedToolInput = {
  versionId?: string;
  commitSha?: string;
};

let judgmentBraintrustLoggerKey: string | null = null;

function fallbackCorrelationId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `corr_${ts}_${rand}`;
}

function getCorrelationId(ctx: { metadata: Record<string, unknown> }): string {
  return getStringMetadata(ctx, 'correlationId') ?? fallbackCorrelationId();
}

function boolString(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return defaultValue;
}

function getJudgmentBraintrustLogger(ctx: { metadata: Record<string, unknown> }) {
  const enabledRaw =
    getStringMetadata(ctx, 'BRAINTRUST_ENABLED') ??
    process.env.BRAINTRUST_ENABLED;
  if (!boolString(enabledRaw, true)) return null;

  const contextApiKey = getStringMetadata(ctx, '__braintrustApiKey');
  const apiKey = contextApiKey ?? process.env.BRAINTRUST_API_KEY;
  if (!apiKey) return null;

  const projectName =
    getStringMetadata(ctx, 'BRAINTRUST_PROJECT_NAME') ??
    process.env.BRAINTRUST_PROJECT_NAME ??
    process.env.BRAINTRUST_PROJECT ??
    'CREATE SOMETHING';
  const projectId =
    getStringMetadata(ctx, 'BRAINTRUST_PROJECT_ID') ??
    process.env.BRAINTRUST_PROJECT_ID ??
    null;

  const nextKey = `${apiKey}::${projectName}::${projectId ?? ''}`;
  if (judgmentBraintrustLoggerKey !== nextKey) {
    initBraintrust({
      apiKey,
      projectName,
      projectId: projectId ?? undefined,
      enabled: true,
      asyncFlush: true,
    });
    judgmentBraintrustLoggerKey = nextKey;
  }

  return getBraintrustLogger();
}

async function emitJudgmentDecisionTrace(
  ctx: { metadata: Record<string, unknown> },
  event: {
    correlationId: string;
    accountId: string;
    entityType: AtlasEntityType;
    entityId: string;
    toolName: string;
    rolloutMode: string;
    canaryPercent: number;
    sampledPolar: boolean;
    mismatch: boolean;
    legacyDecision: string;
    polarDecision: string;
    finalDecision: string;
    evaluationPath: string;
    fallbackReason: string | null;
    policyHash?: string;
    compilerVersion?: string;
    securityActionMode?: string | null;
    securityIncidentId?: string | null;
    securityActionReason?: string | null;
    latencyMs: number;
  },
): Promise<void> {
  const logger = getJudgmentBraintrustLogger(ctx);
  if (!logger) return;

  try {
    await logger.traced(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (span: any) => {
        span.log({
          input: {
            toolName: event.toolName,
            accountId: event.accountId,
            entityType: event.entityType,
            entityId: event.entityId,
            rolloutMode: event.rolloutMode,
            canaryPercent: event.canaryPercent,
          },
          output: {
            legacyDecision: event.legacyDecision,
            polarDecision: event.polarDecision,
            finalDecision: event.finalDecision,
            evaluationPath: event.evaluationPath,
          },
          tags: ['judgment', 'mcp', 'interaction-atlas-mcp', event.toolName, event.finalDecision],
          metadata: {
            server: 'interaction-atlas-mcp',
            source: 'mcp_tool_invocation',
            correlationId: event.correlationId,
            accountId: event.accountId,
            entityType: event.entityType,
            entityId: event.entityId,
            toolName: event.toolName,
            rolloutMode: event.rolloutMode,
            canaryPercent: event.canaryPercent,
            sampledPolar: event.sampledPolar,
            mismatch: event.mismatch,
            legacyDecision: event.legacyDecision,
            polarDecision: event.polarDecision,
            finalDecision: event.finalDecision,
            evaluationPath: event.evaluationPath,
            fallbackReason: event.fallbackReason,
            policyHash: event.policyHash,
            compilerVersion: event.compilerVersion,
            securityActionMode: event.securityActionMode,
            securityIncidentId: event.securityIncidentId,
            securityActionReason: event.securityActionReason,
            latencyMs: event.latencyMs,
          },
        });
      },
      {
        name: `judgment:interaction-atlas-mcp:${event.toolName}`,
        type: 'eval',
      },
    );
    await flushBraintrust();
  } catch (error) {
    console.warn(
      `[judgment] braintrust emit failed for ${event.toolName}:`,
      error instanceof Error ? error.message : String(error),
    );
  }
}

function boolMetadata(ctx: { metadata: Record<string, unknown> }, key: string, defaultValue: boolean): boolean {
  const value = ctx.metadata[key];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return defaultValue;
}

function intMetadata(ctx: { metadata: Record<string, unknown> }, key: string, defaultValue: number): number {
  const value = ctx.metadata[key];
  if (typeof value === 'number' && Number.isFinite(value)) return Math.floor(value);
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.floor(parsed);
  }
  return defaultValue;
}

function hybridConfigFromContext(ctx: { metadata: Record<string, unknown> }): HybridEvaluatorConfig {
  const fetchTimeoutRaw = ctx.metadata.OSO_FETCH_TIMEOUT_MS;
  const fetchTimeoutMillis = typeof fetchTimeoutRaw === 'number' ? fetchTimeoutRaw : undefined;
  return {
    mode: 'hybrid',
    fallbackEnabled: boolMetadata(ctx, 'ENGINE_FALLBACK_ENABLED', true),
    oso: {
      url: getStringMetadata(ctx, 'OSO_URL'),
      apiKey: getStringMetadata(ctx, 'OSO_API_KEY'),
      bootstrapPolicy: boolMetadata(ctx, 'OSO_BOOTSTRAP_POLICY', false),
      fetchTimeoutMillis,
    },
  };
}

function abuseMitigationConfigFromContext(ctx: { metadata: Record<string, unknown> }): {
  enabled: boolean;
  windowSeconds: number;
  blockThreshold: number;
  distinctToolThreshold: number;
  responseMode: 'auto_off' | 'review';
} {
  const responseModeRaw = getStringMetadata(ctx, 'ABUSE_RESPONSE_MODE');
  const responseMode = responseModeRaw?.toLowerCase() === 'review' ? 'review' : 'auto_off';
  return {
    enabled: boolMetadata(ctx, 'ABUSE_GUARD_ENABLED', true),
    windowSeconds: Math.max(60, intMetadata(ctx, 'ABUSE_WINDOW_SECONDS', 300)),
    blockThreshold: Math.max(2, intMetadata(ctx, 'ABUSE_BLOCK_THRESHOLD', 8)),
    distinctToolThreshold: Math.max(1, intMetadata(ctx, 'ABUSE_DISTINCT_TOOLS_THRESHOLD', 2)),
    responseMode,
  };
}

function defaultEstimateScenarios(): JudgmentEstimateScenario[] {
  return [
    { id: 'scenario-read', toolName: 'workflow_get', hasWriteIntent: false, hasHumanReviewStep: true, introspectionOk: true },
    { id: 'scenario-write-no-human', toolName: 'workflow_map_from_tool_sequence', hasWriteIntent: true, hasHumanReviewStep: false, introspectionOk: true },
    { id: 'scenario-mcp-introspection-fail', toolName: 'mcp_map_to_workflow', hasWriteIntent: true, hasHumanReviewStep: true, introspectionOk: false },
  ];
}

async function evaluatePolicyScenarios(
  accountId: string,
  readOnly: boolean,
  before: JudgmentPolicy,
  after: JudgmentPolicy,
  scenarios: JudgmentEstimateScenario[],
  hybridConfig: HybridEvaluatorConfig,
): Promise<{ summary: PolicyEstimateSummary; details: Array<{ scenarioId: string; before: string; after: string }> }> {
  const initialCounts = { allow: 0, require_human_review: 0, block: 0 };
  const beforeCounts = { ...initialCounts };
  const afterCounts = { ...initialCounts };
  const details: Array<{ scenarioId: string; before: string; after: string }> = [];
  const compiledBefore = compileConstraintPolicy(before);
  const compiledAfter = compileConstraintPolicy(after);

  for (const scenario of scenarios) {
    const baseInput = {
      toolName: scenario.toolName,
      accountId,
      readOnly,
      hasWriteIntent: scenario.hasWriteIntent,
      hasHumanReviewStep: scenario.hasHumanReviewStep,
      introspectionOk: scenario.introspectionOk,
    };

    const beforeDecision = await evaluateConstraintPolicyHybrid(baseInput, before, compiledBefore, hybridConfig);
    const afterDecision = await evaluateConstraintPolicyHybrid(baseInput, after, compiledAfter, hybridConfig);
    beforeCounts[beforeDecision.decision] += 1;
    afterCounts[afterDecision.decision] += 1;
    details.push({
      scenarioId: scenario.id,
      before: beforeDecision.decision,
      after: afterDecision.decision,
    });
  }

  const summary: PolicyEstimateSummary = {
    before: beforeCounts,
    after: afterCounts,
    delta: {
      allow: afterCounts.allow - beforeCounts.allow,
      require_human_review: afterCounts.require_human_review - beforeCounts.require_human_review,
      block: afterCounts.block - beforeCounts.block,
    },
    scenarioCount: scenarios.length,
  };

  return { summary, details };
}

async function evaluateDecisionForEntity(
  ctx: {
    accountId: string;
    metadata: Record<string, unknown>;
    policy: { constraints: Record<string, unknown>; readOnly?: boolean };
  },
  args: {
    entityType: AtlasEntityType;
    entityId: string;
    toolName: string;
    policy: JudgmentPolicy;
    input: ConstraintEvaluationInput;
  },
): Promise<JudgmentDecision> {
  const db = getDbFromMetadata(ctx);
  const correlationId = getCorrelationId(ctx);
  const rolloutRow = await getEngineRollout(db, {
    accountId: ctx.accountId,
    entityType: args.entityType,
    entityId: args.entityId,
  });
  const rollout: RolloutConfig = {
    mode: rolloutRow.mode,
    canaryPercent: rolloutRow.canary_percent,
  };

  const withRollout = await evaluateConstraintPolicyWithRollout(
    args.input,
    args.policy,
    rollout,
    hybridConfigFromContext(ctx),
  );
  const final = withRollout.final;
  const polarReference = withRollout.polar;
  let securityAction:
    | {
        mode: 'normal' | 'read_only' | 'off';
        incidentId?: string;
        reason?: string;
      }
    | undefined;

  await recordEngineEvent(db, {
    correlation_id: correlationId,
    account_id: ctx.accountId,
    entity_type: args.entityType,
    entity_id: args.entityId,
    tool_name: args.toolName,
    rollout_mode: rollout.mode,
    canary_percent: rollout.canaryPercent,
    sampled_polar: withRollout.sampledPolar ? 1 : 0,
    mismatch: withRollout.mismatch ? 1 : 0,
    evaluation_path: final.evaluationPath,
    fallback_used: polarReference.evaluationPath === 'fallback' ? 1 : 0,
    legacy_decision: withRollout.legacy.decision,
    polar_decision: withRollout.polar.decision,
    final_decision: final.decision,
    latency_ms: Math.floor(final.latencyMs),
  });

  const abuseMitigation = await evaluateAbusePatternAndMitigate(db, {
    accountId: ctx.accountId,
    correlationId,
    readOnly: ctx.policy.readOnly === true,
    currentDecision: final.decision,
    currentToolName: args.toolName,
    config: abuseMitigationConfigFromContext(ctx),
  });
  if (abuseMitigation.triggered && abuseMitigation.actionMode) {
    securityAction = {
      mode: abuseMitigation.actionMode,
      incidentId: abuseMitigation.incidentId,
      reason: abuseMitigation.reason,
    };
  }

  await emitJudgmentDecisionTrace(ctx, {
    correlationId,
    accountId: ctx.accountId,
    entityType: args.entityType,
    entityId: args.entityId,
    toolName: args.toolName,
    rolloutMode: rollout.mode,
    canaryPercent: rollout.canaryPercent,
    sampledPolar: withRollout.sampledPolar,
    mismatch: withRollout.mismatch,
    legacyDecision: withRollout.legacy.decision,
    polarDecision: withRollout.polar.decision,
    finalDecision: final.decision,
    evaluationPath: final.evaluationPath,
    fallbackReason: polarReference.fallbackReason ?? null,
    policyHash: polarReference.policyHash,
    compilerVersion: polarReference.compilerVersion,
    securityActionMode: securityAction?.mode ?? null,
    securityIncidentId: securityAction?.incidentId ?? null,
    securityActionReason: securityAction?.reason ?? null,
    latencyMs: Math.floor(final.latencyMs),
  });

  if (rollout.mode !== 'legacy_enforce') {
    const metrics = await getEngineMetricsSummary(db, {
      accountId: ctx.accountId,
      entityType: args.entityType,
      entityId: args.entityId,
    });
    if (
      metrics.total24h > 0 &&
      (metrics.mismatchRate > rolloutRow.mismatch_threshold ||
        metrics.fallbackRate > rolloutRow.fallback_rate_threshold)
    ) {
      await setEngineRollout(db, {
        accountId: ctx.accountId,
        entityType: args.entityType,
        entityId: args.entityId,
        mode: 'legacy_enforce',
        canaryPercent: 0,
        mismatchThreshold: rolloutRow.mismatch_threshold,
        fallbackRateThreshold: rolloutRow.fallback_rate_threshold,
        updatedBy: 'system:auto-rollback',
      });
    }
  }

  return {
    decision: final.decision,
    reason: final.reason,
    matchedRuleIds: final.matchedRuleIds,
    engine: final.engine,
    policyHash: polarReference.policyHash,
    compilerVersion: polarReference.compilerVersion,
    evaluationPath: final.evaluationPath,
    fallbackReason: polarReference.fallbackReason ?? null,
    latencyMs: Math.floor(final.latencyMs),
    securityAction,
    atlasSignals: atlasSignals(args.input),
  };
}

async function resolveVersionForTool(
  ctx: {
    accountId: string;
    metadata: Record<string, unknown>;
    policy: { constraints: Record<string, unknown> };
  },
  input: VersionedToolInput,
  entityType: AtlasEntityType,
  entityId: string,
  policyVersionId: string,
) {
  const db = getDbFromMetadata(ctx);
  const defaultCommitSha = input.commitSha ?? getStringMetadata(ctx, 'gitSha') ?? 'unknown';
  const runtimeRef = getStringMetadata(ctx, 'runtimeRef');
  const overrideRequested = Boolean(input.versionId || input.commitSha);
  const canOverride = allowVersionOverride(ctx);

  if (overrideRequested && !canOverride) {
    return {
      error: jsonError({
        error: 'version_override_not_allowed',
        message: 'Per-request version override is not permitted for this caller.',
        selectionSource: 'account_default',
      }),
      resolved: null,
      db,
      policyVersionId,
    } as const;
  }

  const resolved = await resolveActiveVersion(db, {
    accountId: ctx.accountId,
    entityType,
    entityId,
    policyVersionId,
    defaultCommitSha,
    runtimeRef,
    overrideVersionId: input.versionId,
    overrideCommitSha: input.commitSha,
    allowOverride: canOverride,
  });

  await bindPolicyToVersion(db, {
    versionId: resolved.versionId,
    policyVersionId: resolved.policyVersionId,
    policySnapshot: {
      accountId: ctx.accountId,
      constraints: ctx.policy.constraints,
    },
    enforcementMode: 'hard_gate',
  });

  return { error: null, resolved, db } as const;
}

async function blockIfNeeded(
  db: D1Database | undefined,
  accountId: string,
  versionId: string,
  decision: JudgmentDecision,
  sourceType: 'workflow_get' | 'workflow_mermaid' | 'workflow_map_from_tool_sequence' | 'mcp_map_to_workflow',
  sourceKey: string,
  pagePath: string,
): Promise<ReturnType<typeof errorContent> | null> {
  if (decision.decision !== 'block') return null;

  await recordVisualization(db, {
    accountId,
    versionId,
    sourceType,
    sourceKey,
    decision: decision.decision,
    decisionReason: decision.reason,
    workflowJson: { blocked: true },
    pagePath,
  });

  return jsonError({
    error: 'judgment_blocked',
    message: 'Execution blocked by Judgment policy.',
    judgmentDecision: decision,
  });
}

async function resolvePolicyForEntity(
  ctx: {
    accountId: string;
    metadata: Record<string, unknown>;
    policy: { readOnly?: boolean };
  },
  entityType: AtlasEntityType,
  entityId: string,
): Promise<{ policyVersionId: string; policy: JudgmentPolicy }> {
  const db = getDbFromMetadata(ctx);
  const resolved = await resolveActivePolicy(db, {
    accountId: ctx.accountId,
    entityType,
    entityId,
  });

  return {
    policyVersionId: resolved.policyVersionId,
    policy: resolved.policy,
  };
}

export function registerTools(server: ScopedMcpServer): void {
  server.tool(
    'auth_whoami',
    'Return authenticated account and authorization posture for this request context.',
    {},
    async (_params, ctx) => {
      return jsonContent({
        accountId: ctx.accountId,
        userId: ctx.userId ?? null,
        role: getRoleMetadata(ctx),
        readOnly: ctx.policy.readOnly === true,
        scopes: ctx.policy.scopes,
        constraints: ctx.policy.constraints,
      });
    },
    { readOnly: true },
  );

  server.tool(
    'atlas_stats',
    'Get summary counts for the AI Interaction Atlas dataset.',
    {},
    async (_params, ctx) => {
      return jsonContent({ accountId: ctx.accountId, stats: getAtlasStats() });
    },
    { readOnly: true },
  );

  server.tool(
    'atlas_search',
    'Search the AI Interaction Atlas by keyword across tasks, constraints, data artifacts, and touchpoints.',
    AtlasSearchSchema.shape,
    async (params, ctx) => {
      const input = AtlasSearchSchema.parse(params);
      const results = searchPatterns(input.query, {
        dimensions: input.dimensions,
        limit: input.limit ?? 25,
      });

      // Return a compact payload: enough to use in prompting + mapping.
      return jsonContent({
        accountId: ctx.accountId,
        query: input.query,
        results: results.map((r: any) => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          task_type: r.task_type,
          category: r.category,
          description: r.description ?? r.elevator_pitch,
        })),
      });
    },
    { readOnly: true },
  );

  server.tool(
    'atlas_get',
    'Get a single Atlas element by id (or task slug).',
    AtlasGetSchema.shape,
    async (params, ctx) => {
      const input = AtlasGetSchema.parse(params);
      const pattern = getPattern(input.id);
      if (!pattern) {
        return errorContent(`Pattern not found: ${input.id}`);
      }
      return jsonContent({ accountId: ctx.accountId, pattern });
    },
    { readOnly: true },
  );

  server.tool(
    'atlas_studio_portal_start',
    'Start or reuse the local Atlas Studio browser portal and return the URL for the Codex browser pane.',
    AtlasStudioPortalStartSchema.shape,
    async (params, ctx) => {
      const input = AtlasStudioPortalStartSchema.parse(params);
      const runtime = await startAtlasBrowserPortal({
        client: input.client,
        workflow: input.workflow,
        owner: input.owner,
        sessionId: input.session_id,
        restart: input.restart,
        cwd: atlasStudioCwd(),
      });
      return jsonContent({
        accountId: ctx.accountId,
        runtime,
        openUrl: runtime.sessionUrl,
        agentWriteExample: `atlas_studio_observe({ session_id: "${runtime.sessionId}", text: "client says...", suggest: true })`,
      });
    },
    { readOnly: false },
  );

  server.tool(
    'atlas_studio_portal_status',
    'Return the current local Atlas Studio browser portal runtime and whether its server process is active.',
    {},
    async (_params, ctx) => {
      return jsonContent({
        accountId: ctx.accountId,
        ...getAtlasBrowserPortalStatus(),
      });
    },
    { readOnly: true },
  );

  server.tool(
    'atlas_studio_portal_stop',
    'Stop the local Atlas Studio browser portal server if one is active.',
    {},
    async (_params, ctx) => {
      return jsonContent({
        accountId: ctx.accountId,
        ...stopAtlasBrowserPortal(),
      });
    },
    { readOnly: false },
  );

  server.tool(
    'atlas_studio_session_create',
    'Create an Atlas Studio mapping session in the local app-data store.',
    AtlasStudioSessionCreateSchema.shape,
    async (params, ctx) => {
      const input = AtlasStudioSessionCreateSchema.parse(params);
      const session = await createSession(
        {
          client: input.client,
          workflow: input.workflow,
          owner: input.owner,
        },
        atlasStudioCwd(),
      );
      return jsonContent({
        accountId: ctx.accountId,
        session,
        openWith: `atlas_studio_portal_start({ session_id: "${session.id}" })`,
      });
    },
    { readOnly: false },
  );

  server.tool(
    'atlas_studio_session_list',
    'List local Atlas Studio sessions from the app-data store.',
    {},
    async (_params, ctx) => {
      const sessions = await listSessions(atlasStudioCwd());
      return jsonContent({
        accountId: ctx.accountId,
        sessions: sessions.map((session) => ({
          id: session.id,
          client: session.client,
          workflow: session.workflow,
          owner: session.owner,
          updatedAt: session.updatedAt,
          nodes: session.canvas.nodes.length,
          edges: session.canvas.edges.length,
          observations: session.observations.length,
          queuedSuggestions: session.suggestions.filter((suggestion) => suggestion.status === 'queued').length,
        })),
      });
    },
    { readOnly: true },
  );

  server.tool(
    'atlas_studio_session_show',
    'Read a local Atlas Studio mapping session.',
    AtlasStudioSessionIdSchema.shape,
    async (params, ctx) => {
      const input = AtlasStudioSessionIdSchema.parse(params);
      return jsonContent({
        accountId: ctx.accountId,
        session: await readSession(input.session_id, atlasStudioCwd()),
      });
    },
    { readOnly: true },
  );

  server.tool(
    'atlas_studio_observe',
    'Add a live-call observation to an Atlas Studio session and optionally queue mapping suggestions.',
    AtlasStudioObserveSchema.shape,
    async (params, ctx) => {
      const input = AtlasStudioObserveSchema.parse(params);
      const session = await addObservation(
        input.session_id,
        {
          text: input.text,
          source: input.operator ? 'operator' : 'agent',
          suggest: input.suggest,
        },
        atlasStudioCwd(),
      );
      return jsonContent({
        accountId: ctx.accountId,
        sessionId: session.id,
        observations: session.observations.length,
        queuedSuggestions: session.suggestions.filter((suggestion) => suggestion.status === 'queued').length,
        session,
      });
    },
    { readOnly: false },
  );

  server.tool(
    'atlas_studio_node_add',
    'Add a node to an Atlas Studio canvas session.',
    AtlasStudioNodeAddSchema.shape,
    async (params, ctx) => {
      const input = AtlasStudioNodeAddSchema.parse(params);
      const session = await addNode(
        input.session_id,
        {
          kind: input.kind,
          label: input.label,
          atlasId: input.atlas_id,
          x: input.x,
          y: input.y,
          owner: input.owner,
          status: input.status,
          notes: input.notes,
          evidence: input.evidence,
          createdBy: input.operator ? 'operator' : 'agent',
        },
        atlasStudioCwd(),
      );
      return jsonContent({
        accountId: ctx.accountId,
        sessionId: session.id,
        node: session.canvas.nodes.at(-1),
        session,
      });
    },
    { readOnly: false },
  );

  server.tool(
    'atlas_studio_edge_add',
    'Add an edge between two Atlas Studio canvas nodes.',
    AtlasStudioEdgeAddSchema.shape,
    async (params, ctx) => {
      const input = AtlasStudioEdgeAddSchema.parse(params);
      const session = await addEdge(
        input.session_id,
        {
          source: input.source,
          target: input.target,
          label: input.label,
          evidence: input.evidence,
          createdBy: input.operator ? 'operator' : 'agent',
        },
        atlasStudioCwd(),
      );
      return jsonContent({
        accountId: ctx.accountId,
        sessionId: session.id,
        edge: session.canvas.edges.at(-1),
        session,
      });
    },
    { readOnly: false },
  );

  server.tool(
    'atlas_studio_suggestion_accept',
    'Accept a queued Atlas Studio mapping suggestion and materialize it on the canvas.',
    AtlasStudioSuggestionAcceptSchema.shape,
    async (params, ctx) => {
      const input = AtlasStudioSuggestionAcceptSchema.parse(params);
      const session = await acceptSuggestion(input.session_id, input.suggestion_id, atlasStudioCwd());
      return jsonContent({
        accountId: ctx.accountId,
        sessionId: session.id,
        nodes: session.canvas.nodes.length,
        queuedSuggestions: session.suggestions.filter((suggestion) => suggestion.status === 'queued').length,
        session,
      });
    },
    { readOnly: false },
  );

  server.tool(
    'atlas_studio_tidy',
    'Apply the deterministic Atlas Studio lane layout to a local canvas session.',
    AtlasStudioSessionIdSchema.shape,
    async (params, ctx) => {
      const input = AtlasStudioSessionIdSchema.parse(params);
      const session = await readSession(input.session_id, atlasStudioCwd());
      const updates = tidyNodeUpdates(session);
      const updateById = new Map(updates.map((update) => [update.id, update]));
      const next = {
        ...session,
        canvas: {
          ...session.canvas,
          nodes: session.canvas.nodes.map((node) => {
            const update = updateById.get(node.id);
            return update ? { ...node, ...update } : node;
          }),
        },
      };
      const written = updates.length ? await writeSession(next, atlasStudioCwd()) : session;
      return jsonContent({
        accountId: ctx.accountId,
        sessionId: written.id,
        updates,
        session: written,
      });
    },
    { readOnly: false },
  );

  server.tool(
    'atlas_studio_heal',
    'Attach and check production primitive bindings for a local Atlas Studio canvas session.',
    AtlasStudioHealSchema.shape,
    async (params, ctx) => {
      const input = AtlasStudioHealSchema.parse(params);
      const result = await healSessionProductionBindings(input.session_id, {
        cwd: atlasStudioCwd(),
        profile: input.profile ?? 'template-system',
      });
      return jsonContent({
        accountId: ctx.accountId,
        sessionId: result.session.id,
        profile: result.profile,
        summary: result.summary,
        session: result.session,
      });
    },
    { readOnly: false },
  );

  server.tool(
    'atlas_studio_propose_writeback',
    'Generate an approval-gated write-back proposal from a local Atlas Studio canvas session. This does not mutate production primitives.',
    AtlasStudioProposalSchema.shape,
    async (params, ctx) => {
      const input = AtlasStudioProposalSchema.parse(params);
      const result = await createWritebackProposal(input.session_id, {
        cwd: atlasStudioCwd(),
        profile: input.profile ?? 'template-system',
      });
      return jsonContent({
        accountId: ctx.accountId,
        sessionId: result.session.id,
        profile: result.profile,
        summary: result.summary,
        proposal: result.proposal,
        session: result.session,
      });
    },
    { readOnly: false },
  );

  server.tool(
    'atlas_studio_proposal_action_review',
    'Approve, reject, or return a write-back proposal action to proposed state. This only updates the local Atlas Studio review artifact.',
    AtlasStudioProposalActionReviewSchema.shape,
    async (params, ctx) => {
      const input = AtlasStudioProposalActionReviewSchema.parse(params);
      const result = await reviewWritebackProposalAction(
        input.session_id,
        {
          actionId: input.action_id,
          actor: input.operator === false ? 'agent' : 'operator',
          note: input.note,
          proposalId: input.proposal_id,
          status: input.status,
        },
        atlasStudioCwd(),
      );
      return jsonContent({
        accountId: ctx.accountId,
        sessionId: result.session.id,
        summary: result.summary,
        proposal: result.proposal,
        action: result.action,
        session: result.session,
      });
    },
    { readOnly: false },
  );

  server.tool(
    'atlas_studio_proposal_handoff',
    'Export a Codex-ready markdown handoff for an Atlas Studio write-back proposal. Approved actions are separated from pending and rejected actions.',
    AtlasStudioProposalHandoffSchema.shape,
    async (params, ctx) => {
      const input = AtlasStudioProposalHandoffSchema.parse(params);
      const markdown = await exportWritebackProposalHandoffForSession(input.session_id, {
        cwd: atlasStudioCwd(),
        proposalId: input.proposal_id,
      });
      return jsonContent({
        accountId: ctx.accountId,
        sessionId: input.session_id,
        proposalId: input.proposal_id ?? 'latest',
        markdown,
      });
    },
    { readOnly: true },
  );

  server.tool(
    'atlas_studio_export',
    'Export a local Atlas Studio mapping session as markdown.',
    AtlasStudioSessionIdSchema.shape,
    async (params, ctx) => {
      const input = AtlasStudioSessionIdSchema.parse(params);
      const session = await readSession(input.session_id, atlasStudioCwd());
      return jsonContent({
        accountId: ctx.accountId,
        sessionId: session.id,
        markdown: exportSessionMarkdown(session),
      });
    },
    { readOnly: true },
  );

  server.tool(
    'workflow_list',
    'List available workflow mappings (read-only).',
    {},
    async (_params, ctx) => {
      return jsonContent({ accountId: ctx.accountId, workflows: listWorkflowSummaries() });
    },
    { readOnly: true },
  );

  server.tool(
    'workflow_get',
    'Get a workflow mapping as an Atlas WorkflowTemplate (nodes + edges).',
    WorkflowIdSchema.shape,
    async (params, ctx) => {
      const input = WorkflowIdSchema.parse(params);
      const template = getBuiltWorkflowTemplate(input.workflow_id);
      if (!template) return errorContent(`Unknown workflow_id: ${input.workflow_id}`);

      const activePolicy = await resolvePolicyForEntity(ctx, 'agent', input.workflow_id);
      const versionResult = await resolveVersionForTool(
        ctx,
        input,
        'agent',
        input.workflow_id,
        activePolicy.policyVersionId,
      );
      if (versionResult.error) return versionResult.error;
      const latestEstimate = await getLatestEstimateReport(versionResult.db, ctx.accountId, 'agent', input.workflow_id);

      const baseUrl = getStringMetadata(ctx, 'baseUrl');
      const pagePath = `/workflows/${input.workflow_id}?version=${encodeURIComponent(versionResult.resolved.versionId)}`;
      const visualizationUrl = buildVisualizationUrl(baseUrl, pagePath);
      const validation = validateBuiltWorkflow(template);
      const decision = await evaluateDecisionForEntity(ctx, {
        entityType: 'agent',
        entityId: input.workflow_id,
        toolName: 'workflow_get',
        policy: activePolicy.policy,
        input: {
          toolName: 'workflow_get',
          accountId: ctx.accountId,
          readOnly: ctx.policy.readOnly === true,
          hasWriteIntent: false,
          hasHumanReviewStep: true,
        },
      });

      const blocked = await blockIfNeeded(
        versionResult.db,
        ctx.accountId,
        versionResult.resolved.versionId,
        decision,
        'workflow_get',
        input.workflow_id,
        pagePath,
      );
      if (blocked) return blocked;

      await recordVisualization(versionResult.db, {
        accountId: ctx.accountId,
        versionId: versionResult.resolved.versionId,
        sourceType: 'workflow_get',
        sourceKey: input.workflow_id,
        decision: decision.decision,
        decisionReason: decision.reason,
        workflowJson: template,
        mermaidText: getWorkflowMermaid(input.workflow_id) ?? undefined,
        pagePath,
      });

      return jsonContent({
        accountId: ctx.accountId,
        workflow_id: input.workflow_id,
        valid: validation.valid,
        invalidIds: validation.invalidIds,
        workflow: template,
        resolvedVersion: versionResult.resolved.versionId,
        selectionSource: versionResult.resolved.selectionSource,
        commitSha: versionResult.resolved.commitSha,
        policyVersionId: versionResult.resolved.policyVersionId,
        activePolicyVersionId: activePolicy.policyVersionId,
        estimateReference: latestEstimate?.id ?? null,
        visualizationUrl,
        judgmentDecision: decision,
      });
    },
    { readOnly: true },
  );

  server.tool(
    'workflow_mermaid',
    'Get a workflow mapping as Mermaid flowchart text for quick visualization.',
    WorkflowIdSchema.shape,
    async (params, ctx) => {
      const input = WorkflowIdSchema.parse(params);
      const mermaid = getWorkflowMermaid(input.workflow_id);
      if (!mermaid) return errorContent(`Unknown workflow_id: ${input.workflow_id}`);

      const activePolicy = await resolvePolicyForEntity(ctx, 'agent', input.workflow_id);
      const versionResult = await resolveVersionForTool(
        ctx,
        input,
        'agent',
        input.workflow_id,
        activePolicy.policyVersionId,
      );
      if (versionResult.error) return versionResult.error;
      const latestEstimate = await getLatestEstimateReport(versionResult.db, ctx.accountId, 'agent', input.workflow_id);

      const baseUrl = getStringMetadata(ctx, 'baseUrl');
      const pagePath = `/workflows/${input.workflow_id}?version=${encodeURIComponent(versionResult.resolved.versionId)}`;
      const visualizationUrl = buildVisualizationUrl(baseUrl, pagePath);
      const decision = await evaluateDecisionForEntity(ctx, {
        entityType: 'agent',
        entityId: input.workflow_id,
        toolName: 'workflow_mermaid',
        policy: activePolicy.policy,
        input: {
          toolName: 'workflow_mermaid',
          accountId: ctx.accountId,
          readOnly: ctx.policy.readOnly === true,
          hasWriteIntent: false,
          hasHumanReviewStep: true,
        },
      });

      const blocked = await blockIfNeeded(
        versionResult.db,
        ctx.accountId,
        versionResult.resolved.versionId,
        decision,
        'workflow_mermaid',
        input.workflow_id,
        pagePath,
      );
      if (blocked) return blocked;

      await recordVisualization(versionResult.db, {
        accountId: ctx.accountId,
        versionId: versionResult.resolved.versionId,
        sourceType: 'workflow_mermaid',
        sourceKey: input.workflow_id,
        decision: decision.decision,
        decisionReason: decision.reason,
        workflowJson: { workflow_id: input.workflow_id },
        mermaidText: mermaid,
        pagePath,
      });

      return jsonContent({
        accountId: ctx.accountId,
        workflow_id: input.workflow_id,
        mermaid,
        resolvedVersion: versionResult.resolved.versionId,
        selectionSource: versionResult.resolved.selectionSource,
        commitSha: versionResult.resolved.commitSha,
        policyVersionId: versionResult.resolved.policyVersionId,
        activePolicyVersionId: activePolicy.policyVersionId,
        estimateReference: latestEstimate?.id ?? null,
        visualizationUrl,
        judgmentDecision: decision,
      });
    },
    { readOnly: true },
  );

  server.tool(
    'workflow_map_from_tool_sequence',
    'Automatically map an ordered tool-call sequence into an Atlas WorkflowTemplate for client review.',
    WorkflowMapFromToolSequenceSchema.shape,
    async (params, ctx) => {
      const input = WorkflowMapFromToolSequenceSchema.parse(params);
      const mapped = mapToolSequenceToWorkflowDefinition(input);
      const def = mapped.definition;
      const workflow = buildWorkflowTemplate(def);
      const validation = validateBuiltWorkflow(workflow);
      const mermaid = workflowTemplateToMermaid(workflow);

      const activePolicy = await resolvePolicyForEntity(ctx, 'agent', def.id);
      const versionResult = await resolveVersionForTool(
        ctx,
        input,
        'agent',
        def.id,
        activePolicy.policyVersionId,
      );
      if (versionResult.error) return versionResult.error;
      const latestEstimate = await getLatestEstimateReport(versionResult.db, ctx.accountId, 'agent', def.id);

      const hasWriteIntent = input.sequence.some((s) => hasWriteLikeName(s.tool));
      const hasHumanReviewStep = input.add_human_review !== false || def.steps.some((s) => hasHumanReviewReference(s.referenceId));
      const decision = await evaluateDecisionForEntity(ctx, {
        entityType: 'agent',
        entityId: def.id,
        toolName: 'workflow_map_from_tool_sequence',
        policy: activePolicy.policy,
        input: {
          toolName: 'workflow_map_from_tool_sequence',
          accountId: ctx.accountId,
          readOnly: ctx.policy.readOnly === true,
          hasWriteIntent,
          hasHumanReviewStep,
        },
      });

      const baseUrl = getStringMetadata(ctx, 'baseUrl');
      const pagePath = `/workflows/${def.id}?version=${encodeURIComponent(versionResult.resolved.versionId)}`;
      const visualizationUrl = buildVisualizationUrl(baseUrl, pagePath);
      const blocked = await blockIfNeeded(
        versionResult.db,
        ctx.accountId,
        versionResult.resolved.versionId,
        decision,
        'workflow_map_from_tool_sequence',
        def.id,
        pagePath,
      );
      if (blocked) return blocked;

      await recordVisualization(versionResult.db, {
        accountId: ctx.accountId,
        versionId: versionResult.resolved.versionId,
        sourceType: 'workflow_map_from_tool_sequence',
        sourceKey: def.id,
        decision: decision.decision,
        decisionReason: decision.reason,
        workflowJson: workflow,
        mermaidText: mermaid,
        pagePath,
      });

      return jsonContent({
        accountId: ctx.accountId,
        definition: def,
        warnings: mapped.warnings,
        valid: validation.valid,
        invalidIds: validation.invalidIds,
        mermaid,
        workflow,
        resolvedVersion: versionResult.resolved.versionId,
        selectionSource: versionResult.resolved.selectionSource,
        commitSha: versionResult.resolved.commitSha,
        policyVersionId: versionResult.resolved.policyVersionId,
        activePolicyVersionId: activePolicy.policyVersionId,
        estimateReference: latestEstimate?.id ?? null,
        visualizationUrl,
        judgmentDecision: decision,
      });
    },
    { readOnly: true },
  );

  server.tool(
    'mcp_catalog_list',
    'List known MCP servers from the Playbook catalog.',
    McpCatalogListSchema.shape,
    async (params, ctx) => {
      const input = McpCatalogListSchema.parse(params);
      return jsonContent({
        accountId: ctx.accountId,
        category: input.category ?? 'all',
        catalog: listMcpCatalog(input.category),
      });
    },
    { readOnly: true },
  );

  server.tool(
    'mcp_introspect',
    'Introspect an MCP server (tools/resources/prompts) via Streamable HTTP.',
    McpIntrospectSchema.shape,
    async (params, ctx) => {
      const input = McpIntrospectSchema.parse(params);

      const entry = input.slug ? findMcpCatalogEntry(input.slug) : undefined;
      if (input.slug && !entry) return errorContent(`Unknown MCP slug: ${input.slug}`);

      const endpointUrl = input.url
        ? resolveMcpHttpEndpointUrlFromUrl(input.url)
        : entry
          ? resolveMcpHttpEndpointUrl(entry)
          : undefined;
      if (!endpointUrl) return errorContent('Provide slug or url.');

      const introspection = await introspectMcpServer(endpointUrl);

      return jsonContent({
        accountId: ctx.accountId,
        entry,
        endpointUrl,
        introspection,
      });
    },
    { readOnly: true },
  );

  server.tool(
    'mcp_map_to_workflow',
    'Automatically map an MCP server into an Atlas workflow (capability map) for client review.',
    McpMapSchema.shape,
    async (params, ctx) => {
      const input = McpMapSchema.parse(params);

      const entry = input.slug
        ? findMcpCatalogEntry(input.slug)
        : input.url
          ? makeSyntheticCatalogEntry(input.url, input.name)
          : undefined;
      if (input.slug && !entry) return errorContent(`Unknown MCP slug: ${input.slug}`);
      if (!entry) return errorContent('Provide slug or url.');

      const endpointUrl = input.url
        ? resolveMcpHttpEndpointUrlFromUrl(input.url)
        : resolveMcpHttpEndpointUrl(entry);

      const introspection = await introspectMcpServer(endpointUrl);
      const mapped = mapMcpToWorkflowDefinition(entry, introspection.ok ? introspection.value : undefined);
      const def = mapped.definition;

      const workflow = buildWorkflowTemplate(def);
      const validation = validateBuiltWorkflow(workflow);
      const mermaid = workflowTemplateToMermaid(workflow);

      const activePolicy = await resolvePolicyForEntity(ctx, 'mcp', entry.slug);
      const versionResult = await resolveVersionForTool(
        ctx,
        input,
        'mcp',
        entry.slug,
        activePolicy.policyVersionId,
      );
      if (versionResult.error) return versionResult.error;
      const latestEstimate = await getLatestEstimateReport(versionResult.db, ctx.accountId, 'mcp', entry.slug);

      const introspectionToolNames = introspection.ok ? introspection.value.tools.map((tool) => tool.name) : [];
      const hasWriteIntent = introspectionToolNames.some((toolName) => hasWriteLikeName(toolName));
      const hasHumanReviewStep = def.steps.some((s) => hasHumanReviewReference(s.referenceId));
      const decision = await evaluateDecisionForEntity(ctx, {
        entityType: 'mcp',
        entityId: entry.slug,
        toolName: 'mcp_map_to_workflow',
        policy: activePolicy.policy,
        input: {
          toolName: 'mcp_map_to_workflow',
          accountId: ctx.accountId,
          readOnly: ctx.policy.readOnly === true,
          hasWriteIntent,
          hasHumanReviewStep,
          introspectionOk: introspection.ok,
        },
      });

      const baseUrl = getStringMetadata(ctx, 'baseUrl');
      const pagePath = `/mcps/${entry.slug}?version=${encodeURIComponent(versionResult.resolved.versionId)}`;
      const visualizationUrl = buildVisualizationUrl(baseUrl, pagePath);
      const blocked = await blockIfNeeded(
        versionResult.db,
        ctx.accountId,
        versionResult.resolved.versionId,
        decision,
        'mcp_map_to_workflow',
        entry.slug,
        pagePath,
      );
      if (blocked) return blocked;

      await recordVisualization(versionResult.db, {
        accountId: ctx.accountId,
        versionId: versionResult.resolved.versionId,
        sourceType: 'mcp_map_to_workflow',
        sourceKey: entry.slug,
        decision: decision.decision,
        decisionReason: decision.reason,
        workflowJson: workflow,
        mermaidText: mermaid,
        pagePath,
      });

      return jsonContent({
        accountId: ctx.accountId,
        entry,
        endpointUrl,
        introspection,
        definition: def,
        warnings: mapped.warnings,
        valid: validation.valid,
        invalidIds: validation.invalidIds,
        mermaid,
        workflow,
        resolvedVersion: versionResult.resolved.versionId,
        selectionSource: versionResult.resolved.selectionSource,
        commitSha: versionResult.resolved.commitSha,
        policyVersionId: versionResult.resolved.policyVersionId,
        activePolicyVersionId: activePolicy.policyVersionId,
        estimateReference: latestEstimate?.id ?? null,
        visualizationUrl,
        judgmentDecision: decision,
      });
    },
    { readOnly: true },
  );

  server.tool(
    'judgment_dashboard_summary',
    'Get account-scoped Judgment Layer dashboard data for Atlas Studio (policies, estimates, runs, approvals).',
    JudgmentDashboardSummaryParamsSchema.shape,
    async (params, ctx) => {
      const input = JudgmentDashboardSummarySchema.parse(params);
      const db = getDbFromMetadata(ctx);
      const dashboard = await getJudgmentDashboardSummary(db, {
        accountId: ctx.accountId,
        entityType: input.entity_type,
        entityId: input.entity_id,
        recentLimit: input.recent_limit,
      });
      return jsonContent({
        meta: {
          authScope: 'account',
          note: 'Use this payload as Atlas Studio dashboard state; web policy editor is deprecated.',
        },
        dashboard,
      });
    },
    { readOnly: true },
  );

  server.tool(
    'judgment_policy_get',
    'Get a judgment policy version (or the active policy) for an MCP/agent entity.',
    JudgmentPolicyGetSchema.shape,
    async (params, ctx) => {
      const input = JudgmentPolicyGetSchema.parse(params);
      const db = getDbFromMetadata(ctx);
      const versions = await listPolicyVersions(db, ctx.accountId, input.entity_type, input.entity_id);

      if (input.policy_version_id) {
        const row = await getPolicyVersionById(db, ctx.accountId, input.policy_version_id);
        if (!row) return errorContent(`Unknown policy_version_id for account "${ctx.accountId}": ${input.policy_version_id}`);
        const parsedPolicy = JSON.parse(row.policy_json);
        return jsonContent({
          meta: {
            authScope: 'account',
            note: 'Response is scoped to authenticated account context.',
          },
          accountId: ctx.accountId,
          entity_type: input.entity_type,
          entity_id: input.entity_id,
          policyVersion: row,
          policy: parsedPolicy,
          compiled: {
            policy_engine: row.policy_engine ?? 'polar_v1',
            policy_hash: row.policy_hash ?? null,
            compiler_version: row.compiler_version ?? null,
          },
          guardrails: guardrailsFromPolicy(parsedPolicy),
          availableVersions: versions.map((v) => {
            const parsed = JSON.parse(v.policy_json);
            return {
              id: v.id,
              status: v.status,
              created_at: v.created_at,
              policy_engine: v.policy_engine ?? 'polar_v1',
              policy_hash: v.policy_hash ?? null,
              compiler_version: v.compiler_version ?? null,
              guardrails: guardrailsFromPolicy(parsed),
            };
          }),
        });
      }

      const active = await resolveActivePolicy(db, {
        accountId: ctx.accountId,
        entityType: input.entity_type,
        entityId: input.entity_id,
      });
      return jsonContent({
        meta: {
          authScope: 'account',
          note: 'Response is scoped to authenticated account context.',
        },
        accountId: ctx.accountId,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        activePolicyVersionId: active.policyVersionId,
        policy: active.policy,
        compiled: {
          policy_engine: active.compiled.policy_engine,
          policy_hash: active.compiled.policy_hash,
          compiler_version: active.compiled.compiler_version,
        },
        guardrails: guardrailsFromPolicy(active.policy),
        availableVersions: versions.map((v) => {
          const parsed = JSON.parse(v.policy_json);
          return {
            id: v.id,
            status: v.status,
            created_at: v.created_at,
            policy_engine: v.policy_engine ?? 'polar_v1',
            policy_hash: v.policy_hash ?? null,
            compiler_version: v.compiler_version ?? null,
            guardrails: guardrailsFromPolicy(parsed),
          };
        }),
      });
    },
    { readOnly: true },
  );

  server.tool(
    'judgment_policy_save',
    'Save a judgment policy version as draft/active/archived for an MCP/agent entity.',
    JudgmentPolicySaveSchema.shape,
    async (params, ctx) => {
      const input = JudgmentPolicySaveSchema.parse(params);
      if (!allowVersionSelectionWrite(ctx)) {
        return jsonError({
          error: 'policy_save_not_allowed',
          message: 'Saving policies is not permitted for this caller.',
        });
      }

      const db = getDbFromMetadata(ctx);
      const row = await savePolicyVersion(db, {
        accountId: ctx.accountId,
        entityType: input.entity_type,
        entityId: input.entity_id,
        status: input.status,
        policy: input.policy,
        createdBy: ctx.userId ?? 'api-key',
      });

      if (input.status === 'active') {
        await activatePolicyVersion(db, {
          accountId: ctx.accountId,
          entityType: input.entity_type,
          entityId: input.entity_id,
          policyVersionId: row.id,
          updatedBy: ctx.userId ?? 'api-key',
        });
      }

      return jsonContent({
        meta: {
          authScope: 'account',
          note: 'Mutation applies within authenticated account context.',
        },
        accountId: ctx.accountId,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        policyVersionId: row.id,
        status: row.status,
        compiled: {
          policy_engine: row.policy_engine ?? 'polar_v1',
          policy_hash: row.policy_hash ?? null,
          compiler_version: row.compiler_version ?? null,
        },
      });
    },
    { readOnly: false },
  );

  server.tool(
    'judgment_policy_activate',
    'Activate a saved judgment policy version for an MCP/agent entity.',
    JudgmentPolicyActivateSchema.shape,
    async (params, ctx) => {
      const input = JudgmentPolicyActivateSchema.parse(params);
      if (!allowVersionSelectionWrite(ctx)) {
        return jsonError({
          error: 'policy_activate_not_allowed',
          message: 'Activating policies is not permitted for this caller.',
        });
      }

      const db = getDbFromMetadata(ctx);
      const version = await getPolicyVersionById(db, ctx.accountId, input.policy_version_id);
      if (!version) return errorContent(`Unknown policy_version_id for account "${ctx.accountId}": ${input.policy_version_id}`);
      if (version.entity_type !== input.entity_type || version.entity_id !== input.entity_id) {
        return errorContent('policy_version_id does not belong to the requested entity.');
      }

      await activatePolicyVersion(db, {
        accountId: ctx.accountId,
        entityType: input.entity_type,
        entityId: input.entity_id,
        policyVersionId: input.policy_version_id,
        updatedBy: ctx.userId ?? 'api-key',
      });

      return jsonContent({
        meta: {
          authScope: 'account',
          note: 'Mutation applies within authenticated account context.',
        },
        accountId: ctx.accountId,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        activePolicyVersionId: input.policy_version_id,
      });
    },
    { readOnly: false },
  );

  server.tool(
    'judgment_policy_estimate',
    'Estimate before/after decision deltas for policy tuning and persist a shareable report.',
    JudgmentPolicyEstimateSchema.shape,
    async (params, ctx) => {
      const input = JudgmentPolicyEstimateSchema.parse(params);
      if (!allowVersionSelectionWrite(ctx)) {
        return jsonError({
          error: 'policy_estimate_not_allowed',
          message: 'Running policy estimates is not permitted for this caller.',
        });
      }

      const db = getDbFromMetadata(ctx);
      const activeBefore = await resolveActivePolicy(db, {
        accountId: ctx.accountId,
        entityType: input.entity_type,
        entityId: input.entity_id,
      });

      const beforeRow = input.before_policy_version_id
        ? await getPolicyVersionById(db, ctx.accountId, input.before_policy_version_id)
        : null;
      const beforePolicy = beforeRow
        ? (JSON.parse(beforeRow.policy_json) as JudgmentPolicy)
        : activeBefore.policy;
      const beforePolicyVersionId = beforeRow?.id ?? activeBefore.policyVersionId;

      let afterPolicy: JudgmentPolicy;
      let afterPolicyVersionId: string;
      if (input.after_policy_version_id) {
        const afterRow = await getPolicyVersionById(db, ctx.accountId, input.after_policy_version_id);
        if (!afterRow) return errorContent(`Unknown after_policy_version_id: ${input.after_policy_version_id}`);
        afterPolicy = JSON.parse(afterRow.policy_json) as JudgmentPolicy;
        afterPolicyVersionId = afterRow.id;
      } else if (input.policy) {
        const saved = await savePolicyVersion(db, {
          accountId: ctx.accountId,
          entityType: input.entity_type,
          entityId: input.entity_id,
          status: 'draft',
          policy: input.policy,
          createdBy: ctx.userId ?? 'api-key',
        });
        afterPolicy = input.policy;
        afterPolicyVersionId = saved.id;
      } else {
        afterPolicy = activeBefore.policy;
        afterPolicyVersionId = activeBefore.policyVersionId;
      }

      const scenarios = input.scenarios ?? defaultEstimateScenarios();
      const estimate = await evaluatePolicyScenarios(
        ctx.accountId,
        ctx.policy.readOnly === true,
        beforePolicy,
        afterPolicy,
        scenarios,
        hybridConfigFromContext(ctx),
      );

      const report = await saveEstimateReport(db, {
        accountId: ctx.accountId,
        entityType: input.entity_type,
        entityId: input.entity_id,
        beforePolicyVersionId: beforePolicyVersionId ?? null,
        afterPolicyVersionId,
        scenarioSet: scenarios,
        summary: estimate.summary,
        createdBy: ctx.userId ?? 'api-key',
      });
      const baseUrl = getStringMetadata(ctx, 'baseUrl');
      const reportPath = `/reports/${report.id}`;
      const reportUrl = buildVisualizationUrl(baseUrl, reportPath);

      return jsonContent({
        meta: {
          authScope: 'account',
          note: 'Estimate/report is scoped to authenticated account context.',
        },
        accountId: ctx.accountId,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        beforePolicyVersionId,
        afterPolicyVersionId,
        inlineSummary: estimate.summary,
        scenarioDetails: estimate.details,
        reportId: report.id,
        reportUrl,
      });
    },
    { readOnly: false },
  );

  server.tool(
    'judgment_policy_compare_report_get',
    'Get a saved policy estimate comparison report by id.',
    JudgmentPolicyCompareReportGetSchema.shape,
    async (params, ctx) => {
      const input = JudgmentPolicyCompareReportGetSchema.parse(params);
      const db = getDbFromMetadata(ctx);
      const report = await getEstimateReportById(db, ctx.accountId, input.report_id);
      if (!report) return errorContent(`Unknown report_id for account "${ctx.accountId}": ${input.report_id}`);

      return jsonContent({
        meta: {
          authScope: 'account',
          note: 'Response is scoped to authenticated account context.',
        },
        accountId: ctx.accountId,
        report: {
          ...report,
          scenario_set: JSON.parse(report.scenario_set_json),
          summary: JSON.parse(report.summary_json),
        },
      });
    },
    { readOnly: true },
  );

  server.tool(
    'judgment_engine_rollout_get',
    'Get rollout mode for hybrid policy engine on an MCP/agent entity.',
    JudgmentEngineRolloutGetSchema.shape,
    async (params, ctx) => {
      const input = JudgmentEngineRolloutGetSchema.parse(params);
      const db = getDbFromMetadata(ctx);
      const rollout = await getEngineRollout(db, {
        accountId: ctx.accountId,
        entityType: input.entity_type,
        entityId: input.entity_id,
      });

      return jsonContent({
        meta: {
          authScope: 'account',
          note: 'Response is scoped to authenticated account context.',
        },
        accountId: ctx.accountId,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        rollout: {
          mode: rollout.mode,
          canary_percent: rollout.canary_percent,
          mismatch_threshold: rollout.mismatch_threshold,
          fallback_rate_threshold: rollout.fallback_rate_threshold,
          updated_by: rollout.updated_by,
          updated_at: rollout.updated_at,
        },
      });
    },
    { readOnly: true },
  );

  server.tool(
    'judgment_engine_rollout_set',
    'Set rollout mode for hybrid policy engine on an MCP/agent entity.',
    JudgmentEngineRolloutSetSchema.shape,
    async (params, ctx) => {
      const input = JudgmentEngineRolloutSetSchema.parse(params);
      if (!allowVersionSelectionWrite(ctx)) {
        return jsonError({
          error: 'engine_rollout_set_not_allowed',
          message: 'Setting engine rollout is not permitted for this caller.',
        });
      }

      const db = getDbFromMetadata(ctx);
      const rollout = await setEngineRollout(db, {
        accountId: ctx.accountId,
        entityType: input.entity_type,
        entityId: input.entity_id,
        mode: input.mode,
        canaryPercent: input.canary_percent,
        mismatchThreshold: input.mismatch_threshold,
        fallbackRateThreshold: input.fallback_rate_threshold,
        updatedBy: ctx.userId ?? 'api-key',
      });

      return jsonContent({
        meta: {
          authScope: 'account',
          note: 'Mutation applies within authenticated account context.',
        },
        accountId: ctx.accountId,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        rollout: {
          mode: rollout.mode,
          canary_percent: rollout.canary_percent,
          mismatch_threshold: rollout.mismatch_threshold,
          fallback_rate_threshold: rollout.fallback_rate_threshold,
          updated_by: rollout.updated_by,
          updated_at: rollout.updated_at,
        },
      });
    },
    { readOnly: false },
  );

  server.tool(
    'judgment_security_status_get',
    'Get account tool-access mode and recent security incidents.',
    JudgmentSecurityStatusGetSchema.shape,
    async (params, ctx) => {
      const input = JudgmentSecurityStatusGetSchema.parse(params);
      const db = getDbFromMetadata(ctx);
      const access = await getAccountAccess(db, ctx.accountId);
      const incidents = await listRecentSecurityIncidents(db, {
        accountId: ctx.accountId,
        limit: input.limit ?? 10,
        status: input.status,
      });

      return jsonContent({
        meta: {
          authScope: 'account',
          note: 'Response is scoped to authenticated account context.',
        },
        accountId: ctx.accountId,
        access: {
          mode: access.mode,
          reason: access.reason,
          incident_id: access.incident_id,
          updated_by: access.updated_by,
          updated_at: access.updated_at,
          expires_at: access.expires_at,
        },
        incidents: incidents.map((row) => ({
          id: row.id,
          incident_type: row.incident_type,
          severity: row.severity,
          action_mode: row.action_mode,
          reason: row.reason,
          signal: parseJsonRecord(row.signal_json),
          status: row.status,
          correlation_id: row.correlation_id,
          created_at: row.created_at,
          resolved_at: row.resolved_at,
          resolved_by: row.resolved_by,
        })),
      });
    },
    { readOnly: true },
  );

  server.tool(
    'judgment_security_incident_review_next',
    'Claim the next open security incident for agent triage and recommended action.',
    JudgmentSecurityIncidentReviewNextSchema.shape,
    async (params, ctx) => {
      if (!allowControlPlaneWrite(ctx)) {
        return jsonError({
          error: 'security_incident_review_not_allowed',
          message: 'Claiming security incidents is not permitted for this caller.',
        });
      }

      const input = JudgmentSecurityIncidentReviewNextSchema.parse(params);
      const db = getDbFromMetadata(ctx);
      const claimed = await claimNextSecurityIncidentForReview(db, {
        accountId: ctx.accountId,
        reviewerId: ctx.userId ?? 'api-key',
        claimTtlSeconds: input.claim_ttl_seconds,
      });

      return jsonContent({
        meta: {
          authScope: 'account',
          note: 'Mutation applies within authenticated account context.',
        },
        accountId: ctx.accountId,
        incident: claimed
          ? {
              id: claimed.incident.id,
              incident_type: claimed.incident.incident_type,
              severity: claimed.incident.severity,
              action_mode: claimed.incident.action_mode,
              reason: claimed.incident.reason,
              signal: parseJsonRecord(claimed.incident.signal_json),
              status: claimed.incident.status,
              correlation_id: claimed.incident.correlation_id,
              created_at: claimed.incident.created_at,
            }
          : null,
        claim: claimed
          ? {
              claimed_by: claimed.claim.claimed_by,
              claimed_at: claimed.claim.claimed_at,
              claim_expires_at: claimed.claim.claim_expires_at,
            }
          : null,
        recommendation: claimed ? claimed.recommendation : null,
      });
    },
    { readOnly: false },
  );

  server.tool(
    'judgment_security_access_set',
    'Manually set account MCP tool-access mode for incident response.',
    JudgmentSecurityAccessSetSchema.shape,
    async (params, ctx) => {
      const input = JudgmentSecurityAccessSetSchema.parse(params);
      if (!allowControlPlaneWrite(ctx)) {
        return jsonError({
          error: 'security_access_set_not_allowed',
          message: 'Setting security access mode is not permitted for this caller.',
        });
      }

      const db = getDbFromMetadata(ctx);
      const row = await setAccountAccess(db, {
        accountId: ctx.accountId,
        mode: input.mode,
        reason: input.reason,
        updatedBy: ctx.userId ?? 'api-key',
        expiresAt: input.expires_at ?? null,
      });

      return jsonContent({
        meta: {
          authScope: 'account',
          note: 'Mutation applies within authenticated account context.',
        },
        accountId: ctx.accountId,
        access: {
          mode: row.mode,
          reason: row.reason,
          incident_id: row.incident_id,
          updated_by: row.updated_by,
          updated_at: row.updated_at,
          expires_at: row.expires_at,
        },
      });
    },
    { readOnly: false },
  );

  server.tool(
    'judgment_security_incident_resolve',
    'Resolve a security incident and apply an explicit access decision.',
    JudgmentSecurityIncidentResolveSchema.shape,
    async (params, ctx) => {
      const input = JudgmentSecurityIncidentResolveSchema.parse(params);
      if (!allowControlPlaneWrite(ctx)) {
        return jsonError({
          error: 'security_incident_resolve_not_allowed',
          message: 'Resolving security incidents is not permitted for this caller.',
        });
      }

      const db = getDbFromMetadata(ctx);
      const existing = await getSecurityIncidentById(db, {
        accountId: ctx.accountId,
        incidentId: input.incident_id,
      });
      if (!existing) {
        return errorContent(`Unknown incident_id for account "${ctx.accountId}": ${input.incident_id}`);
      }

      const resolved = await resolveSecurityIncident(db, {
        accountId: ctx.accountId,
        incidentId: input.incident_id,
        decision: input.decision,
        note: input.note,
        decidedBy: ctx.userId ?? 'api-key',
      });

      if (!resolved) {
        return errorContent(`Unable to resolve incident_id for account "${ctx.accountId}": ${input.incident_id}`);
      }

      return jsonContent({
        meta: {
          authScope: 'account',
          note: 'Mutation applies within authenticated account context.',
        },
        accountId: ctx.accountId,
        incident: {
          id: resolved.incident.id,
          status: resolved.incident.status,
          resolved_at: resolved.incident.resolved_at,
          resolved_by: resolved.incident.resolved_by,
        },
        appliedAccessMode: resolved.accessMode,
      });
    },
    { readOnly: false },
  );

  server.tool(
    'automation_contract_list',
    'List active automation contracts for the authenticated account.',
    {},
    async (_params, ctx) => {
      const db = getDbFromMetadata(ctx);
      const rows = await listActiveAutomationContracts(db, ctx.accountId);
      return jsonContent({
        meta: { authScope: 'account' },
        accountId: ctx.accountId,
        automations: rows.map((row) => ({
          automation_id: row.automation_id,
          name: row.name,
          version: row.version,
          status: row.status,
          execution_mode: row.execution_mode,
          policy_version_id: row.policy_version_id,
          approval_mode: row.approval_mode,
          trigger_type: row.trigger_type,
          created_at: row.created_at,
        })),
      });
    },
    { readOnly: true },
  );

  server.tool(
    'automation_contract_get',
    'Get the active automation contract by automation_id.',
    AutomationContractGetSchema.shape,
    async (params, ctx) => {
      const input = AutomationContractGetSchema.parse(params);
      const db = getDbFromMetadata(ctx);
      const row = await getActiveAutomationContract(db, ctx.accountId, input.automation_id);
      if (!row) return errorContent(`Unknown automation_id for account "${ctx.accountId}": ${input.automation_id}`);
      return jsonContent({
        meta: { authScope: 'account' },
        accountId: ctx.accountId,
        automation: {
          ...row,
          spec: JSON.parse(row.spec_json),
        },
      });
    },
    { readOnly: true },
  );

  server.tool(
    'automation_contract_upsert',
    'Create a new version of an automation contract and make it active by default.',
    AutomationContractUpsertSchema.shape,
    async (params, ctx) => {
      if (!allowControlPlaneWrite(ctx)) {
        return jsonError({
          error: 'automation_write_not_allowed',
          message: 'Control-plane mutations are not permitted for this caller.',
        });
      }
      const input = AutomationContractUpsertSchema.parse(params);
      const db = getDbFromMetadata(ctx);
      const row = await upsertAutomationContract(db, {
        accountId: ctx.accountId,
        automationId: input.automation_id,
        name: input.name,
        status: input.status,
        ownerType: input.owner_type,
        ownerId: input.owner_id,
        executionMode: input.execution_mode,
        policyPackId: input.policy_pack_id,
        policyVersionId: input.policy_version_id,
        approvalMode: input.approval_mode,
        triggerType: input.trigger_type,
        triggerCron: input.trigger_cron,
        triggerTimezone: input.trigger_timezone,
        mcpProfileId: input.mcp_profile_id,
        spec: input.spec,
        labels: input.labels,
        createdBy: ctx.userId ?? 'api-key',
        isActive: input.is_active,
        agentAssignment: input.agent_assignment
          ? {
              mode: input.agent_assignment.mode,
              primaryAgentId: input.agent_assignment.primary_agent_id,
              routingPolicyId: input.agent_assignment.routing_policy_id,
              fallbackAgentIds: input.agent_assignment.fallback_agent_ids,
            }
          : undefined,
      });

      return jsonContent({
        meta: { authScope: 'account' },
        accountId: ctx.accountId,
        automation: {
          automation_id: row.automation_id,
          version: row.version,
          status: row.status,
          is_active: row.is_active === 1,
        },
      });
    },
    { readOnly: false },
  );

  server.tool(
    'automation_run_start',
    'Create a queued automation run from the active contract.',
    AutomationRunStartSchema.shape,
    async (params, ctx) => {
      if (!allowControlPlaneWrite(ctx)) {
        return jsonError({
          error: 'run_start_not_allowed',
          message: 'Starting automation runs is not permitted for this caller.',
        });
      }
      const input = AutomationRunStartSchema.parse(params);
      const db = getDbFromMetadata(ctx);
      const run = await createAutomationRun(db, {
        accountId: ctx.accountId,
        automationId: input.automation_id,
        triggerSource: input.trigger_source,
        actorId: ctx.userId ?? 'api-key',
      });
      if (!run) return errorContent(`No active contract found for automation_id: ${input.automation_id}`);
      return jsonContent({
        meta: { authScope: 'account' },
        accountId: ctx.accountId,
        run,
      });
    },
    { readOnly: false },
  );

  server.tool(
    'approval_inbox_list',
    'List pending approval requests for the authenticated account.',
    {},
    async (_params, ctx) => {
      const db = getDbFromMetadata(ctx);
      const approvals = await listPendingApprovals(db, ctx.accountId);
      return jsonContent({
        meta: { authScope: 'account' },
        accountId: ctx.accountId,
        approvals: approvals.map((row) => ({
          approval_id: row.approval_id,
          run_id: row.run_id,
          automation_id: row.automation_id,
          action_type: row.action_type,
          reason: row.reason,
          requested_at: row.requested_at,
          expires_at: row.expires_at,
        })),
      });
    },
    { readOnly: true },
  );

  server.tool(
    'approval_inbox_decide',
    'Approve or deny a pending approval request.',
    ApprovalInboxDecideSchema.shape,
    async (params, ctx) => {
      if (!allowApprovalDecide(ctx)) {
        return jsonError({
          error: 'approval_decide_not_allowed',
          message: 'Approval decisions are not permitted for this caller.',
        });
      }
      const input = ApprovalInboxDecideSchema.parse(params);
      const db = getDbFromMetadata(ctx);
      const decided = await decideApproval(db, {
        accountId: ctx.accountId,
        approvalId: input.approval_id,
        decision: input.decision,
        decidedBy: ctx.userId ?? 'api-key',
        comment: input.comment,
      });
      if (!decided) return errorContent(`Unknown approval_id for account "${ctx.accountId}": ${input.approval_id}`);
      return jsonContent({
        meta: { authScope: 'account' },
        accountId: ctx.accountId,
        result: decided,
      });
    },
    { readOnly: false },
  );

  server.tool(
    'version_selection_get',
    'Get the currently selected default version for an MCP/agent entity.',
    VersionSelectionGetSchema.shape,
    async (params, ctx) => {
      const input = VersionSelectionGetSchema.parse(params);
      const db = getDbFromMetadata(ctx);

      const defaultVersionId = await getDefaultSelectedVersionId(
        db,
        ctx.accountId,
        input.entity_type,
        input.entity_id,
      );
      const latest = await getLatestVersion(db, ctx.accountId, input.entity_type, input.entity_id);

      return jsonContent({
        meta: {
          authScope: 'account',
          note: 'Response is scoped to authenticated account context.',
        },
        accountId: ctx.accountId,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        defaultVersionId,
        latestVersionId: latest?.id ?? null,
      });
    },
    { readOnly: true },
  );

  server.tool(
    'version_selection_set',
    'Set the default selected version for an MCP/agent entity.',
    VersionSelectionSetSchema.shape,
    async (params, ctx) => {
      const input = VersionSelectionSetSchema.parse(params);
      if (!allowVersionSelectionWrite(ctx)) {
        return jsonError({
          error: 'version_selection_not_allowed',
          message: 'Setting default version is not permitted for this caller.',
        });
      }

      const db = getDbFromMetadata(ctx);
      const version = await getVersionById(db, ctx.accountId, input.version_id);
      if (!version) {
        return errorContent(`Unknown version_id for account "${ctx.accountId}": ${input.version_id}`);
      }

      if (version.entity_type !== input.entity_type || version.entity_id !== input.entity_id) {
        return errorContent('version_id does not belong to the requested entity.');
      }

      await setDefaultSelectedVersion(db, {
        accountId: ctx.accountId,
        entityType: input.entity_type,
        entityId: input.entity_id,
        versionId: input.version_id,
        updatedBy: ctx.userId ?? 'api-key',
      });

      return jsonContent({
        meta: {
          authScope: 'account',
          note: 'Mutation applies within authenticated account context.',
        },
        accountId: ctx.accountId,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        defaultVersionId: input.version_id,
        updatedBy: ctx.userId ?? 'api-key',
      });
    },
    { readOnly: false },
  );
}
