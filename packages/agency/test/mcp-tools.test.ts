import test from 'node:test';
import assert from 'node:assert/strict';

import type { McpAccessAssignment } from '../src/lib/server/mcp-access-assignments.ts';
import { buildHubToolAvailabilityPayload } from '../src/lib/server/mcp-tools.ts';

test('legacy hub availability resolves connection state via the legacy binding id', async () => {
	let boundPartnerClientId: string | null = null;

	const db = {
		prepare(sql: string) {
			assert.match(sql, /FROM partner_auth_toolkit_accounts/);
			return {
				bind(partnerClientId: string) {
					boundPartnerClientId = partnerClientId;
					return {
						all: async () => ({
							results: [
								{
									toolkit: 'gmail',
									connection_status: 'ACTIVE',
									status: 'active',
								},
							],
						}),
					};
				},
			};
		},
	} as unknown as D1Database;

	const assignment: McpAccessAssignment = {
		source: 'legacy',
		partnerClientId: null,
		clientSlug: null,
		laneKey: 'danny',
		displayName: 'Danny',
		hubUrl: 'https://danny.mcp.createsomething.agency/mcp',
		bridgeUrl: 'https://danny-notion.mcp.createsomething.agency/mcp',
		bridgeUsername: 'acct_danny',
		credentialSource: 'Vault + private operator handoff',
		hostKey: 'acct_danny',
		accountId: 'acct_danny',
		tenantId: 'tenant_halfdozen_co',
		workspaceAccountId: 'acct_danny',
		toolkitProfile: ['gmail'],
		allowedToolPrefixes: ['composio-toolkit-gmail__'],
	};

	const payload = await buildHubToolAvailabilityPayload({
		db,
		assignment,
		toolkit: 'gmail',
	});

	assert.equal(boundPartnerClientId, 'legacy_lane_danny');
	assert.equal(payload.summary.connectedToolkits, 1);
	assert.equal(payload.summary.readyToolkits, 1);
	assert.equal(payload.selectedToolkit?.connectionStatus, 'active');
	assert.equal(payload.selectedToolkit?.readyByPolicy, true);
	assert.equal(payload.services[0]?.toolkit, 'gmail');
	assert.equal(payload.services[0]?.connectionStatus, 'active');
	assert.equal(payload.services[0]?.readyByPolicy, true);
});
