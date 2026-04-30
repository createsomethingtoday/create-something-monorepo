#!/usr/bin/env tsx

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  callDifyChat,
  usedTool,
  type DifyChatInput,
  type DifyClientConfig
} from '../evals/braintrust/dify/shared.js';
import { readEnv, readOptionalEnvOrInfisicalSecret } from '../evals/braintrust/mcp/shared.js';

type ToolRisk = 'read' | 'write' | 'external_side_effect' | 'secret_sensitive' | 'unknown';

type SecretRef = {
  environment: string;
  path: string;
  secret_key: string;
};

type DifyTool = {
  name: string;
  enabled: boolean;
  risk: ToolRisk;
};

type DifyMcpServer = {
  tools: DifyTool[];
};

type DifyAgent = {
  display_name: string;
  status: string;
  service_api?: {
    base_url: string;
    api_key_secret: SecretRef;
  };
  enabled_tools: string[];
};

type DifyInventory = {
  mcp_servers: Record<string, DifyMcpServer>;
  agents: Record<string, DifyAgent>;
};

type CliOptions = {
  agentId: string;
  query: string;
  requiredTools: string[];
  forbiddenTools?: string[];
  expectedSubstrings: string[];
  allowWriteTools: boolean;
  user?: string;
  timeoutMs?: number;
};

const ROOT = process.cwd();
const INVENTORY_PATH = resolve(ROOT, 'config/dify/inventory.json');

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printUsage();
  process.exit(0);
}

const inventory = readJson<DifyInventory>(INVENTORY_PATH);
const options = buildOptions(args);
const agent = inventory.agents[options.agentId];

if (!agent) {
  fail(
    `Unknown Dify agent ${options.agentId}. Known agents: ${Object.keys(inventory.agents).join(', ')}`
  );
}

if (!agent.service_api) {
  fail(`Dify agent ${options.agentId} has no service_api entry in config/dify/inventory.json.`);
}

const forbiddenTools = options.allowWriteTools
  ? []
  : (options.forbiddenTools ?? inferWriteTools(inventory, agent));
const config = buildConfig(options, agent);
const input: DifyChatInput = {
  name: `smoke_${options.agentId}`,
  query: options.query,
  shouldUseTool: options.requiredTools[0],
  forbiddenTools
};
const output = await callDifyChat(input, config);

const missingRequiredTools = options.requiredTools.filter((tool) => !usedTool(output, tool));
const forbiddenToolsUsed = forbiddenTools.filter((tool) => usedTool(output, tool));
const missingExpectedSubstrings = options.expectedSubstrings.filter(
  (substring) => !output.answer.toLowerCase().includes(substring.toLowerCase())
);
const ok =
  !output.skipped &&
  output.ok &&
  missingRequiredTools.length === 0 &&
  forbiddenToolsUsed.length === 0 &&
  missingExpectedSubstrings.length === 0;

console.log(
  JSON.stringify(
    {
      ok,
      agentId: options.agentId,
      agentName: agent.display_name,
      agentStatus: agent.status,
      difyApiOk: output.ok,
      skipped: output.skipped,
      reason: output.reason,
      status: output.status,
      durationMs: output.durationMs,
      answer: output.answer,
      messageId: output.messageId,
      conversationId: output.conversationId,
      tools: output.toolCalls.map((call) => call.tool),
      requiredTools: options.requiredTools,
      missingRequiredTools,
      forbiddenTools,
      forbiddenToolsUsed,
      expectedSubstrings: options.expectedSubstrings,
      missingExpectedSubstrings,
      usage: output.usage,
      error: output.error
    },
    null,
    2
  )
);

if (!ok) process.exitCode = 1;

function buildOptions(args: Record<string, string | string[] | boolean>): CliOptions {
  const agentId = readRequiredStringArg(args, 'agent-id');
  const query = readRequiredStringArg(args, 'query');
  const requiredTools = normalizeToolNames(readStringListArg(args, 'require-tool'));
  const forbiddenTools = readStringListArg(args, 'forbid-tool');
  const forbiddenToolNames =
    forbiddenTools.length > 0 ? normalizeToolNames(forbiddenTools) : undefined;
  const expectedSubstrings = readStringListArg(args, 'expect');
  const timeoutArg = readOptionalStringArg(args, 'timeout-ms');

  return {
    agentId,
    query,
    requiredTools,
    forbiddenTools: forbiddenToolNames,
    expectedSubstrings,
    allowWriteTools: Boolean(args['allow-write-tools']),
    user: readOptionalStringArg(args, 'user'),
    timeoutMs: timeoutArg ? Number.parseInt(timeoutArg, 10) : undefined
  };
}

