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

const HUB_CASES = [
  {
    input: {
      name: 'lainy',
      url: 'https://cs-hub-lainy.createsomething.workers.dev/mcp',
      authToken: '111ebcd206e736e5ca1b3f1319025c7ccbbd120b4c9e8f9ca9befd3f7b8430a0',
    } satisfies HubInput,
    metadata: { suite: 'mcp-fleet', eval: 'hub_coverage_matrix' },
  },
  {
    input: {
      name: 'danny',
      url: 'https://cs-mcp-hub-remote.createsomething.workers.dev/mcp',
      authToken: 'e226b5e28c0fb42023d25514d5ff6a16bd583825657921fd5fde1a23f7a9a9fb',
      sessionToken:
        'ms_tok_25c76df341e00893b0a4a3dac5947955d3a53782c431e4c705b4270034ad2861fe9e844e8c1115c65defde79886f4f60',
    } satisfies HubInput,
    metadata: { suite: 'mcp-fleet', eval: 'hub_coverage_matrix' },
  },
  {
    input: {
      name: 'august',
      url: 'https://cs-hub-august.createsomething.workers.dev/mcp',
      authToken: 'c68ca90d9efb8fdc8204a9e037718bd9f935985846a2530ea60ace5fa4f6647b',
    } satisfies HubInput,
    metadata: { suite: 'mcp-fleet', eval: 'hub_coverage_matrix' },
  },
  {
    input: {
      name: 'filip',
      url: 'https://cs-hub-filip.createsomething.workers.dev/mcp',
      authToken: 'c5d5c9a1def0906c32608bd8fc29923f05be4af056ca80098e048e30f3f63874',
    } satisfies HubInput,
    metadata: { suite: 'mcp-fleet', eval: 'hub_coverage_matrix' },
  },
  {
    input: {
      name: 'leah',
      url: 'https://cs-hub-leah.createsomething.workers.dev/mcp',
      authToken: '8f7816ec8a95c6dfe578f1828ff743076e4b38f7bfe21ab84594ea519b05605e',
    } satisfies HubInput,
    metadata: { suite: 'mcp-fleet', eval: 'hub_coverage_matrix' },
  },
  {
    input: {
      name: 'mj',
      url: 'https://cs-hub-mj.createsomething.workers.dev/mcp',
      authToken: '795b3abbdc4d927eeefbc1a76ef6ae3735b6bc13b86e42b8728448878a9fd620',
    } satisfies HubInput,
    metadata: { suite: 'mcp-fleet', eval: 'hub_coverage_matrix' },
  },
];

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
