import { execFileSync } from 'node:child_process';

import { Eval, type Score } from '../harness.js';

type ReviewerHubInput = {
  lane: string;
  url: string;
  tokenEnvVar: string;
  token?: string;
};

type ReviewerHubOutput = {
  skipped: boolean;
  reason?: string;
  healthOk: boolean;
  hubStatusOk: boolean;
  servicesOk: boolean;
  searchOk: boolean;
  templateHealthOk: boolean;
  enabledTemplateReview: boolean;
  visibleProxyToolCount: number;
  templateReviewProxyToolCount: number;
  baseId?: string;
  durationMs: number;
  error?: string;
};

const TEMPLATE_REVIEW_SERVER = 'webflow-template-review-mcp';
const TEMPLATE_REVIEW_HEALTH_TOOL = `${TEMPLATE_REVIEW_SERVER}__template_review_health`;
const EXPECTED_BASE_ID = 'appMoIgXMTTTNIc3p';

const REVIEWER_HUB_CASES = [
  {
    lane: 'eric',
    url: 'https://wf-template-review-eric.mcp.createsomething.agency/mcp',
    tokenEnvVar: 'CS_HUB_WF_TEMPLATE_REVIEW_ERIC_API_TOKEN'
  },
  {
    lane: 'mariana',
    url: 'https://wf-template-review-mariana.mcp.createsomething.agency/mcp',
    tokenEnvVar: 'CS_HUB_WF_TEMPLATE_REVIEW_MARIANA_API_TOKEN'
  },
  {
    lane: 'natalia',
    url: 'https://wf-template-review-natalia.mcp.createsomething.agency/mcp',
    tokenEnvVar: 'CS_HUB_WF_TEMPLATE_REVIEW_NATALIA_API_TOKEN'
  },
  {
    lane: 'vicki',
    url: 'https://wf-template-review-vicki.mcp.createsomething.agency/mcp',
    tokenEnvVar: 'CS_HUB_WF_TEMPLATE_REVIEW_VICKI_API_TOKEN'
  }
].map((input) => ({
  input: {
    ...input,
    token: readToken(input.tokenEnvVar)
  } satisfies ReviewerHubInput,
  metadata: {
    suite: 'webflow-template-review-hubs-airtable',
    lane: input.lane
  }
}));

type JsonRecord = Record<string, unknown>;

function readToken(secretName: string): string | undefined {
  const envValue = process.env[secretName]?.trim();
  if (envValue) return envValue;

  const args = [
    'secrets',
    'get',
    secretName,
    '--plain',
    '--silent',
    `--env=${process.env.INFISICAL_ENV?.trim() || 'prod'}`,
    `--path=${process.env.INFISICAL_PATH?.trim() || '/'}`,
    `--include-imports=${process.env.INFISICAL_INCLUDE_IMPORTS?.trim() || 'true'}`
  ];
  const projectId = process.env.INFISICAL_PROJECT_ID?.trim();
  if (projectId) args.push(`--projectId=${projectId}`);

  try {
    const value = execFileSync('infisical', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
    return value || undefined;
  } catch {
    return undefined;
  }
}

async function callRpc(
  url: string,
  token: string,
  method: string,
  params: JsonRecord
): Promise<JsonRecord> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: `${Date.now()}-${Math.random()}`,
      method,
      params
    })
  });

  const text = await response.text();
  const payload = parseJsonRecord(text) ?? {};
  if (!response.ok || payload.error || record(payload.result).isError === true) {
    throw new Error(`JSON-RPC ${method} failed with HTTP ${response.status}: ${text}`);
  }

  return payload;
}

async function callTool(
  url: string,
  token: string,
  name: string,
  args: JsonRecord = {}
): Promise<JsonRecord> {
  return callRpc(url, token, 'tools/call', {
    name,
    arguments: args
  });
}

async function executeProxyTool(
  url: string,
  token: string,
  proxyToolName: string,
  args: JsonRecord = {}
): Promise<JsonRecord> {
  const payload = await callTool(url, token, 'hub_execute_proxy_tool', {
    proxyToolName,
    args
  });
  return parseToolJson(payload);
}

function parseToolJson(payload: JsonRecord): JsonRecord {
  const result = record(payload.result);
  if (record(result.structuredContent).ok !== undefined) return record(result.structuredContent);

  const content = result.content;
  if (!Array.isArray(content)) return {};
  for (const item of content) {
    const text = record(item).text;
    if (typeof text !== 'string') continue;
    const parsed = parseJsonRecord(text);
    if (parsed) return parsed;
  }
  return {};
}

function parseJsonRecord(value: string): JsonRecord | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    return record(parsed);
  } catch {
    return null;
  }
}

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function score(name: string, value: boolean, metadata?: Record<string, unknown>): Score {
  return { name, score: value ? 1 : 0, metadata };
}

