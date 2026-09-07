export interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  MCP_API_KEY?: string;
  CS_IDENTITY_ISSUER?: string;
  OAUTH_ALLOWED_EMAILS?: string;
  OAUTH_ALLOWED_DOMAINS?: string;
  CLIENT_NOTION_API_KEY?: string;
  BLONDISH_NOTION_API_KEY?: string;
  CLIENT_SUPPORT_TICKETS_DATA_SOURCE_ID?: string;
  HALFDOZEN_NOTION_API_KEY?: string;
  BLONDISH_SUPPORT_TICKETS_DATA_SOURCE_ID?: string;
  CLIENT_SUPPORT_TICKETS_DATA_SOURCE_TITLE?: string;
  BLONDISH_SUPPORT_TICKETS_DATA_SOURCE_TITLE?: string;
  HALFDOZEN_TICKETS_DATABASE_ID?: string;
  HALFDOZEN_TICKETS_DATA_SOURCE_ID?: string;
  HALFDOZEN_TICKETS_DATA_SOURCE_TITLE?: string;
  CLIENT_OS_STATUS_PROPERTY?: string;
  CLIENT_OS_STATUS_MAP?: string;
  BLONDISH_OS_STATUS_PROPERTY?: string;
  SYNC_SERVER_NAME?: string;
  SYNC_CLIENT_SLUG?: string;
  SYNC_TENANT_SLUG?: string;
  SYNC_CLIENT_DISPLAY_NAME?: string;
  SYNC_TOOL_PREFIX?: string;
  SYNC_OWNER_EMAIL?: string;
  SYNC_OWNER_LABEL?: string;
  SYNC_CLIENT_LABEL?: string;
  SYNC_SOURCE_LABEL?: string;
  LANGFUSE_PUBLIC_KEY?: string;
  LANGFUSE_SECRET_KEY?: string;
  LANGFUSE_BASE_URL?: string;
  LANGFUSE_HOST?: string;
  LANGFUSE_PROJECT_NAME?: string;
  LANGFUSE_ENABLED?: string;
}

export type Workspace = 'client' | 'blondish' | 'halfdozen';

export interface NotionPage {
  id: string;
  object?: string;
  url?: string;
  archived?: boolean;
  in_trash?: boolean;
  last_edited_time?: string;
  parent?: {
    type?: string;
    data_source_id?: string;
    database_id?: string;
    [key: string]: unknown;
  };
  properties?: Record<string, NotionProperty>;
}

export type NotionProperty = Record<string, unknown> & { type?: string };
export type DataSourceSchema = Record<string, Record<string, unknown> & { id?: string; type?: string; name?: string }>;

export interface NotionBlock {
  id: string;
  type?: string;
  archived?: boolean;
  in_trash?: boolean;
  [key: string]: unknown;
}

export interface SyncConfig {
  sourceDataSourceId: string;
  targetDataSourceId: string;
  sourceSchema: DataSourceSchema;
  targetSchema: DataSourceSchema;
  sourceStatusProperty: string;
  sourceStatusMap: Record<string, string | null>;
  targetExtPageIdProperty: string;
  clientDisplayName: string;
  sourceDataSourceTitle: string;
  targetDataSourceTitle: string;
  ownerEmail: string;
  ownerLabel: string;
  clientLabel: string;
  sourceLabel: string;
}

export interface SyncError {
  scope: string;
  message: string;
  page_id?: string;
  ext_page_id?: string;
}

export type SyncAction =
  | 'preflight'
  | 'audit'
  | 'source_to_hd_repair_plan'
  | 'source_to_hd'
  | 'repair_missing_hd_rows'
  | 'repair_external_url_drift'
  | 'hd_status_to_source'
  | 'full_reconcile';

export interface SyncResult {
  ok: boolean;
  action: SyncAction;
  source_data_source_id?: string;
  target_data_source_id?: string;
  created: number;
  updated: number;
  skipped: number;
  errors: SyncError[];
  details?: Record<string, unknown>;
}

export interface AuditResult extends SyncResult {
  action: 'audit';
  details: {
    source_rows_checked: number;
    target_rows_checked: number;
    matched_rows: number;
    missing_hd_rows: Array<{ source_page_id: string; ext_page_id: string; ticket: string }>;
    duplicate_hd_matches: Array<{ ext_page_id: string; target_page_ids: string[] }>;
    contract_field_drifts: Array<{ target_page_id: string; ext_page_id: string; fields: string[] }>;
    body_drifts: Array<{ target_page_id: string; ext_page_id: string }>;
    reverse_status_drifts: Array<{ target_page_id: string; source_page_id: string; ext_page_id: string; hd_status: string; source_status: string; mapped_status: string }>;
  };
}

export type SyncFile = {
  name: string;
  sourceType: 'file' | 'file_upload' | 'external';
  url?: string;
  fileUploadId?: string;
};

export type ToolResponse = { content: Array<{ type: 'text'; text: string }> };
