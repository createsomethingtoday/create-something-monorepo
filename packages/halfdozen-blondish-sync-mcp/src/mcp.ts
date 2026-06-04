import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  auditSync,
  fullReconcile,
  planSourceToHalfDozenRepairs,
  preflight,
  repairExternalUrlDrift,
  repairMissingHalfDozenRows,
  syncHalfDozenStatusToSource,
  syncSourceTicketsToHalfDozen,
} from './sync.js';
import { emitBraintrustToolInvocation } from './braintrust.js';
import type { Env, ToolResponse } from './types.js';

const optionalPageIdsSchema = z.object({
  page_ids: z.array(z.string()).min(1).max(100).optional().describe('Optional Notion page IDs or source Page ID values to reconcile.'),
  page_id: z.string().optional().describe('Single Notion page ID or source Page ID value to reconcile.'),
});

const CONTRACT = {
  source: 'BLOND:ISH Support Tickets [OS]',
  target: 'Half Dozen Tickets [HD]',
  match_key: 'source Page ID -> target External Page ID or Ext Page ID',
  source_owned_fields: ['Ticket', 'Source', 'Owner', 'Client', 'External Page ID / Ext Page ID', 'External URL', 'External Files & Media', 'page body'],
  hd_owned_fields: ['Status'],
  status_map: {
    Assigned: 'Under Review',
    'In Progress': 'In Progress',
    'Client Action': 'Action Required',
    Complete: 'Complete',
    Archive: 'Archive',
    Roadblock: 'Roadblock',
  },
  unsupported: ['generic arbitrary property sync', 'delete propagation', 'field-level conflict resolution', 'reverse syncing HD edits to title/body/external references'],
  scale_notes: [
    'Use audit and plan tools for operator sessions.',
    'Use scoped repair tools before broad reconcile tools.',
    'Use Notion webhooks or a persisted sync index before frequent large-database polling.',
  ],
};

