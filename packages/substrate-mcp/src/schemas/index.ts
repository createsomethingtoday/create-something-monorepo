/**
 * Zod validation schemas for Substrate MCP tool inputs.
 *
 * Three-Tier Framework: Artifact contracts at the Automation tier boundary.
 */

import { z } from 'zod';
import {
  ColumnType, FilterOperator, SortDirection,
  MAX_COLUMNS_PER_TABLE, MAX_RECORDS_PER_QUERY, MAX_BULK_OPERATIONS,
  MAX_TABLE_NAME_LENGTH, MAX_COLUMN_NAME_LENGTH, MAX_WORKSPACE_NAME_LENGTH,
  MAX_FILE_SIZE_BYTES,
} from '../constants.js';

// ─── Column Definition ───────────────────────────────────────────────

export const ColumnDefinitionSchema = z.object({
  name: z.string().min(1).max(MAX_COLUMN_NAME_LENGTH).describe('Column name'),
  type: z.nativeEnum(ColumnType).describe('Data type'),
  required: z.boolean().default(false).describe('Whether required when creating records'),
  description: z.string().optional().describe('What this column stores'),
  default_value: z.unknown().optional().describe('Default value'),
  options: z.array(z.string()).optional().describe('For select/multi_select — allowed values'),
  relation_table_id: z.string().optional().describe('For relation — target table ID'),
});

// ─── Workspace ───────────────────────────────────────────────────────

export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(MAX_WORKSPACE_NAME_LENGTH).describe('Workspace name (unique)'),
  description: z.string().default('').describe('What this workspace is for'),
});

export const UpdateWorkspaceSchema = z.object({
  workspace_id: z.string().min(1).describe('Workspace ID'),
  name: z.string().min(1).max(MAX_WORKSPACE_NAME_LENGTH).optional().describe('New name'),
  description: z.string().optional().describe('New description'),
});

export const DeleteWorkspaceSchema = z.object({
  workspace_id: z.string().min(1).describe('Workspace ID — deletes ALL contents'),
});

// ─── Table ───────────────────────────────────────────────────────────

export const DefineTableSchema = z.object({
  workspace_id: z.string().min(1).describe('Workspace ID'),
  name: z.string().min(1).max(MAX_TABLE_NAME_LENGTH).describe('Table name (unique in workspace)'),
  description: z.string().default('').describe('What this table stores'),
  columns: z.array(ColumnDefinitionSchema).max(MAX_COLUMNS_PER_TABLE).describe('Column definitions'),
});

export const UpdateTableSchema = z.object({
  table_id: z.string().min(1).describe('Table ID'),
  name: z.string().min(1).max(MAX_TABLE_NAME_LENGTH).optional().describe('New name'),
  description: z.string().optional().describe('New description'),
  columns: z.array(ColumnDefinitionSchema).max(MAX_COLUMNS_PER_TABLE).optional()
    .describe('Full column list (replaces all)'),
});

export const DeleteTableSchema = z.object({
  table_id: z.string().min(1).describe('Table ID — deletes ALL records and relations'),
});

// ─── Record ──────────────────────────────────────────────────────────

export const CreateRecordSchema = z.object({
  table_id: z.string().min(1).describe('Table ID'),
  data: z.record(z.unknown()).describe('Key-value pairs matching table columns'),
});

export const UpdateRecordSchema = z.object({
  record_id: z.string().min(1).describe('Record ID'),
  data: z.record(z.unknown()).describe('Fields to update (merged with existing)'),
});

export const DeleteRecordSchema = z.object({
  record_id: z.string().min(1).describe('Record ID'),
});

// ─── Query ───────────────────────────────────────────────────────────

export const FilterSchema = z.object({
  column: z.string().min(1).describe('Column name'),
  operator: z.nativeEnum(FilterOperator).describe('Operator'),
  value: z.unknown().describe('Compare value'),
});

export const SortSchema = z.object({
  column: z.string().min(1).describe('Column name'),
  direction: z.nativeEnum(SortDirection).default(SortDirection.ASC).describe('asc or desc'),
});

