import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { Eval, type Score } from 'braintrust';

import {
  buildDifyClientConfig,
  callDifyChat,
  usedForbiddenTool,
  usedTool,
  type DifyChatOutput,
} from '../dify/shared.js';
import type { JsonRecord } from './shared.js';

type SecretRef = {
  environment: string;
  path: string;
  secret_key: string;
};

type ReviewerConfig = {
  slug: 'eric' | 'natalia' | 'mariana' | 'vicki';
  displayName: string;
  agentId: string;
  hubServerId: string;
  hubUrl: string;
  hubTokenSecret: SecretRef;
  difyApiSecret: SecretRef;
};

type EvalCaseId =
  | 'inventory_agent_declared'
  | 'inventory_dify_api_key_secret_declared'
  | 'inventory_allowed_mcp_server'
  | 'inventory_enabled_hub_execute'
  | 'dify_service_api_lists_hub_services'
  | 'mcp_health_endpoint'
  | 'mcp_tools_list_has_hub_tools'
  | 'hub_status_webflow_bundle'
  | 'hub_list_services_template_review_active'
  | 'hub_discovery_pack_phase_a'
  | 'hub_visible_proxy_tools_phase_a_count'
  | 'hub_search_template_review_tools'
  | 'hub_describe_health_proxy_schema'
  | 'airtable_health_read'
  | 'airtable_field_map_read'
  | 'airtable_metrics_read'
  | 'airtable_queue_read'
  | 'airtable_my_queue_identity_read'
  | 'airtable_candidate_review_context_read'
  | 'airtable_assign_unassign_write_roundtrip';

type EvalInput = {
  reviewer: ReviewerConfig;
  caseId: EvalCaseId;
  caseName: string;
  area: 'dify_inventory' | 'dify_live' | 'hub_live' | 'airtable_read' | 'airtable_write';
};

type EvalOutput = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  status: number | null;
  durationMs: number;
  details: JsonRecord;
  error?: string;
};

type HttpJsonResult = {
  ok: boolean;
  status: number;
  durationMs: number;
  json: JsonRecord;
};

type TemplateQueueItem = JsonRecord & {
  assetId?: string;
  templateName?: string;
  assignableVersionId?: string;
  canAssign?: boolean;
  isUnassigned?: boolean;
};

type DifyInventoryAgent = {
  display_name?: string;
  runtime?: string;
  status?: string;
  service_api?: {
    base_url?: string;
    api_key_secret?: SecretRef;
  };
  allowed_mcp_servers?: string[];
  enabled_tools?: string[];
};

type DifyInventory = {
  agents?: Record<string, DifyInventoryAgent>;
  mcp_servers?: Record<string, JsonRecord>;
};

class CaseFailure extends Error {
  details: JsonRecord;

  constructor(message: string, details: JsonRecord = {}) {
    super(message);
    this.name = 'CaseFailure';
    this.details = details;
  }
}

const SERVER_NAME = 'webflow-template-review-mcp';
const PHASE_A_BUNDLE = 'webflow-marketplace-review-phase-a';
const INFISICAL_INCLUDE_IMPORTS = process.env.INFISICAL_INCLUDE_IMPORTS?.trim() || 'true';
const DIRECT_TIMEOUT_MS = Number.parseInt(process.env.WEBFLOW_TEMPLATE_REVIEW_EVAL_TIMEOUT_MS ?? '90000', 10);
const DIFY_TIMEOUT_MS = Number.parseInt(process.env.WEBFLOW_TEMPLATE_REVIEW_DIFY_EVAL_TIMEOUT_MS ?? '180000', 10);
const SKIP_WRITES = process.env.WEBFLOW_TEMPLATE_REVIEW_EVAL_SKIP_WRITES === 'true';

