/** Row shapes returned by the read-only D1 SELECTs. */

export type CursorRow = {
  source_type: string;
  external_id: string;
  name: string;
  cursor_value: string | null;
  last_synced_at: string | null;
  synced_by: string | null;
};

export type CountRow = { key: string; n: number };

export type SyncFreshnessRow = {
  source_type: string;
  source_external_id: string;
  name: string;
  last_synced_at: string | null;
  /** Hours since last sync; null when the source has never synced. */
  hours_since_sync: number | null;
};

export type EventRow = {
  id: number;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  payload_json: string | null;
  created_at: string;
};

export type FindingRow = {
  id: number;
  title: string;
  category_id: string | null;
  category_title: string | null;
  status: string;
  priority: string | null;
  decision_needed: number;
  owner: string | null;
  app_name: string | null;
  updated_at: string;
};

export type FindingDetail = {
  id: number;
  title: string;
  summary: string | null;
  category_id: string | null;
  category_title: string | null;
  status: string;
  priority: string | null;
  decision_needed: number;
  decision_summary: string | null;
  owner: string | null;
  app_name: string | null;
  app_client_id: string | null;
  created_by: string;
  verified_by_reviewer: number;
  airtable_record_id: string | null;
  atlas_canvas_id: string | null;
  atlas_node_id: string | null;
  created_at: string;
  updated_at: string;
};

export type LinkRow = {
  id: number;
  kind: string;
  url: string;
  label: string | null;
};

export type ItemRow = {
  id: number;
  source_name: string | null;
  external_id: string;
  thread_ts: string | null;
  author: string | null;
  posted_at: string | null;
  text: string | null;
  permalink: string | null;
  triage_state: string;
};

export type NotificationRow = {
  id: number;
  target: string;
  body: string;
  status: string;
  queued_by: string | null;
  sent_at: string | null;
  created_at: string;
};

export type AppRow = {
  id: number;
  slug: string;
  name: string | null;
  visibility: string | null;
  review_status: string | null;
  client_id: string | null;
  app_id: string | null;
  workspace_id: string | null;
  mrp_id: string | null;
  mrp_update_supported: number | null;
  last_seen_at: string;
  last_changed_at: string | null;
};

export type AtlasCanvasRow = {
  canvas_id: string;
  title: string;
  client: string | null;
  workflow: string | null;
  owner: string | null;
  status: string;
  source_kind: string | null;
  source_id: string | null;
  updated_at: string;
  node_count: number;
  edge_count: number;
  open_runs: number;
  receipt_count: number;
};

export type AtlasReceiptRow = {
  id: number;
  canvas_id: string;
  node_id: string | null;
  receipt_type: string;
  summary: string;
  artifact_url: string | null;
  created_by: string;
  created_at: string;
};

export type SourceLedgerRow = {
  source_type: string;
  external_id: string;
  name: string;
  workspace: string | null;
  atlas_canvas_id: string | null;
  cursor_value: string | null;
  last_synced_at: string | null;
  synced_by: string | null;
  records: number;
  missing_substrate: number;
  ready_records: number;
  imported_records: number;
  error_records: number;
};

export type SourceTransferAuditRow = {
  source_type: string;
  external_id: string;
  name: string;
  records: number;
  mapped_records: number;
  identity_gaps: number;
  source_projected_records: number;
  bound_records: number;
  unbound_records: number;
  reviewed_unbound_records: number;
  outgoing_relations: number;
  incoming_relations: number;
  relation_isolated_records: number;
  reviewed_relation_isolated_records: number;
  imported_relations: number;
  transfer_state: string;
};

export type SourceReadinessSummary = {
  ready: boolean;
  verdict: 'ready' | 'not_ready';
  expected_sources: number;
  captured_sources: number;
  records: number;
  identity_gaps: number;
  source_projection_gaps: number;
  unbound_records: number;
  reviewed_unbound_records: number;
  unreviewed_unbound_records: number;
  relation_isolated_records: number;
  reviewed_relation_isolated_records: number;
  unreviewed_relation_islands: number;
  needs_source_update_reviews: number;
  open_source_update_actions: number;
  latest_import_warning_count: number;
  client_map_count: number;
  client_map_nodes: number;
  client_map_edges: number;
  client_rows: number;
  blockers: Array<{ kind: string; message: string }>;
  warnings: Array<{ kind: string; message: string }>;
};

