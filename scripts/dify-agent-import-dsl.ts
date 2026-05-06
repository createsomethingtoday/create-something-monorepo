#!/usr/bin/env tsx

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';

type ToolRisk = 'read' | 'write' | 'external_side_effect' | 'secret_sensitive' | 'unknown';
type AgentAudience = 'internal' | 'client' | 'public';
type AgentStatus = 'planned' | 'draft' | 'imported' | 'published' | 'retired';
type DifyAuthType = 'none' | 'bearer' | 'oauth' | 'custom';
type EvalCheck =
  | 'api_health'
  | 'expected_tool_use'
  | 'forbidden_tool_use'
  | 'grounded_answer'
  | 'write_confirmation'
  | 'secret_refusal'
  | 'latency_budget'
  | 'policy_boundary'
  | 'tenant_isolation'
  | 'error_recovery';

type SecretRef = {
  environment: string;
  path: string;
  secret_key: string;
};

type DifyTool = {
  name: string;
  enabled: boolean;
  risk: ToolRisk;
  required_parameters?: string[];
  requires_user_confirmation?: boolean;
  notes?: string;
};

type DifyMcpServer = {
  display_name: string;
  source_mcp_registry_server?: string;
  transport: 'http';
  url: string;
  auth: {
    type: DifyAuthType;
    infisical?: SecretRef;
  };
  tools: DifyTool[];
};

type DifyAgent = {
  display_name: string;
  runtime: 'dify';
  status: AgentStatus;
  audience: AgentAudience;
  dify_app_id?: string;
  mode: string;
  manifest_path?: string;
  dsl_path?: string;
  service_api?: {
    base_url: string;
    api_key_secret: SecretRef;
  };
  allowed_mcp_servers: string[];
  enabled_tools: string[];
  policy_pack: string;
  instructions_source?: string;
  eval_suite: string;
  evals: {
    owner_system: 'braintrust';
    project?: string;
    experiment?: string;
    required_checks: EvalCheck[];
    notes?: string;
  };
  owner: string;
  write_policy?: 'none' | 'requires_explicit_confirmation' | 'disabled';
  notes?: string;
};

type DifyInventory = {
  version: number;
  mcp_servers: Record<string, DifyMcpServer>;
  agents: Record<string, DifyAgent>;
};

type FleetDeployment = {
  type?: string;
  product?: string;
  url?: string;
  auth?: {
    type?: DifyAuthType;
    bearer_token_env_var?: string;
    infisical_path?: string;
  };
};

type FleetConfig = {
  deployments?: Record<string, FleetDeployment>;
};

type DifyDsl = {
  app?: {
    name?: string;
    description?: string;
    mode?: string;
  };
  model_config?: {
    pre_prompt?: string;
    model?: {
      name?: string;
      mode?: string;
      provider?: string;
    };
    agent_mode?: {
      enabled?: boolean;
      tools?: DslTool[];
    };
  };
  version?: string;
};

type DslTool = {
  enabled?: boolean;
  provider_id?: string;
  provider_name?: string;
  provider_type?: string;
  tool_label?: string;
  tool_name?: string;
  tool_parameters?: Record<string, unknown>;
  type?: string;
};

type ImportOptions = {
  dslPath: string;
  agentId: string;
  serverId: string;
  displayName: string;
  audience: AgentAudience;
  status: AgentStatus;
  owner: string;
  policyPack: string;
  mode: string;
  mcpDisplayName: string;
  mcpUrl: string;
  mcpAuthType: DifyAuthType;
  mcpSecretRef?: SecretRef;
  sourceMcpRegistryServer?: string;
  difyAppId?: string;
  writeDsl: boolean;
  writeManifest: boolean;
  writeInventory: boolean;
};

const ROOT = process.cwd();
const INVENTORY_PATH = resolve(ROOT, 'config/dify/inventory.json');
const FLEET_PATH = resolve(ROOT, 'config/mcp-hub/fleet.json');
const AGENTS_DIR = resolve(ROOT, 'config/dify-agents');
const DEFAULT_DIFY_API_BASE_URL = 'https://api.dify.ai/v1';
const DEFAULT_BRAINTRUST_PROJECT = 'create-something-dify-agents';

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printUsage();
  process.exit(0);
}

