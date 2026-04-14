import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAssetDraft } from '$lib/server/drafts';

export const load: PageServerLoad = async ({ locals, params, platform }) => {
	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	const draft = await getAssetDraft(db, params.id, locals.user.email);
	if (!draft) {
		throw error(404, 'Draft not found');
	}

	return {
		userEmail: locals.user.email,
		draft
	};
};
