import assert from 'node:assert/strict';
import test from 'node:test';

import {
	MAP_MONITOR_POLICY,
	evaluateMapSyntheticReceipts
} from '../scripts/lib/map-monitor-policy.mjs';

test('Map monitoring policy names its owner, SLOs, synthetic boundary, and retention', () => {
	assert.equal(MAP_MONITOR_POLICY.owner.name, 'Micah Johnson');
	assert.equal(MAP_MONITOR_POLICY.owner.linearIssue, 'CRE-1289');
	assert.equal(MAP_MONITOR_POLICY.cadenceMinutes, 15);
	assert.equal(MAP_MONITOR_POLICY.synthetic.customerDataAllowed, false);
	assert.equal(MAP_MONITOR_POLICY.synthetic.agentMutationAllowed, false);
	assert.equal(MAP_MONITOR_POLICY.synthetic.receiptRetentionDays, 30);
	assert.equal(MAP_MONITOR_POLICY.slos.availability.target, 0.999);
	assert.equal(MAP_MONITOR_POLICY.slos.bookingContextConsistency.target, 1);
});

test('forced synthetic failure produces a named-owner incident receipt', () => {
	const result = evaluateMapSyntheticReceipts([
		{
			schema_version: 1,
			checked_at: '2026-07-17T00:00:00.000Z',
			base_url: 'https://createsomething.agency',
			viewport: 'desktop',
			ok: false,
			checks: [{ id: 'booking_context', ok: false, detail: 'score mismatch' }]
		}
	]);

	assert.equal(result.ok, false);
	assert.equal(result.alert.owner, 'Micah Johnson');
	assert.equal(result.alert.linear_issue, 'CRE-1289');
	assert.match(result.alert.summary, /booking_context/);
	assert.equal(result.alert.customer_data_affected, false);
});
