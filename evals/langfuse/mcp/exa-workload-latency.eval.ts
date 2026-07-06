import { Eval, type Score } from '../harness.js';
import { readEnv, readOptionalEnv } from './shared.js';

type ExaEvalInput = {
  name: string;
  hubUrl: string;
  authToken?: string;
  proxyToolName: string;
  args: Record<string, unknown>;
  durationBudgetMs: number;
  timeoutMs: number;
  requireResearchId?: boolean;
};

type ExaEvalOutput = {
  skipped: boolean;
  reason?: string;
  status: number | null;
  durationMs: number;
  routeOk: boolean;
  toolSuccessful: boolean;
  hasStructuredData: boolean;
  withinBudget: boolean;
  researchIdPresent: boolean;
  error?: string;
};

const DEFAULT_HUB_URL = 'https://mj.mcp.createsomething.agency/mcp';

function readOneEnv(names: string[]): string | undefined {
  for (const name of names) {
    const value = readOptionalEnv(name);
    if (value) return value;
  }
  return undefined;
}

function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = readOptionalEnv(name);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const EXA_HUB_TOKEN = readOneEnv([
  'MCP_EXA_HUB_TOKEN',
  'CS_HUB_MJ_API_TOKEN',
  'CS_HUB_MJ_AUTH_TOKEN',
  'HUB_API_TOKEN',
]);

const EXA_CASES = [
  {
    input: {
      name: 'exa-search',
      hubUrl: readEnv('MCP_EXA_HUB_URL', DEFAULT_HUB_URL),
      authToken: EXA_HUB_TOKEN,
      proxyToolName: 'composio-toolkit-exa__exa_search',
      args: {
        query: readEnv('MCP_EXA_SEARCH_QUERY', 'site:openai.com MCP server'),
        numResults: 1,
      },
      durationBudgetMs: readPositiveIntEnv('MCP_EXA_SEARCH_BUDGET_MS', 30_000),
      timeoutMs: readPositiveIntEnv('MCP_EXA_SEARCH_TIMEOUT_MS', 45_000),
    } satisfies ExaEvalInput,
    metadata: { suite: 'mcp-fleet', eval: 'exa_workload_latency', tool: 'exa_search' },
  },
  {
    input: {
      name: 'exa-answer',
      hubUrl: readEnv('MCP_EXA_HUB_URL', DEFAULT_HUB_URL),
      authToken: EXA_HUB_TOKEN,
      proxyToolName: 'composio-toolkit-exa__exa_answer',
      args: {
        query: readEnv('MCP_EXA_ANSWER_QUERY', 'What is MCP in the OpenAI ecosystem?'),
        text: false,
        model: readEnv('MCP_EXA_ANSWER_MODEL', 'exa'),
      },
      durationBudgetMs: readPositiveIntEnv('MCP_EXA_ANSWER_BUDGET_MS', 30_000),
      timeoutMs: readPositiveIntEnv('MCP_EXA_ANSWER_TIMEOUT_MS', 45_000),
    } satisfies ExaEvalInput,
    metadata: { suite: 'mcp-fleet', eval: 'exa_workload_latency', tool: 'exa_answer' },
  },
  {
    input: {
      name: 'exa-get-contents',
      hubUrl: readEnv('MCP_EXA_HUB_URL', DEFAULT_HUB_URL),
      authToken: EXA_HUB_TOKEN,
      proxyToolName: 'composio-toolkit-exa__exa_get_contents_action',
      args: {
        ids: [
          readEnv(
            'MCP_EXA_CONTENT_URL',
            'https://openai.com/index/new-tools-and-features-in-the-responses-api/',
          ),
        ],
        text: {
          max_characters: 800,
        },
      },
      durationBudgetMs: readPositiveIntEnv('MCP_EXA_CONTENT_BUDGET_MS', 30_000),
      timeoutMs: readPositiveIntEnv('MCP_EXA_CONTENT_TIMEOUT_MS', 45_000),
    } satisfies ExaEvalInput,
    metadata: { suite: 'mcp-fleet', eval: 'exa_workload_latency', tool: 'exa_get_contents_action' },
  },
  {
    input: {
      name: 'exa-create-research',
      hubUrl: readEnv('MCP_EXA_HUB_URL', DEFAULT_HUB_URL),
      authToken: EXA_HUB_TOKEN,
      proxyToolName: 'composio-toolkit-exa__exa_create_research',
      args: {
        instructions: readEnv(
          'MCP_EXA_RESEARCH_INSTRUCTIONS',
          'Summarize the latest MCP support discussed by OpenAI in one short paragraph.',
        ),
      },
      durationBudgetMs: readPositiveIntEnv('MCP_EXA_RESEARCH_BUDGET_MS', 35_000),
      timeoutMs: readPositiveIntEnv('MCP_EXA_RESEARCH_TIMEOUT_MS', 45_000),
      requireResearchId: true,
    } satisfies ExaEvalInput,
    metadata: { suite: 'mcp-fleet', eval: 'exa_workload_latency', tool: 'exa_create_research' },
  },
];

function configuredScore(output: ExaEvalOutput): Score {
  return {
    name: 'configured_for_live_run',
    score: output.skipped ? 0 : 1,
    metadata: { skipped: output.skipped, reason: output.reason },
  };
}

