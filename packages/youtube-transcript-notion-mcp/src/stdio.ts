#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { config as loadEnv } from 'dotenv';

import {
  createRuntimeDependencies,
  registerPrompts,
  registerResources,
  registerTools,
  SERVER_NAME,
  SERVER_VERSION,
} from './index.js';
import type { PackageEnv } from './config.js';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const envFiles = [
  path.resolve(moduleDir, '../.env.local'),
  path.resolve(moduleDir, '../.env'),
  path.resolve(moduleDir, '../../../.env.local'),
  path.resolve(moduleDir, '../../../.env'),
];

for (const envFile of envFiles) {
  loadEnv({
    path: envFile,
    override: false,
  });
}

async function main(): Promise<void> {
  const runtime = createRuntimeDependencies(process.env as PackageEnv);
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  registerResources(server, runtime);
  registerTools(server, runtime);
  registerPrompts(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`${SERVER_NAME} v${SERVER_VERSION} running on stdio`);
  console.error(
    `directProviderMode=${runtime.serverInfo.directProviderMode ?? 'auto'}`,
  );
}

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
