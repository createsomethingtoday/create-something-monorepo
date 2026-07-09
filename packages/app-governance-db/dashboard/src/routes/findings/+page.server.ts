import { requireDb } from '$lib/server/db';
import type { FindingRow } from '$lib/types';
import type { PageServerLoad } from './$types';

const SORTABLE = new Set(['id', 'title', 'status', 'priority', 'updated_at']);

export const load: PageServerLoad = async ({ platform, url }) => {
  const db = requireDb(platform);

  const status = url.searchParams.get('status') ?? '';
  const category = url.searchParams.get('category') ?? '';
  const decision = url.searchParams.get('decision') ?? '';
  const owner = url.searchParams.get('owner') ?? '';
  const sortParam = url.searchParams.get('sort') ?? 'updated_at';
  const sort = SORTABLE.has(sortParam) ? sortParam : 'updated_at';
  const dir = url.searchParams.get('dir') === 'asc' ? 'ASC' : 'DESC';

  const where: string[] = [];
  const bindings: (string | number)[] = [];

  if (status) {
    where.push('f.status = ?');
    bindings.push(status);
  }
  if (category) {
    where.push('f.category_id = ?');
    bindings.push(category);
  }
  if (decision === '1') {
    where.push('f.decision_needed = 1');
  }
  if (owner) {
    where.push('f.owner = ?');
    bindings.push(owner);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const [findings, total, categories, owners] = await Promise.all([
    db
      .prepare(
        `SELECT f.id, f.title, f.category_id, c.title AS category_title,
                f.status, f.priority, f.decision_needed, f.owner, f.app_name, f.updated_at
         FROM findings f
         LEFT JOIN categories c ON c.id = f.category_id
         ${whereClause}
         ORDER BY f.${sort} ${dir}
         LIMIT 500`
      )
      .bind(...bindings)
      .all<FindingRow>(),
    db
      .prepare(`SELECT COUNT(*) AS n FROM findings f ${whereClause}`)
      .bind(...bindings)
      .first<{ n: number }>(),
    db
      .prepare(`SELECT id, title FROM categories ORDER BY title`)
      .all<{ id: string; title: string }>(),
    db
      .prepare(
        `SELECT DISTINCT owner FROM findings WHERE owner IS NOT NULL AND owner != '' ORDER BY owner`
      )
      .all<{ owner: string }>()
  ]);

  return {
    findings: findings.results,
    total: total?.n ?? findings.results.length,
    categories: categories.results,
    owners: owners.results.map((row) => row.owner),
    filters: { status, category, decision, owner },
    sort: { key: sort, direction: dir === 'ASC' ? ('asc' as const) : ('desc' as const) }
  };
};
