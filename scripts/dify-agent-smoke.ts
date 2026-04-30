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
  type DifyChatInput,
  type DifyChatOutput,
  type DifyClientConfig
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
  smoke_cases?: DifySmokeCase[];
};

type DifyInventory = {
  mcp_servers: Record<string, DifyMcpServer>;
  agents: Record<string, DifyAgent>;
};

type SmokeOptions = {
  inventoryPath: string;
  agentId?: string;
  caseIds: string[];
  query?: string;
  expectedTools: string[];
  forbiddenTools: string[];
  expectedAnswers: string[];
  forbiddenAnswers: string[];
  expectedObservations: string[];
  allowWriteTools: boolean;
  user?: string;
  baseUrl?: string;
  apiKeyEnv?: string;
  secretName?: string;
  infisicalEnvironment?: string;
  infisicalPath?: string;
  infisicalProjectId?: string;
  timeoutMs?: number;
  maxAttempts?: number;
  dryRun: boolean;
  listAgents: boolean;
};

type SmokeRunCase = {
  id: string;
  query: string;
  requiredTools: string[];
  forbiddenTools: string[];
  expectedAnswers: string[];
  forbiddenAnswers: string[];
  expectedObservations: string[];
  allowWriteTools: boolean;
  timeoutMs?: number;
  maxAttempts: number;
};

type SmokeAttemptResult = {
  attempt: number;
  ok: boolean;
  difyApiOk: boolean;
  skipped: boolean;
  reason?: string;
  status: number | null;
  durationMs: number;
  answer: string;
  messageId?: string;
  conversationId?: string;
  tools: string[];
  requiredTools: Array<{ tool: string; used: boolean }>;
  missingRequiredTools: string[];
  forbiddenTools: string[];
  forbiddenToolsUsed: string[];
  expectedAnswers: Array<{ text: string; present: boolean }>;
  missingExpectedAnswers: string[];
  forbiddenAnswers: Array<{ text: string; present: boolean }>;
  presentForbiddenAnswers: string[];
  expectedObservations: Array<{ text: string; present: boolean }>;
  missingExpectedObservations: string[];
  usage?: unknown;
  error?: string;
};

type SmokeCaseResult = Omit<SmokeAttemptResult, 'attempt'> & {
  id: string;
  attemptCount: number;
  maxAttempts: number;
  attempts: SmokeAttemptResult[];
};

const ROOT = process.cwd();
const DEFAULT_INVENTORY_PATH = 'config/dify/inventory.json';

function parseArgs(argv: string[]): SmokeOptions {
  const options: SmokeOptions = {
    inventoryPath: process.env.DIFY_AGENT_INVENTORY_PATH?.trim() || DEFAULT_INVENTORY_PATH,
    agentId: process.env.DIFY_AGENT_ID?.trim(),
    caseIds: splitEnvList(process.env.DIFY_AGENT_SMOKE_CASE),
    query: process.env.DIFY_AGENT_SMOKE_QUERY?.trim(),
    expectedTools: splitEnvList(process.env.DIFY_AGENT_SMOKE_EXPECT_TOOL),
    forbiddenTools: splitEnvList(process.env.DIFY_AGENT_SMOKE_FORBID_TOOL),
    expectedAnswers: splitEnvList(process.env.DIFY_AGENT_SMOKE_EXPECT_ANSWER),
    forbiddenAnswers: splitEnvList(process.env.DIFY_AGENT_SMOKE_FORBID_ANSWER),
    expectedObservations: splitEnvList(process.env.DIFY_AGENT_SMOKE_EXPECT_OBSERVATION),
    allowWriteTools: process.env.DIFY_AGENT_SMOKE_ALLOW_WRITE_TOOLS === 'true',
    user: process.env.DIFY_AGENT_SMOKE_USER?.trim(),
    baseUrl: process.env.DIFY_AGENT_BASE_URL?.trim(),
    apiKeyEnv: process.env.DIFY_AGENT_API_KEY_ENV?.trim(),
    secretName: process.env.DIFY_AGENT_API_KEY_SECRET_NAME?.trim(),
    infisicalEnvironment: process.env.DIFY_AGENT_INFISICAL_ENV?.trim(),
    infisicalPath: process.env.DIFY_AGENT_INFISICAL_PATH?.trim(),
    infisicalProjectId: process.env.DIFY_AGENT_INFISICAL_PROJECT_ID?.trim(),
    timeoutMs: numericEnv(process.env.DIFY_AGENT_EVAL_TIMEOUT_MS),
    maxAttempts: numericEnv(process.env.DIFY_AGENT_SMOKE_MAX_ATTEMPTS),
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
      case '--case':
        options.caseIds.push(...splitEnvList(readFlagValue(arg, next)));
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
      case '--forbid-answer':
        options.forbiddenAnswers.push(readFlagValue(arg, next));
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
      case '--infisical-project-id':
        options.infisicalProjectId = readFlagValue(arg, next);
        index += 1;
        break;
      case '--timeout-ms':
        options.timeoutMs = parsePositiveInt(readFlagValue(arg, next), arg);
        index += 1;
        break;
      case '--max-attempts':
        options.maxAttempts = parsePositiveInt(readFlagValue(arg, next), arg);
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

  return {
    ...options,
    expectedTools: uniqueTools(options.expectedTools),
    forbiddenTools: uniqueTools(options.forbiddenTools),
    caseIds: Array.from(new Set(options.caseIds.filter(Boolean)))
  };
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

function selectAgent(
  inventory: DifyInventory,
  agentId: string | undefined
): { id: string; agent: DifyAgent } {
  const entries = Object.entries(inventory.agents ?? {});
  if (agentId) {
    const agent = inventory.agents?.[agentId];
    if (!agent) {
      throw new Error(
        `Unknown Dify agent ${agentId}. Known agents: ${entries.map(([id]) => id).join(', ')}`
      );
    }
    return { id: agentId, agent };
  }

  if (entries.length === 1) {
    const [id, agent] = entries[0]!;
    return { id, agent };
  }

  throw new Error('Missing --agent. Use --list-agents to inspect known Dify agents.');
}

function localToolName(tool: string): string {
  return tool.includes('.') ? (tool.split('.').at(-1) ?? tool) : tool;
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
    const tool = inventory.mcp_servers?.[serverId]?.tools.find(
      (candidate) => candidate.name === toolName
    );
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
        smokeCommand: agent.smoke_command,
        smokeCaseCount: agent.smoke_cases?.length ?? 0,
        smokeCases: agent.smoke_cases?.map((smokeCase) => smokeCase.id) ?? []
      })),
      null,
      2
    )
  );
}

