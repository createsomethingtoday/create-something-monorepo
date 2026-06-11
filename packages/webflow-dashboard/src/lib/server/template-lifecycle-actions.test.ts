import { describe, expect, it } from 'vitest';
import type { Asset } from './airtable';
import {
	DETAIL_ONLY_SEARCH_VISIBILITY,
	REENTRY_REVIEW_SEARCH_VISIBILITY,
	SEARCHABLE_VISIBILITY,
	planTemplateLifecycleAction
} from './template-lifecycle-actions';

function templateAsset(overrides: Partial<Asset> = {}): Asset {
	return {
		id: 'recTemplate',
		name: 'Template',
		type: 'Template',
		status: 'Published',
		publishedDate: '2025-01-01T00:00:00.000Z',
		uniqueViewers: 500,
		cumulativePurchases: 0,
		cumulativeRevenue: 0,
		...overrides
	};
}

function captureError(run: () => unknown): { body?: { message?: string }; message?: string } {
	try {
		run();
	} catch (err) {
		return err as { body?: { message?: string }; message?: string };
	}

	throw new Error('Expected function to throw');
}

describe('planTemplateLifecycleAction', () => {
	it('plans detail-only suppression for underperforming templates after recovery is used', () => {
		const plan = planTemplateLifecycleAction(templateAsset({ recoveryOfferUsed: true }), {
			action: 'move_detail_only',
			confirm: true
		});

		expect(plan).toMatchObject({
			action: 'move_detail_only',
			status: 'applied',
			searchVisibility: DETAIL_ONLY_SEARCH_VISIBILITY,
			requiresReview: false,
			healthCode: 'move_detail_only'
		});
	});

	it('plans a governed re-entry review without restoring search automatically', () => {
		const plan = planTemplateLifecycleAction(
			templateAsset({
				searchVisibility: 'Detail only',
				recoveryOfferUsed: true,
				qualifiedSales30d: 4,
				cumulativePurchases: 4
			}),
			{
				action: 'request_search_reentry',
				confirm: true
			}
		);

		expect(plan).toMatchObject({
			action: 'request_search_reentry',
			status: 'review_requested',
			searchVisibility: REENTRY_REVIEW_SEARCH_VISIBILITY,
			requiresReview: true,
			healthCode: 'eligible_for_reentry'
		});
	});

	it('rejects search re-entry requests below the sales threshold', () => {
		const err = captureError(() =>
			planTemplateLifecycleAction(
				templateAsset({
					searchVisibility: 'Detail only',
					recoveryOfferUsed: true,
					qualifiedSales30d: 3
				}),
				{
					action: 'request_search_reentry',
					confirm: true
				}
			)
		);

		expect(err.body?.message ?? err.message).toBe(
			'This template has not reached the marketplace search re-entry threshold.'
		);
	});

	it('does not request re-entry twice after review is already pending', () => {
		const err = captureError(() =>
			planTemplateLifecycleAction(
				templateAsset({
					searchVisibility: 'Detail only - re-entry review requested',
					recoveryOfferUsed: true,
					qualifiedSales30d: 4,
					cumulativePurchases: 4
				}),
				{
					action: 'request_search_reentry',
					confirm: true
				}
			)
		);

		expect(err.body?.message ?? err.message).toBe(
			'Search re-entry review has already been requested for this template'
		);
	});

	it('requires admin access before approving search re-entry', () => {
		const err = captureError(() =>
			planTemplateLifecycleAction(
				templateAsset({
					searchVisibility: 'Detail only - re-entry review requested',
					recoveryOfferUsed: true,
					qualifiedSales30d: 4,
					cumulativePurchases: 4
				}),
				{
					action: 'approve_search_reentry',
					confirm: true
				}
			)
		);

		expect(err.body?.message ?? err.message).toBe(
			'Only marketplace admins can approve search re-entry'
		);
	});

	it('allows admins to restore search after the re-entry threshold is met', () => {
		const plan = planTemplateLifecycleAction(
			templateAsset({
				searchVisibility: 'Detail only - re-entry review requested',
				recoveryOfferUsed: true,
				qualifiedSales30d: 4,
				cumulativePurchases: 4
			}),
			{
				action: 'approve_search_reentry',
				confirm: true
			},
			{ isAdmin: true }
		);

		expect(plan).toMatchObject({
			action: 'approve_search_reentry',
			status: 'applied',
			searchVisibility: SEARCHABLE_VISIBILITY,
			requiresReview: false,
			healthCode: 'reentry_review_requested'
		});
	});
});
