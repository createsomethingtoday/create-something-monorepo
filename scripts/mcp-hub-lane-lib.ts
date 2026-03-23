import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getBooleanArg, getStringArg, parseCliArgs, printJson, resolveInput } from './partner-cli-utils';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const DEFAULT_CATALOG_PATH = path.join(REPO_ROOT, 'config/mcp-hub/named-lanes.v1.json');
const DEFAULT_DISCOVERY_PACKS_PATH = path.join(REPO_ROOT, 'config/mcp-hub/discovery-packs.json');
const DEFAULT_POLICY_MANIFEST_PATH = path.join(REPO_ROOT, 'docs/policies/generated/mcp-authz-manifests.v1.json');
const DEFAULT_INFISICAL_ENV = 'prod';
const DEFAULT_INFISICAL_PATH = '/';
const DEFAULT_PARTNER_ACTOR = 'mcp_hub_lane';

export type CheckStatus = 'pass' | 'fail' | 'warn' | 'skip';
export type ReadyState = 'infrastructure' | 'customer' | 'search';

export interface LaneCatalogDefaults {
	partnerKey: string;
	partnerApiBaseUrl: string;
	hubDomainSuffix: string;
	hubRuntimeDir: string;
	hubRuntimeConfig: string;
	sessionResolveUrl: string;
	connectTimeoutMs: number;
	listToolsTimeoutMs: number;
	connectConcurrency: number;
}

export interface SearchProviderLiveProbeSpec {
	type: 'hub_execute_proxy_tool';
	proxyToolName: string;
	args?: Record<string, unknown>;
}

export interface SearchProviderSpec {
	id: string;
	toolkit: string;
	serverName: string;
	authConfigRequired: boolean;
	liveProbe?: SearchProviderLiveProbeSpec;
}

export interface ApprovedExceptionSpec {
	approvedBy?: string;
	approvedAt?: string;
	reason?: string;
	allowedScope?: string;
	reviewBy?: string;
	graduationTarget?: string;
}

export interface LaneSpec {
	clientSlug: string;
	displayName: string;
	deploymentMode: 'dedicated' | 'shared';
	identityMode: 'compat' | 'session_required';
	fallbackAccountId: string;
	primaryService: string;
	enabledServers: string[];
	disabledServers?: string[];
	requiredGlobalServers?: string[];
	requiredDiscoveryServers?: string[];
	discoveryMode: 'compact' | 'full';
	discoveryPack?: string;
	discoveryDefaultServers: string[];
	toolkitProfile: string[];
	allowedToolPrefixes?: string[];
	searchProviders?: SearchProviderSpec[];
	approvedException?: ApprovedExceptionSpec;
	sharedHubUrl?: string;
	sharedHubWorkerName?: string;
	hubApiTokenEnv?: string;
	metadata?: Record<string, unknown>;
}

export interface LaneCatalog {
	version: number;
	defaults: LaneCatalogDefaults;
	lanes: Record<string, LaneSpec>;
}

export interface LaneContext {
	laneSlug: string;
	laneKey: string;
	workerName: string;
	domain: string;
	hubUrl: string;
	healthUrl: string;
	hostKey: string;
}

export interface RuntimeActivePolicy {
	policy_id: string;
	status: string;
	commit_sha: string | null;
	description: string | null;
}

export interface PreflightCheck {
	id: string;
	status: CheckStatus;
	reason_code: string;
	message: string;
	details?: Record<string, unknown>;
}

export interface LaneStatusResponse {
	client: {
		id: string;
		slug: string;
		display_name: string | null;
		workspace_account_id: string | null;
		identity_account_id: string | null;
		identity_user_id: string | null;
		identity_tenant_id: string | null;
		owner_email: string | null;
		status: string;
		required_toolkits: string[];
		metadata: Record<string, unknown>;
	};
	lane: {
		id: string;
		slug: string;
		display_name: string | null;
		identity_user_id: string | null;
		owner_email: string | null;
		hub_url: string | null;
		host_key: string | null;
		status: string;
		toolkit_profile: string[];
		allowed_tool_prefixes: string[];
		metadata: Record<string, unknown>;
	};
	active_consent: {
		present: boolean;
		id: string | null;
		granted_at: string | null;
		expires_at: string | null;
	};
	readiness: {
		client_status_issuable: boolean;
		lane_status_issuable: boolean;
		identity_account_ready: boolean;
		identity_tenant_ready: boolean;
		lane_identity_subject_ready: boolean;
		consent_ready: boolean;
		strict_session_ready: boolean;
		managed_bearer_ready: boolean;
	};
	checked_at: string;
}

export interface ToolkitStatusResponse {
	client: {
		id: string;
		slug: string;
		display_name: string | null;
		workspace_account_id: string | null;
		identity_account_id: string | null;
		required_toolkits: string[];
		metadata: Record<string, unknown>;
	};
	toolkits: Array<{
		toolkit: string;
		required: boolean;
		auth_config_id: string | null;
		connected: boolean;
		connection_status: string;
		connected_account_ids: string[];
	}>;
	checked_at: string;
	policy?: Record<string, unknown>;
}

export interface PreflightResult {
	lane: string;
	client: string;
	deployment_mode: LaneSpec['deploymentMode'];
	worker_name: string;
	hub_url: string;
	health_url: string;
	infrastructure_ready: boolean;
	customer_ready: boolean;
	search_ready: boolean;
	required_state: ReadyState;
	runtime_active_policies: RuntimeActivePolicy[];
	checks: PreflightCheck[];
}

export interface PreflightOptions {
	laneSlug: string;
	clientSlug?: string;
	catalogPath?: string;
	discoveryPacksPath?: string;
	policyManifestPath?: string;
	partnerApiBaseUrl?: string;
	partnerAdminKey?: string;
	partnerActor?: string;
	allowInfisical?: boolean;
	allowHubChecks?: boolean;
	probeConnectLinks?: boolean;
	sessionToken?: string;
	requiredState?: ReadyState;
}

export interface DeployOptions {
	laneSlug: string;
	clientSlug?: string;
	catalogPath?: string;
	partnerApiBaseUrl?: string;
	partnerAdminKey?: string;
	partnerActor?: string;
	allowInfisical?: boolean;
	probeConnectLinks?: boolean;
	requireCustomerReady?: boolean;
	dryRun?: boolean;
}

export interface SecretResolutionOptions {
	allowInfisical?: boolean;
	infisicalEnv?: string;
	infisicalPath?: string;
	infisicalProjectId?: string | null;
	infisicalIncludeImports?: boolean;
}

export interface SecretResolutionResult {
	env_name: string;
	value: string | null;
	source: 'env' | 'infisical' | 'missing';
}

interface HubRpcResponse {
	error?: {
		code?: number;
		message?: string;
		data?: unknown;
	};
	result?: {
		isError?: boolean;
		content?: unknown;
		structuredContent?: Record<string, unknown>;
		[key: string]: unknown;
	};
}

interface HubHealthResponse {
	auth_required?: boolean;
	enabled_servers?: string[];
	connected_servers?: unknown[];
	connected_servers_count?: number;
	[key: string]: unknown;
}