function buildSmokeCases(
  inventory: DifyInventory,
  agent: DifyAgent,
  agentId: string,
  options: SmokeOptions
): SmokeRunCase[] {
  const inferredForbiddenTools = options.allowWriteTools ? [] : inferWriteTools(inventory, agent);

  if (options.query) {
    if (options.caseIds.length > 0) {
      throw new Error(
        '--case cannot be combined with --query. Use either an inventory smoke case or a one-off query.'
      );
    }

    return [
      {
        id: 'cli',
        query: options.query,
        requiredTools: options.expectedTools,
        forbiddenTools: uniqueTools([...inferredForbiddenTools, ...options.forbiddenTools]),
        expectedAnswers: options.expectedAnswers,
        forbiddenAnswers: options.forbiddenAnswers,
        expectedObservations: options.expectedObservations,
        allowWriteTools: options.allowWriteTools,
        timeoutMs: options.timeoutMs,
        maxAttempts: normalizeMaxAttempts(options.maxAttempts)
      }
    ];
  }

  if (
    options.expectedTools.length > 0 ||
    options.expectedAnswers.length > 0 ||
    options.forbiddenAnswers.length > 0 ||
    options.expectedObservations.length > 0
  ) {
    throw new Error(
      '--require-tool, --expect, --forbid-answer, and --expect-observation require --query for one-off smoke runs.'
    );
  }

  const inventoryCases = agent.smoke_cases ?? [];
  if (inventoryCases.length === 0) {
    throw new Error(
      `Dify agent ${agentId} has no smoke_cases. Pass --query for a one-off smoke or add cases to config/dify/inventory.json.`
    );
  }

  const selectedIds = new Set(options.caseIds);
  const selectedCases =
    selectedIds.size > 0
      ? inventoryCases.filter((smokeCase) => selectedIds.has(smokeCase.id))
      : inventoryCases;

  if (selectedCases.length === 0) {
    throw new Error(
      `No smoke_cases matched ${Array.from(selectedIds).join(', ')}. Known cases: ${inventoryCases
        .map((smokeCase) => smokeCase.id)
        .join(', ')}`
    );
  }

  return selectedCases.map((smokeCase) => {
    const allowWriteTools = smokeCase.allow_write_tools === true || options.allowWriteTools;
    return {
      id: smokeCase.id,
      query: smokeCase.query,
      requiredTools: uniqueTools(smokeCase.required_tools ?? []),
      forbiddenTools: allowWriteTools
        ? uniqueTools(smokeCase.forbidden_tools ?? [])
        : uniqueTools([...inferredForbiddenTools, ...(smokeCase.forbidden_tools ?? [])]),
      expectedAnswers: smokeCase.expected_answer_substrings ?? [],
      forbiddenAnswers: smokeCase.forbidden_answer_substrings ?? [],
      expectedObservations: [],
      allowWriteTools,
      timeoutMs: options.timeoutMs ?? smokeCase.timeout_ms,
      maxAttempts: normalizeMaxAttempts(options.maxAttempts ?? smokeCase.max_attempts)
    };
  });
}

