import type { PageServerLoad } from './$types';
import { getPlatform } from '@create-something/canon/platform';
import {
	getLocalExperimentArtifacts,
	mergeBySlug,
	sortByFeaturedThenDate,
	type ResearchArtifact
} from '$lib/config/researchArtifacts';

export const load: PageServerLoad = async ({ platform }) => {
	const localExperiments = getLocalExperimentArtifacts();

	try {
		// getPlatform() abstracts D1/SQLite - same code works on Cloudflare or Mac Mini
		const { DB } = await getPlatform(platform);

		const result = await DB.prepare(
			`
      SELECT
        id, title, category, content, html_content, reading_time,
        difficulty_level, technical_focus, published_on, excerpt_short,
        excerpt_long, slug, featured, published, is_hidden, archived,
        date, excerpt, description, created_at, updated_at, published_at, ascii_art
      FROM papers
      WHERE published = 1 AND is_hidden = 0 AND archived = 0
    `
		).all<ResearchArtifact>();

		const databaseExperiments = result.results || [];
		const merged = mergeBySlug(databaseExperiments, localExperiments);
		return { papers: sortByFeaturedThenDate(merged) };
	} catch (error) {
		console.error('Error fetching experiments:', error);
		return { papers: sortByFeaturedThenDate(localExperiments) };
	}
};
