import type { PageServerLoad } from './$types';
import type { Paper } from '$lib/types/paper';

export const load: PageServerLoad = async ({ platform }) => {
	if (!platform?.env?.DB) {
		return { papers: [] };
	}

	try {
		const result = await platform.env.DB.prepare(
			`
      SELECT
        id, title, category, content, html_content, reading_time,
        difficulty_level, technical_focus, published_on, excerpt_short,
        excerpt_long, slug, featured, published, is_hidden, archived,
        date, excerpt, description, created_at, updated_at, published_at, ascii_art
      FROM papers
      WHERE published = 1 AND is_hidden = 0 AND archived = 0
      ORDER BY featured DESC, COALESCE(published_at, created_at) DESC
    `
		).all<Paper>();

		return { papers: result.results || [] };
	} catch (error) {
		console.error('Error fetching experiments from D1:', error);
		return { papers: [] };
	}
};
