import { describe, expect, it } from 'vitest';

import type { Asset } from '$lib/server/airtable';
import { computeTemplateHealth, isTemplateSearchSuppressed } from './template-health';

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
			NOW,
			{ viewerDataAvailable: true }
		);

		expect(health.status).toBe('limited_data');
		expect(health.actions.map((action) => action.title)).toContain('Finish the publishing checklist');
	});

	it('uses the decision date as a fallback live date for published templates', () => {
		const health = computeTemplateHealth(
			templateAsset({
				status: 'Published',
				publishedDate: undefined,
				decisionDate: '2026-05-01T00:00:00.000Z'
			}),
			NOW,
			{ viewerDataAvailable: true }
		);

		expect(health.daysLive).toBe(33);
		expect(health.signals.find((signal) => signal.label === 'Time live')?.value).toBe('1 mo');
	});

	it('returns strong for positive quality and healthy conversion', () => {
		const health = computeTemplateHealth(
			templateAsset({
				qualityScore: 'Good',
				uniqueViewers: 500,
				cumulativePurchases: 25
			}),
			NOW,
			{ viewerDataAvailable: true }
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
			NOW,
			{ viewerDataAvailable: true }
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
			NOW,
			{ viewerDataAvailable: true }
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
			NOW,
			{ viewerDataAvailable: true }
		);

		expect(health.status).toBe('needs_attention');
		expect(health.hasReviewFeedback).toBe(true);
		expect(health.actions[0]).toMatchObject({
			title: 'Address review feedback first',
			priority: 'high'
		});
	});

	it('surfaces detail-only search visibility as a reversible discovery state', () => {
		const health = computeTemplateHealth(
			templateAsset({
				searchVisibility: 'Detail only'
			}),
			NOW,
			{ viewerDataAvailable: true }
		);

		expect(health.searchVisibilitySuppressed).toBe(true);
		expect(health.signals).toContainEqual(
			expect.objectContaining({
				label: 'Discovery',
				value: 'Detail only',
				tone: 'warning'
			})
		);
		expect(health.actions.map((action) => action.title)).toContain(
			'Maintain direct-access readiness'
		);
	});
});

describe('computeTemplateHealth with viewer data unavailable', () => {
	it('reports conversion as unavailable and never judges on viewers', () => {
		const health = computeTemplateHealth(
			templateAsset({ uniqueViewers: 600, cumulativePurchases: 3 }),
			NOW,
			{ viewerDataAvailable: false }
		);

		expect(health.conversionRate).toBeNull();
		expect(health.signals.find((s) => s.label === 'Conversion')).toMatchObject({
			value: 'Unavailable',
			tone: 'neutral'
		});
		expect(health.actions.map((a) => a.title)).not.toContain('Improve listing clarity');
		expect(health.actions.map((a) => a.title)).not.toContain('Rework the first impression');
	});

	it('still surfaces purchase-based statuses without viewer data', () => {
		const strong = computeTemplateHealth(
			templateAsset({ uniqueViewers: 0, cumulativePurchases: 25 }),
			NOW,
			{ viewerDataAvailable: false }
		);
		expect(strong.status).toBe('strong');

		const stale = computeTemplateHealth(
			templateAsset({
				uniqueViewers: 0,
				cumulativePurchases: 0,
				qualityScore: undefined,
				publishedDate: '2024-01-01'
			}),
			NOW,
			{ viewerDataAvailable: false }
		);
		expect(stale.status).toBe('needs_attention');
	});
});

describe('isTemplateSearchSuppressed', () => {
	it('keeps explicitly searchable values visible', () => {
		expect(isTemplateSearchSuppressed('Marketplace search')).toBe(false);
	});

	it('suppresses detail-only and unlisted values', () => {
		expect(isTemplateSearchSuppressed('Detail only')).toBe(true);
		expect(isTemplateSearchSuppressed('Unlisted')).toBe(true);
	});
});
