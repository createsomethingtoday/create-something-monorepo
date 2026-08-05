export interface Env {
  DB: D1Database;
  ENVIRONMENT: string;
  /** "shadow" logs intended Airtable writes without performing them; "live" performs them. */
  WRITE_MODE: string;
  AIRTABLE_BASE_ID: string;
  AIRTABLE_CMS_RECORDS_TABLE_ID: string;
  WEBFLOW_SITE_ID: string;
  WEBFLOW_TEMPLATES_COLLECTION_ID: string;
  SWEEP_WINDOW_HOURS: string;
  SWEEP_MAX_ITEMS?: string;
  AIRTABLE_API_KEY?: string;
  WEBFLOW_API_TOKEN?: string;
  CMS_READ_ONLY?: string;
  WEBFLOW_WEBHOOK_SECRET?: string;
  ADMIN_TOKEN?: string;
  SLACK_WEBHOOK_URL?: string;
}

/** A Webflow CMS item as returned by GET /v2/collections/:id/items (staged view). */
export interface WebflowItem {
  id: string;
  isArchived: boolean;
  isDraft: boolean;
  createdOn: string;
  lastUpdated: string;
  lastPublished: string | null;
  fieldData: Record<string, unknown>;
}

export interface WebflowWebhookPayload {
  triggerType: string;
  payload: {
    id: string;
    isArchived?: boolean;
    isDraft?: boolean;
    /** Collection ID — used to filter to the Templates collection. */
    cid?: string;
    collectionId?: string;
    fieldData?: Record<string, unknown>;
  };
}

/** The writable fields of an Airtable 🕸️🚰WF CMS Records row, keyed by field NAME. */
export interface CmsRecordFields {
  Name: string;
  Status: string;
  Slug: string;
  'MRP ID': string;
  'Sync Source': string;
  'Sync Record ID': string;
  'Webflow Record ID': string;
  'WF Created': string;
  'WF Last Updated': string;
  'Approval Date': string | null;
}

export interface AirtableRecord {
  id: string;
  createdTime?: string;
  fields: Record<string, unknown>;
}

export type FindingKind = 'missing_row' | 'field_drift' | 'malformed_unique_id' | 'orphan_row' | 'never_synced';

export interface Finding {
  kind: FindingKind;
  itemId?: string;
  airtableRecordId?: string;
  field?: string;
  webflowValue?: string;
  airtableValue?: string;
  healed?: boolean;
}