export function createBlondishSyncMcpServer(env: Env): McpServer {
  const server = new McpServer({
    name: 'halfdozen-blondish-sync-mcp',
    version: '0.1.0',
  });

  server.tool(
    'blondish_sync_preflight',
    'Validate BLOND:ISH and Half Dozen Notion token access, data source visibility, and required sync properties. No writes.',
    {},
    async () => tracedJsonToolResponse(env, 'blondish_sync_preflight', () => preflight(env)),
  );

  server.tool(
    'blondish_sync_audit',
    'Audit BLOND:ISH and Half Dozen ticket rows for missing HD rows, duplicate matches, contract-field drift, body drift, and reverse-status drift. No writes.',
    {},
    async () => tracedJsonToolResponse(env, 'blondish_sync_audit', () => auditSync(env)),
  );

  server.tool(
    'blondish_sync_plan_source_to_hd_repairs',
    'Plan source-to-HD repairs from a fresh audit. No writes. Prefer this before write tools so the operator sees scoped repair options.',
    {},
    async () => tracedJsonToolResponse(env, 'blondish_sync_plan_source_to_hd_repairs', () => planSourceToHalfDozenRepairs(env)),
  );

  server.tool(
    'blondish_sync_repair_missing_hd_rows',
    'Create only HD rows that are currently missing from the source-to-HD match. Does not update existing rows and never overwrites HD Status.',
    {},
    async () => tracedJsonToolResponse(env, 'blondish_sync_repair_missing_hd_rows', () => repairMissingHalfDozenRows(env)),
  );

  server.tool(
    'blondish_sync_repair_external_url_drift',
    'Repair only External URL drift on currently matched HD rows. Does not create rows, change page body, repair titles, or overwrite HD Status.',
    {},
    async () => tracedJsonToolResponse(env, 'blondish_sync_repair_external_url_drift', () => repairExternalUrlDrift(env)),
  );

  server.tool(
    'blondish_sync_source_to_hd',
    'Directly create or repair Half Dozen ticket rows from BLOND:ISH source rows. Never overwrites HD Status.',
    optionalPageIdsSchema.shape,
    async (params) => tracedJsonToolResponse(
      env,
      'blondish_sync_source_to_hd',
      () => syncSourceTicketsToHalfDozen(env, { sourcePageIds: normalizePageIds(params) }),
    ),
  );

  server.tool(
    'blondish_sync_hd_status_to_source',
    'Directly write mapped Half Dozen Status values back to BLOND:ISH. Only mapped statuses are written.',
    optionalPageIdsSchema.shape,
    async (params) => tracedJsonToolResponse(
      env,
      'blondish_sync_hd_status_to_source',
      () => syncHalfDozenStatusToSource(env, { targetPageIds: normalizePageIds(params) }),
    ),
  );

  server.tool(
    'blondish_sync_full',
    'Run source-to-HD reconciliation, then HD-status-to-BLONDISH status reconciliation.',
    {},
    async () => tracedJsonToolResponse(env, 'blondish_sync_full', () => fullReconcile(env)),
  );

  server.resource(
    'BLONDISH Sync Contract',
    'sync://blondish/contract',
    {
      description: 'BLOND:ISH / Half Dozen sync ownership, match keys, status mapping, and unsupported behaviors.',
      mimeType: 'application/json',
    },
    async () => ({
      contents: [{
        uri: 'sync://blondish/contract',
        mimeType: 'application/json',
        text: JSON.stringify(CONTRACT, null, 2),
      }],
    }),
  );

  server.prompt(
    'blondish_sync_operator',
    'Guide a Notion agent/operator through BLOND:ISH / Half Dozen ticket reconciliation.',
    {
      intent: z.string().optional().describe('What the operator wants to do, such as audit, repair one row, or reconcile all rows.'),
    },
    (args) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              'You are operating the BLOND:ISH / Half Dozen ticket sync MCP.',
              'Use blondish_sync_preflight before first use in a session if runtime health is unknown.',
              'For diagnosis, call blondish_sync_audit and summarize exact row IDs and drift categories.',
              'For repair planning, call blondish_sync_plan_source_to_hd_repairs and prefer scoped repair tools when they cover the drift.',
              'Use blondish_sync_repair_missing_hd_rows only for missing source-to-HD rows.',
              'Use blondish_sync_repair_external_url_drift only for matched rows whose External URL drifted.',
              'Use blondish_sync_source_to_hd only when the operator explicitly wants broader page-data contract repair.',
              'Use blondish_sync_hd_status_to_source only for HD-owned status drift.',
              'Do not claim this is generic bidirectional replication. HD title/body/source/owner/client/external-reference edits are not reverse-synced to BLOND:ISH.',
              'For future scale, treat Notion webhooks and a persisted sync index as the normal event path; this MCP remains the operator control plane.',
              args.intent ? `Operator intent: ${args.intent}` : '',
            ].filter(Boolean).join('\n'),
          },
        },
      ],
    }),
  );

  return server;
}

function normalizePageIds(params: unknown): string[] | undefined {
  const parsed = optionalPageIdsSchema.parse(params);
  if (parsed.page_ids?.length) return parsed.page_ids;
  if (parsed.page_id?.trim()) return [parsed.page_id.trim()];
  return undefined;
}

function jsonToolResponse(payload: unknown): ToolResponse {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
  };
}

async function tracedJsonToolResponse(env: Env, toolName: string, operation: () => Promise<unknown>): Promise<ToolResponse> {
  const startedAt = Date.now();

  try {
    const payload = await operation();
    await emitBraintrustToolInvocation(env, {
      toolName,
      result: payload,
      durationMs: Date.now() - startedAt,
    });
    return jsonToolResponse(payload);
  } catch (error) {
    await emitBraintrustToolInvocation(env, {
      toolName,
      durationMs: Date.now() - startedAt,
      error,
    });
    throw error;
  }
}