interface WorkerSecretSpec {
	env_name: string;
	worker_secret_name: string;
	required: boolean;
	description: string;
}

export function parseLaneCliArgs(argv: string[]) {
	const args = parseCliArgs(argv);
	return {
		args,
		laneSlug: requiredCliValue(args, 'lane', 'MCP_HUB_LANE'),
		clientSlug: getStringArg(args, 'client') ?? process.env.MCP_HUB_CLIENT?.trim(),
		catalogPath: resolveInput(args, 'catalog', 'MCP_HUB_LANE_CATALOG_PATH', DEFAULT_CATALOG_PATH),
		partnerApiBaseUrl: resolveInput(args, 'base-url', 'PARTNER_API_BASE_URL'),
		partnerAdminKey:
			getStringArg(args, 'admin-key') ??
			process.env.PARTNER_ADMIN_KEY?.trim() ??
			process.env.PARTNER_PORTAL_ADMIN_KEY?.trim(),
		partnerActor:
			resolveInput(args, 'actor', 'PARTNER_ACTOR', DEFAULT_PARTNER_ACTOR) ??
			DEFAULT_PARTNER_ACTOR,
		allowInfisical: !getBooleanArg(args, 'skip-infisical', false),
		allowHubChecks: !getBooleanArg(args, 'skip-hub-checks', false),
		probeConnectLinks: !getBooleanArg(args, 'skip-connect-link-probe', false),
		requiredState: parseRequiredState(getStringArg(args, 'require-state')),
		dryRun: getBooleanArg(args, 'dry-run', false),
	};
}

export async function loadLaneCatalog(catalogPath = DEFAULT_CATALOG_PATH): Promise<LaneCatalog> {
	const raw = await readFile(catalogPath, 'utf8');
	const parsed = JSON.parse(raw) as LaneCatalog;
	if (!parsed || typeof parsed !== 'object' || parsed.version !== 1) {
		throw new Error(`Invalid lane catalog at ${catalogPath}`);
	}
	if (!parsed.defaults || typeof parsed.defaults !== 'object') {
		throw new Error(`Lane catalog is missing defaults at ${catalogPath}`);
	}
	if (!parsed.lanes || typeof parsed.lanes !== 'object') {
		throw new Error(`Lane catalog is missing lanes at ${catalogPath}`);
	}
	return parsed;
}

export function getLaneSpec(catalog: LaneCatalog, laneSlug: string): LaneSpec {
	const spec = catalog.lanes[laneSlug];
	if (!spec) {
		throw new Error(`Unknown lane "${laneSlug}" in the configured lane catalog.`);
	}
	return spec;
}

export function normalizeLaneKey(laneSlug: string): string {
	return laneSlug.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toUpperCase();
}

export function buildLaneContext(
	defaults: LaneCatalogDefaults,
	laneSlug: string,
	spec?: LaneSpec,
): LaneContext {
	const normalizedLaneSlug = laneSlug.trim().toLowerCase();
	const fallbackDomain = `${normalizedLaneSlug}.${defaults.hubDomainSuffix}`;
	const fallbackHubUrl = `https://${fallbackDomain}/mcp`;
	const hubUrl =
		spec?.deploymentMode === 'shared' && spec.sharedHubUrl?.trim()
			? spec.sharedHubUrl.trim()
			: fallbackHubUrl;
	const hubOrigin = new URL(hubUrl);
	const domain = hubOrigin.host;
	const healthUrl = `${hubOrigin.origin}/health`;
	return {
		laneSlug: normalizedLaneSlug,
		laneKey: normalizeLaneKey(normalizedLaneSlug),
		workerName:
			spec?.deploymentMode === 'shared' && spec.sharedHubWorkerName?.trim()
				? spec.sharedHubWorkerName.trim()
				: `cs-hub-${normalizedLaneSlug}`,
		domain,
		hubUrl,
		healthUrl,
		hostKey: normalizedLaneSlug,
	};
}

export function buildLaneInitPayload(
	spec: LaneSpec,
	context: LaneContext,
	clientSlug: string,
): Record<string, unknown> {
	const approvedException = spec.approvedException ?? {};
	return {
		display_name: spec.displayName,
		toolkit_profile: [...new Set(spec.toolkitProfile)],
		allowed_tool_prefixes: [...new Set(spec.allowedToolPrefixes ?? [])],
		metadata: {
			deployment_mode: spec.deploymentMode,
			identity_mode: spec.identityMode,
			primary_service: spec.primaryService,
			enabled_servers: [...new Set(spec.enabledServers)],
			disabled_servers: [...new Set(spec.disabledServers ?? [])],
			discovery_pack: spec.discoveryPack ?? null,
			discovery_default_servers: [...new Set(spec.discoveryDefaultServers)],
			search_providers: (spec.searchProviders ?? []).map((provider) => ({
				id: provider.id,
				toolkit: provider.toolkit,
				server_name: provider.serverName,
				auth_config_required: provider.authConfigRequired,
			})),
			approved_exception: {
				approved_by: approvedException.approvedBy ?? 'mj',
				approved_at: approvedException.approvedAt ?? new Date().toISOString(),
				reason:
					approvedException.reason ??
					`Transparent named-lane MCP-only pilot for ${spec.displayName}`,
				allowed_scope:
					approvedException.allowedScope ?? `interactive_named_lane:${context.laneSlug}`,
				expiration_or_review_date:
					approvedException.reviewBy ??
					new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
				graduation_target: approvedException.graduationTarget ?? null,
			},
			hub_worker_name: context.workerName,
			hub_url: context.hubUrl,
			host_key: context.hostKey,
			client_slug: clientSlug,
			source: 'mcp:hub:lane:deploy',
			...(spec.metadata ?? {}),
		},
	};
}

export function buildDedicatedDeployVars(
	spec: LaneSpec,
	context: LaneContext,
	defaults: LaneCatalogDefaults,
): Record<string, string> {
	const requiredGlobalServers = spec.requiredGlobalServers ?? [];
	const requiredDiscoveryServers = spec.requiredDiscoveryServers ?? [];
	return {
		HUB_INSTANCE_ID: context.workerName,
		HUB_ACCOUNT_ID: spec.fallbackAccountId,
		HUB_ENABLED_BUNDLES: '[]',
		HUB_ENABLED_SERVERS: toCsv(spec.enabledServers, '[]'),
		HUB_DISABLED_SERVERS: toCsv(spec.disabledServers ?? [], '[]'),
		HUB_REQUIRED_GLOBAL_SERVERS: toCsv(requiredGlobalServers, ''),
		HUB_REQUIRED_DISCOVERY_SERVERS: toCsv(requiredDiscoveryServers, ''),
		HUB_DISCOVERY_MODE: spec.discoveryMode,
		HUB_DISCOVERY_DEFAULT_SERVERS: toCsv(spec.discoveryDefaultServers, '[]'),
		HUB_DISCOVERY_SHARED_PACK: spec.discoveryPack?.trim() ?? '',
		HUB_IDENTITY_MODE: spec.identityMode,
		HUB_COMPAT_TRUST_CLIENT_ACCOUNT_HEADERS: 'false',
		HUB_SESSION_RESOLVE_URL: defaults.sessionResolveUrl,
		HUB_CONNECT_TIMEOUT_MS: String(defaults.connectTimeoutMs),
		HUB_LIST_TOOLS_TIMEOUT_MS: String(defaults.listToolsTimeoutMs),
		HUB_CONNECT_CONCURRENCY: String(defaults.connectConcurrency),
	};
}

