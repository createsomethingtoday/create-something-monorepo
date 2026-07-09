import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');

function applySql(dbPath, sql) {
  execFileSync('sqlite3', [dbPath], { input: `PRAGMA foreign_keys=ON;\n${sql}`, encoding: 'utf8' });
}

function queryScalar(dbPath, sql) {
  return execFileSync('sqlite3', [dbPath, sql], { encoding: 'utf8' }).trim();
}

function applyMigrations(dbPath) {
  for (const file of fs.readdirSync(path.join(packageRoot, 'migrations')).filter((name) => name.endsWith('.sql')).sort()) {
    applySql(dbPath, fs.readFileSync(path.join(packageRoot, 'migrations', file), 'utf8'));
  }
}

test('source record import ledger tracks Notion identity hygiene and run state', () => {
  const dbPath = path.join(os.tmpdir(), `app-governance-source-records-${process.pid}.sqlite`);
  try {
    fs.rmSync(dbPath, { force: true });
    applyMigrations(dbPath);
    applySql(
      dbPath,
      `
      INSERT INTO atlas_canvases (canvas_id, title, client, workflow, status)
      VALUES ('create-something-notion-migration', 'CREATE SOMETHING Notion migration', 'CREATE SOMETHING', 'Notion migration', 'run');

      INSERT INTO atlas_nodes (node_id, canvas_id, kind, label, status)
      VALUES ('notion_clients', 'create-something-notion-migration', 'data', 'Notion Clients database', 'wait');

      INSERT INTO sources (source_type, external_id, name, workspace, atlas_canvas_id, atlas_node_id)
      VALUES ('notion_database', 'notion-clients-db', 'Clients', 'CREATE SOMETHING Notion', 'create-something-notion-migration', 'notion_clients');

      INSERT INTO source_records (
        source_id, external_id, record_kind, title, canonical_type, substrate_id,
        atlas_canvas_id, atlas_node_id, identity_state, migration_state, payload_json
      )
      SELECT id, 'notion-page-1', 'row', 'Ona', 'client', 'client_ona',
             'create-something-notion-migration', 'notion_clients', 'mapped', 'ready', '{"name":"Ona"}'
      FROM sources WHERE source_type = 'notion_database' AND external_id = 'notion-clients-db';

      INSERT INTO source_records (
        source_id, external_id, record_kind, title, canonical_type, identity_state, migration_state, payload_json
      )
      SELECT id, 'notion-page-2', 'row', 'Client without Substrate ID', 'client', 'missing_substrate', 'discovered', '{"name":"Missing"}'
      FROM sources WHERE source_type = 'notion_database' AND external_id = 'notion-clients-db';

      INSERT INTO source_import_runs (
        run_id, source_id, status, actor, cursor_before, cursor_after,
        received, upserted, missing_substrate, error_count, completed_at
      )
      SELECT 'notion-import-run-1', id, 'succeeded', 'test-agent', NULL, 'cursor-2',
             2, 2, 1, 0, datetime('now')
      FROM sources WHERE source_type = 'notion_database' AND external_id = 'notion-clients-db';
      `,
    );

    assert.equal(queryScalar(dbPath, 'SELECT COUNT(*) FROM source_records;'), '2');
    assert.equal(queryScalar(dbPath, "SELECT COUNT(*) FROM source_records WHERE substrate_id IS NULL OR substrate_id = '';"), '1');
    assert.equal(queryScalar(dbPath, "SELECT COUNT(*) FROM source_records WHERE identity_state = 'mapped';"), '1');
    assert.equal(queryScalar(dbPath, "SELECT missing_substrate FROM source_import_runs WHERE run_id = 'notion-import-run-1';"), '1');

    applySql(
      dbPath,
      `
      INSERT INTO source_records (
        source_id, external_id, record_kind, title, canonical_type, substrate_id,
        atlas_canvas_id, atlas_node_id, identity_state, migration_state
      )
      SELECT id, 'notion-page-2', 'row', 'Client without Substrate ID', 'client', 'client_new',
             'create-something-notion-migration', 'notion_clients', 'mapped', 'ready'
      FROM sources WHERE source_type = 'notion_database' AND external_id = 'notion-clients-db'
      ON CONFLICT (source_id, external_id)
      DO UPDATE SET
        substrate_id = excluded.substrate_id,
        atlas_canvas_id = excluded.atlas_canvas_id,
        atlas_node_id = excluded.atlas_node_id,
        identity_state = excluded.identity_state,
        migration_state = excluded.migration_state,
        updated_at = datetime('now');
      `,
    );

    assert.equal(queryScalar(dbPath, 'SELECT COUNT(*) FROM source_records;'), '2');
    assert.equal(queryScalar(dbPath, "SELECT COUNT(*) FROM source_records WHERE substrate_id IS NULL OR substrate_id = '';"), '0');
    assert.equal(queryScalar(dbPath, "SELECT migration_state FROM source_records WHERE external_id = 'notion-page-2';"), 'ready');
  } finally {
    fs.rmSync(dbPath, { force: true });
  }
});

