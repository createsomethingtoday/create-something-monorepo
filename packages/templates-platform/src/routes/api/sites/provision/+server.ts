/**
 * Site Provision API
 *
 * POST /api/sites/provision
 *
 * Protected endpoint called by agency webhook after Stripe payment.
 * Activates a reserved tenant and creates subscription record.
 *
 * Headers:
 * - x-api-secret: Internal API secret (shared between agency and templates-platform)
 *
 * Canon: The infrastructure recedes; the site goes live.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { provisionTenant, type ProvisionRequest } from '$lib/services/reservation';

// Validate internal API secret
function validateSecret(request: Request, env: App.Platform['env']): boolean {
	const secret = request.headers.get('x-api-secret');
	return secret === env?.INTERNAL_API_SECRET;
}

export const POST: RequestHandler = async ({ request, platform }) => {
	const env = platform?.env;
	const db = env?.DB;
	const kv = env?.KV; // Use KV for pending/cache lookups

	// Validate auth
	if (!env || !validateSecret(request, env)) {
		throw error(401, 'Unauthorized');
	}

	// Validate platform bindings
	if (!db || !kv) {
		throw error(500, 'Platform bindings not available');
	}

	// Parse request
	let body: ProvisionRequest;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	// Validate required fields
	const { pendingId, stripeSubscriptionId, stripeCustomerId } = body;

	if (!pendingId || typeof pendingId !== 'string') {
		throw error(400, 'Missing or invalid pendingId');
	}

	if (!stripeSubscriptionId || typeof stripeSubscriptionId !== 'string') {
		throw error(400, 'Missing or invalid stripeSubscriptionId');
	}

	if (!stripeCustomerId || typeof stripeCustomerId !== 'string') {
		throw error(400, 'Missing or invalid stripeCustomerId');
	}

	// Provision the tenant
	const result = await provisionTenant(db, kv, {
		pendingId,
		stripeSubscriptionId,
		stripeCustomerId
	});

	if (!result.success) {
		throw error(404, result.error || 'Failed to provision tenant');
	}

	return json({
		success: true,
		tenant: result.tenant
	});
};