export function extractRuntimeActivePolicies(payload: {
	policies?: Array<{
		manifest?: {
			policyId?: string;
			status?: string;
			commitSha?: string;
			description?: string;
		};
	}>;
}): RuntimeActivePolicy[] {
	return (payload.policies ?? [])
		.map((entry) => entry.manifest)
		.filter(
			(
				manifest,
			): manifest is {
				policyId: string;
				status?: string;
				commitSha?: string;
				description?: string;
			} => Boolean(manifest?.policyId),
		)
		.filter((manifest) => manifest.status === 'active')
		.map((manifest) => ({
			policy_id: manifest.policyId!,
			status: manifest.status!,
			commit_sha: manifest.commitSha ?? null,
			description: manifest.description ?? null,
		}));
}

export async function readRuntimeActivePolicies(
	policyManifestPath = DEFAULT_POLICY_MANIFEST_PATH,
): Promise<RuntimeActivePolicy[]> {
	const raw = await readFile(policyManifestPath, 'utf8');
	const parsed = JSON.parse(raw) as { policies?: unknown[] };
	return extractRuntimeActivePolicies(parsed as Parameters<typeof extractRuntimeActivePolicies>[0]);
}

export async function loadDiscoveryPackNames(
	discoveryPacksPath = DEFAULT_DISCOVERY_PACKS_PATH,
): Promise<Set<string>> {
	const raw = await readFile(discoveryPacksPath, 'utf8');
	const parsed = JSON.parse(raw) as { packs?: Record<string, unknown> | Array<{ name?: string }> };
	if (Array.isArray(parsed.packs)) {
		return new Set(
			parsed.packs
				.map((pack) => (typeof pack.name === 'string' ? pack.name.trim() : ''))
				.filter(Boolean),
		);
	}
	return new Set(
		Object.keys(parsed.packs ?? {})
			.map((name) => name.trim())
			.filter(Boolean),
	);
}

export async function resolveSecretValue(
	envName: string,
	options: SecretResolutionOptions = {},
): Promise<SecretResolutionResult> {
	const envValue = process.env[envName]?.trim();
	if (envValue) {
		return {
			env_name: envName,
			value: envValue,
			source: 'env',
		};
	}

	if (options.allowInfisical === false) {
		return {
			env_name: envName,
			value: null,
			source: 'missing',
		};
	}

	try {
		const args = [
			'secrets',
			'get',
			envName,
			'--plain',
			'--silent',
			`--env=${options.infisicalEnv ?? process.env.INFISICAL_ENV?.trim() ?? DEFAULT_INFISICAL_ENV}`,
			`--path=${options.infisicalPath ?? process.env.INFISICAL_PATH?.trim() ?? DEFAULT_INFISICAL_PATH}`,
			`--include-imports=${
				options.infisicalIncludeImports ?? parseBooleanish(process.env.INFISICAL_INCLUDE_IMPORTS, true)
			}`,
		];
		const projectId = options.infisicalProjectId ?? process.env.INFISICAL_PROJECT_ID?.trim();
		if (projectId) {
			args.push(`--projectId=${projectId}`);
		}
		const { stdout } = await runCommand('infisical', args, { captureOutput: true });
		const value = stdout.trim();
		return {
			env_name: envName,
			value: value || null,
			source: value ? 'infisical' : 'missing',
		};
	} catch (error) {
		if (isMissingCommandError(error)) {
			return {
				env_name: envName,
				value: null,
				source: 'missing',
			};
		}
		return {
			env_name: envName,
			value: null,
			source: 'missing',
		};
	}
}

export function listWorkerSecrets(spec: LaneSpec, laneKey: string): WorkerSecretSpec[] {
	if (spec.deploymentMode === 'shared') {
		return spec.hubApiTokenEnv
			? [
					{
						env_name: spec.hubApiTokenEnv,
						worker_secret_name: 'HUB_API_TOKEN',
						required: false,
						description: 'shared hub API token',
					},
				]
			: [];
	}
	return [
		{
			env_name: `CS_HUB_${laneKey}_API_TOKEN`,
			worker_secret_name: 'HUB_API_TOKEN',
			required: true,
			description: 'worker API token',
		},
		{
			env_name: 'HUB_SESSION_RESOLVE_TOKEN',
			worker_secret_name: 'HUB_SESSION_RESOLVE_TOKEN',
			required: true,
			description: 'identity session resolver token',
		},
		{
			env_name: 'BRAINTRUST_API_KEY',
			worker_secret_name: 'BRAINTRUST_API_KEY',
			required: true,
			description: 'Braintrust tracing API key',
		},
		{
			env_name: 'BRAINTRUST_PROJECT_ID',
			worker_secret_name: 'BRAINTRUST_PROJECT_ID',
			required: true,
			description: 'Braintrust tracing project id',
		},
	];
}

export async function inspectWorkerSecrets(
	spec: LaneSpec,
	laneKey: string,
	options: SecretResolutionOptions = {},
): Promise<Array<WorkerSecretSpec & SecretResolutionResult>> {
	const secrets = listWorkerSecrets(spec, laneKey);
	return Promise.all(
		secrets.map(async (secret) => ({
			...secret,
			...(await resolveSecretValue(secret.env_name, options)),
		})),
	);
}

export async function syncLaneWorkerSecrets(
	spec: LaneSpec,
	defaults: LaneCatalogDefaults,
	context: LaneContext,
	options: SecretResolutionOptions & { dryRun?: boolean } = {},
): Promise<Array<WorkerSecretSpec & SecretResolutionResult>> {
	if (spec.deploymentMode !== 'dedicated') {
		return [];
	}
	const secrets = await inspectWorkerSecrets(spec, context.laneKey, options);
	const missing = secrets.filter((secret) => secret.required && !secret.value);
	if (missing.length > 0) {
		throw new Error(
			`Missing required worker secrets for ${context.workerName}: ${missing.map((secret) => secret.env_name).join(', ')}`,
		);
	}

	const runtimeDir = resolveRepoPath(defaults.hubRuntimeDir);
	const runtimeConfig = path.basename(resolveRepoPath(defaults.hubRuntimeConfig));

	for (const secret of secrets) {
		if (!secret.value) continue;
		if (options.dryRun) {
			console.log(
				`[dry-run] pnpm exec wrangler secret put ${secret.worker_secret_name} --name ${context.workerName} --config ${runtimeConfig}`,
			);
			continue;
		}
		await runCommand(
			'pnpm',
			[
				'exec',
				'wrangler',
				'secret',
				'put',
				secret.worker_secret_name,
				'--name',
				context.workerName,
				'--config',
				runtimeConfig,
			],
			{
				cwd: runtimeDir,
				input: `${secret.value}\n`,
				echoOutput: true,
			},
		);
	}

	return secrets;
}

