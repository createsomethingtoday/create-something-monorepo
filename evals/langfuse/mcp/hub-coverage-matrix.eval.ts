import { Eval, type Score } from '../harness.js';
import { HUB_CASE_CONFIGS, readOneEnv } from './hub-cases.js';

type HubInput = {
  name: string;
  url: string;
  authToken?: string;
  sessionToken?: string;
};

type HubOutput = {
  skipped?: boolean;
  reason?: string;
  status: number | null;
  ok: boolean;
  toolCount: number;
  durationMs: number;
  error?: string;
};

const LATENCY_BUDGET_MS = readPositiveIntEnv('MCP_HUB_COVERAGE_LATENCY_BUDGET_MS', 15_000);

const HUB_CASES = HUB_CASE_CONFIGS.map((config) => {
  const authToken = readOneEnv(config.authTokenEnvVars);
  const sessionToken = config.sessionTokenEnvVar ? process.env[config.sessionTokenEnvVar]?.trim() : undefined;

  return {
    input: {
      name: config.name,
      url: config.url,
      authToken,
      ...(sessionToken ? { sessionToken } : {}),
    } satisfies HubInput,
    metadata: { suite: 'mcp-fleet', eval: 'hub_coverage_matrix' },
  };
});

function coverageScore(output: HubOutput): Score {
  if (output.skipped) {
    return { name: 'hub_reachable', score: null, metadata: { reason: output.reason } };
  }
  return { name: 'hub_reachable', score: output.ok ? 1 : 0, metadata: { status: output.status } };
}

function toolsScore(output: HubOutput): Score {
  if (output.skipped) {
    return { name: 'tools_available', score: null, metadata: { reason: output.reason } };
  }
  return { name: 'tools_available', score: output.toolCount > 0 ? 1 : 0, metadata: { toolCount: output.toolCount } };
}

function latencyScore(output: HubOutput): Score {
  if (output.skipped) {
    return { name: 'latency_budget', score: null, metadata: { reason: output.reason } };
  }
  const score = output.durationMs <= LATENCY_BUDGET_MS ? 1 : output.durationMs <= LATENCY_BUDGET_MS * 2 ? 0.5 : 0;
  return { name: 'latency_budget', score, metadata: { durationMs: output.durationMs, thresholdMs: LATENCY_BUDGET_MS } };
}

function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

void Eval<HubInput, HubOutput>('create-something-mcp-fleet', {
  experimentName: 'hub_coverage_matrix',
  data: HUB_CASES,
  task: async (input): Promise<HubOutput> => {
    if (!input.authToken) {
      return {
        skipped: true,
        reason: `Missing required env var (one of): ${HUB_CASE_CONFIGS.find((config) => config.name === input.name)?.authTokenEnvVars.join(', ') ?? 'unknown'}`,
        status: null,
        ok: false,
        toolCount: 0,
        durationMs: 0,
      };
    }

    const started = Date.now();
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${input.authToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        'MCP-Protocol-Version': '2025-03-26',
      };
      if (input.sessionToken) headers['X-MCP-Session-Token'] = input.sessionToken;

      const response = await fetch(input.url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
      });

      let toolCount = 0;
      try {
        const json = (await response.json()) as { result?: { tools?: unknown[] } };
        if (Array.isArray(json?.result?.tools)) toolCount = json.result.tools.length;
      } catch {
        toolCount = 0;
      }

      return {
        status: response.status,
        ok: response.ok,
        toolCount,
        durationMs: Date.now() - started,
      };
    } catch (error) {
      return {
        status: null,
        ok: false,
        toolCount: 0,
        durationMs: Date.now() - started,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
  scores: [({ output }) => coverageScore(output), ({ output }) => toolsScore(output), ({ output }) => latencyScore(output)],
});
