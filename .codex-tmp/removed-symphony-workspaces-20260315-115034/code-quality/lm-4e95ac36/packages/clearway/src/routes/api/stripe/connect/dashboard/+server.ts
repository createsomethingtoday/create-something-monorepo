/**
 * Stripe Express Dashboard Access
 *
 * GET /api/stripe/connect/dashboard?facility=:id
 *
 * Generates a login link to the Stripe Express dashboard for facility owners.
 */

import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createStripeClient, createLoginLink, getAccountStatus } from '$lib/services/stripe-connect';

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
		.prepare('SELECT id, stripe_account_id FROM facilities WHERE id = ?')
		.bind(facilityId)
		.first<{ id: string; stripe_account_id: string | null }>();

	if (!facility) {
		throw error(404, 'Facility not found');
	}

	if (!facility.stripe_account_id) {
		throw error(400, 'Facility has no connected account');
	}

	const stripe = createStripeClient(stripeKey);

	// Verify account is active
	const status = await getAccountStatus(stripe, facility.stripe_account_id);
	if (!status.chargesEnabled) {
		throw error(400, 'Account onboarding not complete');
	}

	// Create login link and redirect
	const loginLink = await createLoginLink(stripe, facility.stripe_account_id);
	throw redirect(303, loginLink.url);
};