function buildConfig(options: CliOptions, agent: DifyAgent): DifyClientConfig {
  const secretRef = agent.service_api?.api_key_secret;
  if (!secretRef) fail(`Dify agent ${options.agentId} is missing service_api.api_key_secret.`);

  return {
    baseUrl: agent.service_api.base_url.replace(/\/+$/, ''),
    apiKey: readOptionalEnvOrInfisicalSecret(secretRef.secret_key, {
      secretName: secretRef.secret_key,
      environment: secretRef.environment,
      path: secretRef.path
    }),
    apiKeyDescription: `${secretRef.secret_key} or Infisical ${secretRef.environment}:${secretRef.path}`,
    user:
      options.user ??
      readEnv('DIFY_AGENT_SMOKE_USER', `dify-smoke-${options.agentId}`.slice(0, 120)),
    timeoutMs:
      options.timeoutMs ?? Number.parseInt(readEnv('DIFY_AGENT_SMOKE_TIMEOUT_MS', '45000'), 10)
  };
}

function inferWriteTools(inventory: DifyInventory, agent: DifyAgent): string[] {
  const forbidden = new Set<string>();

  for (const ref of agent.enabled_tools) {
    const parsed = parseToolRef(ref);
    if (!parsed) continue;

    const tool = inventory.mcp_servers[parsed.serverId]?.tools.find(
      (candidate) => candidate.name === parsed.toolName
    );
    if (tool?.risk === 'write' || tool?.risk === 'external_side_effect') {
      forbidden.add(tool.name);
    }
  }

  return Array.from(forbidden);
}

function parseArgs(argv: string[]): Record<string, string | string[] | boolean> {
  const parsed: Record<string, string | string[] | boolean> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') continue;
    if (!arg.startsWith('--')) fail(`Unexpected positional argument: ${arg}`);

    const withoutPrefix = arg.slice(2);
    const equalsIndex = withoutPrefix.indexOf('=');
    if (equalsIndex >= 0) {
      appendArg(parsed, withoutPrefix.slice(0, equalsIndex), withoutPrefix.slice(equalsIndex + 1));
      continue;
    }

    const name = withoutPrefix;
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      parsed[name] = true;
      continue;
    }

    appendArg(parsed, name, value);
    index += 1;
  }

  return parsed;
}

function appendArg(
  args: Record<string, string | string[] | boolean>,
  name: string,
  value: string
): void {
  if (name === 'require-tool' || name === 'forbid-tool' || name === 'expect') {
    const existing = args[name];
    const values = splitList(value);
    args[name] = Array.isArray(existing) ? [...existing, ...values] : values;
    return;
  }

  args[name] = value;
}

function readRequiredStringArg(
  args: Record<string, string | string[] | boolean>,
  name: string
): string {
  const value = readOptionalStringArg(args, name);
  if (!value) {
    printUsage();
    fail(`Missing required --${name}`);
  }
  return value;
}

function readOptionalStringArg(
  args: Record<string, string | string[] | boolean>,
  name: string
): string | undefined {
  const value = args[name];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function readStringListArg(
  args: Record<string, string | string[] | boolean>,
  name: string
): string[] {
  const value = args[name];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return splitList(value);
  return [];
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeToolNames(tools: string[]): string[] {
  return tools.map((tool) => {
    const index = tool.lastIndexOf('.');
    return index >= 0 ? tool.slice(index + 1) : tool;
  });
}

function parseToolRef(ref: string): { serverId: string; toolName: string } | undefined {
  const index = ref.indexOf('.');
  if (index <= 0 || index === ref.length - 1) return undefined;
  return {
    serverId: ref.slice(0, index),
    toolName: ref.slice(index + 1)
  };
}

function readJson<T>(path: string): T {
  if (!existsSync(path)) fail(`Missing required file: ${path}`);
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function printUsage(): void {
  console.log(`Usage:
  pnpm dify:agent:smoke -- \\
    --agent-id <inventory-agent-id> \\
    --query <prompt> \\
    [--require-tool <tool>] \\
    [--forbid-tool <tool>] \\
    [--expect <answer-substring>] \\
    [--allow-write-tools]

Examples:
  pnpm dify:agent:smoke -- \\
    --agent-id youtube-transcript-notion-agent \\
    --query "Extract the transcript for https://www.youtube.com/watch?v=sEQ1ecQq0HI and reply with only the video title, extraction method, and segment count. Do not sync or write to Notion." \\
    --require-tool extract_transcript \\
    --expect "What a Billion Database Rows Look Like in Real Life" \\
    --expect supadata \\
    --expect 154
`);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
