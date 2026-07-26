import assert from 'node:assert/strict';
import test from 'node:test';

import {
	AGENCY_PROTECTED_PATHS,
	isAgencyProtectedPath
} from '../src/lib/server/protected-routes.ts';

test('Signal community APIs are internal-only protected routes', () => {
	assert.ok(AGENCY_PROTECTED_PATHS.includes('/api/community'));
	assert.equal(isAgencyProtectedPath('/api/community'), true);
	assert.equal(isAgencyProtectedPath('/api/community/signals'), true);
	assert.equal(isAgencyProtectedPath('/api/community/queue'), true);
	assert.equal(isAgencyProtectedPath('/api/community/monitors'), true);
});

test('Control activation API requires the first-party authenticated account scope', () => {
	assert.ok(AGENCY_PROTECTED_PATHS.includes('/api/control'));
	assert.equal(isAgencyProtectedPath('/api/control/activations'), true);
});

test('public governance and marketing routes remain public', () => {
	assert.equal(isAgencyProtectedPath('/products/signal'), false);
	assert.equal(isAgencyProtectedPath('/api/governance/products'), false);
	assert.equal(isAgencyProtectedPath('/api/contact'), false);
});
