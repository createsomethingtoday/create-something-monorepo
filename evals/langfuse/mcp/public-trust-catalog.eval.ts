import { Eval, type Score } from '../harness.js';

type PublicMcpInput = {
  slug: string;
  url: string;
  expectedTools: string[];
  callTool: string;
  callArguments: Record<string, unknown>;
  expectedContent: string[];
  latencyBudgetMs: number;
};

type PublicMcpOutput = {
  slug: string;
  initStatus: number | null;
  listStatus: number | null;
  callStatus: number | null;
  endpointReachable: boolean;
  authNotRequired: boolean;
  toolsListed: boolean;
  listedTools: string[];
  expectedToolsPresent: boolean;
  missingTools: string[];
  toolCallOk: boolean;
  contentText: string;
  groundedContent: boolean;
  noCredentialMaterial: boolean;
  durationMs: number;
  error?: string;
};

type JsonRecord = Record<string, unknown>;

const PUBLIC_MCP_CASES: Array<{ input: PublicMcpInput; metadata: Record<string, string> }> = [
  {
    input: {
      slug: 'create-something',
      url: 'https://mcp.createsomething.ltd/mcp',
      expectedTools: ['search', 'relate', 'classify_component', 'apply_triad', 'audit_design'],
      callTool: 'search',
      callArguments: { query: 'CREATE SOMETHING public trust catalog', limit: 3 },
      expectedContent: ['CREATE SOMETHING'],
      latencyBudgetMs: 15_000
    },
    metadata: { suite: 'public-trust-catalog', subject: 'mcp/create-something' }
  },
  {
    input: {
      slug: 'three-tier-framework',
      url: 'https://framework.mcp.createsomething.agency/mcp',
      expectedTools: [
        'classify_component',
        'debug_system',
        'analyze_mcp_server',
        'identify_policy_artifacts',
        'map_to_automotive',
        'architecture_diff'
      ],
      callTool: 'classify_component',
      callArguments: { description: 'A read-only MCP registry that stores and returns public server metadata.' },
      expectedContent: ['Database'],
      latencyBudgetMs: 15_000
    },
    metadata: { suite: 'public-trust-catalog', subject: 'mcp/three-tier-framework' }
  },
  {
    input: {
      slug: 'playbook',
      url: 'https://playbook.mcp.createsomething.ltd/mcp',
      expectedTools: [
        'get_playbook',
        'compare_hosts',
        'get_folder_structure',
        'list_workflows',
        'get_workflow',
        'list_outcome_playbooks',
        'get_outcome_playbook',
        'detect_host',
        'list_available_mcps',
        'verify_mcp_connection'
      ],
      callTool: 'list_available_mcps',
      callArguments: {},
      expectedContent: ['mcp'],
      latencyBudgetMs: 15_000
    },
    metadata: { suite: 'public-trust-catalog', subject: 'mcp/playbook' }
  }
];

function mcpHeaders(sessionId?: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'MCP-Protocol-Version': '2025-03-26',
    ...(sessionId ? { 'Mcp-Session-Id': sessionId } : {})
  };
}

async function postJsonRpc(url: string, body: JsonRecord, sessionId?: string) {
  const response = await fetch(url, {
    method: 'POST',
    headers: mcpHeaders(sessionId),
    body: JSON.stringify(body)
  });

  return {
    status: response.status,
    ok: response.ok,
    sessionId: response.headers.get('mcp-session-id') ?? sessionId,
    json: await parseMcpResponse(response)
  };
}

async function parseMcpResponse(response: Response): Promise<JsonRecord | null> {
  const text = await response.text();
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('text/event-stream')) {
    const data = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.replace(/^data:\s?/, '').trim())
      .filter(Boolean)
      .at(-1);

    if (!data || data === '[DONE]') return null;
    return parseJsonRecord(data);
  }

  return parseJsonRecord(text);
}

function parseJsonRecord(text: string): JsonRecord | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as JsonRecord) : null;
  } catch {
    return null;
  }
}

function listedToolNames(json: JsonRecord | null): string[] {
  const tools = record(json?.result).tools;
  if (!Array.isArray(tools)) return [];
  return tools
    .map((tool) => {
      if (!tool || typeof tool !== 'object' || Array.isArray(tool)) return '';
      const name = (tool as JsonRecord).name;
      return typeof name === 'string' ? name : '';
    })
    .filter(Boolean);
}

