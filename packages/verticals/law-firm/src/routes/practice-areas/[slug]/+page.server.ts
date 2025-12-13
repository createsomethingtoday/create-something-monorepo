/**
 * Practice Area Detail Page Server Load
 * Validates practice area slug and returns related data
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { siteConfig } from '$lib/config/site';

export const load: PageServerLoad = async ({ params }) => {
	const practiceArea = siteConfig.practiceAreas.find((a) => a.slug === params.slug);

	if (!practiceArea) {
		throw error(404, 'Practice area not found');
	}

	// Get attorneys who practice in this area
	const relatedAttorneys = siteConfig.attorneys.filter((attorney) =>
		attorney.practiceAreas.includes(params.slug)
	);

	// Get case results in this practice area
	const relatedResults = siteConfig.results.filter(
		(result) => result.practiceArea === params.slug
	);

	return {
		practiceArea,
		relatedAttorneys,
		relatedResults
	};
};
