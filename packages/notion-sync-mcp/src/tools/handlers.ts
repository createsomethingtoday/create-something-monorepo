/**
 * MCP tool handler implementations for the Notion Sync server.
 *
 * Three-Tier Framework alignment:
 *   - Automation tier: These ARE the model-controlled actions
 *   - Consume Database tier: D1 service + Notion service
 *   - Artifacts: SyncResult, ClientMapping flow as typed boundary contracts
 *
 * Agent UX:
 *   - All tools return structured JSON (no response_format parameter)
 *   - Auto-initialization: ensureInitialized() called before every operation
 *   - Read-only queries removed (use Resources instead)
 *   - dry_run support on sync for preflight checks
 */

import type { AccountContext } from '@create-something/mcp-core';
import { jsonContent, errorContent } from '@create-something/mcp-core';
import type { ToolResult } from '@create-something/mcp-core';
import { getD1Config } from '../auth.js';
import {
  ensureInitialized,
  createClientMapping,
  getClientMappingByName,
  deleteClientMapping,
  updateClientMapping,
  listPageMappings,
  updatePageMappingStatus,
} from "../services/d1.js";
import { syncClient, dryRunSync } from "../services/sync-engine.js";
import { getDatabaseSchema } from "../services/notion.js";
import {
  SyncStatus,
  SyncDirection,
  ConflictStrategy,
} from "../constants.js";
import type {
  RegisterClientInput,
  UpdateClientInput,
  SyncIssuesInput,
  RemoveClientInput,
  ResolveConflictsInput,
} from "../schemas/tools.js";

function generateId(): string {
  return crypto.randomUUID();
}

// ─── Register Client ────────────────────────────────────────────────

