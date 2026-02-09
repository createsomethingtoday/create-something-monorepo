/**
 * Notion Sync MCP Server — ScopedMcpServer setup with all three primitives.
 *
 * Three-Tier Framework:
 *   - Database tier (Resources):  sync://clients, sync://status, sync://client/{name}, sync://history/{name}
 *   - Automation tier (Tools):    5 action tools (register, update, sync, remove, resolve)
 *   - Judgment tier (Prompts):    sync_strategy, conflict_resolution, client_onboarding
 *   - Insight (cross-cutting):    Emitted automatically by ScopedMcpServer
 *   - Artifacts:                  ClientMapping, SyncResult, DryRunResult, PageIdMapping
 *
 * Agent UX:
 *   - No response_format — all tools return structured JSON
 *   - No read-only tools — use Resources for queries (correct control model)
 *   - Auto-initialization — no separate init tool needed
 *   - dry_run on sync — preview before executing
 *   - update_client — modify config without re-registering
 */

import { createScopedServer } from '@create-something/mcp-core';
import type { ScopedMcpServer } from '@create-something/mcp-core';
import type { AuthProvider, InsightEmitter } from '@create-something/mcp-core';
import { z } from 'zod';

// Schemas
import {
  RegisterClientSchema,
  UpdateClientSchema,
  SyncIssuesSchema,
  RemoveClientSchema,
  ResolveConflictsSchema,
} from './schemas/tools.js';

import type {
  RegisterClientInput,
  UpdateClientInput,
  SyncIssuesInput,
  RemoveClientInput,
  ResolveConflictsInput,
} from './schemas/tools.js';

// Tool handlers
import {
  handleRegisterClient,
  handleUpdateClient,
  handleSyncIssues,
  handleRemoveClient,
  handleResolveConflicts,
} from './tools/handlers.js';

// Resource handlers
import {
  handleClientsResource,
  handleStatusResource,
  handleClientResource,
  handleHistoryResource,
} from './resources/handlers.js';

// Prompt handlers
import {
  handleSyncStrategy,
  handleConflictResolution,
  handleClientOnboarding,
} from './prompts/handlers.js';

// =============================================================================
// Server Factory
// =============================================================================

export interface NotionSyncServerConfig {
  authProvider: AuthProvider;
  insight?: InsightEmitter;
}

/**
 * Create the Notion Sync MCP server with all three primitives registered.
 *
 * 5 tools + 4 resources + 3 prompts = 12 primitives
 * (down from 8 + 3 + 3 = 14, with reduced agent decision space)
 */
export function createNotionSyncServer(
  config: NotionSyncServerConfig
): ScopedMcpServer {
  const server = createScopedServer({
    name: 'notion-sync-mcp',
    version: '0.2.0',
    authProvider: config.authProvider,
    insight: config.insight,
  });

  // ─── Tools (Automation Tier) ────────────────────────────────────────
  // Only action tools — read-only queries are Resources

  server.tool(
    'notion_sync_register_client',
    `Register a client for two-way Notion database sync. Maps a client to their database and configures which properties to sync and how conflicts are resolved.

Both Notion integration tokens must have access to their respective databases. The server validates database access before registering.

Returns structured JSON with the registration confirmation.`,
    RegisterClientSchema.shape,
    async (params, ctx) => handleRegisterClient(params as unknown as RegisterClientInput, ctx),
  );

  server.tool(
    'notion_sync_update_client',
    `Update sync configuration for an existing client without re-registering. Change which properties are synced and/or the conflict resolution strategy.

At least one of sync_properties or conflict_strategy must be provided.

Returns the updated client configuration.`,
    UpdateClientSchema.shape,
    async (params, ctx) => handleUpdateClient(params as unknown as UpdateClientInput, ctx),
  );

  server.tool(
    'notion_sync_issues',
    `Sync issues between the master database and a client's database.

Directions:
  - push: Master → Client
  - pull: Client → Master
  - bidirectional: Both directions with conflict detection (default)

Set dry_run: true to preview what would happen without making changes. The preview shows pages that would be pushed, pulled, created, and conflicts detected.

Returns structured JSON with sync results or dry-run preview.`,
    SyncIssuesSchema.shape,
    async (params, ctx) => handleSyncIssues(params as unknown as SyncIssuesInput, ctx),
  );

  server.tool(
    'notion_sync_remove_client',
    `Remove a client registration and all associated sync data (page mappings, sync logs). Does NOT delete pages from either Notion database.

Returns confirmation of what was removed.`,
    RemoveClientSchema.shape,
    async (params, ctx) => handleRemoveClient(params as unknown as RemoveClientInput, ctx),
  );

  server.tool(
    'notion_sync_resolve_conflicts',
    `Resolve all pending conflicts for a client by applying a resolution strategy.

Conflicts occur when both master and client pages were edited since the last sync. Choose master_wins or client_wins to resolve all pending conflicts at once.

Returns the number of conflicts resolved and the sync result.`,
    ResolveConflictsSchema.shape,
    async (params, ctx) => handleResolveConflicts(params as unknown as ResolveConflictsInput, ctx),
  );

  // ─── Resources (Database Tier) ──────────────────────────────────────
  // Read-only state queries — application-controlled, not model-controlled

  server.resource(
    'Registered Clients',
    'sync://clients',
    {
      description: 'All registered clients with their sync configurations (tokens masked).',
      mimeType: 'application/json',
    },
    handleClientsResource,
  );

  server.resource(
    'Global Sync Status',
    'sync://status',
    {
      description: 'Global sync statistics: total clients, page mappings, pending syncs, conflicts.',
      mimeType: 'application/json',
    },
    handleStatusResource,
  );

  server.resource(
    'Client Detail',
    'sync://client/{client_name}',
    {
      description: 'Per-client state: configuration, page mapping status counts, and last sync info.',
      mimeType: 'application/json',
    },
    handleClientResource,
  );

  server.resource(
    'Client Sync History',
    'sync://history/{client_name}',
    {
      description: 'Recent sync history for a specific client (last 10 operations).',
      mimeType: 'application/json',
    },
    handleHistoryResource,
  );

  // ─── Prompts (Judgment Tier) ────────────────────────────────────────

  server.prompt(
    'sync_strategy',
    'Choose the right sync direction and timing based on current state. Optionally provide a client_name for context-aware guidance.',
    {
      client_name: z.string().optional().describe('Client name for context-aware strategy guidance'),
    },
    handleSyncStrategy,
  );

  server.prompt(
    'conflict_resolution',
    'Reason about conflict resolution strategy. Surfaces current conflicts and guides the user toward a resolution.',
    {
      client_name: z.string().optional().describe('Client name to check for conflicts'),
    },
    handleConflictResolution,
  );

  server.prompt(
    'client_onboarding',
    'Step-by-step guide for registering a new client for Notion sync. Walks through all required information.',
    undefined,
    handleClientOnboarding,
  );

  return server;
}
