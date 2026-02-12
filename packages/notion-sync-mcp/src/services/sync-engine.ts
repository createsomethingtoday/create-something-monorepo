/**
 * Sync engine — orchestrates bidirectional sync between master and client databases.
 *
 * Three-Tier Framework alignment:
 *   - Automation tier: This IS the Automation tier — model-controlled execution
 *   - Consumes Database tier: D1 (sync state) + Notion (external data)
 *   - Artifacts: SyncResult, ConflictRecord, PageIdMapping flow between tiers
 *
 * Flow:
 * 1. PUSH (master → client): Query master DB for client's issues, compare with mappings,
 *    create/update pages in client DB.
 * 2. PULL (client → master): Query client DB for changes, compare with mappings,
 *    update master DB. Includes conflict detection even for pull-only direction.
 * 3. CONFLICT RESOLUTION: When both sides changed since last sync, apply strategy.
 */

import {
  queryClientPages,
  queryAllPages,
  getPage,
  createPage,
  updatePage,
  extractPropertyValue,
  buildPropertyPayload,
} from "./notion.js";
import {
  getPageMappingByMasterId,
  getPageMappingByClientId,
  upsertPageMapping,
  listPageMappings,
  createSyncLog,
} from "./d1.js";
import {
  ConflictStrategy,
  SyncStatus,
  SyncDirection,
} from "../constants.js";
import type {
  ClientMapping,
  SyncResult,
  DryRunResult,
  ConflictRecord,
  NotionPage,
  D1Executor,
} from "../types.js";

function generateId(): string {
  return crypto.randomUUID();
}

function nowISO(): string {
  return new Date().toISOString();
}

// ─── Main Sync Orchestrator ─────────────────────────────────────────

export async function syncClient(
  executor: D1Executor,
  mapping: ClientMapping,
  direction: SyncDirection = SyncDirection.BIDIRECTIONAL
): Promise<SyncResult> {
  const startTime = Date.now();
  const result: SyncResult = {
    client_name: mapping.client_name,
    direction,
    pages_pushed: 0,
    pages_pulled: 0,
    pages_created: 0,
    conflicts: [],
    errors: [],
    duration_ms: 0,
  };

  const syncProperties: string[] =
    typeof mapping.sync_properties === "string"
      ? JSON.parse(mapping.sync_properties)
      : mapping.sync_properties;

  try {
    // Phase 1: PUSH (master → client)
    if (
      direction === SyncDirection.PUSH ||
      direction === SyncDirection.BIDIRECTIONAL
    ) {
      await pushMasterToClient(executor, mapping, syncProperties, result);
    }

    // Phase 2: PULL (client → master)
    if (
      direction === SyncDirection.PULL ||
      direction === SyncDirection.BIDIRECTIONAL
    ) {
      await pullClientToMaster(executor, mapping, syncProperties, result, direction);
    }
  } catch (error) {
    result.errors.push({
      page_id: "global",
      direction,
      error_message:
        error instanceof Error ? error.message : String(error),
      timestamp: nowISO(),
    });
  }

  result.duration_ms = Date.now() - startTime;

  // Log the sync
  await createSyncLog(executor, {
    id: generateId(),
    client_mapping_id: mapping.id,
    direction,
    pages_pushed: result.pages_pushed,
    pages_pulled: result.pages_pulled,
    pages_created: result.pages_created,
    conflicts_count: result.conflicts.length,
    errors_count: result.errors.length,
    duration_ms: result.duration_ms,
    started_at: new Date(startTime).toISOString(),
  });

  return result;
}

// ─── Dry Run Preview ────────────────────────────────────────────────

/**
 * Preview what a sync would do without making any changes.
 * Queries both databases, compares with stored mappings, and returns
 * counts of what would be pushed, pulled, created, and conflicted.
 */
