import assert from 'node:assert/strict';
import test from 'node:test';

import {
	CONTROL_RUNTIME_RESOURCE,
	buildControlSchedulerTokenClaims,
	checkAgencyControlSchedulerScope,
	isOAuthAccessTokenClaimsForApplication,
	isOAuthUserInfoIdentityActive,
	normalizeControlSchedulerTokenRequest,
	resolveControlAccessClaims,
	resolveControlSchedulerAudience,
	resolveOAuthApplicationAccessPolicy,
	resolveOAuthTokenAccessMode,
} from '../src/index';

test('Template Review OAuth uses an explicit resource-bound application policy', () => {
	const policy = resolveOAuthApplicationAccessPolicy(
		'https://webflow-template-review-mcp.createsomething.workers.dev/mcp'
	);

	assert.deepEqual(policy, {
		applicationId: 'webflow-template-review-mcp',
		resource: 'https://webflow-template-review-mcp.createsomething.workers.dev/mcp',
		expiresIn: 3600,
	});
});

test('Cracked Live Ticket Sync OAuth uses an exact resource-bound application policy', () => {
	const resource = 'https://halfdozen-cracked-sync-mcp.createsomething.workers.dev/mcp';
	const policy = resolveOAuthApplicationAccessPolicy(resource);

	assert.deepEqual(policy, {
		applicationId: 'halfdozen-cracked-sync-mcp',
		resource,
		expiresIn: 3600,
	});
	assert.equal(
		resolveOAuthApplicationAccessPolicy(
			'https://halfdozen-cracked-sync-mcp.createsomething.workers.dev'
		),
		null
	);
});

test('Half Dozen onboarding OAuth uses an exact resource-bound application policy', () => {
	const policy = resolveOAuthApplicationAccessPolicy(
		'https://halfdozen-onboarding-mcp.half-dozen.workers.dev/mcp'
	);

	assert.deepEqual(policy, {
		applicationId: 'halfdozen-onboarding-mcp',
		resource: 'https://halfdozen-onboarding-mcp.half-dozen.workers.dev/mcp',
		expiresIn: 3600,
	});
	assert.equal(
		resolveOAuthApplicationAccessPolicy(
			'https://halfdozen-onboarding-mcp.half-dozen.workers.dev'
		),
		null
	);
});

test('unknown OAuth resources do not bypass managed bearer governance', () => {
	assert.equal(resolveOAuthApplicationAccessPolicy('https://unknown.example/mcp'), null);
	assert.deepEqual(
		resolveOAuthApplicationAccessPolicy(
			'https://control-preview.example/mcp',
			'https://control-preview.example/mcp'
		),
		{
			applicationId: 'create-something-control-runtime',
			resource: 'https://control-preview.example/mcp',
			expiresIn: 3600,
			controlAccess: true,
		}
	);
});

test('OAuth token exchange fails closed for resources outside the managed hub and application allowlists', () => {
	const hub = 'https://hub-preview.example/mcp/';
	const control = 'https://control-preview.example/mcp/';
	assert.deepEqual(resolveOAuthTokenAccessMode(hub, hub, control), { type: 'managed_bearer' });
	assert.deepEqual(resolveOAuthTokenAccessMode(control, hub, control), {
		type: 'application',
		policy: {
			applicationId: 'create-something-control-runtime',
			resource: 'https://control-preview.example/mcp',
			expiresIn: 3600,
			controlAccess: true,
		},
	});
	assert.deepEqual(
		resolveOAuthTokenAccessMode('https://control-typo.example/mcp', hub, control),
		{ type: 'invalid' },
	);
	assert.deepEqual(
		resolveOAuthTokenAccessMode('https://unknown.example/mcp', hub, undefined),
		{ type: 'invalid' },
	);
});

test('Control OAuth is resource-bound and derives scope only from active Agency entitlement', () => {
	assert.equal(resolveOAuthApplicationAccessPolicy(CONTROL_RUNTIME_RESOURCE), null);
	assert.deepEqual(resolveOAuthApplicationAccessPolicy(
		CONTROL_RUNTIME_RESOURCE,
		CONTROL_RUNTIME_RESOURCE
	), {
		applicationId: 'create-something-control-runtime',
		resource: CONTROL_RUNTIME_RESOURCE,
		expiresIn: 3600,
		controlAccess: true,
	});
	assert.deepEqual(resolveControlAccessClaims({
		allowed: true,
		service_tier: 'policy_os_core',
		account_id: 'account-a',
		tenant_id: 'tenant-a',
		workspace_account_id: 'workspace-a',
		control_role: 'account_owner',
	}), {
		account_id: 'account-a',
		tenant_id: 'tenant-a',
		workspace_account_id: 'workspace-a',
		roles: ['account_owner'],
	});
	assert.equal(resolveControlAccessClaims({
		allowed: false,
		service_tier: 'policy_os_core',
		account_id: 'account-a',
		tenant_id: 'tenant-a',
		workspace_account_id: 'workspace-a',
		control_role: 'account_owner',
	}), null);
	assert.equal(resolveControlAccessClaims({
		allowed: true,
		service_tier: 'mcp_only',
		account_id: 'account-a',
		tenant_id: 'tenant-a',
		workspace_account_id: 'workspace-a',
		control_role: 'account_owner',
	}), null);
});

