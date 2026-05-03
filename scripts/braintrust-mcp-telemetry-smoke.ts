#!/usr/bin/env tsx

import { _internalGetGlobalState, initLogger } from 'braintrust';

type ParsedArgs = {
  projectId: string;
  projectName: string;
  mcpUrl: string;
  bearerToken?: string;
  toolName: string;
  expectedServer?: string;
  accountId?: string;
  timeoutSeconds: number;
  pollIntervalMs: number;
  triggerOnly: boolean;
  triggerArgs: Record<string, unknown>;
};

type ProjectLogRow = {
  id: string;
  created: string;
  name: string | null;
  server: string | null;
  tool: string | null;
  accountId: string | null;
};

const DEFAULT_MCP_URL = 'https://mcp.createsomething.ltd/mcp';
const DEFAULT_PROJECT_NAME = 'CREATE SOMETHING';
const DEFAULT_TOOL_NAME = 'search';
const DEFAULT_TIMEOUT_SECONDS = 90;
const DEFAULT_POLL_INTERVAL_MS = 3000;
const DEFAULT_TRIGGER_ARGS: Record<string, unknown> = {
  query: 'braintrust telemetry smoke check'
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function sanitizeUrl(url: string): string {
  return url.trim();
}

function inferExpectedServerFromUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'mcp.createsomething.ltd') {
      return 'create-something';
    }
  } catch {
    // ignore URL parsing issues and fall back to explicit flag/env
  }
  return undefined;
}

function parsePositiveNumber(
  value: string | undefined,
  fallback: number,
  flagName: string
): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid value for ${flagName}: ${value}`);
  }
  return parsed;
}

function parseJsonObject(value: string, flagName: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`Invalid JSON for ${flagName}.`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${flagName} must be a JSON object.`);
  }
  return parsed as Record<string, unknown>;
}

function printUsage(): void {
  console.log(`Usage:
  pnpm braintrust:mcp:telemetry-smoke [options]

Options:
  --project-id <id>         Braintrust project UUID (default: $BRAINTRUST_PROJECT_ID)
  --project-name <name>     Braintrust project name (default: ${DEFAULT_PROJECT_NAME})
  --mcp-url <url>           Full MCP URL (default: ${DEFAULT_MCP_URL})
  --bearer-token <token>    Optional Authorization bearer token (default: $MCP_AUTH_TOKEN, $MCP_API_KEY, $ACTIVE_JOBS_MCP_API_KEY)
  --tool-name <name>        MCP tool name to call (default: ${DEFAULT_TOOL_NAME})
  --expected-server <name>  metadata.server match (default: inferred from --mcp-url)
  --account-id <id>         Optional X-MCP-Account-Id header value
  --tool-args '<json>'      JSON object for tool arguments (default: ${JSON.stringify(DEFAULT_TRIGGER_ARGS)})
  --timeout-seconds <n>     Max wait for telemetry row (default: ${DEFAULT_TIMEOUT_SECONDS})
  --poll-interval-ms <n>    Poll interval for Braintrust query (default: ${DEFAULT_POLL_INTERVAL_MS})
  --trigger-only            Only trigger tool call, skip Braintrust polling
  --help                    Show this help
`);
}

