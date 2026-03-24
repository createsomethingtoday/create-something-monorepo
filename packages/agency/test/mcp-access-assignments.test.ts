import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveMcpAccessAssignment } from '../src/lib/server/mcp-access-assignments.ts';

const LEGACY_SHARED_AUTH_TOOLKITS = [
	'dropbox',
	'gmail',
	'youtube',
	'googlesheets',
	'googledrive',
	'zoom',
	'slack',
	'quickbooks',
	'linkedin',
	'notion',
];

test('legacy MJ assignments inherit the shared-auth toolkit scope', async () => {
	const assignment = await resolveMcpAccessAssignment(undefined, {
		email: 'micah@createsomething.io',
		accountId: 'acct_mj',
		tenantId: 'tenant_createsomething_io',
	});

	assert.ok(assignment);
	assert.equal(assignment.source, 'legacy');
	assert.equal(assignment.laneKey, 'mj');
	assert.deepEqual(assignment.toolkitProfile, LEGACY_SHARED_AUTH_TOOLKITS);
	assert.deepEqual(
		assignment.allowedToolPrefixes,
		LEGACY_SHARED_AUTH_TOOLKITS.map((toolkit) => `composio-toolkit-${toolkit}__`),
	);
});

test('legacy DM aliases resolve to Danny with the shared-auth toolkit scope', async () => {
	const assignment = await resolveMcpAccessAssignment(undefined, {
		email: 'dm@halfdozen.co',
		accountId: null,
		tenantId: 'tenant_halfdozen_co',
	});

	assert.ok(assignment);
	assert.equal(assignment.source, 'legacy');
	assert.equal(assignment.laneKey, 'danny');
	assert.equal(assignment.displayName, 'Danny');
	assert.equal(assignment.bridgeUsername, 'acct_danny');
	assert.deepEqual(assignment.toolkitProfile, LEGACY_SHARED_AUTH_TOOLKITS);
});

test('legacy Webflow reviewer lanes remain explicitly outside the Composio toolkit catalog scope', async () => {
	const assignment = await resolveMcpAccessAssignment(undefined, {
		email: 'reviewer@webflow.com',
		accountId: 'acct_wf_eric',
		tenantId: 'tenant_webflow_marketplace',
	});

	assert.ok(assignment);
	assert.equal(assignment.source, 'legacy');
	assert.equal(assignment.laneKey, 'wf_eric');
	assert.deepEqual(assignment.toolkitProfile, []);
	assert.deepEqual(assignment.allowedToolPrefixes, []);
});
