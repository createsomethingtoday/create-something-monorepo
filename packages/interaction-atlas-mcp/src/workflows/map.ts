import type { AtlasWorkflowDefinition, WorkflowStepDef } from './types.js';
import type { WorkflowMapFromToolSequenceInput } from '../schemas/index.js';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'mapped-workflow';
}

function classifyToolToAtlasTask(toolName: string): { taskId: string; kind: 'read' | 'write' | 'notify' | 'other' } {
  const t = toolName.toLowerCase();

  // Notifications / outbound comms
  if (/(^|_)(notify|slack|email|send|message)(_|$)/.test(t)) return { taskId: 'system_notification', kind: 'notify' };

  // Inbound triggers / schedules
  if (/(^|_)(webhook)(_|$)/.test(t)) return { taskId: 'system_webhook', kind: 'other' };
  if (/(^|_)(timer|cron|schedule)(_|$)/.test(t)) return { taskId: 'system_timer', kind: 'other' };

  // CRUD-ish tools
  if (/(^|_)(create|add|insert|new)(_|$)/.test(t)) return { taskId: 'system_create_db', kind: 'write' };
  if (/(^|_)(update|modify|patch|upsert|set)(_|$)/.test(t)) return { taskId: 'system_update_db', kind: 'write' };
  if (/(^|_)(delete|remove|archive|trash|purge)(_|$)/.test(t)) return { taskId: 'system_delete_db', kind: 'write' };
  if (/(^|_)(list|get|read|fetch|find|search|query)(_|$)/.test(t)) return { taskId: 'system_read_db', kind: 'read' };

  // Default: external API / system op
  return { taskId: 'system_api', kind: 'other' };
}

function defaultLabelFor(tool: string, server?: string): string {
  return server ? `${server}.${tool}` : tool;
}

export function mapToolSequenceToWorkflowDefinition(input: WorkflowMapFromToolSequenceInput): AtlasWorkflowDefinition {
  const name = input.name?.trim() || 'Mapped Workflow';
  const workflowId = input.workflow_id?.trim() || slugify(name);

  const steps: WorkflowStepDef[] = [];

  // Always start with human intent specification.
  steps.push({
    referenceId: 'human_type_input',
    label: 'Provide Goal / Query',
    notes: 'User describes objective and scope for the run (what “good” looks like).',
  });

  for (const item of input.sequence) {
    const classified = classifyToolToAtlasTask(item.tool);
    const label = defaultLabelFor(item.tool, item.server);

    const attachments: WorkflowStepDef['attachments'] = [];

    // Conservative defaults: log and gate writes
    attachments.push({ type: 'constraint', referenceId: 'const_audit_log', notes: 'Record tool call + result for audit.' });
    if (classified.kind === 'write') {
      attachments.push({ type: 'constraint', referenceId: 'const_human_loop', notes: 'Human approval before writes/destructive actions.' });
      attachments.push({ type: 'constraint', referenceId: 'const_authorization', notes: 'RBAC and least-privilege enforcement.' });
    }

    // PII-sensitive channels
    if (item.server?.toLowerCase().includes('gmail') || item.tool.toLowerCase().includes('gmail')) {
      attachments.push({ type: 'constraint', referenceId: 'const_privacy', notes: 'Email data often contains PII.' });
    }

    steps.push({
      referenceId: classified.taskId,
      label,
      notes: `Mapped from tool call: ${label}`,
      attachments,
    });
  }

  const addSynthesis = input.add_synthesis ?? true;
  const addVerification = input.add_verification ?? true;
  const addHumanReview = input.add_human_review ?? true;

  if (addSynthesis) {
    steps.push({
      referenceId: 'task_synthesize',
      notes: 'Synthesize tool outputs into a coherent result for the user.',
    });
  }

  if (addVerification) {
    steps.push({
      referenceId: 'task_verify',
      notes: 'Verify key claims against evidence (tool outputs) and flag low-confidence areas.',
      attachments: [{ type: 'constraint', referenceId: 'const_quality_threshold' }],
    });
  }

  if (addHumanReview) {
    steps.push({
      referenceId: 'human_review',
      notes: 'Human reviews and approves next actions (especially if any write ops are proposed).',
      attachments: [{ type: 'constraint', referenceId: 'const_human_loop' }],
    });
  }

  return {
    id: workflowId,
    name,
    description: 'Automatically mapped workflow from an observed/planned tool-call sequence.',
    primaryUseCase: input.primaryUseCase?.trim() || 'Workflow mapping for client review',
    tags: ['auto-mapped', 'tool-sequence'],
    touchpoints: input.touchpoints ?? ['tp_cli', 'tp_api'],
    constraints: input.constraints,
    steps,
    policy: {
      notes: 'Generated mapping. Treat as a draft and review before using for governance.',
    },
  };
}