const REVIEWERS: ReviewerConfig[] = [
  {
    slug: 'eric',
    displayName: 'Eric',
    agentId: 'eric-hub',
    hubServerId: 'eric_hub',
    hubUrl: 'https://wf-template-review-eric.mcp.createsomething.agency/mcp',
    hubTokenSecret: {
      environment: 'prod',
      path: '/mcp-hub/hubs',
      secret_key: 'CS_HUB_WF_TEMPLATE_REVIEW_ERIC_API_TOKEN',
    },
    difyApiSecret: {
      environment: 'prod',
      path: '/dify/eric-hub',
      secret_key: 'DIFY_ERIC_HUB_API_KEY',
    },
  },
  {
    slug: 'natalia',
    displayName: 'Natalia',
    agentId: 'natalia-hub',
    hubServerId: 'natalia_hub',
    hubUrl: 'https://wf-template-review-natalia.mcp.createsomething.agency/mcp',
    hubTokenSecret: {
      environment: 'prod',
      path: '/mcp-hub/hubs',
      secret_key: 'CS_HUB_WF_TEMPLATE_REVIEW_NATALIA_API_TOKEN',
    },
    difyApiSecret: {
      environment: 'prod',
      path: '/dify/natalia-hub',
      secret_key: 'DIFY_NATALIA_HUB_API_KEY',
    },
  },
  {
    slug: 'mariana',
    displayName: 'Mariana',
    agentId: 'mariana-hub',
    hubServerId: 'mariana_hub',
    hubUrl: 'https://wf-template-review-mariana.mcp.createsomething.agency/mcp',
    hubTokenSecret: {
      environment: 'prod',
      path: '/mcp-hub/hubs',
      secret_key: 'CS_HUB_WF_TEMPLATE_REVIEW_MARIANA_API_TOKEN',
    },
    difyApiSecret: {
      environment: 'prod',
      path: '/dify/mariana-hub',
      secret_key: 'DIFY_MARIANA_HUB_API_KEY',
    },
  },
  {
    slug: 'vicki',
    displayName: 'Vicki',
    agentId: 'vicki-hub',
    hubServerId: 'vicki_hub',
    hubUrl: 'https://wf-template-review-vicki.mcp.createsomething.agency/mcp',
    hubTokenSecret: {
      environment: 'prod',
      path: '/mcp-hub/hubs',
      secret_key: 'CS_HUB_WF_TEMPLATE_REVIEW_VICKI_API_TOKEN',
    },
    difyApiSecret: {
      environment: 'prod',
      path: '/dify/vicki-hub',
      secret_key: 'DIFY_VICKI_HUB_API_KEY',
    },
  },
];

const CASES: Array<Omit<EvalInput, 'reviewer'>> = [
  { caseId: 'inventory_agent_declared', caseName: 'Dify inventory declares imported agent', area: 'dify_inventory' },
  { caseId: 'inventory_dify_api_key_secret_declared', caseName: 'Dify API key secret resolves', area: 'dify_inventory' },
  { caseId: 'inventory_allowed_mcp_server', caseName: 'Dify agent allows only reviewer Hub MCP server', area: 'dify_inventory' },
  { caseId: 'inventory_enabled_hub_execute', caseName: 'Dify agent exposes Hub proxy execution tool', area: 'dify_inventory' },
  { caseId: 'dify_service_api_lists_hub_services', caseName: 'Dify Service API calls hub_list_services', area: 'dify_live' },
  { caseId: 'mcp_health_endpoint', caseName: 'Reviewer Hub health endpoint responds', area: 'hub_live' },
  { caseId: 'mcp_tools_list_has_hub_tools', caseName: 'Reviewer Hub tools/list includes broker tools', area: 'hub_live' },
  { caseId: 'hub_status_webflow_bundle', caseName: 'Hub status has Webflow template-review bundle enabled', area: 'hub_live' },
  { caseId: 'hub_list_services_template_review_active', caseName: 'Hub services show template-review MCP active', area: 'hub_live' },
  { caseId: 'hub_discovery_pack_phase_a', caseName: 'Hub discovery pack includes Phase A reviewer pack', area: 'hub_live' },
  { caseId: 'hub_visible_proxy_tools_phase_a_count', caseName: 'Hub visible proxy tools match Phase A surface', area: 'hub_live' },
  { caseId: 'hub_search_template_review_tools', caseName: 'Hub search returns template-review proxy tools', area: 'hub_live' },
  { caseId: 'hub_describe_health_proxy_schema', caseName: 'Hub can describe template_review_health proxy tool', area: 'hub_live' },
  { caseId: 'airtable_health_read', caseName: 'Airtable health read succeeds', area: 'airtable_read' },
  { caseId: 'airtable_field_map_read', caseName: 'Airtable field-map read succeeds', area: 'airtable_read' },
  { caseId: 'airtable_metrics_read', caseName: 'Airtable marketplace metrics read succeeds', area: 'airtable_read' },
  { caseId: 'airtable_queue_read', caseName: 'Airtable review queue read succeeds', area: 'airtable_read' },
  { caseId: 'airtable_my_queue_identity_read', caseName: 'Reviewer identity can read my_queue', area: 'airtable_read' },
  { caseId: 'airtable_candidate_review_context_read', caseName: 'Candidate review context read succeeds', area: 'airtable_read' },
  { caseId: 'airtable_assign_unassign_write_roundtrip', caseName: 'Airtable assign_self/unassign_self write roundtrip succeeds', area: 'airtable_write' },
];

const EXPECTED_PHASE_A_PROXY_TOOLS = [
  'template_review_workflow',
  'template_review_health',
  'template_review_list_queue',
  'template_review_my_queue',
  'template_review_get_review_context',
  'template_review_assign_self',
  'template_review_unassign_self',
  'template_review_request_changes',
  'template_review_set_review_status',
  'template_review_save_draft_feedback',
  'template_review_search_assets',
  'template_review_search_versions',
  'template_review_get_asset',
  'template_review_list_versions',
  'template_review_get_version',
  'template_review_list_releases',
  'template_review_get_field_map',
  'template_review_get_metrics',
].map((tool) => `${SERVER_NAME}__${tool}`);

const FORBIDDEN_SERVICE_NAMES = ['webflow-site-analyzer-mcp', 'webflow-local'];

