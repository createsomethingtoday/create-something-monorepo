import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
	if (!platform?.env?.DB) {
		return { categories: [] };
	}

	try {
		const result = await platform.env.DB.prepare(`
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
		console.error('Error fetching categories from D1:', error);
		return { categories: [] };
	}
};
