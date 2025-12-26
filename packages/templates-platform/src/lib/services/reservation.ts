/**
 * Reservation Service
 *
 * Handles subdomain reservation during the checkout flow:
 * 1. reserve() - Creates tenant in 'configuring' status with 30-min expiry
 * 2. provision() - Activates tenant after successful Stripe payment
 * 3. expire() - Cleanup job for unpaid reservations
 *
 * Canon: The infrastructure recedes; the site appears.
 */

// Use crypto.randomUUID for ID generation (available in Workers runtime)

export interface SiteConfig {
	name: string;
	tagline?: string;
	email?: string;
	phone?: string;
	address?: string;
	social?: {
		twitter?: string;
		linkedin?: string;
		instagram?: string;
	};
	[key: string]: unknown; // Template-specific fields
}

export interface ReserveRequest {
	subdomain: string;
	templateId: string;
	tier: 'solo' | 'team';
	config: SiteConfig;
	customerEmail: string;
}

export interface ReserveResponse {
	success: boolean;
	pendingId?: string;
	tenantId?: string;
	expiresAt?: string;
	error?: string;
}

export interface ProvisionRequest {
	pendingId: string;
	stripeSubscriptionId: string;
	stripeCustomerId: string;
}

export interface ProvisionResponse {
	success: boolean;
	tenant?: {
		id: string;
		subdomain: string;
		url: string;
		status: 'active';
	};
	error?: string;
}

/**
 * Reserve a subdomain for 30 minutes during checkout
 */
export async function reserveSubdomain(
	db: D1Database,
	kv: KVNamespace,
	request: ReserveRequest
): Promise<ReserveResponse> {
	const { subdomain, templateId, tier, config, customerEmail } = request;

	// Generate IDs (using crypto.randomUUID, trimmed for compactness)
	const tenantId = `tenant_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
	const pendingId = `pending_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
	const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes

	try {
		// Check subdomain isn't already taken (race condition guard)
		const existing = await db
			.prepare('SELECT id FROM tenants WHERE subdomain = ?')
			.bind(subdomain)
			.first();

		if (existing) {
			return { success: false, error: 'Subdomain already taken' };
		}

		// Validate template exists
		const template = await db
			.prepare('SELECT id FROM templates WHERE id = ? AND is_active = 1')
			.bind(templateId)
			.first();

		if (!template) {
			return { success: false, error: 'Invalid template' };
		}

		// Create tenant in configuring status
		await db
			.prepare(
				`INSERT INTO tenants (
					id, user_id, template_id, subdomain, status, config, tier,
					customer_email, reservation_expires_at, pending_checkout_id
				) VALUES (?, ?, ?, ?, 'configuring', ?, ?, ?, ?, ?)`
			)
			.bind(
				tenantId,
				'anonymous', // No user until payment confirmed
				templateId,
				subdomain,
				JSON.stringify(config),
				tier,
				customerEmail,
				expiresAt,
				pendingId
			)
			.run();

		// Store pending ID → tenant ID mapping in KV for fast lookup
		await kv.put(`pending:${pendingId}`, tenantId, {
			expirationTtl: 1800 // 30 minutes
		});

		return {
			success: true,
			pendingId,
			tenantId,
			expiresAt
		};
	} catch (err) {
		console.error('Reserve subdomain error:', err);
		return { success: false, error: 'Failed to reserve subdomain' };
	}
}

/**
 * Provision (activate) a tenant after successful payment
 */
export async function provisionTenant(
	db: D1Database,
	kv: KVNamespace,
	request: ProvisionRequest
): Promise<ProvisionResponse> {
	const { pendingId, stripeSubscriptionId, stripeCustomerId } = request;

	try {
		// Look up tenant from pending ID
		const tenantId = await kv.get(`pending:${pendingId}`);
		if (!tenantId) {
			return { success: false, error: 'Reservation expired or not found' };
		}

		// Get tenant details
		const tenant = await db
			.prepare('SELECT * FROM tenants WHERE id = ?')
			.bind(tenantId)
			.first<{
				id: string;
				subdomain: string;
				template_id: string;
				config: string;
				tier: string;
				customer_email: string;
				status: string;
			}>();

		if (!tenant) {
			return { success: false, error: 'Tenant not found' };
		}

		// Check not already provisioned
		if (tenant.status === 'active') {
			return {
				success: true,
				tenant: {
					id: tenant.id,
					subdomain: tenant.subdomain,
					url: `https://${tenant.subdomain}.createsomething.space`,
					status: 'active'
				}
			};
		}

		// Update tenant status and create subscription record
		await db.batch([
			// Update tenant to active
			db
				.prepare(
					`UPDATE tenants SET
						status = 'active',
						reservation_expires_at = NULL,
						pending_checkout_id = NULL,
						deployed_at = datetime('now'),
						updated_at = datetime('now')
					WHERE id = ?`
				)
				.bind(tenantId),

			// Create subscription record
			db
				.prepare(
					`INSERT INTO tenant_subscriptions (
						id, tenant_id, stripe_subscription_id, stripe_customer_id, tier, status
					) VALUES (?, ?, ?, ?, ?, 'active')`
				)
				.bind(
					`sub_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
					tenantId,
					stripeSubscriptionId,
					stripeCustomerId,
					tenant.tier
				)
		]);

		// Clear KV caches
		await Promise.all([
			kv.delete(`pending:${pendingId}`),
			kv.delete(`tenant:subdomain:${tenant.subdomain}`) // Router cache
		]);

		return {
			success: true,
			tenant: {
				id: tenant.id,
				subdomain: tenant.subdomain,
				url: `https://${tenant.subdomain}.createsomething.space`,
				status: 'active'
			}
		};
	} catch (err) {
		console.error('Provision tenant error:', err);
		return { success: false, error: 'Failed to provision tenant' };
	}
}

/**
 * Cleanup expired reservations (called by scheduled worker)
 */
export async function expireReservations(db: D1Database): Promise<number> {
	try {
		const result = await db
			.prepare(
				`DELETE FROM tenants
				WHERE status = 'configuring'
				AND reservation_expires_at < datetime('now')`
			)
			.run();

		return result.meta.changes ?? 0;
	} catch (err) {
		console.error('Expire reservations error:', err);
		return 0;
	}
}
