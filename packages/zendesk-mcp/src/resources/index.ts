import type { ScopedMcpServer } from '@create-something/mcp-core';

import type { ZendeskAuthMetadata } from '../auth.js';
import { redactEmail } from '../schemas/index.js';

export function registerResources(server: ScopedMcpServer): void {
  server.resource(
    'zendesk_account',
    'zendesk://account',
    { description: 'Configured Webflow Zendesk account boundary with credentials redacted.', mimeType: 'application/json' },
    async (uri, ctx) => {
      const metadata = ctx.metadata as unknown as ZendeskAuthMetadata;
      return jsonResource(uri.href, {
        accountId: ctx.accountId,
        subdomain: metadata.subdomain,
        baseUrl: `https://${metadata.subdomain}.zendesk.com`,
        authMode: metadata.authMode,
        email: redactEmail(metadata.email),
        readOnly: Boolean(ctx.policy.readOnly),
        toolAccessMode: ctx.policy.constraints.mcpToolAccessMode ?? 'normal',
      });
    },
  );

  server.resource(
    'webflow_asset_reviewer_workflow',
    'zendesk://webflow/asset-reviewer-workflow',
    { description: 'Reviewer workflow notes for Webflow Zendesk asset/app-review tickets.', mimeType: 'application/json' },
    async (uri) =>
      jsonResource(uri.href, {
        owner: 'Webflow Asset Reviewers',
        zendesk: 'webflow2579.zendesk.com',
        readTools: [
          'zendesk_search_tickets',
          'zendesk_find_asset_review_tickets',
          'zendesk_get_ticket',
          'zendesk_list_ticket_comments',
          'zendesk_list_active_views',
          'zendesk_list_view_tickets',
          'zendesk_get_user',
        ],
        writeTools: ['zendesk_add_ticket_comment', 'zendesk_update_ticket_status', 'zendesk_add_internal_note'],
        writeGuardrails: [
          'Private notes and status updates require explicit confirmation flags.',
          'Public replies require confirm_public_reply=true.',
          'Do not include secrets, hidden reasoning, or unverified platform commitments in ticket comments.',
          'Use the narrowest status/tag update needed for the review follow-up.',
        ],
      }),
  );
}

function jsonResource(uri: string, data: unknown) {
  return {
    contents: [
      {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}
