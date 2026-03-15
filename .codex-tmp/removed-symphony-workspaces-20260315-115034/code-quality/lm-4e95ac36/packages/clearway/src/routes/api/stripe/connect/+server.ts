/**
 * Stripe Connect Onboarding API
 *
 * POST /api/stripe/connect - Create Express account and return onboarding link
 * GET /api/stripe/connect?facility=:id - Get account status
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Facility } from '$lib/types';
import {
	createStripeClient,
	createExpressAccount,
	createAccountLink,
	createLoginLink,
	getAccountStatus
} from '$lib/services/stripe-connect';

interface CreateConnectBody {
	facility_id: string;
}

export const POST: RequestHandler = async ({ request, platform, url }) => {
	const db = platform?.env.DB;
	const stripeKey = platform?.env.STRIPE_SECRET_KEY;

	if (!db) {
		throw error(500, 'Database not available');
	}
	if (!stripeKey) {
		throw error(500, 'Stripe not configured');
	}

	const body = (await request.json()) as CreateConnectBody;
	const { facility_id } = body;

	if (!facility_id) {
		throw error(400, 'facility_id is required');
	}

	// Get facility
	const facility = await db
		.prepare('SELECT * FROM facilities WHERE id = ?')
		.bind(facility_id)
		.first<Facility & { stripe_account_id: string | null; stripe_account_status: string }>();

	if (!facility) {
		throw error(404, 'Facility not found');
	}

	const stripe = createStripeClient(stripeKey);
	const baseUrl = url.origin;

	// If account already exists, create a new account link
	if (facility.stripe_account_id) {
		// Check if they need to complete onboarding
		const status = await getAccountStatus(stripe, facility.stripe_account_id);

		if (status.chargesEnabled && status.payoutsEnabled) {
			// Already fully onboarded, return dashboard link
			const loginLink = await createLoginLink(stripe, facility.stripe_account_id);
			return json({
				status: 'active',
				accountId: facility.stripe_account_id,
				dashboardUrl: loginLink.url
			});
		}

		// Needs to complete onboarding
		const accountLink = await createAccountLink(stripe, {
			accountId: facility.stripe_account_id,
			refreshUrl: `${baseUrl}/api/stripe/connect/refresh?facility=${facility_id}`,
			returnUrl: `${baseUrl}/app/${facility.slug}/settings/payments?onboarding=complete`
		});

		return json({
			status: 'pending',
			accountId: facility.stripe_account_id,
			onboardingUrl: accountLink.url,
			expiresAt: new Date(accountLink.expires_at * 1000).toISOString()
		});
	}

	// Create new Express account
	const account = await createExpressAccount(stripe, {
		email: facility.email || '',
		businessName: facility.name,
		facilityId: facility_id,
		country: 'US'
	});

	// Update facility with Stripe account ID
	const now = new Date().toISOString();
	await db
		.prepare(
			`UPDATE facilities
       SET stripe_account_id = ?,
           stripe_account_status = 'pending',
           updated_at = ?
       WHERE id = ?`
		)
		.bind(account.id, now, facility_id)
		.run();

	// Create account link for onboarding
	const accountLink = await createAccountLink(stripe, {
		accountId: account.id,
		refreshUrl: `${baseUrl}/api/stripe/connect/refresh?facility=${facility_id}`,
		returnUrl: `${baseUrl}/app/${facility.slug}/settings/payments?onboarding=complete`
	});

	return json(
		{
			status: 'created',
			accountId: account.id,
			onboardingUrl: accountLink.url,
			expiresAt: new Date(accountLink.expires_at * 1000).toISOString()
		},
		{ status: 201 }
	);
};

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
		.prepare('SELECT id, slug, name, stripe_account_id, stripe_account_status FROM facilities WHERE id = ?')
		.bind(facilityId)
		.first<{ id: string; slug: string; name: string; stripe_account_id: string | null; stripe_account_status: string }>();

	if (!facility) {
		throw error(404, 'Facility not found');
	}

	if (!facility.stripe_account_id) {
		return json({
			status: 'not_connected',
			facilityId: facility.id,
			facilityName: facility.name
		});
	}

	const stripe = createStripeClient(stripeKey);
	const accountStatus = await getAccountStatus(stripe, facility.stripe_account_id);

	// Update local status if changed
	const newStatus = accountStatus.chargesEnabled && accountStatus.payoutsEnabled ? 'active' : 'pending';
	if (newStatus !== facility.stripe_account_status) {
		const now = new Date().toISOString();
		await db
			.prepare(
				`UPDATE facilities
         SET stripe_account_status = ?,
             stripe_charges_enabled = ?,
             stripe_payouts_enabled = ?,
             updated_at = ?
         WHERE id = ?`
			)
			.bind(
				newStatus,
				accountStatus.chargesEnabled ? 1 : 0,
				accountStatus.payoutsEnabled ? 1 : 0,
				now,
				facilityId
			)
			.run();
	}

	return json({
		status: newStatus,
		facilityId: facility.id,
		facilityName: facility.name,
		accountId: facility.stripe_account_id,
		chargesEnabled: accountStatus.chargesEnabled,
		payoutsEnabled: accountStatus.payoutsEnabled,
		detailsSubmitted: accountStatus.detailsSubmitted,
		requirements: accountStatus.requirements
	});
};
