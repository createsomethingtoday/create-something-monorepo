import type { PageServerLoad } from './$types';
import type { Paper } from '@create-something/canon/types';
import {
	filterByCategory,
	formatCategoryName,
	getLocalResearchArtifacts,
	mergeBySlug,
	normalizeCategory,
	sortByFeaturedThenDate,
	type ResearchArtifact
} from '$lib/config/researchArtifacts';

function buildCategoryPayload(artifacts: ResearchArtifact[], categorySlug: string) {
	const slug = normalizeCategory(categorySlug);
	const papers = sortByFeaturedThenDate(filterByCategory(artifacts, slug));

	return {
		papers,
		category: {
			name: formatCategoryName(slug),
			slug,
			count: papers.length
		}
	};
}

export const load: PageServerLoad = async ({ params, platform }) => {
	const localArtifacts = getLocalResearchArtifacts();

	if (!platform?.env?.DB) {
		return buildCategoryPayload(localArtifacts, params.slug);
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
    `
		).all<Paper>();

		const artifacts = mergeBySlug((result.results || []) as ResearchArtifact[], localArtifacts);
		return buildCategoryPayload(artifacts, params.slug);
	} catch (error) {
		console.error('Error fetching category from D1:', error);
		return buildCategoryPayload(localArtifacts, params.slug);
	}
};
