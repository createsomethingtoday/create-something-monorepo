/**
 * Tool input types (inferred from Zod or used in handlers).
 */

export interface NotionSearchInput {
  query?: string;
  filter_type?: 'page' | 'data_source';
  page_size?: number;
}

export interface NotionListDatabasesInput {
  page_size?: number;
  start_cursor?: string;
}

export interface NotionQueryDatabaseInput {
  data_source_id: string;
  filter?: string;
  sort_property?: string;
  sort_direction?: 'ascending' | 'descending';
  page_size?: number;
  start_cursor?: string;
}

export interface NotionCreatePageInput {
  data_source_id: string;
  properties: Record<string, unknown>;
  content?: Array<Record<string, unknown>>;
}

export interface NotionListBlockChildrenInput {
  block_id: string;
  page_size?: number;
  start_cursor?: string;
}

export interface NotionUpdatePageInput {
  page_id: string;
  properties: Record<string, unknown>;
}

export interface NotionAppendBlocksInput {
  page_id: string;
  children: Array<Record<string, unknown>>;
}

export interface NotionBulkUpdateInput {
  page_ids: string[];
  properties: Record<string, unknown>;
}

export interface NotionCreateDatabaseInput {
  parent_page_id: string;
  title: string;
  properties: Record<string, unknown>;
  is_inline?: boolean;
}

export interface NotionUpdateDatabaseInput {
  database_id: string;
  title?: string;
  description?: string;
  data_source_id?: string;
  properties?: Record<string, unknown>;
}
