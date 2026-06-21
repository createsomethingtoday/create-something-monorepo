import type { AccountContext, ScopedMcpServer, ToolResult } from '@create-something/mcp-core';
import { z } from 'zod';

import type { ZendeskAuthMetadata } from '../auth.js';
import { limitSchema, ticketIdSchema, zendeskTicketStatusSchema, isoDateSchema } from '../schemas/index.js';
import { ZendeskApiError, ZendeskClient, type ZendeskTicketStatus } from '../services/api.js';

export function registerTools(server: ScopedMcpServer): void {
  server.tool(
    'zendesk_health',
    'Verify Webflow Zendesk connectivity and return the authenticated agent identity without exposing credentials.',
    {},
    async (_params, ctx) => handleZendesk(ctx, async (client) => client.healthCheck()),
    { readOnly: true },
  );

  server.tool(
    'zendesk_search_tickets',
    'Search Webflow Zendesk tickets with Zendesk search syntax plus common ticket filters.',
    {
      query: z.string().optional().describe('Zendesk search terms, for example "asset review" or "\"custom code\"".'),
      status: zendeskTicketStatusSchema.optional(),
      tags: z.array(z.string().min(1)).optional().describe('Ticket tags to require, for example ["app_review"].'),
      requester_email: z.string().email().optional().describe('Requester email address.'),
      assignee_id: z.number().int().positive().optional().describe('Zendesk assignee user ID.'),
      group_id: z.number().int().positive().optional().describe('Zendesk group ID.'),
      organization_id: z.number().int().positive().optional().describe('Zendesk organization ID.'),
      created_after: isoDateSchema.optional(),
      created_before: isoDateSchema.optional(),
      sort_by: z.enum(['updated_at', 'created_at', 'priority', 'status']).optional(),
      sort_order: z.enum(['asc', 'desc']).optional(),
      limit: limitSchema,
    },
    async (params, ctx) =>
      handleZendesk(ctx, async (client) =>
        client.searchTickets({
          query: asString(params.query),
          status: params.status as ZendeskTicketStatus | undefined,
          tags: asStringArray(params.tags),
          requesterEmail: asString(params.requester_email),
          assigneeId: asNumber(params.assignee_id),
          groupId: asNumber(params.group_id),
          organizationId: asNumber(params.organization_id),
          createdAfter: asString(params.created_after),
          createdBefore: asString(params.created_before),
          sortBy: params.sort_by as 'updated_at' | 'created_at' | 'priority' | 'status' | undefined,
          sortOrder: params.sort_order as 'asc' | 'desc' | undefined,
          limit: asNumber(params.limit),
        }),
      ),
    { readOnly: true },
  );

  server.tool(
    'zendesk_find_asset_review_tickets',
    'Find likely Webflow asset/app-review tickets by asset ID, app name, submitter, or extra review terms.',
    {
      asset_id: z.string().min(1).optional().describe('Webflow Asset or Asset Version ID if present in ticket text.'),
      app_name: z.string().min(1).optional().describe('App name or customer-facing asset name.'),
      submitter_email: z.string().email().optional().describe('Requester/submitter email.'),
      extra_query: z.string().min(1).optional().describe('Additional Zendesk search terms to include.'),
      status: zendeskTicketStatusSchema.optional(),
      limit: limitSchema,
    },
    async (params, ctx) => {
      const query = [
        '"asset review"',
        asString(params.asset_id),
        asString(params.app_name) ? quoteSearchPhrase(asString(params.app_name) as string) : undefined,
        asString(params.extra_query),
      ]
        .filter(Boolean)
        .join(' ');

      return handleZendesk(ctx, async (client) =>
        client.searchTickets({
          query,
          status: params.status as ZendeskTicketStatus | undefined,
          requesterEmail: asString(params.submitter_email),
          sortBy: 'updated_at',
          sortOrder: 'desc',
          limit: asNumber(params.limit),
        }),
      );
    },
    { readOnly: true },
  );

  server.tool(
    'zendesk_get_ticket',
    'Get one Webflow Zendesk ticket by ID, including side-loaded users, groups, and organizations where available.',
    {
      ticket_id: ticketIdSchema,
    },
    async (params, ctx) => handleZendesk(ctx, async (client) => client.getTicket(asNumber(params.ticket_id) as number)),
    { readOnly: true },
  );

  server.tool(
    'zendesk_list_ticket_comments',
    'List comments for a Webflow Zendesk ticket. Includes private comments when the configured Zendesk agent can see them.',
    {
      ticket_id: ticketIdSchema,
      include_users: z.boolean().optional().describe('Include side-loaded user records. Defaults to true.'),
    },
    async (params, ctx) =>
      handleZendesk(ctx, async (client) =>
        client.listTicketComments(asNumber(params.ticket_id) as number, {
          includeUsers: params.include_users === undefined ? true : Boolean(params.include_users),
        }),
      ),
    { readOnly: true },
  );

  server.tool(
    'zendesk_list_active_views',
    'List active Zendesk views so reviewers can find queues such as Marketplace Reviews.',
    {
      limit: limitSchema,
    },
    async (params, ctx) =>
      handleZendesk(ctx, async (client) => client.listActiveViews({ limit: asNumber(params.limit) })),
    { readOnly: true },
  );

  server.tool(
    'zendesk_list_view_tickets',
    'List tickets from a Zendesk view, for example the Webflow Marketplace Reviews view.',
    {
      view_id: z.number().int().positive().describe('Zendesk view ID.'),
      limit: limitSchema,
    },
    async (params, ctx) =>
      handleZendesk(ctx, async (client) =>
        client.listViewTickets(asNumber(params.view_id) as number, { limit: asNumber(params.limit) }),
      ),
    { readOnly: true },
  );

  server.tool(
    'zendesk_get_user',
    'Get a Zendesk user by ID or search users by email.',
    {
      user_id: z.number().int().positive().optional(),
      email: z.string().email().optional(),
    },
    async (params, ctx) => {
      if (!params.user_id && !params.email) {
        return errorResult('INVALID_INPUT', 'Provide user_id or email.', 400);
      }
      return handleZendesk(ctx, async (client) =>
        client.getUser({
          userId: asNumber(params.user_id),
          email: asString(params.email),
        }),
      );
    },
    { readOnly: true },
  );

  server.tool(
    'zendesk_add_ticket_comment',
    'Add a public reply or private internal note to a Webflow Zendesk ticket, optionally updating status and tags.',
    {
      ticket_id: ticketIdSchema,
      body: z.string().min(1).describe('Comment body. Do not include secrets or hidden chain-of-thought.'),
      visibility: z
        .enum(['private_internal_note', 'public_reply'])
        .describe('Use private_internal_note for reviewer notes; use public_reply only when intentionally replying to the requester.'),
      status: zendeskTicketStatusSchema.optional().describe('Optional ticket status update.'),
      additional_tags: z.array(z.string().min(1)).optional().describe('Tags to add without replacing existing tags.'),
      remove_tags: z.array(z.string().min(1)).optional().describe('Tags to remove.'),
      confirm_ticket_update: z.literal(true).describe('Must be true to confirm the ticket comment/update should be written.'),
      confirm_public_reply: z
        .literal(true)
        .optional()
        .describe('Required when visibility is public_reply. Confirms the comment is customer-visible.'),
    },
    async (params, ctx) => {
      if (ctx.policy.readOnly) {
        return errorResult('READ_ONLY_POLICY', 'This account is configured read-only; ticket writes are disabled.', 403);
      }

      const visibility = params.visibility;
      if (visibility === 'public_reply' && params.confirm_public_reply !== true) {
        return errorResult(
          'PUBLIC_REPLY_CONFIRMATION_REQUIRED',
          'Set confirm_public_reply=true before writing a public Zendesk reply.',
          400,
        );
      }

      return handleZendesk(ctx, async (client) =>
        client.updateTicket(asNumber(params.ticket_id) as number, {
          comment: {
            body: asString(params.body) as string,
            public: visibility === 'public_reply',
          },
          status: params.status as ZendeskTicketStatus | undefined,
          additional_tags: asStringArray(params.additional_tags),
          remove_tags: asStringArray(params.remove_tags),
        }),
      );
    },
  );

  server.tool(
    'zendesk_update_ticket_status',
    'Update a Webflow Zendesk ticket status and tags, optionally with a private internal note explaining the change.',
    {
      ticket_id: ticketIdSchema,
      status: zendeskTicketStatusSchema.describe('New ticket status.'),
      private_note: z
        .string()
        .min(1)
        .optional()
        .describe('Optional private internal note explaining the status change.'),
      additional_tags: z.array(z.string().min(1)).optional().describe('Tags to add without replacing existing tags.'),
      remove_tags: z.array(z.string().min(1)).optional().describe('Tags to remove.'),
      confirm_status_update: z.literal(true).describe('Must be true to confirm the status/tag update should be written.'),
    },
    async (params, ctx) => {
      if (ctx.policy.readOnly) {
        return errorResult('READ_ONLY_POLICY', 'This account is configured read-only; status writes are disabled.', 403);
      }

      const privateNote = asString(params.private_note);
      return handleZendesk(ctx, async (client) =>
        client.updateTicket(asNumber(params.ticket_id) as number, {
          ...(privateNote
            ? {
                comment: {
                  body: privateNote,
                  public: false,
                },
              }
            : {}),
          status: params.status as ZendeskTicketStatus,
          additional_tags: asStringArray(params.additional_tags),
          remove_tags: asStringArray(params.remove_tags),
        }),
      );
    },
  );

  server.tool(
    'zendesk_add_internal_note',
    'Add a private internal note to a Webflow Zendesk ticket, optionally updating status and tags. This never creates a public reply.',
    {
      ticket_id: ticketIdSchema,
      body: z.string().min(1).describe('Private internal note body. Do not include secrets or hidden chain-of-thought.'),
      status: zendeskTicketStatusSchema.optional().describe('Optional ticket status update.'),
      additional_tags: z.array(z.string().min(1)).optional().describe('Tags to add without replacing existing tags.'),
      remove_tags: z.array(z.string().min(1)).optional().describe('Tags to remove.'),
      confirm_private_note: z
        .literal(true)
        .describe('Must be true to confirm this is a private internal note, not a public customer reply.'),
    },
    async (params, ctx) => {
      if (ctx.policy.readOnly) {
        return errorResult('READ_ONLY_POLICY', 'This account is configured read-only; private note writes are disabled.', 403);
      }

      return handleZendesk(ctx, async (client) =>
        client.updateTicket(asNumber(params.ticket_id) as number, {
          comment: {
            body: asString(params.body) as string,
            public: false,
          },
          status: params.status as ZendeskTicketStatus | undefined,
          additional_tags: asStringArray(params.additional_tags),
          remove_tags: asStringArray(params.remove_tags),
        }),
      );
    },
  );
}

