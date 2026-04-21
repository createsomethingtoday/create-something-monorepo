import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const REVIEW_CONTEXT = `You are assisting Webflow's Template Review Team. Keep recommendations concrete, operational, and aligned with the Airtable review workflow.

Prioritize:
1) decision clarity,
2) actionable feedback for creators,
3) explicit separation between confirmed data and missing field mappings.

Do not invent field names, statuses, or Airtable buttons that are not present in provided data.`;

export const REVIEW_WORKFLOW = `# Webflow Template Review — Workflow Guide

This MCP owns Airtable-backed template review state, reviewer assignment, and publishing/admin handoff data.

In a Hub session, analyzer tools may also be visible from a separate server, typically \`webflow-site-analyzer-mcp\`. Treat that as a cross-server workflow:

- Airtable review writes stay in this MCP.
- Analyzer job orchestration stays in the analyzer MCP.
- Do not invent fictional \`template_review_*analyzer*\` tool names.

## 1. Start

Use these first:

- \`template_review_health\` to confirm MCP + Airtable connectivity.
- \`template_review_get_field_map\` to inspect confirmed vs pending fields.
- \`template-review://reviewer-workflow\` and \`template-review://host-playbook\` for host-safe workflow guidance.

## 2. Find Work

- \`template_review_list_queue\` for the default ready-to-review queue.
- \`template_review_my_queue\` for work already assigned to the current reviewer.
- \`template_review_search_assets\` and \`template_review_search_versions\` when the user names a specific template.

## 3. Inspect Before Writing

- \`template_review_get_asset\` returns the template asset, including price fields, MRP fields, and version history.
- \`template_review_get_version\` returns one template-scoped version.
- \`template_review_get_review_context\` returns the normalized reviewer-facing payload under \`data.context\`.

Always read \`data.context\` before reviewer-safe writes. Important flags:

- \`canAssign\`
- \`canReview\`
- \`canPublish\`
- \`isAssignedToCurrentReviewer\`

## 4. Reviewer-Safe Workflow

Use \`assignableVersionId\` from queue responses as the write target.

Primary reviewer-safe tools:

- \`template_review_assign_self\`
- \`template_review_set_review_status\`
- \`template_review_save_draft_feedback\`
- \`template_review_request_changes\`
- \`template_review_unassign_self\`

Rules:

1. Call \`template_review_assign_self\` before reviewer-safe writes.
2. Do not use \`asset_id\` for reviewer assignment tools.
3. If another reviewer already owns the version, writes must fail closed.
4. Never ask the reviewer for an Airtable collaborator id.

## 5. Broader Decisions

Broader decision tools exist for operator/admin use:

- \`template_review_approve_version\`
- \`template_review_reject_version\`
- \`template_review_complete_publishing\`
- \`template_review_update_asset_metadata\`
- \`template_review_update_asset_publishing\`
- \`template_review_set_price\`

## 6. Cross-Server Analyzer Workflow

When the user wants automated preview/published-site review evidence and the Hub exposes analyzer tools:

- \`enqueue_template_review\` from \`webflow-site-analyzer-mcp\` is the preferred production entrypoint.
- \`get_template_review_job\` polls one queued analyzer job by \`jobId\`.
- \`list_template_review_jobs\` is the recent-job/operator view.
- \`run_template_review\` is synchronous and should be reserved for debugging or manual use.

Rules:

1. Do not describe those analyzer tools as part of this MCP.
2. If the Hub does not expose the analyzer server, do not assume those tools exist.
3. Use analyzer findings as evidence for review feedback or decisions, then persist the resulting Airtable state with the reviewer-safe tools in this MCP.

## 7. Price Update Flow

When a user asks to change a template price:

1. Read the asset with \`template_review_get_asset\`.
2. Write the requested value to the Airtable \`Set Price\` field with \`template_review_set_price\` or \`template_review_update_asset_publishing\`.
3. Return the \`publishing_context.mrp_id\` value so the Admin-side Marketplace price update can be completed against the corresponding MRP record.

Notes:

- \`set_price\` is a whole-number USD amount.
- \`publishing_context\` also includes \`current_price\`, \`set_price\`, \`price_string\`, and \`mrp_id_override\` when available.
- \`template_review_complete_publishing\` can carry \`set_price\` and/or \`mrp_id_overwrite\` during the broader publishing flow.

## 8. Quality Rating

Allowed quality ratings:

- \`❌Low quality\`
- \`⚠️Satisfactory\`
- \`✅Good\`
- \`🥇Exceptional\`

\`⚠️Satisfactory\` is below the publish bar until the remaining issues are addressed.

## 9. Host Play

Recommended host sequence:

1. \`template_review_list_queue\` unless the reviewer explicitly asks for their assigned work.
2. \`template_review_assign_self\` using \`assignableVersionId\` when the reviewer claims work.
3. \`template_review_get_review_context\` before any reviewer-safe mutation.
4. If the user asks for analyzer evidence and the Hub exposes \`webflow-site-analyzer-mcp\`, queue the job with \`enqueue_template_review\` and poll it with \`get_template_review_job\`.
5. \`template_review_save_draft_feedback\`, \`template_review_set_review_status\`, or \`template_review_request_changes\` as needed.
6. For price/admin requests, use \`template_review_set_price\` or \`template_review_update_asset_publishing\` and surface \`publishing_context.mrp_id\` in the response.

When in doubt, use the smallest bounded tool that completes the user’s requested action.`;

export function registerPrompts(server: McpServer): void {
  // Workflow orchestration prompt — teaches agents the full review process.
  // This is the "playbook" that makes the hub AI-native.
  server.prompt(
    'template_review_workflow',
    'Complete workflow guide for reviewing Webflow Marketplace template submissions. Call this first to understand the tools, sequence, and decision criteria.',
    {},
    async () => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: REVIEW_WORKFLOW,
          },
        },
      ],
    }),
  );

  server.prompt(
    'template_review_decision_support',
    'Generate an approve/reject/request-changes recommendation from template asset and version data.',
    {
      asset_json: z.string().describe('Serialized template asset JSON payload.'),
      versions_json: z.string().describe('Serialized array of version/review records.'),
      reviewer_notes: z.string().optional().describe('Optional notes from human reviewer.'),
    },
    async ({ asset_json, versions_json, reviewer_notes }) => ({
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

${reviewer_notes ? `Reviewer notes:\n${reviewer_notes}\n` : ''}
Output sections:
1) Decision
2) Why
3) Required actions for submitter
4) Suggested Airtable mutation plan
5) Remaining unknowns or manual fallback needs`,
          },
        },
      ],
    }),
  );

  server.prompt(
    'template_review_feedback_refiner',
    'Rewrite template review feedback so it is precise and actionable.',
    {
      decision: z.enum(['APPROVE', 'REJECT', 'CHANGES_REQUESTED']),
      draft_feedback: z.string().describe('Raw reviewer feedback to refine.'),
    },
    async ({ decision, draft_feedback }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `${REVIEW_CONTEXT}

Decision: ${decision}

Draft feedback:
${draft_feedback}

Rewrite the feedback to:
- keep the same intent,
- remove ambiguity,
- include concrete next steps,
- avoid unnecessary length.

Return only the refined feedback text.`,
          },
        },
      ],
    }),
  );
}
