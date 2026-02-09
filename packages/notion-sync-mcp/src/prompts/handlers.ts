/**
 * MCP Prompt handlers — the Judgment tier (user-controlled).
 *
 * Three-Tier Framework alignment:
 *   - Judgment tier: Prompts shape how the agent reasons about sync decisions
 *   - Control model: User-controlled — the human selects which prompt to use
 *   - Policy as Artifact: These prompts encode operational guidance that flows
 *     through the system as data, not fixed scaffolding
 *
 * Three prompts map to three decision points:
 *   - sync_strategy:       "What direction should I sync?" (operational)
 *   - conflict_resolution: "How should I resolve these conflicts?" (policy)
 *   - client_onboarding:   "What info do I need to register a client?" (procedural)
 */

import type { AccountContext, PromptResult } from '@create-something/mcp-core';
import { getD1Config } from '../auth.js';
import {
  ensureInitialized,
  getClientMappingByName,
  listPageMappings,
  getSyncStats,
  getRecentSyncLogs,
  listClientMappings,
} from '../services/d1.js';
import { SyncStatus } from '../constants.js';

// ─── sync_strategy ──────────────────────────────────────────────────

/**
 * Guides the agent in choosing the right sync direction and timing.
 *
 * Accepts an optional client_name argument. When provided, includes
 * the client's current sync state to inform the decision.
 */
