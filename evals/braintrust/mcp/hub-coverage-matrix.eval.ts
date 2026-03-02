import { Eval, type Score } from 'braintrust';

type HubInput = {
  name: string;
  url: string;
  authToken: string;
  sessionToken?: string;
};

type HubOutput = {
  status: number | null;
  ok: boolean;
  toolCount: number;
  durationMs: number;
  error?: string;
};

type HubCaseConfig = {
  name: string;
  url: string;
  authTokenEnvVar: string;
  sessionTokenEnvVar?: string;
};

function requireEnv(envVarName: string): string {
  const value = process.env[envVarName]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${envVarName}`);
  }
  return value;
}

const HUB_CASE_CONFIGS: HubCaseConfig[] = [
  {
    name: 'lainy',
    url: 'https://cs-hub-lainy.createsomething.workers.dev/mcp',
    authTokenEnvVar: 'CS_HUB_LAINY_AUTH_TOKEN',
  },
  {
    name: 'danny',
    url: 'https://cs-mcp-hub-remote.createsomething.workers.dev/mcp',
    authTokenEnvVar: 'CS_HUB_DANNY_AUTH_TOKEN',
    sessionTokenEnvVar: 'CS_HUB_DANNY_SESSION_TOKEN',
  },
  {
    name: 'august',
    url: 'https://cs-hub-august.createsomething.workers.dev/mcp',
    authTokenEnvVar: 'CS_HUB_AUGUST_AUTH_TOKEN',
  },
  {
    name: 'filip',
    url: 'https://cs-hub-filip.createsomething.workers.dev/mcp',
    authTokenEnvVar: 'CS_HUB_FILIP_AUTH_TOKEN',
  },
  {
    name: 'leah',
    url: 'https://cs-hub-leah.createsomething.workers.dev/mcp',
    authTokenEnvVar: 'CS_HUB_LEAH_AUTH_TOKEN',
  },
  {
    name: 'mj',
    url: 'https://cs-hub-mj.createsomething.workers.dev/mcp',
    authTokenEnvVar: 'CS_HUB_MJ_AUTH_TOKEN',
  },
];

const HUB_CASES = HUB_CASE_CONFIGS.map((config) => {
  const authToken = requireEnv(config.authTokenEnvVar);
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
  return { name: 'hub_reachable', score: output.ok ? 1 : 0, metadata: { status: output.status } };
}

function toolsScore(output: HubOutput): Score {
  return { name: 'tools_available', score: output.toolCount > 0 ? 1 : 0, metadata: { toolCount: output.toolCount } };
}

function latencyScore(output: HubOutput): Score {
  const score = output.durationMs <= 1200 ? 1 : output.durationMs <= 3000 ? 0.5 : 0;
  return { name: 'latency_budget', score, metadata: { durationMs: output.durationMs, thresholdMs: 1200 } };
}

void Eval<HubInput, HubOutput>('create-something-mcp-fleet', {
  experimentName: 'hub_coverage_matrix',
  data: HUB_CASES,
  task: async (input): Promise<HubOutput> => {
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
