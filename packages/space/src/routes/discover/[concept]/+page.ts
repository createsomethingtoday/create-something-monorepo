/**
 * Concept Discovery Page Load
 *
 * Extracts the concept from the URL parameter and provides
 * configuration for the ConceptJourney component.
 */

import type { PageLoad } from './$types';
import type { ConceptStory } from '@create-something/canon';

export const load: PageLoad = async ({ params, fetch }) => {
	// Decode and format the concept name
	const concept = decodeURIComponent(params.concept)
		// Convert kebab-case to Title Case
		.replace(/-/g, ' ')
		.replace(/\b\w/g, (char) => char.toUpperCase());

	const searchApiUrl = 'https://unified-search.createsomething.workers.dev';
	let initialStory: ConceptStory | null = null;

	try {
		const response = await fetch(`${searchApiUrl}/story/${encodeURIComponent(concept)}`);
		if (response.ok) initialStory = (await response.json()) as ConceptStory;
	} catch {
		// The component preserves a visible retry path when the upstream API is unavailable.
	}

	return { concept, searchApiUrl, initialStory };
};
