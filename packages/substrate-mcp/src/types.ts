/**
 * Type definitions for Substrate — the agent-native data layer.
 *
 * Three-Tier Framework: These are Artifacts — typed boundary contracts
 * that flow between Database, Automation, and Judgment tiers.
 */

import type { ColumnType, FilterOperator, SortDirection } from './constants.js';

// ─── Workspace ───────────────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

// ─── Table Definition ────────────────────────────────────────────────

export interface TableDefinition {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  columns: ColumnDefinition[];
  created_at: string;
  updated_at: string;
}

export interface ColumnDefinition {
  name: string;
  type: ColumnType;
  required: boolean;
  description?: string;
  default_value?: unknown;
  options?: string[];
  relation_table_id?: string;
}

// ─── Record ──────────────────────────────────────────────────────────

export interface Record {
  id: string;
  table_id: string;
  data: { [column: string]: unknown };
  created_at: string;
  updated_at: string;
}

// ─── Relation ────────────────────────────────────────────────────────

export interface Relation {
  id: string;
  source_table_id: string;
  source_record_id: string;
  target_table_id: string;
  target_record_id: string;
  relation_name: string;
  created_at: string;
}

// ─── Files ───────────────────────────────────────────────────────────
// Files live in R2, metadata lives in D1. The agent manages both.

export interface FileMetadata {
  id: string;
  workspace_id: string;
  /** Optional association: attach a file to a specific record */
  record_id: string | null;
  /** Original filename */
  filename: string;
  /** MIME type */
  content_type: string;
  /** Size in bytes */
  size_bytes: number;
  /** R2 object key */
  storage_key: string;
  /** Who uploaded it */
  uploaded_by: string;
  /** Optional description */
  description: string;
  created_at: string;
}

// ─── Query ───────────────────────────────────────────────────────────

export interface QueryFilter {
  column: string;
  operator: FilterOperator;
  value?: unknown;
}

export interface QuerySort {
  column: string;
  direction: SortDirection;
}

export interface QueryParams {
  table_id: string;
  filters?: QueryFilter[];
  sorts?: QuerySort[];
  limit?: number;
  offset?: number;
  columns?: string[];
}

export interface QueryResult {
  records: Record[];
  total_count: number;
  has_more: boolean;
  limit: number;
  offset: number;
}

// ─── Audit Log ───────────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  workspace_id: string;
  table_id: string;
  record_id: string | null;
  action: 'create' | 'update' | 'delete' | 'upload' | 'delete_file';
  actor: string;
  changes: unknown;
  timestamp: string;
}

// ─── Cloudflare D1 Types ─────────────────────────────────────────────

export interface D1QueryResult {
  success: boolean;
  results: globalThis.Record<string, unknown>[];
  meta: { changes: number; duration: number };
}

export interface D1Response {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result: D1QueryResult[];
}

// ─── Infrastructure Config ───────────────────────────────────────────

export interface D1Config {
  accountId: string;
  apiToken: string;
  databaseId: string;
}

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

export interface SubstrateConfig {
  d1: D1Config;
  r2: R2Config;
}

// ─── Stats ───────────────────────────────────────────────────────────

export interface WorkspaceStats {
  workspace_id: string;
  workspace_name: string;
  total_tables: number;
  total_records: number;
  total_relations: number;
  total_files: number;
  total_file_size_bytes: number;
  recent_changes: number;
}
