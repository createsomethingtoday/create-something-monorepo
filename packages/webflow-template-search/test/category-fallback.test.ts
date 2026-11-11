import { describe, expect, it } from 'vitest';
import { parseSearchParams } from '../src/query.js';
import { searchTemplates } from '../src/search.js';
import type { Env } from '../src/types.js';
import { explainQueryPlan } from './support/d1.js';
import { createTestEnv } from './support/worker.js';

// A template matches a category through its membership rows. A template with no membership
// rows at all falls back to its own category lists. Production has a few of those, so the
// fallback is live behaviour and must stay exact.

async function seed(env: Env): Promise<void> {
  const documents: Array<[id: string, groups: string[]]> = [
    ['with-membership', ['studio']],
    ['fallback-only', ['studio']],
    ['other-membership', ['studio']],
    ['fallback-other', ['shop']],
  ];
  for (const [id, groups] of documents) {
    await env.DB
      .prepare('INSERT INTO template_documents (id, template_slug, name, synced_at, category_groups_json, category_group_slugs_json) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, id, id, '2026-11-10', JSON.stringify(groups), JSON.stringify(groups))
      .run();
  }
  const membership = 'INSERT INTO template_category_memberships (template_document_id, category_group_name, category_group_slug, child_category_name, child_category_slug) VALUES (?, ?, ?, ?, ?)';
  await env.DB.prepare(membership).bind('with-membership', 'Studio', 'studio', 'Design', 'design').run();
  // Its own list says "studio", but it has membership rows, and they say "shop".
  await env.DB.prepare(membership).bind('other-membership', 'Shop', 'shop', 'Design', 'design').run();
  const child = 'INSERT INTO template_child_categories (template_document_id, child_category_name, child_category_slug) VALUES (?, ?, ?)';
  for (const id of ['with-membership', 'fallback-only', 'other-membership']) await env.DB.prepare(child).bind(id, 'Design', 'design').run();
}

async function found(env: Env, query: string): Promise<{ ids: string[]; total: number }> {
  const result = await searchTemplates(env, parseSearchParams(new URL(`https://test/api/templates/search?${query}&include=items`)));
  return { ids: result.items.map((item) => item.id).sort(), total: result.pagination.total_items };
}

describe('category filter fallback', () => {
  it('matches by membership rows, and by the template\'s own lists only when it has no membership rows', async () => {
    const { env, close } = createTestEnv();
    try {
      await seed(env);
      expect(await found(env, 'category_group_slug=studio')).toEqual({ ids: ['fallback-only', 'with-membership'], total: 2 });
      expect(await found(env, 'category_group_slug=shop')).toEqual({ ids: ['fallback-other', 'other-membership'], total: 2 });
      expect(await found(env, 'category_group_slug=studio&child_category_slug=design')).toEqual({ ids: ['fallback-only', 'with-membership'], total: 2 });
      expect(await found(env, 'category_group_slug=shop&child_category_slug=design')).toEqual({ ids: ['other-membership'], total: 1 });
      expect(await found(env, 'child_category_slug=design')).toEqual({ ids: ['fallback-only', 'other-membership', 'with-membership'], total: 3 });
    } finally {
      close();
    }
  });

  it('counts a category on an index, without opening every template row', async () => {
    const { env, close } = createTestEnv();
    try {
      const seen: Array<{ sql: string; binds: unknown[] }> = [];
      const db = env.DB;
      const prepare = db.prepare.bind(db);
      (db as unknown as { prepare: typeof db.prepare }).prepare = ((sql: string) => {
        const entry = { sql, binds: [] as unknown[] };
        seen.push(entry);
        const statement = prepare(sql);
        const bind = statement.bind.bind(statement);
        (statement as unknown as { bind: typeof statement.bind }).bind = ((...values: unknown[]) => {
          entry.binds = values;
          return bind(...values);
        }) as typeof statement.bind;
        return statement;
      }) as typeof db.prepare;
      for (const query of ['category_group_slug=studio', 'category_group_slug=studio&child_category_slug=design']) {
        seen.length = 0;
        await searchTemplates(env, parseSearchParams(new URL(`https://test/api/templates/search?${query}&include=items`)));
        const count = seen.find((statement) => /^\s*SELECT COUNT\(\*\) AS total/.test(statement.sql));
        if (!count) throw new Error('searchTemplates did not send a count query');
        const plan = explainQueryPlan(env.DB, count.sql, count.binds);
        // "SCAN d" alone is the table itself. The filter must need only the id, so SQLite can
        // run the count on a covering index.
        expect(plan.some((detail) => /^SCAN d$/.test(detail))).toBe(false);
        expect(plan[0]).toMatch(/^SCAN d USING COVERING INDEX /);
      }
    } finally {
      close();
    }
  });
});