function nullableScore(
  name: string,
  output: ReviewerHubOutput,
  value: boolean,
  metadata?: Record<string, unknown>
): Score {
  if (output.skipped) return { name, score: null, metadata: { reason: output.reason } };
  return score(name, value, metadata);
}

function latencyScore(output: ReviewerHubOutput): Score {
  if (output.skipped)
    return { name: 'latency_budget', score: null, metadata: { reason: output.reason } };
  const scoreValue = output.durationMs <= 30_000 ? 1 : output.durationMs <= 45_000 ? 0.5 : 0;
  return {
    name: 'latency_budget',
    score: scoreValue,
    metadata: { durationMs: output.durationMs, thresholdMs: 30_000 }
  };
}

void Eval<ReviewerHubInput, ReviewerHubOutput>('create-something-mcp-fleet', {
  experimentName: 'webflow_template_review_hubs_airtable',
  data: REVIEWER_HUB_CASES,
  task: async (input): Promise<ReviewerHubOutput> => {
    const startedAt = Date.now();

    if (!input.token) {
      return {
        skipped: true,
        reason: `Missing ${input.tokenEnvVar}`,
        healthOk: false,
        hubStatusOk: false,
        servicesOk: false,
        searchOk: false,
        templateHealthOk: false,
        enabledTemplateReview: false,
        visibleProxyToolCount: 0,
        templateReviewProxyToolCount: 0,
        durationMs: 0
      };
    }

    try {
      const healthResponse = await fetch(input.url.replace(/\/mcp\/?$/, '/health'));
      const healthOk = healthResponse.ok;

      const statusPayload = parseToolJson(await callTool(input.url, input.token, 'hub_status'));
      const statusData = record(statusPayload.data ?? statusPayload);
      const enabledServerNames = array(statusData.enabledServerNames);
      const enabledTemplateReview = enabledServerNames.includes(TEMPLATE_REVIEW_SERVER);
      const visibleProxyToolCount = Number(statusData.proxyToolCount ?? 0);

      const servicesPayload = parseToolJson(
        await callTool(input.url, input.token, 'hub_list_services')
      );
      const servicesData = record(servicesPayload.data ?? servicesPayload);
      const services = array(servicesData.services);
      const templateService = services
        .map(record)
        .find((service) => service.name === TEMPLATE_REVIEW_SERVER);
      const servicesOk = Boolean(templateService && templateService.activeInDiscovery === true);

      const searchPayload = parseToolJson(
        await callTool(input.url, input.token, 'hub_search_proxy_tools', {
          serverName: TEMPLATE_REVIEW_SERVER,
          limit: 100
        })
      );
      const searchData = record(searchPayload.data ?? searchPayload);
      const searchedTools = array(searchData.tools).map(record);
      const templateReviewProxyToolCount = searchedTools.filter(
        (tool) =>
          typeof tool.proxyToolName === 'string' &&
          tool.proxyToolName.startsWith(`${TEMPLATE_REVIEW_SERVER}__`)
      ).length;
      const searchOk = templateReviewProxyToolCount > 0;

      const templateHealth = await executeProxyTool(
        input.url,
        input.token,
        TEMPLATE_REVIEW_HEALTH_TOOL
      );
      const templateHealthData = record(templateHealth.data ?? templateHealth);
      const baseId =
        typeof templateHealthData.baseId === 'string' ? templateHealthData.baseId : undefined;
      const templateHealthOk = templateHealth.ok === true && baseId === EXPECTED_BASE_ID;

      return {
        skipped: false,
        healthOk,
        hubStatusOk: enabledTemplateReview && visibleProxyToolCount > 0,
        servicesOk,
        searchOk,
        templateHealthOk,
        enabledTemplateReview,
        visibleProxyToolCount,
        templateReviewProxyToolCount,
        baseId,
        durationMs: Date.now() - startedAt
      };
    } catch (error) {
      return {
        skipped: false,
        healthOk: false,
        hubStatusOk: false,
        servicesOk: false,
        searchOk: false,
        templateHealthOk: false,
        enabledTemplateReview: false,
        visibleProxyToolCount: 0,
        templateReviewProxyToolCount: 0,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  },
  scores: [
    ({ output }) => score('configured_for_live_run', !output.skipped, { reason: output.reason }),
    ({ output }) => nullableScore('hub_health', output, output.healthOk, { error: output.error }),
    ({ output }) => nullableScore('template_review_enabled', output, output.enabledTemplateReview),
    ({ output }) =>
      nullableScore('proxy_tools_visible', output, output.searchOk, {
        visibleProxyToolCount: output.visibleProxyToolCount,
        templateReviewProxyToolCount: output.templateReviewProxyToolCount
      }),
    ({ output }) =>
      nullableScore('template_review_airtable_health', output, output.templateHealthOk, {
        baseId: output.baseId
      }),
    ({ output }) => latencyScore(output)
  ]
});