export const QueryRecordsSchema = z.object({
  table_id: z.string().min(1).describe('Table ID'),
  filters: z.array(FilterSchema).optional().describe('Filter conditions (AND logic)'),
  sorts: z.array(SortSchema).optional().describe('Sort order'),
  limit: z.number().int().min(1).max(MAX_RECORDS_PER_QUERY).default(25).describe('Max results'),
  offset: z.number().int().min(0).default(0).describe('Skip count (pagination)'),
  columns: z.array(z.string()).optional().describe('Column projection'),
});

export const SearchRecordsSchema = z.object({
  table_id: z.string().min(1).describe('Table ID'),
  query: z.string().min(1).describe('Search text'),
  limit: z.number().int().min(1).max(MAX_RECORDS_PER_QUERY).default(25).describe('Max results'),
});

// ─── Relation ────────────────────────────────────────────────────────

export const CreateRelationSchema = z.object({
  source_table_id: z.string().min(1).describe('Source table ID'),
  source_record_id: z.string().min(1).describe('Source record ID'),
  target_table_id: z.string().min(1).describe('Target table ID'),
  target_record_id: z.string().min(1).describe('Target record ID'),
  relation_name: z.string().default('').describe('Relationship name (e.g. "assigned_to")'),
});

export const DeleteRelationSchema = z.object({
  relation_id: z.string().min(1).describe('Relation ID'),
});

// ─── Bulk ────────────────────────────────────────────────────────────

export const BulkCreateRecordsSchema = z.object({
  table_id: z.string().min(1).describe('Table ID'),
  records: z.array(z.record(z.unknown())).min(1).max(MAX_BULK_OPERATIONS)
    .describe(`Array of record data (max ${MAX_BULK_OPERATIONS})`),
});

export const BulkDeleteRecordsSchema = z.object({
  record_ids: z.array(z.string()).min(1).max(MAX_BULK_OPERATIONS)
    .describe(`Record IDs to delete (max ${MAX_BULK_OPERATIONS})`),
});

// ─── File Operations ─────────────────────────────────────────────────

export const UploadFileSchema = z.object({
  workspace_id: z.string().min(1).describe('Workspace to upload into'),
  filename: z.string().min(1).describe('Original filename (e.g. "report.pdf")'),
  content_type: z.string().min(1).describe('MIME type (e.g. "application/pdf", "image/png")'),
  content_base64: z.string().min(1).describe('File content as base64-encoded string'),
  record_id: z.string().optional().describe('Optional: attach file to a specific record'),
  description: z.string().default('').describe('Optional description of the file'),
});

export const DownloadFileSchema = z.object({
  file_id: z.string().min(1).describe('File ID to download'),
});

export const DeleteFileSchema = z.object({
  file_id: z.string().min(1).describe('File ID to delete (removes from both D1 and R2)'),
});

export const ListFilesSchema = z.object({
  workspace_id: z.string().min(1).describe('Workspace ID'),
  record_id: z.string().optional().describe('Optional: filter to files attached to a specific record'),
});

// ─── Type Exports ────────────────────────────────────────────────────

export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceSchema>;
export type DeleteWorkspaceInput = z.infer<typeof DeleteWorkspaceSchema>;
export type DefineTableInput = z.infer<typeof DefineTableSchema>;
export type UpdateTableInput = z.infer<typeof UpdateTableSchema>;
export type DeleteTableInput = z.infer<typeof DeleteTableSchema>;
export type CreateRecordInput = z.infer<typeof CreateRecordSchema>;
export type UpdateRecordInput = z.infer<typeof UpdateRecordSchema>;
export type DeleteRecordInput = z.infer<typeof DeleteRecordSchema>;
export type QueryRecordsInput = z.infer<typeof QueryRecordsSchema>;
export type SearchRecordsInput = z.infer<typeof SearchRecordsSchema>;
export type CreateRelationInput = z.infer<typeof CreateRelationSchema>;
export type DeleteRelationInput = z.infer<typeof DeleteRelationSchema>;
export type BulkCreateRecordsInput = z.infer<typeof BulkCreateRecordsSchema>;
export type BulkDeleteRecordsInput = z.infer<typeof BulkDeleteRecordsSchema>;
export type UploadFileInput = z.infer<typeof UploadFileSchema>;
export type DownloadFileInput = z.infer<typeof DownloadFileSchema>;
export type DeleteFileInput = z.infer<typeof DeleteFileSchema>;
export type ListFilesInput = z.infer<typeof ListFilesSchema>;
