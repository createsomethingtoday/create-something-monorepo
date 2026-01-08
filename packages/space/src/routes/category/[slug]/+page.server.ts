import type { PageServerLoad } from './$types';
import type { Paper } from '$lib/types/paper';

export const load: PageServerLoad = async ({ params, platform }) => {
	const { slug } = params;

	if (!platform?.env?.DB) {
		return {
			papers: [],
			category: { name: slug.charAt(0).toUpperCase() + slug.slice(1), slug, count: 0 }
		};
	}

	try {
		// Fetch papers and category info from D1
		const result = await platform.env.DB.prepare(`
      SELECT * FROM papers
      WHERE category = ? AND published = 1 AND is_hidden = 0 AND archived = 0
      ORDER BY created_at DESC
    `).bind(slug).all<Paper>();

		const papers = result.results || [];

		return {
			papers,
			category: {
				name: slug.charAt(0).toUpperCase() + slug.slice(1),
				slug,
				count: papers.length
			}
		};
	} catch (error) {
		console.error('Error fetching category from D1:', error);
		return {
			papers: [],
			category: { name: slug.charAt(0).toUpperCase() + slug.slice(1), slug, count: 0 }
		};
	}
};
