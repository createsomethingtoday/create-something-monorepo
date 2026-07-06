#!/usr/bin/env tsx

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  buildDifyClientConfig,
  callDifyChat,
  observationsContain,
  type DifyChatOutput
} from '../evals/langfuse/dify/shared.js';

type SecretRef = {
  environment: string;
  path: string;
  secret_key: string;
};

type DifyAgent = {
  display_name: string;
  status: string;
  service_api?: {
    base_url: string;
    api_key_secret: SecretRef;
  };
};

type DifyInventory = {
  agents: Record<string, DifyAgent>;
};

type ReviewerTarget = {
  agentId: string;
  expectedEmail: string;
};

type Options = {
  inventoryPath: string;
  agentIds: string[];
  versionId?: string;
  timeoutMs: number;
};

type IdentityResult = {
  ok: boolean;
  agentId: string;
  displayName: string;
  expectedEmail: string;
  answer: string;
  messageId?: string;
  conversationId?: string;
  durationMs: number;
  tools: string[];
  downstreamTools: string[];
  forbiddenDownstreamToolsUsed: string[];
  hasExpectedObservation: boolean;
  hasInternalToolLeakage: boolean;
  error?: string;
};

const ROOT = process.cwd();
const DEFAULT_INVENTORY_PATH = 'config/dify/inventory.json';
const DEFAULT_TIMEOUT_MS = 120_000;

const REVIEWER_TARGETS: ReviewerTarget[] = [
  { agentId: 'eric-hub', expectedEmail: 'eric.unger@webflow.com' },
  { agentId: 'natalia-hub', expectedEmail: 'natalia.ledford@webflow.com' },
  { agentId: 'mariana-hub', expectedEmail: 'mariana.segura@webflow.com' },
  { agentId: 'vicki-hub', expectedEmail: 'vicki.chen@webflow.com' }
];

const FORBIDDEN_DOWNSTREAM_TOOLS = [
  'webflow-template-review-mcp__template_review_assign_self',
  'webflow-template-review-mcp__template_review_unassign_self',
  'webflow-template-review-mcp__template_review_set_review_status',
  'webflow-template-review-mcp__template_review_save_draft_feedback',
  'webflow-template-review-mcp__template_review_request_changes',
  'webflow-template-review-mcp__template_review_approve_version',
  'webflow-template-review-mcp__template_review_reject_version',
  'webflow-template-review-mcp__template_review_complete_publishing',
  'webflow-template-review-mcp__template_review_update_version_review',
  'webflow-template-review-mcp__template_review_assign_reviewer',
  'hub_refresh_connections',
  'hub_set_discovery',
  'hub_update_state'
];

const INTERNAL_TOOL_LEAK_PATTERNS = [
  /<\s*\/?\s*think\b[^>]*>/i,
  /\brecipient_name\b/i,
  /\btool_input\b/i,
  /\bagent_thoughts?\b/i,
  /<function=/i,
  /<\|channel=/i,
  /\bto=functions\./i
];

function parseArgs(argv: string[]): Options {
  const options: Options = {
    inventoryPath: process.env.DIFY_AGENT_INVENTORY_PATH?.trim() || DEFAULT_INVENTORY_PATH,
    agentIds: splitList(process.env.DIFY_REVIEWER_IDENTITY_AGENT_IDS),
    versionId:
      process.env.DIFY_REVIEWER_IDENTITY_VERSION_ID?.trim() ||
      process.env.WEBFLOW_REVIEWER_VERSION_ID?.trim(),
    timeoutMs: Number.parseInt(
      process.env.DIFY_REVIEWER_IDENTITY_TIMEOUT_MS || String(DEFAULT_TIMEOUT_MS),
      10
    )
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
        options.agentIds.push(readFlagValue(arg, next));
        index += 1;
        break;
      case '--version-id':
        options.versionId = readFlagValue(arg, next);
        index += 1;
        break;
      case '--timeout-ms':
        options.timeoutMs = parsePositiveInt(readFlagValue(arg, next), arg);
        index += 1;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
      default:
        throw new Error(`Unknown flag: ${arg}`);
    }
  }

  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0) {
    options.timeoutMs = DEFAULT_TIMEOUT_MS;
  }

  return {
    ...options,
    agentIds: Array.from(new Set(options.agentIds.filter(Boolean)))
  };
}

