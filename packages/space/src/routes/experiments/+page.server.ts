import type { PageServerLoad } from './$types';
import type { Paper } from '$lib/types/paper';
import { getFileBasedExperiments } from '$lib/config/fileBasedExperiments';

// Sort by: featured DESC, then by most recent date DESC
function sortByFeaturedThenDate<
	T extends { featured?: number; published_at?: string | null; created_at?: string }
>(items: T[]): T[] {
	return [...items].sort((a, b) => {
		const aFeatured = a.featured ?? 0;
		const bFeatured = b.featured ?? 0;
		if (bFeatured !== aFeatured) return bFeatured - aFeatured;
		const aDate = new Date(a.published_at || a.created_at || 0).getTime();
		const bDate = new Date(b.published_at || b.created_at || 0).getTime();
		return bDate - aDate;
	});
}

export const load: PageServerLoad = async ({ platform }) => {
	// File-based experiments always available
	const fileBasedExperiments = getFileBasedExperiments();

	if (!platform?.env?.DB) {
		console.log('⚠️ No DB binding - using file-based experiments only');
		return { papers: sortByFeaturedThenDate(fileBasedExperiments) };
	}

	try {
		// Fetch all published papers that are interactive/executable
		const result = await platform.env.DB.prepare(
			`
      SELECT
        id, title, category, content, html_content, reading_time,
        difficulty_level, technical_focus, published_on, excerpt_short,
        excerpt_long, slug, featured, published, is_hidden, archived,
        date, excerpt, description, created_at, updated_at, published_at, ascii_art,
        is_executable
      FROM papers
      WHERE published = 1 AND is_hidden = 0 AND archived = 0 AND is_executable = 1
    `
		).all();

		const databaseExperiments = (result.results || []) as Paper[];
		const merged = [...fileBasedExperiments, ...databaseExperiments];
		return { papers: sortByFeaturedThenDate(merged) };
	} catch (error) {
		console.error('Error fetching experiments from D1:', error);
		return { papers: sortByFeaturedThenDate(fileBasedExperiments) };
	}
};
