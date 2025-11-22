import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { mockPapers } from '$lib/data/mockPapers';

// Helper to convert undefined to null for D1 compatibility
function toD1Value(value: any): any {
	if (value === undefined) return null;
	if (typeof value === 'object' && value !== null) {
		return JSON.stringify(value);
	}
	return value;
}

export const POST: RequestHandler = async ({ platform }) => {
	if (!platform?.env?.DB) {
		return json(
			{
				success: false,
				error: 'D1 database not available'
			},
			{ status: 503 }
		);
	}

	const db = platform.env.DB;
	const logs: string[] = [];
	let inserted = 0;
	let updated = 0;
	let errors = 0;

	try {
		logs.push(`Starting migration of ${mockPapers.length} papers...`);
		console.log(`Starting migration of ${mockPapers.length} papers...`);

		for (const paper of mockPapers) {
			try {
				logs.push(`Processing: ${paper.slug}`);
				console.log(`Processing: ${paper.slug}`);

				// Check if paper exists
				const existing = await db
					.prepare('SELECT id FROM papers WHERE slug = ?')
					.bind(paper.slug)
					.first();

				if (existing) {
					logs.push(`  Updating existing: ${paper.slug}`);
					console.log(`  Updating existing: ${paper.slug}`);

					// Update existing paper
					await db
						.prepare(
							`
              UPDATE papers SET
                title = ?, category = ?, content = ?, html_content = ?,
                reading_time = ?, difficulty_level = ?, technical_focus = ?,
                published_on = ?, excerpt_short = ?, excerpt_long = ?,
                featured = ?, published = ?, is_hidden = ?, archived = ?,
                date = ?, excerpt = ?, description = ?,
                ascii_art = ?, ascii_thumbnail = ?,
                prerequisites = ?, resource_downloads = ?,
                video_walkthrough_url = ?, interactive_demo_url = ?,
                is_executable = ?, terminal_commands = ?,
                setup_instructions = ?, expected_output = ?,
                environment_config = ?, code_lessons = ?,
                starter_code = ?, solution_code = ?,
                updated_at = CURRENT_TIMESTAMP
              WHERE slug = ?
            `
						)
						.bind(
							toD1Value(paper.title),
							toD1Value(paper.category),
							toD1Value(paper.content),
							toD1Value(paper.html_content),
							toD1Value(paper.reading_time),
							toD1Value(paper.difficulty_level),
							toD1Value(paper.technical_focus),
							toD1Value(paper.published_on),
							toD1Value(paper.excerpt_short),
							toD1Value(paper.excerpt_long),
							paper.featured ? 1 : 0,
							paper.published ? 1 : 0,
							paper.is_hidden ? 1 : 0,
							paper.archived ? 1 : 0,
							toD1Value(paper.date),
							toD1Value(paper.excerpt),
							toD1Value(paper.description),
							toD1Value(paper.ascii_art),
							toD1Value(paper.ascii_thumbnail),
							toD1Value(paper.prerequisites),
							toD1Value(paper.resource_downloads),
							toD1Value(paper.video_walkthrough_url),
							toD1Value(paper.interactive_demo_url),
							paper.is_executable ? 1 : 0,
							toD1Value(paper.terminal_commands),
							toD1Value(paper.setup_instructions),
							toD1Value(paper.expected_output),
							toD1Value(paper.environment_config),
							toD1Value(paper.code_lessons),
							toD1Value(paper.starter_code),
							toD1Value(paper.solution_code),
							toD1Value(paper.slug)
						)
						.run();

					updated++;
					logs.push(`  ✅ Updated: ${paper.slug}`);
					console.log(`  ✅ Updated: ${paper.slug}`);
				} else {
					logs.push(`  Inserting new: ${paper.slug}`);
					console.log(`  Inserting new: ${paper.slug}`);

					// Insert new paper
					await db
						.prepare(
							`
              INSERT INTO papers (
                id, slug, title, category, content, html_content,
                reading_time, difficulty_level, technical_focus,
                published_on, excerpt_short, excerpt_long,
                featured, published, is_hidden, archived,
                date, excerpt, description,
                ascii_art, ascii_thumbnail,
                prerequisites, resource_downloads,
                video_walkthrough_url, interactive_demo_url,
                is_executable, terminal_commands,
                setup_instructions, expected_output,
                environment_config, code_lessons,
                starter_code, solution_code,
                created_at, updated_at, published_at
              ) VALUES (
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?,
                ?, ?,
                ?, ?,
                ?, ?,
                ?, ?,
                ?, ?,
                ?, ?,
                ?, ?,
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
              )
            `
						)
						.bind(
							toD1Value(paper.id),
							toD1Value(paper.slug),
							toD1Value(paper.title),
							toD1Value(paper.category),
							toD1Value(paper.content),
							toD1Value(paper.html_content),
							toD1Value(paper.reading_time),
							toD1Value(paper.difficulty_level),
							toD1Value(paper.technical_focus),
							toD1Value(paper.published_on),
							toD1Value(paper.excerpt_short),
							toD1Value(paper.excerpt_long),
							paper.featured ? 1 : 0,
							paper.published ? 1 : 0,
							paper.is_hidden ? 1 : 0,
							paper.archived ? 1 : 0,
							toD1Value(paper.date),
							toD1Value(paper.excerpt),
							toD1Value(paper.description),
							toD1Value(paper.ascii_art),
							toD1Value(paper.ascii_thumbnail),
							toD1Value(paper.prerequisites),
							toD1Value(paper.resource_downloads),
							toD1Value(paper.video_walkthrough_url),
							toD1Value(paper.interactive_demo_url),
							paper.is_executable ? 1 : 0,
							toD1Value(paper.terminal_commands),
							toD1Value(paper.setup_instructions),
							toD1Value(paper.expected_output),
							toD1Value(paper.environment_config),
							toD1Value(paper.code_lessons),
							toD1Value(paper.starter_code),
							toD1Value(paper.solution_code)
						)
						.run();

					inserted++;
					logs.push(`  ✅ Inserted: ${paper.slug}`);
					console.log(`  ✅ Inserted: ${paper.slug}`);
				}
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : 'Unknown error';
				logs.push(`  ❌ ERROR: ${paper.slug} - ${errorMsg}`);
				console.error(`  ❌ ERROR: ${paper.slug}:`, error);
				errors++;
			}
		}

		logs.push('');
		logs.push('=== Migration Complete ===');
		logs.push(`Inserted: ${inserted}`);
		logs.push(`Updated: ${updated}`);
		logs.push(`Errors: ${errors}`);
		logs.push(`Total processed: ${mockPapers.length}`);

		console.log('');
		console.log('=== Migration Complete ===');
		console.log(`Inserted: ${inserted}`);
		console.log(`Updated: ${updated}`);
		console.log(`Errors: ${errors}`);
		console.log(`Total processed: ${mockPapers.length}`);

		return json({
			success: true,
			stats: {
				inserted,
				updated,
				errors,
				total: mockPapers.length
			},
			logs
		});
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : 'Unknown error';
		logs.push(`FATAL ERROR: ${errorMsg}`);
		console.error('Migration failed:', error);

		return json(
			{
				success: false,
				error: errorMsg,
				stats: {
					inserted,
					updated,
					errors,
					total: mockPapers.length
				},
				logs
			},
			{ status: 500 }
		);
	}
};

// GET endpoint to check migration status
export const GET: RequestHandler = async ({ platform }) => {
	if (!platform?.env?.DB) {
		return json({ available: false, error: 'D1 not available' });
	}

	try {
		const result = await platform.env.DB.prepare(
			'SELECT COUNT(*) as count FROM papers'
		).first<{ count: number }>();

		const mockCount = mockPapers.length;
		const dbCount = result?.count || 0;

		return json({
			available: true,
			database: {
				papers_in_d1: dbCount,
				papers_in_mock: mockCount,
				needs_sync: dbCount < mockCount,
				difference: mockCount - dbCount
			}
		});
	} catch (error) {
		return json({
			available: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		});
	}
};