const FORBIDDEN_REVIEWER_PROXY_TOOLS = [
  `${SERVER_NAME}__template_review_assign_reviewer`,
  `${SERVER_NAME}__template_review_update_asset_metadata`,
  `${SERVER_NAME}__template_review_update_asset_publishing`,
  `${SERVER_NAME}__template_review_update_version_review`,
  `${SERVER_NAME}__template_review_approve_version`,
  `${SERVER_NAME}__template_review_reject_version`,
  `${SERVER_NAME}__template_review_complete_publishing`,
];

const FORBIDDEN_DIFY_WRITE_TOOLS = [
  'hub_execute_proxy_tool',
  'hub_run_proxy_tool',
  'hub_run_intent',
  'hub_set_discovery',
  'hub_update_state',
  'hub_refresh_connections',
];

const inventory = JSON.parse(readFileSync('config/dify/inventory.json', 'utf8')) as DifyInventory;
const secretCache = new Map<string, string>();
const promiseCache = new Map<string, Promise<unknown>>();
let writeChain: Promise<unknown> = Promise.resolve();
let difyChain: Promise<unknown> = Promise.resolve();
let airtableChain: Promise<unknown> = Promise.resolve();

const data = REVIEWERS.flatMap((reviewer) =>
  CASES.map((testCase) => ({
    input: { reviewer, ...testCase } satisfies EvalInput,
    metadata: {
      reviewer: reviewer.slug,
      agent_id: reviewer.agentId,
      hub_server_id: reviewer.hubServerId,
      suite: 'webflow-template-review-hubs-airtable',
      area: testCase.area,
      case_id: testCase.caseId,
    },
  })),
);

function safeSecretRef(ref: SecretRef): JsonRecord {
  return {
    environment: ref.environment,
    path: ref.path,
    secret_key: ref.secret_key,
  };
}

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function readSecret(ref: SecretRef): string {
  const envValue = readEnv(ref.secret_key);
  if (envValue) return envValue;

  const cacheKey = `${ref.environment}:${ref.path}:${ref.secret_key}`;
  const cached = secretCache.get(cacheKey);
  if (cached) return cached;

  try {
    const raw = execFileSync(
      'infisical',
      [
        'secrets',
        'get',
        ref.secret_key,
        '--plain',
        '--silent',
        `--env=${ref.environment}`,
        `--path=${ref.path}`,
        `--include-imports=${INFISICAL_INCLUDE_IMPORTS}`,
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim();

    if (raw) {
      secretCache.set(cacheKey, raw);
      return raw;
    }
  } catch {
    // Fall through to the explicit failure below.
  }

  throw new CaseFailure('Required secret could not be resolved from env or Infisical.', {
    secret: safeSecretRef(ref),
  });
}

function cached<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const existing = promiseCache.get(key);
  if (existing) return existing as Promise<T>;
  const promise = factory();
  promiseCache.set(key, promise);
  return promise;
}

function withWriteLock<T>(factory: () => Promise<T>): Promise<T> {
  const run = writeChain.then(factory, factory);
  writeChain = run.catch(() => undefined);
  return run;
}

function withDifyLock<T>(factory: () => Promise<T>): Promise<T> {
  const run = difyChain.then(factory, factory);
  difyChain = run.catch(() => undefined);
  return run;
}

function withAirtableLock<T>(factory: () => Promise<T>): Promise<T> {
  const run = airtableChain.then(factory, factory);
  airtableChain = run.catch(() => undefined);
  return run;
}

function assertCondition(condition: unknown, message: string, details: JsonRecord = {}): asserts condition {
  if (!condition) throw new CaseFailure(message, details);
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringArray(value: unknown): string[] {
  return asArray(value).filter((item): item is string => typeof item === 'string');
}

function getAgent(reviewer: ReviewerConfig): DifyInventoryAgent {
  const agent = inventory.agents?.[reviewer.agentId];
  assertCondition(agent, 'Dify inventory does not include reviewer agent.', {
    agentId: reviewer.agentId,
  });
  return agent;
}

async function fetchJson(url: string, init: RequestInit = {}, timeoutMs = DIRECT_TIMEOUT_MS): Promise<HttpJsonResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    let json: JsonRecord = {};
    try {
      const parsed = JSON.parse(text) as unknown;
      json = asRecord(parsed);
    } catch {
      throw new CaseFailure('HTTP response was not JSON.', {
        url,
        status: response.status,
        textSample: text.slice(0, 500),
      });
    }
    return {
      ok: response.ok,
      status: response.status,
      durationMs: Date.now() - startedAt,
      json,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function mcpRpc(reviewer: ReviewerConfig, method: string, params: JsonRecord = {}): Promise<HttpJsonResult> {
  const token = readSecret(reviewer.hubTokenSecret);
  const result = await fetchJson(reviewer.hubUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'MCP-Protocol-Version': '2025-03-26',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: `${reviewer.slug}-${Date.now()}`, method, params }),
  });

  const error = result.json.error;
  assertCondition(!error, 'MCP JSON-RPC error.', { method, error: asRecord(error) });
  return result;
}

