import assert from 'node:assert/strict';
import test from 'node:test';

import identityWorker, {
	isActiveVerifiedIdentity,
	isAgencyEntitlementAllowed,
	isIdentityAccessSession,
	isOAuthRedirectUriAllowed,
	resolveIdentityLoginAudience,
	requiresS256PkceForOAuthResource,
} from '../src/index.ts';

test('legacy email-only magic endpoints are terminal and never touch identity storage', async () => {
	for (const path of ['/v1/auth/magic-login', '/v1/auth/magic-signup']) {
		const response = await identityWorker.fetch(new Request(`https://id.example${path}`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ email: 'nobody@example.invalid' }),
		}), { ENVIRONMENT: 'test', ALLOWED_ORIGINS: '' } as never);
		assert.equal(response.status, 410);
		assert.equal((await response.json() as { error: string }).error, 'magic_exchange_required');
	}
});

test('identity sessions require the access-token kind, one exact audience, and current verification claims', () => {
	const base = {
		kind: 'identity_access_token',
		aud: ['agency'],
		session_version: 2,
		email_verified: true,
	};
	assert.equal(isIdentityAccessSession(base, 'agency'), true);
	assert.equal(isIdentityAccessSession({ ...base, kind: 'oauth_authorization_code' }, 'agency'), false);
	assert.equal(isIdentityAccessSession({ ...base, aud: ['agency', 'io'] }, 'agency'), false);
	assert.equal(isIdentityAccessSession({ ...base, aud: ['io'] }, 'agency'), false);
	assert.equal(isIdentityAccessSession({ ...base, email_verified: false }, 'agency'), false);
	assert.equal(isIdentityAccessSession({ ...base, session_version: 1 }, 'agency'), false);
});

test('legacy login requests retain one source-bound audience during the rollout', () => {
	assert.equal(resolveIdentityLoginAudience(undefined, 'space'), 'space');
	assert.equal(resolveIdentityLoginAudience('client-workspace', 'space'), 'client-workspace');
});

test('identity and entitlement state fail closed', () => {
	assert.equal(isActiveVerifiedIdentity({ deleted_at: null, email_verified: 1 }), true);
	assert.equal(isActiveVerifiedIdentity({ deleted_at: '2026-01-01', email_verified: 1 }), false);
	assert.equal(isActiveVerifiedIdentity({ deleted_at: null, email_verified: 0 }), false);
	assert.equal(isAgencyEntitlementAllowed({ allowed: true }), true);
	assert.equal(isAgencyEntitlementAllowed({ allowed: false }), false);
	assert.equal(isAgencyEntitlementAllowed(null), false);
});

test('OAuth authorization requires S256 and safe exact redirect URIs for every resource', () => {
	assert.equal(requiresS256PkceForOAuthResource('https://hub.example/mcp'), true);
	assert.equal(requiresS256PkceForOAuthResource('https://createsomething.agency'), true);
	assert.equal(isOAuthRedirectUriAllowed('https://chatgpt.com/connector/callback'), true);
	assert.equal(isOAuthRedirectUriAllowed('http://127.0.0.1:3456/callback'), true);
	assert.equal(isOAuthRedirectUriAllowed('http://localhost:3456/callback'), true);
	assert.equal(isOAuthRedirectUriAllowed('http://attacker.example/callback'), false);
	assert.equal(isOAuthRedirectUriAllowed('https://chatgpt.com/callback#fragment'), false);
});
