import { requireDb } from '$lib/server/db';
import type { ItemRow } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
  const db = requireDb(platform);

  const [items, total] = await Promise.all([
    db
      .prepare(
        `SELECT i.id, s.name AS source_name, i.external_id, i.thread_ts,
                i.author, i.posted_at, i.text, i.permalink, i.triage_state
         FROM items i
         LEFT JOIN sources s ON s.id = i.source_id
         WHERE i.triage_state = 'new'
         ORDER BY i.posted_at DESC
         LIMIT 200`
      )
      .all<ItemRow>(),
    db
      .prepare(`SELECT COUNT(*) AS n FROM items WHERE triage_state = 'new'`)
      .first<{ n: number }>()
  ]);

  return { items: items.results, total: total?.n ?? items.results.length };
};