const dslPath = resolve(ROOT, readRequiredArg(args, 'dsl'));
if (!existsSync(dslPath)) fail(`Dify DSL file not found: ${dslPath}`);
if (!existsSync(INVENTORY_PATH)) fail(`Required file missing: ${relativeToRoot(INVENTORY_PATH)}`);

const inventory = readJson<DifyInventory>(INVENTORY_PATH);
const fleet = existsSync(FLEET_PATH) ? readJson<FleetConfig>(FLEET_PATH) : {};
const dslSource = readFileSync(dslPath, 'utf8');
const dsl = parseYaml(dslSource) as DifyDsl;
const options = buildOptions(args, dsl, fleet, dslPath);
const mcpTools = extractMcpTools(dsl, options.serverId);

if (mcpTools.length === 0) {
  fail(
    `No enabled MCP tools found in ${relativeToRoot(dslPath)} for provider ${options.serverId}.`
  );
}

const serverEntry = buildServerEntry(options, mcpTools);
const manifestPath = `config/dify-agents/${options.agentId}.json`;
const dslRepoPath = `config/dify-agents/${options.agentId}.dify.yml`;
const manifest = buildManifest(options, mcpTools, manifestPath, dslRepoPath);
const inventoryAgent = buildInventoryAgent(options, mcpTools, manifestPath, dslRepoPath);

preflightWrites(options, inventory, serverEntry, manifestPath, dslRepoPath);

if (options.writeDsl || options.writeManifest || options.writeInventory) {
  mkdirSync(AGENTS_DIR, { recursive: true });
}

if (options.writeDsl) {
  writeNewFile(resolve(ROOT, dslRepoPath), dslSource, dslRepoPath);
}

