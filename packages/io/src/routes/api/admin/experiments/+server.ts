import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminDelete } from '$lib/admin/index.js';
import { getCatalogExperimentPapers } from '$lib/config/experimentCatalog';
import { fileBasedPapers } from '$lib/config/fileBasedPapers';
import type { PaperMeta } from '../../../papers/types';

const catalogExperiments = getCatalogExperimentPapers();
const fileBasedExperimentSlugs = new Set(catalogExperiments.map((experiment) => experiment.slug));
const fileBasedExperimentIds = new Set(catalogExperiments.map((experiment) => experiment.id));
const paperModules = import.meta.glob<{ meta: PaperMeta }>('../../../papers/*/meta.ts', {
	eager: true
});
const knownPaperSlugs = new Set([
	...fileBasedPapers.map((paper) => paper.slug),
	...Object.values(paperModules).map((module) => module.meta.slug)
]);

interface ExperimentRequest {
	id?: string;
	slug?: string;
	title?: string;
	description?: string;
	content?: string;
	category?: string;
	url?: string;
	featured?: boolean;
	published?: boolean;
}

interface ExperimentRow {
	id?: string;
	slug?: string | null;
	[key: string]: unknown;
}

function isAdminBackedExperiment(row: ExperimentRow) {
	const id = row.id || '';
	const slug = row.slug || id;

	return (
		Boolean(id) &&
		Boolean(slug) &&
		!knownPaperSlugs.has(slug) &&
		!fileBasedExperimentSlugs.has(slug) &&
		!fileBasedExperimentIds.has(id)
	);
}

function withExecutionCount(row: ExperimentRow) {
	return {
		...row,
		slug: row.slug || row.id,
		execution_count: 0 // TODO: Get actual execution counts
	};
}

export const GET: RequestHandler = async ({ platform, url }) => {
	const db = platform?.env?.DB;
	const id = url.searchParams.get('id');

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		if (id) {
			const experiment = await db.prepare('SELECT * FROM papers WHERE id = ? LIMIT 1').bind(id).first<ExperimentRow>();

			if (!experiment || !isAdminBackedExperiment(experiment)) {
				return json({ error: 'Experiment not found' }, { status: 404 });
			}

			return json(withExecutionCount(experiment));
		}

		const papersResult = await db
			.prepare('SELECT * FROM papers ORDER BY created_at DESC')
			.all<ExperimentRow>();

		const experiments = (papersResult.results || [])
			.filter(isAdminBackedExperiment)
			.map(withExecutionCount);

		return json(experiments);
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
		const { title, description, content, category, url, featured, published, slug: requestedSlug } =
			(await request.json()) as ExperimentRequest;

		if (!title) {
			return json({ error: 'Title is required' }, { status: 400 });
		}

		const slug = (requestedSlug || title)
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '');
		const id = slug;

		const now = new Date().toISOString();

		await db
			.prepare(
				`INSERT INTO papers (id, slug, title, description, content, category, url, featured, published, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.bind(
				id,
				slug,
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

		return json({ success: true, id, slug });
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
		const { id, slug, featured, title, description, content, category, url, published } =
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
		if (slug !== undefined) {
			updates.push('slug = ?');
			values.push(
				slug
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, '-')
					.replace(/^-|-$/g, '')
			);
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
