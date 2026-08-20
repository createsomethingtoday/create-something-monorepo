import test from 'node:test';
import assert from 'node:assert/strict';

import { createPartnerProspectListGetHandler } from '../src/lib/server/partner-prospect-list-core.ts';

test('agency session user can list claimable prospects from the API route handler', async () => {
	const handler = createPartnerProspectListGetHandler({
		requireAgencySessionUser: async () => ({
			id: 'auth0|claimant',
			email: 'owner@example.com',
		}),
		listPartnerProspectClaimsForAgencyUser: async () => [
			{
				client: { slug: 'acme' },
				lane: { slug: 'prospect-acme' },
				prospect_claim: { state: 'claimable' },
			},
		],
	});

	const response = await handler({
		cookies: {},
		platform: { env: { DB: {} } },
	} as any);

	assert.equal(response.status, 200);
	const payload = (await response.json()) as {
		user: { auth_subject: string };
		prospects: Array<{ client: { slug: string } }>;
	};
	assert.equal(payload.user.auth_subject, 'auth0|claimant');
	assert.equal(payload.prospects.length, 1);
	assert.equal(payload.prospects[0]?.client.slug, 'acme');
});

test('prospect list route handler returns 503 when the database is unavailable', async () => {
	const handler = createPartnerProspectListGetHandler({
		requireAgencySessionUser: async () => {
			throw new Error('requireAgencySessionUser should not be called');
		},
		listPartnerProspectClaimsForAgencyUser: async () => {
			throw new Error('listPartnerProspectClaimsForAgencyUser should not be called');
		},
	});

	const response = await handler({
		cookies: {},
		platform: { env: {} },
	} as any);

	assert.equal(response.status, 503);
	const payload = (await response.json()) as { error: string };
	assert.equal(payload.error, 'unavailable');
});
