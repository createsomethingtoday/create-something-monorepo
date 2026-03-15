/**
 * Interaction Atlas — Prompts (Judgment tier)
 *
 * Prompts are user-controlled templates that help clients review workflows and
 * reason about constraints, human review points, and safe execution boundaries.
 */

import { z } from 'zod';
import type { ScopedMcpServer } from '@create-something/mcp-core';

import { getBuiltWorkflowTemplate, getWorkflowMermaid, listWorkflowSummaries, validateBuiltWorkflow } from '../workflows/index.js';

export function registerPrompts(server: ScopedMcpServer): void {
  const WorkflowReviewSchema = z.object({
    workflow_id: z.string().min(1),
    focus: z.string().optional(),
  });

  server.prompt(
    'workflow_review',
    'Review an agentic workflow mapping for safety, legibility, and missing constraints.',
    {
      workflow_id: z.string().min(1).describe('Workflow id (use workflow_list to see options)'),
      focus: z.string().optional().describe('Optional review focus (e.g., safety, privacy, human loop, reliability)'),
    },
    async (params, ctx) => {
      const input = WorkflowReviewSchema.parse(params);
      const template = getBuiltWorkflowTemplate(input.workflow_id);
      const mermaid = getWorkflowMermaid(input.workflow_id);
      const validation = template ? validateBuiltWorkflow(template) : null;

      const policyNote = ctx.policy.readOnly
        ? '\nThis account is read-only. Do not propose edits that require write access; propose changes as recommendations only.'
        : '';

      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `You are reviewing an agentic workflow mapping in the AI Interaction Atlas for account "${ctx.accountId}".${policyNote}

Workflow id: ${input.workflow_id}
Available workflows (id -> name):\n${listWorkflowSummaries().map(w => `- ${w.id}: ${w.name}`).join('\n')}

Validation: ${validation ? (validation.valid ? 'valid' : `invalid ids: ${validation.invalidIds.join(', ')}`) : 'workflow not found'}

Mermaid diagram (read-only visualization):
\`\`\`mermaid
${mermaid ?? 'error: unknown workflow id'}
\`\`\`

Workflow JSON (nodes + edges):
\`\`\`json
${template ? JSON.stringify(template, null, 2) : JSON.stringify({ error: 'unknown workflow id' }, null, 2)}
\`\`\`

Review tasks:
1. Identify missing human review/approval steps (especially around writes/destructive actions).
2. Identify missing constraints (privacy, authorization, audit logging, error handling, eval coverage).
3. Identify ambiguous steps: where evidence/provenance is required but not specified.
4. Propose a tighter version of the workflow (as a bullet list of step changes), but do not change the JSON directly.
5. If relevant, propose what should be editable by a client in the visualization (Judgment layer controls).

${input.focus ? `Focus: ${input.focus}` : ''}`,
            },
          },
        ],
      };
    },
  );

  const WorkflowDesignSchema = z.object({
    system_description: z.string().min(1),
  });

  server.prompt(
    'workflow_design_from_description',
    'Design a workflow mapping in Atlas terms from a plain-language system description.',
    {
      system_description: z.string().min(1).describe('Describe the agent/MCP/automation and what it does'),
    },
    async (params, ctx) => {
      const input = WorkflowDesignSchema.parse(params);
      const policyNote = ctx.policy.readOnly
        ? '\nThis account is read-only. Provide a proposed workflow and constraints as recommendations only.'
        : '';

      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `You are mapping a system into AI Interaction Atlas workflow terms for account "${ctx.accountId}".${policyNote}

System description:
${input.system_description}

Output:
- A proposed ordered list of Atlas task IDs (human/system/ai) for the workflow.
- A set of Atlas constraints and touchpoints that should apply.
- Where human review must be required vs optional.
- Which parts belong to Database/Automation/Judgment in the Three-Tier model (briefly).`,
            },
          },
        ],
      };
    },
  );
}
