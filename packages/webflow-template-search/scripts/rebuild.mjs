#!/usr/bin/env node
// Trigger a full rebuild — re-fetches ALL Airtable records and refreshes every
// stored image URL. Use after bulk Airtable uploads or when images look stale.
// Usage: SYNC_ADMIN_TOKEN=<token> node scripts/rebuild.mjs

const WORKER_URL = 'https://webflow-template-search.webflow-inc.workers.dev';

const token = process.env.SYNC_ADMIN_TOKEN;
if (!token) {
  console.error('Error: SYNC_ADMIN_TOKEN env var is required');
  console.error('  export SYNC_ADMIN_TOKEN=<your-token>');
  process.exit(1);
}

console.log('Triggering full rebuild (this may take 30–60 s)…');
const res = await fetch(`${WORKER_URL}/api/templates/admin/rebuild`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
});

const data = await res.json();
if (!res.ok) {
  console.error(`Failed (${res.status}):`, JSON.stringify(data, null, 2));
  process.exit(1);
}

console.log(`Done (${res.status}):`, JSON.stringify(data, null, 2));
