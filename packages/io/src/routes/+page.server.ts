import type { PageServerLoad } from './$types';
import type { Paper } from '@create-something/canon/types';
import {
	buildCategories,
	getLocalResearchArtifacts,
	mergeBySlug
} from '$lib/config/researchArtifacts';

export const load: PageServerLoad = async ({ platform }) => {
	const localArtifacts = getLocalResearchArtifacts();

	if (!platform?.env?.DB) {
		return { papers: localArtifacts, categories: buildCategories(localArtifacts) };
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
		).all<Paper>();

		const dbPapers = result.results || [];
		const papers = mergeBySlug(dbPapers, localArtifacts);
		const categories = buildCategories(papers);

		return { papers, categories };
	} catch (error) {
		console.error('Error fetching papers from D1:', error);
		return { papers: localArtifacts, categories: buildCategories(localArtifacts) };
	}
};