function extractContentText(json: JsonRecord | null): string {
  const result = record(json?.result);
  const structuredContent = result.structuredContent;
  const content = result.content;
  const chunks: string[] = [];

  if (structuredContent !== undefined) {
    chunks.push(JSON.stringify(structuredContent));
  }

  if (Array.isArray(content)) {
    for (const item of content) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const text = (item as JsonRecord).text;
      if (typeof text === 'string') chunks.push(text);
    }
  }

  return chunks.join('\n');
}

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function hasCredentialMaterial(value: string): boolean {
  return [
    /\bBearer\s+[A-Za-z0-9._-]{8,}/i,
    /\b(?:sk|pk|app)-[A-Za-z0-9_-]{12,}/,
    /\b[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{12,}\b/,
    /\/(?:dify|mcp-hub|secrets?)\/[A-Za-z0-9/_-]+/i,
    /\bInfisical\b/i
  ].some((pattern) => pattern.test(value));
}

function booleanScore(name: string, value: boolean, metadata?: Record<string, unknown>): Score {
  return {
    name,
    score: value ? 1 : 0,
    metadata
  };
}

function latencyScore(output: PublicMcpOutput, input: PublicMcpInput): Score {
  const score = output.durationMs <= input.latencyBudgetMs ? 1 : output.durationMs <= input.latencyBudgetMs * 1.5 ? 0.5 : 0;
  return {
    name: 'latency_budget',
    score,
    metadata: { durationMs: output.durationMs, thresholdMs: input.latencyBudgetMs }
  };
}

void Eval<PublicMcpInput, PublicMcpOutput>('create-something-public-mcp-trust', {
  experimentName: 'public_mcp_trust_cards',
  data: PUBLIC_MCP_CASES,
  task: async (input): Promise<PublicMcpOutput> => {
    const startedAt = Date.now();

    try {
      const init = await postJsonRpc(input.url, {
        jsonrpc: '2.0',
        id: `${input.slug}-init`,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          clientInfo: { name: 'public-mcp-trust-eval', version: '1.0.0' },
          capabilities: {}
        }
      });

      const list = await postJsonRpc(
        input.url,
        {
          jsonrpc: '2.0',
          id: `${input.slug}-tools-list`,
          method: 'tools/list',
          params: {}
        },
        init.sessionId ?? undefined
      );

      const call = await postJsonRpc(
        input.url,
        {
          jsonrpc: '2.0',
          id: `${input.slug}-tools-call`,
          method: 'tools/call',
          params: {
            name: input.callTool,
            arguments: input.callArguments
          }
        },
        init.sessionId ?? list.sessionId ?? undefined
      );

      const listedTools = listedToolNames(list.json);
      const missingTools = input.expectedTools.filter((tool) => !listedTools.includes(tool));
      const contentText = extractContentText(call.json);
      const endpointReachable = init.ok && list.ok;
      const authNotRequired = ![401, 403].includes(init.status) && ![401, 403].includes(list.status) && ![401, 403].includes(call.status);
      const toolCallOk = call.ok && !record(call.json).error;

      return {
        slug: input.slug,
        initStatus: init.status,
        listStatus: list.status,
        callStatus: call.status,
        endpointReachable,
        authNotRequired,
        toolsListed: listedTools.length > 0,
        listedTools,
        expectedToolsPresent: missingTools.length === 0,
        missingTools,
        toolCallOk,
        contentText,
        groundedContent: input.expectedContent.every((expected) =>
          contentText.toLowerCase().includes(expected.toLowerCase())
        ),
        noCredentialMaterial: !hasCredentialMaterial(contentText),
        durationMs: Date.now() - startedAt
      };
    } catch (error) {
      return {
        slug: input.slug,
        initStatus: null,
        listStatus: null,
        callStatus: null,
        endpointReachable: false,
        authNotRequired: false,
        toolsListed: false,
        listedTools: [],
        expectedToolsPresent: false,
        missingTools: input.expectedTools,
        toolCallOk: false,
        contentText: '',
        groundedContent: false,
        noCredentialMaterial: false,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  },
  scores: [
    ({ output }) => booleanScore('endpoint_reachable', output.endpointReachable, { initStatus: output.initStatus, listStatus: output.listStatus }),
    ({ output }) => booleanScore('auth_not_required', output.authNotRequired, { initStatus: output.initStatus, callStatus: output.callStatus }),
    ({ output }) => booleanScore('tools_listed', output.toolsListed, { toolCount: output.listedTools.length }),
    ({ output }) => booleanScore('expected_tools_present', output.expectedToolsPresent, { missingTools: output.missingTools }),
    ({ output }) => booleanScore('tool_call_ok', output.toolCallOk, { callStatus: output.callStatus, error: output.error }),
    ({ output }) => booleanScore('grounded_content', output.groundedContent),
    ({ output }) => booleanScore('no_credential_material', output.noCredentialMaterial),
    ({ input, output }) => latencyScore(output, input)
  ]
});
