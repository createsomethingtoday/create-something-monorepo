import type { CustomerMapScope } from '$lib/server/customer-map-workspace';

export type MapPlanId = 'map-monthly' | 'map-yearly';
export type MapEntitlementStatus = 'pending' | 'active' | 'payment_failed' | 'canceled';

interface MapCommercialEnv {
	STRIPE_SECRET_KEY?: string;
	STRIPE_WEBHOOK_SECRET?: string;
	STRIPE_PRICE_MAP_MONTHLY?: string;
	STRIPE_PRICE_MAP_YEARLY?: string;
	MAP_COMMERCIAL_LAUNCH_APPROVED?: string;
}

export interface MapEntitlementSnapshot {
	authSubject: string;
	normalizedEmail: string;
	accountId: string;
	tenantId: string;
	workspaceAccountId: string;
	planId: MapPlanId;
	cadence: 'monthly' | 'yearly';
	stripeCustomerId: string | null;
	stripeSubscriptionId: string | null;
	subscriptionStatus: string;
	entitlementStatus: MapEntitlementStatus;
	billingActive: boolean;
	currentPeriodEnd: string | null;
}

export function isMapPlanId(value: string): value is MapPlanId {
	return value === 'map-monthly' || value === 'map-yearly';
}

export function resolveMapCommercialConfig(env: MapCommercialEnv | undefined) {
	const approved = env?.MAP_COMMERCIAL_LAUNCH_APPROVED?.trim().toLowerCase() === 'true';
	const monthlyPriceId = env?.STRIPE_PRICE_MAP_MONTHLY?.trim() || null;
	const yearlyPriceId = env?.STRIPE_PRICE_MAP_YEARLY?.trim() || null;
	const stripeReady = Boolean(env?.STRIPE_SECRET_KEY && env?.STRIPE_WEBHOOK_SECRET);
	return {
		approved,
		stripeReady,
		monthlyPriceId,
		yearlyPriceId,
		checkoutEnabled: approved && stripeReady && Boolean(monthlyPriceId && yearlyPriceId)
	};
}

export function resolveMapPlan(planId: MapPlanId, env: MapCommercialEnv | undefined) {
	const config = resolveMapCommercialConfig(env);
	return {
		id: planId,
		cadence: planId === 'map-monthly' ? ('monthly' as const) : ('yearly' as const),
		priceId: planId === 'map-monthly' ? config.monthlyPriceId : config.yearlyPriceId,
		checkoutEnabled: config.checkoutEnabled
	};
}

export function buildMapCheckoutMetadata(input: {
	scope: CustomerMapScope;
	email: string;
	planId: MapPlanId;
}): Record<string, string> {
	return {
		product_id: input.planId,
		auth_subject: input.scope.authSubject,
		account_id: input.scope.accountId,
		tenant_id: input.scope.tenantId,
		workspace_account_id: input.scope.workspaceAccountId,
		customer_email: input.email.trim().toLowerCase()
	};
}

export function buildMapEntitlementSnapshot(
	input: Omit<MapEntitlementSnapshot, 'cadence' | 'entitlementStatus' | 'billingActive'>
): MapEntitlementSnapshot {
	const active = input.subscriptionStatus === 'active' || input.subscriptionStatus === 'trialing';
	const canceled = input.subscriptionStatus === 'canceled';
	return {
		...input,
		cadence: input.planId === 'map-monthly' ? 'monthly' : 'yearly',
		entitlementStatus: active ? 'active' : canceled ? 'canceled' : input.subscriptionStatus === 'checkout_completed' ? 'pending' : 'payment_failed',
		billingActive: active
	};
}

export function buildMapEntitlementFromMetadata(input: {
	metadata: Record<string, string | undefined> | null | undefined;
	subscriptionStatus: string;
	stripeCustomerId?: string | null;
	stripeSubscriptionId?: string | null;
	currentPeriodEnd?: string | null;
}): MapEntitlementSnapshot | null {
	const metadata = input.metadata;
	const planId = metadata?.product_id;
	if (
		!planId ||
		!isMapPlanId(planId) ||
		!metadata?.auth_subject ||
		!metadata.account_id ||
		!metadata.tenant_id ||
		!metadata.workspace_account_id ||
		!metadata.customer_email
	) {
		return null;
	}
	return buildMapEntitlementSnapshot({
		authSubject: metadata.auth_subject,
		normalizedEmail: metadata.customer_email.trim().toLowerCase(),
		accountId: metadata.account_id,
		tenantId: metadata.tenant_id,
		workspaceAccountId: metadata.workspace_account_id,
		planId,
		stripeCustomerId: input.stripeCustomerId ?? null,
		stripeSubscriptionId: input.stripeSubscriptionId ?? null,
		subscriptionStatus: input.subscriptionStatus,
		currentPeriodEnd: input.currentPeriodEnd ?? null
	});
}

export async function upsertMapEntitlement(db: D1Database, snapshot: MapEntitlementSnapshot): Promise<void> {
	await db
		.prepare(
			`INSERT INTO agency_map_entitlements (
			   id, auth_subject, normalized_email, account_id, tenant_id, workspace_account_id,
			   plan_id, cadence, stripe_customer_id, stripe_subscription_id, subscription_status,
			   entitlement_status, billing_active, current_period_end, created_at, updated_at
			 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
			 ON CONFLICT(account_id, workspace_account_id) DO UPDATE SET
			   auth_subject = excluded.auth_subject,
			   normalized_email = excluded.normalized_email,
			   tenant_id = excluded.tenant_id,
			   plan_id = excluded.plan_id,
			   cadence = excluded.cadence,
			   stripe_customer_id = COALESCE(excluded.stripe_customer_id, agency_map_entitlements.stripe_customer_id),
			   stripe_subscription_id = COALESCE(excluded.stripe_subscription_id, agency_map_entitlements.stripe_subscription_id),
			   subscription_status = excluded.subscription_status,
			   entitlement_status = excluded.entitlement_status,
			   billing_active = excluded.billing_active,
			   current_period_end = excluded.current_period_end,
			   updated_at = datetime('now')`
		)
		.bind(
			crypto.randomUUID(),
			snapshot.authSubject,
			snapshot.normalizedEmail,
			snapshot.accountId,
			snapshot.tenantId,
			snapshot.workspaceAccountId,
			snapshot.planId,
			snapshot.cadence,
			snapshot.stripeCustomerId,
			snapshot.stripeSubscriptionId,
			snapshot.subscriptionStatus,
			snapshot.entitlementStatus,
			snapshot.billingActive ? 1 : 0,
			snapshot.currentPeriodEnd
		)
		.run();
}

export async function updateMapEntitlementBillingBySubscription(
	db: D1Database,
	stripeSubscriptionId: string,
	input: { billingActive: boolean; subscriptionStatus: string; entitlementStatus: MapEntitlementStatus }
): Promise<void> {
	await db
		.prepare(
			`UPDATE agency_map_entitlements
			 SET billing_active = ?, subscription_status = ?, entitlement_status = ?, updated_at = datetime('now')
			 WHERE stripe_subscription_id = ?`
		)
		.bind(input.billingActive ? 1 : 0, input.subscriptionStatus, input.entitlementStatus, stripeSubscriptionId)
		.run();
}
