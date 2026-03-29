import test from 'node:test';
import assert from 'node:assert/strict';

import {
	requireExplicitManagedBearerRotation,
	type ManagedBearerTokenMetadata,
} from '../src/lib/server/managed-bearer-issuance.ts';

function createToken(overrides: Partial<ManagedBearerTokenMetadata> = {}): ManagedBearerTokenMetadata {
	return {
		id: 'mlt_123',
		auth_subject: 'auth0|user',
		auth_email: 'owner@example.com',
		account_id: 'acct_123',
		tenant_id: 'tenant_123',
		bound_host: null,
		token_prefix: 'mcpu_example',
		tool_mode: 'read_write',
		toolkit_profile: ['gmail'],
		allowed_tool_prefixes: ['composio-toolkit-gmail__'],
		last_used_at: null,
		revoked_at: null,
		created_at: '2026-03-28T00:00:00.000Z',
		updated_at: '2026-03-28T00:00:00.000Z',
		active: true,
		...overrides,
	};
}

test('managed bearer issue allows first issuance when no active token exists', () => {
	const result = requireExplicitManagedBearerRotation({
		existingToken: null,
		rotateExisting: false,
	});

	assert.deepEqual(result, { ok: true });
});

test('managed bearer issue blocks silent rotation when a token is already active', () => {
	const result = requireExplicitManagedBearerRotation({
		existingToken: createToken(),
		rotateExisting: false,
	});

	assert.equal(result.ok, false);
	if (result.ok) {
		throw new Error('Expected silent rotation to be rejected');
	}
	assert.equal(result.status, 409);
	assert.equal(result.body.error, 'token_exists');
	assert.equal(result.body.explicit_rotate_required, true);
	assert.match(result.body.message, /rotate_existing=true/);
});

test('managed bearer issue allows explicit rotation of an active token', () => {
	const result = requireExplicitManagedBearerRotation({
		existingToken: createToken(),
		rotateExisting: true,
	});

	assert.deepEqual(result, { ok: true });
});
