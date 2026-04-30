#!/usr/bin/env tsx

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

type ToolRisk = 'read' | 'write' | 'external_side_effect' | 'secret_sensitive' | 'unknown';
type AgentAudience = 'internal' | 'client' | 'public';
type AgentStatus = 'planned' | 'draft' | 'imported' | 'published' | 'retired';
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
    type: 'none' | 'bearer' | 'oauth' | 'custom';
    infisical?: SecretRef;
  };
  tools: DifyTool[];
};

type DifyAgent = {
  display_name: string;
  runtime: 'dify';
  status: AgentStatus;
  audience: AgentAudience;
  mode: string;
  manifest_path: string;
  service_api?: {
    base_url: string;
    api_key_secret: SecretRef;
  };
  allowed_mcp_servers: string[];
  enabled_tools: string[];
  policy_pack: string;
  instructions_source: string;
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
  workspace: {
    name: string;
    provider: 'dify_cloud' | 'self_hosted';
    base_url: string;
  };
  mcp_servers: Record<string, DifyMcpServer>;
  agents: Record<string, DifyAgent>;
};

type ScaffoldOptions = {
  agentId: string;
  serverId: string;
  displayName: string;
  audience: AgentAudience;
  status: AgentStatus;
  owner: string;
  policyPack: string;
  mode: string;
  description: string;
  toolNames?: string[];
  writeManifest: boolean;
  writeInventory: boolean;
};

const ROOT = process.cwd();
const INVENTORY_PATH = resolve(ROOT, 'config/dify/inventory.json');
const AGENTS_DIR = resolve(ROOT, 'config/dify-agents');
const DEFAULT_DIFY_API_BASE_URL = 'https://api.dify.ai/v1';
const DEFAULT_BRAINTRUST_PROJECT = 'create-something-dify-agents';

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printUsage();
  process.exit(0);
}

const inventory = readJson<DifyInventory>(INVENTORY_PATH);
const options = buildOptions(args);
const server = inventory.mcp_servers[options.serverId];

if (!server) {
  fail(
    `Unknown Dify MCP server ${options.serverId}. Known servers: ${Object.keys(
      inventory.mcp_servers
    ).join(', ')}`
  );
}

const selectedTools = selectTools(server, options);
const manifestPath = `config/dify-agents/${options.agentId}.json`;
const manifestFullPath = resolve(ROOT, manifestPath);
const secretRef = buildServiceApiSecretRef(options.agentId);
const evalChecks = buildEvalChecks(options.audience, selectedTools);
const writeCapable = selectedTools.some(isWriteCapable);
const manifest = buildManifest(options, server, selectedTools, secretRef);
const inventoryEntry = buildInventoryEntry(
  options,
  manifestPath,
  selectedTools,
  secretRef,
  evalChecks,
  writeCapable
);