function mcpPayload(json: JsonRecord): JsonRecord {
  const result = asRecord(json.result);
  if (result.structuredContent && typeof result.structuredContent === 'object') {
    return asRecord(result.structuredContent);
  }

  const text = asArray(result.content)
    .map((item) => asRecord(item).text)
    .find((item): item is string => typeof item === 'string');

  if (!text) return {};
  try {
    return asRecord(JSON.parse(text) as unknown);
  } catch {
    return { text };
  }
}

async function hubTool(reviewer: ReviewerConfig, name: string, args: JsonRecord = {}): Promise<JsonRecord> {
  const result = await mcpRpc(reviewer, 'tools/call', {
    name,
    arguments: args,
  });
  const payload = mcpPayload(result.json);
  assertCondition(asRecord(result.json.result).isError !== true, 'Hub tool returned an MCP tool error.', {
    name,
    payload,
  });
  return payload;
}

async function proxyTool(
  reviewer: ReviewerConfig,
  toolName: string,
  args: JsonRecord = {},
): Promise<{ hubPayload: JsonRecord; downstream: JsonRecord }> {
  return withAirtableLock(async () => {
    const proxyToolName = `${SERVER_NAME}__${toolName}`;
    const hubPayload = await hubTool(reviewer, 'hub_execute_proxy_tool', {
      proxyToolName,
      args,
    });
    assertCondition(hubPayload.ok === true, 'Hub proxy execution failed.', {
      proxyToolName,
      hubPayload,
    });
    const downstream = { ok: true, data: hubPayload.data } satisfies JsonRecord;
    return { hubPayload, downstream };
  });
}

async function hubStatus(reviewer: ReviewerConfig): Promise<JsonRecord> {
  return cached(`${reviewer.slug}:hub_status`, () => hubTool(reviewer, 'hub_status'));
}

async function hubServices(reviewer: ReviewerConfig): Promise<JsonRecord> {
  return cached(`${reviewer.slug}:hub_services`, () => hubTool(reviewer, 'hub_list_services'));
}

async function hubProxyTools(reviewer: ReviewerConfig): Promise<JsonRecord> {
  return cached(`${reviewer.slug}:hub_proxy_tools`, () => hubTool(reviewer, 'hub_list_proxy_tools'));
}

async function hubSearchTools(reviewer: ReviewerConfig): Promise<JsonRecord> {
  return cached(`${reviewer.slug}:hub_search_tools`, () =>
    hubTool(reviewer, 'hub_search_proxy_tools', {
      serverName: SERVER_NAME,
      limit: 50,
    }),
  );
}

async function queueRead(reviewer: ReviewerConfig): Promise<JsonRecord> {
  return cached(`${reviewer.slug}:queue`, async () => {
    const { downstream } = await proxyTool(reviewer, 'template_review_list_queue', {
      status: 'ready_to_review',
      assigned: 'unassigned',
      sort: 'submittedDate_desc',
      limit: 25,
    });
    return downstream;
  });
}

function queueItems(queue: JsonRecord): TemplateQueueItem[] {
  return asArray(asRecord(queue.data).items)
    .map((item) => asRecord(item) as TemplateQueueItem)
    .filter((item) => typeof item.assignableVersionId === 'string' && item.assignableVersionId.length > 0);
}

async function readCandidate(reviewer: ReviewerConfig): Promise<TemplateQueueItem> {
  return cached(`${reviewer.slug}:read_candidate`, async () => {
    const queue = await queueRead(reviewer);
    const candidate = queueItems(queue).find((item) => item.canAssign === true && item.isUnassigned === true);
    assertCondition(candidate, 'No unassigned ready-to-review candidate found for read context probe.', {
      queueCount: asRecord(queue.data).count,
    });
    return candidate;
  });
}

async function freshWriteCandidate(reviewer: ReviewerConfig): Promise<TemplateQueueItem> {
  const { downstream } = await proxyTool(reviewer, 'template_review_list_queue', {
    status: 'ready_to_review',
    assigned: 'unassigned',
    sort: 'submittedDate_desc',
    limit: 25,
  });
  const candidate = queueItems(downstream).find((item) => item.canAssign === true && item.isUnassigned === true);
  assertCondition(candidate, 'No unassigned ready-to-review candidate found for write roundtrip.', {
    queueCount: asRecord(downstream.data).count,
  });
  return candidate;
}

function proxyToolNames(payload: JsonRecord): string[] {
  return asArray(payload.proxyTools)
    .map((tool) => {
      if (typeof tool === 'string') return tool;
      const record = asRecord(tool);
      return typeof record.proxyToolName === 'string' ? record.proxyToolName : record.name;
    })
    .filter((name): name is string => typeof name === 'string' && name.length > 0);
}

