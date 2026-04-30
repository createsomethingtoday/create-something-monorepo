/**
 * Content Manifest API
 *
 * Returns metadata for all papers and experiments with actual routes.
 * Used by the unified search indexer to know which content to index.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ IMPORTANT: IO publication is route-based, not D1-backed.           │
 * │                                                                     │
 * │ Papers may be implemented as static Svelte routes or as            │
 * │ markdown-backed dynamic routes. This manifest covers both.         │
 * │                                                                     │
 * │ This manifest provides metadata for the search indexer.            │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * WHEN ADDING A NEW PAPER:
 * 1. Create either a static route or a markdown-backed file-based paper
 * 2. Ensure it is represented by route meta.ts or fileBasedPapers.ts
 * 3. The search indexer will pick it up on the next re-index
 *
 * GET /api/manifest
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getLocalExperimentArtifacts,
	getLocalPaperArtifacts,
	normalizeCategory,
	sortByFeaturedThenDate,
	type ResearchArtifact
} from '$lib/config/researchArtifacts';

interface ContentItem {
	slug: string;
	title: string;
	description: string;
	category?: string;
	route?: string;
	publishedAt?: string | null;
	updatedAt?: string | null;
}

function artifactToContentItem(artifact: ResearchArtifact): ContentItem {
	return {
		slug: artifact.slug,
		title: artifact.title,
		description:
			artifact.description ||
			artifact.excerpt_long ||
			artifact.excerpt_short ||
			artifact.excerpt ||
			artifact.title,
		category: normalizeCategory(artifact.category),
		route: artifact.route,
		publishedAt: artifact.published_at || artifact.date || artifact.created_at,
		updatedAt: artifact.updated_at || artifact.published_at || artifact.created_at
	};
}

export const GET: RequestHandler = async () => {
	const papers = sortByFeaturedThenDate(getLocalPaperArtifacts()).map(artifactToContentItem);
	const experiments = sortByFeaturedThenDate(getLocalExperimentArtifacts()).map(artifactToContentItem);

	return json({
		property: 'io',
		papers,
		experiments,
		// Legacy format for backward compatibility
		paperSlugs: papers.map((paper) => paper.slug),
		experimentSlugs: experiments.map((experiment) => experiment.slug),
		generated: new Date().toISOString()
	});
};
