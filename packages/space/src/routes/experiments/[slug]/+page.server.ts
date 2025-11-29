import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { Paper } from '$lib/types/paper';

export const load: PageServerLoad = async ({ params, platform }) => {
	const { slug } = params;

	if (!platform?.env?.DB) {
		throw error(503, 'Database unavailable');
	}

	try {
		// Fetch the specific paper by slug from D1
		const paperResult = await platform.env.DB.prepare(
			`
        SELECT
          id, title, category, content, html_content, reading_time,
          difficulty_level, technical_focus, published_on, excerpt_short,
          excerpt_long, slug, featured, published, is_hidden, archived,
          date, excerpt, description, created_at, updated_at, published_at,
          ascii_art, ascii_thumbnail, prerequisites, resource_downloads,
          video_walkthrough_url, interactive_demo_url,
          is_executable, terminal_commands, setup_instructions,
          expected_output, environment_config,
          code_lessons, starter_code, solution_code
        FROM papers
        WHERE slug = ? AND published = 1 AND is_hidden = 0 AND archived = 0
        LIMIT 1
      `
		)
			.bind(slug)
			.first<Paper>();

		if (!paperResult) {
			throw error(404, 'Experiment not found');
		}

		// Fetch related papers from the same category
		const relatedResult = await platform.env.DB.prepare(
			`
        SELECT
          id, title, category, reading_time, excerpt_short,
          slug, ascii_art, ascii_thumbnail, published_at, date,
          difficulty_level
        FROM papers
        WHERE category = ?
          AND id != ?
          AND published = 1
          AND is_hidden = 0
          AND archived = 0
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
			throw err; // Re-throw SvelteKit errors
		}
		console.error('Error fetching experiment from D1:', err);
		throw error(500, 'Failed to load experiment');
	}
};
