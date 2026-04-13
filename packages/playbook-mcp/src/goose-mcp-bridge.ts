#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

type BridgeOptions = {
  url: string;
  bearerEnvVar: string;
  serverName: string;
  infisicalEnv: string;
  infisicalPath: string;
  infisicalProjectId?: string;
  infisicalIncludeImports: boolean;
};

const BRIDGE_NAME = 'create-something-goose-mcp-bridge';
const BRIDGE_VERSION = '0.1.0';
const DEFAULT_URL = 'https://mj.mcp.createsomething.agency/mcp';
const DEFAULT_BEARER_ENV_VAR = 'CS_HUB_MJ_API_TOKEN';
const DEFAULT_SERVER_NAME = 'mj-hub';
const DEFAULT_INFISICAL_ENV = process.env.INFISICAL_ENV || 'prod';
const DEFAULT_INFISICAL_PATH = process.env.INFISICAL_PATH || '/';
const DEFAULT_INFISICAL_INCLUDE_IMPORTS = parseBooleanEnv(
  process.env.INFISICAL_INCLUDE_IMPORTS,
  true,
);

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${BRIDGE_NAME}] fatal: ${message}`);
  process.exit(1);
});

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const authorization = resolveAuthorizationHeader(options);
  const client = new Client(
    {
      name: `${BRIDGE_NAME}:${options.serverName}`,
      version: BRIDGE_VERSION,
    },
    { capabilities: {} },
  );

  const transport = new StreamableHTTPClientTransport(
    new URL(options.url),
    {
      requestInit: {
        headers: {
          Authorization: authorization,
        },
      },
    },
  );

  await client.connect(transport);

  const server = new Server(
    {
      name: `${BRIDGE_NAME}-${options.serverName}`,
      version: BRIDGE_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async (request) =>
    client.listTools(request.params),
  );

  server.setRequestHandler(CallToolRequestSchema, async (request) =>
    client.callTool(request.params),
  );

  const stdio = new StdioServerTransport();
  await server.connect(stdio);

  const shutdown = async (exitCode: number) => {
    try {
      await client.close();
    } catch {
      // Best-effort cleanup.
    }
    process.exit(exitCode);
  };

  process.once('SIGINT', () => {
    void shutdown(0);
  });
  process.once('SIGTERM', () => {
    void shutdown(0);
  });
}

function parseArgs(argv: readonly string[]): BridgeOptions {
  const options: BridgeOptions = {
    url: DEFAULT_URL,
    bearerEnvVar: DEFAULT_BEARER_ENV_VAR,
    serverName: DEFAULT_SERVER_NAME,
    infisicalEnv: DEFAULT_INFISICAL_ENV,
    infisicalPath: DEFAULT_INFISICAL_PATH,
    infisicalProjectId: process.env.INFISICAL_PROJECT_ID || undefined,
    infisicalIncludeImports: DEFAULT_INFISICAL_INCLUDE_IMPORTS,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case '--url':
        options.url = requireValue(argv[index + 1], '--url');
        index += 1;
        break;
      case '--bearer-env-var':
        options.bearerEnvVar = requireValue(argv[index + 1], '--bearer-env-var');
        index += 1;
        break;
      case '--server-name':
        options.serverName = requireValue(argv[index + 1], '--server-name');
        index += 1;
        break;
      case '--infisical-env':
        options.infisicalEnv = requireValue(argv[index + 1], '--infisical-env');
        index += 1;
        break;
      case '--infisical-path':
        options.infisicalPath = requireValue(argv[index + 1], '--infisical-path');
        index += 1;
        break;
      case '--infisical-project-id':
        options.infisicalProjectId = requireValue(argv[index + 1], '--infisical-project-id');
        index += 1;
        break;
      case '--no-infisical-include-imports':
        options.infisicalIncludeImports = false;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp(): void {
  process.stdout.write(
    [
      'Usage: playbook-goose-mcp-bridge [options]',
      '',
      'Options:',
      `  --url <url>                     Streamable HTTP MCP endpoint (default: ${DEFAULT_URL})`,
      `  --bearer-env-var <name>        Env var containing the bearer token (default: ${DEFAULT_BEARER_ENV_VAR})`,
      `  --server-name <name>           Logical server name for diagnostics (default: ${DEFAULT_SERVER_NAME})`,
      `  --infisical-env <env>          Infisical environment for fallback export (default: ${DEFAULT_INFISICAL_ENV})`,
      `  --infisical-path <path>        Infisical path for fallback export (default: ${DEFAULT_INFISICAL_PATH})`,
      '  --infisical-project-id <id>    Optional Infisical project ID for fallback export',
      '  --no-infisical-include-imports Disable Infisical import traversal during fallback export',
      '  --help                         Show this help text',
      '',
    ].join('\n'),
  );
}

function requireValue(value: string | undefined, flag: string): string {
  if (!value) {
    throw new Error(`Missing value for ${flag}`);
  }

  return value;
}

function resolveAuthorizationHeader(options: BridgeOptions): string {
  const token = resolveBearerToken(options).trim();

  if (token.length < 1) {
    throw new Error(`Resolved empty bearer token from ${options.bearerEnvVar}`);
  }

  return token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;
}

function resolveBearerToken(options: BridgeOptions): string {
  const directToken = process.env[options.bearerEnvVar];

  if (directToken && directToken.trim().length > 0) {
    return directToken;
  }

  return loadSecretFromInfisical(options.bearerEnvVar, options);
}

function loadSecretFromInfisical(secretName: string, options: BridgeOptions): string {
  const args = [
    'export',
    '--format=json',
    `--env=${options.infisicalEnv}`,
    `--path=${options.infisicalPath}`,
    `--include-imports=${String(options.infisicalIncludeImports)}`,
  ];

  if (options.infisicalProjectId) {
    args.push(`--projectId=${options.infisicalProjectId}`);
  }

  const result = spawnSync('infisical', args, {
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 1024 * 1024,
  });

  if (result.error) {
    const code = 'code' in result.error ? result.error.code : undefined;

    if (code === 'ENOENT') {
      throw new Error(
        `Missing ${options.bearerEnvVar} and Infisical CLI is not installed. ` +
          `Install Infisical or run Goose with \`infisical run --env=${options.infisicalEnv} --path=${options.infisicalPath} -- ...\`.`,
      );
    }

    throw result.error;
  }

  if (result.status !== 0) {
    const details = [result.stderr, result.stdout]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(' ');

    throw new Error(
      `Infisical export failed while resolving ${secretName}. ` +
        `Run \`infisical login --interactive\` and confirm the project context. ${details}`.trim(),
    );
  }

  const payload = result.stdout.trim();

  if (payload.length < 1) {
    throw new Error(`Infisical export returned no payload while resolving ${secretName}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse Infisical JSON export: ${message}`);
  }

  const secret = extractSecretValue(parsed, secretName);

  if (!secret) {
    throw new Error(
      `Infisical did not return ${secretName}. ` +
        `Confirm the secret exists in env=${options.infisicalEnv} path=${options.infisicalPath}.`,
    );
  }

  return secret;
}

function extractSecretValue(payload: unknown, secretName: string): string | null {
  if (Array.isArray(payload)) {
    for (const entry of payload) {
      if (
        typeof entry === 'object'
        && entry !== null
        && 'key' in entry
        && 'value' in entry
        && entry.key === secretName
        && typeof entry.value === 'string'
      ) {
        return entry.value;
      }
    }
    return null;
  }

  if (typeof payload === 'object' && payload !== null) {
    const value = (payload as Record<string, unknown>)[secretName];

    if (typeof value === 'string') {
      return value;
    }
  }

  return null;
}

function parseBooleanEnv(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
}
