import test from 'node:test';
import assert from 'node:assert/strict';

import { getPartnerProspectIssuanceBlocker } from '../src/lib/server/partner-prospect-issuance.ts';

test('prospect onboarding records block managed bearer issuance', () => {
	const blocker = getPartnerProspectIssuanceBlocker({
		clientMetadata: {
			onboarding_mode: 'prospect',
			lifecycle_stage: 'prospect',
		},
		surface: 'managed_bearer',
	});
	assert.equal(
		blocker,
		'Prospect onboarding records cannot issue managed bearer tokens until graduation is recorded and governed entitlement state is active (service_entitled, policy_accepted, contract_active, billing_active).',
	);
});

test('graduated prospect records are allowed to issue strict sessions', () => {
	assert.equal(
		getPartnerProspectIssuanceBlocker({
			clientMetadata: {
				onboarding_mode: 'prospect',
				lifecycle_stage: 'graduated',
				prospect_onboarding: {
					graduated_at: '2026-03-18T12:00:00.000Z',
				},
			},
			surface: 'strict_session',
		}),
		null,
	);
});