function parseArgs(argv: string[]): ParsedArgs {
  let projectId = process.env.BRAINTRUST_PROJECT_ID?.trim() ?? '';
  let projectName = process.env.BRAINTRUST_PROJECT_NAME?.trim() || DEFAULT_PROJECT_NAME;
  let mcpUrl = process.env.MCP_URL?.trim() || DEFAULT_MCP_URL;
  let bearerToken =
    process.env.MCP_AUTH_TOKEN?.trim() ||
    process.env.MCP_API_KEY?.trim() ||
    process.env.ACTIVE_JOBS_MCP_API_KEY?.trim();
  let toolName = process.env.MCP_TOOL_NAME?.trim() || DEFAULT_TOOL_NAME;
  let expectedServer = process.env.MCP_EXPECTED_SERVER?.trim();
  let accountId = process.env.MCP_ACCOUNT_ID?.trim();
  let timeoutSeconds = parsePositiveNumber(
    process.env.BRAINTRUST_SMOKE_TIMEOUT_SECONDS,
    DEFAULT_TIMEOUT_SECONDS,
    'BRAINTRUST_SMOKE_TIMEOUT_SECONDS'
  );
  let pollIntervalMs = parsePositiveNumber(
    process.env.BRAINTRUST_SMOKE_POLL_INTERVAL_MS,
    DEFAULT_POLL_INTERVAL_MS,
    'BRAINTRUST_SMOKE_POLL_INTERVAL_MS'
  );
  let triggerOnly = false;
  let triggerArgs: Record<string, unknown> = { ...DEFAULT_TRIGGER_ARGS };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    switch (arg) {
      case '--project-id':
        if (!next) throw new Error('Missing value for --project-id.');
        projectId = next.trim();
        i += 1;
        break;
      case '--project-name':
        if (!next) throw new Error('Missing value for --project-name.');
        projectName = next.trim();
        i += 1;
        break;
      case '--mcp-url':
        if (!next) throw new Error('Missing value for --mcp-url.');
        mcpUrl = next.trim();
        i += 1;
        break;
      case '--bearer-token':
        if (!next) throw new Error('Missing value for --bearer-token.');
        bearerToken = next.trim();
        i += 1;
        break;
      case '--expected-server':
        if (!next) throw new Error('Missing value for --expected-server.');
        expectedServer = next.trim();
        i += 1;
        break;
      case '--tool-name':
        if (!next) throw new Error('Missing value for --tool-name.');
        toolName = next.trim();
        i += 1;
        break;
      case '--account-id':
        if (!next) throw new Error('Missing value for --account-id.');
        accountId = next.trim();
        i += 1;
        break;
      case '--tool-args':
        if (!next) throw new Error('Missing value for --tool-args.');
        triggerArgs = parseJsonObject(next, '--tool-args');
        i += 1;
        break;
      case '--timeout-seconds':
        timeoutSeconds = parsePositiveNumber(next, DEFAULT_TIMEOUT_SECONDS, '--timeout-seconds');
        i += 1;
        break;
      case '--poll-interval-ms':
        pollIntervalMs = parsePositiveNumber(next, DEFAULT_POLL_INTERVAL_MS, '--poll-interval-ms');
        i += 1;
        break;
      case '--trigger-only':
        triggerOnly = true;
        break;
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
      default:
        throw new Error(`Unknown flag: ${arg}`);
    }
  }

  if (!projectId) {
    throw new Error('Project ID is required (set BRAINTRUST_PROJECT_ID or pass --project-id).');
  }

  if (!toolName) throw new Error('tool-name cannot be empty.');
  if (!mcpUrl) throw new Error('mcp-url cannot be empty.');
  if (!expectedServer) {
    expectedServer = inferExpectedServerFromUrl(mcpUrl);
  }

  return {
    projectId,
    projectName,
    mcpUrl: sanitizeUrl(mcpUrl),
    bearerToken,
    toolName,
    expectedServer,
    accountId,
    timeoutSeconds,
    pollIntervalMs,
    triggerOnly,
    triggerArgs
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function triggerMcpToolCall(args: ParsedArgs): Promise<unknown> {
  const endpoint = args.mcpUrl;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream'
  };

  if (args.accountId) {
    headers['X-MCP-Account-Id'] = args.accountId;
  }
  if (args.bearerToken) {
    headers.Authorization = `Bearer ${args.bearerToken}`;
  }

  const initResponse = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'telemetry-smoke-init',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        clientInfo: { name: 'braintrust-mcp-telemetry-smoke', version: '1.0.0' },
        capabilities: {}
      }
    })
  });
  const initBody = await parseMcpResponse(initResponse);
  if (!initResponse.ok) {
    throw new Error(
      `MCP initialize failed (${initResponse.status} ${initResponse.statusText}): ${JSON.stringify(initBody)}`
    );
  }
  const sessionId = initResponse.headers.get('mcp-session-id');
  if (sessionId) {
    headers['Mcp-Session-Id'] = sessionId;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'telemetry-smoke-call',
      method: 'tools/call',
      params: {
        name: args.toolName,
        arguments: args.triggerArgs
      }
    })
  });

  const body = await parseMcpResponse(response);
  if (!response.ok) {
    throw new Error(
      `MCP trigger failed (${response.status} ${response.statusText}): ${JSON.stringify(body)}`
    );
  }

  const maybeObj = body as { error?: unknown; result?: unknown };
  if (maybeObj?.error) {
    throw new Error(`MCP returned JSON-RPC error: ${JSON.stringify(maybeObj.error)}`);
  }

  return maybeObj?.result ?? body;
}

