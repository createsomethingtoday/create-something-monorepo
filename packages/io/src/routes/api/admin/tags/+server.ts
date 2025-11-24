import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		const tags = await db
			.prepare('SELECT * FROM tags ORDER BY name ASC')
			.all();

		return json(tags.results || []);
	} catch (error) {
		console.error('Failed to fetch tags:', error);
		return json({ error: 'Failed to fetch tags' }, { status: 500 });
	}
};

// Get tags for a specific paper/experiment
export const POST: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		const { paper_id } = await request.json();

		if (!paper_id) {
			return json({ error: 'Paper ID required' }, { status: 400 });
		}

		const paperTags = await db
			.prepare(
				`SELECT t.* FROM tags t
				INNER JOIN paper_tags pt ON t.id = pt.tag_id
				WHERE pt.paper_id = ?`
			)
			.bind(paper_id)
			.all();

		return json(paperTags.results || []);
	} catch (error) {
		console.error('Failed to fetch paper tags:', error);
		return json({ error: 'Failed to fetch paper tags' }, { status: 500 });
	}
};

// Update tags for a paper/experiment
export const PATCH: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		const { paper_id, tag_ids } = await request.json();

		if (!paper_id) {
			return json({ error: 'Paper ID required' }, { status: 400 });
		}

		// Delete existing tags
		await db
			.prepare('DELETE FROM paper_tags WHERE paper_id = ?')
			.bind(paper_id)
			.run();

		// Insert new tags
		if (tag_ids && tag_ids.length > 0) {
			for (const tag_id of tag_ids) {
				await db
					.prepare('INSERT INTO paper_tags (paper_id, tag_id) VALUES (?, ?)')
					.bind(paper_id, tag_id)
					.run();
			}
		}

		return json({ success: true });
	} catch (error) {
		console.error('Failed to update paper tags:', error);
		return json({ error: 'Failed to update paper tags' }, { status: 500 });
	}
};
