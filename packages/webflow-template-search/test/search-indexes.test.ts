import { describe, expect, it } from 'vitest';
import { parseSearchParams } from '../src/query.js';
import { searchTemplates } from '../src/search.js';
import type { Env } from '../src/types.js';
import { explainQueryPlan } from './support/d1.js';
import { createTestEnv } from './support/worker.js';

// Migration 0019 indexes the newest and popular ORDER BY expressions and the creator profile
// URL expression. SQLite uses an expression index only when the query repeats the expression
// exactly, so a small edit to sortClause or to the creator filter silently returns every
// sorted page and every creator page to a full table scan. These tests ask SQLite for the plan
// of the SQL that searchTemplates really sends.

interface Recorded {
  sql: string;
  binds: unknown[];
}

/** Records every statement searchTemplates prepares, with the values it binds. */
function recordStatements(env: Env): Recorded[] {
  const seen: Recorded[] = [];
  const db = env.DB;
  const prepare = db.prepare.bind(db);
  (db as unknown as { prepare: typeof db.prepare }).prepare = ((sql: string) => {
    const entry: Recorded = { sql, binds: [] };
    seen.push(entry);
    const statement = prepare(sql);
    const bind = statement.bind.bind(statement);
    (statement as unknown as { bind: typeof statement.bind }).bind = ((...values: unknown[]) => {
      entry.binds = values;
      return bind(...values);
    }) as typeof statement.bind;
    return statement;
  }) as typeof db.prepare;
  return seen;
}

async function plansFor(query: string): Promise<{ items: string[]; count: string[] }> {
  const { env, close } = createTestEnv();
  try {
    const seen = recordStatements(env);
    await searchTemplates(env, parseSearchParams(new URL(`https://test/api/templates/search?${query}`)));
    const items = seen.find((statement) => /LIMIT \? OFFSET \?/.test(statement.sql) && /FROM template_documents d/.test(statement.sql));
    const count = seen.find((statement) => /^\s*SELECT COUNT\(\*\) AS total/.test(statement.sql));
    if (!items || !count) throw new Error('searchTemplates did not send the expected items and count queries');
    return { items: explainQueryPlan(env.DB, items.sql, items.binds), count: explainQueryPlan(env.DB, count.sql, count.binds) };
  } finally {
    close();
  }
}

const sortsInTempBTree = (plan: string[]) => plan.some((detail) => /TEMP B-TREE FOR ORDER BY/.test(detail));
/** A plan line that is only "SCAN d" reads every row of template_documents. */
const scansEveryDocument = (plan: string[]) => plan.some((detail) => /^SCAN d$/.test(detail.trim()));

describe('search indexes (migration 0019)', () => {
  it.each([
    ['newest', 'sort=newest', 'idx_template_documents_sort_newest'],
    ['popular', 'sort=popular', 'idx_template_documents_sort_popular'],
    ['newest in a category', 'sort=newest&category_group_slug=portfolio', 'idx_template_documents_sort_newest'],
    ['popular in a category', 'sort=popular&category_group_slug=portfolio', 'idx_template_documents_sort_popular'],
    ['newest in a subcategory', 'sort=newest&child_category_slug=design-portfolio', 'idx_template_documents_sort_newest'],
    ['featured, newest first', 'scope=featured&sort=newest', 'idx_template_documents_sort_newest'],
  ])('walks the sort index for %s without sorting', async (_name, query, index) => {
    const { items } = await plansFor(`${query}&include=items`);
    expect(items.join('\n')).toContain(index);
    expect(sortsInTempBTree(items)).toBe(false);
    expect(scansEveryDocument(items)).toBe(false);
  });

  it('reads only one creator\'s rows on a creator page', async () => {
    const { items, count } = await plansFor('creator_slug=acme-studio&sort=popular&include=items');
    for (const plan of [items, count]) {
      const text = plan.join('\n');
      expect(text).toContain('idx_template_documents_creator_slug');
      expect(text).toContain('idx_template_documents_creator_profile_url_key');
      expect(scansEveryDocument(plan)).toBe(false);
    }
  });

  it('still finds one template through its unique slug index', async () => {
    const { items } = await plansFor('template_slug=acme-template&include=items');
    expect(items.join('\n')).toMatch(/SEARCH d USING INDEX sqlite_autoindex_template_documents_\d+ \(template_slug=\?\)/);
  });
});
