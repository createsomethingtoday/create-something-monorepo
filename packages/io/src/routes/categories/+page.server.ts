import type { PageServerLoad } from './$types';
import type { Paper } from '@create-something/canon/types';
import {
	buildCategories,
	getLocalResearchArtifacts,
	mergeBySlug,
	type ResearchArtifact
} from '$lib/config/researchArtifacts';

export const load: PageServerLoad = async ({ platform }) => {
	const localArtifacts = getLocalResearchArtifacts();

	if (!platform?.env?.DB) {
		return { categories: buildCategories(localArtifacts) };
	}

	try {
		const result = await platform.env.DB.prepare(
			`
      SELECT id, title, category, slug, created_at, updated_at, published_at, featured
      FROM papers
      WHERE published = 1 AND is_hidden = 0 AND archived = 0
    `
		).all<Paper>();

		const artifacts = mergeBySlug((result.results || []) as ResearchArtifact[], localArtifacts);

		return { categories: buildCategories(artifacts) };
	} catch (error) {
		console.error('Error fetching categories from D1:', error);
		return { categories: buildCategories(localArtifacts) };
	}
};
