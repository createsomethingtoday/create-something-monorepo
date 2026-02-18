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
  AtlasGetSchema,
  AtlasSearchSchema,
  WorkflowIdSchema,
  WorkflowMapFromToolSequenceSchema,
  McpCatalogListSchema,
  McpIntrospectSchema,
  McpMapSchema,
  VersionSelectionGetSchema,
  VersionSelectionSetSchema,
  JudgmentPolicyActivateSchema,
  JudgmentPolicyCompareReportGetSchema,
  JudgmentPolicyEstimateSchema,
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
import { evaluateJudgment } from '../judgment/evaluate.js';
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
import {
  createAutomationRun,
  decideApproval,
  getActiveAutomationContract,
  listActiveAutomationContracts,
  listPendingApprovals,
  upsertAutomationContract,
} from '../storage/control-plane.js';
import type { JudgmentEstimateScenario } from '../judgment/types.js';

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

function jsonError(data: unknown): ReturnType<typeof errorContent> {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    isError: true,
  };
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

function defaultEstimateScenarios(): JudgmentEstimateScenario[] {
  return [
    { id: 'scenario-read', toolName: 'workflow_get', hasWriteIntent: false, hasHumanReviewStep: true, introspectionOk: true },
    { id: 'scenario-write-no-human', toolName: 'workflow_map_from_tool_sequence', hasWriteIntent: true, hasHumanReviewStep: false, introspectionOk: true },
    { id: 'scenario-mcp-introspection-fail', toolName: 'mcp_map_to_workflow', hasWriteIntent: true, hasHumanReviewStep: true, introspectionOk: false },
  ];
}

function evaluatePolicyScenarios(
  accountId: string,
  readOnly: boolean,
  before: JudgmentPolicy,
  after: JudgmentPolicy,
  scenarios: JudgmentEstimateScenario[],
): { summary: PolicyEstimateSummary; details: Array<{ scenarioId: string; before: string; after: string }> } {
  const initialCounts = { allow: 0, require_human_review: 0, block: 0 };
  const beforeCounts = { ...initialCounts };
  const afterCounts = { ...initialCounts };
  const details: Array<{ scenarioId: string; before: string; after: string }> = [];

  for (const scenario of scenarios) {
    const baseInput = {
      toolName: scenario.toolName,
      accountId,
      readOnly,
      hasWriteIntent: scenario.hasWriteIntent,
      hasHumanReviewStep: scenario.hasHumanReviewStep,
      introspectionOk: scenario.introspectionOk,
    };

    const beforeDecision = evaluateJudgment(baseInput, before);
    const afterDecision = evaluateJudgment(baseInput, after);
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
      const decision = evaluateJudgment(
        {
          toolName: 'workflow_get',
          accountId: ctx.accountId,
          readOnly: ctx.policy.readOnly === true,
          hasWriteIntent: false,
          hasHumanReviewStep: true,
        },
        activePolicy.policy,
      );

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
      const decision = evaluateJudgment(
        {
          toolName: 'workflow_mermaid',
          accountId: ctx.accountId,
          readOnly: ctx.policy.readOnly === true,
          hasWriteIntent: false,
          hasHumanReviewStep: true,
        },
        activePolicy.policy,
      );

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
      const decision = evaluateJudgment(
        {
          toolName: 'workflow_map_from_tool_sequence',
          accountId: ctx.accountId,
          readOnly: ctx.policy.readOnly === true,
          hasWriteIntent,
          hasHumanReviewStep,
        },
        activePolicy.policy,
      );

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
      const decision = evaluateJudgment(
        {
          toolName: 'mcp_map_to_workflow',
          accountId: ctx.accountId,
          readOnly: ctx.policy.readOnly === true,
          hasWriteIntent,
          hasHumanReviewStep,
          introspectionOk: introspection.ok,
        },
        activePolicy.policy,
      );

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
          guardrails: guardrailsFromPolicy(parsedPolicy),
          availableVersions: versions.map((v) => {
            const parsed = JSON.parse(v.policy_json);
            return {
              id: v.id,
              status: v.status,
              created_at: v.created_at,
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
        guardrails: guardrailsFromPolicy(active.policy),
        availableVersions: versions.map((v) => {
          const parsed = JSON.parse(v.policy_json);
          return {
            id: v.id,
            status: v.status,
            created_at: v.created_at,
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
      const estimate = evaluatePolicyScenarios(
        ctx.accountId,
        ctx.policy.readOnly === true,
        beforePolicy,
        afterPolicy,
        scenarios,
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