function splitList(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
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

function selectedTargets(agentIds: string[]): ReviewerTarget[] {
  if (agentIds.length === 0) return REVIEWER_TARGETS;

  return agentIds.map((agentId) => {
    const target = REVIEWER_TARGETS.find((candidate) => candidate.agentId === agentId);
    if (!target) {
      throw new Error(
        `Unknown reviewer identity target ${agentId}. Known targets: ${REVIEWER_TARGETS.map(
          (candidate) => candidate.agentId
        ).join(', ')}`
      );
    }
    return target;
  });
}

function buildIdentityQuery(versionId: string | undefined): string {
  if (versionId) {
    return [
      'Reviewer identity smoke only.',
      'Use hub_execute_proxy_tool exactly once to call proxyToolName webflow-template-review-mcp__template_review_get_review_context',
      `with args {"version_id":"${versionId}"}.`,
      'Do not assign, unassign, set status, save feedback, request changes, approve, reject, publish, refresh connections, update state, or call any other proxy tool.',
      'Reply with only data.context.currentReviewer.email from the tool result.'
    ].join(' ');
  }

  return [
    'Reviewer identity smoke only.',
    'Use hub_execute_proxy_tool to call proxyToolName webflow-template-review-mcp__template_review_list_queue with args {"limit":1,"status":"ready_to_review","assigned":"any"}.',
    'Then use hub_execute_proxy_tool to call proxyToolName webflow-template-review-mcp__template_review_get_review_context with the first returned assignableVersionId as version_id.',
    'Do not assign, unassign, set status, save feedback, request changes, approve, reject, publish, refresh connections, update state, or call any other proxy tool.',
    'Reply with only data.context.currentReviewer.email from the get_review_context tool result.',
    'If no version is available, reply REVIEWER_IDENTITY_NO_VERSION.'
  ].join(' ');
}

function downstreamToolNames(output: DifyChatOutput): string[] {
  const names = new Set<string>();

  for (const call of output.toolCalls) {
    if (call.tool !== 'hub_execute_proxy_tool') continue;
    for (const source of [call.toolInput, call.observation]) {
      for (const match of source.matchAll(
        /webflow-template-review-mcp__[A-Za-z0-9_]+|hub_[A-Za-z0-9_]+/g
      )) {
        names.add(match[0]);
      }
    }
  }

  return [...names].sort();
}

function answerMatchesExpected(answer: string, expectedEmail: string): boolean {
  return answer.trim().toLowerCase() === expectedEmail.toLowerCase();
}

function hasInternalToolLeakage(answer: string): boolean {
  return INTERNAL_TOOL_LEAK_PATTERNS.some((pattern) => pattern.test(answer));
}

async function runTarget(
  inventory: DifyInventory,
  options: Options,
  target: ReviewerTarget
): Promise<IdentityResult> {
  const agent = inventory.agents[target.agentId];
  if (!agent) throw new Error(`Inventory is missing agent ${target.agentId}.`);

  const secretRef = agent.service_api?.api_key_secret;
  if (!agent.service_api || !secretRef) {
    throw new Error(`Inventory agent ${target.agentId} is missing service_api.api_key_secret.`);
  }

  const output = await callDifyChat(
    {
      name: `reviewer_identity:${target.agentId}`,
      query: buildIdentityQuery(options.versionId),
      shouldUseTool: 'hub_execute_proxy_tool',
      forbiddenTools: []
    },
    buildDifyClientConfig({
      baseUrl: agent.service_api.base_url,
      apiKeyEnv: secretRef.secret_key,
      secretName: secretRef.secret_key,
      infisicalEnvironment: secretRef.environment,
      infisicalPath: secretRef.path,
      user: `dify-reviewer-identity-${target.agentId}`.slice(0, 120),
      timeoutMs: options.timeoutMs
    })
  );

  const downstreamTools = downstreamToolNames(output);
  const forbiddenDownstreamToolsUsed = downstreamTools.filter((tool) =>
    FORBIDDEN_DOWNSTREAM_TOOLS.includes(tool)
  );
  const hasExpectedObservation = observationsContain(output, target.expectedEmail);
  const leaksInternalToolText = hasInternalToolLeakage(output.answer);
  const usedHubExecute = output.toolCalls.some((call) => call.tool === 'hub_execute_proxy_tool');
  const ok =
    !output.skipped &&
    output.ok &&
    usedHubExecute &&
    hasExpectedObservation &&
    answerMatchesExpected(output.answer, target.expectedEmail) &&
    !leaksInternalToolText &&
    downstreamTools.includes('webflow-template-review-mcp__template_review_get_review_context') &&
    forbiddenDownstreamToolsUsed.length === 0;

  return {
    ok,
    agentId: target.agentId,
    displayName: agent.display_name,
    expectedEmail: target.expectedEmail,
    answer: output.answer,
    messageId: output.messageId,
    conversationId: output.conversationId,
    durationMs: output.durationMs,
    tools: output.toolCalls.map((call) => call.tool),
    downstreamTools,
    forbiddenDownstreamToolsUsed,
    hasExpectedObservation,
    hasInternalToolLeakage: leaksInternalToolText,
    error: output.reason ?? output.error
  };
}

function printHelp(): void {
  console.log(`Usage:
  pnpm dify:reviewer-hubs:identity-smoke [options]

Options:
  --inventory <path>      Inventory path. Default: config/dify/inventory.json.
  --agent-id <id>         Limit to one reviewer agent. Repeatable.
  --version-id <id>       Existing template Asset Version to inspect. If omitted, the agent reads one queue item first.
  --timeout-ms <number>   Dify request timeout. Default: ${DEFAULT_TIMEOUT_MS}.

Environment:
  DIFY_REVIEWER_IDENTITY_VERSION_ID  Same as --version-id.
  DIFY_REVIEWER_IDENTITY_AGENT_IDS   Comma-separated reviewer agent ids.
`);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const inventory = loadInventory(options.inventoryPath);
  const targets = selectedTargets(options.agentIds);
  const results: IdentityResult[] = [];

  for (const target of targets) {
    results.push(await runTarget(inventory, options, target));
  }

  const ok = results.every((result) => result.ok);
  console.log(
    JSON.stringify(
      {
        ok,
        checkedAt: new Date().toISOString(),
        versionId: options.versionId ?? null,
        count: results.length,
        results
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
