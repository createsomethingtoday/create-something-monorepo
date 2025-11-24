import type { PageServerLoad } from './$types';
import type { Paper } from '@create-something/components/types';
import { mockPapers } from '$lib/data/mockPapers';
import { getFileBasedExperiments } from '$lib/config/fileBasedExperiments';

export const load: PageServerLoad = async ({ platform }) => {
	try {
		// Get file-based experiments (always available)
		const fileBasedExperiments = getFileBasedExperiments();

		// Try to use D1, fallback to mock data if unavailable
		if (!platform?.env?.DB) {
			console.log('⚠️  No DB binding - using mock data + file-based experiments');
			const mockExperiments = mockPapers.filter((p) => p.published);
			return { papers: [...fileBasedExperiments, ...mockExperiments] };
		}

		console.log('✅ Using D1 database for experiments + file-based experiments');

		// Fetch all published papers, ordered by featured first, then by created_at DESC
		const result = await platform.env.DB.prepare(
			`
      SELECT
        id, title, category, content, html_content, reading_time,
        difficulty_level, technical_focus, published_on, excerpt_short,
        excerpt_long, slug, featured, published, is_hidden, archived,
        date, excerpt, description, created_at, updated_at, published_at, ascii_art
      FROM papers
      WHERE published = 1 AND is_hidden = 0 AND archived = 0
      ORDER BY featured DESC, created_at DESC
    `
		).all();

		const databaseExperiments = (result.results || []) as Paper[];

		// Merge file-based and database experiments
		// File-based experiments appear first (newest features)
		return { papers: [...fileBasedExperiments, ...databaseExperiments] };
	} catch (error) {
		console.error('Error fetching experiments:', error);
		const mockExperiments = mockPapers.filter((p) => p.published);
		const fileBasedExperiments = getFileBasedExperiments();
		return { papers: [...fileBasedExperiments, ...mockExperiments] };
	}
};
