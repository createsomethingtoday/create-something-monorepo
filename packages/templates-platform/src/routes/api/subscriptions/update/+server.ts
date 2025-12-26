/**
 * Subscription Update API
 *
 * Updates subscription status for a tenant.
 * Called by agency webhook when Stripe subscription status changes.
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';

interface UpdateRequest {
	stripeSubscriptionId: string;
	status: 'active' | 'canceled' | 'past_due';
}

export const POST: RequestHandler = async ({ request, platform }) => {
	// Verify internal API secret
	const apiSecret = request.headers.get('x-api-secret');
	const expectedSecret = platform?.env?.INTERNAL_API_SECRET;

	if (!expectedSecret || apiSecret !== expectedSecret) {
		throw error(401, 'Unauthorized');
	}

	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not configured');
	}

	// Parse request
	let body: UpdateRequest;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const { stripeSubscriptionId, status } = body;

	if (!stripeSubscriptionId || !status) {
		throw error(400, 'Missing required fields: stripeSubscriptionId, status');
	}

	try {
		// Find subscription
		const subscription = await db
			.prepare('SELECT id, tenant_id FROM tenant_subscriptions WHERE stripe_subscription_id = ?')
			.bind(stripeSubscriptionId)
			.first<{ id: string; tenant_id: string }>();

		if (!subscription) {
			// Not a vertical template subscription, ignore
			return json({ success: true, message: 'Subscription not found (not a vertical template)' });
		}

		// Update subscription status
		await db
			.prepare(
				`UPDATE tenant_subscriptions
				SET status = ?, updated_at = datetime('now')
				WHERE id = ?`
			)
			.bind(status, subscription.id)
			.run();

		// If canceled, suspend the tenant
		if (status === 'canceled') {
			await db
				.prepare(
					`UPDATE tenants
					SET status = 'suspended', updated_at = datetime('now')
					WHERE id = ?`
				)
				.bind(subscription.tenant_id)
				.run();

			// Clear router cache for this tenant
			const cache = platform?.env?.TENANT_CACHE;
			if (cache) {
				const tenant = await db
					.prepare('SELECT subdomain FROM tenants WHERE id = ?')
					.bind(subscription.tenant_id)
					.first<{ subdomain: string }>();

				if (tenant) {
					await cache.delete(`tenant:subdomain:${tenant.subdomain}`);
				}
			}

			console.log(`Tenant ${subscription.tenant_id} suspended due to subscription cancellation`);
		}

		// If reactivated, restore the tenant
		if (status === 'active') {
			await db
				.prepare(
					`UPDATE tenants
					SET status = 'active', updated_at = datetime('now')
					WHERE id = ? AND status = 'suspended'`
				)
				.bind(subscription.tenant_id)
				.run();

			console.log(`Tenant ${subscription.tenant_id} reactivated`);
		}

		return json({
			success: true,
			subscriptionId: subscription.id,
			tenantId: subscription.tenant_id,
			status
		});
	} catch (err) {
		console.error('Subscription update failed:', err);
		throw error(500, 'Failed to update subscription');
	}
};
