import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { atlasSessionSummary, atlasSessionToSql } from '../scripts/import-atlas-session.mjs';

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

test('Atlas Studio session imports into canonical workflow tables idempotently', () => {
  const session = {
    version: 1,
    id: 'create-something-test-map',
    client: 'CREATE SOMETHING',
    workflow: 'Database layer test',
    owner: 'Micah',
    createdAt: '2026-07-07T00:00:00.000Z',
    updatedAt: '2026-07-07T01:00:00.000Z',
    canvas: {
      nodes: [
        {
          id: 'node_database',
          kind: 'data',
          label: 'Atlas database layer',
          status: 'run',
          x: 10,
          y: 20,
          width: 280,
          height: 142,
          notes: 'Canonical record layer',
          evidence: 'Fixture evidence',
          createdBy: 'agent',
          updatedAt: '2026-07-07T01:00:00.000Z',
        },
        {
          id: 'node_api',
          kind: 'system',
          label: 'API control plane',
          status: 'wait',
          x: 320,
          y: 20,
          width: 280,
          height: 142,
          createdBy: 'agent',
          updatedAt: '2026-07-07T01:00:00.000Z',
        },
      ],
      edges: [
        {
          id: 'edge_api_database',
          source: 'node_api',
          target: 'node_database',
          label: 'manages records',
          evidence: 'Fixture edge',
          createdBy: 'agent',
          updatedAt: '2026-07-07T01:00:00.000Z',
        },
      ],
    },
    products: ['atlas'],
    productLinks: [],
    observations: [
      {
        id: 'obs_one',
        text: 'Import smoke observation',
        source: 'agent',
        createdAt: '2026-07-07T01:00:00.000Z',
      },
    ],
  };

  assert.deepEqual(atlasSessionSummary(session), {
    canvas_id: 'create-something-test-map',
    client: 'CREATE SOMETHING',
    workflow: 'Database layer test',
    owner: 'Micah',
    nodes: 2,
    edges: 1,
    observations: 1,
  });

  const dbPath = path.join(os.tmpdir(), `app-governance-atlas-import-${process.pid}.sqlite`);
  try {
    fs.rmSync(dbPath, { force: true });
    applyMigrations(dbPath);
    const sql = atlasSessionToSql(session, { actor: 'test-agent', receiptUrl: 'file:///tmp/session.json' });
    applySql(dbPath, sql);
    applySql(dbPath, sql);
    const changedSession = {
      ...session,
      updatedAt: '2026-07-07T02:00:00.000Z',
      observations: [
        ...session.observations,
        {
          id: 'obs_two',
          text: 'Second import smoke observation',
          source: 'agent',
          createdAt: '2026-07-07T02:00:00.000Z',
        },
      ],
    };
    applySql(dbPath, atlasSessionToSql(changedSession, { actor: 'test-agent', receiptUrl: 'file:///tmp/session.json' }));

    assert.equal(queryScalar(dbPath, 'SELECT COUNT(*) FROM atlas_canvases;'), '1');
    assert.equal(queryScalar(dbPath, 'SELECT COUNT(*) FROM atlas_nodes;'), '2');
    assert.equal(queryScalar(dbPath, 'SELECT COUNT(*) FROM atlas_edges;'), '1');
    assert.equal(queryScalar(dbPath, 'SELECT COUNT(*) FROM workflow_runs;'), '1');
    assert.equal(queryScalar(dbPath, 'SELECT COUNT(*) FROM workflow_receipts;'), '3');
    assert.equal(queryScalar(dbPath, "SELECT status FROM atlas_nodes WHERE node_id = 'node_api';"), 'wait');
  } finally {
    fs.rmSync(dbPath, { force: true });
  }
});
