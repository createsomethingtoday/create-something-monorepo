#!/usr/bin/env node
/**
 * Push a Webflow Apps admin snapshot into the app-governance-db D1 layer via MCP.
 *
 * Usage:
 *   APP_GOVERNANCE_MCP_KEY=… node scripts/push-admin-apps.mjs <snapshot.json>
 *   # or with Infisical:
 *   infisical run -- node scripts/push-admin-apps.mjs ~/Downloads/admin-apps-snapshot-2026-07-06.json
 */

import fs from 'node:fs';

const BASE = process.env.APP_GOVERNANCE_MCP_URL ?? 'https://app-governance.mcp.createsomething.agency/mcp';
const KEY = process.env.APP_GOVERNANCE_MCP_KEY;
const BATCH_SIZE = 50;

const SECRET_KEY_PATTERN = /(token|secret|authorization|api[_-]?key|password|cookie|session)/i;

function sanitizePayload(value) {
  if (Array.isArray(value)) return value.map(sanitizePayload);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, SECRET_KEY_PATTERN.test(key) ? '[redacted]' : sanitizePayload(entry)]),
  );
}

export function mapAdminAppsSnapshot(snapshot) {
  const apps = snapshot.apps ?? snapshot;
  return apps.map((app) => ({
    slug: app.slug,
    name: app.name ?? undefined,
    client_id: app.client_id ?? app.clientId ?? undefined,
    app_id: app.app_id ?? app.appId ?? app.admin_app_id ?? app.adminAppId ?? undefined,
    workspace_id: app.workspace_id ?? app.workspaceId ?? undefined,
    mrp_id: app.mrp_id ?? app.mrpId ?? undefined,
    mrp_resource_type: app.mrp_resource_type ?? app.mrpResourceType ?? undefined,
    mrp_status: app.mrp_status ?? app.mrpStatus ?? undefined,
    mrp_visibility: app.mrp_visibility ?? app.mrpVisibility ?? undefined,
    mrp_update_supported: app.mrp_update_supported ?? app.mrpUpdateSupported ?? undefined,
    mrp_verified_at: app.mrp_verified_at ?? app.mrpVerifiedAt ?? undefined,
    mrp_update_error: app.mrp_update_error ?? app.mrpUpdateError ?? undefined,
    visibility: app.visibility ?? undefined,
    review_status: app.review_status ?? undefined,
    categories: Array.isArray(app.categories) ? app.categories : undefined,
    detail_url: app.detail_url ?? app.detailUrl ?? undefined,
    payload_json: JSON.stringify(
      sanitizePayload({
        captured_at: snapshot.captured_at ?? null,
        source: snapshot.source ?? null,
        admin_api_routes: snapshot.admin_api_routes ?? [],
        app,
      }),
    ),
  }));
}

const headers = {
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  Accept: 'application/json, text/event-stream',
};

function parseSse(text) {
  const line = text.split('\n').find((l) => l.startsWith('data:'));
  return line ? JSON.parse(line.slice(5)) : JSON.parse(text);
}

async function rpc(method, params, id, sessionId) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: sessionId ? { ...headers, 'Mcp-Session-Id': sessionId } : headers,
    body: JSON.stringify({ jsonrpc: '2.0', ...(id !== undefined ? { id } : {}), method, params }),
  });
  if (!res.ok) throw new Error(`${method} → HTTP ${res.status}: ${await res.text()}`);
  return { body: id !== undefined ? parseSse(await res.text()) : null, sessionId: res.headers.get('mcp-session-id') };
}

async function main() {
  const file = process.argv[2];
  if (!file || !KEY) {
    console.error('Usage: APP_GOVERNANCE_MCP_KEY=… node scripts/push-admin-apps.mjs <snapshot.json>');
    process.exit(1);
  }

  const snapshot = JSON.parse(fs.readFileSync(file, 'utf-8'));
  const apps = mapAdminAppsSnapshot(snapshot);
  const init = await rpc('initialize', {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'push-admin-apps', version: '1.0' },
  }, 1);
  const sessionId = init.sessionId;
  await rpc('notifications/initialized', {}, undefined, sessionId);

  const totals = { received: 0, created: 0, changed: 0, unchanged: 0 };
  const allDrift = [];
  const allExpectedDrift = [];
  for (let i = 0; i < apps.length; i += BATCH_SIZE) {
    const batch = apps.slice(i, i + BATCH_SIZE);
    const { body } = await rpc('tools/call', {
      name: 'governance_record_apps',
      arguments: { apps: batch, synced_by: `push-admin-apps ${snapshot.captured_at ?? ''}`.trim() },
    }, 2 + i, sessionId);
    const result = JSON.parse(body.result.content[0].text);
    if (!result.ok) throw new Error(`Batch ${i / BATCH_SIZE + 1} failed: ${JSON.stringify(result)}`);
    for (const key of ['received', 'created', 'changed', 'unchanged']) totals[key] += result[key];
    allDrift.push(...(result.drift ?? []));
    allExpectedDrift.push(...(result.expected_drift ?? []));
    console.log(`batch ${i / BATCH_SIZE + 1}: +${result.created} new, ~${result.changed} changed`);
  }

  console.log('\nDone:', totals);
  if (allExpectedDrift.length) {
    console.log('\nExpected endpoint changes reconciled:');
    for (const d of allExpectedDrift) console.log(` - ${d.slug}: receipt ${d.receipt_id}`);
  }
  if (allDrift.length) {
    console.log('\n⚠️ Drift detected (visibility/status/client_id changes):');
    for (const d of allDrift) console.log(` - ${d.slug}:`, JSON.stringify(d.changes));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
