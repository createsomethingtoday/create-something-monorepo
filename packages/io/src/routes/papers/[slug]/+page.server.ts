/**
 * Research Paper Detail - Server Load
 *
 * Loads a specific research paper by slug, including its full
 * markdown content bundled at build time.
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getFileBasedPaper, isFileBasedPaper } from '$lib/config/fileBasedPapers';
import { getPaperContent } from '$lib/config/paperContent';
import { transformResearchPaperToPaper } from '@create-something/components';

export const load: PageServerLoad = async ({ params }) => {
	const { slug } = params;

	// Check if this is a file-based paper
	if (!isFileBasedPaper(slug)) {
		throw error(404, 'Paper not found');
	}

	const paperMeta = getFileBasedPaper(slug);
	if (!paperMeta) {
		throw error(404, 'Paper not found');
	}

	// Transform to standard paper format
	const paper = transformResearchPaperToPaper(paperMeta);

	// Get bundled markdown content
	const content = getPaperContent(slug) || '';
	const sections: { id: string; title: string; level: number }[] = [];

	// Extract section headers for table of contents
	if (content) {
		const headerRegex = /^(#{1,3})\s+(.+?)(?:\s*\{#([\w-]+)\})?$/gm;
		let match;
		while ((match = headerRegex.exec(content)) !== null) {
			const level = match[1].length;
			const title = match[2].replace(/\*\*/g, '').trim();
			// Generate ID from title if not provided
			const id =
				match[3] ||
				title
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, '-')
					.replace(/^-|-$/g, '');
			sections.push({ id, title, level });
		}
	}

	return {
		paper: {
			...paper,
			content,
			sections,
			authors: paperMeta.authors,
			abstract: paperMeta.abstract,
			keywords: paperMeta.keywords,
			related_experiments: paperMeta.related_experiments || [],
			tests_principles: paperMeta.tests_principles
		}
	};
};