export async function deployDedicatedLaneWorker(
	spec: LaneSpec,
	context: LaneContext,
	defaults: LaneCatalogDefaults,
	options: { dryRun?: boolean } = {},
): Promise<void> {
	const runtimeDir = resolveRepoPath(defaults.hubRuntimeDir);
	const runtimeConfig = path.basename(resolveRepoPath(defaults.hubRuntimeConfig));
	const deployVars = buildDedicatedDeployVars(spec, context, defaults);
	const args = ['exec', 'wrangler', 'deploy', '--config', runtimeConfig, '--name', context.workerName];
	if (context.domain) {
		args.push('--domain', context.domain);
	}
	for (const [key, value] of Object.entries(deployVars)) {
		args.push('--var', `${key}:${value}`);
	}
	args.push('--keep-vars');

	if (options.dryRun) {
		console.log(`[dry-run] pnpm ${args.join(' ')}`);
		return;
	}

	await runCommand('pnpm', args, {
		cwd: runtimeDir,
		echoOutput: true,
		env: {
			WRANGLER_LOG_PATH: process.env.WRANGLER_LOG_PATH ?? '/tmp/wrangler-logs',
		},
	});
}

export async function initializePartnerLane(
	baseUrl: string,
	partnerKey: string,
	partnerAdminKey: string,
	actor: string,
	clientSlug: string,
	context: LaneContext,
	payload: Record<string, unknown>,
	options: { dryRun?: boolean } = {},
): Promise<Record<string, unknown> | null> {
	const url = buildPartnerLaneInitUrl(baseUrl, partnerKey, clientSlug, context.laneSlug);
	if (options.dryRun) {
		console.log(`[dry-run] POST ${url}`);
		printJson(payload);
		return null;
	}
	return requestJson<Record<string, unknown>>(url, {
		method: 'POST',
		headers: buildPartnerHeaders(partnerAdminKey, actor),
		body: JSON.stringify(payload),
	});
}

export async function normalizeLaneHubState(
	spec: LaneSpec,
	context: LaneContext,
	hubToken: string,
	options: { dryRun?: boolean; sessionToken?: string } = {},
): Promise<void> {
	if (options.dryRun) {
		console.log(`[dry-run] normalize hub state for ${context.workerName}`);
		return;
	}
	await hubCall(context.hubUrl, hubToken, 'hub_update_state', {
		setBundles: [],
		setServers: spec.enabledServers,
	}, {
		sessionToken: options.sessionToken,
	});
	await hubCall(
		context.hubUrl,
		hubToken,
		'hub_set_discovery',
		{ reset: true },
		{ sessionToken: options.sessionToken },
	);
}

export async function runLanePreflight(options: PreflightOptions): Promise<PreflightResult> {
	const catalog = await loadLaneCatalog(options.catalogPath);
	const laneSlug = options.laneSlug.trim().toLowerCase();
	const spec = getLaneSpec(catalog, laneSlug);
	const clientSlug = (options.clientSlug ?? spec.clientSlug).trim().toLowerCase();
	const partnerApiBaseUrl = sanitizeBaseUrl(options.partnerApiBaseUrl ?? catalog.defaults.partnerApiBaseUrl);
	const actor = options.partnerActor?.trim() || DEFAULT_PARTNER_ACTOR;
	const allowHubChecks = options.allowHubChecks !== false;
	const probeConnectLinks = options.probeConnectLinks !== false;
	const requiredState = options.requiredState ?? 'customer';
	const context = buildLaneContext(catalog.defaults, laneSlug, spec);
	const checks: PreflightCheck[] = [];
	const runtimeActivePolicies = await readRuntimeActivePolicies(options.policyManifestPath ?? DEFAULT_POLICY_MANIFEST_PATH);
	const discoveryPackNames = await loadDiscoveryPackNames(
		options.discoveryPacksPath ?? DEFAULT_DISCOVERY_PACKS_PATH,
	);
	const partnerKey = catalog.defaults.partnerKey;
	const secretResolutionOptions: SecretResolutionOptions = {
		allowInfisical: options.allowInfisical,
	};
	const workerSecrets = await inspectWorkerSecrets(spec, context.laneKey, secretResolutionOptions);
	const hubToken = workerSecrets.find((secret) => secret.worker_secret_name === 'HUB_API_TOKEN')?.value ?? null;

	addCheck(
		checks,
		'catalog_lane_exists',
		'pass',
		'lane_spec_loaded',
		`Loaded lane spec for ${laneSlug}.`,
	);
	addCheck(
		checks,
		'primary_service_in_enabled_servers',
		spec.enabledServers.includes(spec.primaryService) ? 'pass' : 'fail',
		spec.enabledServers.includes(spec.primaryService) ? 'primary_service_enabled' : 'primary_service_missing',
		spec.enabledServers.includes(spec.primaryService)
			? `Primary service ${spec.primaryService} is in the enabled server set.`
			: `Primary service ${spec.primaryService} is missing from enabled servers.`,
	);
	addCheck(
		checks,
		'discovery_pack_declared',
		spec.discoveryPack
			? discoveryPackNames.has(spec.discoveryPack)
				? 'pass'
				: 'fail'
			: 'warn',
		spec.discoveryPack
			? discoveryPackNames.has(spec.discoveryPack)
				? 'discovery_pack_present'
				: 'discovery_pack_missing'
			: 'discovery_pack_not_declared',
		spec.discoveryPack
			? discoveryPackNames.has(spec.discoveryPack)
				? `Discovery pack ${spec.discoveryPack} exists in the managed pack catalog.`
				: `Discovery pack ${spec.discoveryPack} is missing from config/mcp-hub/discovery-packs.json.`
			: 'Lane spec does not declare a managed discovery pack.',
	);
	addCheck(
		checks,
		'runtime_active_policies',
		runtimeActivePolicies.length > 0 ? 'pass' : 'warn',
		runtimeActivePolicies.length > 0 ? 'runtime_policies_loaded' : 'runtime_policies_missing',
		runtimeActivePolicies.length > 0
			? `Loaded ${runtimeActivePolicies.length} runtime-active authz policies from the generated manifest bundle.`
			: 'No runtime-active authz policies were found in the generated manifest bundle.',
		{
			policies: runtimeActivePolicies.map((policy) => policy.policy_id),
		},
	);

	for (const secret of workerSecrets) {
		addCheck(
			checks,
			`secret_${secret.worker_secret_name.toLowerCase()}`,
			secret.value ? 'pass' : secret.required ? 'fail' : 'warn',
			secret.value ? 'secret_present' : 'secret_missing',
			secret.value
				? `${secret.worker_secret_name} is available from ${secret.source}.`
				: `${secret.worker_secret_name} is missing (${secret.env_name}).`,
			{
				env_name: secret.env_name,
				source: secret.source,
			},
		);
	}

	const partnerAdminKey = options.partnerAdminKey?.trim() ?? null;
	if (!partnerAdminKey) {
		addCheck(
			checks,
			'partner_admin_key',
			'fail',
			'partner_admin_key_missing',
			'Partner admin key is required for lane status and provider readiness checks.',
		);
	} else {
		addCheck(
			checks,
			'partner_admin_key',
			'pass',
			'partner_admin_key_present',
			'Partner admin key is available for control-plane readiness checks.',
		);
	}

	let laneStatus: LaneStatusResponse | null = null;
	if (partnerAdminKey) {
		try {
			laneStatus = await requestJson<LaneStatusResponse>(
				buildPartnerLaneStatusUrl(partnerApiBaseUrl, partnerKey, clientSlug, context.laneSlug),
				{
					method: 'GET',
					headers: buildPartnerHeaders(partnerAdminKey, actor),
				},
			);
			addCheck(
				checks,
				'lane_record',
				'pass',
				'lane_record_present',
				`Named access lane ${context.laneSlug} exists in the partner control plane.`,
			);
			addReadinessChecks(checks, laneStatus);
		} catch (error) {
			const httpError = asHttpError(error);
			if (httpError?.status === 404) {
				addCheck(
					checks,
					'lane_record',
					'fail',
					'lane_record_missing',
					`Named access lane ${context.laneSlug} does not exist in the partner control plane.`,
				);
			} else {
				addCheck(
					checks,
					'lane_record',
					'fail',
					'partner_lane_status_unavailable',
					httpError?.message ?? 'Partner lane status request failed.',
				);
			}
		}
	}

	let toolkitStatus: ToolkitStatusResponse | null = null;
	if (partnerAdminKey) {
		try {
			toolkitStatus = await requestJson<ToolkitStatusResponse>(
				buildPartnerToolkitStatusUrl(partnerApiBaseUrl, partnerKey, clientSlug),
				{
					method: 'GET',
					headers: buildPartnerHeaders(partnerAdminKey, actor),
				},
			);
			addCheck(
				checks,
				'toolkit_status',
				'pass',
				'toolkit_status_loaded',
				'Partner toolkit status loaded for provider readiness checks.',
			);
		} catch (error) {
			const httpError = asHttpError(error);
			addCheck(
				checks,
				'toolkit_status',
				'fail',
				httpError?.status === 403 ? 'toolkit_status_policy_blocked' : 'toolkit_status_unavailable',
				httpError?.message ?? 'Unable to load partner toolkit status.',
			);
		}
	}

	if (laneStatus) {
		const approvedException = asObject(laneStatus.lane.metadata.approved_exception);
		addCheck(
			checks,
			'approved_exception',
			approvedException ? 'pass' : 'fail',
			approvedException ? 'approved_exception_present' : 'approved_exception_missing',
			approvedException
				? 'Lane metadata includes an approved exception record for the named-lane MCP-only pilot.'
				: 'Lane metadata is missing the approved exception record required for widened mcp_only scope.',
		);
	}

	const providerChecks = await evaluateProviderChecks({
		checks,
		spec,
		clientSlug,
		context,
		partnerKey,
		toolkitStatus,
		partnerApiBaseUrl,
		partnerAdminKey,
		actor,
		probeConnectLinks,
		allowHubChecks,
		hubToken,
		sessionToken: options.sessionToken,
	});

	if (allowHubChecks) {
		await evaluateHubChecks({
			checks,
			spec,
			context,
			hubToken,
			sessionToken: options.sessionToken,
		});
	} else {
		addCheck(
			checks,
			'hub_checks',
			'skip',
			'hub_checks_skipped',
			'Hub health and discovery checks were skipped by CLI flag.',
		);
	}

	const infrastructureReady = checks
		.filter((check) => isInfrastructureBlockingCheck(spec, check.id))
		.every((check) => check.status === 'pass');
	const searchReady =
		providerChecks.length === 0 ? true : providerChecks.every((check) => check.status === 'pass');
	const customerReady =
		infrastructureReady &&
		Boolean(laneStatus?.readiness.managed_bearer_ready) &&
		searchReady &&
		checks.every((check) =>
			CUSTOMER_BLOCKING_CHECKS.has(check.id) ? check.status === 'pass' : true,
		);

	return {
		lane: context.laneSlug,
		client: clientSlug,
		deployment_mode: spec.deploymentMode,
		worker_name: context.workerName,
		hub_url: context.hubUrl,
		health_url: context.healthUrl,
		infrastructure_ready: infrastructureReady,
		customer_ready: customerReady,
		search_ready: searchReady,
		required_state: requiredState,
		runtime_active_policies: runtimeActivePolicies,
		checks,
	};
}

