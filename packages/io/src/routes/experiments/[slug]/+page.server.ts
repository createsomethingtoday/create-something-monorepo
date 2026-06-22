import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { Paper } from '@create-something/canon/types';
import { getPlatform } from '@create-something/canon/platform';
import { isFileBasedExperiment, getFileBasedExperiment } from '$lib/config/fileBasedExperiments';
import { transformExperimentToPaper } from '@create-something/canon';

// Load all experiment content markdown files at build time
const contentFiles = import.meta.glob('/content/experiments/*.md', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;

/**
 * Strip YAML frontmatter from markdown content.
 * Frontmatter is delimited by --- at the start of the file.
 */
function stripFrontmatter(raw: string): string {
	const trimmed = raw.trimStart();
	if (!trimmed.startsWith('---')) return trimmed;
	const endIndex = trimmed.indexOf('---', 3);
	if (endIndex === -1) return trimmed;
	return trimmed.slice(endIndex + 3).trimStart();
}

/**
 * Get markdown content for a file-based experiment by slug.
 */
function getExperimentContent(slug: string): string | null {
	const key = `/content/experiments/${slug}.md`;
	const raw = contentFiles[key];
	if (!raw) return null;
	return stripFrontmatter(raw);
}

// Cross-property experiments: experiments that live on other properties
// Redirect to the canonical location
const CROSS_PROPERTY_REDIRECTS: Record<string, string> = {
	'minimal-capture': 'https://createsomething.space/experiments/minimal-capture',
	'motion-ontology': 'https://createsomething.space/experiments/motion-ontology'
};

// File-based experiments that have dedicated route files (with custom interactive content)
const FILE_BASED_WITH_ROUTES = new Set([
	'agentic-visualization',
	'ai-native-filtering',
	'data-patterns',
	'ascii-renderer',
	'canvas-interactivity',
	'ic-mvp-pipeline',
	'kinetic-typography',
	'living-arena',
	'living-arena-gpu',
	'render-preview',
	'render-studio',
	'spritz',
	'text-revelation'
]);

export const load: PageServerLoad = async ({ params, platform }) => {
	const { slug } = params;

	// Redirect cross-property experiments to their canonical location
	if (CROSS_PROPERTY_REDIRECTS[slug]) {
		throw redirect(301, CROSS_PROPERTY_REDIRECTS[slug]);
	}

	// Handle file-based experiments
	if (isFileBasedExperiment(slug)) {
		// If this experiment has a dedicated route, let SvelteKit handle it there
		if (FILE_BASED_WITH_ROUTES.has(slug)) {
			throw error(404, 'Not found');
		}

		// Otherwise, serve the experiment from config
		const experiment = getFileBasedExperiment(slug);
		if (!experiment) {
			throw error(404, 'Experiment not found');
		}

		const paper = transformExperimentToPaper(experiment);
		const content = getExperimentContent(slug);
		return {
			paper: content ? { ...paper, content } : paper,
			relatedPapers: [] // File-based experiments don't have DB-based related papers
		};
	}

	try {
		// getPlatform() abstracts D1/SQLite - same code works on Cloudflare or Mac Mini
		const { DB } = await getPlatform(platform);

		const paperResult = await DB.prepare(
			`
        SELECT
          id, title, category, content, html_content, reading_time,
          difficulty_level, technical_focus, published_on, excerpt_short,
          excerpt_long, slug, featured, published, is_hidden, archived,
          date, excerpt, description, created_at, updated_at, published_at,
          ascii_art, ascii_thumbnail, prerequisites, resource_downloads,
          video_walkthrough_url, interactive_demo_url, pathway, "order"
        FROM papers
        WHERE (slug = ? OR (slug IS NULL AND id = ?)) AND published = 1 AND is_hidden = 0 AND archived = 0
        LIMIT 1
      `
		)
			.bind(slug, slug)
			.first<Paper>();

		if (!paperResult) {
			throw error(404, 'Experiment not found');
		}

		paperResult.slug = paperResult.slug || paperResult.id;

		const relatedResult = await DB.prepare(
			`
        SELECT id, title, category, reading_time, excerpt_short,
          slug, ascii_art, ascii_thumbnail, published_at, date, difficulty_level
        FROM papers
        WHERE category = ? AND id != ? AND published = 1 AND is_hidden = 0 AND archived = 0
        ORDER BY RANDOM()
        LIMIT 4
      `
		)
			.bind(paperResult.category, paperResult.id)
			.all<Paper>();

		return {
			paper: paperResult,
			relatedPapers: relatedResult.results || []
		};
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Error fetching experiment:', err);
		throw error(500, 'Failed to load experiment');
	}
};
