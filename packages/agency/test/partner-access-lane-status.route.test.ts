import test from 'node:test';
import assert from 'node:assert/strict';

import { createPartnerAccessLaneStatusGetHandler } from '../src/lib/server/partner-access-lane-status-core.ts';

function createEvent() {
	return {
		request: new Request('https://example.com/api/partners/half-dozen/clients/acme/lanes/acme-lane/status'),
		params: {
			slug: 'Acme',
			laneSlug: 'Acme-Lane',
		},
		platform: {
			env: {
				DB: {},
			},
		},
	} as any;
}

test('partner access lane status route reports managed bearer readiness when mappings and consent exist', async () => {
	const handler = createPartnerAccessLaneStatusGetHandler({
		partnerKey: 'half-dozen',
		getLatestActiveConsent: async () =>
			({
				id: 'consent_1',
				partner_client_id: 'client_1',
				consent_version: 'v1',
				granted_by: 'owner@example.com',
				channel: 'portal',
				reference: null,
				granted_at: '2026-03-20T00:00:00.000Z',
				expires_at: null,
				metadata_json: '{}',
				created_at: '2026-03-20T00:00:00.000Z',
				updated_at: '2026-03-20T00:00:00.000Z',
			}) as any,
		getPartnerAccessLaneBySlug: async () =>
			({
				id: 'lane_1',
				partner_client_id: 'client_1',
				slug: 'acme-lane',
				display_name: 'Acme Lane',
				identity_user_id: 'auth0|lane-user',
				owner_email: 'owner@example.com',
				hub_url: 'https://acme-lane.mcp.createsomething.agency/mcp',
				host_key: 'acme-lane',
				status: 'active',
				toolkit_profile_json: '["gmail","exa"]',
				allowed_tool_prefixes_json: '["notion-halfdozen-acme__","composio-toolkit-gmail__","composio-toolkit-exa__"]',
				metadata_json: '{"approved_exception":{"approved_by":"mj"}}',
				created_at: '2026-03-20T00:00:00.000Z',
				updated_at: '2026-03-20T00:00:00.000Z',
			}) as any,
		getPartnerClientBySlug: async () =>
			({
				id: 'client_1',
				slug: 'acme',
				display_name: 'Acme',
				workspace_account_id: 'wksp_acme',
				identity_account_id: 'acct_acme',
				identity_user_id: 'auth0|client-user',
				identity_tenant_id: 'tenant_acme',
				owner_email: 'owner@example.com',
				status: 'active',
				required_toolkits_json: '["gmail","exa"]',
				metadata_json: '{"service_tier":"mcp_only"}',
				created_at: '2026-03-20T00:00:00.000Z',
				updated_at: '2026-03-20T00:00:00.000Z',
			}) as any,
		normalizePartnerAccessLaneSlug: (value) => value.trim().toLowerCase(),
		normalizePartnerSlug: (value) => value.trim().toLowerCase(),
		parseJsonArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
		parseJsonStringArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		requirePartnerAdmin: () => 'partner_admin:test',
		isHttpError: (error): error is { status: number; code: string; message: string } =>
			Boolean(error && typeof error === 'object' && 'status' in error && 'code' in error && 'message' in error),
	});

	const response = await handler(createEvent());
	assert.equal(response.status, 200);

	const payload = await response.json();
	assert.equal(payload.client.slug, 'acme');
	assert.equal(payload.lane.slug, 'acme-lane');
	assert.equal(payload.active_consent.present, true);
	assert.equal(payload.readiness.client_status_issuable, true);
	assert.equal(payload.readiness.lane_status_issuable, true);
	assert.equal(payload.readiness.identity_account_ready, true);
	assert.equal(payload.readiness.identity_tenant_ready, true);
	assert.equal(payload.readiness.lane_identity_subject_ready, true);
	assert.equal(payload.readiness.consent_ready, true);
	assert.equal(payload.readiness.managed_bearer_ready, true);
});

test('partner access lane status route returns not_found when the named lane does not exist', async () => {
	const handler = createPartnerAccessLaneStatusGetHandler({
		partnerKey: 'half-dozen',
		getLatestActiveConsent: async () => null,
		getPartnerAccessLaneBySlug: async () => null,
		getPartnerClientBySlug: async () =>
			({
				id: 'client_1',
				slug: 'acme',
				display_name: 'Acme',
				workspace_account_id: 'wksp_acme',
				identity_account_id: null,
				identity_user_id: null,
				identity_tenant_id: null,
				owner_email: 'owner@example.com',
				status: 'initialized',
				required_toolkits_json: '["gmail"]',
				metadata_json: '{}',
				created_at: '2026-03-20T00:00:00.000Z',
				updated_at: '2026-03-20T00:00:00.000Z',
			}) as any,
		normalizePartnerAccessLaneSlug: (value) => value.trim().toLowerCase(),
		normalizePartnerSlug: (value) => value.trim().toLowerCase(),
		parseJsonArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
		parseJsonStringArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		requirePartnerAdmin: () => 'partner_admin:test',
		isHttpError: (error): error is { status: number; code: string; message: string } =>
			Boolean(error && typeof error === 'object' && 'status' in error && 'code' in error && 'message' in error),
	});

	const response = await handler(createEvent());
	assert.equal(response.status, 404);

	const payload = await response.json();
	assert.equal(payload.error, 'not_found');
	assert.equal(payload.message, 'Named access lane not found');
});
