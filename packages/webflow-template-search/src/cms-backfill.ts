import type { Env } from './types.js';

export const CMS_FIELD = 'ℹ️Type: CMS? (🏗️ only)';

/** Airtable omits unchecked checkbox fields in a successful selected-field read. */
export function cmsCheckbox(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (value === undefined || value === false || value === 0) return false;
  throw new Error('Invalid CMS checkbox value');
}

/** One resumable batch; updates only unknown capability values, never index membership. */
export async function backfillCms(env: Env, apply = false, limit = 50) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('limit must be 1–100');
  const rows = (await env.DB.prepare('SELECT id, synced_at FROM template_documents WHERE has_cms IS NULL ORDER BY id LIMIT ?')
    .bind(limit).all<{ id: string; synced_at: string }>()).results ?? [];
  const values = new Map<string, boolean>();
  if (rows.length) {
    if (!env.AIRTABLE_API_KEY) throw new Error('AIRTABLE_API_KEY is required');
    if (rows.some(row => !/^rec[A-Za-z0-9]+$/.test(row.id))) throw new Error('Invalid source record ID');
    const params = new URLSearchParams({ pageSize: '100', filterByFormula: `OR(${rows.map(row => `RECORD_ID()="${row.id}"`).join(',')})` });
    params.append('fields[]', CMS_FIELD);
    const response = await fetch(`https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${env.AIRTABLE_ASSETS_TABLE_ID ?? 'tblRwzpWoLgE9MrUm'}?${params}`, {
      headers: { Authorization: `Bearer ${env.AIRTABLE_API_KEY}` }, signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`CMS source read failed (${response.status})`);
    const payload = await response.json() as { records?: Array<{ id: string; fields: Record<string, unknown> }>; offset?: string };
    if (!Array.isArray(payload.records) || payload.offset || payload.records.length !== rows.length) throw new Error('Incomplete CMS source batch');
    for (const record of payload.records) {
      if (!rows.some(row => row.id === record.id) || values.has(record.id) || !record.fields || typeof record.fields !== 'object' || Array.isArray(record.fields)) throw new Error('Invalid CMS source batch');
      values.set(record.id, cmsCheckbox(record.fields[CMS_FIELD]));
    }
  }
  let updated = 0;
  if (apply && rows.length) {
    const now = new Date().toISOString();
    const statements = rows.map(row => env.DB.prepare('UPDATE template_documents SET has_cms = ? WHERE id = ? AND has_cms IS NULL AND synced_at = ?')
      .bind(values.get(row.id) ? 1 : 0, row.id, row.synced_at));
    // Same atomic batch: failed writes cannot leave a successful stale cache epoch.
    statements.push(env.DB.prepare('INSERT INTO sync_state (key, value_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at')
      .bind('public_search_cache_version', JSON.stringify({ version: `${now}:cms:${crypto.randomUUID()}`, reason: 'cms-backfill' }), now));
    const results = await env.DB.batch(statements);
    updated = results.slice(0, rows.length).reduce((sum, result) => sum + Number(result.meta?.changes ?? 0), 0);
  }
  const counts = await env.DB.prepare('SELECT COUNT(*) AS total, SUM(has_cms = 1) AS with_cms, SUM(has_cms = 0) AS without_cms, SUM(has_cms IS NULL) AS unknown FROM template_documents').first();
  return { dry_run: !apply, selected: rows.length, source_with_cms: [...values.values()].filter(Boolean).length, source_without_cms: [...values.values()].filter(value => !value).length, updated, skipped: apply ? rows.length - updated : 0, counts };
}