export function printPreflightSummary(result: PreflightResult): void {
	console.log(
		`lane=${result.lane} client=${result.client} infra=${result.infrastructure_ready} customer=${result.customer_ready} search=${result.search_ready}`,
	);
	const failures = result.checks.filter((check) => check.status === 'fail');
	if (failures.length === 0) {
		console.log('No failing checks.');
		return;
	}
	for (const failure of failures) {
		console.log(`- ${failure.id}: ${failure.reason_code} (${failure.message})`);
	}
}

export function meetsRequiredState(result: PreflightResult, requiredState: ReadyState): boolean {
	switch (requiredState) {
		case 'infrastructure':
			return result.infrastructure_ready;
		case 'search':
			return result.search_ready;
		case 'customer':
		default:
			return result.customer_ready;
	}
}

export async function requestJson<TResponse>(
	url: string,
	init: RequestInit,
): Promise<TResponse> {
	const response = await fetch(url, init);
	const payload = await response.json().catch(() => null);
	if (!response.ok) {
		const message =
			payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
				? payload.message
				: `Request failed (${response.status})`;
		throw new HttpRequestError(response.status, message, payload);
	}
	return payload as TResponse;
}

export async function hubCall(
	hubUrl: string,
	token: string,
	name: string,
	args: Record<string, unknown>,
	options: { sessionToken?: string; timeoutMs?: number } = {},
): Promise<HubRpcResponse> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 20_000);
	try {
		const response = await fetch(hubUrl, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
				Accept: 'application/json, text/event-stream',
				...(options.sessionToken ? { 'X-MCP-Session-Token': options.sessionToken } : {}),
			},
			body: JSON.stringify({
				jsonrpc: '2.0',
				id: `${Date.now()}`,
				method: 'tools/call',
				params: {
					name,
					arguments: args,
				},
			}),
			signal: controller.signal,
		});
		const payload = (await response.json().catch(() => null)) as HubRpcResponse | null;
		if (!response.ok) {
			throw new HttpRequestError(
				response.status,
				`Hub call failed for ${name}`,
				payload ?? undefined,
			);
		}
		if (!payload) {
			throw new Error(`Hub call for ${name} returned no JSON payload.`);
		}
		if (payload.error) {
			throw new Error(payload.error.message || `Hub JSON-RPC error calling ${name}`);
		}
		if (payload.result?.isError) {
			throw new Error(`Hub tool ${name} returned isError=true.`);
		}
		return payload;
	} finally {
		clearTimeout(timeout);
	}
}

export function extractActiveDiscoveryServiceNames(payload: HubRpcResponse): string[] {
	const services = asArray(payload.result?.structuredContent?.services ?? payload.result?.services);
	return services
		.filter((service): service is Record<string, unknown> => Boolean(service && typeof service === 'object'))
		.filter((service) => service.activeInDiscovery !== false)
		.flatMap((service) => (typeof service.name === 'string' ? [service.name] : []));
}

