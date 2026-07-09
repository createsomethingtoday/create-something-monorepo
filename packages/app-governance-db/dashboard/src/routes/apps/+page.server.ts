import { requireDb } from '$lib/server/db';
import type { AppRow } from '$lib/types';
import type { PageServerLoad } from './$types';

const SORTABLE = new Set(['slug', 'name', 'visibility', 'review_status', 'last_seen_at']);

export const load: PageServerLoad = async ({ platform, url }) => {
  const db = requireDb(platform);

  const sortParam = url.searchParams.get('sort') ?? 'slug';
  const sort = SORTABLE.has(sortParam) ? sortParam : 'slug';
  const dir = url.searchParams.get('dir') === 'desc' ? 'DESC' : 'ASC';
  const q = (url.searchParams.get('q') ?? '').trim();

  // Search contract: LIKE on slug/name; exact/prefix match on copied identifiers
  // from Admin, Airtable, or Snowflake.
  const where = q
    ? `WHERE slug LIKE ?1 OR name LIKE ?1
       OR client_id = ?2 OR app_id = ?2 OR workspace_id = ?2 OR mrp_id = ?2
       OR (length(?2) >= 8 AND (
         client_id LIKE ?2 || '%' OR app_id LIKE ?2 || '%' OR workspace_id LIKE ?2 || '%' OR mrp_id LIKE ?2 || '%'
       ))`
    : '';
  const bindings = q ? [`%${q}%`, q] : [];

  const [apps, matched, total, drifted] = await Promise.all([
    db
      .prepare(
        `SELECT id, slug, name, visibility, review_status, client_id, app_id, workspace_id, mrp_id, mrp_update_supported, last_seen_at, last_changed_at
         FROM apps
         ${where}
         ORDER BY ${sort} ${dir}
         LIMIT 1000`
      )
      .bind(...bindings)
      .all<AppRow>(),
    q
      ? db
          .prepare(`SELECT COUNT(*) AS n FROM apps ${where}`)
          .bind(...bindings)
          .first<{ n: number }>()
      : Promise.resolve(null),
    db.prepare(`SELECT COUNT(*) AS n FROM apps`).first<{ n: number }>(),
    db
      .prepare(
        `SELECT id, slug, name, visibility, review_status, client_id, app_id, workspace_id, mrp_id, mrp_update_supported, last_seen_at, last_changed_at
         FROM apps
         WHERE last_changed_at IS NOT NULL
         ORDER BY last_changed_at DESC
         LIMIT 20`
      )
      .all<AppRow>()
  ]);

  return {
    apps: apps.results,
    q,
    matched: matched?.n ?? null,
    total: total?.n ?? apps.results.length,
    drifted: drifted.results,
    sort: { key: sort, direction: dir === 'ASC' ? ('asc' as const) : ('desc' as const) }
  };
};
