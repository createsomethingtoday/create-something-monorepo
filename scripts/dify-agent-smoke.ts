#!/usr/bin/env tsx

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  answerContains,
  buildDifyClientConfig,
  callDifyChat,
  observationsContain,
  usedForbiddenTool,
  usedTool,
  type DifyChatInput
} from '../evals/braintrust/dify/shared.js';

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
  smoke_command?: string;
};

type DifyInventory = {
  mcp_servers: Record<string, DifyMcpServer>;
  agents: Record<string, DifyAgent>;
};

type SmokeOptions = {
  inventoryPath: string;
  agentId?: string;
  query?: string;
  expectedTools: string[];
  forbiddenTools: string[];
  expectedAnswers: string[];
  expectedObservations: string[];
  allowWriteTools: boolean;
  user?: string;
  baseUrl?: string;
  apiKeyEnv?: string;
  secretName?: string;
  infisicalEnvironment?: string;
  infisicalPath?: string;
  timeoutMs?: number;
  dryRun: boolean;
  listAgents: boolean;
};

const ROOT = process.cwd();
const DEFAULT_INVENTORY_PATH = 'config/dify/inventory.json';

function parseArgs(argv: string[]): SmokeOptions {
  const options: SmokeOptions = {
    inventoryPath: process.env.DIFY_AGENT_INVENTORY_PATH?.trim() || DEFAULT_INVENTORY_PATH,
    agentId: process.env.DIFY_AGENT_ID?.trim(),
    query: process.env.DIFY_AGENT_SMOKE_QUERY?.trim(),
    expectedTools: splitEnvList(process.env.DIFY_AGENT_SMOKE_EXPECT_TOOL),
    forbiddenTools: splitEnvList(process.env.DIFY_AGENT_SMOKE_FORBID_TOOL),
    expectedAnswers: splitEnvList(process.env.DIFY_AGENT_SMOKE_EXPECT_ANSWER),
    expectedObservations: splitEnvList(process.env.DIFY_AGENT_SMOKE_EXPECT_OBSERVATION),
    allowWriteTools: process.env.DIFY_AGENT_SMOKE_ALLOW_WRITE_TOOLS === 'true',
    user: process.env.DIFY_AGENT_SMOKE_USER?.trim(),
    baseUrl: process.env.DIFY_AGENT_BASE_URL?.trim(),
    apiKeyEnv: process.env.DIFY_AGENT_API_KEY_ENV?.trim(),
    secretName: process.env.DIFY_AGENT_API_KEY_SECRET_NAME?.trim(),
    infisicalEnvironment: process.env.DIFY_AGENT_INFISICAL_ENV?.trim(),
    infisicalPath: process.env.DIFY_AGENT_INFISICAL_PATH?.trim(),
    timeoutMs: numericEnv(process.env.DIFY_AGENT_EVAL_TIMEOUT_MS),
    dryRun: false,
    listAgents: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    switch (arg) {
      case '--':
        break;
      case '--inventory':
        options.inventoryPath = readFlagValue(arg, next);
        index += 1;
        break;
      case '--agent':
      case '--agent-id':
        options.agentId = readFlagValue(arg, next);
        index += 1;
        break;
      case '--query':
        options.query = readFlagValue(arg, next);
        index += 1;
        break;
      case '--expect-tool':
      case '--require-tool':
        options.expectedTools.push(readFlagValue(arg, next));
        index += 1;
        break;
      case '--forbid-tool':
        options.forbiddenTools.push(readFlagValue(arg, next));
        index += 1;
        break;
      case '--expect-answer':
      case '--expect':
        options.expectedAnswers.push(readFlagValue(arg, next));
        index += 1;
        break;
      case '--expect-observation':
        options.expectedObservations.push(readFlagValue(arg, next));
        index += 1;
        break;
      case '--allow-write-tools':
        options.allowWriteTools = true;
        break;
      case '--user':
        options.user = readFlagValue(arg, next);
        index += 1;
        break;
      case '--base-url':
        options.baseUrl = readFlagValue(arg, next);
        index += 1;
        break;
      case '--api-key-env':
        options.apiKeyEnv = readFlagValue(arg, next);
        index += 1;
        break;
      case '--secret-name':
        options.secretName = readFlagValue(arg, next);
        index += 1;
        break;
      case '--infisical-env':
        options.infisicalEnvironment = readFlagValue(arg, next);
        index += 1;
        break;
      case '--infisical-path':
        options.infisicalPath = readFlagValue(arg, next);
        index += 1;
        break;
      case '--timeout-ms':
        options.timeoutMs = parsePositiveInt(readFlagValue(arg, next), arg);
        index += 1;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--list-agents':
        options.listAgents = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
      default:
        throw new Error(`Unknown flag: ${arg}`);
    }
  }

  return options;
}