export function extractProxyToolNames(payload: HubRpcResponse): string[] {
	const results: string[] = [];
	visitObject(payload, (value) => {
		if (value && typeof value === 'object' && 'proxyToolName' in value && typeof value.proxyToolName === 'string') {
			results.push(value.proxyToolName);
		}
	});
	return [...new Set(results)];
}

async function searchHubProxyToolsForServer(
	hubUrl: string,
	token: string,
	serverName: string,
	options: { sessionToken?: string; limit?: number; query?: string; timeoutMs?: number } = {},
): Promise<string[]> {
	const payload = await hubCall(
		hubUrl,
		token,
		'hub_search_proxy_tools',
		{
			serverName,
			limit: options.limit ?? 50,
			...(options.query ? { query: options.query } : {}),
		},
		{
			sessionToken: options.sessionToken,
			timeoutMs: options.timeoutMs ?? 20_000,
		},
	);
	return extractProxyToolNames(payload);
}

export function resolveRepoPath(relativeOrAbsolutePath: string): string {
	return path.isAbsolute(relativeOrAbsolutePath)
		? relativeOrAbsolutePath
		: path.join(REPO_ROOT, relativeOrAbsolutePath);
}

export async function runCommand(
	command: string,
	args: string[],
	options: {
		cwd?: string;
		env?: NodeJS.ProcessEnv;
		input?: string;
		captureOutput?: boolean;
		echoOutput?: boolean;
	} = {},
): Promise<{ stdout: string; stderr: string }> {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd: options.cwd,
			env: { ...process.env, ...options.env },
			stdio: 'pipe',
		});

		let stdout = '';
		let stderr = '';

		child.stdout.on('data', (chunk) => {
			const value = chunk.toString();
			stdout += value;
			if (options.echoOutput) {
				process.stdout.write(value);
			}
		});
		child.stderr.on('data', (chunk) => {
			const value = chunk.toString();
			stderr += value;
			if (options.echoOutput) {
				process.stderr.write(value);
			}
		});

		child.on('error', (error) => {
			reject(error);
		});
		child.on('close', (code) => {
			if (code === 0) {
				resolve({
					stdout: options.captureOutput ? stdout : stdout.trim(),
					stderr: options.captureOutput ? stderr : stderr.trim(),
				});
				return;
			}
			reject(
				new Error(
					`${command} ${args.join(' ')} failed with exit code ${code}${stderr ? `: ${stderr.trim()}` : ''}`,
				),
			);
		});

		if (options.input) {
			child.stdin.write(options.input);
		}
		child.stdin.end();
	});
}

export class HttpRequestError extends Error {
	status: number;
	payload?: unknown;

	constructor(status: number, message: string, payload?: unknown) {
		super(message);
		this.name = 'HttpRequestError';
		this.status = status;
		this.payload = payload;
	}
}

function addReadinessChecks(checks: PreflightCheck[], laneStatus: LaneStatusResponse): void {
	addCheck(
		checks,
		'client_status_issuable',
		laneStatus.readiness.client_status_issuable ? 'pass' : 'fail',
		laneStatus.readiness.client_status_issuable ? 'client_status_issuable' : 'client_status_blocked',
		laneStatus.readiness.client_status_issuable
			? `Client status ${laneStatus.client.status} allows issuance.`
			: `Client status ${laneStatus.client.status} blocks issuance.`,
	);
	addCheck(
		checks,
		'lane_status_issuable',
		laneStatus.readiness.lane_status_issuable ? 'pass' : 'fail',
		laneStatus.readiness.lane_status_issuable ? 'lane_status_issuable' : 'lane_status_blocked',
		laneStatus.readiness.lane_status_issuable
			? `Lane status ${laneStatus.lane.status} allows issuance.`
			: `Lane status ${laneStatus.lane.status} blocks issuance.`,
	);
	addCheck(
		checks,
		'identity_account_mapping',
		laneStatus.readiness.identity_account_ready ? 'pass' : 'fail',
		laneStatus.readiness.identity_account_ready
			? 'identity_account_mapping_present'
			: 'identity_account_mapping_missing',
		laneStatus.readiness.identity_account_ready
			? 'Client has an identity account mapping.'
			: 'Client is missing identity_account_id.',
	);
	addCheck(
		checks,
		'identity_tenant_mapping',
		laneStatus.readiness.identity_tenant_ready ? 'pass' : 'fail',
		laneStatus.readiness.identity_tenant_ready
			? 'identity_tenant_mapping_present'
			: 'identity_tenant_mapping_missing',
		laneStatus.readiness.identity_tenant_ready
			? 'Client has an identity tenant mapping.'
			: 'Client is missing identity_tenant_id.',
	);
	addCheck(
		checks,
		'lane_identity_user',
		laneStatus.readiness.lane_identity_subject_ready ? 'pass' : 'fail',
		laneStatus.readiness.lane_identity_subject_ready
			? 'lane_identity_user_present'
			: 'lane_identity_user_missing',
		laneStatus.readiness.lane_identity_subject_ready
			? 'Lane has an identity subject for managed bearer issuance.'
			: 'Lane is missing identity_user_id.',
	);
	addCheck(
		checks,
		'active_consent',
		laneStatus.readiness.consent_ready ? 'pass' : 'fail',
		laneStatus.readiness.consent_ready ? 'active_consent_present' : 'active_consent_missing',
		laneStatus.readiness.consent_ready
			? 'Client has an active consent record.'
			: 'Client is missing an active consent record.',
	);
	addCheck(
		checks,
		'managed_bearer_readiness',
		laneStatus.readiness.managed_bearer_ready ? 'pass' : 'fail',
		laneStatus.readiness.managed_bearer_ready
			? 'managed_bearer_ready'
			: 'managed_bearer_blocked',
		laneStatus.readiness.managed_bearer_ready
			? 'Managed bearer issuance prerequisites are satisfied.'
			: 'Managed bearer issuance prerequisites are still blocked.',
	);
}

