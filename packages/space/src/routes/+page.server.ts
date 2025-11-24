import type { PageServerLoad } from './$types';
import type { Paper } from '$lib/types/paper';
import { mockPapers, mockCategories } from '$lib/data/mockPapers';

export const load: PageServerLoad = async ({ platform }) => {
	try {
		// Access Cloudflare bindings via platform.env
		if (!platform?.env?.DB) {
			console.log('⚠️  No DB binding - using mock data');
			return {
				papers: mockPapers,
				categories: mockCategories
			};
		}

		console.log('✅ Using D1 database');

		// Fetch only featured interactive experiments for homepage
		const result = await platform.env.DB.prepare(
			`
      SELECT
        id, title, category, content, html_content, reading_time,
        difficulty_level, technical_focus, published_on, excerpt_short,
        excerpt_long, slug, featured, published, is_hidden, archived,
        date, excerpt, description, created_at, updated_at, published_at, ascii_art
      FROM papers
      WHERE published = 1 AND is_hidden = 0 AND archived = 0 AND featured = 1 AND is_executable = 1
      ORDER BY reading_time DESC
    `
		).all();

		const papers = (result.results || []) as Paper[];

		// Get category counts
		const categoryResult = await platform.env.DB.prepare(
			`
      SELECT
        category,
        COUNT(*) as count
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

		return {
			papers,
			categories
		};
	} catch (error) {
		console.error('Error fetching papers:', error);
		// Fallback to mock data on error
		return {
			papers: mockPapers,
			categories: mockCategories
		};
	}
};
