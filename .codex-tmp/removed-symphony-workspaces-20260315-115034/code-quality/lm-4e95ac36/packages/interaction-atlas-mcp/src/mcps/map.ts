import type { McpCatalogEntry } from './catalog.js';
import type { McpIntrospection, McpToolInfo } from './introspect.js';

import type { AtlasWorkflowDefinition, WorkflowStepDef, WorkflowAttachmentDef } from '../workflows/types.js';

import { isValidTaskId } from '@quietloudlab/ai-interaction-atlas';

type ToolKind = 'read' | 'create' | 'update' | 'delete' | 'notify' | 'other';

function classifyTool(toolName: string): ToolKind {
  const t = toolName.toLowerCase();

  // Notifications / outbound comms
  if (/(^|_)(notify|send|message|email|slack)(_|$)/.test(t)) return 'notify';

  // CRUD-ish tools
  if (/(^|_)(delete|remove|archive|trash|purge)(_|$)/.test(t)) return 'delete';
  if (/(^|_)(update|modify|patch|upsert|set)(_|$)/.test(t)) return 'update';
  if (/(^|_)(create|add|insert|upload|write)(_|$)/.test(t)) return 'create';
  if (/(^|_)(list|get|read|fetch|find|search|query|describe)(_|$)/.test(t)) return 'read';

  return 'other';
}

function chooseValidTaskId(candidates: string[]): { desired: string; taskId: string; usedFallback: boolean; allInvalid: boolean } {
  const desired = candidates[0] ?? 'system_api';

  for (const id of candidates) {
    if (isValidTaskId(id)) return { desired, taskId: id, usedFallback: id !== desired, allInvalid: false };
  }

  // No candidates exist in the Atlas dataset. Keep the desired id so validation
  // surfaces the issue, and emit a warning for operators.
  return { desired, taskId: desired, usedFallback: false, allInvalid: true };
}

function toolKindToAtlasTaskCandidates(kind: ToolKind): string[] {
  switch (kind) {
    case 'read':
      return ['system_read_db', 'system_query_db', 'system_api'];
    case 'create':
      return ['system_create_db', 'system_write_db', 'system_api'];
    case 'update':
      return ['system_update_db', 'system_write_db', 'system_create_db', 'system_api'];
    case 'delete':
      return ['system_delete_db', 'system_archive_db', 'system_write_db', 'system_api'];
    case 'notify':
      return ['system_notification', 'system_api'];
    case 'other':
      return ['system_api'];
  }
}

function kindLabel(kind: ToolKind): string {
  switch (kind) {
    case 'read':
      return 'Read Tools';
    case 'create':
      return 'Create Tools';
    case 'update':
      return 'Update Tools';
    case 'delete':
      return 'Delete Tools';
    case 'notify':
      return 'Notification Tools';
    case 'other':
      return 'Other Tools';
  }
}

function summarizeTools(tools: McpToolInfo[], limit: number = 30): string {
  const names = tools.map((t) => t.name).sort();
  const head = names.slice(0, limit);
  const extra = names.length > limit ? `\n... +${names.length - limit} more` : '';
  return head.map((n) => `- ${n}`).join('\n') + extra;
}

function attachmentsForKind(kind: ToolKind, entry: McpCatalogEntry): WorkflowAttachmentDef[] {
  const attachments: WorkflowAttachmentDef[] = [
    { type: 'constraint', referenceId: 'const_audit_log', notes: 'Log tool usage and results for accountability.' },
    { type: 'constraint', referenceId: 'const_error_handling', notes: 'Define retry/backoff/fallbacks and escalation behavior.' },
  ];

  // Writes/destructive actions always need gating.
  if (kind === 'create' || kind === 'update' || kind === 'delete') {
    attachments.push({ type: 'constraint', referenceId: 'const_authorization', notes: 'RBAC/least privilege for writes.' });
    attachments.push({ type: 'constraint', referenceId: 'const_human_loop', notes: 'Human approval before writes/destructive actions.' });
  }

  // Servers that require auth should surface auth constraints early.
  if (entry.requiresAuth) {
    attachments.push({ type: 'constraint', referenceId: 'const_authentication', notes: 'Ensure caller is authenticated before tool access.' });
  }

  return attachments;
}

function groupTools(tools: McpToolInfo[]): Record<ToolKind, McpToolInfo[]> {
  const groups: Record<ToolKind, McpToolInfo[]> = {
    read: [],
    create: [],
    update: [],
    delete: [],
    notify: [],
    other: [],
  };

  for (const tool of tools) {
    groups[classifyTool(tool.name)].push(tool);
  }

  return groups;
}

export type McpWorkflowMapping = {
  definition: AtlasWorkflowDefinition;
  warnings: string[];
};

