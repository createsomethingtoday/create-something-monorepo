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
import { resolveRuntimeConfig } from './config.js';
import { emitLangfuseToolInvocation } from './langfuse.js';
import type { Env, ToolResponse } from './types.js';

const optionalPageIdsSchema = z.object({
  page_ids: z.array(z.string()).min(1).max(100).optional().describe('Optional Notion page IDs or source Page ID values to reconcile.'),
  page_id: z.string().optional().describe('Single Notion page ID or source Page ID value to reconcile.'),
});

export function createBlondishSyncMcpServer(env: Env): McpServer {
  return createTicketSyncMcpServer(env);
}

export function createTicketSyncMcpServer(env: Env): McpServer {
  const runtime = resolveRuntimeConfig(env);
  const tools = toolNames(runtime.toolPrefix);
  const server = new McpServer({
    name: runtime.serverName,
    version: '0.1.0',
  });

  server.tool(
    tools.preflight,
    `Validate ${runtime.clientDisplayName} and Half Dozen Notion token access, data source visibility, and required sync properties. No writes.`,
    {},
    async () => tracedJsonToolResponse(env, tools.preflight, () => preflight(env)),
  );

  server.tool(
    tools.audit,
    `Audit ${runtime.clientDisplayName} and Half Dozen ticket rows for missing HD rows, duplicate matches, contract-field drift, body drift, and reverse-status drift. No writes.`,
    {},
    async () => tracedJsonToolResponse(env, tools.audit, () => auditSync(env)),
  );

  server.tool(
    tools.planSourceToHdRepairs,
    'Plan source-to-HD repairs from a fresh audit. No writes. Prefer this before write tools so the operator sees scoped repair options.',
    {},
    async () => tracedJsonToolResponse(env, tools.planSourceToHdRepairs, () => planSourceToHalfDozenRepairs(env)),
  );

  server.tool(
    tools.repairMissingHdRows,
    'Create only HD rows that are currently missing from the source-to-HD match. Does not update existing rows and never overwrites HD Status.',
    {},
    async () => tracedJsonToolResponse(env, tools.repairMissingHdRows, () => repairMissingHalfDozenRows(env)),
  );

  server.tool(
    tools.repairExternalUrlDrift,
    'Repair only External URL drift on currently matched HD rows. Does not create rows, change page body, repair titles, or overwrite HD Status.',
    {},
    async () => tracedJsonToolResponse(env, tools.repairExternalUrlDrift, () => repairExternalUrlDrift(env)),
  );

  server.tool(
    tools.sourceToHd,
    `Directly create or repair Half Dozen ticket rows from ${runtime.clientDisplayName} source rows. Never overwrites HD Status.`,
    optionalPageIdsSchema.shape,
    async (params) => tracedJsonToolResponse(
      env,
      tools.sourceToHd,
      () => syncSourceTicketsToHalfDozen(env, { sourcePageIds: normalizePageIds(params) }),
    ),
  );

  server.tool(
    tools.hdStatusToSource,
    `Directly write mapped Half Dozen Status values back to ${runtime.clientDisplayName}. Only mapped statuses are written.`,
    optionalPageIdsSchema.shape,
    async (params) => tracedJsonToolResponse(
      env,
      tools.hdStatusToSource,
      () => syncHalfDozenStatusToSource(env, { targetPageIds: normalizePageIds(params) }),
    ),
  );

  server.tool(
    tools.full,
    `Run source-to-HD reconciliation, then HD-status-to-${runtime.clientDisplayName} status reconciliation.`,
    {},
    async () => tracedJsonToolResponse(env, tools.full, () => fullReconcile(env)),
  );

  const contractUri = `sync://${runtime.clientSlug}/contract`;
  server.resource(
    `${runtime.clientDisplayName} Sync Contract`,
    contractUri,
    {
      description: `${runtime.clientDisplayName} / Half Dozen sync ownership, match keys, status mapping, and unsupported behaviors.`,
      mimeType: 'application/json',
    },
    async () => ({
      contents: [{
        uri: contractUri,
        mimeType: 'application/json',
        text: JSON.stringify(buildContract(runtime.clientDisplayName), null, 2),
      }],
    }),
  );

  server.prompt(
    `${runtime.toolPrefix}_operator`,
    `Guide a Notion agent/operator through ${runtime.clientDisplayName} / Half Dozen ticket reconciliation.`,
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
              `You are operating the ${runtime.clientDisplayName} / Half Dozen ticket sync MCP.`,
              `Use ${tools.preflight} before first use in a session if runtime health is unknown.`,
              `For diagnosis, call ${tools.audit} and summarize exact row IDs and drift categories.`,
              `For repair planning, call ${tools.planSourceToHdRepairs} and prefer scoped repair tools when they cover the drift.`,
              `Use ${tools.repairMissingHdRows} only for missing source-to-HD rows.`,
              `Use ${tools.repairExternalUrlDrift} only for matched rows whose External URL drifted.`,
              `Use ${tools.sourceToHd} only when the operator explicitly wants broader page-data contract repair.`,
              `Use ${tools.hdStatusToSource} only for HD-owned status drift.`,
              `Do not claim this is generic bidirectional replication. HD title/body/source/owner/client/external-reference edits are not reverse-synced to ${runtime.clientDisplayName}.`,
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

function toolNames(prefix: string) {
  return {
    preflight: `${prefix}_preflight`,
    audit: `${prefix}_audit`,
    planSourceToHdRepairs: `${prefix}_plan_source_to_hd_repairs`,
    repairMissingHdRows: `${prefix}_repair_missing_hd_rows`,
    repairExternalUrlDrift: `${prefix}_repair_external_url_drift`,
    sourceToHd: `${prefix}_source_to_hd`,
    hdStatusToSource: `${prefix}_hd_status_to_source`,
    full: `${prefix}_full`,
  };
}

function buildContract(clientDisplayName: string) {
  return {
    source: `${clientDisplayName} Support Tickets [OS]`,
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
    await emitToolInvocationTelemetry(env, {
      toolName,
      result: payload,
      durationMs: Date.now() - startedAt,
    });
    return jsonToolResponse(payload);
  } catch (error) {
    await emitToolInvocationTelemetry(env, {
      toolName,
      durationMs: Date.now() - startedAt,
      error,
    });
    throw error;
  }
}

async function emitToolInvocationTelemetry(
  env: Env,
  invocation: { toolName: string; result?: unknown; durationMs: number; error?: unknown },
): Promise<void> {
  await Promise.all([
    emitLangfuseToolInvocation(env, invocation),
  ]);
}
