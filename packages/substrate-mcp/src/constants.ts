/**
 * Shared constants for Substrate — the agent-native data layer.
 *
 * Three-Tier Framework: These are Artifacts — typed boundary contracts
 * that flow between tiers. Enums define the vocabulary; constants define
 * the operational constraints.
 */

// Cloudflare API
export const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

// ─── Column Types ────────────────────────────────────────────────────

export enum ColumnType {
  TEXT = 'text',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  DATETIME = 'datetime',
  SELECT = 'select',
  MULTI_SELECT = 'multi_select',
  URL = 'url',
  EMAIL = 'email',
  JSON = 'json',
  RELATION = 'relation',
}

// ─── Sort / Filter ───────────────────────────────────────────────────

export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export enum FilterOperator {
  EQ = 'eq',
  NEQ = 'neq',
  GT = 'gt',
  GTE = 'gte',
  LT = 'lt',
  LTE = 'lte',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  IS_EMPTY = 'is_empty',
  IS_NOT_EMPTY = 'is_not_empty',
  IN = 'in',
}

// ─── Operational Limits ──────────────────────────────────────────────

export const MAX_COLUMNS_PER_TABLE = 64;
export const MAX_RECORDS_PER_QUERY = 100;
export const DEFAULT_QUERY_LIMIT = 25;
export const MAX_BULK_OPERATIONS = 50;
export const MAX_TABLE_NAME_LENGTH = 64;
export const MAX_COLUMN_NAME_LENGTH = 64;
export const MAX_WORKSPACE_NAME_LENGTH = 100;

// File limits
export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
export const MAX_BASE64_PAYLOAD = 134 * 1024 * 1024;  // ~100 MB decoded → ~134 MB base64
