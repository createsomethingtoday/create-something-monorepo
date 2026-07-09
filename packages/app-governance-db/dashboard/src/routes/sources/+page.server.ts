import { requireDb } from '$lib/server/db';
import { fail, redirect } from '@sveltejs/kit';
import { APP_GOVERNANCE_ALL_SOURCE_TYPES, sourceTypePlaceholders } from '$lib/server/source-scope';
import type {
  SourceBlockerHandoffDetail,
  SourceBlockerPlanGroup,
  SourceBlockerReviewPlan,
  SourceImportWarningRow,
  SourceImportRunRow,
  SourceLedgerRow,
  SourceReadinessSummary,
  SourceRecordRow,
  SourceTransferAuditRow,
  SourceTransferGapRow,
  SourceTransferReviewRow
} from '$lib/types';
import type { Actions } from './$types';
import type { PageServerLoad } from './$types';

const TRANSFER_REVIEW_KINDS = ['binding_gap', 'relation_island'] as const;
const TRANSFER_REVIEW_ACTION_STATUSES = ['reviewed', 'waived', 'needs_source_update'] as const;
const SOURCE_UPDATE_ACTION_STATUSES = ['proposed', 'running', 'blocked'] as const;
const BLOCKER_HANDOFF_ACTION_STATUSES = ['proposed', 'running', 'blocked'] as const;
const BLOCKER_PLAN_ROW_LIMIT = 200;
const BLOCKER_PLAN_SAMPLE_LIMIT = 5;
const CREATE_SOMETHING_NOTION_SOURCES = [
  { name: 'Agents', external_id: '6f43caa1-7c2f-42a0-8576-9058b451ac72' },
  { name: 'Clients', external_id: '761c843e-3e55-4389-a4a0-043e9d0f2e6e' },
  { name: 'Decisions', external_id: 'f7f8e399-c7a4-43ac-9e61-3a448d8610e9' },
  { name: 'Deliverables', external_id: '873f20f8-083d-4aaa-b47b-6adbac793da1' },
  { name: 'Delivery Milestones', external_id: '5545ca40-228b-4e46-80ea-d502e60c1146' },
  { name: 'Engagements', external_id: 'd3873b66-762c-4f3a-bd9e-97267f58faf5' },
  { name: 'Evidence', external_id: '7eda3fac-e224-45c3-8cfd-31527dc748e7' },
  { name: 'MCP Services', external_id: 'd9c214ec-af88-4f25-ae64-3979a8b57ee3' },
  { name: 'Risks / Blockers', external_id: 'b062bb58-87c4-4ec1-8192-52626dad5601' },
  { name: 'Tasks / Actions', external_id: '0fda6783-5c78-40b9-ba71-46b0f93f1c15' },
  { name: 'Workstreams', external_id: '72390229-f6b3-44aa-a2e4-5deb2a55ceb1' }
] as const;

type SourceBlockerPlanRow = {
  blocker_kind: 'binding_gap' | 'relation_island' | 'source_update_action';
  source_name: string;
  source_external_id: string;
  source_record_id: number;
  external_id: string;
  title: string | null;
  canonical_type: string;
  review_kind: string | null;
  action_id: string | null;
  action_status: string | null;
  action_priority: string | null;
  has_binding_gap: number;
  has_relation_island: number;
};

type SourceBlockerHandoffActionRow = {
  action_id: string;
  source_id: string;
  status: string;
  priority: string;
  updated_at: string;
};

function hashId(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(7, '0');
}

function blockerGroupActionId(sourceExternalId: string, canonicalType: string): string {
  return `workflow_action_notion_transfer_blocker_group_${hashId(`${sourceExternalId}:${canonicalType}`)}`;
}

function isTransferReviewKind(value: unknown): value is (typeof TRANSFER_REVIEW_KINDS)[number] {
  return typeof value === 'string' && TRANSFER_REVIEW_KINDS.includes(value as (typeof TRANSFER_REVIEW_KINDS)[number]);
}

function isTransferReviewActionStatus(value: unknown): value is (typeof TRANSFER_REVIEW_ACTION_STATUSES)[number] {
  return typeof value === 'string' && TRANSFER_REVIEW_ACTION_STATUSES.includes(value as (typeof TRANSFER_REVIEW_ACTION_STATUSES)[number]);
}

function isSourceUpdateActionStatus(value: unknown): value is (typeof SOURCE_UPDATE_ACTION_STATUSES)[number] {
  return typeof value === 'string' && SOURCE_UPDATE_ACTION_STATUSES.includes(value as (typeof SOURCE_UPDATE_ACTION_STATUSES)[number]);
}

function isBlockerHandoffActionStatus(value: unknown): value is (typeof BLOCKER_HANDOFF_ACTION_STATUSES)[number] {
  return typeof value === 'string' && BLOCKER_HANDOFF_ACTION_STATUSES.includes(value as (typeof BLOCKER_HANDOFF_ACTION_STATUSES)[number]);
}

function sourceHandoffRedirect(actionId: FormDataEntryValue | null): string {
  return typeof actionId === 'string' && /^workflow_action_notion_transfer_blocker_group_[a-z0-9]+$/.test(actionId)
    ? `/sources?handoff=${actionId}`
    : '/sources';
}

