/**
 * Interaction Atlas — Schemas
 *
 * Typed Artifacts for Atlas lookup + workflow mapping.
 */

import { z } from 'zod';

export const AtlasSearchSchema = z.object({
  query: z.string().min(1).describe('Keyword search query'),
  dimensions: z
    .array(z.enum(['ai', 'human', 'system', 'data', 'constraints', 'touchpoints']))
    .optional()
    .describe('Limit search to specific Atlas dimensions'),
  limit: z.number().int().min(1).max(50).optional().describe('Maximum number of results (default: 25)'),
});

export type AtlasSearchInput = z.infer<typeof AtlasSearchSchema>;

export const AtlasGetSchema = z.object({
  id: z.string().min(1).describe('Atlas pattern id (e.g. task_synthesize, human_review, const_privacy)'),
});

export type AtlasGetInput = z.infer<typeof AtlasGetSchema>;

export const WorkflowIdSchema = z.object({
  workflow_id: z.string().min(1).describe('Workflow id (e.g. fleet-watchdog)'),
  versionId: z.string().min(1).optional().describe('Optional explicit version id override'),
  commitSha: z.string().min(1).optional().describe('Optional commit SHA override'),
});

export type WorkflowIdInput = z.infer<typeof WorkflowIdSchema>;

export const WorkflowToolSequenceItemSchema = z.object({
  server: z.string().min(1).optional().describe('Optional server identifier (e.g. "gmail", "substrate")'),
  tool: z.string().min(1).describe('Tool name (e.g. "query_health", "notion_query_database")'),
});

export const WorkflowMapFromToolSequenceSchema = z.object({
  name: z.string().min(1).optional().describe('Workflow name (used for display + id generation)'),
  workflow_id: z.string().min(1).optional().describe('Optional explicit workflow id (slug).'),
  primaryUseCase: z.string().min(1).optional().describe('Primary use case / intended outcome'),
  touchpoints: z.array(z.string().min(1)).optional().describe('Atlas touchpoint IDs'),
  constraints: z.array(z.string().min(1)).optional().describe('Atlas constraint IDs'),
  sequence: z.array(WorkflowToolSequenceItemSchema).min(1).describe('Ordered sequence of tool calls'),
  add_synthesis: z.boolean().optional().describe('Append task_synthesize (default: true)'),
  add_verification: z.boolean().optional().describe('Append task_verify (default: true)'),
  add_human_review: z.boolean().optional().describe('Append human_review (default: true)'),
  versionId: z.string().min(1).optional().describe('Optional explicit version id override'),
  commitSha: z.string().min(1).optional().describe('Optional commit SHA override'),
});

export type WorkflowMapFromToolSequenceInput = z.infer<typeof WorkflowMapFromToolSequenceSchema>;

export const McpCatalogListSchema = z.object({
  category: z.enum(['create-something', 'workway', 'third-party', 'all']).optional().describe('Catalog category filter'),
});

export type McpCatalogListInput = z.infer<typeof McpCatalogListSchema>;

export const McpIntrospectSchema = z.object({
  slug: z.string().min(1).optional().describe('Catalog slug (preferred)'),
  url: z.string().url().optional().describe('Explicit MCP Streamable HTTP endpoint URL (e.g. https://host/mcp)'),
});

export type McpIntrospectInput = z.infer<typeof McpIntrospectSchema>;

export const McpMapSchema = z.object({
  slug: z.string().min(1).optional().describe('Catalog slug (preferred)'),
  url: z.string().url().optional().describe('Explicit MCP Streamable HTTP endpoint URL'),
  name: z.string().min(1).optional().describe('Optional display name when mapping an arbitrary URL'),
  versionId: z.string().min(1).optional().describe('Optional explicit version id override'),
  commitSha: z.string().min(1).optional().describe('Optional commit SHA override'),
});

export type McpMapInput = z.infer<typeof McpMapSchema>;

export const VersionSelectionGetSchema = z.object({
  entity_type: z.enum(['mcp', 'agent']),
  entity_id: z.string().min(1),
});

export type VersionSelectionGetInput = z.infer<typeof VersionSelectionGetSchema>;

export const VersionSelectionSetSchema = z.object({
  entity_type: z.enum(['mcp', 'agent']),
  entity_id: z.string().min(1),
  version_id: z.string().min(1),
});

export type VersionSelectionSetInput = z.infer<typeof VersionSelectionSetSchema>;

