import assert from 'node:assert/strict';
import test from 'node:test';

import { GET } from '../src/routes/api/map/health/+server.ts';

test('credential-free Map health is secret-safe and reports fail-closed commercial state', async () => {
	const response = await GET({
		platform: {
			env: {
				DB: {
					prepare() {
						return {
							bind() { return this; },
							async all() { return { results: [{ name: 'customer_maps' }, { name: 'customer_map_versions' }] }; }
						};
					}
				},
				OPENAI_API_KEY: 'secret-openai',
				STRIPE_SECRET_KEY: 'secret-stripe',
				STRIPE_PRICE_MAP_MONTHLY: '',
				STRIPE_PRICE_MAP_YEARLY: ''
			}
		}
	} as never);
	const body = await response.json() as Record<string, unknown>;

	assert.equal(response.status, 200);
	assert.equal(body.status, 'ready');
	assert.deepEqual(body.commercial, {
		checkout_enabled: false,
		configuration: 'fail_closed',
		commercial_approval_recorded: false
	});
	assert.equal(JSON.stringify(body).includes('secret-openai'), false);
	assert.equal(JSON.stringify(body).includes('secret-stripe'), false);
});
