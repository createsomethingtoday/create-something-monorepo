import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient, type ReviewRound } from '$lib/server/airtable';
import {
	getReviewCommentsClient,
	isReviewCommentsEnabled,
	ReviewCommentsError
} from '$lib/server/review-comments';
import { creatorReviewStatusLabel, isSilencedReviewStatus } from '$lib/utils/review-status';

const MAX_BODY_CHARS = 20_000;
const CHANGES_REQUESTED = '📤Changes Requested';

/** What a creator may know about one review round: no internal status, no reviewer. */
function toCreatorRound(round: ReviewRound, respondedNow = false) {
	return {
		id: round.id,
		versionNumber: round.versionNumber,
		reviewType: round.reviewType ?? null,
		submittedAt: round.submittedAt ?? null,
		status: respondedNow
			? creatorReviewStatusLabel('🔁Response to Review')
			: (creatorReviewStatusLabel(round.rawStatus) ?? 'In Review')
	};
}

async function requireContext(
	locals: App.Locals,
	platform: App.Platform | undefined,
	assetId: string,
	denied: string
) {
	if (!locals.user?.email) throw error(401, 'Unauthorized');
	if (!platform?.env) throw error(500, 'Platform environment not available');

	const comments = getReviewCommentsClient(platform.env);
	if (!comments) throw error(404, 'Review comments are not enabled');

	const airtable = getAirtableClient(platform.env);
	const { asset, isOwner } = await airtable.getAssetForOwner(assetId, locals.user.email);
	if (!asset) throw error(404, 'Asset not found');
	if (!isOwner) throw error(403, denied);
	if (!isReviewCommentsEnabled(platform.env, asset.type)) {
		throw error(404, 'Review comments are not enabled for this asset');
	}

	return { email: locals.user.email, airtable, comments };
}

function rethrow(err: unknown): never {
	if (err instanceof ReviewCommentsError) {
		// Caller mistakes pass through; anything else is the Worker's problem, not the creator's.
		if (err.status === 400 || err.status === 404) throw error(err.status, err.message);
		console.error('[Review comments] Worker request failed:', err.status, err.message);
		throw error(502, 'Review comments are temporarily unavailable');
	}
	throw err;
}

// GET - Review rounds of the asset and the released comments on them
export const GET: RequestHandler = async ({ params, locals, platform }) => {
	const { email, airtable, comments } = await requireContext(
		locals,
		platform,
		params.id,
		'You do not have permission to view this asset'
	);

	try {
		const [thread, rounds] = await Promise.all([
			comments.listForAsset(params.id, email),
			airtable.getReviewRounds(params.id)
		]);
		// A round in a "(No Notification)" status is deliberately silent, even if
		// feedback on it was released before the status changed. Its comments stay
		// hidden for as long as the round is silent.
		const silent = new Set(
			rounds.filter((round) => isSilencedReviewStatus(round.rawStatus)).map((round) => round.id)
		);
		// Newest round first.
		return json({
			comments: thread.filter((comment) => !silent.has(comment.versionRef)),
			versions: rounds.map((round) => toCreatorRound(round))
		});
	} catch (err) {
		rethrow(err);
	}
};

// POST - Creator reply on one review round of the asset
export const POST: RequestHandler = async ({ params, request, locals, platform }) => {
	const body = (await request.json().catch(() => null)) as {
		versionId?: unknown;
		body?: unknown;
		parentId?: unknown;
	} | null;

	const text = typeof body?.body === 'string' ? body.body.trim() : '';
	if (!text) throw error(400, 'Reply text is required');
	if (text.length > MAX_BODY_CHARS) throw error(400, `Reply exceeds ${MAX_BODY_CHARS} characters`);
	if (typeof body?.versionId !== 'string') throw error(400, 'versionId is required');
	if (body.parentId != null && typeof body.parentId !== 'string') throw error(400, 'Invalid parentId');

	const { email, airtable, comments } = await requireContext(
		locals,
		platform,
		params.id,
		'You do not have permission to modify this asset'
	);

	// Ownership of the asset does not cover an arbitrary version id.
	const rounds = await airtable.getReviewRounds(params.id);
	const round = rounds.find((entry) => entry.id === body.versionId);
	if (!round) throw error(404, 'Version not found for this asset');
	// A silent round has no thread the creator can see, so there is nothing to reply to.
	if (isSilencedReviewStatus(round.rawStatus)) throw error(404, 'no review thread on this version');

	try {
		const comment = await comments.reply(params.id, round.id, email, {
			body: text,
			parentId: body.parentId ?? null
		});

		// A reply to requested changes returns the round to the reviewer's queue,
		// as a reply on the Zendesk ticket does. Only the newest round: an older
		// one is superseded, and reopening it would put a dead item in the queue.
		// The reply is stored either way.
		const responded =
			round.id === rounds[0].id &&
			round.rawStatus.trim() === CHANGES_REQUESTED &&
			(await airtable.markRoundResponded(round.id));

		return json({ comment, version: toCreatorRound(round, responded) }, { status: 201 });
	} catch (err) {
		rethrow(err);
	}
};
