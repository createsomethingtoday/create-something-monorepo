import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');

const { APP_GOVERNANCE_SOURCE_TYPES: appGovernanceSourceTypes } = await import(
  pathToFileURL(path.join(packageRoot, 'dashboard/src/lib/server/source-scope.js')).href
);

function applySql(dbPath, sql) {
  execFileSync('sqlite3', [dbPath], { input: `PRAGMA foreign_keys=ON;\n${sql}`, encoding: 'utf8' });
}

function queryRows(dbPath, sql) {
  return execFileSync('sqlite3', ['-json', dbPath, sql], { encoding: 'utf8' }).trim();
}

function queryScalar(dbPath, sql) {
  return execFileSync('sqlite3', [dbPath, sql], { encoding: 'utf8' }).trim();
}

function applyMigrations(dbPath) {
  for (const file of fs.readdirSync(path.join(packageRoot, 'migrations')).filter((name) => name.endsWith('.sql')).sort()) {
    applySql(dbPath, fs.readFileSync(path.join(packageRoot, 'migrations', file), 'utf8'));
  }
}

test('dashboard overview sync cursors stay scoped to Webflow App Governance sources', () => {
  const dbPath = path.join(os.tmpdir(), `app-governance-overview-sources-${process.pid}.sqlite`);
  try {
    fs.rmSync(dbPath, { force: true });
    applyMigrations(dbPath);
    applySql(
      dbPath,
      `
      INSERT INTO sources (source_type, external_id, name, workspace, atlas_canvas_id)
      VALUES ('notion_database', 'create-something-clients', 'Clients', 'CREATE SOMETHING Notion', 'create-something-notion-migration');

      INSERT INTO sync_cursors (source_type, source_external_id, cursor_value, last_synced_at, synced_by)
      VALUES
        ('notion_database', 'create-something-clients', 'clients-query-order-limit-25-2026-07-07', datetime('now'), 'codex-notion-import'),
        ('docs_repo', 'webflow/openapi-internal', '2026-07-02T11:27:42-03:00 @ f9e8749', datetime('now'), 'check-doc-changes');

      INSERT INTO source_import_runs (run_id, source_id, status, actor, received, upserted, updated_at)
      SELECT 'cs-notion-import-run', id, 'succeeded', 'codex-notion-import', 1, 1, datetime('now')
      FROM sources WHERE source_type = 'notion_database' AND external_id = 'create-something-clients';

      INSERT INTO source_import_runs (run_id, source_id, status, actor, received, upserted, updated_at)
      SELECT 'webflow-doc-import-run', id, 'succeeded', 'check-doc-changes', 1, 1, datetime('now')
      FROM sources WHERE source_type = 'docs_repo' AND external_id = 'webflow/openapi-internal';

      INSERT INTO events (actor, action, entity_type, entity_id)
      VALUES
        ('codex-notion-import', 'record_source_records', 'source', 'create-something-clients'),
        ('codex-notion-import', 'update_source_record_mapping', 'source_record', 'create-something-clients:notion-page-1'),
        ('check-doc-changes', 'set_cursor', 'source', 'webflow/openapi-internal'),
        ('review-agent', 'update_finding', 'finding', '42');
      `,
    );

    const placeholders = appGovernanceSourceTypes.map((type) => `'${type}'`).join(', ');
    const rows = JSON.parse(
      queryRows(
        dbPath,
        `SELECT s.source_type, s.name
         FROM sources s
         LEFT JOIN sync_cursors sc
           ON sc.source_type = s.source_type
          AND sc.source_external_id = s.external_id
         WHERE s.source_type IN (${placeholders})
         ORDER BY s.id;`,
      ),
    );

    assert.deepEqual(
      rows.map((row) => `${row.source_type}:${row.name}`),
      [
        'slack_channel:#triage-marketplace-apps',
        'slack_canvas:App Review · Governance & Transparency Tracker',
        'airtable:App Review Governance Findings (Airtable)',
        'webflow_admin:Webflow Apps Admin (Marketplace listings)',
        'docs_repo:Developer docs & API reference (openapi-internal)',
      ],
    );

    const sourceLedgerRows = JSON.parse(
      queryRows(
        dbPath,
        `SELECT s.source_type, s.name
         FROM sources s
         LEFT JOIN sync_cursors c ON c.source_type = s.source_type AND c.source_external_id = s.external_id
         LEFT JOIN source_records r ON r.source_id = s.id
         WHERE s.source_type IN (${placeholders})
         GROUP BY s.id
         HAVING COUNT(r.id) > 0 OR c.cursor_value IS NOT NULL
         ORDER BY s.source_type, s.name;`,
      ),
    );

    assert.deepEqual(
      sourceLedgerRows.map((row) => `${row.source_type}:${row.name}`),
      ['docs_repo:Developer docs & API reference (openapi-internal)'],
    );

    const importRunRows = JSON.parse(
      queryRows(
        dbPath,
        `SELECT ir.run_id, s.source_type
         FROM source_import_runs ir
         JOIN sources s ON s.id = ir.source_id
         WHERE s.source_type IN (${placeholders})
         ORDER BY ir.run_id;`,
      ),
    );

    assert.deepEqual(
      importRunRows.map((row) => `${row.source_type}:${row.run_id}`),
      ['docs_repo:webflow-doc-import-run'],
    );

    const eventRows = JSON.parse(
      queryRows(
        dbPath,
        `SELECT e.action, e.entity_type, e.entity_id
         FROM events e
         WHERE e.entity_type NOT IN ('source', 'source_record')
            OR EXISTS (
              SELECT 1
              FROM sources s
              WHERE s.source_type IN (${placeholders})
                AND (
                  e.entity_id = s.external_id
                  OR e.entity_id LIKE s.external_id || ':%'
                )
            )
         ORDER BY e.id DESC
         LIMIT 12;`,
      ),
    );

    assert.deepEqual(
      eventRows.map((row) => `${row.action}:${row.entity_type}:${row.entity_id}`),
      [
        'update_finding:finding:42',
        'set_cursor:source:webflow/openapi-internal',
      ],
    );
  } finally {
    fs.rmSync(dbPath, { force: true });
  }
});

