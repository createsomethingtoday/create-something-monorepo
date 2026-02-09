/**
 * Type definitions for Substrate — the agent-native data layer.
 *
 * Three-Tier Framework: Artifacts — typed boundary contracts between tiers.
 */

import type { ColumnType, FilterOperator, SortDirection, Role } from './constants.js';

// ─── Workspace ───────────────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  description: string;
  archived_at: string | null;
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
  archived_at: string | null;
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
  /** If true, values are redacted in normal reads. Use read_sensitive to access. */
  sensitive?: boolean;
}

// ─── Record ──────────────────────────────────────────────────────────

export interface Record {
  id: string;
  table_id: string;
  data: { [column: string]: unknown };
  archived_at: string | null;
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

export interface FileMetadata {
  id: string;
  workspace_id: string;
  record_id: string | null;
  filename: string;
  content_type: string;
  size_bytes: number;
  storage_key: string;
  uploaded_by: string;
  description: string;
  created_at: string;
}

// ─── Access Tokens ───────────────────────────────────────────────────

export interface AccessToken {
  id: string;
  token_hash: string;
  label: string;
  role: Role;
  workspace_ids: string[];   // ["*"] = all workspaces
  created_at: string;
  expires_at: string | null;
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
  include_archived?: boolean;
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
  action: 'create' | 'update' | 'delete' | 'upload' | 'delete_file'
    | 'archive' | 'restore' | 'read_sensitive' | 'token_created' | 'token_revoked';
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