export async function dryRunSync(
  executor: D1Executor,
  mapping: ClientMapping,
  direction: SyncDirection = SyncDirection.BIDIRECTIONAL
): Promise<DryRunResult> {
  const startTime = Date.now();

  const syncProperties: string[] =
    typeof mapping.sync_properties === "string"
      ? JSON.parse(mapping.sync_properties)
      : mapping.sync_properties;

  let pagesToPush = 0;
  let pagesToPull = 0;
  let pagesToCreate = 0;
  const conflicts: ConflictRecord[] = [];

  // Query both databases
  const masterPages =
    direction === SyncDirection.PULL
      ? []
      : await queryClientPages(
          mapping.notion_token_master,
          mapping.master_database_id,
          mapping.client_filter_property,
          mapping.client_filter_value
        );

  const clientPages =
    direction === SyncDirection.PUSH
      ? []
      : await queryAllPages(
          mapping.notion_token_client,
          mapping.client_database_id
        );

  // Load existing mappings
  const existingMappings = await listPageMappings(executor, mapping.id);
  const byMasterId = new Map(existingMappings.map((m) => [m.master_page_id, m]));
  const byClientId = new Map(existingMappings.map((m) => [m.client_page_id, m]));

  // Preview PUSH (master → client)
  if (direction === SyncDirection.PUSH || direction === SyncDirection.BIDIRECTIONAL) {
    for (const masterPage of masterPages) {
      const existing = byMasterId.get(masterPage.id);
      if (!existing) {
        pagesToCreate++;
      } else {
        const masterChanged = masterPage.last_edited_time > existing.master_last_edited;
        if (masterChanged) {
          // Check for conflict
          const clientPage = clientPages.find((cp) => cp.id === existing.client_page_id);
          const clientChanged = clientPage
            ? clientPage.last_edited_time > existing.client_last_edited
            : false;

          if (clientChanged && clientPage) {
            const detected = detectPropertyConflicts(masterPage, clientPage, syncProperties);
            conflicts.push(...detected);
          } else {
            pagesToPush++;
          }
        }
      }
    }
  }

  // Preview PULL (client → master)
  if (direction === SyncDirection.PULL || direction === SyncDirection.BIDIRECTIONAL) {
    for (const clientPage of clientPages) {
      const existing = byClientId.get(clientPage.id);
      if (!existing) {
        pagesToCreate++;
      } else {
        const clientChanged = clientPage.last_edited_time > existing.client_last_edited;
        if (clientChanged) {
          pagesToPull++;
        }
      }
    }
  }

  return {
    client_name: mapping.client_name,
    direction,
    dry_run: true,
    preview: {
      pages_to_push: pagesToPush,
      pages_to_pull: pagesToPull,
      pages_to_create: pagesToCreate,
      conflicts_detected: conflicts.length,
      master_pages_total: masterPages.length,
      client_pages_total: clientPages.length,
      existing_mappings: existingMappings.length,
    },
    conflicts,
    duration_ms: Date.now() - startTime,
  };
}

// ─── PUSH: Master → Client ──────────────────────────────────────────

async function pushMasterToClient(
  executor: D1Executor,
  mapping: ClientMapping,
  syncProperties: string[],
  result: SyncResult
): Promise<void> {
  // Get all master pages filtered for this client
  const masterPages = await queryClientPages(
    mapping.notion_token_master,
    mapping.master_database_id,
    mapping.client_filter_property,
    mapping.client_filter_value
  );

  for (const masterPage of masterPages) {
    try {
      const existing = await getPageMappingByMasterId(
        executor,
        mapping.id,
        masterPage.id
      );

      if (!existing) {
        // New page — create in client DB
        const properties = buildSyncProperties(masterPage, syncProperties);
        const clientPage = await createPage(
          mapping.notion_token_client,
          mapping.client_database_id,
          properties
        );

        await upsertPageMapping(executor, {
          id: generateId(),
          client_mapping_id: mapping.id,
          master_page_id: masterPage.id,
          client_page_id: clientPage.id,
          master_last_edited: masterPage.last_edited_time,
          client_last_edited: clientPage.last_edited_time,
          sync_status: SyncStatus.SYNCED,
          last_synced_at: nowISO(),
        });

        result.pages_created++;
      } else {
        // Existing page — check if master changed since last sync
        const masterChanged =
          masterPage.last_edited_time > existing.master_last_edited;

        if (masterChanged) {
          // Check if client also changed (potential conflict)
          const clientPage = await getPage(
            mapping.notion_token_client,
            existing.client_page_id
          );
          const clientChanged =
            clientPage.last_edited_time > existing.client_last_edited;

          if (clientChanged) {
            // CONFLICT — both sides changed
            const conflicts = detectPropertyConflicts(
              masterPage,
              clientPage,
              syncProperties
            );

            if (conflicts.length > 0) {
              const resolved = resolveConflicts(
                conflicts,
                mapping.conflict_strategy as ConflictStrategy
              );
              result.conflicts.push(...resolved);

              // Apply resolution
              const updatedPage = await applyConflictResolution(
                mapping,
                masterPage,
                clientPage,
                resolved,
                syncProperties
              );

              // Update mapping with latest timestamps
              await upsertPageMapping(executor, {
                ...existing,
                master_last_edited: masterPage.last_edited_time,
                client_last_edited: updatedPage?.last_edited_time ?? clientPage.last_edited_time,
                sync_status: resolved.some((c) => !c.resolved)
                  ? SyncStatus.CONFLICT
                  : SyncStatus.SYNCED,
                last_synced_at: nowISO(),
              });
            }
          } else {
            // Only master changed — push to client
            const properties = buildSyncProperties(masterPage, syncProperties);
            const updatedClientPage = await updatePage(
              mapping.notion_token_client,
              existing.client_page_id,
              properties
            );
            result.pages_pushed++;

            // Use the response from updatePage — no extra API call needed
            await upsertPageMapping(executor, {
              ...existing,
              master_last_edited: masterPage.last_edited_time,
              client_last_edited: updatedClientPage.last_edited_time,
              sync_status: SyncStatus.SYNCED,
              last_synced_at: nowISO(),
            });
          }
        }
      }
    } catch (error) {
      result.errors.push({
        page_id: masterPage.id,
        direction: "push",
        error_message:
          error instanceof Error ? error.message : String(error),
        timestamp: nowISO(),
      });
    }
  }
}

