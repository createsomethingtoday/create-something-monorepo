#!/usr/bin/env tsx

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

type ToolRisk = 'read' | 'write' | 'external_side_effect' | 'secret_sensitive' | 'unknown';
type AgentStatus = 'planned' | 'draft' | 'imported' | 'published' | 'retired';
type AgentAudience = 'internal' | 'client' | 'public';
type WritePolicy = 'none' | 'requires_explicit_confirmation' | 'disabled';
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
    local_command?: string;
    published_command?: string;
    required_checks: EvalCheck[];
    last_verified_at?: string;
    notes?: string;
  };
  smoke_command?: string;
  smoke_cases?: DifySmokeCase[];
  owner: string;
  write_policy?: WritePolicy;
  notes?: string;
};

type DifySmokeCase = {
  id: string;
  query: string;
  required_tools?: string[];
  forbidden_tools?: string[];
  expected_answer_substrings?: string[];
  forbidden_answer_substrings?: string[];
  allow_write_tools?: boolean;
  timeout_ms?: number;
  max_attempts?: number;
  notes?: string;
};

type DifyInventory = {
  version: number;
  workspace: {
    name: string;
    provider: 'dify_cloud' | 'self_hosted';
    base_url: string;
  };
  status: 'partial' | 'complete';
  snapshot?: {
    last_manual_inventory_at?: string;
    source?: string;
    notes?: string;
  };
  mcp_servers: Record<string, DifyMcpServer>;
  agents: Record<string, DifyAgent>;
};

type McpHubRegistry = {
  version: number;
  servers: Record<string, { transport: string; url?: string }>;
};

const ROOT = process.cwd();
const INVENTORY_PATH = resolve(ROOT, 'config/dify/inventory.json');
const SCHEMA_PATH = resolve(ROOT, 'config/dify/inventory.schema.json');
const MCP_REGISTRY_PATH = resolve(ROOT, 'config/mcp-hub/registry.json');
const GENERATED_DOC_PATH = resolve(ROOT, 'docs/DIFY_WORKSPACE_INVENTORY.generated.md');
const VALID_EVAL_CHECKS = new Set<EvalCheck>([
  'api_health',
  'expected_tool_use',
  'forbidden_tool_use',
  'grounded_answer',
  'write_confirmation',
  'secret_refusal',
  'latency_budget',
  'policy_boundary',
  'tenant_isolation',
  'error_recovery'
]);

// Manifests in these statuses describe agents that are NOT yet present in
// Dify Studio (e.g. `draft_pending_studio_import` for an unimported DSL).
// The inventory only tracks live agents, so demanding coverage for drafts
// is a category error. Bump this set when introducing new draft statuses.
const DRAFT_MANIFEST_STATUSES = new Set<string>([
  'draft_pending_studio_import',
  'draft',
  'planned',
]);

function isDraftManifestFile(absolutePath: string): boolean {
  try {
    const raw = readFileSync(absolutePath, 'utf-8');
    const parsed = JSON.parse(raw) as { status?: unknown };
    return typeof parsed.status === 'string' && DRAFT_MANIFEST_STATUSES.has(parsed.status);
  } catch {
    // If the manifest is unreadable/non-JSON, treat it as non-draft so the
    // coverage rule still fires and the operator notices.
    return false;
  }
}

const command = (process.argv[2] ?? 'check').trim().toLowerCase();

if (!['check', 'generate', 'validate'].includes(command)) {
  console.error('Usage: tsx scripts/dify-inventory.ts [check|generate|validate]');
  process.exit(2);
}

for (const path of [INVENTORY_PATH, SCHEMA_PATH, MCP_REGISTRY_PATH]) {
  if (!existsSync(path)) {
    console.error(`Required file missing: ${relativeToRoot(path)}`);
    process.exit(1);
  }
}

const inventory = readJson<DifyInventory>(INVENTORY_PATH);
const mcpRegistry = readJson<McpHubRegistry>(MCP_REGISTRY_PATH);
const errors = validateInventory(inventory, mcpRegistry);