async function handleZendesk(
  ctx: AccountContext,
  callback: (client: ZendeskClient) => Promise<unknown>,
): Promise<ToolResult> {
  try {
    const result = await callback(createClient(ctx));
    return jsonContent({ ok: true, data: result });
  } catch (error) {
    if (error instanceof ZendeskApiError) {
      return errorResult(error.code, error.message, error.status, error.details);
    }
    return errorResult('UNEXPECTED_ERROR', error instanceof Error ? error.message : String(error), 500);
  }
}

function createClient(ctx: AccountContext): ZendeskClient {
  const metadata = ctx.metadata as unknown as ZendeskAuthMetadata;
  return new ZendeskClient({
    subdomain: metadata.subdomain,
    email: metadata.email,
    authMode: metadata.authMode,
    timeoutMs: metadata.timeoutMs,
    tokenProvider: ctx.tokenProvider,
  });
}

function errorResult(code: string, message: string, status: number, details?: unknown): ToolResult {
  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            ok: false,
            error: {
              code,
              message,
              status,
              ...(details === undefined ? {} : { details }),
            },
          },
          null,
          2,
        ),
      },
    ],
  };
}

function jsonContent(data: unknown): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const values = value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
  return values.length > 0 ? values.map((entry) => entry.trim()) : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function quoteSearchPhrase(value: string): string {
  return value.includes(' ') ? `"${value.replaceAll('"', '\\"')}"` : value;
}
