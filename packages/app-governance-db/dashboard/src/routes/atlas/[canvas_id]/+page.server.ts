import { error } from '@sveltejs/kit';
import { requireDb } from '$lib/server/db';
import type { PageServerLoad } from './$types';

type CanvasDetailRow = {
  canvas_id: string;
  title: string;
  client: string | null;
  workflow: string | null;
  owner: string | null;
  status: string;
  source_kind: string | null;
  source_id: string | null;
  metadata_json: string | null;
  updated_at: string;
};

type AtlasNodeDetailRow = {
  node_id: string;
  kind: string;
  label: string;
  owner: string | null;
  status: string;
  notes: string | null;
  evidence: string | null;
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
  metadata_json: string | null;
  updated_at: string;
};

type AtlasEdgeDetailRow = {
  edge_id: string;
  source_node_id: string;
  source_label: string | null;
  target_node_id: string;
  target_label: string | null;
  label: string | null;
  evidence: string | null;
  metadata_json: string | null;
};

type SourceBindingRow = {
  id: number;
  binding_kind: string;
  confidence: number | null;
  reason: string | null;
  node_id: string;
  node_label: string | null;
  source_name: string;
  source_type: string;
  source_external_id: string;
  record_external_id: string;
  record_title: string | null;
  canonical_type: string;
  substrate_id: string | null;
  identity_state: string;
  migration_state: string;
};

type SourceRelationRow = {
  id: number;
  relation_kind: string;
  evidence_kind: string;
  confidence: number;
  reason: string | null;
  source_record_id: number;
  source_title: string | null;
  source_type: string;
  source_node_id: string | null;
  target_record_id: number;
  target_title: string | null;
  target_type: string;
  target_node_id: string | null;
};

type ReceiptRow = {
  id: number;
  node_id: string | null;
  receipt_type: string;
  summary: string;
  artifact_url: string | null;
  created_by: string;
  created_at: string;
};

type WorkflowRunRow = {
  run_id: string;
  node_id: string | null;
  node_label: string | null;
  status: string;
  actor: string;
  started_at: string;
  completed_at: string | null;
  input_json: string | null;
  output_json: string | null;
  receipt_url: string | null;
  error: string | null;
  updated_at: string;
};

type WorkflowActionRow = {
  action_id: string;
  node_id: string | null;
  node_label: string | null;
  run_id: string | null;
  title: string;
  description: string | null;
  action_kind: string;
  status: string;
  gate_kind: string;
  priority: string;
  owner: string | null;
  proposed_by: string;
  approved_by: string | null;
  source_kind: string | null;
  source_id: string | null;
  artifact_url: string | null;
  evidence: string | null;
  approved_at: string | null;
  completed_at: string | null;
  updated_at: string;
};

