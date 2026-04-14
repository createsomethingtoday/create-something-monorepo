import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { promoteAssetDraft } from '$lib/server/drafts';

export const POST: RequestHandler = async ({ params, locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	const db = platform?.env?.DB;
	if (!db || !platform?.env) {
		throw error(500, 'Platform environment not available');
	}

	try {
		const result = await promoteAssetDraft(db, platform.env, locals.user.email, params.id);
		return json({
			asset: result.asset,
			draft: result.draft
		});
	} catch (err) {
		console.error('Error promoting draft:', err);
		const message = err instanceof Error ? err.message : 'Failed to promote draft';
		if (message === 'Draft not found.') {
			throw error(404, message);
		}
		throw error(500, message);
	}
};
