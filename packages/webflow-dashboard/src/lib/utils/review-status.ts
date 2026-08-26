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
 * Statuses whose feedback has been released to the creator (the status flip
 * itself sends the Zendesk email). "(No Notification)" variants are excluded
 * on purpose: they suppress the creator email, so the dashboard must stay
 * silent too.
 */
const RELEASED_REVIEW_STATUSES = new Set([
	'📤Changes Requested',
	'🔁Response to Review',
	'❌Rejected'
]);

const EXACT_LABELS: Record<string, string> = {
	'📤Changes Requested': 'Changes Requested',
	'🔁Response to Review': 'Response Received',
	'❌Rejected': 'Rejected',
	'✅Approved': 'Approved',
	'✅Approved (No Notification)': 'Approved'
};

/**
 * True when the review round's feedback has been released to the creator.
 * Gates both the feedback body and the partner exceptions ledger.
 */
export function isReviewFeedbackReleased(rawStatus: string | undefined | null): boolean {
	if (!rawStatus) return false;
	return RELEASED_REVIEW_STATUSES.has(rawStatus.trim());
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
