/**
 * Zod validation schemas for MCP tool inputs.
 *
 * Three-Tier Framework: These schemas define the Artifact contracts
 * at the Automation tier boundary — typed payloads validated before
 * tool execution.
 *
 * Agent UX: No response_format parameter. Tools always return structured
 * JSON — the agent formats for human display when needed.
 */

import { z } from "zod";
import {
  ConflictStrategy,
  SyncDirection,
} from "../constants.js";

// ─── Inspect Databases ──────────────────────────────────────────────

export const InspectDatabasesSchema = z
  .object({
    master_database_id: z
      .string()
      .min(1)
      .describe("Notion database ID of the master (consultant's) Issues database"),
    notion_token_master: z
      .string()
      .min(1)
      .describe("Notion integration token for the master workspace"),
    client_database_id: z
      .string()
      .min(1)
      .describe("Notion database ID of the client's Issues database"),
    notion_token_client: z
      .string()
      .min(1)
      .describe("Notion integration token for the client workspace"),
  })
  .strict();

export type InspectDatabasesInput = z.infer<typeof InspectDatabasesSchema>;

// ─── Register Client ────────────────────────────────────────────────

export const RegisterClientSchema = z
  .object({
    client_name: z
      .string()
      .min(1)
      .max(100)
      .describe("Human-readable client name (e.g., 'Acme Corp')"),
    master_database_id: z
      .string()
      .min(1)
      .describe("Notion database ID of the master Issues database"),
    client_database_id: z
      .string()
      .min(1)
      .describe("Notion database ID of the client's Issues database"),
    client_filter_property: z
      .string()
      .min(1)
      .describe(
        "Property name in master DB used to filter issues for this client (e.g., 'Client')"
      ),
    client_filter_value: z
      .string()
      .min(1)
      .describe(
        "Value to match in the filter property (e.g., 'Acme Corp')"
      ),
    notion_token_master: z
      .string()
      .min(1)
      .describe("Notion integration token for the master workspace"),
    notion_token_client: z
      .string()
      .min(1)
      .describe("Notion integration token for the client workspace"),
    sync_properties: z
      .array(z.string())
      .min(1)
      .describe(
        "List of property names to sync between master and client (e.g., ['Title', 'Status', 'Priority', 'Description'])"
      ),
    conflict_strategy: z
      .nativeEnum(ConflictStrategy)
      .default(ConflictStrategy.MASTER_WINS)
      .describe(
        "How to resolve conflicts: master_wins, client_wins, latest_wins, or manual"
      ),
  })
  .strict();

export type RegisterClientInput = z.infer<typeof RegisterClientSchema>;

// ─── Update Client ──────────────────────────────────────────────────

export const UpdateClientSchema = z
  .object({
    client_name: z
      .string()
      .min(1)
      .describe("Name of the registered client to update"),
    sync_properties: z
      .array(z.string())
      .min(1)
      .optional()
      .describe(
        "New list of property names to sync (replaces existing). Omit to keep current."
      ),
    conflict_strategy: z
      .nativeEnum(ConflictStrategy)
      .optional()
      .describe(
        "New conflict strategy. Omit to keep current."
      ),
  })
  .strict();

export type UpdateClientInput = z.infer<typeof UpdateClientSchema>;

// ─── Sync Issues ────────────────────────────────────────────────────

export const SyncIssuesSchema = z
  .object({
    client_name: z
      .string()
      .min(1)
      .describe("Name of the registered client to sync"),
    direction: z
      .nativeEnum(SyncDirection)
      .default(SyncDirection.BIDIRECTIONAL)
      .describe(
        "Sync direction: push (master→client), pull (client→master), or bidirectional"
      ),
    dry_run: z
      .boolean()
      .default(false)
      .describe(
        "Preview what would happen without making changes. Returns counts of pages that would be pushed, pulled, created, and conflicts detected."
      ),
  })
  .strict();

export type SyncIssuesInput = z.infer<typeof SyncIssuesSchema>;

// ─── Remove Client ──────────────────────────────────────────────────

export const RemoveClientSchema = z
  .object({
    client_name: z
      .string()
      .min(1)
      .describe("Name of the client to remove"),
  })
  .strict();

export type RemoveClientInput = z.infer<typeof RemoveClientSchema>;

// ─── Resolve Conflicts ──────────────────────────────────────────────

export const ResolveConflictsSchema = z
  .object({
    client_name: z
      .string()
      .min(1)
      .describe("Name of the client with conflicts"),
    resolution: z
      .enum(["master_wins", "client_wins"])
      .describe(
        "How to resolve all pending conflicts for this client"
      ),
  })
  .strict();

export type ResolveConflictsInput = z.infer<typeof ResolveConflictsSchema>;
