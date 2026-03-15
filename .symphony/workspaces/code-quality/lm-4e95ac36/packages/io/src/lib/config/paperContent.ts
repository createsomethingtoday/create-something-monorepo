/**
 * Paper Content - Bundled at Build Time
 *
 * Cloudflare Pages doesn't have filesystem access at runtime.
 * This module imports paper markdown content using Vite's ?raw
 * suffix, bundling the content at build time.
 *
 * Only papers with published markdown files are imported here.
 * Papers without markdown files will show metadata only.
 */

// Import published paper markdown files as raw strings
import hermeneuticSpiralUx from '../../../../../papers/published/hermeneutic-spiral-ux.md?raw';
import codeModeHermeneutic from '../../../../../papers/published/code-mode-hermeneutic-analysis.md?raw';
import sveltekitZuhandenheit from '../../../../../papers/published/sveltekit-zuhandenheit.md?raw';
import webflowDashboardRefactor from '../../../../../papers/published/webflow-dashboard-refactor.md?raw';

/**
 * Map of paper slugs to their markdown content
 */
export const paperContent: Record<string, string> = {
	'hermeneutic-spiral-ux': hermeneuticSpiralUx,
	'code-mode-hermeneutic-analysis': codeModeHermeneutic,
	'sveltekit-zuhandenheit': sveltekitZuhandenheit,
	'webflow-dashboard-refactor': webflowDashboardRefactor
};

/**
 * Get paper content by slug
 */
export function getPaperContent(slug: string): string | undefined {
	return paperContent[slug];
}
