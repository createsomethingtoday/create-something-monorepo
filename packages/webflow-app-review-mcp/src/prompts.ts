import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

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
}

