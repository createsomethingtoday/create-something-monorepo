import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminDelete } from '$lib/admin/index.js';

interface ExperimentRequest {
	id?: string;
	title?: string;
	description?: string;
	content?: string;
	category?: string;
	url?: string;
	featured?: boolean;
	published?: boolean;
}

export const GET: RequestHandler = async ({ platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		// Get all papers and add execution_count as 0 for now
		const papersResult = await db
			.prepare('SELECT * FROM papers ORDER BY created_at DESC')
			.all();

		const papers = (papersResult.results || []).map((paper: any) => ({
			...paper,
			execution_count: 0 // TODO: Get actual execution counts
		}));

		return json(papers);
	} catch (error) {
		console.error('Failed to fetch experiments:', error);
		return json({ error: 'Failed to fetch experiments', details: String(error) }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		const { title, description, content, category, url, featured, published } =
			(await request.json()) as ExperimentRequest;

		if (!title) {
			return json({ error: 'Title is required' }, { status: 400 });
		}

		// Generate ID from title (slug format)
		const id = title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '');

		const now = new Date().toISOString();

		await db
			.prepare(
				`INSERT INTO papers (id, title, description, content, category, url, featured, published, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.bind(
				id,
				title,
				description || '',
				content || '',
				category || null,
				url || null,
				featured ? 1 : 0,
				published ? 1 : 0,
				now,
				now
			)
			.run();

		return json({ success: true, id });
	} catch (error) {
		console.error('Failed to create experiment:', error);
		return json({ error: 'Failed to create experiment' }, { status: 500 });
	}
};

export const PATCH: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		const { id, featured, title, description, content, category, url, published } =
			(await request.json()) as ExperimentRequest;

		if (!id) {
			return json({ error: 'Experiment ID required' }, { status: 400 });
		}

		const updates: string[] = [];
		const values: any[] = [];

		if (featured !== undefined) {
			updates.push('featured = ?');
			values.push(featured ? 1 : 0);
		}
		if (published !== undefined) {
			updates.push('published = ?');
			values.push(published ? 1 : 0);
		}
		if (title !== undefined) {
			updates.push('title = ?');
			values.push(title);
		}
		if (description !== undefined) {
			updates.push('description = ?');
			values.push(description);
		}
		if (content !== undefined) {
			updates.push('content = ?');
			values.push(content);
		}
		if (category !== undefined) {
			updates.push('category = ?');
			values.push(category);
		}
		if (url !== undefined) {
			updates.push('url = ?');
			values.push(url);
		}

		if (updates.length === 0) {
			return json({ error: 'No updates provided' }, { status: 400 });
		}

		// Add updated_at timestamp
		updates.push('updated_at = CURRENT_TIMESTAMP');
		values.push(id);

		await db
			.prepare(`UPDATE papers SET ${updates.join(', ')} WHERE id = ?`)
			.bind(...values)
			.run();

		return json({ success: true });
	} catch (error) {
		console.error('Failed to update experiment:', error);
		return json({ error: 'Failed to update experiment' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const body = (await request.json()) as ExperimentRequest;
	return adminDelete({ db, body, table: 'papers', entityName: 'experiment' });
};
