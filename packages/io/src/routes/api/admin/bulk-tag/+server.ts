import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		// Get all tags
		const tagsResult = await db.prepare('SELECT * FROM tags').all();
		const tags = tagsResult.results || [];

		// Get all experiments/papers
		const papersResult = await db.prepare('SELECT id, title, category, content FROM papers').all();
		const papers = papersResult.results || [];

		let tagsApplied = 0;

		for (const paper of papers) {
			const paperTags: string[] = [];
			const content = (paper.content || '').toLowerCase();
			const title = (paper.title || '').toLowerCase();
			const category = (paper.category || '').toLowerCase();

			// Match tags based on category, title, and content
			for (const tag of tags) {
				const tagName = tag.name.toLowerCase();
				const tagSlug = tag.slug.toLowerCase();

				// Add tag if:
				// 1. Category matches tag slug
				// 2. Title or content contains tag name
				if (
					category === tagSlug ||
					title.includes(tagName) ||
					content.includes(tagName)
				) {
					paperTags.push(tag.id);
				}
			}

			// Remove duplicates
			const uniqueTags = [...new Set(paperTags)];

			// Apply tags if any were found
			if (uniqueTags.length > 0) {
				// Delete existing tags for this paper
				await db.prepare('DELETE FROM paper_tags WHERE paper_id = ?').bind(paper.id).run();

				// Insert new tags
				for (const tagId of uniqueTags) {
					await db
						.prepare('INSERT INTO paper_tags (paper_id, tag_id) VALUES (?, ?)')
						.bind(paper.id, tagId)
						.run();
					tagsApplied++;
				}
			}
		}

		return json({
			success: true,
			papersProcessed: papers.length,
			tagsApplied,
			message: `Applied ${tagsApplied} tags across ${papers.length} experiments`
		});
	} catch (error) {
		console.error('Failed to bulk tag:', error);
		return json({ error: 'Failed to bulk tag', details: String(error) }, { status: 500 });
	}
};
