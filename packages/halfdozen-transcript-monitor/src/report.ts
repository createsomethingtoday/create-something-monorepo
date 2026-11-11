export interface Row {
  unresolved_at?: string | null; key: string; status: string | null; updated_at: string | null;
  page_id: string | null; version: string | null; ready_version: string | null;
  phase: string | null; projection_version: string | null; index_block_id: string | null;
  verified_at: string | null; owner: string | null; expires_at: string | null;
}
export interface Alert { code: string; key: string; page_url: string | null }
export function assess(row: Row, now: number, graceSeconds: number): Alert[] {
  const alerts: Alert[] = [];
  const page = row.page_id?.replaceAll('-', '');
  const add = (code: string) => alerts.push({ code, key: row.key, page_url: page && /^[a-f0-9]{32}$/i.test(page) ? `https://www.notion.so/${page}` : null });
  if (row.status === 'failed') add('failed_job');
  if (row.owner && row.expires_at && Date.parse(row.expires_at) > now) return alerts;
  // Expiry is the last available activity signal for ledger-less failed attempts.
  const activity = row.unresolved_at && (!row.ready_version || row.phase === 'writing')
    ? [row.unresolved_at] : [row.updated_at,row.verified_at,row.expires_at];
  const ageFrom = Math.max(...activity.map(v=>v ? Date.parse(v) : NaN).filter(Number.isFinite));
  const unready = !row.ready_version || !row.index_block_id || !row.verified_at;
  if (!Number.isFinite(ageFrom)) { if (unready || row.phase !== 'complete') add('age_unknown'); return alerts; }
  if (now-ageFrom < graceSeconds*1000) return alerts;
  if (row.phase === 'writing') add('stale_writing');
  if (row.status && !['synced','failed'].includes(row.status)) add('stalled_job');
  if (unready) add('unready');
  if (row.ready_version && (row.ready_version !== row.version || row.ready_version !== row.projection_version || row.phase !== 'complete')) add('readiness_mismatch');
  return alerts;
}
// Explicit columns intentionally exclude download URLs, original URLs, manifests,
// titles, and error strings (which can contain upstream credentials).
export const SELECT_ROWS = `SELECT l.dedup_key AS key, l.status, l.updated_at,
 COALESCE(i.page_id,l.notion_page_id,p.page_id) AS page_id, COALESCE(j.reserved_at,l.first_seen_at) AS unresolved_at, i.version,i.ready_version,i.index_block_id,i.verified_at,i.owner,i.expires_at,
 p.phase,p.version AS projection_version
 FROM transcript_sync_ledger l
 LEFT JOIN transcript_ingestion i ON i.selected_key=l.dedup_key
 LEFT JOIN transcript_inline_projection p ON p.page_id=COALESCE(i.page_id,l.notion_page_id,
   (SELECT MIN(candidate.page_id) FROM transcript_inline_projection candidate WHERE candidate.version=i.version HAVING COUNT(*)=1))
 LEFT JOIN transcript_write_journal j ON j.operation_key=CASE WHEN json_valid(p.manifest) THEN json_extract(p.manifest,'$.pending.key') END
 WHERE julianday(l.first_seen_at)>=julianday(?) AND julianday(l.recording_start_time)>=julianday(?)
 UNION ALL
 SELECT i.meeting_key AS key,NULL AS status,NULL AS updated_at,COALESCE(i.page_id,p.page_id),j.reserved_at,i.version,i.ready_version,i.index_block_id,i.verified_at,i.owner,i.expires_at,p.phase,p.version AS projection_version
 FROM transcript_ingestion i LEFT JOIN transcript_sync_ledger l ON l.dedup_key=i.selected_key
 LEFT JOIN transcript_inline_projection p ON p.page_id=COALESCE(i.page_id,
   (SELECT MIN(candidate.page_id) FROM transcript_inline_projection candidate WHERE candidate.version=i.version HAVING COUNT(*)=1))
 LEFT JOIN transcript_write_journal j ON j.operation_key=CASE WHEN json_valid(p.manifest) THEN json_extract(p.manifest,'$.pending.key') END
 WHERE l.dedup_key IS NULL AND json_valid(i.meeting_key)
 AND date(json_extract(i.meeting_key,'$[1]'))>date(?)
 ORDER BY key`;
export function cutoffValue(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error('invalid_scope');
  const normalized = new Date(value).toISOString();
  if (normalized !== value.replace(/Z$/,value.includes('.') ? 'Z' : '.000Z')) throw new Error('invalid_scope');
  return normalized;
}
export async function report(db: Pick<D1Database,'prepare'>, cutoff: string, graceSeconds: number, now=Date.now()) {
  cutoff=cutoffValue(cutoff);
  const result=await db.prepare(SELECT_ROWS).bind(cutoff,cutoff,cutoff).all<Row>();
  if (!result.success) throw new Error('read_failed');
  const alerts=result.results.flatMap(row=>assess(row,now,graceSeconds));
  return {ok:alerts.length===0, checked_at:new Date(now).toISOString(),scope_not_before:cutoff,grace_seconds:graceSeconds,checked_rows:result.results.length,alerts,notion_live_verified:false};
}
