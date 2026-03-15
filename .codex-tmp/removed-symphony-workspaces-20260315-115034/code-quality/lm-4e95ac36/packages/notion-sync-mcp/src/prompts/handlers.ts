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
import { getD1Executor } from '../auth.js';
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
  const d1 = getD1Executor(ctx);
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
  const d1 = getD1Executor(ctx);
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
  const d1 = getD1Executor(ctx);
  await ensureInitialized(d1);

  const messages: PromptResult['messages'] = [];

  let systemContent = `You are helping a consultant set up two-way Notion issue tracking with one of their clients.

**Context**: The user is a consultant (or agency/freelancer) who works across multiple client Notion workspaces. They keep a central Issues database in their own workspace where they track all work across all clients. Each client has their own Issues database in their own workspace. This tool keeps them in sync — the consultant creates an issue tagged for a client, it appears in that client's database; the client updates a status, it flows back to the consultant's central view.

Walk them through setup step by step, asking for one piece of information at a time. Be conversational — they may not know their database IDs off the top of their head, so explain where to find things.

**Step 1 — Client name**
Ask: "Which client are we connecting? Give me their name as you'd refer to them (e.g., 'Acme Corp')."

**Step 2 — Your central database**
Ask for their master Issues database — the one in their own workspace where they track everything.
- Database ID: the 32-character string in the Notion URL (notion.so/{workspace}/**{database_id}**?v=...)
- Their Notion integration token for this workspace (starts with "ntn_")
- If this is their first client, they'll need to provide these. If they've already registered a client, their master database info is likely the same — confirm and reuse.

**Step 3 — Client tag**
Ask which property in their central database identifies which client an issue belongs to. Common patterns:
- A "Client" Select property with values like "Acme Corp", "Vibe Records", etc.
- A "Project" property that maps to client names
Ask for the property name and the value that matches this specific client.

**Step 4 — Client's database**
Ask for the database in the client's workspace.
- Database ID from their client's Notion workspace
- A Notion integration token that has access to the client's workspace. This could be:
  - The same integration if the consultant is a member of the client's workspace
  - A separate integration created in the client's workspace (the client would need to create it or add the consultant's integration via Database > ••• > Connections)

**Step 5 — Inspect databases (agent does the heavy lifting)**
Once you have both database IDs and tokens, call **notion_sync_inspect_databases** immediately. This reads both database schemas and returns:
- All properties in each database
- Which ones are syncable and match by name
- A recommended list of properties to sync
- Possible filter properties (for Step 3 if not already answered)

Present the recommendation to the user in plain language, e.g.: "I found 6 matching properties between your databases: Title, Status, Priority, Assignee, Due Date, and Description. Want to sync all of these, or skip any?"

Do NOT ask the user to type property names or JSON arrays. Show them the list and let them confirm or adjust.

**Step 6 — Conflict strategy**
Ask how they want conflicts handled (when both sides edit the same issue between syncs):
- **master_wins** (recommended) — their central database is the source of truth
- **client_wins** — the client's edits take precedence
- **manual** — conflicts are flagged for them to review

**Step 7 — Confirm and register**
Summarize everything clearly, then call notion_sync_register_client. After registration, immediately run notion_sync_issues with dry_run: true to show them what would sync. If the preview looks right, offer to run the real sync.

**Important notes:**
- Both integrations must be connected to their respective databases (Database > ••• > Connections)
- Supported property types: title, rich_text, number, select, multi_select, date, checkbox, url, email, phone_number, status
- Relations, rollups, and formulas cannot be synced
- Tokens are encrypted at rest — safe to provide directly
- After setup, sync runs automatically every 15 minutes — no manual action needed`;

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