// ─── PULL: Client → Master ──────────────────────────────────────────

async function pullClientToMaster(
  executor: D1Executor,
  mapping: ClientMapping,
  syncProperties: string[],
  result: SyncResult,
  direction: SyncDirection
): Promise<void> {
  // Get all client pages
  const clientPages = await queryAllPages(
    mapping.notion_token_client,
    mapping.client_database_id
  );

  for (const clientPage of clientPages) {
    try {
      const existing = await getPageMappingByClientId(
        executor,
        mapping.id,
        clientPage.id
      );

      if (!existing) {
        // Page exists in client but not in master mapping
        // This means the client created a new issue
        const properties = buildSyncProperties(clientPage, syncProperties);

        // Add the client filter property so it's properly tagged in master
        properties[mapping.client_filter_property] = {
          select: { name: mapping.client_filter_value },
        };

        const masterPage = await createPage(
          mapping.notion_token_master,
          mapping.master_database_id,
          properties
        );

        await upsertPageMapping(executor, {
          id: generateId(),
          client_mapping_id: mapping.id,
          master_page_id: masterPage.id,
          client_page_id: clientPage.id,
          master_last_edited: masterPage.last_edited_time,
          client_last_edited: clientPage.last_edited_time,
          sync_status: SyncStatus.SYNCED,
          last_synced_at: nowISO(),
        });

        result.pages_created++;
      } else {
        // Check if client changed since last sync
        const clientChanged =
          clientPage.last_edited_time > existing.client_last_edited;

        if (clientChanged) {
          // For pull-only direction, check if master also changed (conflict detection)
          if (direction === SyncDirection.PULL) {
            const masterPage = await getPage(
              mapping.notion_token_master,
              existing.master_page_id
            );
            const masterAlsoChanged =
              masterPage.last_edited_time > existing.master_last_edited;

            if (masterAlsoChanged) {
              // CONFLICT in pull-only mode
              const conflicts = detectPropertyConflicts(
                masterPage,
                clientPage,
                syncProperties
              );

              if (conflicts.length > 0) {
                const resolved = resolveConflicts(
                  conflicts,
                  mapping.conflict_strategy as ConflictStrategy
                );
                result.conflicts.push(...resolved);

                // Apply resolution
                const updatedPage = await applyConflictResolution(
                  mapping,
                  masterPage,
                  clientPage,
                  resolved,
                  syncProperties
                );

                await upsertPageMapping(executor, {
                  ...existing,
                  master_last_edited: updatedPage?.last_edited_time ?? masterPage.last_edited_time,
                  client_last_edited: clientPage.last_edited_time,
                  sync_status: resolved.some((c) => !c.resolved)
                    ? SyncStatus.CONFLICT
                    : SyncStatus.SYNCED,
                  last_synced_at: nowISO(),
                });
                continue;
              }
            }
          }

          // No conflict (or bidirectional already handled in push phase) — update master
          const properties = buildSyncProperties(clientPage, syncProperties);
          const updatedMasterPage = await updatePage(
            mapping.notion_token_master,
            existing.master_page_id,
            properties
          );
          result.pages_pulled++;

          // Use the response from updatePage — no extra API call needed
          await upsertPageMapping(executor, {
            ...existing,
            master_last_edited: updatedMasterPage.last_edited_time,
            client_last_edited: clientPage.last_edited_time,
            sync_status: SyncStatus.SYNCED,
            last_synced_at: nowISO(),
          });
        }
      }
    } catch (error) {
      result.errors.push({
        page_id: clientPage.id,
        direction: "pull",
        error_message:
          error instanceof Error ? error.message : String(error),
        timestamp: nowISO(),
      });
    }
  }
}

