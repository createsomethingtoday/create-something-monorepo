import type { PageServerLoad } from './$types';
import { mockCategories } from '$lib/data/mockPapers';

export const load: PageServerLoad = async ({ platform }) => {
  const env = platform?.env;

  if (!env?.DB) {
    return { categories: mockCategories };
  }

  try {
    const result = await env.DB.prepare(`
      SELECT
        category,
        COUNT(*) as count
      FROM papers
      WHERE published = 1 AND is_hidden = 0 AND archived = 0
      GROUP BY category
      ORDER BY count DESC
    `).all();

    const categories = (result.results || []).map((row: any) => ({
      name: row.category.charAt(0).toUpperCase() + row.category.slice(1),
      slug: row.category,
      count: row.count
    }));

    return { categories };
  } catch (error) {
    console.error('Database error:', error);
    return { categories: mockCategories };
  }
};
