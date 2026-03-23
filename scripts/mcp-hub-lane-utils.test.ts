import test from 'node:test';
import assert from 'node:assert/strict';

import {
	buildDedicatedDeployVars,
	buildLaneContext,
	buildLaneInitPayload,
	extractRuntimeActivePolicies,
	listWorkerSecrets,
	meetsRequiredState,
	normalizeLaneKey,
	type LaneCatalogDefaults,
	type LaneSpec,
	type PreflightResult,
} from './mcp-hub-lane-lib.ts';

const defaults: LaneCatalogDefaults = {
	partnerKey: 'half-dozen',
	partnerApiBaseUrl: 'https://agency.createsomething.agency',
	hubDomainSuffix: 'mcp.createsomething.agency',
	hubRuntimeDir: 'packages/cs-mcp-hub-remote',
	hubRuntimeConfig: 'packages/cs-mcp-hub-remote/wrangler.team-hubs.toml',
	sessionResolveUrl: 'https://id.createsomething.space/v1/mcp/sessions/resolve',
	connectTimeoutMs: 10_000,
	listToolsTimeoutMs: 15_000,
	connectConcurrency: 4,
};

const dedicatedSpec: LaneSpec = {
	clientSlug: 'blondish',
	displayName: 'Viv - BLOND:ISH',
	deploymentMode: 'dedicated',
	identityMode: 'compat',
	fallbackAccountId: 'acct_viv_blondish',
	primaryService: 'notion-halfdozen-blondish',
	enabledServers: [
		'notion-halfdozen-blondish',
		'composio-toolkit-gmail',
		'composio-toolkit-exa',
		'composio-toolkit-perplexityai',
		'composio-toolkit-composio_search',
	],
	disabledServers: ['composio-toolkit-notion'],
	requiredGlobalServers: [],
	requiredDiscoveryServers: [],
	discoveryMode: 'compact',
	discoveryPack: 'named-lane-viv-blondish',
	discoveryDefaultServers: [
		'notion-halfdozen-blondish',
		'composio-toolkit-gmail',
		'composio-toolkit-exa',
		'composio-toolkit-perplexityai',
		'composio-toolkit-composio_search',
	],
	toolkitProfile: ['gmail', 'exa', 'perplexityai', 'composio_search'],
	allowedToolPrefixes: [],
	searchProviders: [
		{
			id: 'exa',
			toolkit: 'exa',
			serverName: 'composio-toolkit-exa',
			authConfigRequired: true,
		},
		{
			id: 'perplexityai',
			toolkit: 'perplexityai',
			serverName: 'composio-toolkit-perplexityai',
			authConfigRequired: true,
		},
		{
			id: 'composio_search',
			toolkit: 'composio_search',
			serverName: 'composio-toolkit-composio_search',
			authConfigRequired: false,
		},
	],
	approvedException: {
		approvedBy: 'mj',
		graduationTarget: 'policy_os_trial',
	},
};

test('normalizeLaneKey converts lane slugs into vault-compatible env keys', () => {
	assert.equal(normalizeLaneKey('morgan-young-c3-management'), 'MORGAN_YOUNG_C3_MANAGEMENT');
	assert.equal(normalizeLaneKey('viv-blondish'), 'VIV_BLONDISH');
});

test('buildLaneContext derives the canonical dedicated worker, domain, and URLs', () => {
	const context = buildLaneContext(defaults, 'viv-blondish', dedicatedSpec);
	assert.equal(context.workerName, 'cs-hub-viv-blondish');
	assert.equal(context.domain, 'viv-blondish.mcp.createsomething.agency');
	assert.equal(context.hubUrl, 'https://viv-blondish.mcp.createsomething.agency/mcp');
	assert.equal(context.healthUrl, 'https://viv-blondish.mcp.createsomething.agency/health');
});

test('buildLaneContext honors shared hub overrides when a lane is config-only', () => {
	const context = buildLaneContext(defaults, 'shared-lane', {
		...dedicatedSpec,
		deploymentMode: 'shared',
		sharedHubUrl: 'https://shared.mcp.createsomething.agency/mcp',
		sharedHubWorkerName: 'cs-hub-shared-auth-core',
		hubApiTokenEnv: 'CS_MCP_HUB_REMOTE_API_TOKEN',
	});
	assert.equal(context.workerName, 'cs-hub-shared-auth-core');
	assert.equal(context.domain, 'shared.mcp.createsomething.agency');
	assert.equal(context.hubUrl, 'https://shared.mcp.createsomething.agency/mcp');
	assert.equal(context.healthUrl, 'https://shared.mcp.createsomething.agency/health');
});