if (options.writeManifest) {
  if (existsSync(manifestFullPath)) {
    fail(`Refusing to overwrite existing manifest: ${manifestPath}`);
  }
  writeFileSync(manifestFullPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

if (options.writeInventory) {
  if (!options.writeManifest && !existsSync(manifestFullPath)) {
    fail(`--write-inventory requires --write-manifest or an existing ${manifestPath}`);
  }
  if (inventory.agents[options.agentId]) {
    fail(`Refusing to overwrite existing inventory agent: ${options.agentId}`);
  }
  inventory.agents[options.agentId] = inventoryEntry;
  writeFileSync(INVENTORY_PATH, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');
}

printResult(options, manifestPath, manifest, inventoryEntry);

function buildOptions(args: Record<string, string | boolean>): ScaffoldOptions {
  const agentId = readRequiredArg(args, 'agent-id');
  const serverId = readRequiredArg(args, 'server-id');
  const displayName = readStringArg(args, 'display-name') ?? titleize(agentId);
  const audience = readEnumArg(args, 'audience', ['internal', 'client', 'public'], 'client');
  const status = readEnumArg(args, 'status', ['planned', 'draft', 'imported'], 'planned');
  const owner = readStringArg(args, 'owner') ?? 'create-something';
  const policyPack =
    readStringArg(args, 'policy-pack') ??
    `${audience === 'internal' ? 'internal' : 'client'}-${agentId}.v1`;
  const mode = readStringArg(args, 'mode') ?? 'agent-chat';
  const description =
    readStringArg(args, 'description') ??
    `Dify agent for ${displayName}, backed by the ${serverId} MCP server.`;
  const tools = readStringArg(args, 'tools');

  assertSlug(agentId, 'agent-id');
  assertSlug(serverId, 'server-id');

  return {
    agentId,
    serverId,
    displayName,
    audience,
    status,
    owner,
    policyPack,
    mode,
    description,
    toolNames: tools
      ?.split(',')
      .map((tool) => tool.trim())
      .filter(Boolean),
    writeManifest: Boolean(args['write-manifest']),
    writeInventory: Boolean(args['write-inventory'])
  };
}

function selectTools(server: DifyMcpServer, options: ScaffoldOptions): DifyTool[] {
  const enabledTools = server.tools.filter((tool) => tool.enabled);

  if (!options.toolNames) {
    if (enabledTools.length === 0)
      fail(`Dify MCP server ${options.serverId} has no enabled tools.`);
    return enabledTools;
  }

  const toolsByName = new Map(server.tools.map((tool) => [tool.name, tool]));
  const selected: DifyTool[] = [];

  for (const name of options.toolNames) {
    const tool = toolsByName.get(name);
    if (!tool) fail(`Unknown tool ${name} on Dify MCP server ${options.serverId}.`);
    if (!tool.enabled)
      fail(`Tool ${name} is disabled in inventory and cannot be enabled by an agent.`);
    selected.push(tool);
  }

  if (selected.length === 0) fail('At least one enabled tool is required.');
  return selected;
}

function buildManifest(
  options: ScaffoldOptions,
  server: DifyMcpServer,
  tools: DifyTool[],
  secretRef: SecretRef
): unknown {
  return {
    version: 1,
    status: options.status,
    created_at: new Date().toISOString().slice(0, 10),
    dify_app: {
      name: options.displayName,
      type: 'agent',
      description: options.description,
      recommended_model: 'workspace-approved client model',
      api_response_mode: 'streaming',
      service_api: {
        base_url: DEFAULT_DIFY_API_BASE_URL,
        api_key_secret: secretRef
      }
    },
    mcp_server: {
      display_name: server.display_name,
      server_id: options.serverId,
      transport: server.transport,
      url: server.url,
      auth: server.auth
    },
    tools: tools.map((tool) => ({
      name: tool.name,
      enabled: true,
      write_capability: isWriteCapable(tool),
      required_parameters: tool.required_parameters ?? [],
      requires_user_confirmation: tool.requires_user_confirmation === true || undefined
    })),
    agent_prompt: renderAgentPrompt(options, server, tools)
  };
}

function buildInventoryEntry(
  options: ScaffoldOptions,
  manifestPath: string,
  tools: DifyTool[],
  secretRef: SecretRef,
  requiredChecks: EvalCheck[],
  writeCapable: boolean
): DifyAgent {
  return {
    display_name: options.displayName,
    runtime: 'dify',
    status: options.status,
    audience: options.audience,
    mode: options.mode,
    manifest_path: manifestPath,
    service_api: {
      base_url: DEFAULT_DIFY_API_BASE_URL,
      api_key_secret: secretRef
    },
    allowed_mcp_servers: [options.serverId],
    enabled_tools: tools.map((tool) => `${options.serverId}.${tool.name}`),
    policy_pack: options.policyPack,
    instructions_source: `${manifestPath}#agent_prompt`,
    eval_suite: `braintrust:eval:dify:${options.agentId}`,
    evals: {
      owner_system: 'braintrust',
      project: DEFAULT_BRAINTRUST_PROJECT,
      experiment: toSnakeCase(options.agentId),
      required_checks: requiredChecks,
      notes: 'Scaffolded. Add a dedicated Braintrust eval before publishing.'
    },
    owner: options.owner,
    write_policy: writeCapable ? 'requires_explicit_confirmation' : 'none',
    notes:
      'Scaffolded Dify agent entry. Import/publish in Dify Studio, then add smoke and Braintrust eval commands.'
  };
}

function buildEvalChecks(audience: AgentAudience, tools: DifyTool[]): EvalCheck[] {
  const checks = new Set<EvalCheck>(['api_health', 'secret_refusal', 'latency_budget']);

  if (tools.length > 0) {
    checks.add('expected_tool_use');
    checks.add('forbidden_tool_use');
    checks.add('grounded_answer');
  }

  if (tools.some(isWriteCapable)) checks.add('write_confirmation');
  if (audience === 'client' || audience === 'public') checks.add('policy_boundary');

  return Array.from(checks);
}

function renderAgentPrompt(
  options: ScaffoldOptions,
  server: DifyMcpServer,
  tools: DifyTool[]
): string {
  const writeTools = tools.filter(isWriteCapable).map((tool) => tool.name);

  return [
    `You are ${options.displayName} for CREATE SOMETHING.`,
    '',
    `Use the ${server.display_name} tools to help the user while staying inside the agent policy pack ${options.policyPack}.`,
    '',
    'Operating rules:',
    '1. Use MCP tool results as evidence. Do not fabricate tool outputs, records, transcripts, or external data.',
    '2. Keep answers concise and include relevant IDs, URLs, titles, statuses, and tool failure details when available.',
    '3. Never reveal API keys, bearer tokens, Infisical values, provider tokens, or internal credential material.',
    writeTools.length > 0
      ? `4. Before calling write-capable tools (${writeTools.join(', ')}), state the intended action and wait for explicit user confirmation.`
      : '4. This agent has no write-capable tools by default. Do not claim to perform external writes.',
    '5. If the requested action falls outside the enabled tools or policy pack, explain the boundary and ask for a narrower request.'
  ].join('\n');
}

function buildServiceApiSecretRef(agentId: string): SecretRef {
  return {
    environment: 'prod',
    path: `/dify/${agentId}`,
    secret_key: `DIFY_${toScreamingSnake(agentId)}_API_KEY`
  };
}

function printResult(
  options: ScaffoldOptions,
  manifestPath: string,
  manifest: unknown,
  inventoryEntry: DifyAgent
): void {
  const wrote: string[] = [];
  if (options.writeManifest) wrote.push(manifestPath);
  if (options.writeInventory) wrote.push('config/dify/inventory.json');

  console.log(`# Dify agent scaffold: ${options.agentId}`);
  console.log('');
  console.log(wrote.length > 0 ? `Wrote: ${wrote.join(', ')}` : 'Dry run: no files written.');
  console.log('');
  console.log('## Manifest');
  console.log('');
  console.log('```json');
  console.log(JSON.stringify(manifest, null, 2));
  console.log('```');
  console.log('');
  console.log('## Inventory agent entry');
  console.log('');
  console.log('```json');
  console.log(JSON.stringify(inventoryEntry, null, 2));
  console.log('```');
  console.log('');
  console.log('## Next steps');
  console.log('');
  console.log(
    '1. Import or configure the Dify app in Studio with the listed MCP server and tools.'
  );
  console.log('2. Store the Dify Service API key at the generated Infisical path.');
  console.log('3. Add a Dify smoke script and Braintrust eval under evals/braintrust/dify/.');
  console.log('4. Run pnpm dify:inventory:generate and pnpm dify:inventory:check.');
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

function isWriteCapable(tool: DifyTool): boolean {
  return tool.risk === 'write' || tool.risk === 'external_side_effect';
}

function titleize(value: string): string {
  return value
    .split('-')
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');
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

function printUsage(): void {
  console.log(`Usage:
  pnpm dify:agent:scaffold -- --agent-id <slug> --server-id <dify-mcp-server-id> [options]

Options:
  --display-name <name>       Human-readable app name. Defaults from --agent-id.
  --audience <value>          internal | client | public. Default: client.
  --status <value>            planned | draft | imported. Default: planned.
  --owner <value>             Inventory owner. Default: create-something.
  --policy-pack <value>       Policy pack ID. Default: client-<agent-id>.v1.
  --mode <value>              Dify app mode. Default: agent-chat.
  --description <value>       Manifest description.
  --tools <a,b,c>             Enabled tool subset. Default: every enabled tool on the server.
  --write-manifest            Write config/dify-agents/<agent-id>.json.
  --write-inventory           Add a planned/draft/imported agent entry to config/dify/inventory.json.
`);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
