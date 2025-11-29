import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { Paper } from '@create-something/components/types';
import { isFileBasedExperiment } from '$lib/config/fileBasedExperiments';

export const load: PageServerLoad = async ({ params, platform }) => {
	const { slug } = params;

	// Skip this route for file-based experiments - they have their own routes
	if (isFileBasedExperiment(slug)) {
		throw error(404, 'Not found');
	}

	if (!platform?.env?.DB) {
		throw error(503, 'Database unavailable');
	}

	try {
		const paperResult = await platform.env.DB.prepare(
			`
        SELECT
          id, title, category, content, html_content, reading_time,
          difficulty_level, technical_focus, published_on, excerpt_short,
          excerpt_long, slug, featured, published, is_hidden, archived,
          date, excerpt, description, created_at, updated_at, published_at,
          ascii_art, ascii_thumbnail, prerequisites, resource_downloads,
          video_walkthrough_url, interactive_demo_url, pathway, "order"
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

		const relatedResult = await platform.env.DB.prepare(
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
		console.error('Error fetching experiment from D1:', err);
		throw error(500, 'Failed to load experiment');
	}
};
