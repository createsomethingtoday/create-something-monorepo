import type { Env, Finding } from './types';

export async function logEvent(
  env: Env,
  event: { triggerType: string; itemId: string; action: string; detail?: string },
): Promise<void> {
  await env.DB.prepare(
    'INSERT INTO sync_events (received_at, trigger_type, item_id, action, detail) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(new Date().toISOString(), event.triggerType, event.itemId, event.action, event.detail ?? null)
    .run();
}

export async function startRun(env: Env, kind: 'sweep' | 'full'): Promise<number> {
  // Runs killed mid-flight (eviction, the ~30s HTTP waitUntil cap) never reach
  // finishRun; mark anything "running" for >30 minutes as abandoned.
  const staleCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  await env.DB.prepare(
    `UPDATE reconcile_runs SET status = 'error', error = 'abandoned (no finish recorded)', finished_at = ? WHERE status = 'running' AND started_at < ?`,
  )
    .bind(new Date().toISOString(), staleCutoff)
    .run();
  const result = await env.DB.prepare('INSERT INTO reconcile_runs (started_at, kind) VALUES (?, ?)')
    .bind(new Date().toISOString(), kind)
    .run();
  return Number(result.meta.last_row_id);
}

export async function finishRun(
  env: Env,
  runId: number,
  summary: { itemsScanned: number; rowsScanned: number; findings: number; healed: number; error?: string },
): Promise<void> {
  await env.DB.prepare(
    `UPDATE reconcile_runs SET finished_at = ?, items_scanned = ?, rows_scanned = ?, findings = ?, healed = ?, status = ?, error = ? WHERE id = ?`,
  )
    .bind(
      new Date().toISOString(),
      summary.itemsScanned,
      summary.rowsScanned,
      summary.findings,
      summary.healed,
      summary.error ? 'error' : 'ok',
      summary.error ?? null,
      runId,
    )
    .run();
}

export async function insertFindings(env: Env, runId: number, findings: Finding[]): Promise<void> {
  const now = new Date().toISOString();
  // D1 batch keeps this to a handful of round trips.
  const statement = env.DB.prepare(
    `INSERT INTO findings (run_id, kind, item_id, airtable_record_id, field, webflow_value, airtable_value, healed, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const batch = findings.map((f) =>
    statement.bind(
      runId,
      f.kind,
      f.itemId ?? null,
      f.airtableRecordId ?? null,
      f.field ?? null,
      truncate(f.webflowValue),
      truncate(f.airtableValue),
      f.healed ? 1 : 0,
      now,
    ),
  );
  for (let i = 0; i < batch.length; i += 50) {
    await env.DB.batch(batch.slice(i, i + 50));
  }
}

function truncate(value: string | undefined): string | null {
  if (value == null) return null;
  return value.length > 500 ? `${value.slice(0, 500)}…` : value;
}

export interface RunReport {
  run: Record<string, unknown> | null;
  findingsByKind: Record<string, number>;
  findings: Record<string, unknown>[];
}

export async function latestRunReport(env: Env, kind?: string, limit = 200): Promise<RunReport> {
  const run = kind
    ? await env.DB.prepare('SELECT * FROM reconcile_runs WHERE kind = ? ORDER BY id DESC LIMIT 1').bind(kind).first()
    : await env.DB.prepare('SELECT * FROM reconcile_runs ORDER BY id DESC LIMIT 1').first();
  if (!run) return { run: null, findingsByKind: {}, findings: [] };
  const runId = Number(run.id);
  const byKind = await env.DB.prepare('SELECT kind, COUNT(*) AS n FROM findings WHERE run_id = ? GROUP BY kind')
    .bind(runId)
    .all();
  const findings = await env.DB.prepare('SELECT * FROM findings WHERE run_id = ? ORDER BY kind, id LIMIT ?')
    .bind(runId, limit)
    .all();
  const findingsByKind: Record<string, number> = {};
  for (const row of byKind.results ?? []) findingsByKind[String(row.kind)] = Number(row.n);
  return { run: run as Record<string, unknown>, findingsByKind, findings: (findings.results ?? []) as Record<string, unknown>[] };
}
