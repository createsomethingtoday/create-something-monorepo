import type { PageServerLoad } from './$types';
import type { Paper } from '@create-something/components/types';
import { getFileBasedExperiments } from '$lib/config/fileBasedExperiments';

export const load: PageServerLoad = async ({ platform }) => {
	const fileBasedExperiments = getFileBasedExperiments();

	if (!platform?.env?.DB) {
		return { papers: fileBasedExperiments, categories: [] };
	}

	try {
		// Fetch all published papers from D1
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
		).all();

		const dbPapers = (result.results || []) as Paper[];
		const papers = [...fileBasedExperiments, ...dbPapers];

		// Get category counts
		const categoryResult = await platform.env.DB.prepare(
			`
      SELECT category, COUNT(*) as count
      FROM papers
      WHERE published = 1 AND is_hidden = 0 AND archived = 0
      GROUP BY category
      ORDER BY count DESC
    `
		).all();

		const categories = (categoryResult.results || []).map((row: any) => ({
			name: row.category.charAt(0).toUpperCase() + row.category.slice(1),
			slug: row.category,
			count: row.count
		}));

		return { papers, categories };
	} catch (error) {
		console.error('Error fetching papers from D1:', error);
		return { papers: fileBasedExperiments, categories: [] };
	}
};