test('buildDedicatedDeployVars produces the expected dedicated-worker wrangler vars', () => {
	const context = buildLaneContext(defaults, 'viv-blondish', dedicatedSpec);
	const vars = buildDedicatedDeployVars(dedicatedSpec, context, defaults);
	assert.deepEqual(vars, {
		HUB_INSTANCE_ID: 'cs-hub-viv-blondish',
		HUB_ACCOUNT_ID: 'acct_viv_blondish',
		HUB_ENABLED_BUNDLES: '[]',
		HUB_ENABLED_SERVERS:
			'notion-halfdozen-blondish,composio-toolkit-gmail,composio-toolkit-exa,composio-toolkit-perplexityai,composio-toolkit-composio_search',
		HUB_DISABLED_SERVERS: 'composio-toolkit-notion',
		HUB_REQUIRED_GLOBAL_SERVERS: '',
		HUB_REQUIRED_DISCOVERY_SERVERS: '',
		HUB_DISCOVERY_MODE: 'compact',
		HUB_DISCOVERY_DEFAULT_SERVERS:
			'notion-halfdozen-blondish,composio-toolkit-gmail,composio-toolkit-exa,composio-toolkit-perplexityai,composio-toolkit-composio_search',
		HUB_DISCOVERY_SHARED_PACK: 'named-lane-viv-blondish',
		HUB_IDENTITY_MODE: 'compat',
		HUB_COMPAT_TRUST_CLIENT_ACCOUNT_HEADERS: 'false',
		HUB_SESSION_RESOLVE_URL: 'https://id.createsomething.space/v1/mcp/sessions/resolve',
		HUB_CONNECT_TIMEOUT_MS: '10000',
		HUB_LIST_TOOLS_TIMEOUT_MS: '15000',
		HUB_CONNECT_CONCURRENCY: '4',
	});
});

test('listWorkerSecrets scopes secret requirements by deployment mode', () => {
	assert.deepEqual(
		listWorkerSecrets(dedicatedSpec, 'VIV_BLONDISH').map((secret) => secret.worker_secret_name),
		['HUB_API_TOKEN', 'HUB_SESSION_RESOLVE_TOKEN', 'BRAINTRUST_API_KEY', 'BRAINTRUST_PROJECT_ID'],
	);

	assert.deepEqual(
		listWorkerSecrets(
			{
				...dedicatedSpec,
				deploymentMode: 'shared',
			},
			'SHARED_LANE',
		),
		[],
	);

	assert.deepEqual(
		listWorkerSecrets(
			{
				...dedicatedSpec,
				deploymentMode: 'shared',
				hubApiTokenEnv: 'CS_MCP_HUB_REMOTE_API_TOKEN',
			},
			'SHARED_LANE',
		).map((secret) => secret.env_name),
		['CS_MCP_HUB_REMOTE_API_TOKEN'],
	);
});

test('buildLaneInitPayload preserves managed metadata and approved exception defaults', () => {
	const context = buildLaneContext(defaults, 'viv-blondish', dedicatedSpec);
	const payload = buildLaneInitPayload(dedicatedSpec, context, 'blondish');
	assert.equal(payload.display_name, 'Viv - BLOND:ISH');
	assert.deepEqual(payload.toolkit_profile, ['gmail', 'exa', 'perplexityai', 'composio_search']);
	assert.deepEqual(payload.allowed_tool_prefixes, []);

	const metadata = payload.metadata as Record<string, unknown>;
	assert.equal(metadata.deployment_mode, 'dedicated');
	assert.equal(metadata.primary_service, 'notion-halfdozen-blondish');
	assert.equal(metadata.hub_worker_name, 'cs-hub-viv-blondish');
	assert.equal(metadata.hub_url, 'https://viv-blondish.mcp.createsomething.agency/mcp');
	assert.equal(metadata.host_key, 'viv-blondish');
	assert.equal(metadata.client_slug, 'blondish');

	const approvedException = metadata.approved_exception as Record<string, unknown>;
	assert.equal(approvedException.approved_by, 'mj');
	assert.equal(approvedException.graduation_target, 'policy_os_trial');
	assert.equal(approvedException.allowed_scope, 'interactive_named_lane:viv-blondish');
});

test('extractRuntimeActivePolicies only returns runtime-active policies from the generated manifest', () => {
	const policies = extractRuntimeActivePolicies({
		policies: [
			{
				manifest: {
					policyId: 'policy.hub-route-authorization.v1',
					status: 'active',
					commitSha: 'abc123',
					description: 'Hub route auth',
				},
			},
			{
				manifest: {
					policyId: 'policy.partner-auth-governance.v1',
					status: 'draft',
					commitSha: 'def456',
					description: 'Partner auth governance',
				},
			},
		],
	});

	assert.deepEqual(policies, [
		{
			policy_id: 'policy.hub-route-authorization.v1',
			status: 'active',
			commit_sha: 'abc123',
			description: 'Hub route auth',
		},
	]);
});

test('meetsRequiredState enforces the correct readiness threshold', () => {
	const result: PreflightResult = {
		lane: 'viv-blondish',
		client: 'blondish',
		deployment_mode: 'dedicated',
		worker_name: 'cs-hub-viv-blondish',
		hub_url: 'https://viv-blondish.mcp.createsomething.agency/mcp',
		health_url: 'https://viv-blondish.mcp.createsomething.agency/health',
		infrastructure_ready: true,
		customer_ready: false,
		search_ready: false,
		required_state: 'customer',
		runtime_active_policies: [],
		checks: [],
	};

	assert.equal(meetsRequiredState(result, 'infrastructure'), true);
	assert.equal(meetsRequiredState(result, 'customer'), false);
	assert.equal(meetsRequiredState(result, 'search'), false);
});
