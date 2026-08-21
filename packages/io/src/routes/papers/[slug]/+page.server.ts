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

import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { isFileBasedPaper, getFileBasedPaper } from '$lib/config/fileBasedPapers';
import { transformExperimentToPaper } from '@create-something/canon';

// Load all paper markdown files at build time.
const contentFiles = import.meta.glob('/content/papers/*.md', {
	eager: true,
	query: '?raw',
	import: 'default'
}) as Record<string, string>;

// These experiments were previously linked from the paper collection. Preserve
// those public URLs while keeping the interactive experiment route canonical.
const LEGACY_EXPERIMENT_REDIRECTS: Record<string, string> = {
	'ascii-renderer': '/experiments/ascii-renderer',
	'ai-native-filtering': '/experiments/ai-native-filtering',
	'webflow-analyzer-lineage': '/experiments/webflow-analyzer-lineage'
};

/**
 * Strip YAML frontmatter from markdown content.
 */
function stripFrontmatter(raw: string): string {
	const trimmed = raw.trimStart();
	if (!trimmed.startsWith('---')) return trimmed;
	const endIndex = trimmed.indexOf('---', 3);
	if (endIndex === -1) return trimmed;
	return trimmed.slice(endIndex + 3).trimStart();
}

/**
 * Get markdown content for a file-based paper by slug.
 */
function getPaperContent(slug: string): string | null {
	const key = `/content/papers/${slug}.md`;
	const raw = contentFiles[key];
	if (!raw) return null;
	return stripFrontmatter(raw);
}

export const load: PageServerLoad = async ({ params }) => {
	const { slug } = params;
	const experimentLocation = LEGACY_EXPERIMENT_REDIRECTS[slug];
	if (experimentLocation) {
		throw redirect(301, experimentLocation);
	}

	// Check if this is a file-based paper (markdown content)
	if (isFileBasedPaper(slug)) {
		const paper = getFileBasedPaper(slug);
		if (!paper) {
			throw error(404, 'Paper not found');
		}

		// Transform to Paper interface for consistent rendering
		const transformedPaper = transformExperimentToPaper(paper);
		const content = getPaperContent(slug);
		return {
			paper: content ? { ...transformedPaper, content } : transformedPaper,
			relatedPapers: [] // File-based papers don't have DB-based related papers
		};
	}

	// Not a file-based paper and no static route matched
	throw error(404, `Paper not found: ${slug}`);
};
