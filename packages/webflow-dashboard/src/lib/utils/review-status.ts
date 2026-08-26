/**
 * Creator-safe presentation of Airtable review statuses.
 *
 * The raw 📝Review Status values include internal pipeline states
 * ("👀Admin Feedback Review", "🚨Error: Feedback Missing") and deliberately
 * silent variants ("❌Rejected (No Notification)" — used by the partnership
 * shield while exception decisions are pending). Creators must never see
 * those raw values, and feedback must never render before the review team
 * has released it to the creator.
 */

/**
 * Statuses whose flip itself sends the creator notification, so the CURRENT
 * contents of the feedback field are exactly what was released.
 *
 * "(No Notification)" variants are excluded on purpose: they suppress the
 * creator email, so the dashboard must stay silent too. "🔁Response to
 * Review" is also excluded even though a prior round was released: while a
 * version sits in that status a reviewer can overwrite the feedback field
 * with an unreleased draft (save_draft_feedback writes it without a status
 * change), so the field is no longer guaranteed to hold released text.
 */
const RELEASED_REVIEW_STATUSES = new Set(['📤Changes Requested', '❌Rejected']);

const EXACT_LABELS: Record<string, string> = {
	'📤Changes Requested': 'Changes Requested',
	'🔁Response to Review': 'Response Received',
	'❌Rejected': 'Rejected',
	'✅Approved': 'Approved',
	'✅Approved (No Notification)': 'Approved'
};

/**
 * Statuses that imply this round's release has already happened.
 * "🔁Response to Review" is reachable only from "📤Changes Requested" (the
 * creator replied to the sent email), so it proves a past release even
 * though the CURRENT feedback field may since have been redrafted.
 */
const ROUND_RELEASED_REVIEW_STATUSES = new Set([
	'📤Changes Requested',
	'🔁Response to Review',
	'❌Rejected'
]);

/**
 * True when the review round's feedback has been released to the creator AND
 * the feedback field still holds exactly what was released. Gates the
 * mutable feedback body.
 */
export function isReviewFeedbackReleased(rawStatus: string | undefined | null): boolean {
	if (!rawStatus) return false;
	return RELEASED_REVIEW_STATUSES.has(rawStatus.trim());
}

/**
 * True when the round's release act has occurred, regardless of whether the
 * creator has since responded. Gates immutable release history — the
 * exception-item ledger — which must survive later status transitions.
 */
export function hasReviewRoundBeenReleased(rawStatus: string | undefined | null): boolean {
	if (!rawStatus) return false;
	return ROUND_RELEASED_REVIEW_STATUSES.has(rawStatus.trim());
}

/**
 * Map a raw review status to a creator-facing label. Anything internal,
 * errored, on hold, or deliberately silent collapses to "In Review".
 */
export function creatorReviewStatusLabel(rawStatus: string | undefined | null): string | undefined {
	if (!rawStatus) return undefined;
	const status = rawStatus.trim();
	if (!status) return undefined;

	const exact = EXACT_LABELS[status];
	if (exact) return exact;

	if (status.startsWith('☠️Archived')) return 'Archived';

	return 'In Review';
}