export type SourceImportWarningRow = {
  source_name: string;
  source_external_id: string;
  run_id: string;
  status: string;
  error: string | null;
  updated_at: string;
};

export type SourceBlockerPlanSample = {
  blocker_kind: 'binding_gap' | 'relation_island' | 'source_update_action';
  source_record_id: number;
  external_id: string;
  title: string | null;
  canonical_type: string;
  review_kind: string | null;
  action_id: string | null;
  action_status: string | null;
  action_priority: string | null;
  has_binding_gap: boolean;
  has_relation_island: boolean;
};

export type SourceBlockerPlanGroup = {
  group_key: string;
  source_name: string;
  source_external_id: string;
  canonical_type: string;
  total: number;
  blocker_counts: Record<string, number>;
  action_status_counts: Record<string, number>;
  proposed_review_action: string;
  handoff_action_id: string | null;
  handoff_action_status: string | null;
  handoff_action_priority: string | null;
  handoff_action_updated_at: string | null;
  samples: SourceBlockerPlanSample[];
};

export type SourceBlockerReviewPlan = {
  group_by: 'source_and_type';
  row_limit: number;
  sample_limit: number;
  truncated: boolean;
  total_blockers: number;
  groups: SourceBlockerPlanGroup[];
};

export type SourceBlockerHandoffDetail = {
  action_id: string;
  status: string;
  priority: string;
  title: string;
  source_id: string;
  source_external_id: string;
  source_name: string | null;
  canonical_type: string;
  total: number;
  truncated: boolean;
  blocker_counts: Record<string, number>;
  action_status_counts: Record<string, number>;
  rows: SourceBlockerPlanSample[];
};

export type SourceRecordRow = {
  id: number;
  source_type: string;
  source_external_id: string;
  source_name: string;
  external_id: string;
  title: string | null;
  canonical_type: string;
  substrate_id: string | null;
  atlas_canvas_id: string | null;
  atlas_node_id: string | null;
  identity_state: string;
  migration_state: string;
  updated_at: string;
};

export type SourceTransferGapRow = {
  id: number | null;
  source_record_id: number;
  source_name: string;
  source_external_id: string;
  external_id: string;
  title: string | null;
  canonical_type: string;
  review_kind: 'binding_gap' | 'relation_island';
  status: 'open';
  reason: string | null;
  owner: string | null;
  reviewed_by: string | null;
  metadata_json: string | null;
  created_at: string | null;
  updated_at: string | null;
  has_binding_gap: number;
  has_relation_island: number;
};

export type SourceTransferReviewRow = {
  id: number;
  source_record_id: number;
  source_name: string;
  source_external_id: string;
  external_id: string;
  title: string | null;
  canonical_type: string;
  review_kind: 'binding_gap' | 'relation_island' | 'source_truth' | 'other';
  status: 'open' | 'reviewed' | 'waived' | 'needs_source_update' | 'resolved';
  reason: string | null;
  owner: string | null;
  reviewed_by: string;
  metadata_json: string | null;
  created_at: string;
  updated_at: string;
  has_binding_gap: number;
  has_relation_island: number;
  workflow_action_id: string | null;
  workflow_action_status: string | null;
  workflow_action_priority: string | null;
  workflow_action_updated_at: string | null;
  workflow_action_receipt_id: number | null;
  workflow_action_receipt_type: string | null;
  workflow_action_receipt_summary: string | null;
  workflow_action_receipt_created_at: string | null;
};

export type SourceImportRunRow = {
  run_id: string;
  source_type: string;
  source_external_id: string;
  status: string;
  actor: string;
  cursor_after: string | null;
  retry_after_seconds: number | null;
  received: number;
  upserted: number;
  missing_substrate: number;
  error_count: number;
  error: string | null;
  updated_at: string;
};