function searchToolNames(payload: JsonRecord): string[] {
  return asArray(payload.tools)
    .map((tool) => asRecord(tool).proxyToolName)
    .filter((name): name is string => typeof name === 'string' && name.length > 0);
}

function missing(expected: string[], actual: string[]): string[] {
  const actualSet = new Set(actual);
  return expected.filter((item) => !actualSet.has(item));
}

function present(unwanted: string[], actual: string[]): string[] {
  const actualSet = new Set(actual);
  return unwanted.filter((item) => actualSet.has(item));
}

async function runDifyServicesSmoke(reviewer: ReviewerConfig): Promise<DifyChatOutput> {
  return cached(`${reviewer.slug}:dify_services_smoke`, async () => {
    return withDifyLock(async () => {
      const config = buildDifyClientConfig({
        apiKeyEnv: reviewer.difyApiSecret.secret_key,
        secretName: reviewer.difyApiSecret.secret_key,
        infisicalEnvironment: reviewer.difyApiSecret.environment,
        infisicalPath: reviewer.difyApiSecret.path,
        user: `braintrust-webflow-template-review-${reviewer.slug}`,
        timeoutMs: DIFY_TIMEOUT_MS,
      });

      return callDifyChat(
        {
          name: `${reviewer.slug}-hub-list-services`,
          query:
            'Use hub_list_services to list available Hub services. Reply with a concise count and service names only. Do not execute proxy tools, update state, refresh connections, or perform writes.',
        },
        config,
      );
    });
  });
}