test('dashboard source transfer queue lists open gap candidates by review kind', () => {
  const dbPath = path.join(os.tmpdir(), `app-governance-dashboard-transfer-queue-${process.pid}.sqlite`);
  try {
    fs.rmSync(dbPath, { force: true });
    applyMigrations(dbPath);
    applySql(
      dbPath,
      `
      INSERT INTO sources (source_type, external_id, name, workspace)
      VALUES ('notion_database', 'notion-decisions-db', 'Decisions', 'CREATE SOMETHING Notion');

      INSERT INTO source_records (
        source_id, external_id, record_kind, title, canonical_type, substrate_id, identity_state, migration_state
      )
      SELECT id, 'decision-two-gaps', 'row', 'Adopt database-layer queue', 'decision', 'substrate:decision:queue', 'mapped', 'ready'
      FROM sources WHERE external_id = 'notion-decisions-db';

      INSERT INTO source_record_transfer_reviews (
        source_record_id, review_kind, status, reason, owner, reviewed_by
      )
      SELECT id, 'relation_island', 'needs_source_update', 'needs source relation', 'CREATE SOMETHING', 'codex'
      FROM source_records WHERE external_id = 'decision-two-gaps';
      `,
    );

    const rows = JSON.parse(
      queryRows(
        dbPath,
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
         SELECT candidate.title, candidate.review_kind, 'open' AS status, candidate.has_binding_gap, candidate.has_relation_island
         FROM candidate
         ORDER BY candidate.source_name, candidate.canonical_type, candidate.title, candidate.review_kind
         LIMIT 25;`,
      ),
    );

    assert.deepEqual(rows, [
      {
        title: 'Adopt database-layer queue',
        review_kind: 'binding_gap',
        status: 'open',
        has_binding_gap: 1,
        has_relation_island: 1,
      },
    ]);
  } finally {
    fs.rmSync(dbPath, { force: true });
  }
});

test('dashboard blocker handoff row review writes transfer ledger without creating bindings', () => {
  const dbPath = path.join(os.tmpdir(), `app-governance-dashboard-blocker-row-review-${process.pid}.sqlite`);
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
      SELECT id, 'task-row-review', 'row', 'Add Notion API token for Agency Ops reconciliation live CLI', 'task',
             'substrate:task:notion-token', 'mapped', 'ready'
      FROM sources WHERE external_id = 'notion-tasks-db';

      INSERT INTO workflow_actions (
        action_id, canvas_id, title, description, action_kind, status, gate_kind,
        priority, owner, proposed_by, source_kind, source_id, artifact_url
      )
      VALUES (
        'workflow_action_notion_transfer_blocker_group_testrow',
        'create-something-internal-operating-system-source-map',
        'Review Notion transfer blockers: Tasks / Actions / task',
        '1 active blocker.',
        'handoff',
        'running',
        'review',
        'P1',
        'CREATE SOMETHING',
        'dashboard',
        'notion_transfer_blocker_group',
        'notion-tasks-db:task',
        '/sources'
      );

      INSERT INTO source_record_transfer_reviews (
        source_record_id, review_kind, status, reason, owner, reviewed_by, metadata_json
      )
      SELECT id, 'binding_gap', 'reviewed',
             'Dashboard handoff review: blocker reviewed for transfer without source-truth update.',
             'CREATE SOMETHING',
             'dashboard',
             json_object(
               'surface', 'dashboard:/sources',
               'handoff_action_id', 'workflow_action_notion_transfer_blocker_group_testrow',
               'title', title
             )
      FROM source_records WHERE external_id = 'task-row-review';

      INSERT INTO workflow_receipts (canvas_id, node_id, receipt_type, summary, artifact_url, payload_json, created_by)
      VALUES (
        'create-something-internal-operating-system-source-map',
        NULL,
        'decision',
        'Dashboard marked binding_gap for Add Notion API token for Agency Ops reconciliation live CLI as reviewed.',
        '/sources?handoff=workflow_action_notion_transfer_blocker_group_testrow',
        json_object(
          'source_record_id', 1,
          'source_record', 'notion-tasks-db:task-row-review',
          'review_id', 1,
          'review_kind', 'binding_gap',
          'status', 'reviewed',
          'handoff_action_id', 'workflow_action_notion_transfer_blocker_group_testrow'
        ),
        'dashboard'
      );

      INSERT INTO events (actor, action, entity_type, entity_id, payload_json)
      VALUES (
        'dashboard',
        'review_notion_transfer_gap',
        'source_record',
        'notion-tasks-db:task-row-review',
        json_object(
          'source_record_id', 1,
          'review_id', 1,
          'review_kind', 'binding_gap',
          'status', 'reviewed',
          'handoff_action_id', 'workflow_action_notion_transfer_blocker_group_testrow'
        )
      );
      `,
    );

    assert.equal(queryScalar(dbPath, 'SELECT COUNT(*) FROM source_record_atlas_bindings;'), '0');
    assert.equal(
      queryScalar(dbPath, "SELECT status FROM source_record_transfer_reviews WHERE source_record_id = 1 AND review_kind = 'binding_gap';"),
      'reviewed',
    );
    assert.equal(
      queryScalar(
        dbPath,
        `SELECT COUNT(*)
         FROM source_records r
         WHERE r.external_id = 'task-row-review'
           AND NOT EXISTS (SELECT 1 FROM source_record_atlas_bindings b WHERE b.source_record_id = r.id)
           AND NOT EXISTS (
             SELECT 1
             FROM source_record_transfer_reviews review
             WHERE review.source_record_id = r.id
               AND review.review_kind = 'binding_gap'
               AND review.status IN ('reviewed', 'waived', 'needs_source_update', 'resolved')
           );`,
      ),
      '0',
    );
    assert.equal(
      queryScalar(
        dbPath,
        `SELECT COUNT(*)
         FROM source_records r
         WHERE r.external_id = 'task-row-review'
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
      '1',
    );
    assert.equal(
      queryScalar(
        dbPath,
        "SELECT receipt_type FROM workflow_receipts WHERE json_extract(payload_json, '$.handoff_action_id') = 'workflow_action_notion_transfer_blocker_group_testrow';",
      ),
      'decision',
    );
    assert.equal(queryScalar(dbPath, "SELECT COUNT(*) FROM events WHERE action = 'review_notion_transfer_gap';"), '1');
  } finally {
    fs.rmSync(dbPath, { force: true });
  }
});

test('dashboard source update queue lists reviewed source-truth handoffs', () => {
  const dbPath = path.join(os.tmpdir(), `app-governance-dashboard-source-updates-${process.pid}.sqlite`);
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
        source_id, external_id, record_kind, title, canonical_type, substrate_id, identity_state, migration_state
      )
      SELECT id, 'client-source-update', 'row', 'Client needs binding source truth', 'client', 'substrate:client:update', 'mapped', 'ready'
      FROM sources WHERE external_id = 'notion-clients-db';

      INSERT INTO source_record_transfer_reviews (
        source_record_id, review_kind, status, reason, owner, reviewed_by, metadata_json
      )
      SELECT id, 'binding_gap', 'needs_source_update', 'dashboard review', 'CREATE SOMETHING', 'dashboard', '{"surface":"dashboard:/sources"}'
      FROM source_records WHERE external_id = 'client-source-update';

      INSERT INTO workflow_actions (
        action_id, canvas_id, title, description, action_kind, status, gate_kind,
        priority, owner, proposed_by, source_kind, source_id
      )
      SELECT
        'workflow_action_source_transfer_review_' || review.id,
        'create-something-internal-operating-system-source-map',
        'Repair source truth: Client needs binding source truth',
        'Source update handoff',
        'task',
        'proposed',
        'review',
        'P1',
        'CREATE SOMETHING',
        'codex',
        'source_record_transfer_review',
        CAST(review.id AS TEXT)
      FROM source_record_transfer_reviews review;
      `,
    );

    const rows = JSON.parse(
      queryRows(
        dbPath,
        `SELECT review.id, review.source_record_id, s.name AS source_name, s.external_id AS source_external_id,
                r.external_id, r.title, r.canonical_type, review.review_kind, review.status,
                review.reason, review.owner, review.reviewed_by, review.metadata_json,
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
                  SELECT receipt.summary
                  FROM workflow_receipts receipt
                  WHERE json_extract(receipt.payload_json, '$.workflow_action_id') = action.action_id
                  ORDER BY receipt.created_at DESC, receipt.id DESC
                  LIMIT 1
                ) AS workflow_action_receipt_summary
         FROM source_record_transfer_reviews review
         JOIN source_records r ON r.id = review.source_record_id
         JOIN sources s ON s.id = r.source_id
         LEFT JOIN workflow_actions action
           ON action.action_id = ('workflow_action_source_transfer_review_' || review.id)
         WHERE s.source_type = 'notion_database'
           AND review.status = 'needs_source_update'
         ORDER BY review.updated_at DESC, review.id DESC
         LIMIT 25;`,
      ),
    );

    assert.equal(rows.length, 1);
    assert.deepEqual(
      {
        title: rows[0].title,
        review_kind: rows[0].review_kind,
        status: rows[0].status,
        reviewed_by: rows[0].reviewed_by,
        has_binding_gap: rows[0].has_binding_gap,
        has_relation_island: rows[0].has_relation_island,
        workflow_action_id: rows[0].workflow_action_id,
        workflow_action_status: rows[0].workflow_action_status,
        workflow_action_priority: rows[0].workflow_action_priority,
      },
      {
        title: 'Client needs binding source truth',
        review_kind: 'binding_gap',
        status: 'needs_source_update',
        reviewed_by: 'dashboard',
        has_binding_gap: 1,
        has_relation_island: 1,
        workflow_action_id: 'workflow_action_source_transfer_review_1',
        workflow_action_status: 'proposed',
        workflow_action_priority: 'P1',
      },
    );
  } finally {
    fs.rmSync(dbPath, { force: true });
  }
});

test('dashboard source update action status writes only workflow action state', () => {
  const dbPath = path.join(os.tmpdir(), `app-governance-dashboard-source-action-status-${process.pid}.sqlite`);
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
        source_id, external_id, record_kind, title, canonical_type, substrate_id, identity_state, migration_state
      )
      SELECT id, 'client-source-update', 'row', 'Client needs binding source truth', 'client', 'substrate:client:update', 'mapped', 'ready'
      FROM sources WHERE external_id = 'notion-clients-db';

      INSERT INTO source_record_transfer_reviews (
        source_record_id, review_kind, status, reason, owner, reviewed_by, metadata_json
      )
      SELECT id, 'binding_gap', 'needs_source_update', 'dashboard review', 'CREATE SOMETHING', 'dashboard', '{"surface":"dashboard:/sources"}'
      FROM source_records WHERE external_id = 'client-source-update';

      INSERT INTO workflow_actions (
        action_id, canvas_id, title, description, action_kind, status, gate_kind,
        priority, owner, proposed_by, source_kind, source_id
      )
      SELECT
        'workflow_action_source_transfer_review_' || review.id,
        'create-something-internal-operating-system-source-map',
        'Repair source truth: Client needs binding source truth',
        'Source update handoff',
        'task',
        'proposed',
        'review',
        'P1',
        'CREATE SOMETHING',
        'codex',
        'source_record_transfer_review',
        CAST(review.id AS TEXT)
      FROM source_record_transfer_reviews review;

      UPDATE workflow_actions
      SET status = 'running',
          approved_by = COALESCE(approved_by, 'dashboard'),
          approved_at = COALESCE(approved_at, datetime('now')),
          completed_at = NULL,
          updated_at = datetime('now')
      WHERE action_id = 'workflow_action_source_transfer_review_1'
        AND source_kind = 'source_record_transfer_review';

      INSERT INTO workflow_receipts (
        canvas_id, node_id, receipt_type, summary, artifact_url, payload_json, created_by
      )
      SELECT
        action.canvas_id,
        action.node_id,
        'handoff',
        'Dashboard moved source-update action workflow_action_source_transfer_review_1 from proposed to running.',
        '/sources',
        json_object(
          'workflow_action_id', action.action_id,
          'review_id', 1,
          'previous_status', 'proposed',
          'status', 'running',
          'source_record', 'notion-clients-db:client-source-update'
        ),
        'dashboard'
      FROM workflow_actions action
      WHERE action.action_id = 'workflow_action_source_transfer_review_1';

      INSERT INTO events (actor, action, entity_type, entity_id, payload_json)
      VALUES (
        'dashboard',
        'update_source_update_action_status',
        'workflow_action',
        'workflow_action_source_transfer_review_1',
        '{"review_id":1,"previous_status":"proposed","status":"running"}'
      );
      `,
    );

    assert.equal(
      queryScalar(dbPath, "SELECT status FROM workflow_actions WHERE action_id = 'workflow_action_source_transfer_review_1';"),
      'running',
    );
    assert.equal(
      queryScalar(dbPath, "SELECT approved_by FROM workflow_actions WHERE action_id = 'workflow_action_source_transfer_review_1';"),
      'dashboard',
    );
    assert.equal(queryScalar(dbPath, 'SELECT status FROM source_record_transfer_reviews WHERE id = 1;'), 'needs_source_update');
    assert.equal(queryScalar(dbPath, 'SELECT COUNT(*) FROM source_record_atlas_bindings;'), '0');
    assert.equal(
      queryScalar(dbPath, "SELECT receipt_type FROM workflow_receipts WHERE json_extract(payload_json, '$.workflow_action_id') = 'workflow_action_source_transfer_review_1';"),
      'handoff',
    );
    assert.equal(
      queryScalar(dbPath, "SELECT json_extract(payload_json, '$.status') FROM workflow_receipts WHERE json_extract(payload_json, '$.workflow_action_id') = 'workflow_action_source_transfer_review_1';"),
      'running',
    );
    assert.equal(
      queryScalar(dbPath, "SELECT COUNT(*) FROM events WHERE action = 'update_source_update_action_status';"),
      '1',
    );
  } finally {
    fs.rmSync(dbPath, { force: true });
  }
});

test('dashboard source update proof completes action and resolves review only', () => {
  const dbPath = path.join(os.tmpdir(), `app-governance-dashboard-source-action-proof-${process.pid}.sqlite`);
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
        source_id, external_id, record_kind, title, canonical_type, substrate_id, identity_state, migration_state
      )
      SELECT id, 'client-source-update', 'row', 'Client needs binding source truth', 'client', 'substrate:client:update', 'mapped', 'ready'
      FROM sources WHERE external_id = 'notion-clients-db';

      INSERT INTO source_record_transfer_reviews (
        source_record_id, review_kind, status, reason, owner, reviewed_by, metadata_json
      )
      SELECT id, 'binding_gap', 'needs_source_update', 'dashboard review', 'CREATE SOMETHING', 'dashboard', '{"surface":"dashboard:/sources"}'
      FROM source_records WHERE external_id = 'client-source-update';

      INSERT INTO workflow_actions (
        action_id, canvas_id, title, description, action_kind, status, gate_kind,
        priority, owner, proposed_by, approved_by, source_kind, source_id, approved_at
      )
      SELECT
        'workflow_action_source_transfer_review_' || review.id,
        'create-something-internal-operating-system-source-map',
        'Repair source truth: Client needs binding source truth',
        'Source update handoff',
        'task',
        'running',
        'review',
        'P1',
        'CREATE SOMETHING',
        'codex',
        'dashboard',
        'source_record_transfer_review',
        CAST(review.id AS TEXT),
        datetime('now')
      FROM source_record_transfer_reviews review;

      UPDATE workflow_actions
      SET status = 'completed',
          approved_by = COALESCE(approved_by, 'dashboard'),
          approved_at = COALESCE(approved_at, datetime('now')),
          completed_at = COALESCE(completed_at, datetime('now')),
          evidence = 'Source update proof captured in dashboard.',
          artifact_url = COALESCE(artifact_url, '/sources'),
          updated_at = datetime('now')
      WHERE action_id = 'workflow_action_source_transfer_review_1';

      UPDATE source_record_transfer_reviews
      SET status = 'resolved',
          reason = 'Source update proof captured in dashboard.',
          reviewed_by = 'dashboard',
          updated_at = datetime('now')
      WHERE id = 1;

      INSERT INTO workflow_receipts (
        canvas_id, node_id, receipt_type, summary, artifact_url, payload_json, created_by
      )
      VALUES (
        'create-something-internal-operating-system-source-map',
        NULL,
        'proof',
        'Dashboard recorded source-update proof for workflow_action_source_transfer_review_1; action completed and transfer review resolved.',
        '/sources',
        json_object(
          'workflow_action_id', 'workflow_action_source_transfer_review_1',
          'review_id', 1,
          'previous_status', 'running',
          'status', 'completed',
          'review_status', 'resolved',
          'result', 'resolved',
          'evidence', 'Source update proof captured in dashboard.',
          'source_record', 'notion-clients-db:client-source-update',
          'title', 'Client needs binding source truth'
        ),
        'dashboard'
      );

      INSERT INTO events (actor, action, entity_type, entity_id, payload_json)
      VALUES (
        'dashboard',
        'record_source_update_result',
        'workflow_action',
        'workflow_action_source_transfer_review_1',
        json_object(
          'review_id', 1,
          'previous_status', 'running',
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
    assert.equal(
      queryScalar(dbPath, "SELECT completed_at IS NOT NULL FROM workflow_actions WHERE action_id = 'workflow_action_source_transfer_review_1';"),
      '1',
    );
    assert.equal(queryScalar(dbPath, 'SELECT status FROM source_record_transfer_reviews WHERE id = 1;'), 'resolved');
    assert.equal(queryScalar(dbPath, 'SELECT COUNT(*) FROM source_record_atlas_bindings;'), '0');
    assert.equal(
      queryScalar(
        dbPath,
        "SELECT receipt_type FROM workflow_receipts WHERE json_extract(payload_json, '$.workflow_action_id') = 'workflow_action_source_transfer_review_1';",
      ),
      'proof',
    );
    assert.equal(
      queryScalar(
        dbPath,
        "SELECT json_extract(payload_json, '$.review_status') FROM workflow_receipts WHERE json_extract(payload_json, '$.workflow_action_id') = 'workflow_action_source_transfer_review_1';",
      ),
      'resolved',
    );
    assert.equal(
      queryScalar(dbPath, "SELECT COUNT(*) FROM events WHERE action = 'record_source_update_result';"),
      '1',
    );
  } finally {
    fs.rmSync(dbPath, { force: true });
  }
});