function normalizeMaxAttempts(value: number | undefined): number {
  if (!value || !Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(5, Math.trunc(value)));
}

function buildConfig(
  options: SmokeOptions,
  agent: DifyAgent,
  agentId: string,
  smokeCase: SmokeRunCase,
  attempt: number
): DifyClientConfig {
  const secretRef = agent.service_api?.api_key_secret;

  return buildDifyClientConfig({
    baseUrl: options.baseUrl ?? agent.service_api?.base_url,
    apiKeyEnv: options.apiKeyEnv ?? secretRef?.secret_key,
    secretName: options.secretName ?? secretRef?.secret_key,
    infisicalEnvironment: options.infisicalEnvironment ?? secretRef?.environment,
    infisicalPath: options.infisicalPath ?? secretRef?.path,
    infisicalProjectId: options.infisicalProjectId,
    user: options.user ?? `dify-agent-smoke-${agentId}-${smokeCase.id}-${attempt}`.slice(0, 120),
    timeoutMs: smokeCase.timeoutMs ?? options.timeoutMs,
    skipSecretLookup: options.dryRun
  });
}

function buildAttemptResult(
  attempt: number,
  output: DifyChatOutput,
  smokeCase: SmokeRunCase
): SmokeAttemptResult {
  const requiredTools = smokeCase.requiredTools.map((tool) => ({
    tool,
    used: usedTool(output, tool)
  }));
  const forbiddenToolsUsed = smokeCase.forbiddenTools.filter((tool) =>
    usedForbiddenTool(output, [tool])
  );
  const expectedAnswers = smokeCase.expectedAnswers.map((text) => ({
    text,
    present: answerContains(output, text)
  }));
  const forbiddenAnswers = smokeCase.forbiddenAnswers.map((text) => ({
    text,
    present: answerContains(output, text)
  }));
  const expectedObservations = smokeCase.expectedObservations.map((text) => ({
    text,
    present: observationsContain(output, text)
  }));
  const missingRequiredTools = requiredTools
    .filter((result) => !result.used)
    .map((result) => result.tool);
  const missingExpectedAnswers = expectedAnswers
    .filter((result) => !result.present)
    .map((result) => result.text);
  const presentForbiddenAnswers = forbiddenAnswers
    .filter((result) => result.present)
    .map((result) => result.text);
  const missingExpectedObservations = expectedObservations
    .filter((result) => !result.present)
    .map((result) => result.text);
  const ok =
    !output.skipped &&
    output.ok &&
    missingRequiredTools.length === 0 &&
    forbiddenToolsUsed.length === 0 &&
    missingExpectedAnswers.length === 0 &&
    presentForbiddenAnswers.length === 0 &&
    missingExpectedObservations.length === 0;

  return {
    attempt,
    ok,
    difyApiOk: output.ok,
    skipped: output.skipped,
    reason: output.reason,
    status: output.status,
    durationMs: output.durationMs,
    answer: output.answer,
    messageId: output.messageId,
    conversationId: output.conversationId,
    tools: output.toolCalls.map((call) => call.tool),
    requiredTools,
    missingRequiredTools,
    forbiddenTools: smokeCase.forbiddenTools,
    forbiddenToolsUsed,
    expectedAnswers,
    missingExpectedAnswers,
    forbiddenAnswers,
    presentForbiddenAnswers,
    expectedObservations,
    missingExpectedObservations,
    usage: output.usage,
    error: output.error
  };
}