if (errors.length > 0) {
  console.error('Dify inventory validation failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

const generatedDoc = renderInventoryDoc(inventory);

if (command === 'validate') {
  console.log('Dify inventory validation passed.');
  process.exit(0);
}

if (command === 'generate') {
  writeFileSync(GENERATED_DOC_PATH, generatedDoc, 'utf8');
  console.log(`Wrote ${relativeToRoot(GENERATED_DOC_PATH)}`);
  process.exit(0);
}

if (!isFileContentEqual(GENERATED_DOC_PATH, generatedDoc)) {
  console.error('Dify inventory artifacts are out of date:');
  console.error(`- ${relativeToRoot(GENERATED_DOC_PATH)}`);
  console.error('Run: pnpm dify:inventory:generate');
  process.exit(1);
}

console.log('Dify inventory check passed.');

function validateInventory(inventory: DifyInventory, mcpRegistry: McpHubRegistry): string[] {
  const errors: string[] = [];

  if (inventory.version !== 1) {
    errors.push(`version must be 1 (received ${String(inventory.version)})`);
  }
  if (!isPlainObject(inventory.workspace)) {
    errors.push('workspace must be an object');
  }
  if (inventory.status !== 'partial' && inventory.status !== 'complete') {
    errors.push('status must be "partial" or "complete"');
  }
  if (!isPlainObject(inventory.mcp_servers) || Object.keys(inventory.mcp_servers).length === 0) {
    errors.push('mcp_servers must be a non-empty object');
  }
  if (!isPlainObject(inventory.agents) || Object.keys(inventory.agents).length === 0) {
    errors.push('agents must be a non-empty object');
  }

  const serverIds = new Set(Object.keys(inventory.mcp_servers ?? {}));
  const manifestPaths = new Set<string>();

  for (const [serverId, server] of Object.entries(inventory.mcp_servers ?? {})) {
    validateMcpServer(serverId, server, mcpRegistry, errors);
  }

  for (const [agentId, agent] of Object.entries(inventory.agents ?? {})) {
    validateAgent(agentId, agent, inventory, serverIds, manifestPaths, errors);
  }

  validateManifestCoverage(manifestPaths, errors);

  return errors;
}

function validateMcpServer(
  serverId: string,
  server: DifyMcpServer,
  mcpRegistry: McpHubRegistry,
  errors: string[]
): void {
  if (!isPlainObject(server)) {
    errors.push(`mcp server ${serverId}: must be an object`);
    return;
  }

  if (!server.display_name) errors.push(`mcp server ${serverId}: display_name is required`);
  if (server.transport !== 'http') errors.push(`mcp server ${serverId}: transport must be http`);
  if (!server.url) errors.push(`mcp server ${serverId}: url is required`);
  if (!Array.isArray(server.tools) || server.tools.length === 0) {
    errors.push(`mcp server ${serverId}: tools must be a non-empty array`);
  }

  if (server.auth?.type !== 'none' && !server.auth?.infisical) {
    errors.push(`mcp server ${serverId}: non-none auth requires an Infisical secret reference`);
  }
  if (server.auth?.infisical) {
    validateSecretRef(`mcp server ${serverId}`, server.auth.infisical, errors);
  }

  if (server.source_mcp_registry_server) {
    const source = mcpRegistry.servers?.[server.source_mcp_registry_server];
    if (!source) {
      errors.push(
        `mcp server ${serverId}: source_mcp_registry_server ${server.source_mcp_registry_server} is not in config/mcp-hub/registry.json`
      );
    } else if (source.transport === 'http' && source.url && source.url !== server.url) {
      errors.push(
        `mcp server ${serverId}: url does not match source registry server ${server.source_mcp_registry_server}`
      );
    }
  }

  const tools = new Set<string>();
  for (const tool of server.tools ?? []) {
    if (!tool.name) {
      errors.push(`mcp server ${serverId}: every tool needs a name`);
      continue;
    }
    if (tools.has(tool.name)) {
      errors.push(`mcp server ${serverId}: duplicate tool ${tool.name}`);
    }
    tools.add(tool.name);
    if (tool.risk === 'write' && tool.enabled && tool.requires_user_confirmation !== true) {
      errors.push(`mcp server ${serverId}: write tool ${tool.name} must require user confirmation`);
    }
  }
}

function validateAgent(
  agentId: string,
  agent: DifyAgent,
  inventory: DifyInventory,
  serverIds: Set<string>,
  manifestPaths: Set<string>,
  errors: string[]
): void {
  if (!isPlainObject(agent)) {
    errors.push(`agent ${agentId}: must be an object`);
    return;
  }

  if (agent.runtime !== 'dify') errors.push(`agent ${agentId}: runtime must be dify`);
  if (agent.status === 'published' && !agent.service_api) {
    errors.push(`agent ${agentId}: published agents require service_api secret reference`);
  }
  if (agent.service_api)
    validateSecretRef(`agent ${agentId} service_api`, agent.service_api.api_key_secret, errors);

  for (const path of [agent.manifest_path, agent.dsl_path]) {
    if (!path) continue;
    const fullPath = resolve(ROOT, path);
    if (!existsSync(fullPath)) {
      errors.push(`agent ${agentId}: referenced file does not exist: ${path}`);
    }
  }
  if (agent.manifest_path) manifestPaths.add(normalizePath(agent.manifest_path));

  for (const serverId of agent.allowed_mcp_servers ?? []) {
    if (!serverIds.has(serverId)) {
      errors.push(`agent ${agentId}: allowed_mcp_servers references unknown server ${serverId}`);
    }
  }

  const allowedServers = new Set(agent.allowed_mcp_servers ?? []);
  let enablesWriteTool = false;

  for (const ref of agent.enabled_tools ?? []) {
    const parsed = parseToolRef(ref);
    if (!parsed) {
      errors.push(`agent ${agentId}: enabled tool ref must be server_id.tool_name, got ${ref}`);
      continue;
    }
    if (!allowedServers.has(parsed.serverId)) {
      errors.push(`agent ${agentId}: enabled tool ${ref} is not in allowed_mcp_servers`);
    }

    const server = inventory.mcp_servers[parsed.serverId];
    const tool = server?.tools.find((candidate) => candidate.name === parsed.toolName);
    if (!tool) {
      errors.push(
        `agent ${agentId}: enabled tool ${ref} does not exist in Dify MCP server inventory`
      );
      continue;
    }
    if (!tool.enabled) {
      errors.push(`agent ${agentId}: enabled tool ${ref} points at a disabled MCP tool`);
    }
    if (tool.risk === 'write' || tool.risk === 'external_side_effect') {
      enablesWriteTool = true;
    }
  }

  if (enablesWriteTool && agent.write_policy !== 'requires_explicit_confirmation') {
    errors.push(
      `agent ${agentId}: write-capable tools require write_policy requires_explicit_confirmation`
    );
  }

  validateAgentEvals(agentId, agent, enablesWriteTool, errors);
  validateAgentSmokeCases(agentId, agent, inventory, errors);
}

function validateManifestCoverage(manifestPaths: Set<string>, errors: string[]): void {
  const agentManifestDir = resolve(ROOT, 'config/dify-agents');
  if (!existsSync(agentManifestDir)) return;

  const manifestList = readDirRecursive(agentManifestDir)
    .filter((path) => path.endsWith('.json'))
    .map((path) => normalizePath(path));

  for (const path of manifestList) {
    if (manifestPaths.has(path)) continue;
    const absolute = resolve(ROOT, path);
    if (isDraftManifestFile(absolute)) continue;
    errors.push(`manifest ${path} is not referenced by config/dify/inventory.json`);
  }
}

function validateAgentEvals(
  agentId: string,
  agent: DifyAgent,
  enablesWriteTool: boolean,
  errors: string[]
): void {
  if (!isPlainObject(agent.evals)) {
    errors.push(`agent ${agentId}: evals is required`);
    return;
  }

  if (agent.evals.owner_system !== 'braintrust') {
    errors.push(`agent ${agentId}: evals.owner_system must be braintrust`);
  }
  if (!agent.eval_suite.startsWith('braintrust:')) {
    errors.push(`agent ${agentId}: eval_suite must point at a Braintrust command`);
  }
  if (!Array.isArray(agent.evals.required_checks) || agent.evals.required_checks.length === 0) {
    errors.push(`agent ${agentId}: evals.required_checks must be a non-empty array`);
    return;
  }

  const checks = new Set<string>();
  for (const check of agent.evals.required_checks) {
    if (!VALID_EVAL_CHECKS.has(check)) {
      errors.push(`agent ${agentId}: unknown eval check ${String(check)}`);
    }
    if (checks.has(check)) {
      errors.push(`agent ${agentId}: duplicate eval check ${check}`);
    }
    checks.add(check);
  }

  if (agent.status === 'published') {
    if (!agent.evals.local_command) {
      errors.push(`agent ${agentId}: published agents require evals.local_command`);
    }
    if (!agent.evals.published_command) {
      errors.push(`agent ${agentId}: published agents require evals.published_command`);
    }
  }

  requireEvalChecks(agentId, checks, ['api_health', 'secret_refusal', 'latency_budget'], errors);

  if (agent.enabled_tools.length > 0) {
    requireEvalChecks(agentId, checks, ['expected_tool_use', 'forbidden_tool_use'], errors);
  }

  if (enablesWriteTool) {
    requireEvalChecks(agentId, checks, ['write_confirmation'], errors);
  }
}

function requireEvalChecks(
  agentId: string,
  checks: Set<string>,
  required: EvalCheck[],
  errors: string[]
): void {
  for (const check of required) {
    if (!checks.has(check)) {
      errors.push(`agent ${agentId}: missing required eval check ${check}`);
    }
  }
}

function validateAgentSmokeCases(
  agentId: string,
  agent: DifyAgent,
  inventory: DifyInventory,
  errors: string[]
): void {
  if (
    agent.status === 'published' &&
    (!Array.isArray(agent.smoke_cases) || agent.smoke_cases.length === 0)
  ) {
    errors.push(`agent ${agentId}: published agents require at least one smoke_cases entry`);
    return;
  }

  if (!agent.smoke_cases) return;

  const enabledToolNames = new Set(
    agent.enabled_tools
      .map((ref) => parseToolRef(ref)?.toolName)
      .filter((toolName): toolName is string => Boolean(toolName))
  );
  const allToolNames = new Set<string>();

  for (const ref of agent.enabled_tools) {
    const parsed = parseToolRef(ref);
    if (!parsed) continue;
    const server = inventory.mcp_servers[parsed.serverId];
    for (const tool of server?.tools ?? []) {
      allToolNames.add(tool.name);
    }
  }

  const ids = new Set<string>();
  for (const smokeCase of agent.smoke_cases) {
    const context = `agent ${agentId} smoke case ${smokeCase?.id ?? '<missing id>'}`;
    if (!isPlainObject(smokeCase)) {
      errors.push(`agent ${agentId}: every smoke case must be an object`);
      continue;
    }
    if (!smokeCase.id || !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(smokeCase.id)) {
      errors.push(`${context}: id must be a lowercase slug`);
    }
    if (ids.has(smokeCase.id)) {
      errors.push(`${context}: duplicate smoke case id`);
    }
    ids.add(smokeCase.id);
    if (!smokeCase.query) {
      errors.push(`${context}: query is required`);
    }

    for (const tool of smokeCase.required_tools ?? []) {
      const name = normalizeToolName(tool);
      if (!enabledToolNames.has(name)) {
        errors.push(`${context}: required tool ${tool} is not enabled by the agent`);
      }
    }

    for (const tool of smokeCase.forbidden_tools ?? []) {
      const name = normalizeToolName(tool);
      if (!allToolNames.has(name)) {
        errors.push(`${context}: forbidden tool ${tool} is not known to the agent's MCP servers`);
      }
    }

    for (const expected of smokeCase.expected_answer_substrings ?? []) {
      if (!expected || expected.trim().length === 0) {
        errors.push(`${context}: expected_answer_substrings cannot contain empty values`);
      }
    }
    for (const forbidden of smokeCase.forbidden_answer_substrings ?? []) {
      if (!forbidden || forbidden.trim().length === 0) {
        errors.push(`${context}: forbidden_answer_substrings cannot contain empty values`);
      }
    }

    if (
      smokeCase.max_attempts !== undefined &&
      (!Number.isInteger(smokeCase.max_attempts) ||
        smokeCase.max_attempts < 1 ||
        smokeCase.max_attempts > 5)
    ) {
      errors.push(`${context}: max_attempts must be an integer from 1 to 5`);
    }
  }
}

function renderInventoryDoc(inventory: DifyInventory): string {
  const lines: string[] = [
    '# Dify Workspace Inventory (Generated)',
    '',
    '> Auto-generated from `config/dify/inventory.json`.',
    '> Regenerate with `pnpm dify:inventory:generate`.',
    '',
    `Workspace: ${inventory.workspace.name} (${inventory.workspace.provider})`,
    `Status: ${inventory.status}`,
    ''
  ];

  if (inventory.snapshot) {
    lines.push('## Snapshot', '');
    lines.push(
      `- Last manual inventory: ${inventory.snapshot.last_manual_inventory_at ?? 'unknown'}`
    );
    lines.push(`- Source: ${inventory.snapshot.source ?? 'unknown'}`);
    if (inventory.snapshot.notes) lines.push(`- Notes: ${inventory.snapshot.notes}`);
    lines.push('');
  }

  lines.push('## MCP Server Cards', '');
  lines.push(
    '| Dify Server ID | Source MCP Registry Server | URL | Auth | Enabled Tools | Write Tools |'
  );
  lines.push('| --- | --- | --- | --- | ---: | --- |');
  for (const [serverId, server] of Object.entries(inventory.mcp_servers)) {
    const enabledTools = server.tools.filter((tool) => tool.enabled);
    const writeTools = enabledTools
      .filter((tool) => tool.risk === 'write' || tool.risk === 'external_side_effect')
      .map((tool) => code(tool.name))
      .join(', ');
    lines.push(
      `| ${code(serverId)} | ${codeOrDash(server.source_mcp_registry_server)} | ${code(server.url)} | ${code(server.auth.type)} | ${String(enabledTools.length)} | ${writeTools || '-'} |`
    );
  }
  lines.push('');

  lines.push('## Agents', '');
  lines.push('| Agent | Status | Audience | App ID | MCP Servers | Enabled Tools | Eval Suite |');
  lines.push('| --- | --- | --- | --- | --- | ---: | --- |');
  for (const [agentId, agent] of Object.entries(inventory.agents)) {
    lines.push(
      `| ${code(agentId)} | ${code(agent.status)} | ${code(agent.audience)} | ${codeOrDash(agent.dify_app_id)} | ${agent.allowed_mcp_servers.map(code).join(', ')} | ${String(agent.enabled_tools.length)} | ${code(agent.eval_suite)} |`
    );
  }
  lines.push('');

  lines.push('## Eval Coverage', '');
  lines.push('| Agent | Owner | Project | Experiment | Required Checks | Last Verified |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const [agentId, agent] of Object.entries(inventory.agents)) {
    lines.push(
      `| ${code(agentId)} | ${code(agent.evals.owner_system)} | ${codeOrDash(agent.evals.project)} | ${codeOrDash(agent.evals.experiment)} | ${agent.evals.required_checks.map(code).join(', ')} | ${codeOrDash(agent.evals.last_verified_at)} |`
    );
  }
  lines.push('');

  lines.push('## Smoke Cases', '');
  lines.push(
    '| Agent | Case | Required Tools | Expected Answer Substrings | Forbidden Answer Substrings | Write Tools Allowed |'
  );
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const [agentId, agent] of Object.entries(inventory.agents)) {
    for (const smokeCase of agent.smoke_cases ?? []) {
      lines.push(
        `| ${code(agentId)} | ${code(smokeCase.id)} | ${formatList(smokeCase.required_tools)} | ${formatList(smokeCase.expected_answer_substrings)} | ${formatList(smokeCase.forbidden_answer_substrings)} | ${smokeCase.allow_write_tools === true ? 'yes' : 'no'} |`
      );
    }
  }
  lines.push('');

  lines.push('## Agent Tool Mapping', '');
  for (const [agentId, agent] of Object.entries(inventory.agents)) {
    lines.push(`### ${agent.display_name}`, '');
    lines.push(`- Inventory ID: ${code(agentId)}`);
    lines.push(`- Policy pack: ${code(agent.policy_pack)}`);
    if (agent.instructions_source)
      lines.push(`- Instructions source: ${code(agent.instructions_source)}`);
    if (agent.smoke_command) lines.push(`- Smoke: ${code(agent.smoke_command)}`);
    if (agent.evals.local_command) lines.push(`- Local eval: ${code(agent.evals.local_command)}`);
    if (agent.evals.published_command)
      lines.push(`- Published eval: ${code(agent.evals.published_command)}`);
    lines.push('- Tools:');
    for (const toolRef of agent.enabled_tools) {
      const parsed = parseToolRef(toolRef);
      const tool = parsed
        ? inventory.mcp_servers[parsed.serverId]?.tools.find(
            (candidate) => candidate.name === parsed.toolName
          )
        : undefined;
      const risk = tool?.risk ?? 'unknown';
      const writeNote = tool?.requires_user_confirmation ? ', confirmation required' : '';
      lines.push(`  - ${code(toolRef)} (${risk}${writeNote})`);
    }
    lines.push('');
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

function validateSecretRef(context: string, secret: SecretRef | undefined, errors: string[]): void {
  if (!secret) {
    errors.push(`${context}: missing secret reference`);
    return;
  }
  if (!secret.environment) errors.push(`${context}: secret environment is required`);
  if (!secret.path) errors.push(`${context}: secret path is required`);
  if (!secret.secret_key) errors.push(`${context}: secret_key is required`);
}

function parseToolRef(ref: string): { serverId: string; toolName: string } | undefined {
  const index = ref.indexOf('.');
  if (index <= 0 || index === ref.length - 1) return undefined;
  return {
    serverId: ref.slice(0, index),
    toolName: ref.slice(index + 1)
  };
}

function normalizeToolName(tool: string): string {
  const index = tool.lastIndexOf('.');
  return index >= 0 ? tool.slice(index + 1) : tool;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function isFileContentEqual(path: string, expected: string): boolean {
  return existsSync(path) && readFileSync(path, 'utf8') === expected;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function code(value: string): string {
  return `\`${value.replace(/`/g, '')}\``;
}

function codeOrDash(value: string | undefined): string {
  return value ? code(value) : '-';
}

function formatList(values: string[] | undefined): string {
  return values && values.length > 0 ? values.map(code).join(', ') : '-';
}

function normalizePath(path: string): string {
  return relativeToRoot(resolve(ROOT, path));
}

function relativeToRoot(path: string): string {
  return path.startsWith(`${ROOT}/`) ? path.slice(ROOT.length + 1) : path;
}

function readDirRecursive(root: string): string[] {
  const paths: string[] = [];
  for (const entry of readdirSync(root)) {
    const path = resolve(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      paths.push(...readDirRecursive(path));
    } else if (stat.isFile()) {
      paths.push(path);
    }
  }
  return paths;
}
