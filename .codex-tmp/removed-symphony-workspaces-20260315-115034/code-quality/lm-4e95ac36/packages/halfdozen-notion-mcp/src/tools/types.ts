/**
 * Tool input types (inferred from Zod or used in handlers).
 */

export type Workspace = 'halfdozen' | 'client';

export interface NotionSearchInput {
  workspace: Workspace;
  query?: string;
  filter_type?: 'page' | 'data_source';
  page_size?: number;
}

export interface NotionListDatabasesInput {
  workspace: Workspace;
  page_size?: number;
  start_cursor?: string;
}

export interface NotionQueryDatabaseInput {
  workspace: Workspace;
  data_source_id: string;
  filter?: string;
  sort_property?: string;
  sort_direction?: 'ascending' | 'descending';
  page_size?: number;
  start_cursor?: string;
}

export interface NotionCreatePageInput {
  workspace: Workspace;
  data_source_id: string;
  properties: Record<string, unknown>;
  content?: Array<Record<string, unknown>>;
}

export interface NotionListBlockChildrenInput {
  workspace: Workspace;
  block_id: string;
  page_size?: number;
  start_cursor?: string;
}

export interface NotionUpdatePageInput {
  workspace: Workspace;
  page_id: string;
  properties: Record<string, unknown>;
}

export interface NotionAppendBlocksInput {
  workspace: Workspace;
  page_id: string;
  children: Array<Record<string, unknown>>;
}

export interface NotionBulkUpdateInput {
  workspace: Workspace;
  page_ids: string[];
  properties: Record<string, unknown>;
}

export interface NotionCreateDatabaseInput {
  workspace: Workspace;
  parent_page_id: string;
  title: string;
  properties: Record<string, unknown>;
  is_inline?: boolean;
}

export interface NotionUpdateDatabaseInput {
  workspace: Workspace;
  database_id: string;
  title?: string;
  description?: string;
  data_source_id?: string;
  properties?: Record<string, unknown>;
}
