import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import {
  GOVERNANCE_FINDING_CATEGORY_OPTIONS,
  GOVERNANCE_FINDING_PRIORITY_OPTIONS,
  GOVERNANCE_FINDING_STATUS_OPTIONS,
} from './schema.js';

const REVIEW_CONTEXT = `You are assisting Webflow's App Review Team. Keep recommendations practical and policy-safe.

Prioritize:
1) explicit decision rationale,
2) actionable remediation guidance,
3) consistency with the review status and rejection reason taxonomy.

Do not invent fields or statuses that are not present in provided data.`;

export function registerPrompts(server: McpServer): void {
  server.prompt(
    'app_review_decision_support',
    'Generate an approve/reject/request-changes recommendation from asset and version data.',
    {
      asset_json: z.string().describe('Serialized app asset JSON payload.'),
      versions_json: z.string().describe('Serialized array of version/review records.'),
      reviewer_notes: z.string().optional().describe('Optional notes from human reviewer.'),
    },
    async ({ asset_json, versions_json, reviewer_notes }) => {
      const notes = reviewer_notes?.trim();
      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `${REVIEW_CONTEXT}

Task:
Produce a recommendation with one of: APPROVE, REJECT, CHANGES_REQUESTED.

Asset:
\`\`\`json
${asset_json}
\`\`\`

Versions:
\`\`\`json
${versions_json}
\`\`\`

${notes ? `Reviewer notes:\n${notes}\n` : ''}
Output sections:
1) Decision
2) Why (3-5 bullet points)
3) Required actions for submitter (if not APPROVE)
4) Suggested status + rejection reason mapping`,
            },
          },
        ],
      };
    },
  );

  server.prompt(
    'app_review_feedback_refiner',
    'Rewrite review feedback so it is precise, actionable, and aligned with review decision.',
    {
      decision: z.enum(['APPROVE', 'REJECT', 'CHANGES_REQUESTED']),
      draft_feedback: z.string().describe('Raw reviewer feedback to refine.'),
      review_type: z.string().optional().describe('Version review type (new asset, update, etc.).'),
    },
    async ({ decision, draft_feedback, review_type }) => {
      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `${REVIEW_CONTEXT}

Decision: ${decision}
Review type: ${review_type ?? 'Not specified'}

Draft feedback:
${draft_feedback}

Rewrite the feedback to:
- keep the same intent,
- remove ambiguity,
- include concrete next steps and acceptance criteria,
- avoid unnecessary length.

Return only the refined feedback text.`,
            },
          },
        ],
      };
    },
  );

  server.prompt(
    'app_review_governance_finding_capture',
    'Convert Slack/Zendesk/docs context into an app_review_create_governance_finding payload.',
    {
      source_context: z.string().describe('Raw thread, ticket, docs gap, or reviewer notes to turn into a finding.'),
      category: z.enum(GOVERNANCE_FINDING_CATEGORY_OPTIONS).optional(),
      priority: z.enum(GOVERNANCE_FINDING_PRIORITY_OPTIONS).optional(),
      status: z.enum(GOVERNANCE_FINDING_STATUS_OPTIONS).optional(),
    },
    async ({ source_context, category, priority, status }) => {
      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `${REVIEW_CONTEXT}

Task:
Produce a JSON object suitable for app_review_create_governance_finding.

Use only these categories:
${GOVERNANCE_FINDING_CATEGORY_OPTIONS.map((value) => `- ${value}`).join('\n')}

Defaults:
- status: ${status ?? 'New'}
- priority: ${priority ?? 'P2'}
${category ? `- category: ${category}` : ''}

Source context:
${source_context}

Required JSON keys:
title, category, summary

Optional JSON keys:
status, priority, evidence, recommendation, decision_needed, next_action, owner, app_name, app_id, asset_id, version_id, source_url, linked_urls, reporter

Rules:
- Do not invent Airtable record IDs.
- Put Slack, Zendesk, Google Doc, Airtable, or docs links in source_url or linked_urls only if present in the context.
- Set decision_needed to true only when a human policy/product/legal decision is explicitly needed.
- Return only valid JSON.`,
            },
          },
        ],
      };
    },
  );

  server.prompt(
    'governance_database_finding_capture',
    'Convert Slack/Zendesk/docs context into a governance_database_create_finding payload.',
    {
      source_context: z.string().describe('Raw thread, ticket, docs gap, or operator notes to turn into a finding.'),
      category: z.enum(GOVERNANCE_FINDING_CATEGORY_OPTIONS).optional(),
      priority: z.enum(GOVERNANCE_FINDING_PRIORITY_OPTIONS).optional(),
      status: z.enum(GOVERNANCE_FINDING_STATUS_OPTIONS).optional(),
    },
    async ({ source_context, category, priority, status }) => {
      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `${REVIEW_CONTEXT}

Task:
Produce a JSON object suitable for governance_database_create_finding.

Use only these categories:
${GOVERNANCE_FINDING_CATEGORY_OPTIONS.map((value) => `- ${value}`).join('\n')}

Defaults:
- status: ${status ?? 'New'}
- priority: ${priority ?? 'P2'}
${category ? `- category: ${category}` : ''}

Source context:
${source_context}

Required JSON keys:
title, category, summary

Optional JSON keys:
status, priority, evidence, recommendation, decision_needed, next_action, owner, app_name, app_id, asset_id, version_id, source_url, linked_urls, reporter

Rules:
- Do not invent Airtable record IDs.
- Put Slack, Zendesk, Google Doc, Airtable, or docs links in source_url or linked_urls only if present in the context.
- Set decision_needed to true only when a human policy/product/legal decision is explicitly needed.
- This is a governance database capture flow, not an assigned-reviewer app-review decision.
- Return only valid JSON.`,
            },
          },
        ],
      };
    },
  );
}
