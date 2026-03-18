import test from 'node:test';
import assert from 'node:assert/strict';

import { loadProspectPortalData } from '../src/lib/server/prospect-portal-core.ts';

test('prospect portal load returns a public state when no user is signed in', async () => {
	const result = await loadProspectPortalData(
		{
			listPartnerProspectClaimsForAgencyUser: async () => {
				throw new Error('listPartnerProspectClaimsForAgencyUser should not be called');
			},
		},
		{
			user: null,
			db: null,
		},
	);

	assert.equal(result.user, null);
	assert.equal(result.error, null);
	assert.deepEqual(result.prospects, []);
});

test('prospect portal load returns claimed prospects for an authenticated user', async () => {
	const result = await loadProspectPortalData(
		{
			listPartnerProspectClaimsForAgencyUser: async () => [
				{
					client: { slug: 'acme' },
					prospect_claim: { state: 'claimable', can_claim_now: true, blocked_reason: null },
					toolkit_accounts: [],
				},
			],
		},
		{
			user: { id: 'auth0|claimant', email: 'owner@example.com' },
			db: {} as D1Database,
			env: {} as App.Platform['env'],
		},
	);

	assert.equal(result.user?.id, 'auth0|claimant');
	assert.equal(result.error, null);
	assert.equal(result.prospects.length, 1);
});

test('prospect portal load returns a recoverable error when the database is unavailable', async () => {
	const result = await loadProspectPortalData(
		{
			listPartnerProspectClaimsForAgencyUser: async () => {
				throw new Error('listPartnerProspectClaimsForAgencyUser should not be called');
			},
		},
		{
			user: { id: 'auth0|claimant', email: 'owner@example.com' },
			db: null,
		},
	);

	assert.equal(result.user?.id, 'auth0|claimant');
	assert.equal(result.error, 'Database is unavailable');
	assert.deepEqual(result.prospects, []);
});
