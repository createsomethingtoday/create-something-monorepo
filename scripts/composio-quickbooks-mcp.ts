#!/usr/bin/env tsx

import { ComposioClient } from '../packages/composio-bridge/src/client.ts';

type Command = 'create' | 'generate' | 'create-and-generate';

type CliOptions = {
  command: Command;
  name: string;
  authConfigId: string | null;
  allowedTools: string[];
  userId: string | null;
  serverId: string | null;
};

const DEFAULT_NAME = 'create-something-quickbooks';
const TOOLKIT = 'quickbooks';

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const apiKey = requireEnv('COMPOSIO_API_KEY');
  const client = new ComposioClient({ apiKey });

  if (options.command === 'generate') {
    const userId = requireOption(
      options.userId,
      'Missing user ID. Pass --user-id or COMPOSIO_QUICKBOOKS_USER_ID.'
    );
    const serverId = requireOption(
      options.serverId,
      'Missing MCP config ID. Pass --server-id or COMPOSIO_QUICKBOOKS_MCP_CONFIG_ID.'
    );
    const instance = await client.generateMcpInstance(userId, serverId);
    printJson({
      command: options.command,
      toolkit: TOOLKIT,
      serverId,
      userId,
      instance
    });
    return;
  }

  const authConfigId = requireOption(
    options.authConfigId,
    'Missing QuickBooks auth config ID. Pass --auth-config-id or COMPOSIO_QUICKBOOKS_AUTH_CONFIG_ID.'
  );

  const server = await client.createMcpConfig({
    name: options.name,
    toolkits: [{ toolkit: TOOLKIT, authConfigId }],
    ...(options.allowedTools.length > 0 ? { allowedTools: options.allowedTools } : {})
  });

  if (options.command === 'create-and-generate') {
    const userId = requireOption(
      options.userId,
      'Missing user ID. Pass --user-id or COMPOSIO_QUICKBOOKS_USER_ID.'
    );
    const instance = await client.generateMcpInstance(userId, server.id);
    printJson({
      command: options.command,
      toolkit: TOOLKIT,
      authConfigId,
      allowedTools: options.allowedTools,
      server,
      userId,
      instance
    });
    return;
  }

  printJson({
    command: options.command,
    toolkit: TOOLKIT,
    authConfigId,
    allowedTools: options.allowedTools,
    server
  });
}

function parseArgs(args: string[]): CliOptions {
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const command = parseCommand(args[0]);
  const rest = command === args[0] ? args.slice(1) : args;

  return {
    command,
    name: readFlag(rest, '--name') ?? process.env.COMPOSIO_QUICKBOOKS_MCP_NAME ?? DEFAULT_NAME,
    authConfigId:
      readFlag(rest, '--auth-config-id') ?? process.env.COMPOSIO_QUICKBOOKS_AUTH_CONFIG_ID ?? null,
    allowedTools: parseList(
      readFlag(rest, '--allowed-tools') ?? process.env.COMPOSIO_QUICKBOOKS_ALLOWED_TOOLS
    ),
    userId: readFlag(rest, '--user-id') ?? process.env.COMPOSIO_QUICKBOOKS_USER_ID ?? null,
    serverId: readFlag(rest, '--server-id') ?? process.env.COMPOSIO_QUICKBOOKS_MCP_CONFIG_ID ?? null
  };
}

function parseCommand(value: string | undefined): Command {
  if (!value || value.startsWith('--')) return 'create';
  if (value === 'create' || value === 'generate' || value === 'create-and-generate') return value;
  throw new Error(`Unknown command "${value}". Expected create, generate, or create-and-generate.`);
}

function readFlag(args: string[], name: string): string | null {
  const index = args.indexOf(name);
  if (index === -1) return null;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`Flag ${name} requires a value.`);
  }
  return value;
}

function parseList(raw: string | undefined | null): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) {
      throw new Error('Allowed tools JSON must be an array of tool slugs.');
    }
    return uniqueStrings(parsed);
  }

  return uniqueStrings(trimmed.split(','));
}

function uniqueStrings(values: unknown[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter((value) => value.length > 0)
    )
  );
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function requireOption(value: string | null, message: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(message);
  }
  return trimmed;
}

function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp(): void {
  console.log(`
composio-quickbooks-mcp — create or generate a Composio-hosted QuickBooks MCP

Usage:
  pnpm mcp:composio:quickbooks create --auth-config-id ac_xxx
  pnpm mcp:composio:quickbooks create-and-generate --auth-config-id ac_xxx --user-id user_123
  pnpm mcp:composio:quickbooks generate --server-id mcp_xxx --user-id user_123

Environment:
  COMPOSIO_API_KEY                         required
  COMPOSIO_QUICKBOOKS_AUTH_CONFIG_ID       used by create/create-and-generate
  COMPOSIO_QUICKBOOKS_MCP_CONFIG_ID        used by generate
  COMPOSIO_QUICKBOOKS_USER_ID              used by generate/create-and-generate
  COMPOSIO_QUICKBOOKS_MCP_NAME             optional, defaults to ${DEFAULT_NAME}
  COMPOSIO_QUICKBOOKS_ALLOWED_TOOLS        optional CSV or JSON array of tool slugs
`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
