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
import { getD1Executor } from '../auth.js';
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
  InspectDatabasesInput,
  RegisterClientInput,
  UpdateClientInput,
  SyncIssuesInput,
  RemoveClientInput,
  ResolveConflictsInput,
} from "../schemas/tools.js";

function generateId(): string {
  return crypto.randomUUID();
}

// Syncable property types (must match notion.ts buildPropertyPayload)
const SYNCABLE_TYPES = new Set([
  'title', 'rich_text', 'number', 'select', 'multi_select',
  'date', 'checkbox', 'url', 'email', 'phone_number', 'status',
]);

// ─── Inspect Databases ──────────────────────────────────────────────

export async function handleInspectDatabases(
  params: InspectDatabasesInput,
  _ctx: AccountContext
): Promise<ToolResult> {
  try {
    // Fetch both schemas
    let masterSchema: Record<string, { type: string }>;
    try {
      masterSchema = await getDatabaseSchema(
        params.notion_token_master,
        params.master_database_id
      ) as unknown as Record<string, { type: string }>;
    } catch {
      return errorContent(
        "Cannot access master database. Check the database ID and that the integration is connected (Database > ••• > Connections)."
      );
    }

    let clientSchema: Record<string, { type: string }>;
    try {
      clientSchema = await getDatabaseSchema(
        params.notion_token_client,
        params.client_database_id
      ) as unknown as Record<string, { type: string }>;
    } catch {
      return errorContent(
        "Cannot access client database. Check the database ID and that the integration is connected (Database > ••• > Connections)."
      );
    }

    // Categorize properties
    const masterProps = Object.entries(masterSchema).map(([name, prop]) => ({
      name,
      type: prop.type,
      syncable: SYNCABLE_TYPES.has(prop.type),
    }));

    const clientProps = Object.entries(clientSchema).map(([name, prop]) => ({
      name,
      type: prop.type,
      syncable: SYNCABLE_TYPES.has(prop.type),
    }));

    // Find matching properties (same name, both syncable)
    const clientPropMap = new Map(clientProps.map((p) => [p.name, p]));
    const recommended: string[] = [];
    const matchingButUnsyncable: Array<{ name: string; masterType: string; clientType: string }> = [];
    const masterOnly: string[] = [];

    for (const mp of masterProps) {
      const cp = clientPropMap.get(mp.name);
      if (cp) {
        if (mp.syncable && cp.syncable) {
          recommended.push(mp.name);
        } else {
          matchingButUnsyncable.push({
            name: mp.name,
            masterType: mp.type,
            clientType: cp.type,
          });
        }
      } else if (mp.syncable) {
        masterOnly.push(mp.name);
      }
    }

    const clientOnly = clientProps
      .filter((cp) => !masterProps.some((mp) => mp.name === cp.name) && cp.syncable)
      .map((cp) => cp.name);

    // Detect likely filter properties (select/multi_select that could tag clients)
    const possibleFilterProps = masterProps
      .filter((p) => p.type === 'select' || p.type === 'multi_select')
      .map((p) => p.name);

    return jsonContent({
      master_database: {
        id: params.master_database_id,
        total_properties: masterProps.length,
        syncable_properties: masterProps.filter((p) => p.syncable).map((p) => ({ name: p.name, type: p.type })),
      },
      client_database: {
        id: params.client_database_id,
        total_properties: clientProps.length,
        syncable_properties: clientProps.filter((p) => p.syncable).map((p) => ({ name: p.name, type: p.type })),
      },
      recommended_sync_properties: recommended,
      possible_filter_properties: possibleFilterProps,
      notes: {
        master_only: masterOnly.length > 0
          ? `These properties exist in your database but not the client's: ${masterOnly.join(', ')}`
          : 'All syncable master properties have matches in the client database.',
        client_only: clientOnly.length > 0
          ? `These properties exist in the client's database but not yours: ${clientOnly.join(', ')}`
          : 'All syncable client properties have matches in your database.',
        unsyncable_matches: matchingButUnsyncable.length > 0
          ? `These properties match by name but have unsyncable types: ${matchingButUnsyncable.map((p) => `${p.name} (${p.masterType}/${p.clientType})`).join(', ')}`
          : null,
      },
      next_step: recommended.length > 0
        ? `I recommend syncing these ${recommended.length} properties: ${recommended.join(', ')}. Want to proceed with these, or add/remove any?`
        : 'No matching syncable properties found. The databases may need matching property names to sync.',
    });
  } catch (error) {
    return errorContent(
      `Error inspecting databases: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// ─── Register Client ────────────────────────────────────────────────

export async function handleRegisterClient(
  params: RegisterClientInput,
  ctx: AccountContext
): Promise<ToolResult> {
  const d1 = getD1Executor(ctx);

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
  const d1 = getD1Executor(ctx);

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
  const d1 = getD1Executor(ctx);

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
  const d1 = getD1Executor(ctx);

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
  const d1 = getD1Executor(ctx);

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