export async function handleSyncStrategy(
  params: Record<string, unknown>,
  ctx: AccountContext
): Promise<PromptResult> {
  const d1 = getD1Config(ctx);
  await ensureInitialized(d1);
  const clientName = params.client_name as string | undefined;

  const messages: PromptResult['messages'] = [];

  // System context
  let systemContent = `You are helping manage bidirectional Notion database synchronization.

The sync system supports three directions:
- **push** (master → client): Send master database changes to the client's database
- **pull** (client → master): Bring client changes back to the master database
- **bidirectional**: Both directions with conflict detection

When choosing a sync strategy, consider:
1. Has the client recently made changes? → Pull first or use bidirectional
2. Are there pending conflicts? → Resolve conflicts before syncing
3. Is this the initial sync? → Use bidirectional to establish baseline
4. Is this a one-way update? → Use push or pull for efficiency`;

  if (clientName) {
    try {
      const mapping = await getClientMappingByName(d1, clientName);
      if (mapping) {
        const pageMappings = await listPageMappings(d1, mapping.id);
        const recentLogs = await getRecentSyncLogs(d1, mapping.id, 3);

        const statusCounts = pageMappings.reduce(
          (acc, pm) => {
            acc[pm.sync_status] = (acc[pm.sync_status] ?? 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );

        systemContent += `

**Current state for ${clientName}:**
- Total page mappings: ${pageMappings.length}
- Status breakdown: ${Object.entries(statusCounts).map(([s, c]) => `${s}: ${c}`).join(', ') || 'none'}
- Conflict strategy: ${mapping.conflict_strategy}
- Synced properties: ${typeof mapping.sync_properties === 'string' ? mapping.sync_properties : JSON.stringify(mapping.sync_properties)}`;

        if (recentLogs.length > 0) {
          systemContent += `\n- Last sync: ${recentLogs[0].started_at} (${recentLogs[0].direction}, ${recentLogs[0].duration_ms}ms)`;
          if (recentLogs[0].errors_count > 0) {
            systemContent += ` — ${recentLogs[0].errors_count} errors`;
          }
        } else {
          systemContent += `\n- No sync history found — this may be a new registration`;
        }
      } else {
        systemContent += `\n\n**Note:** Client '${clientName}' not found. Available clients should be listed first.`;
      }
    } catch {
      systemContent += `\n\n**Note:** Could not fetch client state. D1 may not be initialized.`;
    }
  }

  messages.push({
    role: 'user',
    content: {
      type: 'text',
      text: systemContent,
    },
  });

  if (clientName) {
    messages.push({
      role: 'user',
      content: {
        type: 'text',
        text: `What sync direction should I use for ${clientName}? Consider the current state above and recommend the best approach.`,
      },
    });
  } else {
    messages.push({
      role: 'user',
      content: {
        type: 'text',
        text: 'Help me decide which client to sync and what direction to use. Ask me about the current situation if you need more context.',
      },
    });
  }

  return {
    description: clientName
      ? `Sync strategy analysis for ${clientName}`
      : 'Sync strategy selection guide',
    messages,
  };
}

// ─── conflict_resolution ────────────────────────────────────────────

/**
 * Guides the agent in reasoning about conflict resolution.
 *
 * Accepts a client_name argument and surfaces current conflicts
 * with context to help the user decide on a resolution strategy.
 */
export async function handleConflictResolution(
  params: Record<string, unknown>,
  ctx: AccountContext
): Promise<PromptResult> {
  const d1 = getD1Config(ctx);
  await ensureInitialized(d1);
  const clientName = params.client_name as string | undefined;

  const messages: PromptResult['messages'] = [];

  let systemContent = `You are helping resolve sync conflicts between a master Notion database and a client's database.

Conflicts occur when both the master and client pages have been edited since the last sync. The system detected property-level differences that need resolution.

Available resolution strategies:
- **master_wins**: The master database value overwrites the client value. Use when the master is the source of truth.
- **client_wins**: The client database value overwrites the master value. Use when the client made intentional changes that should propagate.

Important considerations:
- Resolving conflicts is destructive — one side's changes will be lost
- Consider which side has the more recent or authoritative changes
- If unsure, ask the user before proceeding
- After resolution, a fresh sync will apply the chosen values`;

  if (clientName) {
    try {
      const mapping = await getClientMappingByName(d1, clientName);
      if (mapping) {
        const conflicts = await listPageMappings(d1, mapping.id, SyncStatus.CONFLICT);

        if (conflicts.length > 0) {
          systemContent += `

**Conflicts for ${clientName}:**
- ${conflicts.length} page(s) with conflicts
- Default conflict strategy: ${mapping.conflict_strategy}
- Page IDs with conflicts:`;
          for (const c of conflicts.slice(0, 10)) {
            systemContent += `\n  - Master: \`${c.master_page_id}\` ↔ Client: \`${c.client_page_id}\` (last synced: ${c.last_synced_at})`;
          }
          if (conflicts.length > 10) {
            systemContent += `\n  - ... and ${conflicts.length - 10} more`;
          }
        } else {
          systemContent += `\n\n**No conflicts found for ${clientName}.** The databases are in sync.`;
        }
      } else {
        systemContent += `\n\n**Note:** Client '${clientName}' not found.`;
      }
    } catch {
      systemContent += `\n\n**Note:** Could not fetch conflict state.`;
    }
  }

  messages.push({
    role: 'user',
    content: {
      type: 'text',
      text: systemContent,
    },
  });

  messages.push({
    role: 'user',
    content: {
      type: 'text',
      text: clientName
        ? `How should I resolve the conflicts for ${clientName}? Should the master or client values win?`
        : 'Help me understand and resolve sync conflicts. Which client has conflicts that need attention?',
    },
  });

  return {
    description: clientName
      ? `Conflict resolution for ${clientName}`
      : 'Conflict resolution guide',
    messages,
  };
}

// ─── client_onboarding ──────────────────────────────────────────────

/**
 * Walks through the process of registering a new client for sync.
 *
 * This is a procedural prompt — it guides the agent through collecting
 * all required information step by step.
 */
export async function handleClientOnboarding(
  params: Record<string, unknown>,
  ctx: AccountContext
): Promise<PromptResult> {
  const d1 = getD1Config(ctx);
  await ensureInitialized(d1);

  const messages: PromptResult['messages'] = [];

  let systemContent = `You are helping set up a new client for two-way Notion database synchronization.

To register a client, you need to collect the following information:

1. **Client name** — A human-readable name (e.g., "Acme Corp")
2. **Master database ID** — The Notion database ID of the master Issues database
3. **Client database ID** — The Notion database ID of the client's Issues database
4. **Filter property** — Property name in the master DB used to filter (e.g., "Client")
5. **Filter value** — Value to match in the filter property (e.g., "Acme Corp")
6. **Master workspace token** — Notion integration token for the master workspace
7. **Client workspace token** — Notion integration token for the client workspace
8. **Properties to sync** — List of property names to sync (e.g., Title, Status, Priority)
9. **Conflict strategy** — How to handle conflicts: master_wins (default), client_wins, latest_wins, or manual

**Important notes:**
- Both Notion integrations must have access to their respective databases
- The filter property in the master DB is used to scope which issues belong to this client
- Tokens should be Notion internal integration tokens (start with "ntn_" or "secret_")
- Supported property types: title, rich_text, number, select, multi_select, date, checkbox, url, email, phone_number, status
- Relations, rollups, and formulas cannot be synced`;

  // Add context about existing clients
  try {
    const existingClients = await listClientMappings(d1);
    if (existingClients.length > 0) {
      systemContent += `

**Existing clients (${existingClients.length}):**`;
      for (const c of existingClients) {
        systemContent += `\n- ${c.client_name} (filter: ${c.client_filter_property} = "${c.client_filter_value}")`;
      }
      systemContent += `\n\nMake sure the new client name doesn't conflict with existing ones.`;
    }
  } catch {
    systemContent += `\n\n**Note:** Could not check existing clients. The D1 database will be auto-initialized on first use.`;
  }

  messages.push({
    role: 'user',
    content: {
      type: 'text',
      text: systemContent,
    },
  });

  messages.push({
    role: 'user',
    content: {
      type: 'text',
      text: "I'd like to set up a new client for Notion sync. Guide me through the process step by step.",
    },
  });

  return {
    description: 'Client onboarding — step-by-step registration guide',
    messages,
  };
}