if (options.writeManifest) {
  writeNewFile(resolve(ROOT, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`, manifestPath);
}

if (options.writeInventory) {
  const existingServer = inventory.mcp_servers[options.serverId];
  if (!existingServer) {
    inventory.mcp_servers[options.serverId] = serverEntry;
  }
  inventory.agents[options.agentId] = inventoryAgent;
  writeFileSync(INVENTORY_PATH, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');
}

printResult(options, mcpTools, manifestPath, dslRepoPath, manifest, serverEntry, inventoryAgent);

function buildOptions(
  args: Record<string, string | boolean>,
  dsl: DifyDsl,
  fleet: FleetConfig,
  dslPath: string
): ImportOptions {
  const appName = dsl.app?.name?.trim() || stripExtension(basename(dslPath));
  const agentId = readStringArg(args, 'agent-id') ?? slugify(appName);
  const serverId =
    readStringArg(args, 'server-id') ?? inferSingleProviderId(dsl) ?? fail('Missing --server-id');
  const fleetId = readStringArg(args, 'fleet-id');
  const fleetDeployment = fleetId ? fleet.deployments?.[fleetId] : undefined;

  if (fleetId && !fleetDeployment) {
    fail(`Unknown MCP Hub fleet deployment ${fleetId}.`);
  }

  const mcpUrl = readStringArg(args, 'mcp-url') ?? fleetDeployment?.url;
  if (!mcpUrl) {
    fail('Missing MCP URL. Pass --mcp-url or --fleet-id for this Dify MCP provider.');
  }

  const mcpAuthType = readAuthType(args, fleetDeployment);
  const mcpSecretRef = buildMcpSecretRef(args, mcpAuthType, fleetDeployment, serverId, agentId);
  const audience = readEnumArg(args, 'audience', ['internal', 'client', 'public'], 'client');
  const status = readEnumArg(args, 'status', ['planned', 'draft', 'imported'], 'imported');
  const mode = readStringArg(args, 'mode') ?? dsl.app?.mode ?? 'agent-chat';

  assertSlug(agentId, 'agent-id');

  return {
    dslPath,
    agentId,
    serverId,
    displayName: readStringArg(args, 'display-name') ?? appName,
    audience,
    status,
    owner: readStringArg(args, 'owner') ?? 'create-something',
    policyPack: readStringArg(args, 'policy-pack') ?? `client-${agentId}.v1`,
    mode,
    mcpDisplayName:
      readStringArg(args, 'mcp-display-name') ??
      inferProviderName(dsl, serverId) ??
      fleetDeployment?.product ??
      titleize(serverId),
    mcpUrl,
    mcpAuthType,
    mcpSecretRef,
    sourceMcpRegistryServer: readStringArg(args, 'source-mcp-registry-server'),
    difyAppId: readStringArg(args, 'dify-app-id'),
    writeDsl: Boolean(args['write-dsl']),
    writeManifest: Boolean(args['write-manifest']),
    writeInventory: Boolean(args['write-inventory'])
  };
}

function extractMcpTools(dsl: DifyDsl, serverId: string): DslTool[] {
  const tools = dsl.model_config?.agent_mode?.tools ?? [];
  return tools
    .filter((tool) => {
      return (
        tool.enabled === true &&
        tool.provider_type === 'mcp' &&
        tool.type === 'mcp' &&
        tool.provider_id === serverId &&
        Boolean(tool.tool_name)
      );
    })
    .sort((a, b) => String(a.tool_name).localeCompare(String(b.tool_name)));
}

function buildServerEntry(options: ImportOptions, tools: DslTool[]): DifyMcpServer {
  return {
    display_name: options.mcpDisplayName,
    ...(options.sourceMcpRegistryServer
      ? { source_mcp_registry_server: options.sourceMcpRegistryServer }
      : {}),
    transport: 'http',
    url: options.mcpUrl,
    auth: buildAuth(options),
    tools: tools.map((tool) => {
      const risk = classifyToolRisk(tool.tool_name ?? '');
      const parameters = Object.keys(tool.tool_parameters ?? {});
      return {
        name: tool.tool_name ?? '',
        enabled: true,
        risk,
        ...(risk === 'write' || risk === 'external_side_effect'
          ? { requires_user_confirmation: true }
          : {}),
        ...(parameters.length > 0
          ? { notes: `DSL parameters: ${parameters.sort().join(', ')}` }
          : {})
      };
    })
  };
}

function buildManifest(
  options: ImportOptions,
  tools: DslTool[],
  manifestPath: string,
  dslRepoPath: string
): unknown {
  return {
    version: 1,
    status: options.status,
    created_at: new Date().toISOString().slice(0, 10),
    source_dsl: {
      imported_from: sourceDslLabel(options.dslPath),
      repo_path: dslRepoPath
    },
    dify_app: {
      name: options.displayName,
      type: 'agent',
      mode: options.mode,
      description: dslDescription(),
      recommended_model: modelName(),
      api_response_mode: 'streaming',
      ...(options.difyAppId ? { app_id: options.difyAppId } : {}),
      service_api: {
        base_url: DEFAULT_DIFY_API_BASE_URL,
        api_key_secret: buildServiceApiSecretRef(options.agentId)
      }
    },
    mcp_server: {
      display_name: options.mcpDisplayName,
      server_id: options.serverId,
      transport: 'http',
      url: options.mcpUrl,
      auth: buildAuth(options)
    },
    tools: tools.map((tool) => ({
      name: tool.tool_name,
      enabled: true,
      write_capability: isWriteRisk(classifyToolRisk(tool.tool_name ?? '')),
      dsl_parameters: Object.keys(tool.tool_parameters ?? {}).sort(),
      requires_user_confirmation: isWriteRisk(classifyToolRisk(tool.tool_name ?? '')) || undefined
    })),
    agent_prompt: dslPrompt(),
    inventory_target: {
      manifest_path: manifestPath,
      dsl_path: dslRepoPath
    }
  };
}

function buildInventoryAgent(
  options: ImportOptions,
  tools: DslTool[],
  manifestPath: string,
  dslRepoPath: string
): DifyAgent {
  const selectedTools = tools.map((tool) => tool.tool_name ?? '').filter(Boolean);
  const writeCapable = selectedTools.some((tool) => isWriteRisk(classifyToolRisk(tool)));

  return {
    display_name: options.displayName,
    runtime: 'dify',
    status: options.status,
    audience: options.audience,
    ...(options.difyAppId ? { dify_app_id: options.difyAppId } : {}),
    mode: options.mode,
    manifest_path: manifestPath,
    dsl_path: dslRepoPath,
    service_api: {
      base_url: DEFAULT_DIFY_API_BASE_URL,
      api_key_secret: buildServiceApiSecretRef(options.agentId)
    },
    allowed_mcp_servers: [options.serverId],
    enabled_tools: selectedTools.map((tool) => `${options.serverId}.${tool}`),
    policy_pack: options.policyPack,
    instructions_source: `${manifestPath}#agent_prompt`,
    eval_suite: `braintrust:eval:dify:${options.agentId}`,
    evals: {
      owner_system: 'braintrust',
      project: DEFAULT_BRAINTRUST_PROJECT,
      experiment: toSnakeCase(options.agentId),
      required_checks: buildEvalChecks(options.audience, writeCapable),
      notes:
        'Imported from Dify DSL. Add smoke cases, local_command, and published_command before publishing.'
    },
    owner: options.owner,
    write_policy: writeCapable ? 'requires_explicit_confirmation' : 'none',
    notes:
      'Imported from exported Dify DSL. Confirm Service API key and add Braintrust eval evidence before marking published.'
  };
}

function preflightWrites(
  options: ImportOptions,
  inventory: DifyInventory,
  serverEntry: DifyMcpServer,
  manifestPath: string,
  dslRepoPath: string
): void {
  if (options.writeDsl && existsSync(resolve(ROOT, dslRepoPath))) {
    fail(`Refusing to overwrite existing file: ${dslRepoPath}`);
  }
  if (options.writeManifest && existsSync(resolve(ROOT, manifestPath))) {
    fail(`Refusing to overwrite existing file: ${manifestPath}`);
  }
  if (!options.writeInventory) return;

  if (inventory.agents[options.agentId]) {
    fail(`Refusing to overwrite existing inventory agent: ${options.agentId}`);
  }
  const existingServer = inventory.mcp_servers[options.serverId];
  if (existingServer) {
    assertExistingServerMatches(options.serverId, existingServer, serverEntry);
  }
}

function buildAuth(options: ImportOptions): DifyMcpServer['auth'] {
  if (options.mcpAuthType === 'none') return { type: 'none' };
  if (!options.mcpSecretRef) {
    fail(`Auth type ${options.mcpAuthType} requires an Infisical secret reference.`);
  }
  return {
    type: options.mcpAuthType,
    infisical: options.mcpSecretRef
  };
}

function readAuthType(
  args: Record<string, string | boolean>,
  fleetDeployment: FleetDeployment | undefined
): DifyAuthType {
  const explicit = readStringArg(args, 'mcp-auth-type');
  if (explicit) {
    if (['none', 'bearer', 'oauth', 'custom'].includes(explicit)) return explicit as DifyAuthType;
    fail('--mcp-auth-type must be one of: none, bearer, oauth, custom');
  }
  return fleetDeployment?.auth?.type ?? 'none';
}

function buildMcpSecretRef(
  args: Record<string, string | boolean>,
  authType: DifyAuthType,
  fleetDeployment: FleetDeployment | undefined,
  serverId: string,
  _agentId: string
): SecretRef | undefined {
  if (authType === 'none') return undefined;
  return {
    environment: readStringArg(args, 'mcp-infisical-env') ?? 'prod',
    path:
      readStringArg(args, 'mcp-infisical-path') ??
      fleetDeployment?.auth?.infisical_path ??
      `/dify/mcp/${serverId}`,
    secret_key:
      readStringArg(args, 'mcp-secret-key') ??
      fleetDeployment?.auth?.bearer_token_env_var ??
      defaultSecretKeyForAuthType(authType)
  };
}

function classifyToolRisk(toolName: string): ToolRisk {
  if (
    [
      'hub_status',
      'hub_policy_status',
      'hub_list_registry',
      'hub_list_proxy_tools',
      'hub_search_proxy_tools',
      'hub_describe_proxy_tool',
      'hub_get_proxy_tool',
      'hub_list_services',
      'hub_list_discovery_packs',
      'hub_trace_lookup',
      'hub_route_intent'
    ].includes(toolName)
  ) {
    return 'read';
  }
  if (
    [
      'hub_run_intent',
      'hub_execute_proxy_tool',
      'hub_run_proxy_tool',
      'hub_set_discovery',
      'hub_refresh_connections',
      'hub_update_state'
    ].includes(toolName)
  ) {
    return 'external_side_effect';
  }
  return 'unknown';
}

function buildEvalChecks(audience: AgentAudience, writeCapable: boolean): EvalCheck[] {
  const checks = new Set<EvalCheck>([
    'api_health',
    'expected_tool_use',
    'forbidden_tool_use',
    'secret_refusal',
    'latency_budget',
    'policy_boundary'
  ]);
  if (writeCapable) checks.add('write_confirmation');
  if (audience === 'public') checks.add('tenant_isolation');
  return [...checks];
}

function assertExistingServerMatches(
  serverId: string,
  existing: DifyMcpServer,
  incoming: DifyMcpServer
): void {
  if (existing.url !== incoming.url) {
    fail(`Existing Dify MCP server ${serverId} has a different URL in inventory.`);
  }
  const existingTools = new Set(existing.tools.map((tool) => tool.name));
  const missing = incoming.tools
    .map((tool) => tool.name)
    .filter((toolName) => !existingTools.has(toolName));
  if (missing.length > 0) {
    fail(`Existing Dify MCP server ${serverId} is missing DSL tools: ${missing.join(', ')}`);
  }
}

function writeNewFile(path: string, content: string, displayPath: string): void {
  if (existsSync(path)) fail(`Refusing to overwrite existing file: ${displayPath}`);
  writeFileSync(path, content, 'utf8');
}

function inferSingleProviderId(dsl: DifyDsl): string | undefined {
  const providerIds = new Set(
    (dsl.model_config?.agent_mode?.tools ?? [])
      .filter((tool) => tool.enabled === true && tool.provider_type === 'mcp')
      .map((tool) => tool.provider_id)
      .filter((providerId): providerId is string => Boolean(providerId))
  );
  return providerIds.size === 1 ? [...providerIds][0] : undefined;
}

function inferProviderName(dsl: DifyDsl, serverId: string): string | undefined {
  return (dsl.model_config?.agent_mode?.tools ?? []).find(
    (tool) => tool.provider_id === serverId && tool.provider_name
  )?.provider_name;
}

function dslPrompt(): string {
  return normalizeExportText(dsl.model_config?.pre_prompt?.trim() || '');
}

function dslDescription(): string {
  return normalizeExportText(
    dsl.app?.description?.trim() || `Imported Dify agent ${dsl.app?.name ?? ''}`.trim()
  );
}

function modelName(): string {
  return dsl.model_config?.model?.name ?? 'workspace-approved client model';
}

function normalizeExportText(value: string): string {
  return value.replace(/\u00a0/g, ' ');
}

function buildServiceApiSecretRef(agentId: string): SecretRef {
  return {
    environment: 'prod',
    path: `/dify/${agentId}`,
    secret_key: `DIFY_${toScreamingSnake(agentId)}_API_KEY`
  };
}

function defaultSecretKeyForAuthType(authType: DifyAuthType): string {
  switch (authType) {
    case 'none':
      return 'MCP_AUTH_NOT_REQUIRED';
    case 'bearer':
      return 'MCP_BEARER_TOKEN';
    case 'oauth':
      return 'MCP_OAUTH_CONFIG';
    case 'custom':
      return 'MCP_AUTH_CONFIG';
  }
}

function isWriteRisk(risk: ToolRisk): boolean {
  return risk === 'write' || risk === 'external_side_effect';
}

function printResult(
  options: ImportOptions,
  tools: DslTool[],
  manifestPath: string,
  dslRepoPath: string,
  manifest: unknown,
  serverEntry: DifyMcpServer,
  inventoryAgent: DifyAgent
): void {
  const wrote: string[] = [];
  if (options.writeDsl) wrote.push(dslRepoPath);
  if (options.writeManifest) wrote.push(manifestPath);
  if (options.writeInventory) wrote.push('config/dify/inventory.json');

  console.log(`# Dify agent DSL import: ${options.agentId}`);
  console.log('');
  console.log(wrote.length > 0 ? `Wrote: ${wrote.join(', ')}` : 'Dry run: no files written.');
  console.log('');
  console.log(`- App: ${options.displayName}`);
  console.log(`- Dify provider/server ID: ${options.serverId}`);
  console.log(`- MCP URL: ${options.mcpUrl}`);
  console.log(`- Tools: ${tools.length}`);
  console.log('');
  console.log('## Inventory MCP server entry');
  console.log('');
  console.log('```json');
  console.log(JSON.stringify({ [options.serverId]: serverEntry }, null, 2));
  console.log('```');
  console.log('');
  console.log('## Inventory agent entry');
  console.log('');
  console.log('```json');
  console.log(JSON.stringify({ [options.agentId]: inventoryAgent }, null, 2));
  console.log('```');
  console.log('');
  console.log('## Manifest');
  console.log('');
  console.log('```json');
  console.log(JSON.stringify(manifest, null, 2));
  console.log('```');
}

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const parsed: Record<string, string | boolean> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') continue;
    if (!arg.startsWith('--')) fail(`Unexpected positional argument: ${arg}`);

    const withoutPrefix = arg.slice(2);
    const equalsIndex = withoutPrefix.indexOf('=');
    if (equalsIndex >= 0) {
      parsed[withoutPrefix.slice(0, equalsIndex)] = withoutPrefix.slice(equalsIndex + 1);
      continue;
    }

    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      parsed[withoutPrefix] = true;
      continue;
    }

    parsed[withoutPrefix] = next;
    index += 1;
  }

  return parsed;
}