test('source record relations preserve evidence kind and confidence', () => {
  const dbPath = path.join(os.tmpdir(), `app-governance-source-relations-${process.pid}.sqlite`);
  try {
    fs.rmSync(dbPath, { force: true });
    applyMigrations(dbPath);
    applySql(
      dbPath,
      `
      INSERT INTO sources (source_type, external_id, name, workspace)
      VALUES ('notion_database', 'notion-clients-db', 'Clients', 'CREATE SOMETHING Notion');

      INSERT INTO source_records (
        source_id, external_id, record_kind, title, canonical_type, substrate_id, identity_state, migration_state
      )
      SELECT id, 'client-page-1', 'row', 'Cato Supply Inc.', 'client', 'substrate:client:cato', 'mapped', 'ready'
      FROM sources WHERE source_type = 'notion_database' AND external_id = 'notion-clients-db';

      INSERT INTO source_records (
        source_id, external_id, record_kind, title, canonical_type, substrate_id, identity_state, migration_state
      )
      SELECT id, 'task-page-1', 'row', 'Finalize Cato Webflow Collection pages and CMS bindings', 'task', 'substrate:task:cato-cms', 'mapped', 'ready'
      FROM sources WHERE source_type = 'notion_database' AND external_id = 'notion-clients-db';

      INSERT INTO source_record_relations (
        source_record_id, target_source_record_id, relation_kind, evidence_kind, confidence, reason
      )
      SELECT source.id, target.id, 'owns', 'alias_inferred', 0.75, 'matched alias "Cato" for Cato Supply Inc.'
      FROM source_records source
      JOIN source_records target ON target.external_id = 'task-page-1'
      WHERE source.external_id = 'client-page-1';

      INSERT INTO source_record_relations (
        source_record_id, target_source_record_id, relation_kind, evidence_kind, confidence, reason
      )
      SELECT source.id, target.id, 'owns', 'alias_inferred', 0.80, 'updated evidence'
      FROM source_records source
      JOIN source_records target ON target.external_id = 'task-page-1'
      WHERE source.external_id = 'client-page-1'
      ON CONFLICT (source_record_id, target_source_record_id, relation_kind, evidence_kind)
      DO UPDATE SET confidence = excluded.confidence, reason = excluded.reason, updated_at = datetime('now');
      `,
    );

    assert.equal(queryScalar(dbPath, 'SELECT COUNT(*) FROM source_record_relations;'), '1');
    assert.equal(queryScalar(dbPath, 'SELECT evidence_kind FROM source_record_relations;'), 'alias_inferred');
    assert.equal(queryScalar(dbPath, 'SELECT confidence FROM source_record_relations;'), '0.8');
    assert.equal(queryScalar(dbPath, 'SELECT reason FROM source_record_relations;'), 'updated evidence');
  } finally {
    fs.rmSync(dbPath, { force: true });
  }
});

test('source transfer audit can distinguish source-level coverage from row-level gaps', () => {
  const dbPath = path.join(os.tmpdir(), `app-governance-source-transfer-audit-${process.pid}.sqlite`);
  try {
    fs.rmSync(dbPath, { force: true });
    applyMigrations(dbPath);
    applySql(
      dbPath,
      `
      INSERT INTO atlas_canvases (canvas_id, title, client, workflow, status)
      VALUES ('client-map-cato', 'Cato Client Workflow Map', 'Cato', 'Client workflow source projection', 'run');

      INSERT INTO atlas_nodes (node_id, canvas_id, kind, label, status)
      VALUES ('client-map-cato_task', 'client-map-cato', 'action', 'Bound task', 'run');

      INSERT INTO sources (source_type, external_id, name, workspace)
      VALUES ('notion_database', 'notion-actions-db', 'Tasks / Actions', 'CREATE SOMETHING Notion');

      INSERT INTO source_records (
        source_id, external_id, record_kind, title, canonical_type, substrate_id, identity_state, migration_state
      )
      SELECT id, 'task-bound', 'row', 'Bound task', 'task', 'substrate:task:bound', 'mapped', 'ready'
      FROM sources WHERE external_id = 'notion-actions-db';

      INSERT INTO source_records (
        source_id, external_id, record_kind, title, canonical_type, substrate_id, identity_state, migration_state
      )
      SELECT id, 'task-related', 'row', 'Related task', 'task', 'substrate:task:related', 'mapped', 'ready'
      FROM sources WHERE external_id = 'notion-actions-db';

      INSERT INTO source_records (
        source_id, external_id, record_kind, title, canonical_type, substrate_id, identity_state, migration_state
      )
      SELECT id, 'task-island', 'row', 'Isolated task', 'task', 'substrate:task:island', 'mapped', 'ready'
      FROM sources WHERE external_id = 'notion-actions-db';

      INSERT INTO source_record_atlas_bindings (source_record_id, canvas_id, node_id, binding_kind, confidence, reason)
      SELECT id, 'client-map-cato', 'client-map-cato_task', 'client_map', 1, 'client-map binding'
      FROM source_records WHERE external_id = 'task-bound';

      INSERT INTO source_record_relations (
        source_record_id, target_source_record_id, relation_kind, evidence_kind, confidence, reason
      )
      SELECT source.id, target.id, 'depends_on', 'manual', 1, 'runtime dependency'
      FROM source_records source
      JOIN source_records target ON target.external_id = 'task-bound'
      WHERE source.external_id = 'task-related';
      `,
    );

    assert.equal(
      queryScalar(
        dbPath,
        `SELECT COUNT(*)
         FROM source_records r
         JOIN sources s ON s.id = r.source_id
         WHERE s.external_id = 'notion-actions-db'
           AND NOT EXISTS (
             SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id
           );`,
      ),
      '2',
    );
    assert.equal(
      queryScalar(
        dbPath,
        `SELECT COUNT(*)
         FROM source_records r
         JOIN sources s ON s.id = r.source_id
         WHERE s.external_id = 'notion-actions-db'
           AND NOT EXISTS (
             SELECT 1
             FROM source_record_relations rel
             WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
           );`,
      ),
      '1',
    );
  } finally {
    fs.rmSync(dbPath, { force: true });
  }
});

