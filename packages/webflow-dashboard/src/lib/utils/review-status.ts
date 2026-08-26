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
 *
 * "🔁Response to Review" is included on a trust assumption: in the normal
 * flow it is only reached from "📤Changes Requested" (the creator replied
 * to the sent email). A direct status write via the review tooling CAN
 * bypass that path; no durable release-proof field exists on versions
 * today, so this is an accepted trade-off — the alternative hides released
 * item history every time a creator replies, and the exposure on the bypass
 * path is limited to item titles of decided findings on the developer's own
 * app. The durable fix is a release timestamp stamped by the notification
 * automation in the review base, which this predicate should adopt if added.
 */
const ROUND_RELEASED_REVIEW_STATUSES = new Set([
	'📤Changes Requested',
	'🔁Response to Review',
	'❌Rejected'
]);

/**
 * True when the review round's feedback has been released to the creator
 * and, in the normal flow, the feedback field still holds what was released.
 * Gates the mutable feedback body.
 *
 * Trust assumption: a reviewer could redraft the field while a released
 * status is still active (save_draft_feedback writes without a status
 * change). No durable release snapshot exists on versions today; the normal
 * edit path re-releases by flipping the status, which re-notifies the
 * creator. The durable fix — a release timestamp/snapshot stamped by the
 * notification automation — should replace this predicate if added.
 */
export function isReviewFeedbackReleased(rawStatus: string | undefined | null): boolean {
	if (!rawStatus) return false;
	return RELEASED_REVIEW_STATUSES.has(rawStatus.trim());
}

/**
 * True when the round's release act has occurred, regardless of whether the
 * creator has since responded. Gates immutable release history — the
 * exception-item ledger — which must survive later status transitions.
 *
 * Used as the FALLBACK for versions without a 📅Feedback Released At stamp
 * (rounds released before the release-evidence automation existed). Stamped
 * versions are gated on the stamp itself, which is durable across all later
 * transitions.
 */
export function hasReviewRoundBeenReleased(rawStatus: string | undefined | null): boolean {
	if (!rawStatus) return false;
	return ROUND_RELEASED_REVIEW_STATUSES.has(rawStatus.trim());
}

/**
 * True when the round is over with no changes outstanding: approved (silent
 * or not) or archived. Required-fix items from a closed round are resolved
 * history, not open asks — the ledger hides them (⚖️ rows never flip to a
 * resolved state, so showing them would present fixed findings as open).
 */
export function isReviewRoundClosed(rawStatus: string | undefined | null): boolean {
	if (!rawStatus) return false;
	const status = rawStatus.trim();
	return status.startsWith('✅Approved') || status.startsWith('☠️Archived');
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