async function runCase(input: EvalInput): Promise<EvalOutput> {
  const startedAt = Date.now();
  const { reviewer, caseId } = input;

  try {
    switch (caseId) {
      case 'inventory_agent_declared': {
        const agent = getAgent(reviewer);
        assertCondition(agent.runtime === 'dify', 'Agent runtime is not Dify.', { runtime: agent.runtime });
        assertCondition(agent.status === 'imported', 'Agent is not marked imported.', { status: agent.status });
        return ok(startedAt, {
          agentId: reviewer.agentId,
          displayName: agent.display_name ?? null,
          runtime: agent.runtime ?? null,
          status: agent.status ?? null,
        });
      }

      case 'inventory_dify_api_key_secret_declared': {
        const agent = getAgent(reviewer);
        const secret = agent.service_api?.api_key_secret;
        assertCondition(secret, 'Agent service API key secret is missing from inventory.');
        assertCondition(secret.secret_key === reviewer.difyApiSecret.secret_key, 'Unexpected Dify API secret key.', {
          expected: safeSecretRef(reviewer.difyApiSecret),
          actual: safeSecretRef(secret),
        });
        readSecret(reviewer.difyApiSecret);
        return ok(startedAt, {
          secretResolved: true,
          secret: safeSecretRef(reviewer.difyApiSecret),
          baseUrl: agent.service_api?.base_url ?? null,
        });
      }

      case 'inventory_allowed_mcp_server': {
        const agent = getAgent(reviewer);
        const allowed = agent.allowed_mcp_servers ?? [];
        assertCondition(allowed.length === 1 && allowed[0] === reviewer.hubServerId, 'Agent allows unexpected MCP servers.', {
          allowed,
          expected: reviewer.hubServerId,
        });
        return ok(startedAt, { allowed_mcp_servers: allowed });
      }

      case 'inventory_enabled_hub_execute': {
        const agent = getAgent(reviewer);
        const enabled = agent.enabled_tools ?? [];
        const required = [
          `${reviewer.hubServerId}.hub_list_services`,
          `${reviewer.hubServerId}.hub_search_proxy_tools`,
          `${reviewer.hubServerId}.hub_describe_proxy_tool`,
          `${reviewer.hubServerId}.hub_execute_proxy_tool`,
        ];
        const missingTools = missing(required, enabled);
        assertCondition(missingTools.length === 0, 'Dify agent is missing required Hub tools.', {
          missingTools,
          required,
        });
        return ok(startedAt, { requiredToolsPresent: required });
      }

      case 'dify_service_api_lists_hub_services': {
        const output = await runDifyServicesSmoke(reviewer);
        assertCondition(!output.skipped, output.reason ?? 'Dify call skipped.');
        assertCondition(output.ok, output.error ?? `Dify call failed with status ${output.status ?? 'unknown'}.`, {
          status: output.status,
          error: output.error,
          answerSample: output.answer.slice(0, 500),
        });
        assertCondition(usedTool(output, 'hub_list_services'), 'Dify agent did not call hub_list_services.', {
          tools: output.toolCalls.map((call) => call.tool),
        });
        assertCondition(!usedForbiddenTool(output, FORBIDDEN_DIFY_WRITE_TOOLS), 'Dify agent used a forbidden write-capable Hub tool.', {
          tools: output.toolCalls.map((call) => call.tool),
          forbidden: FORBIDDEN_DIFY_WRITE_TOOLS,
        });
        const serialized = `${output.answer}\n${output.toolCalls.map((call) => call.observation).join('\n')}`;
        const forbiddenServices = FORBIDDEN_SERVICE_NAMES.filter((service) => serialized.includes(service));
        assertCondition(forbiddenServices.length === 0, 'Dify response or tool observations exposed a removed Template Review Hub service.', {
          forbiddenServices,
          answerSample: output.answer.slice(0, 500),
          toolCalls: output.toolCalls.map((call) => call.tool),
        });
        return ok(startedAt, {
          status: output.status,
          messageId: output.messageId ?? null,
          conversationId: output.conversationId ?? null,
          toolCalls: output.toolCalls.map((call) => call.tool),
          answerSample: output.answer.slice(0, 500),
          durationMs: output.durationMs,
        });
      }

      case 'mcp_health_endpoint': {
        const healthUrl = reviewer.hubUrl.replace(/\/mcp$/, '/health');
        const result = await fetchJson(healthUrl);
        assertCondition(result.ok, 'Hub health endpoint did not return 2xx.', {
          status: result.status,
          body: result.json,
        });
        return ok(startedAt, {
          healthUrl,
          status: result.status,
          name: result.json.name ?? null,
          scope: result.json.scope ?? null,
        });
      }

      case 'mcp_tools_list_has_hub_tools': {
        const result = await mcpRpc(reviewer, 'tools/list');
        const tools = asArray(asRecord(result.json.result).tools)
          .map((tool) => asRecord(tool).name)
          .filter((name): name is string => typeof name === 'string');
        const required = ['hub_status', 'hub_list_services', 'hub_search_proxy_tools', 'hub_execute_proxy_tool'];
        const missingTools = missing(required, tools);
        assertCondition(missingTools.length === 0, 'Hub tools/list is missing required broker tools.', {
          missingTools,
          toolCount: tools.length,
        });
        return ok(startedAt, { toolCount: tools.length, requiredToolsPresent: required });
      }

      case 'hub_status_webflow_bundle': {
        const status = await hubStatus(reviewer);
        const state = asRecord(status.state);
        const enabledBundles = stringArray(state.enabledBundles);
        const enabledServers = stringArray(state.enabledServers);
        const enabledServerNames = stringArray(status.enabledServerNames);
        assertCondition(enabledBundles.includes(PHASE_A_BUNDLE), 'Phase A bundle is not enabled.', { enabledBundles });
        assertCondition(enabledServers.length === 1 && enabledServers[0] === SERVER_NAME, 'Hub state enables unexpected Template Review Hub servers.', {
          enabledServers,
          expected: [SERVER_NAME],
        });
        assertCondition(enabledServerNames.length === 1 && enabledServerNames[0] === SERVER_NAME, 'Resolved Hub servers include a removed Template Review Hub service.', {
          enabledServerNames,
          expected: [SERVER_NAME],
        });
        const disabledServers = stringArray(state.disabledServers);
        const missingDisabled = missing(FORBIDDEN_SERVICE_NAMES, disabledServers);
        assertCondition(missingDisabled.length === 0, 'Removed Template Review Hub services are not explicitly disabled.', {
          disabledServers,
          missingDisabled,
        });
        assertCondition(asArray(status.warnings).length === 0, 'Hub status has warnings.', { warnings: status.warnings });
        return ok(startedAt, {
          enabledBundles,
          enabledServers,
          enabledServerNames,
          disabledServers,
          proxyToolCount: status.proxyToolCount ?? null,
          warningCount: asArray(status.warnings).length,
        });
      }

      case 'hub_list_services_template_review_active': {
        const services = await hubServices(reviewer);
        const serviceNames = asArray(services.services)
          .map((item) => asRecord(item).name)
          .filter((name): name is string => typeof name === 'string');
        assertCondition(serviceNames.length === 1 && serviceNames[0] === SERVER_NAME, 'Hub services expose unexpected Template Review Hub services.', {
          serviceNames,
          expected: [SERVER_NAME],
        });
        const activeServers = stringArray(asRecord(services.discovery).activeServers);
        assertCondition(activeServers.length === 1 && activeServers[0] === SERVER_NAME, 'Discovery exposes unexpected Template Review Hub services.', {
          activeServers,
          expected: [SERVER_NAME],
        });
        const service = asArray(services.services).map(asRecord).find((item) => item.name === SERVER_NAME);
        assertCondition(service, 'Template-review service is missing from hub_list_services.', { services });
        assertCondition(service.activeInDiscovery === true, 'Template-review service is not active in discovery.', { service });
        return ok(startedAt, {
          serviceName: service.name,
          serviceNames,
          activeServers,
          activeInDiscovery: service.activeInDiscovery,
          visibleProxyTools: service.visibleProxyTools ?? null,
          totalProxyTools: service.totalProxyTools ?? null,
        });
      }

      case 'hub_discovery_pack_phase_a': {
        const packs = await hubTool(reviewer, 'hub_list_discovery_packs');
        const names = asArray(packs.packs)
          .map((pack) => asRecord(pack).name ?? asRecord(pack).id)
          .filter((name): name is string => typeof name === 'string');
        assertCondition(names.includes(PHASE_A_BUNDLE), 'Phase A discovery pack is missing.', { names });
        return ok(startedAt, { discoveryPacks: names });
      }

      case 'hub_visible_proxy_tools_phase_a_count': {
        const payload = await hubProxyTools(reviewer);
        const names = proxyToolNames(payload);
        const missingTools = missing(EXPECTED_PHASE_A_PROXY_TOOLS, names);
        const forbiddenTools = present(FORBIDDEN_REVIEWER_PROXY_TOOLS, names);
        assertCondition(missingTools.length === 0, 'Visible proxy surface is missing Phase A tools.', { missingTools });
        assertCondition(forbiddenTools.length === 0, 'Visible proxy surface includes forbidden reviewer tools.', { forbiddenTools });
        return ok(startedAt, {
          visibleProxyToolCount: names.length,
          expectedProxyToolCount: EXPECTED_PHASE_A_PROXY_TOOLS.length,
        });
      }

      case 'hub_search_template_review_tools': {
        const payload = await hubSearchTools(reviewer);
        const names = searchToolNames(payload);
        const missingTools = missing(EXPECTED_PHASE_A_PROXY_TOOLS, names);
        assertCondition(missingTools.length === 0, 'Proxy tool search is missing Phase A tools.', { missingTools });
        return ok(startedAt, {
          searchResultCount: names.length,
          expectedProxyToolCount: EXPECTED_PHASE_A_PROXY_TOOLS.length,
        });
      }

      case 'hub_describe_health_proxy_schema': {
        const proxyToolName = `${SERVER_NAME}__template_review_health`;
        const payload = await hubTool(reviewer, 'hub_describe_proxy_tool', { proxyToolName });
        assertCondition(payload.proxyToolName === proxyToolName || asRecord(payload.tool).name === proxyToolName, 'Describe response did not target health proxy tool.', {
          payload,
        });
        return ok(startedAt, {
          proxyToolName,
          description: typeof payload.description === 'string' ? payload.description.slice(0, 240) : null,
        });
      }

      case 'airtable_health_read': {
        const { downstream } = await proxyTool(reviewer, 'template_review_health');
        const dataPayload = asRecord(downstream.data);
        assertCondition(dataPayload.baseId === 'appMoIgXMTTTNIc3p', 'Unexpected Airtable base id.', { data: dataPayload });
        assertCondition(dataPayload.scope === 'templates-only', 'Unexpected Airtable scope.', { data: dataPayload });
        return ok(startedAt, {
          baseId: dataPayload.baseId,
          scope: dataPayload.scope,
          sampleAssetsRead: dataPayload.sampleAssetsRead ?? null,
          templateAssetsMatched: dataPayload.templateAssetsMatched ?? null,
        });
      }

      case 'airtable_field_map_read': {
        const { downstream } = await proxyTool(reviewer, 'template_review_get_field_map');
        const dataPayload = asRecord(downstream.data);
        assertCondition(Boolean(dataPayload.tables ?? dataPayload.assets ?? dataPayload.writeSupport), 'Field map response is missing expected sections.', {
          keys: Object.keys(dataPayload),
        });
        return ok(startedAt, {
          fieldMapKeys: Object.keys(dataPayload),
          writeSupport: asRecord(dataPayload.writeSupport),
        });
      }

      case 'airtable_metrics_read': {
        const { downstream } = await proxyTool(reviewer, 'template_review_get_metrics', { days: 30 });
        const metrics = asRecord(asRecord(downstream.data).metrics);
        assertCondition(Boolean(metrics.window), 'Metrics response is missing window.', { metrics });
        assertCondition(Boolean(metrics.totals), 'Metrics response is missing totals.', { metrics });
        return ok(startedAt, {
          window: asRecord(metrics.window),
          totals: asRecord(metrics.totals),
        });
      }

      case 'airtable_queue_read': {
        const queue = await queueRead(reviewer);
        const dataPayload = asRecord(queue.data);
        assertCondition(typeof dataPayload.count === 'number', 'Queue response is missing count.', { data: dataPayload });
        assertCondition(asArray(dataPayload.items).length > 0, 'Queue response did not include any ready unassigned items.', { data: dataPayload });
        return ok(startedAt, {
          count: dataPayload.count,
          returnedItems: asArray(dataPayload.items).length,
          firstTemplate: asRecord(asArray(dataPayload.items)[0]).templateName ?? null,
        });
      }

      case 'airtable_my_queue_identity_read': {
        const { downstream } = await proxyTool(reviewer, 'template_review_my_queue', { limit: 10 });
        const dataPayload = asRecord(downstream.data);
        assertCondition(typeof dataPayload.count === 'number', 'my_queue response is missing count.', { data: dataPayload });
        assertCondition(dataPayload.assignedApplied === 'assigned_to_current_reviewer', 'my_queue did not apply current reviewer assignment filter.', {
          data: dataPayload,
        });
        return ok(startedAt, {
          count: dataPayload.count,
          assignedApplied: dataPayload.assignedApplied,
          returnedItems: asArray(dataPayload.items).length,
        });
      }

      case 'airtable_candidate_review_context_read': {
        const candidate = await readCandidate(reviewer);
        const { downstream } = await proxyTool(reviewer, 'template_review_get_review_context', {
          version_id: candidate.assignableVersionId,
        });
        const context = asRecord(asRecord(downstream.data).context);
        assertCondition(context.versionId === candidate.assignableVersionId, 'Review context returned the wrong version id.', {
          expected: candidate.assignableVersionId,
          actual: context.versionId,
        });
        return ok(startedAt, {
          versionId: context.versionId,
          assetId: context.assetId ?? candidate.assetId ?? null,
          templateName: context.templateName ?? candidate.templateName ?? null,
          canAssign: context.canAssign ?? null,
          canReview: context.canReview ?? null,
          isAssignedToCurrentReviewer: context.isAssignedToCurrentReviewer ?? null,
        });
      }

      case 'airtable_assign_unassign_write_roundtrip': {
        if (SKIP_WRITES) {
          return skipped(startedAt, 'WEBFLOW_TEMPLATE_REVIEW_EVAL_SKIP_WRITES=true');
        }
        return await withWriteLock(async () => {
          const candidate = await freshWriteCandidate(reviewer);
          const versionId = candidate.assignableVersionId;
          assertCondition(versionId, 'Write candidate is missing assignableVersionId.', { candidate });

          let assigned = false;
          let cleanupError: string | undefined;
          try {
            await proxyTool(reviewer, 'template_review_assign_self', { version_id: versionId });
            assigned = true;

            const assignedContext = await proxyTool(reviewer, 'template_review_get_review_context', { version_id: versionId });
            const context = asRecord(asRecord(assignedContext.downstream.data).context);
            assertCondition(context.isAssignedToCurrentReviewer === true, 'assign_self did not assign the version to current reviewer.', {
              versionId,
              context,
            });
          } finally {
            if (assigned) {
              try {
                await proxyTool(reviewer, 'template_review_unassign_self', { version_id: versionId });
              } catch (error) {
                cleanupError = error instanceof Error ? error.message : String(error);
              }
            }
          }

          assertCondition(!cleanupError, 'unassign_self cleanup failed after assign_self.', {
            versionId,
            cleanupError,
          });

          const finalContext = await proxyTool(reviewer, 'template_review_get_review_context', { version_id: versionId });
          const finalContextData = asRecord(asRecord(finalContext.downstream.data).context);
          assertCondition(finalContextData.isAssignedToCurrentReviewer === false, 'unassign_self did not clear current reviewer assignment.', {
            versionId,
            finalContext: finalContextData,
          });

          return ok(startedAt, {
            versionId,
            assetId: candidate.assetId ?? null,
            templateName: candidate.templateName ?? null,
            writeProbe: 'assign_self_then_unassign_self',
            cleanup: 'unassigned',
          });
        });
      }
    }
  } catch (error) {
    if (error instanceof CaseFailure) {
      return failed(startedAt, error.message, error.details);
    }
    return failed(startedAt, error instanceof Error ? error.message : String(error));
  }
}

