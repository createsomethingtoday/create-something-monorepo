#!/usr/bin/env tsx

type ParsedArgs = {
  projectName: string;
  mcpUrl: string;
  toolName: string;
  expectedServer?: string;
  accountId?: string;
  timeoutSeconds: number;
  pollIntervalMs: number;
  triggerOnly: boolean;
  triggerArgs: Record<string, unknown>;
};

const DEFAULT_MCP_URL = 'https://mcp.createsomething.ltd/mcp';
const DEFAULT_PROJECT_NAME = 'CREATE SOMETHING';
const DEFAULT_TOOL_NAME = 'search';
const DEFAULT_TIMEOUT_SECONDS = 90;
const DEFAULT_POLL_INTERVAL_MS = 3000;
const DEFAULT_TRIGGER_ARGS: Record<string, unknown> = {
  query: 'langfuse telemetry smoke check'
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
  pnpm langfuse:mcp:telemetry-smoke [options]

Options:
  --project-name <name>     Langfuse project name (default: ${DEFAULT_PROJECT_NAME})
  --mcp-url <url>           Full MCP URL (default: ${DEFAULT_MCP_URL})
  --tool-name <name>        MCP tool name to call (default: ${DEFAULT_TOOL_NAME})
  --expected-server <name>  metadata.server match (default: inferred from --mcp-url)
  --account-id <id>         Optional X-MCP-Account-Id header value
  --tool-args '<json>'      JSON object for tool arguments (default: ${JSON.stringify(DEFAULT_TRIGGER_ARGS)})
  --timeout-seconds <n>     Max wait for telemetry row (default: ${DEFAULT_TIMEOUT_SECONDS})
  --poll-interval-ms <n>    Poll interval for Langfuse query (default: ${DEFAULT_POLL_INTERVAL_MS})
  --trigger-only            Only trigger tool call, skip Langfuse polling
  --help                    Show this help
`);
}

function parseArgs(argv: string[]): ParsedArgs {
  let projectName = process.env.LANGFUSE_PROJECT_NAME?.trim() || DEFAULT_PROJECT_NAME;
  let mcpUrl = process.env.MCP_URL?.trim() || DEFAULT_MCP_URL;
  let toolName = process.env.MCP_TOOL_NAME?.trim() || DEFAULT_TOOL_NAME;
  let expectedServer = process.env.MCP_EXPECTED_SERVER?.trim();
  let accountId = process.env.MCP_ACCOUNT_ID?.trim();
  let timeoutSeconds = parsePositiveNumber(
    process.env.LANGFUSE_SMOKE_TIMEOUT_SECONDS,
    DEFAULT_TIMEOUT_SECONDS,
    'LANGFUSE_SMOKE_TIMEOUT_SECONDS'
  );
  let pollIntervalMs = parsePositiveNumber(
    process.env.LANGFUSE_SMOKE_POLL_INTERVAL_MS,
    DEFAULT_POLL_INTERVAL_MS,
    'LANGFUSE_SMOKE_POLL_INTERVAL_MS'
  );
  let triggerOnly = false;
  let triggerArgs: Record<string, unknown> = { ...DEFAULT_TRIGGER_ARGS };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    switch (arg) {
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

  if (!toolName) throw new Error('tool-name cannot be empty.');
  if (!mcpUrl) throw new Error('mcp-url cannot be empty.');
  if (!expectedServer) {
    expectedServer = inferExpectedServerFromUrl(mcpUrl);
  }

  return {
    projectName,
    mcpUrl: sanitizeUrl(mcpUrl),
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

  const initResponse = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'telemetry-smoke-init',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        clientInfo: { name: 'langfuse-mcp-telemetry-smoke', version: '1.0.0' },
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

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const expectedName = args.expectedServer
    ? `mcp:${args.expectedServer}:${args.toolName}`
    : `*:${args.toolName}`;

  const triggerResult = await triggerMcpToolCall(args);
  console.log('Trigger result:');
  console.log(JSON.stringify(triggerResult, null, 2));

  if (args.triggerOnly) {
    console.log('Trigger-only mode enabled; skipping Langfuse assertion.');
    return;
  }

  console.log(
    `Triggered ${expectedName}. Verify the emitted trace in Langfuse project ` +
      `${args.projectName}.`
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
});