export const load: PageServerLoad = async ({ platform, params }) => {
  const db = requireDb(platform);
  const canvasId = decodeURIComponent(params.canvas_id);
  const canvas = await db
    .prepare(
      `SELECT canvas_id, title, client, workflow, owner, status, source_kind, source_id, metadata_json, updated_at
       FROM atlas_canvases
       WHERE canvas_id = ?`
    )
    .bind(canvasId)
    .first<CanvasDetailRow>();

  if (!canvas) {
    error(404, `Atlas canvas ${canvasId} not found.`);
  }

  const [nodes, edges, bindings, relations, runs, actions, receipts] = await Promise.all([
    db
      .prepare(
        `SELECT node_id, kind, label, owner, status, notes, evidence, x, y, width, height, metadata_json, updated_at
         FROM atlas_nodes
         WHERE canvas_id = ?
         ORDER BY kind, label`
      )
      .bind(canvasId)
      .all<AtlasNodeDetailRow>(),
    db
      .prepare(
        `SELECT e.edge_id, e.source_node_id, sn.label AS source_label,
                e.target_node_id, tn.label AS target_label, e.label, e.evidence, e.metadata_json
         FROM atlas_edges e
         LEFT JOIN atlas_nodes sn ON sn.node_id = e.source_node_id
         LEFT JOIN atlas_nodes tn ON tn.node_id = e.target_node_id
         WHERE e.canvas_id = ?
         ORDER BY e.label, sn.label, tn.label`
      )
      .bind(canvasId)
      .all<AtlasEdgeDetailRow>(),
    db
      .prepare(
        `SELECT b.id, b.binding_kind, b.confidence, b.reason, b.node_id, n.label AS node_label,
                s.name AS source_name, s.source_type, s.external_id AS source_external_id,
                r.external_id AS record_external_id, r.title AS record_title, r.canonical_type,
                r.substrate_id, r.identity_state, r.migration_state
         FROM source_record_atlas_bindings b
         JOIN source_records r ON r.id = b.source_record_id
         JOIN sources s ON s.id = r.source_id
         LEFT JOIN atlas_nodes n ON n.node_id = b.node_id
         WHERE b.canvas_id = ?
         ORDER BY b.binding_kind, s.name, r.canonical_type, r.title
         LIMIT 250`
      )
      .bind(canvasId)
      .all<SourceBindingRow>(),
    db
      .prepare(
        `WITH bound AS (
           SELECT source_record_id, node_id
           FROM source_record_atlas_bindings
           WHERE canvas_id = ?
         )
         SELECT rel.id, rel.relation_kind, rel.evidence_kind, rel.confidence, rel.reason,
                rel.source_record_id, sr.title AS source_title, sr.canonical_type AS source_type,
                source_bound.node_id AS source_node_id,
                rel.target_source_record_id AS target_record_id, tr.title AS target_title,
                tr.canonical_type AS target_type, target_bound.node_id AS target_node_id
         FROM source_record_relations rel
         JOIN bound source_bound ON source_bound.source_record_id = rel.source_record_id
         JOIN bound target_bound ON target_bound.source_record_id = rel.target_source_record_id
         JOIN source_records sr ON sr.id = rel.source_record_id
         JOIN source_records tr ON tr.id = rel.target_source_record_id
         ORDER BY rel.relation_kind, rel.evidence_kind, rel.confidence DESC, sr.title, tr.title
         LIMIT 250`
      )
      .bind(canvasId)
      .all<SourceRelationRow>(),
    db
      .prepare(
        `SELECT wr.run_id, wr.node_id, n.label AS node_label, wr.status, wr.actor,
                wr.started_at, wr.completed_at, wr.input_json, wr.output_json,
                wr.receipt_url, wr.error, wr.updated_at
         FROM workflow_runs wr
         LEFT JOIN atlas_nodes n ON n.node_id = wr.node_id
         WHERE wr.canvas_id = ?
         ORDER BY wr.updated_at DESC, wr.started_at DESC
         LIMIT 50`
      )
      .bind(canvasId)
      .all<WorkflowRunRow>(),
    db
      .prepare(
        `SELECT a.action_id, a.node_id, n.label AS node_label, a.run_id, a.title, a.description,
                a.action_kind, a.status, a.gate_kind, a.priority, a.owner, a.proposed_by,
                a.approved_by, a.source_kind, a.source_id, a.artifact_url, a.evidence,
                a.approved_at, a.completed_at, a.updated_at
         FROM workflow_actions a
         LEFT JOIN atlas_nodes n ON n.node_id = a.node_id
         WHERE a.canvas_id = ?
         ORDER BY
           CASE a.priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 ELSE 3 END,
           a.updated_at DESC
         LIMIT 50`
      )
      .bind(canvasId)
      .all<WorkflowActionRow>(),
    db
      .prepare(
        `SELECT id, node_id, receipt_type, summary, artifact_url, created_by, created_at
         FROM workflow_receipts
         WHERE canvas_id = ?
         ORDER BY id DESC
         LIMIT 50`
      )
      .bind(canvasId)
      .all<ReceiptRow>()
  ]);

  return {
    canvas,
    nodes: nodes.results,
    edges: edges.results,
    bindings: bindings.results,
    relations: relations.results,
    runs: runs.results,
    actions: actions.results,
    receipts: receipts.results
  };
};