test('source-record Atlas projection writes source-map binding ledger', () => {
  const toolsSource = fs.readFileSync(path.join(packageRoot, 'src/tools.ts'), 'utf8');
  const projectionToolStart = toolsSource.indexOf("'governance_project_source_records_to_atlas'");
  const nextToolStart = toolsSource.indexOf("'governance_extract_source_record_relations'", projectionToolStart);
  assert.notEqual(projectionToolStart, -1);
  assert.notEqual(nextToolStart, -1);

  const projectionTool = toolsSource.slice(projectionToolStart, nextToolStart);
  assert.match(projectionTool, /INSERT INTO source_record_atlas_bindings/);
  assert.match(projectionTool, /VALUES \(\?, \?, \?, 'source_map'/);
  assert.match(projectionTool, /ON CONFLICT \(source_record_id, canvas_id, node_id, binding_kind\)/);
});

test('source record transfer reviews are idempotent per gap kind', () => {
  const dbPath = path.join(os.tmpdir(), `app-governance-source-transfer-reviews-${process.pid}.sqlite`);
  try {
    fs.rmSync(dbPath, { force: true });
    applyMigrations(dbPath);
    applySql(
      dbPath,
      `
      INSERT INTO sources (source_type, external_id, name, workspace)
      VALUES ('notion_database', 'notion-actions-db', 'Tasks / Actions', 'CREATE SOMETHING Notion');

      INSERT INTO source_records (
        source_id, external_id, record_kind, title, canonical_type, substrate_id, identity_state, migration_state
      )
      SELECT id, 'task-island', 'row', 'Isolated task', 'task', 'substrate:task:island', 'mapped', 'ready'
      FROM sources WHERE external_id = 'notion-actions-db';

      INSERT INTO source_record_transfer_reviews (
        source_record_id, review_kind, status, reason, owner, reviewed_by
      )
      SELECT id, 'relation_island', 'needs_source_update', 'missing relation properties', 'CREATE SOMETHING', 'codex'
      FROM source_records WHERE external_id = 'task-island';

      INSERT INTO source_record_transfer_reviews (
        source_record_id, review_kind, status, reason, owner, reviewed_by
      )
      SELECT id, 'relation_island', 'waived', 'internal-only task', 'CREATE SOMETHING', 'codex'
      FROM source_records WHERE external_id = 'task-island'
      ON CONFLICT (source_record_id, review_kind)
      DO UPDATE SET status = excluded.status, reason = excluded.reason, reviewed_by = excluded.reviewed_by, updated_at = datetime('now');
      `,
    );

    assert.equal(queryScalar(dbPath, 'SELECT COUNT(*) FROM source_record_transfer_reviews;'), '1');
    assert.equal(queryScalar(dbPath, 'SELECT status FROM source_record_transfer_reviews;'), 'waived');
    assert.equal(
      queryScalar(
        dbPath,
        `SELECT COUNT(*)
         FROM source_records r
         JOIN source_record_transfer_reviews review
           ON review.source_record_id = r.id
          AND review.review_kind = 'relation_island'
          AND review.status IN ('reviewed', 'waived', 'needs_source_update', 'resolved')
         WHERE NOT EXISTS (
           SELECT 1
           FROM source_record_relations rel
           WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
         );`,
      ),
      '1',
    );
  } finally {
    fs.rmSync(dbPath, { force: true });
  }
});

test('source transfer review handoff receipt preserves agent decision evidence', () => {
  const dbPath = path.join(os.tmpdir(), `app-governance-source-transfer-handoff-receipt-${process.pid}.sqlite`);
  try {
    fs.rmSync(dbPath, { force: true });
    applyMigrations(dbPath);
    applySql(
      dbPath,
      `
      INSERT INTO atlas_canvases (canvas_id, title, client, workflow, status)
      VALUES ('create-something-internal-operating-system-source-map', 'CREATE SOMETHING source map', 'CREATE SOMETHING', 'Notion transfer', 'run');

      INSERT INTO sources (source_type, external_id, name, workspace)
      VALUES ('notion_database', 'notion-tasks-db', 'Tasks / Actions', 'CREATE SOMETHING Notion');

      INSERT INTO source_records (
        source_id, external_id, record_kind, title, canonical_type, substrate_id, identity_state, migration_state
      )
      SELECT id, 'task-agent-review', 'row', 'Agent reviewed Notion transfer row', 'task', 'substrate:task:agent-review', 'mapped', 'ready'
      FROM sources WHERE external_id = 'notion-tasks-db';

      INSERT INTO workflow_actions (
        action_id, canvas_id, title, description, action_kind, status, gate_kind,
        priority, owner, proposed_by, source_kind, source_id, artifact_url
      )
      VALUES (
        'workflow_action_notion_transfer_blocker_group_agent1',
        'create-something-internal-operating-system-source-map',
        'Review Notion transfer blockers: Tasks / Actions / task',
        'Agent review handoff.',
        'handoff',
        'running',
        'review',
        'P1',
        'CREATE SOMETHING',
        'codex-agent',
        'notion_transfer_blocker_group',
        'notion-tasks-db:task',
        '/sources'
      );

      INSERT INTO source_record_transfer_reviews (
        source_record_id, review_kind, status, reason, owner, reviewed_by, metadata_json
      )
      SELECT id, 'relation_island', 'waived', 'agent-reviewed exception', 'CREATE SOMETHING', 'codex-agent',
             json_object('handoff_action_id', 'workflow_action_notion_transfer_blocker_group_agent1')
      FROM source_records WHERE external_id = 'task-agent-review';

      INSERT INTO workflow_receipts (canvas_id, node_id, receipt_type, summary, artifact_url, payload_json, created_by)
      SELECT
        action.canvas_id,
        action.node_id,
        'decision',
        'codex-agent marked relation_island for Agent reviewed Notion transfer row as waived.',
        '/sources?handoff=workflow_action_notion_transfer_blocker_group_agent1',
        json_object(
          'workflow_action_id', action.action_id,
          'source_record_id', 1,
          'source_record', 'notion-tasks-db:task-agent-review',
          'review_id', 1,
          'review_kind', 'relation_island',
          'status', 'waived',
          'source_name', 'Tasks / Actions',
          'canonical_type', 'task',
          'title', 'Agent reviewed Notion transfer row'
        ),
        'codex-agent'
      FROM workflow_actions action
      WHERE action.action_id = 'workflow_action_notion_transfer_blocker_group_agent1';
      `,
    );

    assert.equal(
      queryScalar(dbPath, "SELECT status FROM source_record_transfer_reviews WHERE review_kind = 'relation_island';"),
      'waived',
    );
    assert.equal(
      queryScalar(
        dbPath,
        "SELECT receipt_type FROM workflow_receipts WHERE json_extract(payload_json, '$.workflow_action_id') = 'workflow_action_notion_transfer_blocker_group_agent1';",
      ),
      'decision',
    );
    assert.equal(
      queryScalar(
        dbPath,
        "SELECT created_by FROM workflow_receipts WHERE json_extract(payload_json, '$.review_kind') = 'relation_island';",
      ),
      'codex-agent',
    );
    assert.equal(
      queryScalar(
        dbPath,
        "SELECT json_extract(payload_json, '$.status') FROM workflow_receipts WHERE json_extract(payload_json, '$.workflow_action_id') = 'workflow_action_notion_transfer_blocker_group_agent1';",
      ),
      'waived',
    );
    assert.equal(
      queryScalar(
        dbPath,
        `SELECT COUNT(*)
         FROM source_records r
         WHERE r.external_id = 'task-agent-review'
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
           );`,
      ),
      '0',
    );
  } finally {
    fs.rmSync(dbPath, { force: true });
  }
});

test('open transfer gap candidates advance per missing review kind', () => {
  const dbPath = path.join(os.tmpdir(), `app-governance-open-transfer-gaps-${process.pid}.sqlite`);
  try {
    fs.rmSync(dbPath, { force: true });
    applyMigrations(dbPath);
    applySql(
      dbPath,
      `
      INSERT INTO sources (source_type, external_id, name, workspace)
      VALUES ('notion_database', 'notion-clients-db', 'Clients', 'CREATE SOMETHING Notion');

      INSERT INTO source_records (
        source_id, external_id, record_kind, title, canonical_type, substrate_id, identity_state, migration_state
      )
      SELECT id, 'client-both-gaps', 'row', 'Client with two gaps', 'client', 'substrate:client:two-gaps', 'mapped', 'ready'
      FROM sources WHERE external_id = 'notion-clients-db';

      INSERT INTO source_record_transfer_reviews (
        source_record_id, review_kind, status, reason, owner, reviewed_by
      )
      SELECT id, 'relation_island', 'needs_source_update', 'needs relation source truth', 'CREATE SOMETHING', 'codex'
      FROM source_records WHERE external_id = 'client-both-gaps';
      `,
    );

    const candidateKindsSql = `
      WITH candidate AS (
        SELECT r.id AS source_record_id, s.source_type, s.name AS source_name, s.external_id AS source_external_id,
               r.external_id, r.title, r.canonical_type, 'binding_gap' AS review_kind
        FROM source_records r
        JOIN sources s ON s.id = r.source_id
        WHERE NOT EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id)
          AND NOT EXISTS (
            SELECT 1
            FROM source_record_transfer_reviews review
            WHERE review.source_record_id = r.id
              AND review.review_kind = 'binding_gap'
              AND review.status IN ('reviewed', 'waived', 'needs_source_update', 'resolved')
          )
        UNION ALL
        SELECT r.id AS source_record_id, s.source_type, s.name AS source_name, s.external_id AS source_external_id,
               r.external_id, r.title, r.canonical_type, 'relation_island' AS review_kind
        FROM source_records r
        JOIN sources s ON s.id = r.source_id
        WHERE NOT EXISTS (
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
      SELECT group_concat(review_kind, ',')
      FROM candidate
      WHERE source_type = 'notion_database' AND source_external_id = 'notion-clients-db';
    `;

    assert.equal(queryScalar(dbPath, candidateKindsSql), 'binding_gap');

    applySql(
      dbPath,
      `
      INSERT INTO source_record_transfer_reviews (
        source_record_id, review_kind, status, reason, owner, reviewed_by
      )
      SELECT id, 'binding_gap', 'needs_source_update', 'needs Atlas binding source truth', 'CREATE SOMETHING', 'codex'
      FROM source_records WHERE external_id = 'client-both-gaps';
      `,
    );

    assert.equal(queryScalar(dbPath, candidateKindsSql), '');
  } finally {
    fs.rmSync(dbPath, { force: true });
  }
});

test('source update reviews materialize into idempotent workflow actions', () => {
  const dbPath = path.join(os.tmpdir(), `app-governance-source-update-actions-${process.pid}.sqlite`);
  try {
    fs.rmSync(dbPath, { force: true });
    applyMigrations(dbPath);
    applySql(
      dbPath,
      `
      INSERT INTO atlas_canvases (canvas_id, title, client, workflow, status)
      VALUES ('create-something-internal-operating-system-source-map', 'CREATE SOMETHING source map', 'CREATE SOMETHING', 'Notion transfer', 'run');

      INSERT INTO atlas_nodes (node_id, canvas_id, kind, label, status)
      VALUES ('source_record_client_gap', 'create-something-internal-operating-system-source-map', 'data', 'Client source row', 'wait');

      INSERT INTO sources (source_type, external_id, name, workspace)
      VALUES ('notion_database', 'notion-clients-db', 'Clients', 'CREATE SOMETHING Notion');

      INSERT INTO source_records (
        source_id, external_id, record_kind, title, canonical_type, substrate_id,
        atlas_canvas_id, atlas_node_id, identity_state, migration_state
      )
      SELECT id, 'client-gap', 'row', 'Client missing active map', 'client', 'substrate:client:gap',
             'create-something-internal-operating-system-source-map', 'source_record_client_gap', 'mapped', 'ready'
      FROM sources WHERE external_id = 'notion-clients-db';

      INSERT INTO source_record_transfer_reviews (
        source_record_id, review_kind, status, reason, owner, reviewed_by, metadata_json
      )
      SELECT id, 'binding_gap', 'needs_source_update', 'needs active client Atlas map source truth',
             'CREATE SOMETHING', 'dashboard', '{"surface":"dashboard:/sources"}'
      FROM source_records WHERE external_id = 'client-gap';

      INSERT INTO workflow_actions (
        action_id, canvas_id, node_id, title, description, action_kind, status,
        gate_kind, priority, owner, proposed_by, source_kind, source_id,
        artifact_url, evidence, metadata_json
      )
      SELECT
        'workflow_action_source_transfer_review_' || review.id,
        'create-something-internal-operating-system-source-map',
        CASE WHEN r.atlas_canvas_id = 'create-something-internal-operating-system-source-map' THEN r.atlas_node_id ELSE NULL END,
        'Repair source truth: ' || r.title,
        'Source transfer review ' || review.id || ' is marked needs_source_update for ' || review.review_kind || '.',
        'task',
        'proposed',
        'review',
        'P1',
        COALESCE(review.owner, 'CREATE SOMETHING'),
        'codex',
        'source_record_transfer_review',
        CAST(review.id AS TEXT),
        'https://app-governance-dash.createsomething.agency/sources',
        review.reason,
        json_object(
          'source_transfer_review_id', review.id,
          'source_record_id', r.id,
          'record_external_id', r.external_id,
          'review_kind', review.review_kind,
          'review_status', review.status
        )
      FROM source_record_transfer_reviews review
      JOIN source_records r ON r.id = review.source_record_id
      JOIN sources s ON s.id = r.source_id
      WHERE s.source_type = 'notion_database'
        AND review.status = 'needs_source_update'
      ON CONFLICT (action_id)
      DO UPDATE SET
        status = excluded.status,
        evidence = excluded.evidence,
        metadata_json = excluded.metadata_json,
        updated_at = datetime('now');
      `,
    );

    assert.equal(queryScalar(dbPath, 'SELECT COUNT(*) FROM workflow_actions;'), '1');
    assert.equal(
      queryScalar(dbPath, "SELECT action_id FROM workflow_actions WHERE source_kind = 'source_record_transfer_review';"),
      'workflow_action_source_transfer_review_1',
    );
    assert.equal(queryScalar(dbPath, 'SELECT node_id FROM workflow_actions;'), 'source_record_client_gap');
    assert.equal(queryScalar(dbPath, 'SELECT source_id FROM workflow_actions;'), '1');
    assert.equal(
      queryScalar(dbPath, "SELECT json_extract(metadata_json, '$.record_external_id') FROM workflow_actions;"),
      'client-gap',
    );

    applySql(
      dbPath,
      `
      INSERT INTO workflow_actions (
        action_id, canvas_id, node_id, title, description, action_kind, status,
        gate_kind, priority, owner, proposed_by, source_kind, source_id,
        artifact_url, evidence, metadata_json
      )
      SELECT
        'workflow_action_source_transfer_review_' || review.id,
        'create-something-internal-operating-system-source-map',
        r.atlas_node_id,
        'Repair source truth: ' || r.title,
        'Source transfer review ' || review.id || ' is marked needs_source_update for ' || review.review_kind || '.',
        'task',
        'proposed',
        'review',
        'P1',
        COALESCE(review.owner, 'CREATE SOMETHING'),
        'codex',
        'source_record_transfer_review',
        CAST(review.id AS TEXT),
        'https://app-governance-dash.createsomething.agency/sources',
        review.reason,
        json_object('source_transfer_review_id', review.id)
      FROM source_record_transfer_reviews review
      JOIN source_records r ON r.id = review.source_record_id
      WHERE review.status = 'needs_source_update'
      ON CONFLICT (action_id)
      DO UPDATE SET
        status = excluded.status,
        evidence = excluded.evidence,
        metadata_json = excluded.metadata_json,
        updated_at = datetime('now');
      `,
    );

    assert.equal(queryScalar(dbPath, 'SELECT COUNT(*) FROM workflow_actions;'), '1');

    applySql(
      dbPath,
      `
      UPDATE workflow_actions
      SET status = 'running', approved_by = 'dashboard', approved_at = datetime('now'), updated_at = datetime('now')
      WHERE action_id = 'workflow_action_source_transfer_review_1';

      INSERT INTO workflow_receipts (
        canvas_id, node_id, receipt_type, summary, payload_json, created_by
      )
      VALUES (
        'create-something-internal-operating-system-source-map',
        'source_record_client_gap',
        'handoff',
        'Dashboard moved source-update action workflow_action_source_transfer_review_1 from proposed to running.',
        json_object(
          'workflow_action_id', 'workflow_action_source_transfer_review_1',
          'source_record_transfer_review_id', 1,
          'source_record', 'notion-clients-db:client-gap',
          'status', 'running'
        ),
        'dashboard'
      );
      `,
    );

    assert.equal(
      queryScalar(
        dbPath,
        `SELECT action.action_id || '|' || action.status || '|' || review.status || '|' ||
                receipt.receipt_type || '|' ||
                CASE WHEN EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id) THEN 0 ELSE 1 END || '|' ||
                CASE WHEN EXISTS (
                  SELECT 1 FROM source_record_relations rel WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
                ) THEN 0 ELSE 1 END
         FROM workflow_actions action
         JOIN source_record_transfer_reviews review
           ON action.source_kind = 'source_record_transfer_review'
          AND action.source_id = CAST(review.id AS TEXT)
         JOIN source_records r ON r.id = review.source_record_id
         JOIN sources s ON s.id = r.source_id
         JOIN workflow_receipts receipt
           ON json_extract(receipt.payload_json, '$.workflow_action_id') = action.action_id
         WHERE action.canvas_id = 'create-something-internal-operating-system-source-map'
           AND s.source_type = 'notion_database'
           AND review.status = 'needs_source_update'
           AND action.status IN ('proposed', 'approved', 'ready', 'running', 'blocked')
         ORDER BY action.updated_at DESC
         LIMIT 1;`,
      ),
      'workflow_action_source_transfer_review_1|running|needs_source_update|handoff|1|1',
    );

    applySql(
      dbPath,
      `
      UPDATE workflow_actions
      SET status = 'blocked',
          approved_by = CASE WHEN 'blocked' IN ('running') THEN COALESCE(approved_by, 'codex-agent') ELSE approved_by END,
          approved_at = CASE WHEN 'blocked' IN ('running') THEN COALESCE(approved_at, datetime('now')) ELSE approved_at END,
          completed_at = NULL,
          updated_at = datetime('now')
      WHERE action_id = 'workflow_action_source_transfer_review_1';

      INSERT INTO workflow_receipts (
        canvas_id, node_id, receipt_type, summary, artifact_url, payload_json, created_by
      )
      VALUES (
        'create-something-internal-operating-system-source-map',
        'source_record_client_gap',
        'error',
        'codex-agent moved source-update action workflow_action_source_transfer_review_1 from running to blocked.',
        '/sources',
        json_object(
          'workflow_action_id', 'workflow_action_source_transfer_review_1',
          'review_id', 1,
          'previous_status', 'running',
          'status', 'blocked',
          'source_record', 'notion-clients-db:client-gap',
          'title', 'Client missing active map'
        ),
        'codex-agent'
      );

      INSERT INTO events (actor, action, entity_type, entity_id, payload_json)
      VALUES (
        'codex-agent',
        'update_source_update_action_status',
        'workflow_action',
        'workflow_action_source_transfer_review_1',
        json_object(
          'review_id', 1,
          'previous_status', 'running',
          'status', 'blocked',
          'source_record', 'notion-clients-db:client-gap',
          'title', 'Client missing active map'
        )
      );
      `,
    );

    assert.equal(
      queryScalar(dbPath, "SELECT status FROM workflow_actions WHERE action_id = 'workflow_action_source_transfer_review_1';"),
      'blocked',
    );
    assert.equal(queryScalar(dbPath, 'SELECT status FROM source_record_transfer_reviews WHERE id = 1;'), 'needs_source_update');
    assert.equal(queryScalar(dbPath, 'SELECT COUNT(*) FROM source_record_atlas_bindings;'), '0');
    assert.equal(
      queryScalar(
        dbPath,
        "SELECT receipt_type FROM workflow_receipts WHERE created_by = 'codex-agent' AND json_extract(payload_json, '$.workflow_action_id') = 'workflow_action_source_transfer_review_1';",
      ),
      'error',
    );
    assert.equal(
      queryScalar(
        dbPath,
        "SELECT json_extract(payload_json, '$.previous_status') FROM workflow_receipts WHERE created_by = 'codex-agent';",
      ),
      'running',
    );
    assert.equal(
      queryScalar(
        dbPath,
        "SELECT COUNT(*) FROM events WHERE actor = 'codex-agent' AND action = 'update_source_update_action_status';",
      ),
      '1',
    );

    applySql(
      dbPath,
      `
      UPDATE workflow_actions
      SET status = 'completed',
          approved_by = COALESCE(approved_by, 'codex-agent'),
          approved_at = COALESCE(approved_at, datetime('now')),
          completed_at = COALESCE(completed_at, datetime('now')),
          evidence = 'Source truth update proof captured outside the database layer.',
          artifact_url = COALESCE('/sources', artifact_url),
          updated_at = datetime('now')
      WHERE action_id = 'workflow_action_source_transfer_review_1';

      UPDATE source_record_transfer_reviews
      SET status = 'resolved',
          reason = 'Source truth update proof captured outside the database layer.',
          reviewed_by = 'codex-agent',
          updated_at = datetime('now')
      WHERE id = 1;

      INSERT INTO workflow_receipts (
        canvas_id, node_id, receipt_type, summary, artifact_url, payload_json, created_by
      )
      VALUES (
        'create-something-internal-operating-system-source-map',
        'source_record_client_gap',
        'proof',
        'codex-agent recorded source-update proof for workflow_action_source_transfer_review_1; action completed and transfer review resolved.',
        '/sources',
        json_object(
          'workflow_action_id', 'workflow_action_source_transfer_review_1',
          'review_id', 1,
          'previous_status', 'blocked',
          'status', 'completed',
          'review_status', 'resolved',
          'result', 'resolved',
          'evidence', 'Source truth update proof captured outside the database layer.',
          'source_record', 'notion-clients-db:client-gap'
        ),
        'codex-agent'
      );

      INSERT INTO events (actor, action, entity_type, entity_id, payload_json)
      VALUES (
        'codex-agent',
        'record_source_update_result',
        'workflow_action',
        'workflow_action_source_transfer_review_1',
        json_object(
          'review_id', 1,
          'previous_status', 'blocked',
          'status', 'completed',
          'review_status', 'resolved',
          'result', 'resolved'
        )
      );
      `,
    );

    assert.equal(
      queryScalar(dbPath, "SELECT status FROM workflow_actions WHERE action_id = 'workflow_action_source_transfer_review_1';"),
      'completed',
    );
    assert.equal(queryScalar(dbPath, 'SELECT status FROM source_record_transfer_reviews WHERE id = 1;'), 'resolved');
    assert.equal(queryScalar(dbPath, 'SELECT COUNT(*) FROM source_record_atlas_bindings;'), '0');
    assert.equal(
      queryScalar(
        dbPath,
        `SELECT COUNT(*)
         FROM source_records r
         WHERE r.external_id = 'client-gap'
           AND NOT EXISTS (
             SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id
           );`,
      ),
      '1',
    );
    assert.equal(
      queryScalar(
        dbPath,
        "SELECT receipt_type FROM workflow_receipts WHERE created_by = 'codex-agent' AND json_extract(payload_json, '$.result') = 'resolved';",
      ),
      'proof',
    );
    assert.equal(
      queryScalar(
        dbPath,
        "SELECT COUNT(*) FROM events WHERE actor = 'codex-agent' AND action = 'record_source_update_result';",
      ),
      '1',
    );
  } finally {
    fs.rmSync(dbPath, { force: true });
  }
});

test('notion transfer readiness flags unreviewed gaps and open source-update actions', () => {
  const dbPath = path.join(os.tmpdir(), `app-governance-transfer-readiness-${process.pid}.sqlite`);
  try {
    fs.rmSync(dbPath, { force: true });
    applyMigrations(dbPath);
    applySql(
      dbPath,
      `
      INSERT INTO atlas_canvases (canvas_id, title, client, workflow, status)
      VALUES ('create-something-internal-operating-system-source-map', 'CREATE SOMETHING source map', 'CREATE SOMETHING', 'Notion transfer', 'run');

      INSERT INTO atlas_nodes (node_id, canvas_id, kind, label, status)
      VALUES
        ('source_record_client_reviewed', 'create-something-internal-operating-system-source-map', 'data', 'Reviewed client', 'run'),
        ('source_record_client_unreviewed', 'create-something-internal-operating-system-source-map', 'data', 'Unreviewed client', 'run');

      INSERT INTO sources (source_type, external_id, name, workspace)
      VALUES ('notion_database', 'notion-clients-db', 'Clients', 'CREATE SOMETHING Notion');

      INSERT INTO source_records (
        source_id, external_id, record_kind, title, canonical_type, substrate_id,
        atlas_canvas_id, atlas_node_id, identity_state, migration_state
      )
      SELECT id, 'client-reviewed', 'row', 'Reviewed client', 'client', 'substrate:client:reviewed',
             'create-something-internal-operating-system-source-map', 'source_record_client_reviewed', 'mapped', 'ready'
      FROM sources WHERE external_id = 'notion-clients-db';

      INSERT INTO source_records (
        source_id, external_id, record_kind, title, canonical_type, substrate_id,
        atlas_canvas_id, atlas_node_id, identity_state, migration_state
      )
      SELECT id, 'client-unreviewed', 'row', 'Unreviewed client', 'client', 'substrate:client:unreviewed',
             'create-something-internal-operating-system-source-map', 'source_record_client_unreviewed', 'mapped', 'ready'
      FROM sources WHERE external_id = 'notion-clients-db';

      INSERT INTO source_record_transfer_reviews (
        source_record_id, review_kind, status, reason, owner, reviewed_by
      )
      SELECT id, 'binding_gap', 'needs_source_update', 'needs source truth update', 'CREATE SOMETHING', 'codex'
      FROM source_records WHERE external_id = 'client-reviewed';

      INSERT INTO source_record_transfer_reviews (
        source_record_id, review_kind, status, reason, owner, reviewed_by
      )
      SELECT id, 'relation_island', 'reviewed', 'relation island is accepted for now', 'CREATE SOMETHING', 'codex'
      FROM source_records WHERE external_id = 'client-reviewed';

      INSERT INTO workflow_actions (
        action_id, canvas_id, title, description, action_kind, status, gate_kind,
        priority, owner, proposed_by, source_kind, source_id
      )
      SELECT
        'workflow_action_source_transfer_review_' || review.id,
        'create-something-internal-operating-system-source-map',
        'Repair source truth: Reviewed client',
        'Source update handoff',
        'task',
        'running',
        'review',
        'P1',
        'CREATE SOMETHING',
        'codex',
        'source_record_transfer_review',
        CAST(review.id AS TEXT)
      FROM source_record_transfer_reviews review
      WHERE review.status = 'needs_source_update';
      `,
    );

    assert.equal(
      queryScalar(
        dbPath,
        `SELECT
           unbound_records || '|' || reviewed_unbound_records || '|' ||
           relation_isolated_records || '|' || reviewed_relation_isolated_records
         FROM (
           SELECT
             (SELECT COUNT(*)
                FROM source_records r
                JOIN sources s ON s.id = r.source_id
               WHERE s.source_type = 'notion_database'
                 AND NOT EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id)) AS unbound_records,
             (SELECT COUNT(*)
                FROM source_records r
                JOIN sources s ON s.id = r.source_id
                JOIN source_record_transfer_reviews review
                  ON review.source_record_id = r.id
                 AND review.review_kind = 'binding_gap'
                 AND review.status IN ('reviewed', 'waived', 'needs_source_update', 'resolved')
               WHERE s.source_type = 'notion_database'
                 AND NOT EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id)) AS reviewed_unbound_records,
             (SELECT COUNT(*)
                FROM source_records r
                JOIN sources s ON s.id = r.source_id
               WHERE s.source_type = 'notion_database'
                 AND NOT EXISTS (
                   SELECT 1
                   FROM source_record_relations rel
                   WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
                 )) AS relation_isolated_records,
             (SELECT COUNT(*)
                FROM source_records r
                JOIN sources s ON s.id = r.source_id
                JOIN source_record_transfer_reviews review
                  ON review.source_record_id = r.id
                 AND review.review_kind = 'relation_island'
                 AND review.status IN ('reviewed', 'waived', 'needs_source_update', 'resolved')
               WHERE s.source_type = 'notion_database'
                 AND NOT EXISTS (
                   SELECT 1
                   FROM source_record_relations rel
                   WHERE rel.source_record_id = r.id OR rel.target_source_record_id = r.id
                 )) AS reviewed_relation_isolated_records
         );`,
      ),
      '2|1|2|1',
    );
    assert.equal(
      queryScalar(dbPath, "SELECT COUNT(*) FROM source_record_transfer_reviews WHERE status = 'needs_source_update';"),
      '1',
    );
    assert.equal(
      queryScalar(
        dbPath,
        `SELECT COUNT(*)
         FROM workflow_actions action
         JOIN source_record_transfer_reviews review
           ON action.source_kind = 'source_record_transfer_review'
          AND action.source_id = CAST(review.id AS TEXT)
         WHERE action.status IN ('proposed', 'approved', 'ready', 'running', 'blocked')
           AND review.status = 'needs_source_update';`,
      ),
      '1',
    );
    assert.equal(
      queryScalar(
        dbPath,
        `SELECT r.external_id
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
         ORDER BY r.external_id;`,
      ),
      'client-unreviewed',
    );
    assert.equal(
      queryScalar(
        dbPath,
        `SELECT r.external_id
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
         ORDER BY r.external_id;`,
      ),
      'client-unreviewed',
    );
    assert.equal(
      queryScalar(
        dbPath,
        `SELECT action.action_id || '|' || action.status || '|' || review.review_kind
         FROM workflow_actions action
         JOIN source_record_transfer_reviews review
           ON action.source_kind = 'source_record_transfer_review'
          AND action.source_id = CAST(review.id AS TEXT)
         WHERE review.status = 'needs_source_update'
           AND action.status IN ('proposed', 'approved', 'ready', 'running', 'blocked');`,
      ),
      'workflow_action_source_transfer_review_1|running|binding_gap',
    );
  } finally {
    fs.rmSync(dbPath, { force: true });
  }
});

test('notion transfer blocker planning groups review batches without mutations', () => {
  const dbPath = path.join(os.tmpdir(), `app-governance-transfer-plan-${process.pid}.sqlite`);
  try {
    fs.rmSync(dbPath, { force: true });
    applyMigrations(dbPath);
    applySql(
      dbPath,
      `
      INSERT INTO atlas_canvases (canvas_id, title, client, workflow, status)
      VALUES ('create-something-internal-operating-system-source-map', 'CREATE SOMETHING source map', 'CREATE SOMETHING', 'Notion transfer', 'run');

      INSERT INTO sources (source_type, external_id, name, workspace)
      VALUES ('notion_database', 'notion-clients-db', 'Clients', 'CREATE SOMETHING Notion');

      INSERT INTO source_records (
        source_id, external_id, record_kind, title, canonical_type, substrate_id,
        identity_state, migration_state
      )
      SELECT id, 'client-reviewed', 'row', 'Reviewed client', 'client', 'substrate:client:reviewed', 'mapped', 'ready'
      FROM sources WHERE external_id = 'notion-clients-db';

      INSERT INTO source_records (
        source_id, external_id, record_kind, title, canonical_type, substrate_id,
        identity_state, migration_state
      )
      SELECT id, 'client-unreviewed', 'row', 'Unreviewed client', 'client', 'substrate:client:unreviewed', 'mapped', 'ready'
      FROM sources WHERE external_id = 'notion-clients-db';

      INSERT INTO source_record_transfer_reviews (
        source_record_id, review_kind, status, reason, owner, reviewed_by
      )
      SELECT id, 'binding_gap', 'needs_source_update', 'needs source truth update', 'CREATE SOMETHING', 'codex'
      FROM source_records WHERE external_id = 'client-reviewed';

      INSERT INTO source_record_transfer_reviews (
        source_record_id, review_kind, status, reason, owner, reviewed_by
      )
      SELECT id, 'relation_island', 'reviewed', 'relation island is accepted for now', 'CREATE SOMETHING', 'codex'
      FROM source_records WHERE external_id = 'client-reviewed';

      INSERT INTO workflow_actions (
        action_id, canvas_id, title, description, action_kind, status, gate_kind,
        priority, owner, proposed_by, source_kind, source_id
      )
      SELECT
        'workflow_action_source_transfer_review_' || review.id,
        'create-something-internal-operating-system-source-map',
        'Repair source truth: Reviewed client',
        'Source update handoff',
        'task',
        'running',
        'review',
        'P1',
        'CREATE SOMETHING',
        'codex',
        'source_record_transfer_review',
        CAST(review.id AS TEXT)
      FROM source_record_transfer_reviews review
      WHERE review.status = 'needs_source_update';
      `,
    );

    const grouped = queryScalar(
      dbPath,
      `WITH blockers AS (
         SELECT 'binding_gap' AS blocker_kind, s.name AS source_name, r.canonical_type
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
         SELECT 'relation_island' AS blocker_kind, s.name AS source_name, r.canonical_type
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
         SELECT 'source_update_action' AS blocker_kind, s.name AS source_name, r.canonical_type
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
       SELECT source_name || '|' || canonical_type || '|' || COUNT(*) || '|' ||
              SUM(CASE WHEN blocker_kind = 'binding_gap' THEN 1 ELSE 0 END) || '|' ||
              SUM(CASE WHEN blocker_kind = 'relation_island' THEN 1 ELSE 0 END) || '|' ||
              SUM(CASE WHEN blocker_kind = 'source_update_action' THEN 1 ELSE 0 END)
       FROM blockers
       GROUP BY source_name, canonical_type;`,
    );

    assert.equal(grouped, 'Clients|client|3|1|1|1');
    applySql(
      dbPath,
      `
      INSERT INTO workflow_actions (
        action_id, canvas_id, title, description, action_kind, status, gate_kind,
        priority, owner, proposed_by, source_kind, source_id, artifact_url, metadata_json
      )
      VALUES (
        'workflow_action_notion_transfer_blocker_group_test',
        'create-something-internal-operating-system-source-map',
        'Review Notion transfer blockers: Clients / client',
        '3 active blockers. Proposed action: review binding or mark source update.',
        'handoff',
        'proposed',
        'review',
        'P1',
        'CREATE SOMETHING',
        'codex',
        'notion_transfer_blocker_group',
        'notion-clients-db:client',
        '/sources',
        '{"group_key":"Clients / client","blocker_counts":{"binding_gap":1,"relation_island":1,"source_update_action":1}}'
      );

      INSERT INTO workflow_receipts (canvas_id, receipt_type, summary, artifact_url, payload_json, created_by)
      VALUES (
        'create-something-internal-operating-system-source-map',
        'handoff',
        'Created blocker review handoff workflow_action_notion_transfer_blocker_group_test for Clients / client.',
        '/sources',
        '{"workflow_action_id":"workflow_action_notion_transfer_blocker_group_test"}',
        'codex'
      );

      UPDATE workflow_actions
      SET status = 'running',
          approved_by = COALESCE(approved_by, 'codex'),
          approved_at = COALESCE(approved_at, datetime('now')),
          updated_at = datetime('now')
      WHERE action_id = 'workflow_action_notion_transfer_blocker_group_test'
        AND source_kind = 'notion_transfer_blocker_group';

      INSERT INTO workflow_receipts (canvas_id, receipt_type, summary, artifact_url, payload_json, created_by)
      VALUES (
        'create-something-internal-operating-system-source-map',
        'handoff',
        'codex moved blocker review handoff workflow_action_notion_transfer_blocker_group_test from proposed to running.',
        '/sources',
        '{"workflow_action_id":"workflow_action_notion_transfer_blocker_group_test","previous_status":"proposed","status":"running"}',
        'codex'
      );
      `,
    );
    assert.equal(
      queryScalar(
        dbPath,
        "SELECT COUNT(*) FROM workflow_actions WHERE source_kind = 'notion_transfer_blocker_group' AND source_id = 'notion-clients-db:client';",
      ),
      '1',
    );
    assert.equal(
      queryScalar(
        dbPath,
        "SELECT status || '|' || approved_by FROM workflow_actions WHERE action_id = 'workflow_action_notion_transfer_blocker_group_test';",
      ),
      'running|codex',
    );
    assert.equal(
      queryScalar(
        dbPath,
        "SELECT COUNT(*) FROM workflow_receipts WHERE receipt_type = 'handoff' AND created_by = 'codex';",
      ),
      '2',
    );
    assert.equal(queryScalar(dbPath, 'SELECT COUNT(*) FROM source_record_transfer_reviews;'), '2');
    assert.equal(queryScalar(dbPath, 'SELECT COUNT(*) FROM source_records;'), '2');
    assert.equal(queryScalar(dbPath, 'SELECT COUNT(*) FROM workflow_actions;'), '2');
  } finally {
    fs.rmSync(dbPath, { force: true });
  }
});