export const load: PageServerLoad = async ({ platform, url }) => {
  const db = requireDb(platform);
  const placeholders = sourceTypePlaceholders(APP_GOVERNANCE_ALL_SOURCE_TYPES);
  const selectedHandoffActionId = url.searchParams.get('handoff');

  const [
    sources,
    transferAudit,
    openTransferGaps,
    sourceUpdateReviews,
    missingRecords,
    recentRuns,
    sourceUpdateReviewCounts,
    openSourceUpdateActionCounts,
    latestImportWarnings,
    clientMapCoverage,
    blockerPlanRows,
    blockerHandoffActions
  ] = await Promise.all([
    db
      .prepare(
        `SELECT s.source_type, s.external_id, s.name, s.workspace, s.atlas_canvas_id,
                c.cursor_value, c.last_synced_at, c.synced_by,
                COUNT(r.id) AS records,
                COALESCE(SUM(CASE WHEN r.id IS NOT NULL AND (r.substrate_id IS NULL OR r.substrate_id = '') THEN 1 ELSE 0 END), 0) AS missing_substrate,
                COALESCE(SUM(CASE WHEN r.migration_state = 'ready' THEN 1 ELSE 0 END), 0) AS ready_records,
                COALESCE(SUM(CASE WHEN r.migration_state = 'imported' THEN 1 ELSE 0 END), 0) AS imported_records,
                COALESCE(SUM(CASE WHEN r.migration_state = 'error' THEN 1 ELSE 0 END), 0) AS error_records
         FROM sources s
         LEFT JOIN sync_cursors c ON c.source_type = s.source_type AND c.source_external_id = s.external_id
         LEFT JOIN source_records r ON r.source_id = s.id
         WHERE s.source_type IN (${placeholders})
         GROUP BY s.id
         HAVING records > 0 OR c.cursor_value IS NOT NULL
         ORDER BY missing_substrate DESC, s.source_type, s.name
         LIMIT 100`
      )
      .bind(...APP_GOVERNANCE_ALL_SOURCE_TYPES)
      .all<SourceLedgerRow>(),
    db
      .prepare(
        `SELECT s.source_type, s.external_id, s.name,
                (SELECT COUNT(*) FROM source_records r WHERE r.source_id = s.id) AS records,
                (SELECT COUNT(*) FROM source_records r WHERE r.source_id = s.id AND r.substrate_id IS NOT NULL AND r.substrate_id != '') AS mapped_records,
                (SELECT COUNT(*) FROM source_records r WHERE r.source_id = s.id AND (r.substrate_id IS NULL OR r.substrate_id = '' OR r.identity_state IN ('missing_substrate', 'blocked', 'duplicate'))) AS identity_gaps,
                (SELECT COUNT(*) FROM source_records r WHERE r.source_id = s.id AND r.atlas_canvas_id IS NOT NULL AND r.atlas_node_id IS NOT NULL) AS source_projected_records,
                (SELECT COUNT(DISTINCT b.source_record_id)
                   FROM source_record_atlas_bindings b
                   JOIN source_records r ON r.id = b.source_record_id
                  WHERE r.source_id = s.id) AS bound_records,
                (SELECT COUNT(*)
                   FROM source_records r
                  WHERE r.source_id = s.id
                    AND NOT EXISTS (
                      SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id
                    )) AS unbound_records,
                (SELECT COUNT(*)
                   FROM source_records r
                   JOIN source_record_transfer_reviews review
                     ON review.source_record_id = r.id
                    AND review.review_kind = 'binding_gap'
                    AND review.status IN ('reviewed', 'waived', 'needs_source_update', 'resolved')
                  WHERE r.source_id = s.id
                    AND NOT EXISTS (
                      SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id
                    )) AS reviewed_unbound_records,
                (SELECT COUNT(*)
                   FROM source_record_relations rel
                   JOIN source_records r ON r.id = rel.source_record_id
                  WHERE r.source_id = s.id) AS outgoing_relations,
                (SELECT COUNT(*)
                   FROM source_record_relations rel
                   JOIN source_records r ON r.id = rel.target_source_record_id
                  WHERE r.source_id = s.id) AS incoming_relations,
                (SELECT COUNT(*)
                   FROM source_records r
                  WHERE r.source_id = s.id
                    AND NOT EXISTS (
                      SELECT 1
                      FROM source_record_relations rel
                      WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
                    )) AS relation_isolated_records,
                (SELECT COUNT(*)
                   FROM source_records r
                   JOIN source_record_transfer_reviews review
                     ON review.source_record_id = r.id
                    AND review.review_kind = 'relation_island'
                    AND review.status IN ('reviewed', 'waived', 'needs_source_update', 'resolved')
                  WHERE r.source_id = s.id
                    AND NOT EXISTS (
                      SELECT 1
                      FROM source_record_relations rel
                      WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
                    )) AS reviewed_relation_isolated_records,
                (SELECT COUNT(*)
                   FROM source_record_relations rel
                   JOIN source_records r ON r.id = rel.source_record_id
                  WHERE r.source_id = s.id AND rel.evidence_kind = 'imported') AS imported_relations,
                CASE
                  WHEN (SELECT COUNT(*) FROM source_records r WHERE r.source_id = s.id) = 0 THEN 'missing'
                  WHEN (SELECT COUNT(*) FROM source_records r WHERE r.source_id = s.id AND (r.substrate_id IS NULL OR r.substrate_id = '' OR r.identity_state IN ('missing_substrate', 'blocked', 'duplicate'))) > 0 THEN 'identity gaps'
                  WHEN (SELECT COUNT(*) FROM source_records r WHERE r.source_id = s.id AND r.atlas_canvas_id IS NOT NULL AND r.atlas_node_id IS NOT NULL)
                     < (SELECT COUNT(*) FROM source_records r WHERE r.source_id = s.id) THEN 'projection gaps'
                  ELSE 'ready'
                END AS transfer_state
         FROM sources s
         WHERE s.source_type = 'notion_database'
         ORDER BY transfer_state, s.name
         LIMIT 100`
      )
      .all<SourceTransferAuditRow>(),
    db
      .prepare(
        `WITH candidate AS (
           SELECT r.id AS source_record_id, s.name AS source_name, s.external_id AS source_external_id,
                  r.external_id, r.title, r.canonical_type, 'binding_gap' AS review_kind,
                  1 AS has_binding_gap,
                  CASE WHEN EXISTS (
                    SELECT 1 FROM source_record_relations rel WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
                  ) THEN 0 ELSE 1 END AS has_relation_island
           FROM source_records r
           JOIN sources s ON s.id = r.source_id
           WHERE s.source_type = 'notion_database'
             AND NOT EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id)
             AND NOT EXISTS (
               SELECT 1
               FROM source_record_transfer_reviews review
               WHERE review.source_record_id = r.id
                 AND review.review_kind = 'binding_gap'
                 AND review.status IN ('reviewed', 'waived', 'needs_source_update', 'resolved')
             )
           UNION ALL
           SELECT r.id AS source_record_id, s.name AS source_name, s.external_id AS source_external_id,
                  r.external_id, r.title, r.canonical_type, 'relation_island' AS review_kind,
                  CASE WHEN EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id) THEN 0 ELSE 1 END AS has_binding_gap,
                  1 AS has_relation_island
           FROM source_records r
           JOIN sources s ON s.id = r.source_id
           WHERE s.source_type = 'notion_database'
             AND NOT EXISTS (
               SELECT 1
               FROM source_record_relations rel
               WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
             )
             AND NOT EXISTS (
               SELECT 1
               FROM source_record_transfer_reviews review
               WHERE review.source_record_id = r.id
                 AND review.review_kind = 'relation_island'
                 AND review.status IN ('reviewed', 'waived', 'needs_source_update', 'resolved')
             )
         )
         SELECT review.id, candidate.source_record_id, candidate.source_name, candidate.source_external_id,
                candidate.external_id, candidate.title, candidate.canonical_type, candidate.review_kind,
                'open' AS status,
                review.reason, review.owner, review.reviewed_by, review.metadata_json,
                review.created_at, review.updated_at,
                candidate.has_binding_gap, candidate.has_relation_island
         FROM candidate
         LEFT JOIN source_record_transfer_reviews review
           ON review.source_record_id = candidate.source_record_id
          AND review.review_kind = candidate.review_kind
          AND review.status = 'open'
         ORDER BY candidate.source_name, candidate.canonical_type, candidate.title, candidate.review_kind
         LIMIT 25`
      )
      .all<SourceTransferGapRow>(),
    db
      .prepare(
        `SELECT review.id, review.source_record_id, s.name AS source_name, s.external_id AS source_external_id,
                r.external_id, r.title, r.canonical_type, review.review_kind, review.status,
                review.reason, review.owner, review.reviewed_by, review.metadata_json,
                review.created_at, review.updated_at,
                CASE WHEN EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id) THEN 0 ELSE 1 END AS has_binding_gap,
                CASE WHEN EXISTS (
                  SELECT 1
                  FROM source_record_relations rel
                  WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
                ) THEN 0 ELSE 1 END AS has_relation_island,
                action.action_id AS workflow_action_id,
                action.status AS workflow_action_status,
                action.priority AS workflow_action_priority,
                action.updated_at AS workflow_action_updated_at,
                (
                  SELECT receipt.id
                  FROM workflow_receipts receipt
                  WHERE json_extract(receipt.payload_json, '$.workflow_action_id') = action.action_id
                  ORDER BY receipt.created_at DESC, receipt.id DESC
                  LIMIT 1
                ) AS workflow_action_receipt_id,
                (
                  SELECT receipt.receipt_type
                  FROM workflow_receipts receipt
                  WHERE json_extract(receipt.payload_json, '$.workflow_action_id') = action.action_id
                  ORDER BY receipt.created_at DESC, receipt.id DESC
                  LIMIT 1
                ) AS workflow_action_receipt_type,
                (
                  SELECT receipt.summary
                  FROM workflow_receipts receipt
                  WHERE json_extract(receipt.payload_json, '$.workflow_action_id') = action.action_id
                  ORDER BY receipt.created_at DESC, receipt.id DESC
                  LIMIT 1
                ) AS workflow_action_receipt_summary,
                (
                  SELECT receipt.created_at
                  FROM workflow_receipts receipt
                  WHERE json_extract(receipt.payload_json, '$.workflow_action_id') = action.action_id
                  ORDER BY receipt.created_at DESC, receipt.id DESC
                  LIMIT 1
                ) AS workflow_action_receipt_created_at
         FROM source_record_transfer_reviews review
         JOIN source_records r ON r.id = review.source_record_id
         JOIN sources s ON s.id = r.source_id
         LEFT JOIN workflow_actions action
           ON action.action_id = ('workflow_action_source_transfer_review_' || review.id)
         WHERE s.source_type = 'notion_database'
           AND review.status = 'needs_source_update'
         ORDER BY review.updated_at DESC, review.id DESC
         LIMIT 25`
      )
      .all<SourceTransferReviewRow>(),
    db
      .prepare(
        `SELECT r.id, s.source_type, s.external_id AS source_external_id, s.name AS source_name,
                r.external_id, r.title, r.canonical_type, r.substrate_id,
                r.atlas_canvas_id, r.atlas_node_id, r.identity_state, r.migration_state, r.updated_at
         FROM source_records r
         JOIN sources s ON s.id = r.source_id
         WHERE s.source_type IN (${placeholders})
           AND (r.substrate_id IS NULL OR r.substrate_id = '' OR r.identity_state IN ('missing_substrate', 'blocked', 'duplicate'))
         ORDER BY r.updated_at DESC, r.id DESC
         LIMIT 50`
      )
      .bind(...APP_GOVERNANCE_ALL_SOURCE_TYPES)
      .all<SourceRecordRow>(),
    db
      .prepare(
        `SELECT ir.run_id, s.source_type, s.external_id AS source_external_id, ir.status, ir.actor,
                ir.cursor_after, ir.retry_after_seconds, ir.received, ir.upserted,
                ir.missing_substrate, ir.error_count, ir.error, ir.updated_at
         FROM source_import_runs ir
         JOIN sources s ON s.id = ir.source_id
         WHERE s.source_type IN (${placeholders})
         ORDER BY ir.updated_at DESC
         LIMIT 25`
      )
      .bind(...APP_GOVERNANCE_ALL_SOURCE_TYPES)
      .all<SourceImportRunRow>(),
    db
      .prepare(
        `SELECT review.status, review.review_kind, COUNT(*) AS n
         FROM source_record_transfer_reviews review
         JOIN source_records r ON r.id = review.source_record_id
         JOIN sources s ON s.id = r.source_id
         WHERE s.source_type = 'notion_database'
           AND review.status = 'needs_source_update'
         GROUP BY review.status, review.review_kind`
      )
      .all<{ status: string; review_kind: string; n: number }>(),
    db
      .prepare(
        `SELECT action.status, review.review_kind, COUNT(*) AS n
         FROM workflow_actions action
         JOIN source_record_transfer_reviews review
           ON action.source_kind = 'source_record_transfer_review'
          AND action.source_id = CAST(review.id AS TEXT)
         JOIN source_records r ON r.id = review.source_record_id
         JOIN sources s ON s.id = r.source_id
         WHERE s.source_type = 'notion_database'
           AND review.status = 'needs_source_update'
           AND action.status IN ('proposed', 'approved', 'ready', 'running', 'blocked')
         GROUP BY action.status, review.review_kind`
      )
      .all<{ status: string; review_kind: string; n: number }>(),
    db
      .prepare(
        `SELECT s.name AS source_name, s.external_id AS source_external_id,
                ir.run_id, ir.status, ir.error, ir.updated_at
         FROM source_import_runs ir
         JOIN sources s ON s.id = ir.source_id
         WHERE s.source_type = 'notion_database'
           AND ir.run_id = (
             SELECT latest.run_id
             FROM source_import_runs latest
             WHERE latest.source_id = s.id
             ORDER BY latest.updated_at DESC, latest.run_id DESC
             LIMIT 1
           )
           AND ir.status IN ('failed', 'rate_limited')
         ORDER BY s.name`
      )
      .all<SourceImportWarningRow>(),
    db
      .prepare(
        `SELECT COUNT(*) AS client_map_count,
                COALESCE(SUM(node_count), 0) AS client_map_nodes,
                COALESCE(SUM(edge_count), 0) AS client_map_edges
         FROM (
           SELECT c.canvas_id,
                  COUNT(DISTINCT n.node_id) AS node_count,
                  COUNT(DISTINCT e.edge_id) AS edge_count
           FROM atlas_canvases c
           LEFT JOIN atlas_nodes n ON n.canvas_id = c.canvas_id
           LEFT JOIN atlas_edges e ON e.canvas_id = c.canvas_id
           WHERE c.workflow = 'Client workflow source projection'
           GROUP BY c.canvas_id
         )`
      )
      .first<{ client_map_count: number; client_map_nodes: number; client_map_edges: number }>()
    ,
    db
      .prepare(
        `WITH blockers AS (
           SELECT 'binding_gap' AS blocker_kind,
                  s.name AS source_name,
                  s.external_id AS source_external_id,
                  r.id AS source_record_id,
                  r.external_id,
                  r.title,
                  r.canonical_type,
                  NULL AS review_kind,
                  NULL AS action_id,
                  NULL AS action_status,
                  NULL AS action_priority,
                  1 AS has_binding_gap,
                  CASE WHEN EXISTS (
                    SELECT 1
                    FROM source_record_relations rel
                    WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
                  ) THEN 0 ELSE 1 END AS has_relation_island
           FROM source_records r
           JOIN sources s ON s.id = r.source_id
           WHERE s.source_type = 'notion_database'
             AND NOT EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id)
             AND NOT EXISTS (
               SELECT 1
               FROM source_record_transfer_reviews review
               WHERE review.source_record_id = r.id
                 AND review.review_kind = 'binding_gap'
                 AND review.status IN ('reviewed', 'waived', 'needs_source_update', 'resolved')
             )
           UNION ALL
           SELECT 'relation_island' AS blocker_kind,
                  s.name AS source_name,
                  s.external_id AS source_external_id,
                  r.id AS source_record_id,
                  r.external_id,
                  r.title,
                  r.canonical_type,
                  NULL AS review_kind,
                  NULL AS action_id,
                  NULL AS action_status,
                  NULL AS action_priority,
                  CASE WHEN EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id) THEN 0 ELSE 1 END AS has_binding_gap,
                  1 AS has_relation_island
           FROM source_records r
           JOIN sources s ON s.id = r.source_id
           WHERE s.source_type = 'notion_database'
             AND NOT EXISTS (
               SELECT 1
               FROM source_record_relations rel
               WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
             )
             AND NOT EXISTS (
               SELECT 1
               FROM source_record_transfer_reviews review
               WHERE review.source_record_id = r.id
                 AND review.review_kind = 'relation_island'
                 AND review.status IN ('reviewed', 'waived', 'needs_source_update', 'resolved')
             )
           UNION ALL
           SELECT 'source_update_action' AS blocker_kind,
                  s.name AS source_name,
                  s.external_id AS source_external_id,
                  r.id AS source_record_id,
                  r.external_id,
                  r.title,
                  r.canonical_type,
                  review.review_kind,
                  action.action_id,
                  action.status AS action_status,
                  action.priority AS action_priority,
                  CASE WHEN EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id) THEN 0 ELSE 1 END AS has_binding_gap,
                  CASE WHEN EXISTS (
                    SELECT 1
                    FROM source_record_relations rel
                    WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
                  ) THEN 0 ELSE 1 END AS has_relation_island
           FROM workflow_actions action
           JOIN source_record_transfer_reviews review
             ON action.source_kind = 'source_record_transfer_review'
            AND action.source_id = CAST(review.id AS TEXT)
           JOIN source_records r ON r.id = review.source_record_id
           JOIN sources s ON s.id = r.source_id
           WHERE s.source_type = 'notion_database'
             AND review.status = 'needs_source_update'
             AND action.status IN ('proposed', 'approved', 'ready', 'running', 'blocked')
         )
         SELECT *
         FROM blockers
         ORDER BY source_name, canonical_type, blocker_kind, title, external_id
         LIMIT ?`
      )
      .bind(BLOCKER_PLAN_ROW_LIMIT + 1)
      .all<SourceBlockerPlanRow>(),
    db
      .prepare(
        `SELECT action_id, source_id, status, priority, updated_at
         FROM workflow_actions
         WHERE source_kind = 'notion_transfer_blocker_group'
           AND status IN ('proposed', 'approved', 'ready', 'running', 'blocked')
         ORDER BY updated_at DESC`
      )
      .all<SourceBlockerHandoffActionRow>()
  ]);

  const actualTransferSources = new Map(transferAudit.results.map((source) => [source.external_id, source]));
  const expectedTransferSources = CREATE_SOMETHING_NOTION_SOURCES.map(
    (source) =>
      actualTransferSources.get(source.external_id) ?? {
        source_type: 'notion_database',
        external_id: source.external_id,
        name: source.name,
        records: 0,
        mapped_records: 0,
        identity_gaps: 0,
        source_projected_records: 0,
        bound_records: 0,
        unbound_records: 0,
        reviewed_unbound_records: 0,
        outgoing_relations: 0,
        incoming_relations: 0,
        relation_isolated_records: 0,
        reviewed_relation_isolated_records: 0,
        imported_relations: 0,
        transfer_state: 'missing'
      }
  );
  const readinessBase = expectedTransferSources.reduce(
    (acc, source) => {
      acc.captured_sources += source.records > 0 ? 1 : 0;
      acc.records += source.records;
      acc.identity_gaps += source.identity_gaps;
      acc.source_projection_gaps += Math.max(0, source.records - source.source_projected_records);
      acc.unbound_records += source.unbound_records;
      acc.reviewed_unbound_records += source.reviewed_unbound_records;
      acc.unreviewed_unbound_records += Math.max(0, source.unbound_records - source.reviewed_unbound_records);
      acc.relation_isolated_records += source.relation_isolated_records;
      acc.reviewed_relation_isolated_records += source.reviewed_relation_isolated_records;
      acc.unreviewed_relation_islands += Math.max(
        0,
        source.relation_isolated_records - source.reviewed_relation_isolated_records
      );
      return acc;
    },
    {
      expected_sources: CREATE_SOMETHING_NOTION_SOURCES.length,
      captured_sources: 0,
      records: 0,
      identity_gaps: 0,
      source_projection_gaps: 0,
      unbound_records: 0,
      reviewed_unbound_records: 0,
      unreviewed_unbound_records: 0,
      relation_isolated_records: 0,
      reviewed_relation_isolated_records: 0,
      unreviewed_relation_islands: 0
    }
  );
  const needsSourceUpdateReviews = sourceUpdateReviewCounts.results.reduce((sum, row) => sum + Number(row.n), 0);
  const openSourceUpdateActions = openSourceUpdateActionCounts.results.reduce((sum, row) => sum + Number(row.n), 0);
  const clientsSource = expectedTransferSources.find((source) => source.name === 'Clients');
  const clientRows = clientsSource?.records ?? 0;
  const clientMapCount = Number(clientMapCoverage?.client_map_count ?? 0);

  const blockers: SourceReadinessSummary['blockers'] = [];
  const warnings: SourceReadinessSummary['warnings'] = [];
  if (readinessBase.captured_sources < readinessBase.expected_sources) {
    blockers.push({
      kind: 'missing_sources',
      message: `${readinessBase.expected_sources - readinessBase.captured_sources} expected Notion source(s) have no captured records.`
    });
  }
  if (readinessBase.identity_gaps > 0) {
    blockers.push({ kind: 'identity_gaps', message: `${readinessBase.identity_gaps} source record(s) still lack clean canonical identity.` });
  }
  if (readinessBase.source_projection_gaps > 0) {
    blockers.push({
      kind: 'projection_gaps',
      message: `${readinessBase.source_projection_gaps} source record(s) are not projected into the source-led Atlas map.`
    });
  }
  if (readinessBase.unreviewed_unbound_records > 0) {
    blockers.push({
      kind: 'unreviewed_binding_gaps',
      message: `${readinessBase.unreviewed_unbound_records} unbound source record(s) still need review, waiver, source update, or binding repair.`
    });
  }
  if (readinessBase.unreviewed_relation_islands > 0) {
    blockers.push({
      kind: 'unreviewed_relation_islands',
      message: `${readinessBase.unreviewed_relation_islands} relation-isolated source record(s) still need review, waiver, source update, or relation repair.`
    });
  }
  if (needsSourceUpdateReviews > 0) {
    blockers.push({
      kind: 'source_update_reviews',
      message: `${needsSourceUpdateReviews} transfer review(s) are still marked needs_source_update.`
    });
  }
  if (openSourceUpdateActions > 0) {
    blockers.push({
      kind: 'open_source_update_actions',
      message: `${openSourceUpdateActions} source-update workflow action(s) are still open.`
    });
  }
  if (latestImportWarnings.results.length > 0) {
    warnings.push({
      kind: 'latest_import_not_clean',
      message: `${latestImportWarnings.results.length} source(s) have latest import runs that are failed or rate-limited.`
    });
  }
  if (clientRows > 0 && clientMapCount < clientRows) {
    warnings.push({
      kind: 'client_map_coverage_requires_judgment',
      message: `${clientMapCount} client workflow map(s) exist for ${clientRows} captured client row(s).`
    });
  }

  const notionReadiness: SourceReadinessSummary = {
    ready: blockers.length === 0,
    verdict: blockers.length === 0 ? 'ready' : 'not_ready',
    ...readinessBase,
    needs_source_update_reviews: needsSourceUpdateReviews,
    open_source_update_actions: openSourceUpdateActions,
    latest_import_warning_count: latestImportWarnings.results.length,
    client_map_count: clientMapCount,
    client_map_nodes: Number(clientMapCoverage?.client_map_nodes ?? 0),
    client_map_edges: Number(clientMapCoverage?.client_map_edges ?? 0),
    client_rows: clientRows,
    blockers,
    warnings
  };

  const blockerPlanTruncated = blockerPlanRows.results.length > BLOCKER_PLAN_ROW_LIMIT;
  const blockerPlanSourceRows = blockerPlanTruncated ? blockerPlanRows.results.slice(0, BLOCKER_PLAN_ROW_LIMIT) : blockerPlanRows.results;
  const handoffActionBySourceId = new Map(blockerHandoffActions.results.map((action) => [action.source_id, action]));
  const blockerPlanGroups = new Map<string, SourceBlockerPlanGroup>();
  for (const row of blockerPlanSourceRows) {
    const groupKey = `${row.source_name} / ${row.canonical_type}`;
    const handoffSourceId = `${row.source_external_id}:${row.canonical_type}`;
    const handoffAction = handoffActionBySourceId.get(handoffSourceId);
    const group =
      blockerPlanGroups.get(groupKey) ??
      {
        group_key: groupKey,
        source_name: row.source_name,
        source_external_id: row.source_external_id,
        canonical_type: row.canonical_type,
        total: 0,
        blocker_counts: {},
        action_status_counts: {},
        proposed_review_action:
          row.blocker_kind === 'source_update_action'
            ? 'collect_source_truth_proof'
            : row.blocker_kind === 'binding_gap'
              ? 'review_binding_or_mark_source_update'
              : 'review_relation_or_mark_source_update',
        handoff_action_id: handoffAction?.action_id ?? null,
        handoff_action_status: handoffAction?.status ?? null,
        handoff_action_priority: handoffAction?.priority ?? null,
        handoff_action_updated_at: handoffAction?.updated_at ?? null,
        samples: []
      };
    group.total += 1;
    group.blocker_counts[row.blocker_kind] = (group.blocker_counts[row.blocker_kind] ?? 0) + 1;
    if (row.action_status) {
      group.action_status_counts[row.action_status] = (group.action_status_counts[row.action_status] ?? 0) + 1;
      group.proposed_review_action = 'collect_source_truth_proof';
    }
    if (group.samples.length < BLOCKER_PLAN_SAMPLE_LIMIT) {
      group.samples.push({
        blocker_kind: row.blocker_kind,
        source_record_id: row.source_record_id,
        external_id: row.external_id,
        title: row.title,
        canonical_type: row.canonical_type,
        review_kind: row.review_kind,
        action_id: row.action_id,
        action_status: row.action_status,
        action_priority: row.action_priority,
        has_binding_gap: Boolean(row.has_binding_gap),
        has_relation_island: Boolean(row.has_relation_island)
      });
    }
    blockerPlanGroups.set(groupKey, group);
  }

  const blockerReviewPlan: SourceBlockerReviewPlan = {
    group_by: 'source_and_type',
    row_limit: BLOCKER_PLAN_ROW_LIMIT,
    sample_limit: BLOCKER_PLAN_SAMPLE_LIMIT,
    truncated: blockerPlanTruncated,
    total_blockers: blockerPlanSourceRows.length,
    groups: Array.from(blockerPlanGroups.values()).sort((a, b) => b.total - a.total || a.group_key.localeCompare(b.group_key))
  };

  let selectedHandoff: SourceBlockerHandoffDetail | null = null;
  if (selectedHandoffActionId && /^workflow_action_notion_transfer_blocker_group_[a-z0-9]+$/.test(selectedHandoffActionId)) {
    const action = await db
      .prepare(
        `SELECT action_id, status, priority, title, source_id
         FROM workflow_actions
         WHERE action_id = ?
           AND source_kind = 'notion_transfer_blocker_group'
         LIMIT 1`
      )
      .bind(selectedHandoffActionId)
      .first<{ action_id: string; status: string; priority: string; title: string; source_id: string | null }>();

    if (action?.source_id && action.source_id.includes(':')) {
      const separatorIndex = action.source_id.lastIndexOf(':');
      const sourceExternalId = action.source_id.slice(0, separatorIndex);
      const canonicalType = action.source_id.slice(separatorIndex + 1);
      const detailRows = await db
        .prepare(
          `WITH blockers AS (
             SELECT 'binding_gap' AS blocker_kind,
                    s.name AS source_name,
                    s.external_id AS source_external_id,
                    r.id AS source_record_id,
                    r.external_id,
                    r.title,
                    r.canonical_type,
                    NULL AS review_kind,
                    NULL AS action_id,
                    NULL AS action_status,
                    NULL AS action_priority,
                    1 AS has_binding_gap,
                    CASE WHEN EXISTS (
                      SELECT 1
                      FROM source_record_relations rel
                      WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
                    ) THEN 0 ELSE 1 END AS has_relation_island
             FROM source_records r
             JOIN sources s ON s.id = r.source_id
             WHERE s.source_type = 'notion_database'
               AND s.external_id = ?
               AND r.canonical_type = ?
               AND NOT EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id)
               AND NOT EXISTS (
                 SELECT 1
                 FROM source_record_transfer_reviews review
                 WHERE review.source_record_id = r.id
                   AND review.review_kind = 'binding_gap'
                   AND review.status IN ('reviewed', 'waived', 'needs_source_update', 'resolved')
               )
             UNION ALL
             SELECT 'relation_island' AS blocker_kind,
                    s.name AS source_name,
                    s.external_id AS source_external_id,
                    r.id AS source_record_id,
                    r.external_id,
                    r.title,
                    r.canonical_type,
                    NULL AS review_kind,
                    NULL AS action_id,
                    NULL AS action_status,
                    NULL AS action_priority,
                    CASE WHEN EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id) THEN 0 ELSE 1 END AS has_binding_gap,
                    1 AS has_relation_island
             FROM source_records r
             JOIN sources s ON s.id = r.source_id
             WHERE s.source_type = 'notion_database'
               AND s.external_id = ?
               AND r.canonical_type = ?
               AND NOT EXISTS (
                 SELECT 1
                 FROM source_record_relations rel
                 WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
               )
               AND NOT EXISTS (
                 SELECT 1
                 FROM source_record_transfer_reviews review
                 WHERE review.source_record_id = r.id
                   AND review.review_kind = 'relation_island'
                   AND review.status IN ('reviewed', 'waived', 'needs_source_update', 'resolved')
               )
             UNION ALL
             SELECT 'source_update_action' AS blocker_kind,
                    s.name AS source_name,
                    s.external_id AS source_external_id,
                    r.id AS source_record_id,
                    r.external_id,
                    r.title,
                    r.canonical_type,
                    review.review_kind,
                    source_action.action_id,
                    source_action.status AS action_status,
                    source_action.priority AS action_priority,
                    CASE WHEN EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id) THEN 0 ELSE 1 END AS has_binding_gap,
                    CASE WHEN EXISTS (
                      SELECT 1
                      FROM source_record_relations rel
                      WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
                    ) THEN 0 ELSE 1 END AS has_relation_island
             FROM workflow_actions source_action
             JOIN source_record_transfer_reviews review
               ON source_action.source_kind = 'source_record_transfer_review'
              AND source_action.source_id = CAST(review.id AS TEXT)
             JOIN source_records r ON r.id = review.source_record_id
             JOIN sources s ON s.id = r.source_id
             WHERE s.source_type = 'notion_database'
               AND s.external_id = ?
               AND r.canonical_type = ?
               AND review.status = 'needs_source_update'
               AND source_action.status IN ('proposed', 'approved', 'ready', 'running', 'blocked')
           )
           SELECT *
           FROM blockers
           ORDER BY blocker_kind, title, external_id
           LIMIT 201`
        )
        .bind(sourceExternalId, canonicalType, sourceExternalId, canonicalType, sourceExternalId, canonicalType)
        .all<SourceBlockerPlanRow & { source_name: string | null }>();
      const rows = detailRows.results.slice(0, 200);
      const blockerCounts: Record<string, number> = {};
      const actionStatusCounts: Record<string, number> = {};
      for (const row of rows) {
        blockerCounts[row.blocker_kind] = (blockerCounts[row.blocker_kind] ?? 0) + 1;
        if (row.action_status) actionStatusCounts[row.action_status] = (actionStatusCounts[row.action_status] ?? 0) + 1;
      }
      selectedHandoff = {
        action_id: action.action_id,
        status: action.status,
        priority: action.priority,
        title: action.title,
        source_id: action.source_id,
        source_external_id: sourceExternalId,
        source_name: rows[0]?.source_name ?? null,
        canonical_type: canonicalType,
        total: rows.length,
        truncated: detailRows.results.length > 200,
        blocker_counts: blockerCounts,
        action_status_counts: actionStatusCounts,
        rows: rows.map((row) => ({
          blocker_kind: row.blocker_kind,
          source_record_id: row.source_record_id,
          external_id: row.external_id,
          title: row.title,
          canonical_type: row.canonical_type,
          review_kind: row.review_kind,
          action_id: row.action_id,
          action_status: row.action_status,
          action_priority: row.action_priority,
          has_binding_gap: Boolean(row.has_binding_gap),
          has_relation_island: Boolean(row.has_relation_island)
        }))
      };
    }
  }

  return {
    sources: sources.results,
    notionReadiness,
    blockerReviewPlan,
    selectedHandoff,
    latestImportWarnings: latestImportWarnings.results,
    transferAudit: transferAudit.results,
    openTransferGaps: openTransferGaps.results,
    sourceUpdateReviews: sourceUpdateReviews.results,
    missingRecords: missingRecords.results,
    recentRuns: recentRuns.results
  };
};

