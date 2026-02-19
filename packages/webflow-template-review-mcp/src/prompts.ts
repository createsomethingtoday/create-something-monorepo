import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const REVIEW_SYSTEM_CONTEXT = `You are supporting Webflow's Template Review Team.
Use only supplied review facts. Do not invent test results.
Prioritize user safety, policy alignment, and actionable feedback.`;

export function registerPrompts(server: McpServer): void {
  server.prompt(
    'template_review_decision_support',
    'Structured recommendation helper for approve/reject/request-changes decisions',
    {
      asset_payload_json: z.string().describe('JSON payload from template_review_get_asset'),
      version_payload_json: z.string().optional().describe('JSON payload from template_review_get_version'),
      policy_notes: z.string().optional().describe('Optional team policy notes to apply'),
    },
    async ({ asset_payload_json, version_payload_json, policy_notes }) => {
      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `${REVIEW_SYSTEM_CONTEXT}

Task: Recommend one decision: APPROVE, REQUEST_CHANGES, or REJECT.

Asset context:
\`\`\`json
${asset_payload_json}
\`\`\`

Version context:
\`\`\`json
${version_payload_json ?? '{}'}
\`\`\`

Policy notes:
${policy_notes ?? 'None provided.'}

Respond with this structure:
1) decision
2) confidence (low|medium|high)
3) rationale (3-6 bullets)
4) required reviewer actions
5) candidate review status + review type
6) rejection reason (only if reject)
7) concise feedback draft to send creator`,
            },
          },
        ],
      };
    },
  );

  server.prompt(
    'template_review_feedback_refiner',
    'Refine reviewer feedback for clarity and actionability while preserving decision',
    {
      decision: z.enum(['APPROVE', 'REQUEST_CHANGES', 'REJECT']),
      raw_feedback: z.string(),
      tone: z.enum(['direct', 'supportive', 'neutral']).optional(),
      max_words: z.number().int().min(30).max(400).optional(),
    },
    async ({ decision, raw_feedback, tone, max_words }) => {
      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `${REVIEW_SYSTEM_CONTEXT}

Task: Rewrite review feedback without changing decision outcome.

Decision: ${decision}
Tone: ${tone ?? 'neutral'}
Max words: ${max_words ?? 180}

Raw feedback:
${raw_feedback}

Requirements:
- Keep the same decision intent.
- Remove ambiguity and subjective language.
- Include concrete next steps and acceptance criteria.
- Keep language professional and concise.
- End with one short checklist of creator actions.`,
            },
          },
        ],
      };
    },
  );
}
