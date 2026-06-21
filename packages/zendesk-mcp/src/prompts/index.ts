import type { ScopedMcpServer } from '@create-something/mcp-core';
import { z } from 'zod';

export function registerPrompts(server: ScopedMcpServer): void {
  server.prompt(
    'draft_webflow_asset_review_reply',
    'Draft a concise Zendesk comment for a Webflow asset/app-review ticket.',
    {
      ticket_summary: z.string().min(1).describe('Relevant ticket facts and reviewer findings.'),
      audience: z.enum(['internal', 'customer']).describe('Whether the draft is for an internal note or public requester reply.'),
      requested_status: z.string().optional().describe('Optional target status such as pending, hold, solved, or open.'),
    },
    async (params, ctx) => {
      const audience = String(params.audience);
      const publicReplyGuardrail =
        audience === 'customer'
          ? 'This is a customer-visible draft. Do not mention internal tooling, hidden policy, private reviewer discussion, or uncertain claims.'
          : 'This is an internal note draft. Keep it factual and useful for reviewer handoff.';

      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Draft a Zendesk ${audience === 'customer' ? 'public reply' : 'private internal note'} for Webflow asset reviewers.

Account: ${ctx.accountId}
${publicReplyGuardrail}
${params.requested_status ? `Target status: ${params.requested_status}` : ''}

Ticket facts:
${params.ticket_summary}

Return only the proposed comment body. Keep it concise, specific, and action-oriented.`,
            },
          },
        ],
      };
    },
  );

  server.prompt(
    'triage_webflow_asset_review_ticket',
    'Triage a Webflow Zendesk asset-review ticket and recommend the next reviewer action.',
    {
      ticket_json: z.string().min(1).describe('JSON from zendesk_get_ticket plus relevant comments.'),
    },
    async (params, ctx) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Triage this Webflow Zendesk asset-review ticket for account ${ctx.accountId}.

Classify:
- review blocker
- requester-visible next step
- internal owner/follow-up
- recommended Zendesk status
- whether a public reply is appropriate

Do not infer facts that are not in the ticket JSON. Do not recommend public claims without evidence.

Ticket JSON:
${params.ticket_json}`,
          },
        },
      ],
    }),
  );
}
