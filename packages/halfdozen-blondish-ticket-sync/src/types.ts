export interface Env {
  SYNC_API_KEY?: string;
  BLONDISH_NOTION_API_KEY?: string;
  HALFDOZEN_NOTION_API_KEY?: string;
  NOTION_WEBHOOK_VERIFICATION_TOKEN?: string;
  WEBHOOK_STATE?: KVNamespace;
  BLONDISH_SUPPORT_TICKETS_DATA_SOURCE_ID?: string;
  BLONDISH_SUPPORT_TICKETS_DATA_SOURCE_TITLE?: string;
  HALFDOZEN_TICKETS_DATABASE_ID?: string;
  HALFDOZEN_TICKETS_DATA_SOURCE_ID?: string;
  HALFDOZEN_TICKETS_DATA_SOURCE_TITLE?: string;
  BLONDISH_OS_STATUS_PROPERTY?: string;
  FORWARD_SYNC_ON_SCHEDULE?: string;
}

export type Workspace = 'blondish' | 'halfdozen';

export interface NotionPage {
  id: string;
  object?: string;
  url?: string;
  archived?: boolean;
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
export type DataSourceSchema = Record<string, { id?: string; type?: string; name?: string }>;

export interface SyncConfig {
  sourceDataSourceId: string;
  targetDataSourceId: string;
  sourceSchema: DataSourceSchema;
  targetSchema: DataSourceSchema;
  sourceStatusProperty: string;
}

export interface SyncError {
  scope: string;
  message: string;
  page_id?: string;
  ext_page_id?: string;
}

export interface SyncResult {
  ok: boolean;
  action: 'preflight' | 'source_to_hd' | 'hd_status_to_source' | 'webhook' | 'full_reconcile';
  trigger: 'manual' | 'webhook' | 'scheduled';
  source_data_source_id?: string;
  target_data_source_id?: string;
  created: number;
  updated: number;
  skipped: number;
  errors: SyncError[];
  details?: Record<string, unknown>;
}

export interface NotionWebhookPayload {
  verification_token?: string;
  id?: string;
  timestamp?: string;
  type?: string;
  entity?: { id?: string; type?: string };
  data?: {
    parent?: { id?: string; type?: string; data_source_id?: string };
    updated_blocks?: Array<{ id?: string; type?: string }>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