async function runSmokeCase(
  options: SmokeOptions,
  agent: DifyAgent,
  agentId: string,
  smokeCase: SmokeRunCase
): Promise<SmokeCaseResult> {
  const attempts: SmokeAttemptResult[] = [];
  let finalAttempt: SmokeAttemptResult | undefined;

  for (let attempt = 1; attempt <= smokeCase.maxAttempts; attempt += 1) {
    const config = buildConfig(options, agent, agentId, smokeCase, attempt);
    const input: DifyChatInput = {
      name: `cli_smoke:${agentId}:${smokeCase.id}:${attempt}`,
      query: smokeCase.query,
      shouldUseTool: smokeCase.requiredTools[0],
      forbiddenTools: smokeCase.forbiddenTools
    };
    const output = await callDifyChat(input, config);

    finalAttempt = buildAttemptResult(attempt, output, smokeCase);
    attempts.push(finalAttempt);
    if (finalAttempt.ok) break;
  }

  const result = finalAttempt ?? {
    attempt: 0,
    ok: false,
    difyApiOk: false,
    skipped: true,
    status: null,
    durationMs: 0,
    answer: '',
    tools: [],
    requiredTools: smokeCase.requiredTools.map((tool) => ({ tool, used: false })),
    missingRequiredTools: smokeCase.requiredTools,
    forbiddenTools: smokeCase.forbiddenTools,
    forbiddenToolsUsed: [],
    expectedAnswers: smokeCase.expectedAnswers.map((text) => ({ text, present: false })),
    missingExpectedAnswers: smokeCase.expectedAnswers,
    forbiddenAnswers: smokeCase.forbiddenAnswers.map((text) => ({ text, present: false })),
    presentForbiddenAnswers: [],
    expectedObservations: smokeCase.expectedObservations.map((text) => ({ text, present: false })),
    missingExpectedObservations: smokeCase.expectedObservations,
    reason: 'No attempts were run.'
  };

  const { attempt: _attempt, ...caseResult } = result;
  return {
    id: smokeCase.id,
    attemptCount: attempts.length,
    maxAttempts: smokeCase.maxAttempts,
    ...caseResult,
    attempts
  };
}

function printHelp(): void {
  console.log(`Usage:
  pnpm dify:agent:smoke -- --agent <agent-id> [options]

Options:
  --list-agents                       Print known Dify inventory agents.
  --inventory <path>                  Inventory path. Default: config/dify/inventory.json.
  --agent, --agent-id <id>            Dify agent id from inventory. Optional when only one exists.
  --case <id>                         Run one inventory-declared smoke case. Repeatable.
  --query <text>                      One-off prompt sent to the Dify Service API.
  --expect-tool, --require-tool <name> Require a tool call for a one-off prompt. Repeatable.
  --forbid-tool <name>                Fail if a tool is used. Repeatable.
  --expect-answer, --expect <text>    Require answer text. Repeatable.
  --forbid-answer <text>              Fail if answer text is present. Repeatable.
  --expect-observation <text>         Require tool observation text. Repeatable.
  --max-attempts <1-5>                Retry transient failures for each case.
  --allow-write-tools                 Do not infer write-capable tools as forbidden.
  --user <id>                         Dify API user id.
  --base-url <url>                    Override Service API base URL.
  --api-key-env <name>                Environment variable to read before Infisical lookup.
  --secret-name <name>                Infisical secret name override.
  --infisical-env <name>              Infisical environment override.
  --infisical-path <path>             Infisical path override.
  --infisical-project-id <id>         Infisical project override.
  --timeout-ms <number>               Request timeout.
  --dry-run                           Print resolved smoke plan without calling Dify.

Examples:
  pnpm dify:agent:smoke -- --list-agents
  pnpm dify:agent:smoke -- --agent-id youtube-transcript-notion-agent
  pnpm dify:agent:smoke -- --agent-id youtube-transcript-notion-agent --case extract-known-video
  pnpm dify:agent:smoke -- \\
    --agent-id youtube-transcript-notion-agent \\
    --query "Extract the transcript for https://www.youtube.com/watch?v=sEQ1ecQq0HI and reply with only the video title, extraction method, and segment count. Do not sync or write to Notion." \\
    --require-tool extract_transcript \\
    --expect "What a Billion Database Rows Look Like in Real Life" \\
    --expect supadata \\
    --expect 154
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
    throw new Error(
      `Dify agent ${agentId} does not declare service_api.base_url; pass --base-url to override.`
    );
  }
  if (!secretRef && !options.apiKeyEnv) {
    throw new Error(
      `Dify agent ${agentId} does not declare service_api.api_key_secret; pass --api-key-env to override.`
    );
  }

  const smokeCases = buildSmokeCases(inventory, agent, agentId, options);

  if (options.dryRun) {
    const config = buildConfig(options, agent, agentId, smokeCases[0]!, 1);
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
          caseCount: smokeCases.length,
          cases: smokeCases,
          enabledTools: agent.enabled_tools
        },
        null,
        2
      )
    );
    return;
  }

  const results: SmokeCaseResult[] = [];
  for (const smokeCase of smokeCases) {
    results.push(await runSmokeCase(options, agent, agentId, smokeCase));
  }

  const ok = results.every((result) => result.ok);
  console.log(
    JSON.stringify(
      {
        ok,
        agentId,
        displayName: agent.display_name,
        agentStatus: agent.status,
        caseCount: results.length,
        cases: results
      },
      null,
      2
    )
  );

  if (!ok) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