test('scheduler token claims are exact-scope, resource-bound, and short lived', () => {
	const claims = buildControlSchedulerTokenClaims({
		actor: 'service:control-scheduler',
		activationId: 'activation-a',
		accountId: 'account-a',
		tenantId: 'tenant-a',
		workspaceAccountId: 'workspace-a',
		issuer: 'https://identity-preview.example',
		audience: 'https://control-preview.example/mcp',
		nowSeconds: 100,
		ttlSeconds: 10_000,
	});
	assert.deepEqual(claims.aud, ['https://control-preview.example/mcp']);
	assert.equal(claims.iss, 'https://identity-preview.example');
	assert.deepEqual(claims.roles, ['control_scheduler']);
	assert.equal(claims.exp - claims.iat, 900);
	assert.equal(claims.workspace_account_id, 'workspace-a');
	assert.equal(claims.activation_id, 'activation-a');
});

test('scheduler token request parsing rejects malformed scope, resource, and ttl values', () => {
	assert.deepEqual(normalizeControlSchedulerTokenRequest({
		activation_id: ' activation-a ',
		account_id: 'account-a',
		tenant_id: 'tenant-a',
		workspace_account_id: 'workspace-a',
		resource: ' https://control-preview.example/mcp ',
		ttl_seconds: 120.9,
	}), {
		activationId: 'activation-a',
		accountId: 'account-a',
		tenantId: 'tenant-a',
		workspaceAccountId: 'workspace-a',
		resource: 'https://control-preview.example/mcp',
		ttlSeconds: 120.9,
	});
	for (const malformed of [
		{ activation_id: 123, account_id: 'a', tenant_id: 't', workspace_account_id: 'w' },
		{ activation_id: 'x', account_id: {}, tenant_id: 't', workspace_account_id: 'w' },
		{ activation_id: 'x', account_id: 'a', tenant_id: 't', workspace_account_id: 'w', resource: 123 },
		{ activation_id: 'x', account_id: 'a', tenant_id: 't', workspace_account_id: 'w', ttl_seconds: '60' },
		{ activation_id: 'x', account_id: 'a', tenant_id: 't', workspace_account_id: 'w', ttl_seconds: Number.NaN },
	]) {
		assert.equal(normalizeControlSchedulerTokenRequest(malformed), null);
	}
});

test('scheduler audience is explicit when multiple Control runtimes are configured', () => {
	assert.equal(resolveControlSchedulerAudience(undefined, null), null);
	assert.equal(resolveControlSchedulerAudience(undefined, CONTROL_RUNTIME_RESOURCE), null);
	const configured = 'https://control-a.example/mcp, https://control-b.example/mcp';
	assert.equal(resolveControlSchedulerAudience(configured, null), null);
	assert.equal(
		resolveControlSchedulerAudience(configured, 'https://control-b.example/mcp/'),
		'https://control-b.example/mcp'
	);
	assert.equal(resolveControlSchedulerAudience(configured, 'https://other.example/mcp'), null);
	assert.equal(
		resolveControlSchedulerAudience('https://control-a.example/mcp', null),
		'https://control-a.example/mcp'
	);
});

test('scheduler token scope is authorized by the run frozen Agency activation', async () => {
	const originalFetch = globalThis.fetch;
	let body: Record<string, unknown> | null = null;
	globalThis.fetch = async (_input, init) => {
		body = JSON.parse(String(init?.body)) as Record<string, unknown>;
		return Response.json({ allowed: true, activation_id: 'activation-a' });
	};
	try {
		assert.deepEqual(
			await checkAgencyControlSchedulerScope({
				AGENCY_INTERNAL_API_URL: 'https://agency.example',
				AGENCY_INTERNAL_API_KEY: 'internal-key',
			} as never, {
				activationId: 'activation-a',
				accountId: 'account-a',
				tenantId: 'tenant-a',
				workspaceAccountId: 'workspace-a',
			}),
			{ allowed: true, activation_id: 'activation-a' }
		);
		assert.deepEqual(body, {
			activation_id: 'activation-a',
			account_id: 'account-a',
			tenant_id: 'tenant-a',
			workspace_account_id: 'workspace-a',
		});
	} finally {
		globalThis.fetch = originalFetch;
	}
	assert.deepEqual(
		await checkAgencyControlSchedulerScope({} as never, {
			activationId: 'activation-a', accountId: 'account-a', tenantId: 'tenant-a', workspaceAccountId: 'workspace-a'
		}),
		{ allowed: false, reason: 'agency_scheduler_scope_not_configured' }
	);
});

test('application access claims require a matching resource audience', () => {
	const base = {
		sub: 'identity-subject',
		email: 'reviewer@webflow.com',
		tier: 'free' as const,
		source: 'io' as const,
		iss: 'https://id.createsomething.space',
		aud: ['https://webflow-template-review-mcp.createsomething.workers.dev/mcp'],
		iat: 1,
		exp: 2,
		kind: 'oauth_access_token' as const,
		client_id: 'oauth_test',
		scope: 'template-review:read',
		resource: 'https://webflow-template-review-mcp.createsomething.workers.dev/mcp',
	};

	assert.equal(isOAuthAccessTokenClaimsForApplication(base), true);
	assert.equal(isOAuthAccessTokenClaimsForApplication({ ...base, aud: ['https://other.example/mcp'] }), false);
});

test('OAuth userinfo revokes access when the identity is soft-deleted', () => {
	assert.equal(isOAuthUserInfoIdentityActive({ deleted_at: null }), true);
	assert.equal(isOAuthUserInfoIdentityActive({ deleted_at: '2026-07-12T00:00:00.000Z' }), false);
	assert.equal(isOAuthUserInfoIdentityActive(null), false);
});
