/**
 * Concept Discovery Page Load
 *
 * Extracts the concept from the URL parameter and provides
 * configuration for the ConceptJourney component.
 */

import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	// Decode and format the concept name
	const concept = decodeURIComponent(params.concept)
		// Convert kebab-case to Title Case
		.replace(/-/g, ' ')
		.replace(/\b\w/g, (char) => char.toUpperCase());

	return {
		concept,
		// In production, this would be the deployed worker URL
		searchApiUrl: 'https://unified-search.createsomething.workers.dev',
	};
};
