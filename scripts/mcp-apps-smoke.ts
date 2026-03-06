#!/usr/bin/env node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import TOML from '@iarna/toml';

type StringMap = Record<string, string>;

type McpServerConfig = {
  url?: string;
  http_headers?: StringMap;
  env_http_headers?: StringMap;
  bearer_token_env_var?: string;
};

type CodexConfig = {
  features?: {
    apps?: boolean;
  };
  mcp_servers?: Record<string, McpServerConfig>;
};

type RpcSuccess<T> = {
  jsonrpc: '2.0';
  id: string;
  result: T;
};

type RpcError = {
  jsonrpc: '2.0';
  id: string;
  error: {
    code: number;
    message: string;
  };
};

type RpcResponse<T> = RpcSuccess<T> | RpcError;

type ToolDefinition = {
  name: string;
  description?: string;
  _meta?: {
    ui?: {
      resourceUri?: string;
    };
  };
};

type ResourceDefinition = {
  uri: string;
  name?: string;
  mimeType?: string;
};

type ParsedArgs = {
  configPath: string;
  json: boolean;
  resourceUri: string;
  serverName: string;
  token?: string;
  toolName: string;
  url?: string;
};

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {
    configPath: path.join(os.homedir(), '.codex', 'config.toml'),
    json: false,
    resourceUri: 'ui://hub/overview',
    serverName: 'mj',
    toolName: 'hub_status',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--server' && next) {
      args.serverName = next;
      index += 1;
      continue;
    }

    if (arg === '--tool' && next) {
      args.toolName = next;
      index += 1;
      continue;
    }

    if (arg === '--resource' && next) {
      args.resourceUri = next;
      index += 1;
      continue;
    }

    if (arg === '--url' && next) {
      args.url = next;
      index += 1;
      continue;
    }

    if (arg === '--token' && next) {
      args.token = next;
      index += 1;
      continue;
    }

    if (arg === '--config' && next) {
      args.configPath = next;
      index += 1;
      continue;
    }

    if (arg === '--json') {
      args.json = true;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function printUsage(): void {
  console.log(`Usage: pnpm mcp:apps:smoke [options]

Options:
  --server <name>      Codex MCP server name from ~/.codex/config.toml (default: mj)
  --tool <name>        Tool expected to advertise MCP App metadata (default: hub_status)
  --resource <uri>     UI resource URI to validate (default: ui://hub/overview)
  --url <url>          Override MCP endpoint URL
  --token <token>      Override bearer token
  --config <path>      Override Codex config path
  --json               Emit JSON summary
  --help               Show this message
`);
}

async function readCodexConfig(configPath: string): Promise<CodexConfig> {
  const raw = await fs.readFile(configPath, 'utf8');
  return TOML.parse(raw) as unknown as CodexConfig;
}

function parseBearerHeader(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  const match = trimmed.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : trimmed;
}

function resolveToken(
  config: CodexConfig,
  serverName: string,
  explicitToken?: string,
): string | undefined {
  if (explicitToken) {
    return explicitToken;
  }

  const serverConfig = config.mcp_servers?.[serverName];
  const authHeader = serverConfig?.http_headers?.Authorization;
  const headerToken = parseBearerHeader(authHeader);
  if (headerToken) {
    return headerToken;
  }

  const bearerEnvVar = serverConfig?.bearer_token_env_var;
  if (bearerEnvVar && process.env[bearerEnvVar]) {
    return process.env[bearerEnvVar];
  }

  const authEnvVar = serverConfig?.env_http_headers?.Authorization;
  if (authEnvVar && process.env[authEnvVar]) {
    return parseBearerHeader(process.env[authEnvVar]);
  }

  return process.env.MCP_API_TOKEN;
}

function resolveUrl(config: CodexConfig, serverName: string, explicitUrl?: string): string {
  if (explicitUrl) {
    return explicitUrl;
  }

  const serverUrl = config.mcp_servers?.[serverName]?.url;
  if (!serverUrl) {
    throw new Error(`No URL configured for server "${serverName}"`);
  }

  return serverUrl;
}

async function callRpc<T>(
  url: string,
  token: string | undefined,
  id: string,
  method: string,
  params: Record<string, unknown>,
): Promise<RpcResponse<T>> {
  const headers: Record<string, string> = {
    Accept: 'application/json, text/event-stream',
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id,
      method,
      params,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${method} failed with HTTP ${response.status}: ${body}`);
  }

  return (await response.json()) as RpcResponse<T>;
}

function assertRpcSuccess<T>(response: RpcResponse<T>, label: string): RpcSuccess<T> {
  if ('error' in response) {
    throw new Error(`${label} returned JSON-RPC error ${response.error.code}: ${response.error.message}`);
  }

  return response;
}

function summarizeHtml(html: string): string {
  const compact = html.replace(/\s+/g, ' ').trim();
  return compact.slice(0, 160);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const config = await readCodexConfig(args.configPath);
  const url = resolveUrl(config, args.serverName, args.url);
  const token = resolveToken(config, args.serverName, args.token);

  const initializeResponse = assertRpcSuccess(
    await callRpc<{
      protocolVersion: string;
      capabilities?: {
        resources?: Record<string, unknown>;
      };
      serverInfo?: {
        name?: string;
        version?: string;
      };
    }>(
      url,
      token,
      'init-1',
      'initialize',
      {
        protocolVersion: '2025-11-25',
        capabilities: {},
        clientInfo: {
          name: 'mcp-apps-smoke',
          version: '1.0.0',
        },
      },
    ),
    'initialize',
  );

  const toolsResponse = assertRpcSuccess(
    await callRpc<{ tools: ToolDefinition[] }>(url, token, 'tools-1', 'tools/list', {}),
    'tools/list',
  );
  const tool = toolsResponse.result.tools.find((entry) => entry.name === args.toolName);
  if (!tool) {
    throw new Error(`Tool "${args.toolName}" not found on ${url}`);
  }

  const advertisedResourceUri = tool._meta?.ui?.resourceUri;
  if (advertisedResourceUri !== args.resourceUri) {
    throw new Error(
      `Tool "${args.toolName}" advertises "${advertisedResourceUri ?? 'none'}", expected "${args.resourceUri}"`,
    );
  }

  const resourcesResponse = assertRpcSuccess(
    await callRpc<{ resources: ResourceDefinition[] }>(url, token, 'resources-1', 'resources/list', {}),
    'resources/list',
  );
  const resource = resourcesResponse.result.resources.find((entry) => entry.uri === args.resourceUri);
  if (!resource) {
    throw new Error(`Resource "${args.resourceUri}" not found on ${url}`);
  }
  if (resource.mimeType !== 'text/html') {
    throw new Error(`Resource "${args.resourceUri}" has mimeType "${resource.mimeType}", expected "text/html"`);
  }

  const resourceReadResponse = assertRpcSuccess(
    await callRpc<{ contents: Array<{ uri: string; mimeType?: string; text?: string }> }>(
      url,
      token,
      'resource-read-1',
      'resources/read',
      { uri: args.resourceUri },
    ),
    'resources/read',
  );
  const htmlContent = resourceReadResponse.result.contents[0];
  if (!htmlContent?.text || !htmlContent.text.toLowerCase().includes('<html')) {
    throw new Error(`Resource "${args.resourceUri}" did not return HTML text content`);
  }

  const toolCallResponse = assertRpcSuccess(
    await callRpc<{
      content?: Array<{ type?: string; text?: string }>;
      structuredContent?: Record<string, unknown>;
    }>(url, token, 'tool-call-1', 'tools/call', {
      name: args.toolName,
      arguments: {},
    }),
    'tools/call',
  );

  const summary = {
    codexAppsEnabled: config.features?.apps === true,
    configPath: args.configPath,
    serverName: args.serverName,
    url,
    authenticated: Boolean(token),
    toolName: args.toolName,
    resourceUri: args.resourceUri,
    serverInfo: initializeResponse.result.serverInfo ?? null,
    protocolVersion: initializeResponse.result.protocolVersion,
    hasResourcesCapability: Boolean(initializeResponse.result.capabilities?.resources),
    toolAdvertisesUi: true,
    resourceMimeType: resource.mimeType ?? null,
    htmlPreview: summarizeHtml(htmlContent.text),
    toolCallReturnedStructuredContent: Boolean(toolCallResponse.result.structuredContent),
    nextManualPrompt: `In Codex Desktop, ask: "Run ${args.toolName}."`,
  };

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log('MCP Apps smoke check passed.');
  console.log(`Server: ${summary.serverName} -> ${summary.url}`);
  console.log(`Apps flag in Codex config: ${summary.codexAppsEnabled ? 'enabled' : 'disabled'}`);
  console.log(`Tool: ${summary.toolName}`);
  console.log(`UI resource: ${summary.resourceUri}`);
  console.log(`Server protocol: ${summary.protocolVersion}`);
  console.log(`Resources capability: ${summary.hasResourcesCapability ? 'present' : 'missing'}`);
  console.log(`Resource MIME type: ${summary.resourceMimeType}`);
  console.log(`HTML preview: ${summary.htmlPreview}`);
  console.log(`Tool returns structured content: ${summary.toolCallReturnedStructuredContent}`);
  console.log(summary.nextManualPrompt);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`MCP Apps smoke check failed: ${message}`);
  process.exitCode = 1;
});
