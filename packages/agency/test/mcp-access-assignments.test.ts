import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveMcpAccessAssignment } from '../src/lib/server/mcp-access-assignments.ts';

test('template reviewer legacy lanes report managed bearer credential source', async () => {
	const assignment = await resolveMcpAccessAssignment(undefined, {
		email: 'natalia.ledford@webflow.com',
		accountId: 'acct_wf_natalia',
		tenantId: 'tenant_webflow_marketplace',
	});

	assert.ok(assignment);
	assert.equal(assignment?.laneKey, 'wf_natalia');
	assert.equal(assignment?.credentialSource, 'Managed bearer reviewer lane');
	assert.equal(assignment?.claudeConnectionMode, 'mcp_remote');
});

test('shared auth legacy lanes keep private handoff credential source', async () => {
	const assignment = await resolveMcpAccessAssignment(undefined, {
		email: 'dm@example.com',
		accountId: 'acct_danny',
		tenantId: 'danny',
	});

	assert.ok(assignment);
	assert.equal(assignment?.laneKey, 'danny');
	assert.equal(assignment?.credentialSource, 'Vault + private operator handoff');
	assert.equal(assignment?.claudeConnectionMode, 'direct_http');
});
