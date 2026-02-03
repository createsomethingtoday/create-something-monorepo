/**
 * Research Paper Detail - Dynamic Route
 *
 * Serves papers from markdown files in /content/papers/{slug}.md
 * Static Svelte routes take precedence over this dynamic route.
 *
 * Migration strategy:
 * 1. Add paper to fileBasedPapers.ts config
 * 2. Create markdown file in /content/papers/{slug}.md
 * 3. Delete static route in /routes/papers/{slug}/
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { isFileBasedPaper, getFileBasedPaper } from '$lib/config/fileBasedPapers';
import { transformExperimentToPaper } from '@create-something/canon';

export const load: PageServerLoad = async ({ params }) => {
	const { slug } = params;

	// Check if this is a file-based paper (markdown content)
	if (isFileBasedPaper(slug)) {
		const paper = getFileBasedPaper(slug);
		if (!paper) {
			throw error(404, 'Paper not found');
		}

		// Transform to Paper interface for consistent rendering
		const transformedPaper = transformExperimentToPaper(paper);
		return {
			paper: transformedPaper,
			relatedPapers: [] // File-based papers don't have DB-based related papers
		};
	}

	// Not a file-based paper and no static route matched
	throw error(404, `Paper not found: ${slug}`);
};
