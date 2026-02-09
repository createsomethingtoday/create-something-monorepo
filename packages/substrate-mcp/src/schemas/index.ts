/**
 * Zod schemas for Substrate MCP tool inputs.
 * Descriptions kept minimal — every character is a token.
 */

import { z } from 'zod';
import {
  ColumnType, FilterOperator, SortDirection, Role,
  MAX_COLUMNS_PER_TABLE, MAX_RECORDS_PER_QUERY, MAX_BULK_OPERATIONS,
  MAX_TABLE_NAME_LENGTH, MAX_COLUMN_NAME_LENGTH, MAX_WORKSPACE_NAME_LENGTH,
} from '../constants.js';

// ─── Column ──────────────────────────────────────────────────────────

export const ColumnDefinitionSchema = z.object({
  name: z.string().min(1).max(MAX_COLUMN_NAME_LENGTH),
  type: z.nativeEnum(ColumnType),
  required: z.boolean().default(false),
  description: z.string().optional(),
  default_value: z.unknown().optional(),
  options: z.array(z.string()).optional().describe('select/multi_select options'),
  relation_table_id: z.string().optional().describe('relation target table'),
  sensitive: z.boolean().optional().describe('if true, value is redacted in reads'),
});

// ─── Workspace ───────────────────────────────────────────────────────

export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(MAX_WORKSPACE_NAME_LENGTH),
  description: z.string().default(''),
});

export const UpdateWorkspaceSchema = z.object({
  workspace_id: z.string().min(1),
  name: z.string().min(1).max(MAX_WORKSPACE_NAME_LENGTH).optional(),
  description: z.string().optional(),
});

export const ArchiveWorkspaceSchema = z.object({
  workspace_id: z.string().min(1),
});

export const PurgeWorkspaceSchema = z.object({
  workspace_id: z.string().min(1),
  confirm: z.boolean().describe('must be true to hard-delete'),
});

// ─── Table ───────────────────────────────────────────────────────────

export const DefineTableSchema = z.object({
  workspace_id: z.string().min(1),
  name: z.string().min(1).max(MAX_TABLE_NAME_LENGTH),
  description: z.string().default(''),
  columns: z.array(ColumnDefinitionSchema).max(MAX_COLUMNS_PER_TABLE),
});

export const UpdateTableSchema = z.object({
  table_id: z.string().min(1),
  name: z.string().min(1).max(MAX_TABLE_NAME_LENGTH).optional(),
  description: z.string().optional(),
  columns: z.array(ColumnDefinitionSchema).max(MAX_COLUMNS_PER_TABLE).optional(),
});

export const ArchiveTableSchema = z.object({
  table_id: z.string().min(1),
});

// ─── Record ──────────────────────────────────────────────────────────

export const UpdateRecordSchema = z.object({
  record_id: z.string().min(1),
  data: z.record(z.unknown()).describe('fields to merge'),
});

export const ArchiveRecordSchema = z.object({
  record_id: z.string().min(1),
});

export const RestoreRecordSchema = z.object({
  record_id: z.string().min(1),
});

// ─── Query ───────────────────────────────────────────────────────────

export const FilterSchema = z.object({
  column: z.string().min(1),
  operator: z.nativeEnum(FilterOperator),
  value: z.unknown(),
});

export const SortSchema = z.object({
  column: z.string().min(1),
  direction: z.nativeEnum(SortDirection).default(SortDirection.ASC),
});

// ─── Relation ────────────────────────────────────────────────────────

export const CreateRelationSchema = z.object({
  source_table_id: z.string().min(1),
  source_record_id: z.string().min(1),
  target_table_id: z.string().min(1),
  target_record_id: z.string().min(1),
  relation_name: z.string().default(''),
});

export const DeleteRelationSchema = z.object({
  relation_id: z.string().min(1),
});

// ─── Bulk ────────────────────────────────────────────────────────────

export const BulkCreateRecordsSchema = z.object({
  table_id: z.string().min(1),
  records: z.array(z.record(z.unknown())).min(1).max(MAX_BULK_OPERATIONS),
});

export const BulkDeleteRecordsSchema = z.object({
  record_ids: z.array(z.string()).min(1).max(MAX_BULK_OPERATIONS),
});

// ─── File ────────────────────────────────────────────────────────────

export const UploadFileSchema = z.object({
  workspace_id: z.string().min(1),
  filename: z.string().min(1),
  content_type: z.string().min(1).describe('MIME type'),
  content_base64: z.string().min(1),
  record_id: z.string().optional().describe('attach to record'),
  description: z.string().default(''),
});

export const DownloadFileSchema = z.object({
  file_id: z.string().min(1),
});

export const DeleteFileSchema = z.object({
  file_id: z.string().min(1),
});

export const ListFilesSchema = z.object({
  workspace_id: z.string().min(1),
  record_id: z.string().optional().describe('filter by record'),
});

// ─── Sensitive ───────────────────────────────────────────────────────

export const ReadSensitiveSchema = z.object({
  record_id: z.string().min(1),
  column_name: z.string().min(1),
});

// ─── Token Management (admin only) ──────────────────────────────────

export const CreateTokenSchema = z.object({
  label: z.string().min(1).describe('human-readable label'),
  role: z.nativeEnum(Role).default(Role.EDITOR),
  workspace_ids: z.array(z.string()).default(['*']).describe('["*"]=all, or specific IDs'),
});

export const RevokeTokenSchema = z.object({
  token_id: z.string().min(1),
});

// ─── Types ───────────────────────────────────────────────────────────

export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceSchema>;
export type ArchiveWorkspaceInput = z.infer<typeof ArchiveWorkspaceSchema>;
export type PurgeWorkspaceInput = z.infer<typeof PurgeWorkspaceSchema>;
export type DefineTableInput = z.infer<typeof DefineTableSchema>;
export type UpdateTableInput = z.infer<typeof UpdateTableSchema>;
export type ArchiveTableInput = z.infer<typeof ArchiveTableSchema>;
export type UpdateRecordInput = z.infer<typeof UpdateRecordSchema>;
export type ArchiveRecordInput = z.infer<typeof ArchiveRecordSchema>;
export type RestoreRecordInput = z.infer<typeof RestoreRecordSchema>;
export type CreateRelationInput = z.infer<typeof CreateRelationSchema>;
export type DeleteRelationInput = z.infer<typeof DeleteRelationSchema>;
export type BulkCreateRecordsInput = z.infer<typeof BulkCreateRecordsSchema>;
export type BulkDeleteRecordsInput = z.infer<typeof BulkDeleteRecordsSchema>;
export type UploadFileInput = z.infer<typeof UploadFileSchema>;
export type DownloadFileInput = z.infer<typeof DownloadFileSchema>;
export type DeleteFileInput = z.infer<typeof DeleteFileSchema>;
export type ListFilesInput = z.infer<typeof ListFilesSchema>;
export type ReadSensitiveInput = z.infer<typeof ReadSensitiveSchema>;
export type CreateTokenInput = z.infer<typeof CreateTokenSchema>;
export type RevokeTokenInput = z.infer<typeof RevokeTokenSchema>;
