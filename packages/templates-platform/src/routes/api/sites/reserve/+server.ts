/**
 * Site Reservation API
 *
 * POST /api/sites/reserve
 *
 * Protected endpoint for the agency checkout flow.
 * Reserves a subdomain for 30 minutes during payment.
 *
 * Headers:
 * - x-api-secret: Internal API secret (shared between agency and templates-platform)
 *
 * Canon: The infrastructure recedes; the reservation happens transparently.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { reserveSubdomain, type ReserveRequest } from '$lib/services/reservation';

// Validate internal API secret
function validateSecret(request: Request, env: App.Platform['env']): boolean {
	const secret = request.headers.get('x-api-secret');
	return secret === env?.INTERNAL_API_SECRET;
}

export const POST: RequestHandler = async ({ request, platform }) => {
	const env = platform?.env;
	const db = env?.DB;
	const kv = env?.KV; // Use KV for pending reservations

	// Validate auth
	if (!env || !validateSecret(request, env)) {
		throw error(401, 'Unauthorized');
	}

	// Validate platform bindings
	if (!db || !kv) {
		throw error(500, 'Platform bindings not available');
	}

	// Parse request
	let body: ReserveRequest;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	// Validate required fields
	const { subdomain, templateId, tier, config, customerEmail } = body;

	if (!subdomain || typeof subdomain !== 'string') {
		throw error(400, 'Missing or invalid subdomain');
	}

	if (!templateId || typeof templateId !== 'string') {
		throw error(400, 'Missing or invalid templateId');
	}

	if (!tier || !['solo', 'team'].includes(tier)) {
		throw error(400, 'Invalid tier (must be solo or team)');
	}

	if (!config || typeof config !== 'object') {
		throw error(400, 'Missing or invalid config');
	}

	if (!config.name || typeof config.name !== 'string') {
		throw error(400, 'Missing config.name');
	}

	if (!customerEmail || typeof customerEmail !== 'string') {
		throw error(400, 'Missing or invalid customerEmail');
	}

	// Reserve the subdomain
	const result = await reserveSubdomain(db, kv, {
		subdomain: subdomain.toLowerCase().trim(),
		templateId,
		tier,
		config,
		customerEmail
	});

	if (!result.success) {
		throw error(409, result.error || 'Failed to reserve subdomain');
	}

	return json({
		success: true,
		pendingId: result.pendingId,
		expiresAt: result.expiresAt
	});
};