export async function handleRegisterClient(
  params: RegisterClientInput,
  ctx: AccountContext
): Promise<ToolResult> {
  const d1 = getD1Config(ctx);

  try {
    await ensureInitialized(d1);

    // Check for existing registration
    const existing = await getClientMappingByName(d1, params.client_name);
    if (existing) {
      return errorContent(
        `Client '${params.client_name}' is already registered. Remove it first to re-register, or use notion_sync_update_client to modify settings.`
      );
    }

    // Validate database access by fetching schemas
    try {
      await getDatabaseSchema(
        params.notion_token_master,
        params.master_database_id
      );
    } catch {
      return errorContent(
        "Cannot access master database. Check the database ID and integration token have access."
      );
    }

    try {
      await getDatabaseSchema(
        params.notion_token_client,
        params.client_database_id
      );
    } catch {
      return errorContent(
        "Cannot access client database. Check the database ID and integration token have access."
      );
    }

    const mapping = await createClientMapping(d1, {
      id: generateId(),
      client_name: params.client_name,
      master_database_id: params.master_database_id,
      client_database_id: params.client_database_id,
      client_filter_property: params.client_filter_property,
      client_filter_value: params.client_filter_value,
      notion_token_master: params.notion_token_master,
      notion_token_client: params.notion_token_client,
      sync_properties: params.sync_properties,
      conflict_strategy: params.conflict_strategy,
    });

    return jsonContent({
      success: true,
      client_name: params.client_name,
      master_database_id: params.master_database_id,
      client_database_id: params.client_database_id,
      filter: {
        property: params.client_filter_property,
        value: params.client_filter_value,
      },
      sync_properties: params.sync_properties,
      conflict_strategy: params.conflict_strategy,
      next_step: "Run notion_sync_issues to perform the initial sync, or use dry_run: true to preview first.",
    });
  } catch (error) {
    return errorContent(
      `Error registering client: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// ─── Update Client ──────────────────────────────────────────────────

export async function handleUpdateClient(
  params: UpdateClientInput,
  ctx: AccountContext
): Promise<ToolResult> {
  const d1 = getD1Config(ctx);

  try {
    await ensureInitialized(d1);

    const existing = await getClientMappingByName(d1, params.client_name);
    if (!existing) {
      return errorContent(`Client '${params.client_name}' not found.`);
    }

    if (!params.sync_properties && !params.conflict_strategy) {
      return errorContent(
        "Nothing to update. Provide sync_properties and/or conflict_strategy."
      );
    }

    const updated = await updateClientMapping(d1, existing.id, {
      sync_properties: params.sync_properties,
      conflict_strategy: params.conflict_strategy,
    });

    if (!updated) {
      return errorContent("Update failed — client not found after update.");
    }

    const syncProps =
      typeof updated.sync_properties === "string"
        ? JSON.parse(updated.sync_properties)
        : updated.sync_properties;

    return jsonContent({
      success: true,
      client_name: updated.client_name,
      sync_properties: syncProps,
      conflict_strategy: updated.conflict_strategy,
      updated_at: updated.updated_at,
    });
  } catch (error) {
    return errorContent(
      `Error updating client: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// ─── Sync Issues ────────────────────────────────────────────────────

export async function handleSyncIssues(
  params: SyncIssuesInput,
  ctx: AccountContext
): Promise<ToolResult> {
  const d1 = getD1Config(ctx);

  try {
    await ensureInitialized(d1);

    const mapping = await getClientMappingByName(d1, params.client_name);
    if (!mapping) {
      return errorContent(
        `Client '${params.client_name}' not found. Read the sync://clients resource to see registered clients.`
      );
    }

    // Dry run — preview without changes
    if (params.dry_run) {
      const preview = await dryRunSync(d1, mapping, params.direction);
      return jsonContent(preview);
    }

    // Live sync
    const result = await syncClient(d1, mapping, params.direction);
    return jsonContent(result);
  } catch (error) {
    return errorContent(
      `Error during sync: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// ─── Remove Client ──────────────────────────────────────────────────

export async function handleRemoveClient(
  params: RemoveClientInput,
  ctx: AccountContext
): Promise<ToolResult> {
  const d1 = getD1Config(ctx);

  try {
    await ensureInitialized(d1);

    const mapping = await getClientMappingByName(d1, params.client_name);
    if (!mapping) {
      return errorContent(`Client '${params.client_name}' not found.`);
    }

    await deleteClientMapping(d1, mapping.id);

    return jsonContent({
      success: true,
      client_name: params.client_name,
      removed: {
        client_mapping: true,
        page_mappings: true,
        sync_logs: true,
      },
      note: "Client database pages are NOT deleted — only the sync configuration was removed.",
    });
  } catch (error) {
    return errorContent(
      `Error removing client: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// ─── Resolve Conflicts ──────────────────────────────────────────────

export async function handleResolveConflicts(
  params: ResolveConflictsInput,
  ctx: AccountContext
): Promise<ToolResult> {
  const d1 = getD1Config(ctx);

  try {
    await ensureInitialized(d1);

    const mapping = await getClientMappingByName(d1, params.client_name);
    if (!mapping) {
      return errorContent(`Client '${params.client_name}' not found.`);
    }

    const conflicts = await listPageMappings(d1, mapping.id, SyncStatus.CONFLICT);

    if (conflicts.length === 0) {
      return jsonContent({
        success: true,
        client_name: params.client_name,
        conflicts_resolved: 0,
        message: "No conflicts found.",
      });
    }

    // Re-sync with the chosen strategy override
    const overrideMapping = {
      ...mapping,
      conflict_strategy: params.resolution as ConflictStrategy,
    };

    const result = await syncClient(
      d1,
      overrideMapping,
      SyncDirection.BIDIRECTIONAL
    );

    // Mark resolved
    for (const c of conflicts) {
      await updatePageMappingStatus(
        d1,
        c.id,
        SyncStatus.SYNCED,
        new Date().toISOString()
      );
    }

    return jsonContent({
      success: true,
      client_name: params.client_name,
      resolution_strategy: params.resolution,
      conflicts_resolved: conflicts.length,
      sync_result: result,
    });
  } catch (error) {
    return errorContent(
      `Error resolving conflicts: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
