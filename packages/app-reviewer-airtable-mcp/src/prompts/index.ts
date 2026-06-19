import type { ScopedMcpServer } from '@create-something/mcp-core';
import { z } from 'zod';

export function registerPrompts(server: ScopedMcpServer): void {
  server.prompt(
    'app_reviewer_airtable_investigation',
    'Plan and execute a focused App Reviewer Airtable investigation over Assets and Asset Versions.',
    {
      task: z.string().describe('The reviewer question or investigation goal.'),
      known_app_id: z.string().optional().describe('Known app id, if available.'),
      known_asset_id: z.string().optional().describe('Known Airtable Assets record id, if available.'),
      sensitivity: z.enum(['normal', 'needs_credentials']).optional().describe('Whether credential fields are required.'),
    },
    async (params, ctx) => {
      const needsCredentials = params.sensitivity === 'needs_credentials';
      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Investigate App Reviewer Airtable data for account ${ctx.accountId}.

Task:
${params.task}

Known IDs:
- app_id: ${params.known_app_id ?? 'unknown'}
- asset_id: ${params.known_asset_id ?? 'unknown'}

Operational rules:
- Start with app_reviewer_airtable_health if table reachability is unknown.
- Prefer exact identifiers over broad search.
- Use app_reviewer_list_assets with preset=summary for discovery, then app_reviewer_get_asset for one record.
- Use app_reviewer_list_asset_versions after an asset_id is known.
- Do not request raw fields unless the field-id contract is part of the task.
- Do not request sensitive fields unless the task explicitly requires credentials or internal notes.
- Use dry_run=true before a write when validating field shape or planning a mutation.
- Write latest review state on the relevant Asset Version with app_reviewer_update_asset_version_fields.review_status; do not write derived asset summary fields directly.
- Current sensitive-field posture: ${needsCredentials ? 'credentials are allowed for this task if needed' : 'credentials should stay excluded'}.

Return concise findings with Airtable record ids and the exact fields that support the conclusion.`,
            },
          },
        ],
      };
    },
  );
}
