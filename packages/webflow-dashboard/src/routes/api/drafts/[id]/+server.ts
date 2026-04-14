import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteAssetDraft, getAssetDraft, saveAssetDraft } from '$lib/server/drafts';
import type { AssetDraftData } from '$lib/drafts';

export const GET: RequestHandler = async ({ params, locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const draft = await getAssetDraft(db, params.id, locals.user.email);
	if (!draft) {
		throw error(404, 'Draft not found');
	}

	return json({ draft });
};

export const PUT: RequestHandler = async ({ params, request, locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const existing = await getAssetDraft(db, params.id, locals.user.email);
	if (!existing) {
		throw error(404, 'Draft not found');
	}

	const body = (await request.json().catch(() => ({}))) as {
		draft?: AssetDraftData | Record<string, unknown>;
	};

	if (!body.draft || typeof body.draft !== 'object') {
		throw error(400, 'Draft payload is required');
	}

	try {
		const draft = await saveAssetDraft(db, locals.user.email, {
			id: params.id,
			draft: body.draft
		});

		return json({ draft });
	} catch (err) {
		console.error('Error updating draft:', err);
		throw error(500, err instanceof Error ? err.message : 'Failed to update draft');
	}
};

export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const deleted = await deleteAssetDraft(db, params.id, locals.user.email);
	if (!deleted) {
		throw error(404, 'Draft not found');
	}

	return json({ success: true });
};
