#!/usr/bin/env node
// Trigger an incremental sync (picks up Airtable records modified in the last ~10 min).
// Usage: SYNC_ADMIN_TOKEN=<token> node scripts/sync.mjs

const WORKER_URL = 'https://webflow-template-search.webflow-inc.workers.dev';

const token = process.env.SYNC_ADMIN_TOKEN;
if (!token) {
  console.error('Error: SYNC_ADMIN_TOKEN env var is required');
  console.error('  export SYNC_ADMIN_TOKEN=<your-token>');
  process.exit(1);
}

console.log('Triggering incremental sync…');
const res = await fetch(`${WORKER_URL}/api/templates/admin/sync`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
});

const data = await res.json();
if (!res.ok) {
  console.error(`Failed (${res.status}):`, JSON.stringify(data, null, 2));
  process.exit(1);
}

console.log(`Done (${res.status}):`, JSON.stringify(data, null, 2));
