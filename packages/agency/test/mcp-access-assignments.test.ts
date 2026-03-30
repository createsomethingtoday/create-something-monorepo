import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveMcpAccessAssignment } from '../src/lib/server/mcp-access-assignments.ts';
import type { PartnerAuthAccessLaneAssignmentRow } from '../src/lib/server/partner-auth.ts';

function makeLaneDbRow(row: PartnerAuthAccessLaneAssignmentRow): D1Database {
	return {
		prepare() {
			return {
				bind() {
					return {
						first: async () => row,
						all: async () => ({ results: [row] }),
					};
				},
			};
		},
	} as unknown as D1Database;
}

test('legacy Danny lane preserves WhatsApp and Half Dozen prefixes', async () => {
	const assignment = await resolveMcpAccessAssignment(undefined, {
		email: 'dm@example.com',
		accountId: 'acct_danny',
		tenantId: 'acct_danny',
	});

	assert.ok(assignment);
	assert.equal(assignment.laneKey, 'danny');
	assert.deepEqual(
		assignment.allowedToolPrefixes,
		[
			'halfdozen-dm-mcp__',
			'halfdozen-operator-notion-mcp__',
			'composio-toolkit-dropbox__',
			'composio-toolkit-gmail__',
			'composio-toolkit-youtube__',
			'composio-toolkit-googlesheets__',
			'composio-toolkit-googledrive__',
			'composio-toolkit-zoom__',
			'composio-toolkit-slack__',
			'composio-toolkit-quickbooks__',
			'composio-toolkit-linkedin__',
			'composio-toolkit-notion__',
			'composio-toolkit-whatsapp__',
		],
	);
});

test('legacy MJ lane preserves ops, review, and analyzer prefixes', async () => {
	const assignment = await resolveMcpAccessAssignment(undefined, {
		email: 'mj@example.com',
		accountId: 'acct_mj',
		tenantId: 'acct_mj',
	});

	assert.ok(assignment);
	assert.equal(assignment.laneKey, 'mj');
	assert.ok(assignment.allowedToolPrefixes.includes('composio-toolkit-airtable__'));
	assert.ok(assignment.allowedToolPrefixes.includes('composio-toolkit-exa__'));
	assert.ok(assignment.allowedToolPrefixes.includes('loom-mcp__'));
	assert.ok(assignment.allowedToolPrefixes.includes('meetings__'));
	assert.ok(assignment.allowedToolPrefixes.includes('webflow-template-review-mcp__'));
	assert.ok(assignment.allowedToolPrefixes.includes('webflow-site-analyzer-mcp__'));
});

test('legacy reviewer lanes keep reviewer MCP access even without toolkit auth', async () => {
	const assignment = await resolveMcpAccessAssignment(undefined, {
		email: 'micah@webflow.com',
		accountId: 'acct_wf_micah',
		tenantId: 'acct_wf_micah',
	});

	assert.ok(assignment);
	assert.equal(assignment.laneKey, 'wf_micah');
	assert.deepEqual(assignment.toolkitProfile, []);
	assert.deepEqual(assignment.allowedToolPrefixes, ['webflow-template-review-mcp__']);
});

test('DB-backed reviewer lanes inherit reviewer-only prefixes when explicit prefixes are empty', async () => {
	const assignment = await resolveMcpAccessAssignment(
		makeLaneDbRow({
			id: 'lane-1',
			partner_client_id: 'client-1',
			slug: 'wf-template-review-micah',
			display_name: 'Micah Johnson',
			identity_user_id: 'user-1',
			owner_email: 'micah@webflow.com',
			hub_url: 'https://wf-template-review-micah.mcp.createsomething.agency/mcp',
			host_key: 'acct_wf_micah',
			status: 'active',
			toolkit_profile_json: '[]',
			allowed_tool_prefixes_json: '[]',
			metadata_json: '{"hub_slug":"wf-template-review-micah"}',
			created_at: '2026-03-27T00:00:00Z',
			updated_at: '2026-03-27T00:00:00Z',
			partner_key: 'half-dozen',
			client_slug: 'webflow-marketplace-review',
			client_display_name: 'Webflow Marketplace Review',
			workspace_account_id: 'acct_wf_micah',
			identity_account_id: 'acct_wf_micah',
			identity_tenant_id: 'tenant_webflow_marketplace',
		}),
		{
			email: 'micah@webflow.com',
			accountId: 'acct_wf_micah',
			tenantId: 'tenant_webflow_marketplace',
			authSubject: 'user-1',
		},
	);

	assert.ok(assignment);
	assert.equal(assignment.source, 'partner_lane');
	assert.deepEqual(assignment.toolkitProfile, []);
	assert.deepEqual(assignment.allowedToolPrefixes, ['webflow-template-review-mcp__']);
});

test('DB-backed Danny lanes inherit canonical WhatsApp and Half Dozen prefixes when stored lane data is stale', async () => {
	const assignment = await resolveMcpAccessAssignment(
		makeLaneDbRow({
			id: 'lane-2',
			partner_client_id: 'client-2',
			slug: 'danny',
			display_name: 'Danny',
			identity_user_id: 'user-2',
			owner_email: 'dm@example.com',
			hub_url: 'https://danny.mcp.createsomething.agency/mcp',
			host_key: 'acct_danny',
			status: 'active',
			toolkit_profile_json:
				'["dropbox","gmail","youtube","googlesheets","googledrive","zoom","slack","quickbooks","linkedin","notion"]',
			allowed_tool_prefixes_json: '[]',
			metadata_json: '{"hub_slug":"danny"}',
			created_at: '2026-03-27T00:00:00Z',
			updated_at: '2026-03-27T00:00:00Z',
			partner_key: 'half-dozen',
			client_slug: 'danny',
			client_display_name: 'Danny',
			workspace_account_id: 'acct_danny',
			identity_account_id: 'acct_danny',
			identity_tenant_id: 'acct_danny',
		}),
		{
			email: 'dm@example.com',
			accountId: 'acct_danny',
			tenantId: 'acct_danny',
			authSubject: 'user-2',
		},
	);

	assert.ok(assignment);
	assert.equal(assignment.source, 'partner_lane');
	assert.ok(assignment.toolkitProfile.includes('whatsapp'));
	assert.ok(assignment.allowedToolPrefixes.includes('composio-toolkit-whatsapp__'));
	assert.ok(assignment.allowedToolPrefixes.includes('halfdozen-dm-mcp__'));
	assert.ok(assignment.allowedToolPrefixes.includes('halfdozen-operator-notion-mcp__'));
});
