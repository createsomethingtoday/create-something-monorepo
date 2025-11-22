import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { mockPapers } from '$lib/data/mockPapers';

export const POST: RequestHandler = async ({ platform }) => {
	if (!platform?.env?.DB) {
		return json({ success: false, error: 'D1 database not available' }, { status: 503 });
	}

	const results = {
		updated: 0,
		failed: 0,
		errors: [] as { slug: string; error: string }[]
	};

	try {
		for (const paper of mockPapers) {
			try {
				// Update the html_content field with the converted table HTML
				await platform.env.DB.prepare(
					`UPDATE papers
					 SET html_content = ?,
					     updated_at = CURRENT_TIMESTAMP
					 WHERE slug = ?`
				)
					.bind(paper.content, paper.slug)
					.run();

				results.updated++;
			} catch (error) {
				results.failed++;
				results.errors.push({
					slug: paper.slug,
					error: error instanceof Error ? error.message : 'Unknown error'
				});
			}
		}

		return json({
			success: true,
			message: `Migration completed: ${results.updated} papers updated, ${results.failed} failed`,
			details: results
		});
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Migration failed',
				details: results
			},
			{ status: 500 }
		);
	}
};