function ok(startedAt: number, details: JsonRecord = {}, status: number | null = 200): EvalOutput {
  return {
    ok: true,
    status,
    durationMs: Date.now() - startedAt,
    details,
  };
}

function failed(startedAt: number, error: string, details: JsonRecord = {}, status: number | null = null): EvalOutput {
  return {
    ok: false,
    status,
    durationMs: Date.now() - startedAt,
    details,
    error,
  };
}

function skipped(startedAt: number, reason: string): EvalOutput {
  return {
    ok: false,
    skipped: true,
    reason,
    status: null,
    durationMs: Date.now() - startedAt,
    details: {},
  };
}

function passScore(output: EvalOutput): Score {
  if (output.skipped) return { name: 'case_passed', score: null, metadata: { reason: output.reason } };
  return {
    name: 'case_passed',
    score: output.ok ? 1 : 0,
    metadata: output.ok ? output.details : { error: output.error, ...output.details },
  };
}

function latencyScore(input: EvalInput, output: EvalOutput): Score {
  if (output.skipped) return { name: 'latency_budget', score: null, metadata: { reason: output.reason } };
  const budget =
    input.area === 'dify_live'
      ? DIFY_TIMEOUT_MS
      : input.area === 'airtable_read' || input.area === 'airtable_write'
        ? 60_000
        : 15_000;
  const score = output.durationMs <= budget ? 1 : output.durationMs <= budget * 1.5 ? 0.5 : 0;
  return {
    name: 'latency_budget',
    score,
    metadata: { durationMs: output.durationMs, budgetMs: budget },
  };
}

void Eval<EvalInput, EvalOutput>('create-something-mcp-fleet', {
  experimentName: 'webflow_template_review_hubs_airtable',
  data,
  task: runCase,
  scores: [({ output }) => passScore(output), ({ input, output }) => latencyScore(input, output)],
});
