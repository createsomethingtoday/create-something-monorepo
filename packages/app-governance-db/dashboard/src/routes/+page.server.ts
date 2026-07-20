import { ageHours } from '$lib/format';
import { requireDb } from '$lib/server/db';
import { APP_GOVERNANCE_SOURCE_TYPES, sourceTypePlaceholders } from '$lib/server/source-scope';
import type { CountRow, CursorRow, EventRow, SyncFreshnessRow } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
  const db = requireDb(platform);
  const placeholders = sourceTypePlaceholders();

  const [cursors, triageCounts, findingCounts, notificationCounts, recentEvents, syncCursors] =
    await Promise.all([
      db
        .prepare(
          `SELECT s.source_type, s.external_id, s.name,
                  sc.cursor_value, sc.last_synced_at, sc.synced_by
           FROM sources s
           LEFT JOIN sync_cursors sc
             ON sc.source_type = s.source_type
            AND sc.source_external_id = s.external_id
           WHERE s.source_type IN (${placeholders})
           ORDER BY s.id`
        )
        .bind(...APP_GOVERNANCE_SOURCE_TYPES)
        .all<CursorRow>(),
      db
        .prepare(`SELECT triage_state AS key, COUNT(*) AS n FROM items GROUP BY triage_state`)
        .all<CountRow>(),
      db
        .prepare(`SELECT status AS key, COUNT(*) AS n FROM findings GROUP BY status`)
        .all<CountRow>(),
      db
        .prepare(`SELECT status AS key, COUNT(*) AS n FROM notifications GROUP BY status`)
        .all<CountRow>(),
      db
        .prepare(
          `SELECT e.id, e.actor, e.action, e.entity_type, e.entity_id, NULL AS payload_json, e.created_at
           FROM events e
           WHERE e.entity_type NOT IN ('source', 'source_record')
              OR EXISTS (
                SELECT 1
                FROM sources s
                WHERE s.source_type IN (${placeholders})
                  AND (
                    e.entity_id = s.external_id
                    OR e.entity_id LIKE s.external_id || ':%'
                  )
              )
           ORDER BY e.id DESC LIMIT 12`
        )
        .bind(...APP_GOVERNANCE_SOURCE_TYPES)
        .all<EventRow>(),
      db
        .prepare(
          `SELECT c.source_type, c.source_external_id, c.last_synced_at,
                  COALESCE(s.name, c.source_external_id) AS name
           FROM sync_cursors c
           LEFT JOIN sources s
             ON s.source_type = c.source_type
            AND s.external_id = c.source_external_id
           ORDER BY c.last_synced_at`
        )
        .all<Omit<SyncFreshnessRow, 'hours_since_sync'>>()
    ]);

  const count = (rows: CountRow[], key: string) => rows.find((r) => r.key === key)?.n ?? 0;
  const total = (rows: CountRow[]) => rows.reduce((sum, r) => sum + r.n, 0);

  const syncFreshness: SyncFreshnessRow[] = syncCursors.results.map((row) => {
    const hours = ageHours(row.last_synced_at);
    return { ...row, hours_since_sync: Number.isFinite(hours) ? Math.round(hours * 10) / 10 : null };
  });

  return {
    cursors: cursors.results,
    syncFreshness,
    triageCounts: triageCounts.results,
    findingCounts: findingCounts.results,
    notificationCounts: notificationCounts.results,
    recentEvents: recentEvents.results,
    metrics: {
      newItems: count(triageCounts.results, 'new'),
      needsDecision: count(findingCounts.results, 'needs_decision'),
      queuedNotifications: count(notificationCounts.results, 'queued'),
      totalFindings: total(findingCounts.results)
    }
  };
};
