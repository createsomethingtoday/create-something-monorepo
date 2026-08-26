import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getAirtableClient, type RequiredFixExceptionItem } from '$lib/server/airtable';
import { isReviewFeedbackReleased } from '$lib/utils/review-status';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
	// Check authentication
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	if (!platform?.env) {
		throw error(500, 'Platform environment not available');
	}

	const airtable = getAirtableClient(platform.env);

	// Single Airtable call: fetch the record once, derive both ownership and the asset from it.
	const { asset, isOwner } = await airtable.getAssetForOwner(params.id, locals.user.email);
	if (!asset) {
		throw error(404, 'Asset not found');
	}
	if (!isOwner) {
		throw error(403, 'You do not have permission to view this asset');
	}

	// Partner-app exception ledger (❌Denied = fix required). Gated on:
	// (1) ownership above, (2) App type, (3) the 🤝Partnership App flag, and
	// (4) per item, its own version's review round having been released —
	// gates 3 and 4 live inside getPartnerRequiredFixes. No asset-level
	// release gate: the ledger is cross-version history, and released fixes
	// must stay visible while a resubmitted round is still in review.
	let requiredFixes: RequiredFixExceptionItem[] | null = null;
	if (asset.type === 'App') {
		const fixes = await airtable.getPartnerRequiredFixes(params.id);
		requiredFixes = fixes && fixes.length > 0 ? fixes : null;
	}

	// When the round is released, prefer the release-time snapshot — the exact
	// text sent to the creator — over the live lookup, which a reviewer could
	// redraft OR CLEAR after release (so this must not require the live field
	// to still be populated). Null (unstamped rounds predating the
	// release-evidence automation) falls back to the live field in the UI.
	let releasedFeedbackSnapshot: string | null = null;
	if (isReviewFeedbackReleased(asset.latestReviewStatus)) {
		releasedFeedbackSnapshot = await airtable.getReleasedFeedbackSnapshot(params.id);
	}

	return {
		asset,
		requiredFixes,
		releasedFeedbackSnapshot,
		user: locals.user
	};
};
