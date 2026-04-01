import { z } from 'zod';
import type { ScopedMcpServer } from '@create-something/mcp-core';

export function registerPrompts(server: ScopedMcpServer): void {
  server.prompt(
    'ziprecruiter_job_preflight_review',
    'Review a nurse staffing job payload before posting it to ZipRecruiter.',
    {
      job_json: z.string().describe('JSON string of the job payload to review.'),
      focus: z.string().optional().describe('Optional review focus, such as location completeness or nurse-market fit.'),
    },
    async (params, ctx) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Review this ZipRecruiter nurse staffing job payload for account ${ctx.accountId}.

Focus on:
- required ZipRecruiter job fields
- nurse staffing specificity (specialty, shift, location, pay clarity)
- anything likely to reduce candidate quality or delivery reliability

${params.focus ? `Extra focus: ${params.focus}\n` : ''}Job JSON:
${params.job_json}

Return a terse launch recommendation with concrete fixes.`,
          },
        },
      ],
    }),
  );

  server.prompt(
    'ziprecruiter_hiring_signal_mapping_review',
    'Review how an internal application state should map to a ZipRecruiter hiring signal.',
    {
      local_status: z.string().describe('The internal application stage or disposition.'),
      target_event: z.string().optional().describe('Optional proposed ZipRecruiter event.'),
      notes: z.string().optional().describe('Extra context such as rejection reasons or compliance steps.'),
    },
    async (params, ctx) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Map this Abundance staffing state to a ZipRecruiter hiring signal for account ${ctx.accountId}.

Internal status: ${params.local_status}
${params.target_event ? `Proposed ZipRecruiter event: ${params.target_event}\n` : ''}${params.notes ? `Notes: ${params.notes}\n` : ''}
Use the standard ZipRecruiter funnel when possible: received, viewed, contacted, assessment, interviewed, offered, prehire, hired, rejected.

If the state does not map cleanly, say so and recommend unable_to_map with the status_name/status_group fields that should be sent.`,
          },
        },
      ],
    }),
  );
}