async function parseMcpResponse(response: Response): Promise<unknown> {
  const bodyText = await response.text();
  let body: unknown = bodyText;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('text/event-stream')) {
    const dataLines = bodyText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('data: '))
      .map((line) => line.slice('data: '.length).trim())
      .filter((line) => line.length > 0);
    const candidate = dataLines[dataLines.length - 1];
    if (!candidate) {
      return bodyText;
    }
    try {
      return JSON.parse(candidate);
    } catch {
      return candidate;
    }
  }
  try {
    body = JSON.parse(bodyText);
  } catch {
    // keep raw text for diagnostics
  }
  return body;
}

async function fetchProjectLogs(projectId: string, limit = 200): Promise<ProjectLogRow[]> {
  const state = _internalGetGlobalState();
  const response = await state.apiConn().post(
    'btql',
    {
      query: {
        select: [{ op: 'star' }],
        from: {
          op: 'function',
          name: { op: 'ident', name: ['project_logs'] },
          args: [{ op: 'literal', value: projectId }]
        },
        limit
      },
      use_columnstore: false,
      brainstore_realtime: true,
      query_source: 'braintrust_mcp_telemetry_smoke'
    },
    { headers: { 'Accept-Encoding': 'gzip' } }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Braintrust BTQL query failed (${response.status}): ${text}`);
  }

  const json = (await response.json()) as { data?: Array<Record<string, unknown>> };
  const rows = json.data ?? [];
  return rows.map((row) => {
    const spanAttributes =
      row.span_attributes && typeof row.span_attributes === 'object'
        ? (row.span_attributes as Record<string, unknown>)
        : {};
    const metadata =
      row.metadata && typeof row.metadata === 'object'
        ? (row.metadata as Record<string, unknown>)
        : {};

    return {
      id: String(row.id ?? ''),
      created: String(row.created ?? ''),
      name: (spanAttributes.name as string) ?? (row.name as string) ?? null,
      server: (metadata.server as string) ?? null,
      tool: (metadata.tool as string) ?? null,
      accountId: (metadata.accountId as string) ?? null
    };
  });
}

function findMatchingRows(
  rows: ProjectLogRow[],
  startMs: number,
  expectedServer: string | undefined,
  toolName: string
) {
  return rows.filter((row) => {
    const createdMs = Date.parse(row.created);
    if (Number.isNaN(createdMs) || createdMs < startMs) return false;

    const toolMatch = row.tool === toolName || row.name?.endsWith(`:${toolName}`) || false;
    if (!toolMatch) return false;

    if (!expectedServer) return true;
    const serverNameMatch =
      row.server === expectedServer || row.name?.includes(`:${expectedServer}:`);
    return Boolean(serverNameMatch);
  });
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = requireEnv('BRAINTRUST_API_KEY');

  const logger = initLogger({
    apiKey,
    projectId: args.projectId,
    projectName: args.projectName,
    asyncFlush: true,
    setCurrent: true
  });
  await logger.project;

  const startMs = Date.now();
  const expectedName = args.expectedServer
    ? `mcp:${args.expectedServer}:${args.toolName}`
    : `*:${args.toolName}`;

  const triggerResult = await triggerMcpToolCall(args);
  console.log('Trigger result:');
  console.log(JSON.stringify(triggerResult, null, 2));

  if (args.triggerOnly) {
    console.log('Trigger-only mode enabled; skipping Braintrust assertion.');
    return;
  }

  const deadline = startMs + args.timeoutSeconds * 1000;
  let lastRows: ProjectLogRow[] = [];

  while (Date.now() < deadline) {
    lastRows = await fetchProjectLogs(args.projectId, 200);
    const matches = findMatchingRows(lastRows, startMs, args.expectedServer, args.toolName);
    if (matches.length > 0) {
      const newest = matches.sort((a, b) => Date.parse(b.created) - Date.parse(a.created))[0];
      console.log('\nTelemetry assertion passed.');
      console.log(
        JSON.stringify(
          {
            expectedName,
            matchedId: newest.id,
            matchedCreated: newest.created,
            matchedName: newest.name,
            matchedServer: newest.server,
            matchedTool: newest.tool,
            matchedAccountId: newest.accountId
          },
          null,
          2
        )
      );
      return;
    }

    await sleep(args.pollIntervalMs);
  }

  const hints = lastRows
    .filter((row) => (args.expectedServer ? row.server === args.expectedServer : true))
    .slice(0, 5);

  throw new Error(
    `Timed out waiting for telemetry row. Expected ${expectedName} in project ${args.projectId}.\n` +
      `Recent related rows:\n${JSON.stringify(hints, null, 2)}`
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
});