function readRequiredArg(args: Record<string, string | boolean>, name: string): string {
  const value = readStringArg(args, name);
  if (!value) {
    printUsage();
    fail(`Missing required --${name}`);
  }
  return value;
}

function readStringArg(args: Record<string, string | boolean>, name: string): string | undefined {
  const value = args[name];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function readEnumArg<T extends string>(
  args: Record<string, string | boolean>,
  name: string,
  values: readonly T[],
  fallback: T
): T {
  const value = readStringArg(args, name);
  if (!value) return fallback;
  if (values.includes(value as T)) return value as T;
  fail(`--${name} must be one of: ${values.join(', ')}`);
}

function assertSlug(value: string, argName: string): void {
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(value)) {
    fail(`--${argName} must be a lowercase slug with letters, numbers, and hyphens.`);
  }
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
  return slug || 'dify-agent';
}

function titleize(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function stripExtension(value: string): string {
  return value.replace(/\.[^.]+$/, '');
}

function toSnakeCase(value: string): string {
  return value.replace(/-/g, '_');
}

function toScreamingSnake(value: string): string {
  return toSnakeCase(value).toUpperCase();
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function relativeToRoot(path: string): string {
  return path.startsWith(`${ROOT}/`) ? path.slice(ROOT.length + 1) : path;
}

function sourceDslLabel(path: string): string {
  return path.startsWith(`${ROOT}/`) ? relativeToRoot(path) : basename(path);
}

function printUsage(): void {
  console.log(`Usage:
  pnpm dify:agent:import-dsl -- --dsl <path-to-exported-dify-yml> [options]

Options:
  --agent-id <slug>                  Repo inventory agent ID. Defaults from app name.
  --server-id <id>                   Dify MCP provider/server ID. Defaults if the DSL has one MCP provider.
  --fleet-id <id>                    Resolve MCP URL/auth from config/mcp-hub/fleet.json.
  --mcp-url <url>                    MCP URL when not using --fleet-id.
  --mcp-display-name <name>          MCP display name. Defaults from DSL provider name.
  --mcp-auth-type <type>             none | bearer | oauth | custom. Defaults from fleet or none.
  --mcp-infisical-env <env>          MCP auth secret environment. Default: prod.
  --mcp-infisical-path <path>        MCP auth secret path.
  --mcp-secret-key <key>             MCP auth secret key.
  --source-mcp-registry-server <id>  Optional source registry server ID.
  --display-name <name>              Agent display name. Defaults from DSL app name.
  --audience <value>                 internal | client | public. Default: client.
  --status <value>                   planned | draft | imported. Default: imported.
  --owner <value>                    Inventory owner. Default: create-something.
  --policy-pack <value>              Policy pack ID. Default: client-<agent-id>.v1.
  --mode <value>                     Dify mode. Defaults from DSL app.mode.
  --dify-app-id <id>                 Optional Dify app ID.
  --write-dsl                        Copy the DSL into config/dify-agents/<agent-id>.dify.yml.
  --write-manifest                   Write config/dify-agents/<agent-id>.json.
  --write-inventory                  Add MCP server and agent entries to config/dify/inventory.json.

Example:
  pnpm dify:agent:import-dsl -- \\
    --dsl "/Users/micahjohnson/Downloads/BLOND_ISH HUB.yml" \\
    --agent-id blondish-hub \\
    --fleet-id blondish-hub
`);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