function routeOkScore(output: ExaEvalOutput): Score {
  if (output.skipped) {
    return { name: 'route_ok', score: null, metadata: { reason: output.reason } };
  }

  return {
    name: 'route_ok',
    score: output.routeOk ? 1 : 0,
    metadata: { status: output.status, error: output.error },
  };
}

function toolSuccessScore(output: ExaEvalOutput): Score {
  if (output.skipped) {
    return { name: 'tool_success', score: null, metadata: { reason: output.reason } };
  }

  return {
    name: 'tool_success',
    score: output.toolSuccessful ? 1 : 0,
    metadata: { error: output.error },
  };
}

function structuredDataScore(output: ExaEvalOutput): Score {
  if (output.skipped) {
    return { name: 'structured_data', score: null, metadata: { reason: output.reason } };
  }

  return {
    name: 'structured_data',
    score: output.hasStructuredData ? 1 : 0,
    metadata: { status: output.status },
  };
}

function durationBudgetScore(output: ExaEvalOutput): Score {
  if (output.skipped) {
    return { name: 'duration_budget', score: null, metadata: { reason: output.reason } };
  }

  return {
    name: 'duration_budget',
    score: output.withinBudget ? 1 : 0,
    metadata: { durationMs: output.durationMs },
  };
}

function researchKickoffScore(output: ExaEvalOutput): Score {
  if (output.skipped) {
    return { name: 'research_id_present', score: null, metadata: { reason: output.reason } };
  }

  return {
    name: 'research_id_present',
    score: output.researchIdPresent ? 1 : 0,
    metadata: { error: output.error },
  };
}

function parseRpcResponse(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('event:') || trimmed.includes('\ndata: ')) {
    const candidate = trimmed
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('data: '))
      .map((line) => line.slice('data: '.length).trim())
      .filter(Boolean)
      .at(-1);

    if (!candidate) return null;

    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }

    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
}

function extractStructuredContent(rpc: Record<string, unknown> | null): Record<string, unknown> | null {
  const result = rpc?.result;
  if (!result || typeof result !== 'object' || Array.isArray(result)) return null;
  const structured = (result as Record<string, unknown>).structuredContent;
  if (!structured || typeof structured !== 'object' || Array.isArray(structured)) return null;
  return structured as Record<string, unknown>;
}

function extractError(rpc: Record<string, unknown> | null, structured: Record<string, unknown> | null): string | undefined {
  const rpcError = rpc?.error;
  if (rpcError && typeof rpcError === 'object' && !Array.isArray(rpcError)) {
    const message = (rpcError as Record<string, unknown>).message;
    if (typeof message === 'string' && message.length > 0) return message;
  }

  const structuredError = structured?.error;
  if (typeof structuredError === 'string' && structuredError.length > 0) return structuredError;
  if (structuredError && typeof structuredError === 'object') {
    return JSON.stringify(structuredError);
  }

  return undefined;
}

async function executeHubTool(input: ExaEvalInput): Promise<ExaEvalOutput> {
  if (!input.authToken) {
    return {
      skipped: true,
      reason:
        'Set MCP_EXA_HUB_TOKEN or one of CS_HUB_MJ_API_TOKEN / CS_HUB_MJ_AUTH_TOKEN to run the Exa workload eval.',
      status: null,
      durationMs: 0,
      routeOk: false,
      toolSuccessful: false,
      hasStructuredData: false,
      withinBudget: false,
      researchIdPresent: false,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(input.hubUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.authToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: input.name,
        method: 'tools/call',
        params: {
          name: 'hub_execute_proxy_tool',
          arguments: {
            proxyToolName: input.proxyToolName,
            args: input.args,
          },
        },
      }),
      signal: controller.signal,
    });

    const text = await response.text();
    const durationMs = Date.now() - startedAt;
    const rpc = parseRpcResponse(text);
    const structured = extractStructuredContent(rpc);
    const successful = structured?.successful === true;
    const data = structured?.data;
    const hasStructuredData = Boolean(data && typeof data === 'object' && !Array.isArray(data));
    const researchIdPresent =
      input.requireResearchId === true &&
      Boolean(
        data &&
          typeof data === 'object' &&
          !Array.isArray(data) &&
          typeof (data as Record<string, unknown>).researchId === 'string',
      );
    const error = extractError(rpc, structured);

    return {
      skipped: false,
      status: response.status,
      durationMs,
      routeOk: response.ok,
      toolSuccessful: successful,
      hasStructuredData,
      withinBudget: durationMs <= input.durationBudgetMs,
      researchIdPresent: input.requireResearchId ? researchIdPresent : true,
      error,
    };
  } catch (error) {
    return {
      skipped: false,
      status: null,
      durationMs: Date.now() - startedAt,
      routeOk: false,
      toolSuccessful: false,
      hasStructuredData: false,
      withinBudget: false,
      researchIdPresent: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

void Eval<ExaEvalInput, ExaEvalOutput>('create-something-mcp-fleet', {
  experimentName: 'exa_workload_latency',
  data: EXA_CASES,
  task: executeHubTool,
  scores: [
    ({ output }) => configuredScore(output),
    ({ output }) => routeOkScore(output),
    ({ output }) => toolSuccessScore(output),
    ({ output }) => structuredDataScore(output),
    ({ output }) => durationBudgetScore(output),
    ({ output }) => researchKickoffScore(output),
  ],
});
