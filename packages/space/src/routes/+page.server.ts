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
      ORDER BY COALESCE(published_at, created_at) DESC
    `
		).all();

		const papers = (result.results || []) as Paper[];

		// Get category counts for interactive experiments only
		const categoryResult = await platform.env.DB.prepare(
			`
      SELECT
        category,
        COUNT(*) as count
      FROM papers
      WHERE published = 1 AND is_hidden = 0 AND archived = 0 AND is_executable = 1
      GROUP BY category
      ORDER BY count DESC
    `
		).all();

		// Format category names with proper capitalization
		const formatCategoryName = (slug: string): string => {
			// Common acronyms that should be uppercase
			const acronyms = ['api', 'url', 'seo', 'ui', 'ux', 'css', 'html', 'js', 'ts'];

			return slug
				.replace(/[-_]/g, ' ') // Replace hyphens and underscores with spaces
				.split(' ')
				.map(word => {
					// Check if word is an acronym
					if (acronyms.includes(word.toLowerCase())) {
						return word.toUpperCase();
					}
					// Otherwise, capitalize first letter
					return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
				})
				.join(' ');
		};

		const categories = (categoryResult.results || []).map((row: any) => ({
			name: formatCategoryName(row.category),
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
