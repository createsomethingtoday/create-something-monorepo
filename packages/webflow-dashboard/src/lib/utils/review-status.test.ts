import { describe, expect, it } from 'vitest';
import {
	creatorReviewStatusLabel,
	hasReviewRoundBeenReleased,
	isReviewFeedbackReleased,
	isReviewRoundClosed
} from './review-status';

describe('isReviewFeedbackReleased', () => {
	it('treats only notification-triggering statuses as released', () => {
		expect(isReviewFeedbackReleased('📤Changes Requested')).toBe(true);
		expect(isReviewFeedbackReleased('❌Rejected')).toBe(true);
	});

	it('keeps Response to Review unreleased — the field may hold an unreleased draft', () => {
		// While a version sits in 🔁Response to Review, save_draft_feedback can
		// overwrite the feedback field without a status change; the current
		// field value is no longer guaranteed to be what the creator was sent.
		expect(isReviewFeedbackReleased('🔁Response to Review')).toBe(false);
	});

	it('keeps deliberately silent variants unreleased (partnership shield)', () => {
		expect(isReviewFeedbackReleased('📤Changes Requested (No Notification)')).toBe(false);
		expect(isReviewFeedbackReleased('❌Rejected (No Notification)')).toBe(false);
		expect(isReviewFeedbackReleased('✅Approved (No Notification)')).toBe(false);
	});

	it('keeps in-flight and internal statuses unreleased', () => {
		expect(isReviewFeedbackReleased('🆕Ready for Review')).toBe(false);
		expect(isReviewFeedbackReleased('🏃🏾In Review')).toBe(false);
		expect(isReviewFeedbackReleased('👀Admin Feedback Review')).toBe(false);
		expect(isReviewFeedbackReleased('⏸️On Hold')).toBe(false);
		expect(isReviewFeedbackReleased('🚨Error: Feedback Missing')).toBe(false);
		expect(isReviewFeedbackReleased('✅Approved')).toBe(false);
		expect(isReviewFeedbackReleased(undefined)).toBe(false);
		expect(isReviewFeedbackReleased('')).toBe(false);
	});
});

describe('creatorReviewStatusLabel', () => {
	it('maps released statuses to creator-facing labels', () => {
		expect(creatorReviewStatusLabel('📤Changes Requested')).toBe('Changes Requested');
		expect(creatorReviewStatusLabel('🔁Response to Review')).toBe('Response Received');
		expect(creatorReviewStatusLabel('❌Rejected')).toBe('Rejected');
	});

	it('maps approvals, including silent ones, to Approved', () => {
		expect(creatorReviewStatusLabel('✅Approved')).toBe('Approved');
		expect(creatorReviewStatusLabel('✅Approved (No Notification)')).toBe('Approved');
	});

	it('collapses internal, errored, and silent-negative statuses to In Review', () => {
		expect(creatorReviewStatusLabel('👀Admin Feedback Review')).toBe('In Review');
		expect(creatorReviewStatusLabel('👀Managed Feedback Review')).toBe('In Review');
		expect(creatorReviewStatusLabel('Training Check')).toBe('In Review');
		expect(creatorReviewStatusLabel('⏸️On Hold')).toBe('In Review');
		expect(creatorReviewStatusLabel('🚨Error: Reason Missing')).toBe('In Review');
		expect(creatorReviewStatusLabel('📤Changes Requested (No Notification)')).toBe('In Review');
		expect(creatorReviewStatusLabel('❌Rejected (No Notification)')).toBe('In Review');
	});

	it('maps archived variants and handles empty input', () => {
		expect(creatorReviewStatusLabel('☠️Archived')).toBe('Archived');
		expect(creatorReviewStatusLabel('☠️Archived (Auto)')).toBe('Archived');
		expect(creatorReviewStatusLabel(undefined)).toBeUndefined();
		expect(creatorReviewStatusLabel('  ')).toBeUndefined();
	});
});

describe('hasReviewRoundBeenReleased', () => {
	it('treats notification-triggering statuses as released rounds', () => {
		expect(hasReviewRoundBeenReleased('📤Changes Requested')).toBe(true);
		expect(hasReviewRoundBeenReleased('❌Rejected')).toBe(true);
	});

	it('treats Response to Review as a released round — it is only reachable from Changes Requested', () => {
		expect(hasReviewRoundBeenReleased('🔁Response to Review')).toBe(true);
	});

	it('keeps unreleased, silent, and internal statuses out', () => {
		expect(hasReviewRoundBeenReleased('🆕Ready for Review')).toBe(false);
		expect(hasReviewRoundBeenReleased('🏃🏾In Review')).toBe(false);
		expect(hasReviewRoundBeenReleased('⏸️On Hold')).toBe(false);
		expect(hasReviewRoundBeenReleased('📤Changes Requested (No Notification)')).toBe(false);
		expect(hasReviewRoundBeenReleased('❌Rejected (No Notification)')).toBe(false);
		expect(hasReviewRoundBeenReleased('✅Approved')).toBe(false);
		expect(hasReviewRoundBeenReleased(undefined)).toBe(false);
	});
});

describe('isReviewRoundClosed', () => {
	it('treats approvals and archived variants as closed rounds', () => {
		expect(isReviewRoundClosed('✅Approved')).toBe(true);
		expect(isReviewRoundClosed('✅Approved (No Notification)')).toBe(true);
		expect(isReviewRoundClosed('☠️Archived')).toBe(true);
		expect(isReviewRoundClosed('☠️Archived (Auto)')).toBe(true);
	});

	it('keeps open and released rounds not-closed', () => {
		expect(isReviewRoundClosed('📤Changes Requested')).toBe(false);
		expect(isReviewRoundClosed('🔁Response to Review')).toBe(false);
		expect(isReviewRoundClosed('❌Rejected')).toBe(false);
		expect(isReviewRoundClosed('⏸️On Hold')).toBe(false);
		expect(isReviewRoundClosed(undefined)).toBe(false);
	});
});
