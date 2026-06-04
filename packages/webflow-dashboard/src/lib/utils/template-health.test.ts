import { describe, expect, it } from 'vitest';

import type { Asset } from '$lib/server/airtable';
import { computeTemplateHealth } from './template-health';

const NOW = new Date('2026-06-03T12:00:00.000Z');

function templateAsset(overrides: Partial<Asset> = {}): Asset {
	return {
		id: 'recTemplate',
		name: 'Signal Template',
		type: 'Template',
		status: 'Published',
		publishedDate: '2026-01-01',
		uniqueViewers: 250,
		cumulativePurchases: 8,
		cumulativeRevenue: 440,
		qualityScore: 'Good',
		...overrides
	} as Asset;
}

describe('computeTemplateHealth', () => {
	it('returns limited data for unpublished templates', () => {
		const health = computeTemplateHealth(
			templateAsset({
				status: 'Upcoming',
				publishedDate: undefined,
				uniqueViewers: 0,
				cumulativePurchases: 0
			}),
			NOW
		);

		expect(health.status).toBe('limited_data');
		expect(health.actions.map((action) => action.title)).toContain('Finish the publishing checklist');
	});

	it('returns strong for positive quality and healthy conversion', () => {
		const health = computeTemplateHealth(
			templateAsset({
				qualityScore: 'Good',
				uniqueViewers: 500,
				cumulativePurchases: 25
			}),
			NOW
		);

		expect(health.status).toBe('strong');
		expect(health.conversionRate).toBe(5);
	});

	it('returns needs attention for old templates with no purchases and enough viewers', () => {
		const health = computeTemplateHealth(
			templateAsset({
				publishedDate: '2024-01-01',
				uniqueViewers: 500,
				cumulativePurchases: 0,
				qualityScore: 'Good'
			}),
			NOW
		);

		expect(health.status).toBe('needs_attention');
		expect(health.actions.map((action) => action.title)).toContain('Tighten the buyer decision path');
	});

	it('keeps low-viewer templates in limited data', () => {
		const health = computeTemplateHealth(
			templateAsset({
				uniqueViewers: 42,
				cumulativePurchases: 0,
				qualityScore: 'Good'
			}),
			NOW
		);

		expect(health.status).toBe('limited_data');
		expect(health.signals.find((signal) => signal.label === 'Conversion')?.value).toBe('0.0%');
	});

	it('prioritizes latest review feedback as a recovery action', () => {
		const health = computeTemplateHealth(
			templateAsset({
				latestReviewStatus: 'Changes Requested',
				latestReviewFeedback: 'Improve accessibility contrast and preview clarity.',
				qualityScore: 'Needs attention',
				uniqueViewers: 300,
				cumulativePurchases: 6
			}),
			NOW
		);

		expect(health.status).toBe('needs_attention');
		expect(health.hasReviewFeedback).toBe(true);
		expect(health.actions[0]).toMatchObject({
			title: 'Address review feedback first',
			priority: 'high'
		});
	});

	it('recommends a limited recovery offer for templates that still need buyer response', () => {
		const health = computeTemplateHealth(
			templateAsset({
				publishedDate: '2024-01-01',
				uniqueViewers: 600,
				cumulativePurchases: 0,
				qualityScore: 'Good'
			}),
			NOW
		);

		expect(health.status).toBe('needs_attention');
		expect(health.offer.hasOffer).toBe(false);
		expect(health.actions.map((action) => action.title)).toContain('Try a limited recovery offer');
	});

	it('surfaces live recovery offers as a lifecycle signal', () => {
		const health = computeTemplateHealth(
			templateAsset({
				uniqueViewers: 600,
				cumulativePurchases: 0,
				activeOfferLabel: 'Creator sale',
				activeOfferPrice: 29,
				activeOfferEndsAt: '2026-06-20T12:00:00.000Z',
				activeOfferStrategy: 'Prune recovery test',
				activeOfferVisibility: 'Listing badge + detail',
				offerPruneReviewAt: '2026-06-24T12:00:00.000Z',
				postOfferAction: 'Re-review for pruning'
			}),
			NOW
		);

		expect(health.offer).toMatchObject({
			hasOffer: true,
			state: 'live',
			label: 'Creator sale',
			price: 29,
			strategy: 'Prune recovery test',
			postOfferAction: 'Re-review for pruning'
		});
		expect(health.actions.map((action) => action.title)).toContain('Measure the recovery window');
	});

	it('prioritizes expired recovery offers for lifecycle review', () => {
		const health = computeTemplateHealth(
			templateAsset({
				uniqueViewers: 600,
				cumulativePurchases: 1,
				activeOfferLabel: 'Exit sale',
				activeOfferPrice: 29,
				activeOfferEndsAt: '2026-05-20T12:00:00.000Z',
				activeOfferStrategy: 'Exit sale before delist',
				activeOfferVisibility: 'Detail only',
				offerPruneReviewAt: '2026-06-01T12:00:00.000Z',
				postOfferAction: 'Delist / archive'
			}),
			NOW
		);

		expect(health.offer.state).toBe('expired');
		expect(health.offer.tone).toBe('critical');
		expect(health.actions).toContainEqual(
			expect.objectContaining({
				title: 'Complete the offer lifecycle review',
				priority: 'high'
			})
		);
	});
});
