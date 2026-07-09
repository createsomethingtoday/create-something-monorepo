#!/usr/bin/env node
/**
 * Convert a local Atlas Studio session JSON file into D1-compatible SQL for
 * the canonical Atlas workflow tables.
 *
 * Usage:
 *   node packages/app-governance-db/scripts/import-atlas-session.mjs \
 *     "$HOME/Library/Application Support/CREATE SOMETHING/Atlas Studio/sessions/<session>.json" \
 *     > /tmp/atlas-import.sql
 *
 * Apply:
 *   wrangler d1 execute app-governance-db --remote --file=/tmp/atlas-import.sql
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function sqlString(value) {
  if (value === undefined || value === null || value === '') return 'NULL';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlNumber(value) {
  return Number.isFinite(value) ? String(value) : 'NULL';
}

function compactJson(value) {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}

function normalizeStatus(status) {
  return ['run', 'wait', 'stop', 'unknown'].includes(status) ? status : 'unknown';
}

function normalizeKind(kind) {
  return ['actor', 'human', 'ai', 'system', 'data', 'constraint', 'touchpoint'].includes(kind) ? kind : 'system';
}

export function loadAtlasSession(file) {
  const session = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!session?.id || !session?.canvas?.nodes || !session?.canvas?.edges) {
    throw new Error(`Not an Atlas Studio session JSON file: ${file}`);
  }
  return session;
}

export function atlasSessionToSql(session, options = {}) {
  const actor = options.actor ?? 'atlas-session-import';
  const importRunId = `atlas-import:${session.id}`;
  const statements = options.transaction === false ? [] : ['BEGIN;'];

  statements.push(
    `INSERT INTO atlas_canvases (canvas_id, title, client, workflow, owner, status, source_kind, source_id, metadata_json)
VALUES (${sqlString(session.id)}, ${sqlString(`${session.client ?? 'Atlas'} - ${session.workflow ?? session.id}`)}, ${sqlString(session.client)}, ${sqlString(session.workflow)}, ${sqlString(session.owner)}, 'run', 'atlas_studio', ${sqlString(session.id)}, ${sqlString(compactJson({
      version: session.version,
      products: session.products,
      productLinks: session.productLinks,
      sessionCreatedAt: session.createdAt,
      sessionUpdatedAt: session.updatedAt,
    }))})
ON CONFLICT (canvas_id)
DO UPDATE SET
  title = excluded.title,
  client = COALESCE(excluded.client, atlas_canvases.client),
  workflow = COALESCE(excluded.workflow, atlas_canvases.workflow),
  owner = COALESCE(excluded.owner, atlas_canvases.owner),
  status = excluded.status,
  source_kind = excluded.source_kind,
  source_id = excluded.source_id,
  metadata_json = excluded.metadata_json,
  updated_at = datetime('now');`,
  );

  for (const node of session.canvas.nodes) {
    statements.push(
      `INSERT INTO atlas_nodes (node_id, canvas_id, kind, label, owner, status, notes, evidence, x, y, width, height, metadata_json)
VALUES (${sqlString(node.id)}, ${sqlString(session.id)}, ${sqlString(normalizeKind(node.kind))}, ${sqlString(node.label)}, ${sqlString(node.owner)}, ${sqlString(normalizeStatus(node.status))}, ${sqlString(node.notes)}, ${sqlString(node.evidence)}, ${sqlNumber(node.x)}, ${sqlNumber(node.y)}, ${sqlNumber(node.width)}, ${sqlNumber(node.height)}, ${sqlString(compactJson({
        atlasId: node.atlasId,
        products: node.products,
        governanceRecords: node.governanceRecords,
        bindings: node.bindings,
        sync: node.sync,
        createdBy: node.createdBy,
        updatedAt: node.updatedAt,
      }))})
ON CONFLICT (node_id)
DO UPDATE SET
  canvas_id = excluded.canvas_id,
  kind = excluded.kind,
  label = excluded.label,
  owner = COALESCE(excluded.owner, atlas_nodes.owner),
  status = excluded.status,
  notes = COALESCE(excluded.notes, atlas_nodes.notes),
  evidence = COALESCE(excluded.evidence, atlas_nodes.evidence),
  x = COALESCE(excluded.x, atlas_nodes.x),
  y = COALESCE(excluded.y, atlas_nodes.y),
  width = COALESCE(excluded.width, atlas_nodes.width),
  height = COALESCE(excluded.height, atlas_nodes.height),
  metadata_json = COALESCE(excluded.metadata_json, atlas_nodes.metadata_json),
  updated_at = datetime('now');`,
    );
  }

  for (const edge of session.canvas.edges) {
    statements.push(
      `INSERT INTO atlas_edges (edge_id, canvas_id, source_node_id, target_node_id, label, evidence, metadata_json)
VALUES (${sqlString(edge.id)}, ${sqlString(session.id)}, ${sqlString(edge.source)}, ${sqlString(edge.target)}, ${sqlString(edge.label)}, ${sqlString(edge.evidence)}, ${sqlString(compactJson({
        createdBy: edge.createdBy,
        updatedAt: edge.updatedAt,
      }))})
ON CONFLICT (edge_id)
DO UPDATE SET
  canvas_id = excluded.canvas_id,
  source_node_id = excluded.source_node_id,
  target_node_id = excluded.target_node_id,
  label = COALESCE(excluded.label, atlas_edges.label),
  evidence = COALESCE(excluded.evidence, atlas_edges.evidence),
  metadata_json = COALESCE(excluded.metadata_json, atlas_edges.metadata_json),
  updated_at = datetime('now');`,
    );
  }

  statements.push(
    `INSERT INTO workflow_runs (run_id, canvas_id, status, actor, completed_at, output_json, receipt_url)
VALUES (${sqlString(importRunId)}, ${sqlString(session.id)}, 'succeeded', ${sqlString(actor)}, datetime('now'), ${sqlString(compactJson({
      nodes: session.canvas.nodes.length,
      edges: session.canvas.edges.length,
      observations: session.observations?.length ?? 0,
    }))}, ${sqlString(options.receiptUrl)})
ON CONFLICT (run_id)
DO UPDATE SET
  status = excluded.status,
  completed_at = excluded.completed_at,
  output_json = excluded.output_json,
  receipt_url = COALESCE(excluded.receipt_url, workflow_runs.receipt_url),
  updated_at = datetime('now');`,
  );

  const importSummary = `Imported Atlas Studio session ${session.id}: ${session.canvas.nodes.length} nodes, ${session.canvas.edges.length} edges, ${session.observations?.length ?? 0} observations.`;
  statements.push(
    `DELETE FROM workflow_receipts
WHERE run_id = ${sqlString(importRunId)}
  AND canvas_id = ${sqlString(session.id)};`,
  );

  statements.push(
    `INSERT INTO workflow_receipts (run_id, canvas_id, receipt_type, summary, artifact_url, payload_json, created_by)
VALUES (${sqlString(importRunId)}, ${sqlString(session.id)}, 'sync', ${sqlString(importSummary)}, ${sqlString(options.receiptUrl)}, ${sqlString(compactJson({
      sessionUpdatedAt: session.updatedAt,
      nodes: session.canvas.nodes.length,
      edges: session.canvas.edges.length,
    }))}, ${sqlString(actor)});`,
  );

  for (const observation of session.observations ?? []) {
    statements.push(
      `INSERT INTO workflow_receipts (run_id, canvas_id, receipt_type, summary, payload_json, created_by, created_at)
VALUES (${sqlString(importRunId)}, ${sqlString(session.id)}, 'note', ${sqlString(observation.text)}, ${sqlString(compactJson(observation))}, ${sqlString(observation.source ?? actor)}, ${sqlString(observation.createdAt)});`,
    );
  }

  if (options.transaction !== false) statements.push('COMMIT;');
  return `${statements.join('\n\n')}\n`;
}

export function atlasSessionSummary(session) {
  return {
    canvas_id: session.id,
    client: session.client ?? null,
    workflow: session.workflow ?? null,
    owner: session.owner ?? null,
    nodes: session.canvas.nodes.length,
    edges: session.canvas.edges.length,
    observations: session.observations?.length ?? 0,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2).filter((arg) => arg !== '--');
  const file = args[0];
  if (!file || process.argv.includes('--help')) {
    console.error(`Usage: ${path.basename(process.argv[1])} <atlas-session.json> [--summary] [--actor name] [--receipt-url url] [--no-transaction]`);
    process.exit(file ? 0 : 1);
  }

  const actorIndex = args.indexOf('--actor');
  const receiptIndex = args.indexOf('--receipt-url');
  const session = loadAtlasSession(file);
  if (args.includes('--summary')) {
    console.log(JSON.stringify(atlasSessionSummary(session), null, 2));
  } else {
    process.stdout.write(
      atlasSessionToSql(session, {
        actor: actorIndex >= 0 ? args[actorIndex + 1] : undefined,
        receiptUrl: receiptIndex >= 0 ? args[receiptIndex + 1] : undefined,
        transaction: args.includes('--no-transaction') ? false : undefined,
      }),
    );
  }
}
