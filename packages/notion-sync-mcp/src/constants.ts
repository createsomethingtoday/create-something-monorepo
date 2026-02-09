/**
 * Shared constants for the Notion Sync MCP server.
 *
 * Three-Tier Framework: These are Artifacts — typed boundary contracts
 * that flow between tiers. Enums define the vocabulary; constants define
 * the operational constraints.
 */

// Notion API
export const NOTION_API_VERSION = "2022-06-28";
export const NOTION_API_BASE = "https://api.notion.com/v1";

// Cloudflare D1 API
export const CF_API_BASE = "https://api.cloudflare.com/client/v4";

// Sync configuration
export const DEFAULT_SYNC_BATCH_SIZE = 50;
export const NOTION_RATE_LIMIT_MS = 334; // ~3 req/s
export const CHARACTER_LIMIT = 25000;

// Conflict resolution strategies
export enum ConflictStrategy {
  MASTER_WINS = "master_wins",
  CLIENT_WINS = "client_wins",
  LATEST_WINS = "latest_wins",
  MANUAL = "manual",
}

// Sync directions
export enum SyncDirection {
  PUSH = "push",       // master → client
  PULL = "pull",       // client → master
  BIDIRECTIONAL = "bidirectional",
}

// Sync status
export enum SyncStatus {
  SYNCED = "synced",
  PENDING_PUSH = "pending_push",
  PENDING_PULL = "pending_pull",
  CONFLICT = "conflict",
  ERROR = "error",
}

