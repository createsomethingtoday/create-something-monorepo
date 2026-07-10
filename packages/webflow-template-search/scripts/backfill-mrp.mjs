#!/usr/bin/env node

const DEFAULT_WORKER_URL = 'https://webflow-template-search.createsomething.workers.dev';
const MAX_SEARCH_LATENCY_MS = 10_000;
const MAX_LOCK_WAIT_MS = 10 * 60 * 1000;

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueAfter = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const mode = has('--status') ? 'status' : has('--dry-run') ? 'dry-run' : has('--resume') ? 'resume' : null;
if (!mode || has('--help')) {
  console.log(`Usage:
  pnpm backfill:mrp -- --status
  pnpm backfill:mrp -- --dry-run [--batch-size 25]
  pnpm backfill:mrp -- --resume [--batch-size 25] [--restart] [--probe-every 5]

Environment:
  SYNC_ADMIN_TOKEN  Required admin token
  WEBFLOW_TEMPLATE_SEARCH_URL  Optional Worker origin override`);
  process.exit(mode ? 0 : 1);
}

const token = process.env.SYNC_ADMIN_TOKEN?.trim();
if (!token) {
  console.error('Error: SYNC_ADMIN_TOKEN is required. Run through the owning secret-manager path.');
  process.exit(1);
}

const workerUrl = (process.env.WEBFLOW_TEMPLATE_SEARCH_URL ?? DEFAULT_WORKER_URL).replace(/\/$/, '');
const batchSize = Number(valueAfter('--batch-size', '25'));
const probeEvery = Number(valueAfter('--probe-every', '5'));
if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 50) throw new Error('--batch-size must be an integer from 1 to 50.');
if (!Number.isInteger(probeEvery) || probeEvery < 1) throw new Error('--probe-every must be a positive integer.');

async function adminRequest(method, searchParams = new URLSearchParams()) {
  const url = new URL('/api/templates/admin/backfill-mrp', workerUrl);
  url.search = searchParams.toString();
  const response = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(MAX_SEARCH_LATENCY_MS),
  });
  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(`Admin request failed (${response.status}): ${JSON.stringify(payload)}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

async function searchProbe(label, params) {
  const url = new URL('/api/templates/search', workerUrl);
  url.search = new URLSearchParams({ page_size: '1', ...params }).toString();
  const startedAt = performance.now();
  const response = await fetch(url, { signal: AbortSignal.timeout(MAX_SEARCH_LATENCY_MS) });
  const elapsedMs = Math.round(performance.now() - startedAt);
  if (!response.ok) throw new Error(`${label} search probe failed with HTTP ${response.status}.`);
  const payload = await response.json();
  if (!Array.isArray(payload.items) || payload.items.length === 0) throw new Error(`${label} search probe returned no items.`);
  if (elapsedMs > MAX_SEARCH_LATENCY_MS) throw new Error(`${label} search probe exceeded ${MAX_SEARCH_LATENCY_MS}ms.`);
  console.log(JSON.stringify({ probe: label, http: response.status, elapsed_ms: elapsedMs, items: payload.items.length }));
}

async function assertSearchAvailable() {
  await searchProbe('queryless', { sort: 'popular' });
  await searchProbe('fts', { q: 'portfolio' });
}

if (mode === 'status') {
  console.log(JSON.stringify(await adminRequest('GET'), null, 2));
  process.exit(0);
}

if (mode === 'dry-run') {
  console.log(
    JSON.stringify(
      await adminRequest('POST', new URLSearchParams({ dry_run: 'true', batch_size: String(batchSize) })),
      null,
      2,
    ),
  );
  process.exit(0);
}

await assertSearchAvailable();
let batch = 0;
let restart = has('--restart');
let lockWaitStartedAt = null;
for (;;) {
  const params = new URLSearchParams({ batch_size: String(batchSize) });
  if (restart) params.set('restart', 'true');
  restart = false;

  let result;
  try {
    result = await adminRequest('POST', params);
    lockWaitStartedAt = null;
  } catch (error) {
    if (error.status !== 409) throw error;
    lockWaitStartedAt ??= Date.now();
    if (Date.now() - lockWaitStartedAt > MAX_LOCK_WAIT_MS) {
      throw new Error(`Shared sync lease remained busy for more than ${MAX_LOCK_WAIT_MS / 1000}s.`);
    }
    console.log(
      JSON.stringify({
        status: 'waiting_for_sync_lease',
        active_mode: error.payload?.active_job?.mode ?? null,
        active_started_at: error.payload?.active_job?.started_at ?? null,
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));
    continue;
  }
  batch += 1;
  console.log(
    JSON.stringify({
      batch,
      status: result.status,
      cursor: result.cursor,
      batch_scanned: result.batch_scanned_records,
      batch_updated: result.batch_updated_records,
      scanned: result.scanned_records,
      updated: result.updated_records,
      remaining: result.remaining_records,
      missing_source: result.missing_source_records,
      missing_mrp: result.missing_mrp_records,
    }),
  );

  if (result.status === 'complete') break;
  if (batch % probeEvery === 0) await assertSearchAvailable();
  await new Promise((resolve) => setTimeout(resolve, 250));
}

await assertSearchAvailable();
console.log(JSON.stringify(await adminRequest('GET'), null, 2));
