/**
 * Type definitions for the Notion Sync MCP server.
 *
 * Three-Tier Framework: These are Artifacts — typed boundary contracts
 * that flow between Database, Automation, and Judgment tiers.
 */

import { SyncStatus, ConflictStrategy } from "./constants.js";

// ─── Client Registration ────────────────────────────────────────────

export interface ClientMapping {
  id: string;
  client_name: string;
  master_database_id: string;
  client_database_id: string;
  client_filter_property: string;   // Property name in master DB used to filter (e.g., "Client")
  client_filter_value: string;      // Value to match (e.g., "Acme Corp")
  notion_token_master: string;      // Token for master workspace
  notion_token_client: string;      // Token for client workspace
  sync_properties: string[];        // Which properties to sync
  conflict_strategy: ConflictStrategy;
  created_at: string;
  updated_at: string;
}

// ─── Page ID Mapping ────────────────────────────────────────────────

export interface PageIdMapping {
  id: string;
  client_mapping_id: string;
  master_page_id: string;
  client_page_id: string;
  master_last_edited: string;
  client_last_edited: string;
  sync_status: SyncStatus;
  last_synced_at: string;
  created_at: string;
}

// ─── Sync State ─────────────────────────────────────────────────────

export interface SyncResult {
  client_name: string;
  direction: string;
  pages_pushed: number;
  pages_pulled: number;
  pages_created: number;
  conflicts: ConflictRecord[];
  errors: SyncError[];
  duration_ms: number;
}

export interface ConflictRecord {
  master_page_id: string;
  client_page_id: string;
  property_name: string;
  master_value: unknown;
  client_value: unknown;
  resolved: boolean;
  resolution?: string;
}

export interface SyncError {
  page_id: string;
  direction: string;
  error_message: string;
  timestamp: string;
}

// ─── Dry Run Preview ────────────────────────────────────────────────

export interface DryRunResult {
  client_name: string;
  direction: string;
  dry_run: true;
  preview: {
    pages_to_push: number;
    pages_to_pull: number;
    pages_to_create: number;
    conflicts_detected: number;
    master_pages_total: number;
    client_pages_total: number;
    existing_mappings: number;
  };
  conflicts: ConflictRecord[];
  duration_ms: number;
}

// ─── Notion API Types ───────────────────────────────────────────────

export interface NotionPage {
  id: string;
  last_edited_time: string;
  properties: Record<string, NotionPropertyValue>;
}

export interface NotionPropertyValue {
  id: string;
  type: string;
  [key: string]: unknown;
}

export interface NotionDatabaseQueryResponse {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
}

// ─── Cloudflare D1 Types ────────────────────────────────────────────

/**
 * Normalized query result returned by D1Executor.
 * Both REST API and D1 binding responses are normalized to this shape.
 */
export interface D1QueryResult {
  results: Record<string, unknown>[];
  meta: {
    changes: number;
  };
}

/**
 * Raw REST API response shape (Cloudflare D1 HTTP API).
 * Only used internally by RestD1Executor.
 */
export interface D1RestResponse {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result: Array<{
    success: boolean;
    results: Record<string, unknown>[];
    meta: { changes: number; duration: number };
  }>;
}

/**
 * Abstraction over D1 access — supports both REST API (stdio) and
 * D1 binding (Worker) access patterns.
 *
 * This is the key interface that enables the shared sync engine to
 * work in both stdio and Cloudflare Worker contexts.
 */
export interface D1Executor {
  execute(sql: string, params?: unknown[]): Promise<D1QueryResult>;
  /** Optional encryption key for Notion tokens at rest. When set, tokens are AES-GCM encrypted in D1. */
  encryptionKey?: string;
}

// ─── Sync Log ───────────────────────────────────────────────────────

export interface SyncLogEntry {
  id: string;
  client_mapping_id: string;
  direction: string;
  pages_pushed: number;
  pages_pulled: number;
  pages_created: number;
  conflicts_count: number;
  errors_count: number;
  duration_ms: number;
  started_at: string;
  completed_at: string;
}

// ─── D1 Configuration (for REST API access) ─────────────────────────

export interface D1Config {
  accountId: string;
  apiToken: string;
  databaseId: string;
}

// ─── Minimal D1 Binding Types ───────────────────────────────────────
// Defined here to avoid importing @cloudflare/workers-types into the
// src build. These match the subset of the D1 binding API we use.

export interface D1DatabaseBinding {
  prepare(sql: string): D1PreparedStatementBinding;
}

export interface D1PreparedStatementBinding {
  bind(...values: unknown[]): D1PreparedStatementBinding;
  all(): Promise<D1AllResult>;
}

export interface D1AllResult {
  results?: Record<string, unknown>[];
  meta?: { changes?: number };
}