async function evaluateProviderChecks(input: {
	checks: PreflightCheck[];
	spec: LaneSpec;
	clientSlug: string;
	context: LaneContext;
	partnerKey: string;
	toolkitStatus: ToolkitStatusResponse | null;
	partnerApiBaseUrl: string;
	partnerAdminKey: string | null;
	actor: string;
	probeConnectLinks: boolean;
	allowHubChecks: boolean;
	hubToken: string | null;
	sessionToken?: string;
}): Promise<PreflightCheck[]> {
	const providerChecks: PreflightCheck[] = [];

	for (const provider of input.spec.searchProviders ?? []) {
		const normalizedToolkit = provider.toolkit.trim().toLowerCase();
		if (!input.probeConnectLinks) {
			const check = buildCheck(
				`provider_${provider.id}`,
				'skip',
				'provider_probe_skipped',
				`Provider ${provider.id} probe was skipped by CLI flag.`,
			);
			input.checks.push(check);
			providerChecks.push(check);
			continue;
		}

		if (provider.authConfigRequired && !input.partnerAdminKey) {
			const check = buildCheck(
				`provider_${provider.id}`,
				'fail',
				'provider_admin_key_missing',
				`Provider ${provider.id} probe requires a partner admin key.`,
			);
			input.checks.push(check);
			providerChecks.push(check);
			continue;
		}

		try {
			if (provider.authConfigRequired) {
				const toolkit = input.toolkitStatus?.toolkits.find(
					(entry) => entry.toolkit.trim().toLowerCase() === normalizedToolkit,
				);
				if (!toolkit) {
					const check = buildCheck(
						`provider_${provider.id}`,
						'fail',
						'provider_toolkit_missing',
						`Provider ${provider.id} is promised, but toolkit ${provider.toolkit} is missing from toolkit status.`,
					);
					input.checks.push(check);
					providerChecks.push(check);
					continue;
				}

				if (!toolkit.auth_config_id) {
					const check = buildCheck(
						`provider_${provider.id}`,
						'fail',
						'provider_auth_config_missing',
						`Provider ${provider.id} is missing auth config for toolkit ${provider.toolkit}.`,
					);
					input.checks.push(check);
					providerChecks.push(check);
					continue;
				}

				const url = buildPartnerToolkitConnectLinkUrl(
					input.partnerApiBaseUrl,
					input.partnerKey,
					input.clientSlug,
					normalizedToolkit,
				);
				await requestJson<Record<string, unknown>>(url, {
					method: 'POST',
					headers: buildPartnerHeaders(input.partnerAdminKey, input.actor),
					body: JSON.stringify({
						callback_url: sanitizeBaseUrl(input.partnerApiBaseUrl),
						metadata: {
							source: 'mcp_hub_lane_preflight',
							lane_slug: input.context.laneSlug,
							provider_id: provider.id,
						},
					}),
				});
				const check = buildCheck(
					`provider_${provider.id}`,
					'pass',
					'provider_connect_link_ready',
					`Provider ${provider.id} issued a governed connect link successfully.`,
				);
				input.checks.push(check);
				providerChecks.push(check);
				continue;
			}

			if (!input.hubToken) {
				const check = buildCheck(
					`provider_${provider.id}`,
					'fail',
					'provider_hub_token_missing',
					`Provider ${provider.id} probe requires a Hub API token.`,
				);
				input.checks.push(check);
				providerChecks.push(check);
				continue;
			}

			if (!input.allowHubChecks) {
				const check = buildCheck(
					`provider_${provider.id}`,
					'skip',
					'provider_hub_probe_skipped',
					`Provider ${provider.id} Hub probe was skipped by CLI flag.`,
				);
				input.checks.push(check);
				providerChecks.push(check);
				continue;
			}

			const proxyToolNames = await searchHubProxyToolsForServer(
				input.context.hubUrl,
				input.hubToken,
				provider.serverName,
				{
					sessionToken: input.sessionToken,
					limit: 20,
				},
			);
			const check = buildCheck(
				`provider_${provider.id}`,
				proxyToolNames.length > 0 ? 'pass' : 'fail',
				proxyToolNames.length > 0
					? 'provider_proxy_tools_visible'
					: 'provider_proxy_tools_missing',
				proxyToolNames.length > 0
					? `Provider ${provider.id} exposes ${proxyToolNames.length} proxy tool(s) via ${provider.serverName}.`
					: `Provider ${provider.id} does not expose proxy tools via ${provider.serverName}.`,
				{
					server_name: provider.serverName,
					proxy_tool_count: proxyToolNames.length,
				},
			);
			input.checks.push(check);
			providerChecks.push(check);
		} catch (error) {
			const httpError = asHttpError(error);
			const check = buildCheck(
				`provider_${provider.id}`,
				'fail',
				httpError?.status === 403 ? 'provider_probe_policy_blocked' : 'provider_probe_failed',
				httpError?.message ?? `Provider ${provider.id} probe failed.`,
			);
			input.checks.push(check);
			providerChecks.push(check);
		}
	}

	return providerChecks;
}

async function evaluateHubChecks(input: {
	checks: PreflightCheck[];
	spec: LaneSpec;
	context: LaneContext;
	hubToken: string | null;
	sessionToken?: string;
}): Promise<void> {
	try {
		const health = await requestJson<HubHealthResponse>(input.context.healthUrl, {
			method: 'GET',
			headers: {
				Accept: 'application/json',
			},
		});
		addCheck(
			input.checks,
			'hub_health',
			'pass',
			'hub_health_ok',
			`Hub health endpoint responded for ${input.context.workerName}.`,
			{
				auth_required: health.auth_required ?? null,
			},
		);

		const enabledServers = normalizeStringArray(health.enabled_servers);
		const expectedServers = normalizeStringArray(input.spec.enabledServers);
		addCheck(
			input.checks,
			'hub_enabled_servers',
			sameStringSet(enabledServers, expectedServers) ? 'pass' : 'fail',
			sameStringSet(enabledServers, expectedServers)
				? 'hub_enabled_servers_match'
				: 'hub_enabled_servers_drift',
			sameStringSet(enabledServers, expectedServers)
				? 'Hub enabled server scope matches the lane spec.'
				: 'Hub enabled server scope has drifted from the lane spec.',
			{
				expected: expectedServers,
				actual: enabledServers,
			},
		);
	} catch (error) {
		addCheck(
			input.checks,
			'hub_health',
			'fail',
			'hub_health_unavailable',
			error instanceof Error ? error.message : 'Hub health request failed.',
		);
		addCheck(
			input.checks,
			'hub_enabled_servers',
			'skip',
			'hub_scope_skipped',
			'Hub scope comparison was skipped because health is unavailable.',
		);
		return;
	}

	if (!input.hubToken) {
		addCheck(
			input.checks,
			'hub_discovery',
			input.spec.deploymentMode === 'shared' ? 'skip' : 'fail',
			input.spec.deploymentMode === 'shared' ? 'hub_api_token_not_declared' : 'hub_api_token_missing',
			input.spec.deploymentMode === 'shared'
				? 'No shared-hub API token is declared for live discovery inspection.'
				: 'HUB_API_TOKEN is required to inspect live discovery state.',
		);
		addCheck(
			input.checks,
			'primary_service_discovery',
			'skip',
			input.spec.deploymentMode === 'shared'
				? 'primary_service_discovery_not_probed'
				: 'primary_service_discovery_skipped',
			input.spec.deploymentMode === 'shared'
				? 'Primary service discovery was not probed because no shared-hub API token is declared.'
				: 'Primary service discovery check was skipped because HUB_API_TOKEN is missing.',
		);
		return;
	}

	try {
		const servicesPayload = await hubCall(
			input.context.hubUrl,
			input.hubToken,
			'hub_list_services',
			{},
			{
				sessionToken: input.sessionToken,
				timeoutMs: 20_000,
			},
		);
		const activeServices = extractActiveDiscoveryServiceNames(servicesPayload);
		const expectedDiscoveryServices = normalizeStringArray(input.spec.discoveryDefaultServers);
		addCheck(
			input.checks,
			'hub_discovery',
			sameStringSet(activeServices, expectedDiscoveryServices) ? 'pass' : 'fail',
			sameStringSet(activeServices, expectedDiscoveryServices)
				? 'hub_discovery_matches'
				: 'hub_discovery_drift',
			sameStringSet(activeServices, expectedDiscoveryServices)
				? 'Active discovery services match the managed lane surface.'
				: 'Active discovery services have drifted from the managed lane surface.',
			{
				expected: expectedDiscoveryServices,
				actual: activeServices,
			},
		);
	} catch (error) {
		addCheck(
			input.checks,
			'hub_discovery',
			'fail',
			'hub_discovery_unavailable',
			error instanceof Error ? error.message : 'Hub discovery check failed.',
		);
	}

	try {
		const proxyToolNames = await searchHubProxyToolsForServer(
			input.context.hubUrl,
			input.hubToken,
			input.spec.primaryService,
			{
				sessionToken: input.sessionToken,
				limit: 50,
				timeoutMs: 20_000,
			},
		);
		addCheck(
			input.checks,
			'primary_service_discovery',
			proxyToolNames.length > 0 ? 'pass' : 'fail',
			proxyToolNames.length > 0 ? 'primary_service_proxy_tools_visible' : 'primary_service_proxy_tools_missing',
			proxyToolNames.length > 0
				? `Primary service ${input.spec.primaryService} exposes ${proxyToolNames.length} proxy tool(s).`
				: `Primary service ${input.spec.primaryService} does not expose proxy tools in discovery.`,
		);
	} catch (error) {
		addCheck(
			input.checks,
			'primary_service_discovery',
			'fail',
			'primary_service_discovery_failed',
			error instanceof Error ? error.message : 'Primary service discovery check failed.',
		);
	}
}