export const actions: Actions = {
  reviewTransferGap: async ({ request, platform }) => {
    const db = requireDb(platform);
    const form = await request.formData();
    const rawSourceRecordId = form.get('source_record_id');
    const rawReviewKind = form.get('review_kind');
    const rawStatus = form.get('status');
    const rawHandoffActionId = form.get('handoff_action_id');
    const title = typeof form.get('title') === 'string' ? form.get('title') : null;

    if (typeof rawSourceRecordId !== 'string' || !/^\d+$/.test(rawSourceRecordId)) {
      return fail(400, { error: 'Invalid source record id.' });
    }
    if (!isTransferReviewKind(rawReviewKind)) {
      return fail(400, { error: 'Invalid transfer review kind.' });
    }
    if (!isTransferReviewActionStatus(rawStatus)) {
      return fail(400, { error: 'Invalid transfer review status.' });
    }

    const sourceRecordId = Number(rawSourceRecordId);
    const record = await db
      .prepare(
        `SELECT r.id, r.external_id, r.title, r.canonical_type, s.external_id AS source_external_id, s.name AS source_name
         FROM source_records r
         JOIN sources s ON s.id = r.source_id
         WHERE r.id = ? AND s.source_type = 'notion_database'
         LIMIT 1`
      )
      .bind(sourceRecordId)
      .first<{ id: number; external_id: string; title: string | null; canonical_type: string; source_external_id: string; source_name: string }>();

    if (!record) {
      return fail(404, { error: 'Source record was not found.' });
    }

    const gapExists =
      rawReviewKind === 'binding_gap'
        ? await db
            .prepare('SELECT 1 AS ok WHERE NOT EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = ?)')
            .bind(sourceRecordId)
            .first<{ ok: number }>()
        : await db
            .prepare(
              `SELECT 1 AS ok
               WHERE NOT EXISTS (
                 SELECT 1
                 FROM source_record_relations rel
                 WHERE rel.source_record_id = ? OR rel.target_source_record_id = ?
               )`
            )
            .bind(sourceRecordId, sourceRecordId)
            .first<{ ok: number }>();

    if (!gapExists) {
      return fail(409, { error: 'This transfer gap no longer exists.' });
    }

    const reasonByStatus = {
      reviewed: 'Dashboard handoff review: blocker reviewed for transfer without source-truth update.',
      waived: 'Dashboard handoff review: blocker waived for client Atlas rollout.',
      needs_source_update: 'Dashboard handoff review: needs source-truth update before client Atlas rollout.'
    } as const;
    const metadata = {
      surface: 'dashboard:/sources',
      handoff_action_id: typeof rawHandoffActionId === 'string' ? rawHandoffActionId : null,
      title: title ?? record.title ?? record.external_id
    };

    await db
      .prepare(
        `INSERT INTO source_record_transfer_reviews (
           source_record_id, review_kind, status, reason, owner, reviewed_by, metadata_json
         )
         VALUES (?, ?, ?, ?, 'CREATE SOMETHING', 'dashboard', ?)
         ON CONFLICT (source_record_id, review_kind)
         DO UPDATE SET
           status = excluded.status,
           reason = excluded.reason,
           owner = excluded.owner,
           reviewed_by = excluded.reviewed_by,
           metadata_json = excluded.metadata_json,
           updated_at = datetime('now')`
      )
      .bind(sourceRecordId, rawReviewKind, rawStatus, reasonByStatus[rawStatus], JSON.stringify(metadata))
      .run();

    const review = await db
      .prepare(
        `SELECT id
         FROM source_record_transfer_reviews
         WHERE source_record_id = ? AND review_kind = ?
         LIMIT 1`
      )
      .bind(sourceRecordId, rawReviewKind)
      .first<{ id: number }>();

    const payload = {
      source_record_id: sourceRecordId,
      source_record: `${record.source_external_id}:${record.external_id}`,
      review_id: review?.id ?? null,
      review_kind: rawReviewKind,
      status: rawStatus,
      source_name: record.source_name,
      canonical_type: record.canonical_type,
      handoff_action_id: metadata.handoff_action_id,
      title: metadata.title
    };

    if (typeof rawHandoffActionId === 'string' && /^workflow_action_notion_transfer_blocker_group_[a-z0-9]+$/.test(rawHandoffActionId)) {
      const handoff = await db
        .prepare(
          `SELECT canvas_id, node_id
           FROM workflow_actions
           WHERE action_id = ? AND source_kind = 'notion_transfer_blocker_group'
           LIMIT 1`
        )
        .bind(rawHandoffActionId)
        .first<{ canvas_id: string; node_id: string | null }>();
      if (handoff) {
        await db
          .prepare(
            `INSERT INTO workflow_receipts (canvas_id, node_id, receipt_type, summary, artifact_url, payload_json, created_by)
             VALUES (?, ?, 'decision', ?, ?, ?, 'dashboard')`
          )
          .bind(
            handoff.canvas_id,
            handoff.node_id,
            `Dashboard marked ${rawReviewKind} for ${record.title ?? record.external_id} as ${rawStatus}.`,
            sourceHandoffRedirect(rawHandoffActionId),
            JSON.stringify(payload)
          )
          .run();
      }
    }

    await db
      .prepare(
        `INSERT INTO events (actor, action, entity_type, entity_id, payload_json)
         VALUES ('dashboard', 'review_notion_transfer_gap', 'source_record', ?, ?)`
      )
      .bind(`${record.source_external_id}:${record.external_id}`, JSON.stringify(payload))
      .run();

    redirect(303, sourceHandoffRedirect(rawHandoffActionId));
  },

  updateBlockerReviewHandoffStatus: async ({ request, platform }) => {
    const db = requireDb(platform);
    const form = await request.formData();
    const rawActionId = form.get('action_id');
    const rawStatus = form.get('status');

    if (typeof rawActionId !== 'string' || !/^workflow_action_notion_transfer_blocker_group_[a-z0-9]+$/.test(rawActionId)) {
      return fail(400, { error: 'Invalid blocker handoff action id.' });
    }
    if (!isBlockerHandoffActionStatus(rawStatus)) {
      return fail(400, { error: 'Invalid blocker handoff status.' });
    }

    const action = await db
      .prepare(
        `SELECT action_id, canvas_id, node_id, status, title, source_id, metadata_json
         FROM workflow_actions
         WHERE action_id = ?
           AND source_kind = 'notion_transfer_blocker_group'
         LIMIT 1`
      )
      .bind(rawActionId)
      .first<{
        action_id: string;
        canvas_id: string;
        node_id: string | null;
        status: string;
        title: string;
        source_id: string | null;
        metadata_json: string | null;
      }>();

    if (!action) {
      return fail(404, { error: 'Blocker review handoff was not found.' });
    }

    await db
      .prepare(
        `UPDATE workflow_actions
         SET status = ?,
             approved_by = CASE WHEN ? IN ('running') THEN COALESCE(approved_by, 'dashboard') ELSE approved_by END,
             approved_at = CASE WHEN ? IN ('running') THEN COALESCE(approved_at, datetime('now')) ELSE approved_at END,
             completed_at = NULL,
             updated_at = datetime('now')
         WHERE action_id = ?
           AND source_kind = 'notion_transfer_blocker_group'`
      )
      .bind(rawStatus, rawStatus, rawStatus, rawActionId)
      .run();

    const payload = {
      workflow_action_id: rawActionId,
      previous_status: action.status,
      status: rawStatus,
      source_id: action.source_id,
      title: action.title
    };
    await db
      .prepare(
        `INSERT INTO workflow_receipts (canvas_id, node_id, receipt_type, summary, artifact_url, payload_json, created_by)
         VALUES (?, ?, ?, ?, '/sources', ?, 'dashboard')`
      )
      .bind(
        action.canvas_id,
        action.node_id,
        rawStatus === 'blocked' ? 'error' : rawStatus === 'running' ? 'handoff' : 'note',
        `Dashboard moved blocker review handoff ${rawActionId} from ${action.status} to ${rawStatus}.`,
        JSON.stringify(payload)
      )
      .run();
    await db
      .prepare(
        `INSERT INTO events (actor, action, entity_type, entity_id, payload_json)
         VALUES ('dashboard', 'update_notion_transfer_blocker_review_handoff_status', 'workflow_action', ?, ?)`
      )
      .bind(rawActionId, JSON.stringify(payload))
      .run();

    redirect(303, '/sources');
  },

  createBlockerReviewHandoff: async ({ request, platform }) => {
    const db = requireDb(platform);
    const form = await request.formData();
    const rawSourceExternalId = form.get('source_external_id');
    const rawCanonicalType = form.get('canonical_type');
    const sourceExternalId = typeof rawSourceExternalId === 'string' ? rawSourceExternalId.trim() : '';
    const canonicalType = typeof rawCanonicalType === 'string' ? rawCanonicalType.trim() : '';

    if (!sourceExternalId || !/^[a-zA-Z0-9:_/-]+$/.test(sourceExternalId)) {
      return fail(400, { error: 'Invalid source external id.' });
    }
    if (!canonicalType || !/^[a-z_]+$/.test(canonicalType)) {
      return fail(400, { error: 'Invalid canonical type.' });
    }

    const rows = await db
      .prepare(
        `WITH blockers AS (
           SELECT 'binding_gap' AS blocker_kind,
                  s.name AS source_name,
                  s.external_id AS source_external_id,
                  r.id AS source_record_id,
                  r.external_id,
                  r.title,
                  r.canonical_type,
                  NULL AS review_kind,
                  NULL AS action_id,
                  NULL AS action_status,
                  NULL AS action_priority,
                  1 AS has_binding_gap,
                  CASE WHEN EXISTS (
                    SELECT 1
                    FROM source_record_relations rel
                    WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
                  ) THEN 0 ELSE 1 END AS has_relation_island
           FROM source_records r
           JOIN sources s ON s.id = r.source_id
           WHERE s.source_type = 'notion_database'
             AND s.external_id = ?
             AND r.canonical_type = ?
             AND NOT EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id)
             AND NOT EXISTS (
               SELECT 1
               FROM source_record_transfer_reviews review
               WHERE review.source_record_id = r.id
                 AND review.review_kind = 'binding_gap'
                 AND review.status IN ('reviewed', 'waived', 'needs_source_update', 'resolved')
             )
           UNION ALL
           SELECT 'relation_island' AS blocker_kind,
                  s.name AS source_name,
                  s.external_id AS source_external_id,
                  r.id AS source_record_id,
                  r.external_id,
                  r.title,
                  r.canonical_type,
                  NULL AS review_kind,
                  NULL AS action_id,
                  NULL AS action_status,
                  NULL AS action_priority,
                  CASE WHEN EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id) THEN 0 ELSE 1 END AS has_binding_gap,
                  1 AS has_relation_island
           FROM source_records r
           JOIN sources s ON s.id = r.source_id
           WHERE s.source_type = 'notion_database'
             AND s.external_id = ?
             AND r.canonical_type = ?
             AND NOT EXISTS (
               SELECT 1
               FROM source_record_relations rel
               WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
             )
             AND NOT EXISTS (
               SELECT 1
               FROM source_record_transfer_reviews review
               WHERE review.source_record_id = r.id
                 AND review.review_kind = 'relation_island'
                 AND review.status IN ('reviewed', 'waived', 'needs_source_update', 'resolved')
             )
           UNION ALL
           SELECT 'source_update_action' AS blocker_kind,
                  s.name AS source_name,
                  s.external_id AS source_external_id,
                  r.id AS source_record_id,
                  r.external_id,
                  r.title,
                  r.canonical_type,
                  review.review_kind,
                  action.action_id,
                  action.status AS action_status,
                  action.priority AS action_priority,
                  CASE WHEN EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id) THEN 0 ELSE 1 END AS has_binding_gap,
                  CASE WHEN EXISTS (
                    SELECT 1
                    FROM source_record_relations rel
                    WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
                  ) THEN 0 ELSE 1 END AS has_relation_island
           FROM workflow_actions action
           JOIN source_record_transfer_reviews review
             ON action.source_kind = 'source_record_transfer_review'
            AND action.source_id = CAST(review.id AS TEXT)
           JOIN source_records r ON r.id = review.source_record_id
           JOIN sources s ON s.id = r.source_id
           WHERE s.source_type = 'notion_database'
             AND s.external_id = ?
             AND r.canonical_type = ?
             AND review.status = 'needs_source_update'
             AND action.status IN ('proposed', 'approved', 'ready', 'running', 'blocked')
         )
         SELECT *
         FROM blockers
         ORDER BY source_name, canonical_type, blocker_kind, title, external_id
         LIMIT 501`
      )
      .bind(sourceExternalId, canonicalType, sourceExternalId, canonicalType, sourceExternalId, canonicalType)
      .all<SourceBlockerPlanRow>();

    const blockerRows = rows.results.slice(0, 500);
    if (blockerRows.length === 0) {
      return fail(404, { error: 'No active blockers were found for this group.' });
    }

    const sourceName = blockerRows[0]?.source_name ?? sourceExternalId;
    const blockerCounts: Record<string, number> = {};
    const actionStatusCounts: Record<string, number> = {};
    for (const row of blockerRows) {
      blockerCounts[row.blocker_kind] = (blockerCounts[row.blocker_kind] ?? 0) + 1;
      if (row.action_status) actionStatusCounts[row.action_status] = (actionStatusCounts[row.action_status] ?? 0) + 1;
    }
    const proposedReviewAction =
      Object.keys(actionStatusCounts).length > 0
        ? 'collect_source_truth_proof'
        : (blockerCounts.binding_gap ?? 0) > 0
          ? 'review_binding_or_mark_source_update'
          : 'review_relation_or_mark_source_update';
    const samples = blockerRows.slice(0, BLOCKER_PLAN_SAMPLE_LIMIT).map((row) => ({
      blocker_kind: row.blocker_kind,
      source_record_id: row.source_record_id,
      external_id: row.external_id,
      title: row.title,
      canonical_type: row.canonical_type,
      review_kind: row.review_kind,
      action_id: row.action_id,
      action_status: row.action_status,
      action_priority: row.action_priority,
      has_binding_gap: Boolean(row.has_binding_gap),
      has_relation_island: Boolean(row.has_relation_island)
    }));
    const canvasId = 'create-something-internal-operating-system-source-map';
    const actionId = blockerGroupActionId(sourceExternalId, canonicalType);
    const groupKey = `${sourceName} / ${canonicalType}`;
    const metadata = {
      source_external_id: sourceExternalId,
      source_name: sourceName,
      canonical_type: canonicalType,
      group_key: groupKey,
      blocker_counts: blockerCounts,
      action_status_counts: actionStatusCounts,
      proposed_review_action: proposedReviewAction,
      sample_limit: BLOCKER_PLAN_SAMPLE_LIMIT,
      row_limit: 500,
      truncated: rows.results.length > 500,
      samples
    };

    await db
      .prepare(
        `INSERT INTO atlas_canvases (canvas_id, title, client, workflow, owner, status, source_kind, source_id, metadata_json)
         VALUES (?, 'CREATE SOMETHING internal operating source map', 'CREATE SOMETHING', 'Notion transfer', 'CREATE SOMETHING', 'run', 'notion_transfer', 'create-something', ?)
         ON CONFLICT (canvas_id)
         DO UPDATE SET workflow = COALESCE(atlas_canvases.workflow, excluded.workflow), updated_at = datetime('now')`
      )
      .bind(canvasId, JSON.stringify({ purpose: 'notion_transfer_blocker_review_handoffs' }))
      .run();
    await db
      .prepare(
        `INSERT INTO workflow_actions (
           action_id, canvas_id, title, description, action_kind, status, gate_kind,
           priority, owner, proposed_by, source_kind, source_id, artifact_url, metadata_json
         )
         VALUES (?, ?, ?, ?, 'handoff', 'proposed', 'review', 'P1', 'CREATE SOMETHING', 'dashboard', 'notion_transfer_blocker_group', ?, '/sources', ?)
         ON CONFLICT (action_id)
         DO UPDATE SET
           title = excluded.title,
           description = excluded.description,
           owner = excluded.owner,
           proposed_by = excluded.proposed_by,
           artifact_url = excluded.artifact_url,
           metadata_json = excluded.metadata_json,
           updated_at = datetime('now')`
      )
      .bind(
        actionId,
        canvasId,
        `Review Notion transfer blockers: ${groupKey}`,
        `${blockerRows.length} active blocker(s). Proposed action: ${proposedReviewAction.replaceAll('_', ' ')}.`,
        `${sourceExternalId}:${canonicalType}`,
        JSON.stringify(metadata)
      )
      .run();
    await db
      .prepare(
        `INSERT INTO workflow_receipts (canvas_id, receipt_type, summary, artifact_url, payload_json, created_by)
         VALUES (?, 'handoff', ?, '/sources', ?, 'dashboard')`
      )
      .bind(canvasId, `Created blocker review handoff ${actionId} for ${groupKey}.`, JSON.stringify({ workflow_action_id: actionId, ...metadata }))
      .run();
    await db
      .prepare(
        `INSERT INTO events (actor, action, entity_type, entity_id, payload_json)
         VALUES ('dashboard', 'create_notion_transfer_blocker_review_handoff', 'workflow_action', ?, ?)`
      )
      .bind(
        actionId,
        JSON.stringify({
          source_external_id: sourceExternalId,
          canonical_type: canonicalType,
          total_blockers: blockerRows.length,
          blocker_counts: blockerCounts,
          action_status_counts: actionStatusCounts
        })
      )
      .run();

    redirect(303, '/sources');
  },

  markNeedsSourceUpdate: async ({ request, platform }) => {
    const db = requireDb(platform);
    const form = await request.formData();
    const rawSourceRecordId = form.get('source_record_id');
    const rawReviewKind = form.get('review_kind');
    const title = typeof form.get('title') === 'string' ? form.get('title') : null;

    if (typeof rawSourceRecordId !== 'string' || !/^\d+$/.test(rawSourceRecordId)) {
      return fail(400, { error: 'Invalid source record id.' });
    }
    if (!isTransferReviewKind(rawReviewKind)) {
      return fail(400, { error: 'Invalid transfer review kind.' });
    }

    const sourceRecordId = Number(rawSourceRecordId);
    const record = await db
      .prepare(
        `SELECT r.id, r.external_id, r.title, s.external_id AS source_external_id, s.name AS source_name
         FROM source_records r
         JOIN sources s ON s.id = r.source_id
         WHERE r.id = ? AND s.source_type = 'notion_database'
         LIMIT 1`
      )
      .bind(sourceRecordId)
      .first<{ id: number; external_id: string; title: string | null; source_external_id: string; source_name: string }>();

    if (!record) {
      return fail(404, { error: 'Source record was not found.' });
    }

    const gapExists =
      rawReviewKind === 'binding_gap'
        ? await db
            .prepare('SELECT 1 AS ok WHERE NOT EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = ?)')
            .bind(sourceRecordId)
            .first<{ ok: number }>()
        : await db
            .prepare(
              `SELECT 1 AS ok
               WHERE NOT EXISTS (
                 SELECT 1
                 FROM source_record_relations rel
                 WHERE rel.source_record_id = ? OR rel.target_source_record_id = ?
               )`
            )
            .bind(sourceRecordId, sourceRecordId)
            .first<{ ok: number }>();

    if (!gapExists) {
      return fail(409, { error: 'This transfer gap no longer exists.' });
    }

    await db
      .prepare(
        `INSERT INTO source_record_transfer_reviews (
           source_record_id, review_kind, status, reason, owner, reviewed_by, metadata_json
         )
         VALUES (?, ?, 'needs_source_update', ?, 'CREATE SOMETHING', 'dashboard', ?)
         ON CONFLICT (source_record_id, review_kind)
         DO UPDATE SET
           status = excluded.status,
           reason = excluded.reason,
           owner = excluded.owner,
           reviewed_by = excluded.reviewed_by,
           metadata_json = excluded.metadata_json,
           updated_at = datetime('now')`
      )
      .bind(
        sourceRecordId,
        rawReviewKind,
        'Dashboard review: needs source-truth update before client Atlas rollout.',
        JSON.stringify({ surface: 'dashboard:/sources', title: title ?? record.title ?? record.external_id })
      )
      .run();

    await db
      .prepare(
        `INSERT INTO events (actor, action, entity_type, entity_id, payload_json)
         VALUES ('dashboard', 'upsert_source_record_transfer_review', 'source_record', ?, ?)`
      )
      .bind(
        `${record.source_external_id}:${record.external_id}`,
        JSON.stringify({
          source_record_id: sourceRecordId,
          review_kind: rawReviewKind,
          status: 'needs_source_update',
          source_name: record.source_name
        })
      )
      .run();

    redirect(303, '/sources');
  },

  updateSourceUpdateActionStatus: async ({ request, platform }) => {
    const db = requireDb(platform);
    const form = await request.formData();
    const rawActionId = form.get('action_id');
    const rawStatus = form.get('status');

    if (typeof rawActionId !== 'string' || !/^workflow_action_source_transfer_review_\d+$/.test(rawActionId)) {
      return fail(400, { error: 'Invalid source-update action id.' });
    }
    if (!isSourceUpdateActionStatus(rawStatus)) {
      return fail(400, { error: 'Invalid source-update action status.' });
    }

    const action = await db
      .prepare(
        `SELECT action.action_id, action.canvas_id, action.node_id, action.status, action.source_id, review.id AS review_id,
                r.external_id, r.title, s.external_id AS source_external_id
         FROM workflow_actions action
         JOIN source_record_transfer_reviews review
           ON action.source_kind = 'source_record_transfer_review'
          AND action.source_id = CAST(review.id AS TEXT)
         JOIN source_records r ON r.id = review.source_record_id
         JOIN sources s ON s.id = r.source_id
         WHERE action.action_id = ?
           AND action.source_kind = 'source_record_transfer_review'
           AND review.status = 'needs_source_update'
           AND s.source_type = 'notion_database'
         LIMIT 1`
      )
      .bind(rawActionId)
      .first<{
        action_id: string;
        canvas_id: string;
        node_id: string | null;
        status: string;
        source_id: string;
        review_id: number;
        external_id: string;
        title: string | null;
        source_external_id: string;
      }>();

    if (!action) {
      return fail(404, { error: 'Source-update workflow action was not found.' });
    }

    await db
      .prepare(
        `UPDATE workflow_actions
         SET status = ?,
             approved_by = CASE WHEN ? IN ('running') THEN COALESCE(approved_by, 'dashboard') ELSE approved_by END,
             approved_at = CASE WHEN ? IN ('running') THEN COALESCE(approved_at, datetime('now')) ELSE approved_at END,
             completed_at = NULL,
             updated_at = datetime('now')
         WHERE action_id = ?`
      )
      .bind(rawStatus, rawStatus, rawStatus, rawActionId)
      .run();

    const receiptSummary = `Dashboard moved source-update action ${rawActionId} from ${action.status} to ${rawStatus}.`;
    await db
      .prepare(
        `INSERT INTO workflow_receipts (
           canvas_id, node_id, receipt_type, summary, artifact_url, payload_json, created_by
         )
         VALUES (?, ?, ?, ?, '/sources', ?, 'dashboard')`
      )
      .bind(
        action.canvas_id,
        action.node_id,
        rawStatus === 'blocked' ? 'error' : rawStatus === 'running' ? 'handoff' : 'note',
        receiptSummary,
        JSON.stringify({
          workflow_action_id: rawActionId,
          review_id: action.review_id,
          previous_status: action.status,
          status: rawStatus,
          source_record: `${action.source_external_id}:${action.external_id}`,
          title: action.title
        })
      )
      .run();

    await db
      .prepare(
        `INSERT INTO events (actor, action, entity_type, entity_id, payload_json)
         VALUES ('dashboard', 'update_source_update_action_status', 'workflow_action', ?, ?)`
      )
      .bind(
        rawActionId,
        JSON.stringify({
          review_id: action.review_id,
          previous_status: action.status,
          status: rawStatus,
          source_record: `${action.source_external_id}:${action.external_id}`,
          title: action.title
        })
      )
      .run();

    redirect(303, '/sources');
  },

  recordSourceUpdateResult: async ({ request, platform }) => {
    const db = requireDb(platform);
    const form = await request.formData();
    const rawActionId = form.get('action_id');
    const rawEvidence = form.get('evidence');

    if (typeof rawActionId !== 'string' || !/^workflow_action_source_transfer_review_\d+$/.test(rawActionId)) {
      return fail(400, { error: 'Invalid source-update action id.' });
    }
    if (typeof rawEvidence !== 'string' || rawEvidence.trim().length < 10) {
      return fail(400, { error: 'Source-update proof requires evidence.' });
    }

    const evidence = rawEvidence.trim();
    const action = await db
      .prepare(
        `SELECT action.action_id, action.canvas_id, action.node_id, action.status, action.source_id, review.id AS review_id,
                r.external_id, r.title, s.external_id AS source_external_id
         FROM workflow_actions action
         JOIN source_record_transfer_reviews review
           ON action.source_kind = 'source_record_transfer_review'
          AND action.source_id = CAST(review.id AS TEXT)
         JOIN source_records r ON r.id = review.source_record_id
         JOIN sources s ON s.id = r.source_id
         WHERE action.action_id = ?
           AND action.source_kind = 'source_record_transfer_review'
           AND action.status = 'running'
           AND review.status = 'needs_source_update'
           AND s.source_type = 'notion_database'
         LIMIT 1`
      )
      .bind(rawActionId)
      .first<{
        action_id: string;
        canvas_id: string;
        node_id: string | null;
        status: string;
        source_id: string;
        review_id: number;
        external_id: string;
        title: string | null;
        source_external_id: string;
      }>();

    if (!action) {
      return fail(404, { error: 'Running source-update workflow action was not found.' });
    }

    await db
      .prepare(
        `UPDATE workflow_actions
         SET status = 'completed',
             approved_by = COALESCE(approved_by, 'dashboard'),
             approved_at = COALESCE(approved_at, datetime('now')),
             completed_at = COALESCE(completed_at, datetime('now')),
             evidence = ?,
             artifact_url = COALESCE(artifact_url, '/sources'),
             updated_at = datetime('now')
         WHERE action_id = ?`
      )
      .bind(evidence, rawActionId)
      .run();

    await db
      .prepare(
        `UPDATE source_record_transfer_reviews
         SET status = 'resolved',
             reason = ?,
             reviewed_by = 'dashboard',
             updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(evidence, action.review_id)
      .run();

    const receiptSummary = `Dashboard recorded source-update proof for ${rawActionId}; action completed and transfer review resolved.`;
    const payload = {
      workflow_action_id: rawActionId,
      review_id: action.review_id,
      previous_status: action.status,
      status: 'completed',
      review_status: 'resolved',
      result: 'resolved',
      evidence,
      source_record: `${action.source_external_id}:${action.external_id}`,
      title: action.title
    };
    await db
      .prepare(
        `INSERT INTO workflow_receipts (
           canvas_id, node_id, receipt_type, summary, artifact_url, payload_json, created_by
         )
         VALUES (?, ?, 'proof', ?, '/sources', ?, 'dashboard')`
      )
      .bind(action.canvas_id, action.node_id, receiptSummary, JSON.stringify(payload))
      .run();

    await db
      .prepare(
        `INSERT INTO events (actor, action, entity_type, entity_id, payload_json)
         VALUES ('dashboard', 'record_source_update_result', 'workflow_action', ?, ?)`
      )
      .bind(rawActionId, JSON.stringify(payload))
      .run();

    redirect(303, '/sources');
  }
};
