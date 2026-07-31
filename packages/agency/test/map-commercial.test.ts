import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
	buildMapEntitlementSnapshot,
	buildMapEntitlementFromMetadata,
	resolveMapCommercialConfig
} from '../src/lib/server/map-commercial.ts';
import { buildCustomerMapScopeFromIdentity } from '../src/lib/server/customer-map-identity.ts';

test('Map identity scope does not inherit unrelated MCP service authorization', () => {
	const contextSource = readFileSync(new URL('../src/lib/server/customer-map-context.ts', import.meta.url), 'utf8');
	assert.doesNotMatch(contextSource, /decision\.allowed/);
	assert.deepEqual(
		buildCustomerMapScopeFromIdentity({
			authSubject: 'identity|alice',
			accountId: 'acct_a',
			tenantId: 'tenant_a',
			workspaceAccountId: 'workspace_a'
		}),
		{
			authSubject: 'identity|alice',
			accountId: 'acct_a',
			tenantId: 'tenant_a',
			workspaceAccountId: 'workspace_a'
		}
	);
});

test('Map checkout stays fail-closed until configuration and explicit approval are both present', () => {
	const configured = {
		STRIPE_SECRET_KEY: 'sk_test_configured',
		STRIPE_WEBHOOK_SECRET: 'whsec_configured',
		STRIPE_PRICE_MAP_MONTHLY: 'price_monthly',
		STRIPE_PRICE_MAP_YEARLY: 'price_yearly'
	};
	assert.equal(resolveMapCommercialConfig(configured).checkoutEnabled, false);
	assert.equal(
		resolveMapCommercialConfig({ ...configured, MAP_COMMERCIAL_LAUNCH_APPROVED: 'true' }).checkoutEnabled,
		true
	);
});

test('subscription lifecycle maps to account-scoped Map entitlement states', () => {
	const base = {
		authSubject: 'identity|alice',
		normalizedEmail: 'alice@example.com',
		accountId: 'acct_a',
		tenantId: 'tenant_a',
		workspaceAccountId: 'workspace_a',
		planId: 'map-monthly' as const,
		stripeCustomerId: 'cus_123',
		stripeSubscriptionId: 'sub_123',
		currentPeriodEnd: '2026-08-17T00:00:00.000Z'
	};

	assert.deepEqual(buildMapEntitlementSnapshot({ ...base, subscriptionStatus: 'active' }), {
		...base,
		subscriptionStatus: 'active',
		cadence: 'monthly',
		entitlementStatus: 'active',
		billingActive: true
	});
	assert.equal(
		buildMapEntitlementSnapshot({ ...base, subscriptionStatus: 'past_due' }).entitlementStatus,
		'payment_failed'
	);
	assert.equal(
		buildMapEntitlementSnapshot({ ...base, subscriptionStatus: 'canceled' }).entitlementStatus,
		'canceled'
	);
});

test('webhook metadata must carry the complete first-party workspace binding', () => {
	assert.equal(buildMapEntitlementFromMetadata({ metadata: { product_id: 'map-monthly' }, subscriptionStatus: 'active' }), null);
	const snapshot = buildMapEntitlementFromMetadata({
		metadata: {
			product_id: 'map-yearly',
			auth_subject: 'identity|alice',
			account_id: 'acct_a',
			tenant_id: 'tenant_a',
			workspace_account_id: 'workspace_a',
			customer_email: 'Alice@Example.com'
		},
		subscriptionStatus: 'active',
		stripeCustomerId: 'cus_123',
		stripeSubscriptionId: 'sub_123'
	});
	assert.equal(snapshot?.normalizedEmail, 'alice@example.com');
	assert.equal(snapshot?.workspaceAccountId, 'workspace_a');
	assert.equal(snapshot?.entitlementStatus, 'active');
});

test('Map checkout route requires approval, first-party identity, and subscription metadata', () => {
	const source = readFileSync(new URL('../src/routes/api/stripe/checkout/+server.ts', import.meta.url), 'utf8');
	assert.match(source, /resolveMapPlan\(productId, platform\?\.env\)/);
	assert.match(source, /Map checkout is not commercially approved and configured/);
	assert.match(source, /Sign in before starting Map checkout/);
	assert.match(source, /resolveCustomerMapScope/);
	assert.match(source, /requireCommercialEntitlement: false/);
	assert.match(source, /subscription_data: \{ metadata: mapMetadata \}/);
});
