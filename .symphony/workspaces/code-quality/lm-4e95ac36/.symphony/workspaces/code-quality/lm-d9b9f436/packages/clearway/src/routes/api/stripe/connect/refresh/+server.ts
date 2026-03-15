/**
 * Stripe Connect Refresh
 *
 * GET /api/stripe/connect/refresh?facility=:id
 *
 * Called when an account link expires. Generates a new link and redirects.
 */

import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createStripeClient, createAccountLink } from '$lib/services/stripe-connect';

export const GET: RequestHandler = async ({ url, platform }) => {
	const db = platform?.env.DB;
	const stripeKey = platform?.env.STRIPE_SECRET_KEY;

	if (!db) {
		throw error(500, 'Database not available');
	}
	if (!stripeKey) {
		throw error(500, 'Stripe not configured');
	}

	const facilityId = url.searchParams.get('facility');
	if (!facilityId) {
		throw error(400, 'facility parameter is required');
	}

	const facility = await db
		.prepare('SELECT id, slug, stripe_account_id FROM facilities WHERE id = ?')
		.bind(facilityId)
		.first<{ id: string; slug: string; stripe_account_id: string | null }>();

	if (!facility) {
		throw error(404, 'Facility not found');
	}

	if (!facility.stripe_account_id) {
		throw error(400, 'Facility has no connected account');
	}

	const stripe = createStripeClient(stripeKey);
	const baseUrl = url.origin;

	// Create new account link
	const accountLink = await createAccountLink(stripe, {
		accountId: facility.stripe_account_id,
		refreshUrl: `${baseUrl}/api/stripe/connect/refresh?facility=${facilityId}`,
		returnUrl: `${baseUrl}/app/${facility.slug}/settings/payments?onboarding=complete`
	});

	// Redirect to the new onboarding link
	throw redirect(303, accountLink.url);
};
