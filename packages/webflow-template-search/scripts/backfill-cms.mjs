#!/usr/bin/env node
// One bounded batch per invocation. Repeat only after reviewing progress.
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--apply')) throw new Error('Usage: node scripts/backfill-cms.mjs [--apply]');
const token = process.env.SYNC_ADMIN_TOKEN;
if (!token) throw new Error('SYNC_ADMIN_TOKEN is required');
const response = await fetch('https://webflow-template-search.webflow-inc.workers.dev/api/templates/admin/backfill-cms', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ limit: 50, apply: args.includes('--apply') }),
  signal: AbortSignal.timeout(60000),
});
if (!response.ok) throw new Error(`Backfill failed (${response.status}): ${await response.text()}`);
console.log(JSON.stringify(await response.json(), null, 2));
