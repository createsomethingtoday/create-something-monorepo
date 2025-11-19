import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { Paper } from '@create-something/components/types';
import { getMockPaperBySlug, getMockPapersByCategory } from '$lib/data/mockPapers';

export const load: PageServerLoad = async ({ params, platform }) => {
	const { slug } = params;

	try {
		// Access Cloudflare bindings via platform.env (NOT from 'cloudflare:workers')
		if (!platform?.env?.DB) {
			console.log('⚠️  Running in local dev mode - using mock data for experiment:', slug);
			const paper = getMockPaperBySlug(slug);
			if (!paper) {
				throw error(404, 'Experiment not found');
			}
			const relatedPapers = getMockPapersByCategory(paper.category)
				.filter((p) => p.id !== paper.id)
				.slice(0, 4);
			return { paper, relatedPapers };
		}

		console.log(`✅ Using D1 database for experiment: ${slug}`);

		// Fetch the specific paper by slug from D1
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
			.first();

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
			.all();

		return {
			paper: paperResult as Paper,
			relatedPapers: (relatedResult.results || []) as Paper[]
		};
	} catch (err) {
		console.error('Error fetching experiment:', err);
		throw error(500, 'Failed to fetch experiment data');
	}
};
