import assert from 'node:assert/strict';
import test from 'node:test';
import { verifySharedAdminPassword } from '../src/lib/server/auth';

test('shared admin password authenticates the single configured credential', () => {
	const env = { ADMIN_PASSWORD: 'one-governed-password' };

	assert.equal(verifySharedAdminPassword(env, 'one-governed-password'), true);
	assert.equal(verifySharedAdminPassword(env, 'wrong-password'), false);
});

test('shared admin password fails closed when the secret is unavailable', () => {
	assert.equal(verifySharedAdminPassword({}, 'anything'), false);
	assert.equal(verifySharedAdminPassword({ ADMIN_PASSWORD: '' }, ''), false);
});
