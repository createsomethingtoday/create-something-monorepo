import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listAssetDrafts, saveAssetDraft } from '$lib/server/drafts';
import type { AssetDraftData } from '$lib/drafts';

export const GET: RequestHandler = async ({ locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	try {
		const drafts = await listAssetDrafts(db, locals.user.email);
		return json({ drafts });
	} catch (err) {
		console.error('Error fetching drafts:', err);
		throw error(500, 'Failed to fetch drafts');
	}
};

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const body = (await request.json().catch(() => ({}))) as {
		draftId?: string;
		draft?: AssetDraftData | Record<string, unknown>;
	};

	if (!body.draft || typeof body.draft !== 'object') {
		throw error(400, 'Draft payload is required');
	}

	try {
		const draft = await saveAssetDraft(db, locals.user.email, {
			id: body.draftId,
			draft: body.draft
		});

		return json({ draft });
	} catch (err) {
		console.error('Error saving draft:', err);
		throw error(500, err instanceof Error ? err.message : 'Failed to save draft');
	}
};
