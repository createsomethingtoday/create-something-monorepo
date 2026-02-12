/**
 * MCP Resource handlers — the Database tier (application-controlled).
 *
 * Three-Tier Framework alignment:
 *   - Database tier: Resources expose sync state as read-only data
 *   - Control model: Application-controlled — the client decides when to fetch
 *   - Artifacts: Client configs, sync stats, and history as typed payloads
 *
 * Resources let the MCP client (Claude) inject sync context into the
 * conversation without the model needing to call tools. This is the
 * key distinction: Resources are injected by the application, Tools
 * are invoked by the model.
 *
 * Agent UX: These resources replace the read-only tools (list_clients,
 * status, history) to eliminate tool-vs-resource ambiguity.
 */

import type { AccountContext, ResourceResult } from '@create-something/mcp-core';
import { getD1Executor } from '../auth.js';
import {
  ensureInitialized,
  listClientMappings,
  getSyncStats,
  getClientMappingByName,
  getRecentSyncLogs,
  listPageMappings,
} from '../services/d1.js';

// ─── sync://clients ─────────────────────────────────────────────────

/**
 * List all registered clients with their configurations.
 * Notion tokens are masked in the output.
 */
export async function handleClientsResource(
  _uri: URL,
  ctx: AccountContext
): Promise<ResourceResult> {
  const d1 = getD1Executor(ctx);

  try {
    await ensureInitialized(d1);
    const clients = await listClientMappings(d1);

    // Mask tokens for security
    const safe = clients.map((c) => {
      const syncProps =
        typeof c.sync_properties === 'string'
          ? JSON.parse(c.sync_properties)
          : c.sync_properties;

      return {
        client_name: c.client_name,
        master_database_id: c.master_database_id,
        client_database_id: c.client_database_id,
        client_filter_property: c.client_filter_property,
        client_filter_value: c.client_filter_value,
        sync_properties: syncProps,
        conflict_strategy: c.conflict_strategy,
        created_at: c.created_at,
      };
    });

    return {
      contents: [
        {
          uri: 'sync://clients',
          mimeType: 'application/json',
          text: JSON.stringify(safe, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      contents: [
        {
          uri: 'sync://clients',
          mimeType: 'application/json',
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
    };
  }
}

// ─── sync://status ──────────────────────────────────────────────────

/**
 * Global sync status — total clients, page mappings, pending syncs, conflicts.
 */
export async function handleStatusResource(
  _uri: URL,
  ctx: AccountContext
): Promise<ResourceResult> {
  const d1 = getD1Executor(ctx);

  try {
    await ensureInitialized(d1);
    const stats = await getSyncStats(d1);

    return {
      contents: [
        {
          uri: 'sync://status',
          mimeType: 'application/json',
          text: JSON.stringify(stats, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      contents: [
        {
          uri: 'sync://status',
          mimeType: 'application/json',
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
    };
  }
}

// ─── sync://client/{client_name} ────────────────────────────────────

/**
 * Per-client state: config + current sync status breakdown + last sync info.
 * This is the most useful resource for deciding what to do next.
 */
export async function handleClientResource(
  uri: URL,
  ctx: AccountContext
): Promise<ResourceResult> {
  const d1 = getD1Executor(ctx);

  const clientName = decodeURIComponent(uri.pathname.replace(/^\/+/, ''));
  const resourceUri = `sync://client/${encodeURIComponent(clientName)}`;

  try {
    await ensureInitialized(d1);

    if (!clientName) {
      return {
        contents: [
          {
            uri: resourceUri,
            mimeType: 'application/json',
            text: JSON.stringify({ error: 'Client name is required in the URI path' }),
          },
        ],
      };
    }

    const mapping = await getClientMappingByName(d1, clientName);
    if (!mapping) {
      return {
        contents: [
          {
            uri: resourceUri,
            mimeType: 'application/json',
            text: JSON.stringify({ error: `Client '${clientName}' not found` }),
          },
        ],
      };
    }

    // Get page mapping status counts
    const allMappings = await listPageMappings(d1, mapping.id);
    const statusCounts = allMappings.reduce(
      (acc, pm) => {
        acc[pm.sync_status] = (acc[pm.sync_status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Get last sync
    const recentLogs = await getRecentSyncLogs(d1, mapping.id, 1);
    const lastSync = recentLogs.length > 0
      ? {
          started_at: recentLogs[0].started_at,
          completed_at: recentLogs[0].completed_at,
          direction: recentLogs[0].direction,
          pages_pushed: recentLogs[0].pages_pushed,
          pages_pulled: recentLogs[0].pages_pulled,
          pages_created: recentLogs[0].pages_created,
          conflicts: recentLogs[0].conflicts_count,
          errors: recentLogs[0].errors_count,
          duration_ms: recentLogs[0].duration_ms,
        }
      : null;

    const syncProps =
      typeof mapping.sync_properties === 'string'
        ? JSON.parse(mapping.sync_properties)
        : mapping.sync_properties;

    return {
      contents: [
        {
          uri: resourceUri,
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              client_name: mapping.client_name,
              config: {
                master_database_id: mapping.master_database_id,
                client_database_id: mapping.client_database_id,
                filter_property: mapping.client_filter_property,
                filter_value: mapping.client_filter_value,
                sync_properties: syncProps,
                conflict_strategy: mapping.conflict_strategy,
                created_at: mapping.created_at,
              },
              status: {
                total_page_mappings: allMappings.length,
                by_status: statusCounts,
              },
              last_sync: lastSync,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      contents: [
        {
          uri: resourceUri,
          mimeType: 'application/json',
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
    };
  }
}

// ─── sync://history/{client_name} ───────────────────────────────────

/**
 * Recent sync history for a specific client.
 * The client_name is extracted from the URI path.
 */
export async function handleHistoryResource(
  uri: URL,
  ctx: AccountContext
): Promise<ResourceResult> {
  const d1 = getD1Executor(ctx);

  const clientName = decodeURIComponent(uri.pathname.replace(/^\/+/, ''));
  const resourceUri = `sync://history/${encodeURIComponent(clientName)}`;

  try {
    await ensureInitialized(d1);

    if (!clientName) {
      return {
        contents: [
          {
            uri: resourceUri,
            mimeType: 'application/json',
            text: JSON.stringify({ error: 'Client name is required in the URI path' }),
          },
        ],
      };
    }

    const mapping = await getClientMappingByName(d1, clientName);
    if (!mapping) {
      return {
        contents: [
          {
            uri: resourceUri,
            mimeType: 'application/json',
            text: JSON.stringify({ error: `Client '${clientName}' not found` }),
          },
        ],
      };
    }

    const logs = await getRecentSyncLogs(d1, mapping.id, 10);

    return {
      contents: [
        {
          uri: resourceUri,
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              client_name: clientName,
              recent_syncs: logs.map((log) => ({
                started_at: log.started_at,
                completed_at: log.completed_at,
                direction: log.direction,
                pages_pushed: log.pages_pushed,
                pages_pulled: log.pages_pulled,
                pages_created: log.pages_created,
                conflicts: log.conflicts_count,
                errors: log.errors_count,
                duration_ms: log.duration_ms,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      contents: [
        {
          uri: resourceUri,
          mimeType: 'application/json',
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
    };
  }
}
