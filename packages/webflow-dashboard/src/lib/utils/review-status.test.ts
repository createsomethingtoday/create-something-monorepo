import { describe, expect, it } from 'vitest';
import { creatorReviewStatusLabel, isReviewFeedbackReleased } from './review-status';

describe('isReviewFeedbackReleased', () => {
	it('treats creator-notified statuses as released', () => {
		expect(isReviewFeedbackReleased('📤Changes Requested')).toBe(true);
		expect(isReviewFeedbackReleased('🔁Response to Review')).toBe(true);
		expect(isReviewFeedbackReleased('❌Rejected')).toBe(true);
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
