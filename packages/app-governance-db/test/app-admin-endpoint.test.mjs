import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL, fileURLToPath } from 'node:url';
import ts from 'typescript';

import { mapAdminAppsSnapshot } from '../scripts/push-admin-apps.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');

function sqlValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

function bindSql(sql, params) {
  let index = 0;
  return sql.replace(/\?/g, () => sqlValue(params[index++]));
}

function applySql(dbPath, sql) {
  execFileSync('sqlite3', [dbPath], { input: `PRAGMA foreign_keys=ON;\n${sql}`, encoding: 'utf8' });
}

function queryJson(dbPath, sql) {
  const out = execFileSync('sqlite3', ['-json', dbPath, sql], { encoding: 'utf8' }).trim();
  return out ? JSON.parse(out) : [];
}

function queryScalar(dbPath, sql) {
  return execFileSync('sqlite3', [dbPath, sql], { encoding: 'utf8' }).trim();
}

function applyMigrations(dbPath) {
  for (const file of fs.readdirSync(path.join(packageRoot, 'migrations')).filter((name) => name.endsWith('.sql')).sort()) {
    applySql(dbPath, fs.readFileSync(path.join(packageRoot, 'migrations', file), 'utf8'));
  }
}

function createD1Shim(dbPath) {
  return {
    prepare(sql) {
      let params = [];
      const statement = {
        bind(...nextParams) {
          params = nextParams;
          return statement;
        },
        async run() {
          applySql(dbPath, bindSql(sql, params));
          return { success: true, meta: { last_row_id: 1, changes: 1 } };
        },
        async all() {
          return { results: queryJson(dbPath, bindSql(sql, params)) };
        },
        async first() {
          return queryJson(dbPath, bindSql(sql, params))[0] ?? null;
        },
      };
      return statement;
    },
  };
}

async function loadToolsModule() {
  const sourcePath = path.join(packageRoot, 'src/tools.ts');
  const source = fs.readFileSync(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    },
    fileName: sourcePath,
  }).outputText;
  const tempDir = fs.mkdtempSync(path.join(packageRoot, '.tmp-tools-'));
  const tempPath = path.join(tempDir, 'tools.mjs');
  fs.writeFileSync(tempPath, output);
  const mod = await import(pathToFileURL(tempPath).href);
  fs.rmSync(tempDir, { recursive: true, force: true });
  return mod;
}

function captureTools(registerTools, db) {
  const handlers = new Map();
  registerTools({
    tool(name, _description, _schema, handler) {
      handlers.set(name, handler);
    },
  }, () => db);
  return {
    async call(name, args) {
      const handler = handlers.get(name);
      assert.ok(handler, `expected registered tool ${name}`);
      const result = await handler(args);
      return JSON.parse(result.content[0].text);
    },
  };
}

test('push mapping preserves app and MRP identifiers while redacting secret-shaped payload keys', () => {
  const [mapped] = mapAdminAppsSnapshot({
    captured_at: '2026-07-08T22:00:00.000Z',
    source: 'webflow.com/apps (admin view, playwright)',
    admin_api_routes: [{ route: 'GET https://webflow.com/api/apps', count: 1 }],
    apps: [
      {
        slug: 'website-speedy',
        name: 'Website Speedy',
        clientId: 'client-hex',
        appId: '6690fa0428dbd9271f4694a8',
        workspaceId: '666aa3f1500b3b3355235497',
        mrpId: '678fad86a7253e836350a355',
        mrpResourceType: 'INTEGRATION',
        mrpUpdateSupported: true,
        categories: ['Marketing'],
        apiToken: 'do-not-store',
      },
    ],
  });

  assert.equal(mapped.app_id, '6690fa0428dbd9271f4694a8');
  assert.equal(mapped.workspace_id, '666aa3f1500b3b3355235497');
  assert.equal(mapped.mrp_id, '678fad86a7253e836350a355');
  assert.equal(mapped.mrp_resource_type, 'INTEGRATION');
  assert.equal(mapped.mrp_update_supported, true);
  assert.deepEqual(mapped.categories, ['Marketing']);
  const payload = JSON.parse(mapped.payload_json);
  assert.equal(payload.app.apiToken, '[redacted]');
  assert.equal(payload.admin_api_routes[0].route, 'GET https://webflow.com/api/apps');
});

