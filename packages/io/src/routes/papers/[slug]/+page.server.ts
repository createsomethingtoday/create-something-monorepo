/**
 * Research Paper Detail - Server Load
 *
 * Loads a specific research paper by slug, including its full
 * markdown content from the source file.
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getFileBasedPaper, isFileBasedPaper } from '$lib/config/fileBasedPapers';
import { transformResearchPaperToPaper } from '@create-something/components';
import fs from 'fs/promises';
import path from 'path';

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

	// Try to load the markdown content
	let content = '';
	let sections: { id: string; title: string; level: number }[] = [];

	try {
		// In development, read from filesystem
		// In production on Cloudflare, content would need to be bundled or fetched
		const sourcePath = path.resolve(process.cwd(), '../../..', paperMeta.source_path);
		content = await fs.readFile(sourcePath, 'utf-8');

		// Extract section headers for table of contents
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
	} catch {
		// Content not available - paper will show metadata only
		console.warn(`Could not load paper content from ${paperMeta.source_path}`);
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
