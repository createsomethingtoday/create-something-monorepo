import { z } from 'zod';
import type { ScopedMcpServer } from '@create-something/mcp-core';

export function registerPrompts(server: ScopedMcpServer): void {
  server.prompt(
    'indeed_apply_job_preflight_review',
    'Review an Indeed Apply job payload before it is added to the feed.',
    {
      job_json: z.string().describe('JSON string of the Indeed job payload to review.'),
      focus: z.string().optional().describe('Optional focus such as nurse-market clarity or missing feed elements.'),
    },
    async (params, ctx) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Review this Indeed Apply nurse staffing payload for account ${ctx.accountId}.

Focus on:
- required XML feed fields
- Indeed Apply metadata completeness
- nurse staffing specificity (specialty, shift, location, pay clarity)
- anything likely to reduce apply conversion or launch approval

${params.focus ? `Extra focus: ${params.focus}\n` : ''}Job JSON:
${params.job_json}

Return a terse launch recommendation with concrete fixes.`,
          },
        },
      ],
    }),
  );

  server.prompt(
    'indeed_apply_disposition_mapping_review',
    'Review how an internal recruiter status should map to an Indeed disposition.',
    {
      local_status: z.string().describe('The internal application stage or disposition.'),
      notes: z.string().optional().describe('Extra context such as rejection reasons or compliance steps.'),
    },
    async (params, ctx) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Map this Abundance staffing state to an Indeed disposition for account ${ctx.accountId}.

Internal status: ${params.local_status}
${params.notes ? `Notes: ${params.notes}\n` : ''}
Prefer the narrowest accurate state. If the status is ambiguous, say that and recommend the minimum-risk holding state instead of inventing a clean mapping.`,
          },
        },
      ],
    }),
  );
}

