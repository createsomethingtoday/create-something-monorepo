import type { PageServerLoad } from './$types';
import type { Paper } from '$lib/types/paper';
import { mockPapers } from '$lib/data/mockPapers';

export const load: PageServerLoad = async ({ platform }) => {
	try {
		// Access Cloudflare bindings via platform.env
		if (!platform?.env?.DB) {
			console.log('⚠️  No DB binding - using mock data');
			return {
				papers: mockPapers.filter(p => p.is_executable)
			};
		}

		console.log('✅ Using D1 database');

		// Fetch all interactive experiments (tutorials)
		const result = await platform.env.DB.prepare(
			`
      SELECT
        id, title, category, content, html_content, reading_time,
        difficulty_level, technical_focus, published_on, excerpt_short,
        excerpt_long, slug, featured, published, is_hidden, archived,
        date, excerpt, description, created_at, updated_at, published_at, ascii_art
      FROM papers
      WHERE published = 1 AND is_hidden = 0 AND archived = 0 AND is_executable = 1
      ORDER BY featured DESC, COALESCE(published_at, created_at) DESC
    `
		).all();

		const papers = (result.results || []) as Paper[];

		return { papers };
	} catch (error) {
		console.error('Error fetching papers:', error);
		return {
			papers: mockPapers.filter(p => p.is_executable)
		};
	}
};
