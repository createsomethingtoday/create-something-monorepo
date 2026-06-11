import { describe, expect, it } from 'vitest';
import { normalizeTemplateOfferRequestBody } from './template-offer-requests';

const NOW = new Date('2026-06-09T12:00:00.000Z');

function captureError(run: () => unknown): { body?: { message?: string }; message?: string } {
	try {
		run();
	} catch (err) {
		return err as { body?: { message?: string }; message?: string };
	}

	throw new Error('Expected function to throw');
}

describe('normalizeTemplateOfferRequestBody', () => {
	it('normalizes a creator limited-offer request', () => {
		const input = normalizeTemplateOfferRequestBody(
			{
				offerLabel: '',
				offerPrice: '49',
				fulfillmentUrl: 'https://webflow.com/dashboard/sites/new?unauthSignup=true',
				startsAt: '2026-06-10',
				endsAt: '2026-07-02',
				offerStrategy: 'Creator-managed price test',
				notes: 'Creator-managed price test.',
				termsAccepted: true
			},
			'creator@example.com',
			NOW,
			{ marketplacePrice: 79 }
		);

		expect(input).toMatchObject({
			creatorEmail: 'creator@example.com',
			offerLabel: 'Limited offer',
			offerPrice: 49,
			fulfillmentUrl: 'https://webflow.com/dashboard/sites/new?unauthSignup=true',
			startsAt: '2026-06-10T00:00:00.000Z',
			endsAt: '2026-07-02T00:00:00.000Z',
			offerStrategy: 'Creator-managed price test',
			postOfferAction: 'Review search visibility after expiry',
			notes: 'Creator-managed price test.',
			termsAcceptedAt: NOW.toISOString()
		});
	});

	it('rejects requests without accepted terms', () => {
		const err = captureError(() =>
			normalizeTemplateOfferRequestBody(
				{
					offerPrice: '49',
					fulfillmentUrl: 'https://webflow.com/dashboard/sites/new',
					endsAt: '2026-07-02',
					offerStrategy: 'Creator-managed price test',
					termsAccepted: false
				},
				'creator@example.com',
				NOW
			)
		);

		expect(err.body?.message ?? err.message).toBe(
			'Offer terms must be accepted before submitting'
		);
	});

	it('rejects non-HTTPS fulfillment URLs', () => {
		const err = captureError(() =>
			normalizeTemplateOfferRequestBody(
				{
					offerPrice: '49',
					fulfillmentUrl: 'http://example.com',
					endsAt: '2026-07-02',
					offerStrategy: 'Creator-managed price test',
					termsAccepted: true
				},
				'creator@example.com',
				NOW
			)
		);

		expect(err.body?.message ?? err.message).toBe('Fulfillment URL must use HTTPS');
	});

	it('rejects discounts that are too deep for the marketplace price', () => {
		const err = captureError(() =>
			normalizeTemplateOfferRequestBody(
				{
					offerPrice: '49',
					fulfillmentUrl: 'https://webflow.com/dashboard/sites/new',
					endsAt: '2026-06-20',
					offerStrategy: 'Creator-managed price test',
					termsAccepted: true
				},
				'creator@example.com',
				NOW,
				{ marketplacePrice: 169 }
			)
		);

		expect(err.body?.message ?? err.message).toBe('Offer price must be at least $59.15');
	});

	it('rejects offer end dates that are not in the future', () => {
		const err = captureError(() =>
			normalizeTemplateOfferRequestBody(
				{
					offerPrice: '49',
					fulfillmentUrl: 'https://webflow.com/dashboard/sites/new',
					endsAt: '2026-06-09T11:59:59.000Z',
					offerStrategy: 'Creator-managed price test',
					termsAccepted: true
				},
				'creator@example.com',
				NOW
			)
		);

		expect(err.body?.message ?? err.message).toBe('End date must be in the future');
	});

	it('rejects offer windows longer than 30 days', () => {
		const err = captureError(() =>
			normalizeTemplateOfferRequestBody(
				{
					offerPrice: '59',
					fulfillmentUrl: 'https://webflow.com/dashboard/sites/new',
					endsAt: '2026-07-20',
					offerStrategy: 'Creator-managed price test',
					termsAccepted: true
				},
				'creator@example.com',
				NOW,
				{ marketplacePrice: 169 }
			)
		);

		expect(err.body?.message ?? err.message).toBe('Offer duration must be 30 days or fewer');
	});

	it('requires visibility terms before moving a template detail-only after expiry', () => {
		const err = captureError(() =>
			normalizeTemplateOfferRequestBody(
				{
					offerPrice: '59',
					fulfillmentUrl: 'https://webflow.com/dashboard/sites/new',
					endsAt: '2026-06-20',
					offerStrategy: 'Prune recovery test',
					postOfferAction: 'Move to detail-only after expiry',
					termsAccepted: true
				},
				'creator@example.com',
				NOW,
				{ marketplacePrice: 169 }
			)
		);

		expect(err.body?.message ?? err.message).toBe(
			'Search visibility terms must be accepted for this post-offer action'
		);
	});

	it('records visibility terms acceptance for detail-only lifecycle requests', () => {
		const input = normalizeTemplateOfferRequestBody(
			{
				offerPrice: '60',
				fulfillmentUrl: 'https://webflow.com/dashboard/sites/new',
				endsAt: '2026-06-20',
				offerStrategy: 'Prune recovery test',
				postOfferAction: 'Move to detail-only after expiry',
				termsAccepted: true,
				visibilityTermsAccepted: true
			},
			'creator@example.com',
			NOW,
			{ marketplacePrice: 169 }
		);

		expect(input).toMatchObject({
			postOfferAction: 'Move to detail-only after expiry',
			visibilityTermsAcceptedAt: NOW.toISOString()
		});
	});

	it('rejects a second recovery offer for the same template lifecycle', () => {
		const err = captureError(() =>
			normalizeTemplateOfferRequestBody(
				{
					offerPrice: '60',
					fulfillmentUrl: 'https://webflow.com/dashboard/sites/new',
					endsAt: '2026-06-20',
					offerStrategy: 'Prune recovery test',
					postOfferAction: 'Move to detail-only after expiry',
					termsAccepted: true,
					visibilityTermsAccepted: true
				},
				'creator@example.com',
				NOW,
				{ marketplacePrice: 169, recoveryOfferUsed: true }
			)
		);

		expect(err.body?.message ?? err.message).toBe(
			'Recovery offers are one-time. This template must meet the marketplace re-entry threshold before another recovery path is available.'
		);
	});
});