// ─── Conflict Detection & Resolution ────────────────────────────────

function detectPropertyConflicts(
  masterPage: NotionPage,
  clientPage: NotionPage,
  syncProperties: string[]
): ConflictRecord[] {
  const conflicts: ConflictRecord[] = [];

  for (const propName of syncProperties) {
    const masterProp = masterPage.properties[propName];
    const clientProp = clientPage.properties[propName];

    if (!masterProp || !clientProp) continue;

    const masterVal = extractPropertyValue(masterProp);
    const clientVal = extractPropertyValue(clientProp);

    if (JSON.stringify(masterVal) !== JSON.stringify(clientVal)) {
      conflicts.push({
        master_page_id: masterPage.id,
        client_page_id: clientPage.id,
        property_name: propName,
        master_value: masterVal,
        client_value: clientVal,
        resolved: false,
      });
    }
  }

  return conflicts;
}

function resolveConflicts(
  conflicts: ConflictRecord[],
  strategy: ConflictStrategy
): ConflictRecord[] {
  return conflicts.map((conflict) => {
    switch (strategy) {
      case ConflictStrategy.MASTER_WINS:
        return {
          ...conflict,
          resolved: true,
          resolution: `Master value kept: ${JSON.stringify(conflict.master_value)}`,
        };
      case ConflictStrategy.CLIENT_WINS:
        return {
          ...conflict,
          resolved: true,
          resolution: `Client value kept: ${JSON.stringify(conflict.client_value)}`,
        };
      case ConflictStrategy.LATEST_WINS:
        // We don't have per-property timestamps, so default to master for now
        return {
          ...conflict,
          resolved: true,
          resolution: `Latest value applied (defaulting to master)`,
        };
      case ConflictStrategy.MANUAL:
        return {
          ...conflict,
          resolved: false,
          resolution: "Manual resolution required",
        };
    }
  });
}

/**
 * Apply conflict resolution and return the updated page (if any update was made).
 * Returns the updated NotionPage so callers can use its last_edited_time
 * without an extra API call.
 */
async function applyConflictResolution(
  mapping: ClientMapping,
  masterPage: NotionPage,
  clientPage: NotionPage,
  conflicts: ConflictRecord[],
  syncProperties: string[]
): Promise<NotionPage | null> {
  const strategy = mapping.conflict_strategy as ConflictStrategy;

  if (strategy === ConflictStrategy.MANUAL) {
    // Don't auto-resolve — mark as conflict in DB
    return null;
  }

  // Check if any conflicts are unresolved
  if (conflicts.every((c) => !c.resolved)) return null;

  // For resolved conflicts, determine which direction to apply
  if (
    strategy === ConflictStrategy.MASTER_WINS ||
    strategy === ConflictStrategy.LATEST_WINS
  ) {
    // Push master values to client
    const properties = buildSyncProperties(masterPage, syncProperties);
    return await updatePage(
      mapping.notion_token_client,
      clientPage.id,
      properties
    );
  } else if (strategy === ConflictStrategy.CLIENT_WINS) {
    // Pull client values to master
    const properties = buildSyncProperties(clientPage, syncProperties);
    return await updatePage(
      mapping.notion_token_master,
      masterPage.id,
      properties
    );
  }

  return null;
}

// ─── Property Building ──────────────────────────────────────────────

function buildSyncProperties(
  sourcePage: NotionPage,
  syncProperties: string[]
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};

  for (const propName of syncProperties) {
    const prop = sourcePage.properties[propName];
    if (!prop) continue;

    const payload = buildPropertyPayload(prop);
    if (payload) {
      properties[propName] = payload;
    }
  }

  return properties;
}
