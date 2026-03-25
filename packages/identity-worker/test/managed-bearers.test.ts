import assert from 'node:assert/strict';
import test from 'node:test';

import { prepareManagedBearerToken } from '../src/managed-bearers.ts';

test('prepareManagedBearerToken preserves an existing bearer token for adoption', () => {
	const prepared = prepareManagedBearerToken('mcpu_existing_reviewer_token');

	assert.equal(prepared.rawToken, 'mcpu_existing_reviewer_token');
	assert.equal(prepared.tokenPrefix, 'mcpu_existing_');
	assert.equal(prepared.tokenSource, 'adopted');
});

test('prepareManagedBearerToken generates a new managed bearer when none is supplied', () => {
	const prepared = prepareManagedBearerToken();

	assert.match(prepared.rawToken, /^mcpu_[A-Za-z0-9_-]+$/);
	assert.equal(prepared.tokenPrefix.length, 14);
	assert.equal(prepared.tokenPrefix, prepared.rawToken.slice(0, 14));
	assert.equal(prepared.tokenSource, 'generated');
});
