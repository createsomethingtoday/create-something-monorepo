/**
 * Zod schemas for Substrate MCP tool inputs.
 * Descriptions kept minimal — every character is a token.
 */

import { z } from 'zod';
import {
  ColumnType, FilterOperator, SortDirection,
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

export const DeleteWorkspaceSchema = z.object({
  workspace_id: z.string().min(1),
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

export const DeleteTableSchema = z.object({
  table_id: z.string().min(1),
});

// ─── Record ──────────────────────────────────────────────────────────

export const CreateRecordSchema = z.object({
  table_id: z.string().min(1),
  data: z.record(z.unknown()).describe('column:value pairs'),
});

export const UpdateRecordSchema = z.object({
  record_id: z.string().min(1),
  data: z.record(z.unknown()).describe('fields to merge'),
});

export const DeleteRecordSchema = z.object({
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

export const QueryRecordsSchema = z.object({
  table_id: z.string().min(1),
  filters: z.array(FilterSchema).optional(),
  sorts: z.array(SortSchema).optional(),
  limit: z.number().int().min(1).max(MAX_RECORDS_PER_QUERY).default(25),
  offset: z.number().int().min(0).default(0),
  columns: z.array(z.string()).optional().describe('projection'),
});

export const SearchRecordsSchema = z.object({
  table_id: z.string().min(1),
  query: z.string().min(1),
  limit: z.number().int().min(1).max(MAX_RECORDS_PER_QUERY).default(25),
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

// ─── Types ───────────────────────────────────────────────────────────

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