const JudgmentRuleWhenSchema = z.object({
  toolNames: z.array(z.string().min(1)).optional(),
  hasWriteIntent: z.boolean().optional(),
  hasHumanReviewStep: z.boolean().optional(),
  introspectionOk: z.boolean().optional(),
  accountIds: z.array(z.string().min(1)).optional(),
});

const JudgmentRuleSchema = z.object({
  id: z.string().min(1),
  priority: z.number().int().min(0),
  when: JudgmentRuleWhenSchema,
  then: z.object({
    decision: z.enum(['allow', 'require_human_review', 'block']),
    reason: z.string().min(1),
  }),
});

const JudgmentGuardrailsSchema = z.object({
  maxReviewDelta: z.number().int().min(0).optional(),
  maxBlockDelta: z.number().int().min(0).optional(),
});

export const JudgmentPolicySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  guardrails: JudgmentGuardrailsSchema.optional(),
  rules: z.array(JudgmentRuleSchema).min(1),
});

export const JudgmentPolicyGetSchema = z.object({
  entity_type: z.enum(['mcp', 'agent']),
  entity_id: z.string().min(1),
  policy_version_id: z.string().min(1).optional(),
});

export const JudgmentPolicySaveSchema = z.object({
  entity_type: z.enum(['mcp', 'agent']),
  entity_id: z.string().min(1),
  policy: JudgmentPolicySchema,
  status: z.enum(['draft', 'active', 'archived']).optional(),
});

export const JudgmentPolicyActivateSchema = z.object({
  entity_type: z.enum(['mcp', 'agent']),
  entity_id: z.string().min(1),
  policy_version_id: z.string().min(1),
});

const EstimateScenarioSchema = z.object({
  id: z.string().min(1),
  toolName: z.string().min(1),
  hasWriteIntent: z.boolean().optional(),
  hasHumanReviewStep: z.boolean().optional(),
  introspectionOk: z.boolean().optional(),
});

export const JudgmentPolicyEstimateSchema = z.object({
  entity_type: z.enum(['mcp', 'agent']),
  entity_id: z.string().min(1),
  before_policy_version_id: z.string().min(1).optional(),
  policy: JudgmentPolicySchema.optional(),
  after_policy_version_id: z.string().min(1).optional(),
  scenarios: z.array(EstimateScenarioSchema).min(1).optional(),
});

export const JudgmentPolicyCompareReportGetSchema = z.object({
  report_id: z.string().min(1),
});

export const JudgmentDashboardSummaryParamsSchema = z.object({
  entity_type: z.enum(['mcp', 'agent']).optional(),
  entity_id: z.string().min(1).optional(),
  recent_limit: z.number().int().min(1).max(25).optional(),
});

export const JudgmentDashboardSummarySchema = JudgmentDashboardSummaryParamsSchema.superRefine((value, issueCtx) => {
  const hasEntityType = Boolean(value.entity_type);
  const hasEntityId = Boolean(value.entity_id);
  if (hasEntityType !== hasEntityId) {
    issueCtx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'entity_type and entity_id must be provided together when scoping by entity.',
    });
  }
});

export const AutomationContractGetSchema = z.object({
  automation_id: z.string().min(1),
});

export const AutomationContractUpsertSchema = z.object({
  automation_id: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(['enabled', 'disabled', 'paused', 'archived']).default('enabled'),
  owner_type: z.enum(['user', 'service']).default('user'),
  owner_id: z.string().min(1),
  execution_mode: z.enum(['direct', 'guided', 'autonomous']),
  policy_pack_id: z.string().min(1),
  policy_version_id: z.string().min(1),
  approval_mode: z.enum(['untrusted', 'on-failure', 'on-request', 'never']),
  trigger_type: z.enum(['schedule', 'event', 'manual']),
  trigger_cron: z.string().optional(),
  trigger_timezone: z.string().optional(),
  mcp_profile_id: z.string().min(1),
  labels: z.array(z.string().min(1)).optional(),
  is_active: z.boolean().optional(),
  spec: z.record(z.unknown()).default({}),
  agent_assignment: z
    .object({
      mode: z.enum(['none', 'pinned', 'routed', 'hybrid']),
      primary_agent_id: z.string().optional(),
      routing_policy_id: z.string().optional(),
      fallback_agent_ids: z.array(z.string().min(1)).optional(),
    })
    .optional(),
});

export const AutomationRunStartSchema = z.object({
  automation_id: z.string().min(1),
  trigger_source: z.enum(['schedule', 'event', 'manual', 'retry']).optional(),
});

export const ApprovalInboxDecideSchema = z.object({
  approval_id: z.string().min(1),
  decision: z.enum(['approved', 'denied']),
  comment: z.string().optional(),
});
