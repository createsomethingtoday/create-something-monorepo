import assert from 'node:assert/strict';
import test from 'node:test';

import {
	isOAuthAccessTokenClaimsForApplication,
	isOAuthUserInfoIdentityActive,
	resolveOAuthApplicationAccessPolicy,
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

test('Canva Client Operator OAuth uses an explicit resource-bound application policy', () => {
	const policy = resolveOAuthApplicationAccessPolicy(
		'https://canva-client-operator-mcp.createsomething.workers.dev/mcp'
	);

	assert.deepEqual(policy, {
		applicationId: 'canva-client-operator-mcp',
		resource: 'https://canva-client-operator-mcp.createsomething.workers.dev/mcp',
		expiresIn: 3600,
	});
});

test('Notion Client Operator OAuth uses an explicit resource-bound application policy', () => {
	const policy = resolveOAuthApplicationAccessPolicy(
		'https://notion-client-operator-mcp.createsomething.workers.dev/mcp'
	);

	assert.deepEqual(policy, {
		applicationId: 'notion-client-operator-mcp',
		resource: 'https://notion-client-operator-mcp.createsomething.workers.dev/mcp',
		expiresIn: 3600,
	});
});

test('unknown OAuth resources do not bypass managed bearer governance', () => {
	assert.equal(resolveOAuthApplicationAccessPolicy('https://unknown.example/mcp'), null);
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