function splitEnvList(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function numericEnv(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function readFlagValue(flag: string, value: string | undefined): string {
  if (!value?.trim()) throw new Error(`Missing value for ${flag}.`);
  return value.trim();
}

function parsePositiveInt(value: string, flag: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${flag} must be a positive integer.`);
  }
  return parsed;
}

function loadInventory(path: string): DifyInventory {
  const absolutePath = resolve(ROOT, path);
  if (!existsSync(absolutePath)) throw new Error(`Missing required file: ${path}`);
  return JSON.parse(readFileSync(absolutePath, 'utf8')) as DifyInventory;
}

function selectAgent(inventory: DifyInventory, agentId: string | undefined): { id: string; agent: DifyAgent } {
  const entries = Object.entries(inventory.agents ?? {});
  if (agentId) {
    const agent = inventory.agents?.[agentId];
    if (!agent) {
      throw new Error(`Unknown Dify agent ${agentId}. Known agents: ${entries.map(([id]) => id).join(', ')}`);
    }
    return { id: agentId, agent };
  }

  if (entries.length === 1) {
    const [id, agent] = entries[0]!;
    return { id, agent };
  }

  throw new Error('Missing --agent. Use --list-agents to inspect known Dify agents.');
}

function defaultQuery(agent: DifyAgent): string {
  return [
    `Smoke test for ${agent.display_name}.`,
    'Briefly describe your configured purpose and name one enabled tool.',
    'Do not perform any writes or external side effects.'
  ].join(' ');
}

function localToolName(tool: string): string {
  return tool.includes('.') ? tool.split('.').at(-1) ?? tool : tool;
}

function uniqueTools(tools: string[]): string[] {
  return Array.from(new Set(tools.map(localToolName).filter(Boolean)));
}

function inferWriteTools(inventory: DifyInventory, agent: DifyAgent): string[] {
  const forbidden = new Set<string>();

  for (const ref of agent.enabled_tools ?? []) {
    const index = ref.indexOf('.');
    if (index <= 0 || index >= ref.length - 1) continue;

    const serverId = ref.slice(0, index);
    const toolName = ref.slice(index + 1);
    const tool = inventory.mcp_servers?.[serverId]?.tools.find((candidate) => candidate.name === toolName);
    if (tool?.risk === 'write' || tool?.risk === 'external_side_effect') {
      forbidden.add(tool.name);
    }
  }

  return Array.from(forbidden);
}

function printAgents(inventory: DifyInventory): void {
  console.log(
    JSON.stringify(
      Object.entries(inventory.agents ?? {}).map(([id, agent]) => ({
        id,
        displayName: agent.display_name,
        status: agent.status,
        serviceApiConfigured: Boolean(agent.service_api?.api_key_secret),
        infisicalPath: agent.service_api?.api_key_secret.path,
        secretKey: agent.service_api?.api_key_secret.secret_key,
        inferredWriteTools: inferWriteTools(inventory, agent),
        smokeCommand: agent.smoke_command
      })),
      null,
      2
    )
  );
}

function printHelp(): void {
  console.log(`Usage:
  pnpm dify:agent:smoke -- --agent <agent-id> [options]

Options:
  --list-agents                       Print known Dify inventory agents.
  --inventory <path>                  Inventory path. Default: config/dify/inventory.json.
  --agent, --agent-id <id>            Dify agent id from inventory. Optional when only one exists.
  --query <text>                      Prompt sent to the Dify Service API.
  --expect-tool, --require-tool <name> Require a tool call. Repeatable.
  --forbid-tool <name>                Fail if a tool is used. Repeatable.
  --expect-answer, --expect <text>    Require answer text. Repeatable.
  --expect-observation <text>         Require tool observation text. Repeatable.
  --allow-write-tools                 Do not infer write-capable tools as forbidden.
  --user <id>                         Dify API user id.
  --base-url <url>                    Override Service API base URL.
  --api-key-env <name>                Environment variable to read before Infisical lookup.
  --secret-name <name>                Infisical secret name override.
  --infisical-env <name>              Infisical environment override.
  --infisical-path <path>             Infisical path override.
  --timeout-ms <number>               Request timeout.
  --dry-run                           Print resolved smoke plan without calling Dify.
`);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const inventory = loadInventory(options.inventoryPath);

  if (options.listAgents) {
    printAgents(inventory);
    return;
  }

  const { id: agentId, agent } = selectAgent(inventory, options.agentId);
  const secretRef = agent.service_api?.api_key_secret;
  if (!agent.service_api && !options.baseUrl) {
    throw new Error(`Dify agent ${agentId} does not declare service_api.base_url; pass --base-url to override.`);
  }
  if (!secretRef && !options.apiKeyEnv) {
    throw new Error(
      `Dify agent ${agentId} does not declare service_api.api_key_secret; pass --api-key-env to override.`
    );
  }

  const config = buildDifyClientConfig({
    baseUrl: options.baseUrl ?? agent.service_api?.base_url,
    apiKeyEnv: options.apiKeyEnv ?? secretRef?.secret_key,
    secretName: options.secretName ?? secretRef?.secret_key,
    infisicalEnvironment: options.infisicalEnvironment ?? secretRef?.environment,
    infisicalPath: options.infisicalPath ?? secretRef?.path,
    user: options.user ?? `dify-agent-smoke-${agentId}`,
    timeoutMs: options.timeoutMs,
    skipSecretLookup: options.dryRun
  });
  const expectedTools = uniqueTools(options.expectedTools);
  const inferredForbiddenTools = options.allowWriteTools ? [] : inferWriteTools(inventory, agent);
  const forbiddenTools = uniqueTools([...inferredForbiddenTools, ...options.forbiddenTools]);
  const input: DifyChatInput = {
    name: `cli_smoke:${agentId}`,
    query: options.query ?? defaultQuery(agent),
    forbiddenTools
  };

  if (options.dryRun) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          dryRun: true,
          agentId,
          displayName: agent.display_name,
          status: agent.status,
          baseUrl: config.baseUrl,
          user: config.user,
          timeoutMs: config.timeoutMs,
          apiKeyConfigured: Boolean(config.apiKey),
          infisicalPath: secretRef?.path,
          secretKey: secretRef?.secret_key,
          query: input.query,
          expectedTools,
          inferredForbiddenTools,
          forbiddenTools,
          expectedAnswers: options.expectedAnswers,
          expectedObservations: options.expectedObservations,
          enabledTools: agent.enabled_tools
        },
        null,
        2
      )
    );
    return;
  }

  const output = await callDifyChat(input, config);
  const requiredToolResults = expectedTools.map((tool) => ({ tool, used: usedTool(output, tool) }));
  const forbiddenToolsUsed = forbiddenTools.filter((tool) => usedForbiddenTool(output, [tool]));
  const expectedAnswerResults = options.expectedAnswers.map((text) => ({
    text,
    present: answerContains(output, text)
  }));
  const expectedObservationResults = options.expectedObservations.map((text) => ({
    text,
    present: observationsContain(output, text)
  }));
  const smokePassed =
    !output.skipped &&
    output.ok &&
    requiredToolResults.every((result) => result.used) &&
    forbiddenToolsUsed.length === 0 &&
    expectedAnswerResults.every((result) => result.present) &&
    expectedObservationResults.every((result) => result.present);

  console.log(
    JSON.stringify(
      {
        ok: smokePassed,
        agentId,
        displayName: agent.display_name,
        difyApiOk: output.ok,
        skipped: output.skipped,
        reason: output.reason,
        status: output.status,
        durationMs: output.durationMs,
        answer: output.answer,
        messageId: output.messageId,
        conversationId: output.conversationId,
        tools: output.toolCalls.map((call) => call.tool),
        requiredTools: requiredToolResults,
        inferredForbiddenTools,
        forbiddenToolsUsed,
        expectedAnswers: expectedAnswerResults,
        expectedObservations: expectedObservationResults,
        usage: output.usage,
        error: output.error
      },
      null,
      2
    )
  );

  if (!smokePassed) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