function requiredCliValue(
	args: Record<string, string | boolean>,
	argName: string,
	envName: string,
): string {
	const value = getStringArg(args, argName) ?? process.env[envName]?.trim();
	if (!value) {
		throw new Error(`Missing --${argName} or ${envName}.`);
	}
	return value;
}

function parseRequiredState(raw: string | undefined): ReadyState {
	switch (raw?.trim().toLowerCase()) {
		case 'infra':
		case 'infrastructure':
			return 'infrastructure';
		case 'search':
			return 'search';
		case 'customer':
		case undefined:
			return 'customer';
		default:
			throw new Error(`Invalid --require-state "${raw}". Expected infrastructure, customer, or search.`);
	}
}

function parseBooleanish(raw: string | undefined, fallback: boolean): boolean {
	if (!raw) return fallback;
	const normalized = raw.trim().toLowerCase();
	if (['1', 'true', 'yes'].includes(normalized)) return true;
	if (['0', 'false', 'no'].includes(normalized)) return false;
	return fallback;
}

function sanitizeBaseUrl(raw: string): string {
	return raw.replace(/\/+$/, '');
}

function buildPartnerHeaders(adminKey: string, actor: string): HeadersInit {
	return {
		'Content-Type': 'application/json',
		'X-Partner-Admin-Key': adminKey,
		'X-Partner-Actor': actor,
	};
}

function buildPartnerLaneStatusUrl(
	baseUrl: string,
	partnerKey: string,
	clientSlug: string,
	laneSlug: string,
): string {
	return `${sanitizeBaseUrl(baseUrl)}/api/partners/${encodeURIComponent(partnerKey)}/clients/${encodeURIComponent(clientSlug)}/lanes/${encodeURIComponent(laneSlug)}/status`;
}

function buildPartnerToolkitStatusUrl(baseUrl: string, partnerKey: string, clientSlug: string): string {
	return `${sanitizeBaseUrl(baseUrl)}/api/partners/${encodeURIComponent(partnerKey)}/clients/${encodeURIComponent(clientSlug)}/toolkits/status`;
}

function buildPartnerToolkitConnectLinkUrl(
	baseUrl: string,
	partnerKey: string,
	clientSlug: string,
	toolkit: string,
): string {
	return `${sanitizeBaseUrl(baseUrl)}/api/partners/${encodeURIComponent(partnerKey)}/clients/${encodeURIComponent(clientSlug)}/toolkits/${encodeURIComponent(toolkit)}/connect-link`;
}

function buildPartnerLaneInitUrl(
	baseUrl: string,
	partnerKey: string,
	clientSlug: string,
	laneSlug: string,
): string {
	return `${sanitizeBaseUrl(baseUrl)}/api/partners/${encodeURIComponent(partnerKey)}/clients/${encodeURIComponent(clientSlug)}/lanes/${encodeURIComponent(laneSlug)}/init`;
}

function addCheck(
	checks: PreflightCheck[],
	id: string,
	status: CheckStatus,
	reasonCode: string,
	message: string,
	details?: Record<string, unknown>,
): PreflightCheck {
	const check = buildCheck(id, status, reasonCode, message, details);
	checks.push(check);
	return check;
}

function buildCheck(
	id: string,
	status: CheckStatus,
	reasonCode: string,
	message: string,
	details?: Record<string, unknown>,
): PreflightCheck {
	return {
		id,
		status,
		reason_code: reasonCode,
		message,
		...(details ? { details } : {}),
	};
}

function normalizeStringArray(values: unknown): string[] {
	if (!Array.isArray(values)) return [];
	return [...new Set(values.filter((value): value is string => typeof value === 'string').map((value) => value.trim()).filter(Boolean))];
}

function sameStringSet(left: string[], right: string[]): boolean {
	const leftSorted = [...new Set(left)].sort();
	const rightSorted = [...new Set(right)].sort();
	return JSON.stringify(leftSorted) === JSON.stringify(rightSorted);
}

function toCsv(values: string[], emptyValue: string): string {
	const normalized = normalizeStringArray(values);
	return normalized.length > 0 ? normalized.join(',') : emptyValue;
}

function asArray(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

function asObject(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	return value as Record<string, unknown>;
}

function visitObject(value: unknown, visitor: (value: Record<string, unknown>) => void): void {
	if (!value || typeof value !== 'object') return;
	if (Array.isArray(value)) {
		for (const entry of value) {
			visitObject(entry, visitor);
		}
		return;
	}
	const objectValue = value as Record<string, unknown>;
	visitor(objectValue);
	for (const child of Object.values(objectValue)) {
		visitObject(child, visitor);
	}
}

function asHttpError(error: unknown): HttpRequestError | null {
	return error instanceof HttpRequestError ? error : null;
}

function isMissingCommandError(error: unknown): boolean {
	return error instanceof Error && /ENOENT/.test(error.message);
}

const CUSTOMER_BLOCKING_CHECKS = new Set([
	'lane_record',
	'client_status_issuable',
	'lane_status_issuable',
	'identity_account_mapping',
	'identity_tenant_mapping',
	'lane_identity_user',
	'active_consent',
	'managed_bearer_readiness',
	'approved_exception',
]);

function isInfrastructureBlockingCheck(spec: LaneSpec, checkId: string): boolean {
	if (
		checkId === 'primary_service_in_enabled_servers' ||
		checkId === 'discovery_pack_declared' ||
		checkId === 'hub_health' ||
		checkId === 'hub_enabled_servers'
	) {
		return true;
	}

	if (spec.deploymentMode === 'dedicated') {
		return (
			checkId === 'secret_hub_api_token' ||
			checkId === 'secret_hub_session_resolve_token' ||
			checkId === 'secret_braintrust_api_key' ||
			checkId === 'secret_braintrust_project_id' ||
			checkId === 'hub_discovery' ||
			checkId === 'primary_service_discovery'
		);
	}

	return false;
}