export function mapMcpToWorkflowDefinition(
  entry: McpCatalogEntry,
  introspection?: McpIntrospection,
): McpWorkflowMapping {
  const tools = introspection?.tools ?? [];
  const grouped = groupTools(tools);

  const warnings: string[] = [];
  const steps: WorkflowStepDef[] = [];

  if (entry.requiresAuth) {
    steps.push({
      referenceId: 'human_connect_integration',
      label: 'Connect Integration',
      notes: `Connect ${entry.name} so the system can access the account safely. This is a human action (OAuth/API key/etc).`,
      attachments: [
        { type: 'constraint', referenceId: 'const_authentication' },
        { type: 'constraint', referenceId: 'const_authorization' },
        { type: 'constraint', referenceId: 'const_privacy' },
      ],
    });
    if (!isValidTaskId('human_connect_integration')) {
      warnings.push('Atlas task id invalid: "human_connect_integration" is not defined in the dataset.');
    }
  }

  steps.push({
    referenceId: 'human_type_input',
    label: 'Provide Goal / Query',
    notes: 'User describes what they want done. This is the start of an agentic run.',
  });
  if (!isValidTaskId('human_type_input')) {
    warnings.push('Atlas task id invalid: "human_type_input" is not defined in the dataset.');
  }

  const orderedKinds: ToolKind[] = ['read', 'create', 'update', 'delete', 'notify', 'other'];
  for (const kind of orderedKinds) {
    const group = grouped[kind];
    if (!group || group.length === 0) continue;

    const candidates = toolKindToAtlasTaskCandidates(kind);
    const resolved = chooseValidTaskId(candidates);
    if (resolved.usedFallback) {
      warnings.push(`Atlas task id fallback for "${kind}": "${resolved.desired}" is not defined; using "${resolved.taskId}".`);
    } else if (resolved.allInvalid) {
      warnings.push(`Atlas task id invalid for "${kind}": none of [${candidates.map((c) => `"${c}"`).join(', ')}] are defined.`);
    }

    steps.push({
      referenceId: resolved.taskId,
      label: `${kindLabel(kind)} (${group.length})`,
      notes: `Tool surface:\n${summarizeTools(group)}`,
      attachments: attachmentsForKind(kind, entry),
    });
  }

  if (tools.length === 0) {
    const resolved = chooseValidTaskId(['system_api']);
    if (resolved.allInvalid) warnings.push('Atlas task id invalid: "system_api" is not defined in the dataset.');
    steps.push({
      referenceId: resolved.taskId,
      label: 'MCP Tool Surface (unavailable)',
      notes: entry.requiresAuth
        ? 'Tool list unavailable without authentication. Connect the integration, then re-run introspection.'
        : 'Tool list unavailable. Introspection may have failed or returned no tools.',
      attachments: attachmentsForKind('other', entry),
    });
  }

  // Always end with synthesis + verification + human review for client legibility.
  steps.push({
    referenceId: 'task_synthesize',
    notes: 'Synthesize tool outputs into a coherent answer or report.',
    attachments: [{ type: 'constraint', referenceId: 'const_format', notes: 'Prefer structured outputs for downstream review.' }],
  });
  if (!isValidTaskId('task_synthesize')) {
    warnings.push('Atlas task id invalid: "task_synthesize" is not defined in the dataset.');
  }

  steps.push({
    referenceId: 'task_verify',
    notes: 'Verify key claims against evidence (tool outputs, sources).',
    attachments: [{ type: 'constraint', referenceId: 'const_quality_threshold' }],
  });
  if (!isValidTaskId('task_verify')) {
    warnings.push('Atlas task id invalid: "task_verify" is not defined in the dataset.');
  }

  steps.push({
    referenceId: 'human_review',
    notes: 'Human reviews the outcome and approves any next actions.',
    attachments: [{ type: 'constraint', referenceId: 'const_human_loop' }],
  });
  if (!isValidTaskId('human_review')) {
    warnings.push('Atlas task id invalid: "human_review" is not defined in the dataset.');
  }

  const definition: AtlasWorkflowDefinition = {
    id: `mcp-${entry.slug}`,
    name: `MCP: ${entry.name}`,
    description: entry.description,
    primaryUseCase: `Capability map for the ${entry.name} MCP server`,
    tags: ['mcp', entry.category, ...(entry.requiresAuth ? ['requires-auth'] : [])],
    touchpoints: ['tp_api', 'tp_cli'],
    constraints: [
      'const_rate_limit',
      'const_cost_budget',
      'const_error_handling',
      'const_audit_log',
      ...(entry.requiresAuth ? ['const_authentication', 'const_authorization'] : []),
    ],
    steps,
    policy: {
      notes:
        'This is an automatically generated capability map. It does not represent a single "happy path" run; it summarizes the available tool surface grouped by system operation type.',
    },
  };

  return { definition, warnings };
}