test('endpoint access receipts mark matching app drift as expected', async () => {
  const dbPath = path.join(os.tmpdir(), `app-governance-app-endpoint-${process.pid}.sqlite`);
  try {
    fs.rmSync(dbPath, { force: true });
    applyMigrations(dbPath);
    const { registerTools } = await loadToolsModule();
    const tools = captureTools(registerTools, createD1Shim(dbPath));

    await tools.call('governance_record_apps', {
      synced_by: 'test',
      apps: [
        {
          slug: 'website-speedy',
          name: 'Website Speedy',
          client_id: 'client-hex',
          app_id: '6690fa0428dbd9271f4694a8',
          workspace_id: '666aa3f1500b3b3355235497',
          mrp_id: '678fad86a7253e836350a355',
          mrp_resource_type: 'INTEGRATION',
          mrp_update_supported: true,
          visibility: 'PUBLIC',
          review_status: 'APPROVED',
        },
      ],
    });

    assert.equal(queryScalar(dbPath, "SELECT mrp_id FROM apps WHERE slug = 'website-speedy';"), '678fad86a7253e836350a355');
    assert.equal(queryScalar(dbPath, "SELECT mrp_update_supported FROM apps WHERE slug = 'website-speedy';"), '1');

    await tools.call('governance_record_app_endpoint_access', {
      recorded_by: 'test',
      entity_type: 'app',
      app_slug: 'website-speedy',
      app_id: '6690fa0428dbd9271f4694a8',
      mrp_id: '678fad86a7253e836350a355',
      resource_type: 'INTEGRATION',
      supports_noop_read: true,
      supports_write: true,
      status: 'verified',
      http_status: 200,
      receipt: {
        operation: 'update',
        status: 'succeeded',
        http_status: 200,
        requested_patch_json: '{"visibility":"PRIVATE"}',
        after_json: '{"visibility":"PRIVATE"}',
        expected_until: '2099-01-01 00:00:00',
      },
    });

    const result = await tools.call('governance_record_apps', {
      synced_by: 'test',
      apps: [
        {
          slug: 'website-speedy',
          visibility: 'PRIVATE',
          review_status: 'APPROVED',
        },
      ],
    });

    assert.equal(result.drift.length, 0);
    assert.equal(result.expected_drift.length, 1);
    assert.equal(queryScalar(dbPath, "SELECT COUNT(*) FROM events WHERE action = 'app_expected_change';"), '1');
    assert.equal(queryScalar(dbPath, "SELECT COUNT(*) FROM events WHERE action = 'app_changed';"), '0');
  } finally {
    fs.rmSync(dbPath, { force: true });
  }
});

test('governance_list_apps can find copied Admin identifiers including app_id, workspace_id, and mrp_id', async () => {
  const dbPath = path.join(os.tmpdir(), `app-governance-app-search-${process.pid}.sqlite`);
  try {
    fs.rmSync(dbPath, { force: true });
    applyMigrations(dbPath);
    const { registerTools } = await loadToolsModule();
    const tools = captureTools(registerTools, createD1Shim(dbPath));

    await tools.call('governance_record_apps', {
      synced_by: 'test',
      apps: [
        {
          slug: 'website-speedy',
          name: 'Website Speedy',
          client_id: '486a8390a891a4cf288e4f09eb931913cc15d5b6fe5a319640414f8f233fa7e6',
          app_id: '6690fa0428dbd9271f4694a8',
          workspace_id: '666aa3f1500b3b3355235497',
          mrp_id: '678fad86a7253e836350a355',
          visibility: 'PUBLIC',
          review_status: 'APPROVED',
        },
      ],
    });

    const byMrp = await tools.call('governance_list_apps', { search: '678fad86a7253e836350a355' });
    const byApp = await tools.call('governance_list_apps', { app_id: '6690fa0428dbd9271f4694a8' });
    const byWorkspace = await tools.call('governance_list_apps', { search: '666aa3f1500b3b3355235497' });
    assert.equal(byMrp.length, 1);
    assert.equal(byApp.length, 1);
    assert.equal(byWorkspace.length, 1);
  } finally {
    fs.rmSync(dbPath, { force: true });
  }
});
