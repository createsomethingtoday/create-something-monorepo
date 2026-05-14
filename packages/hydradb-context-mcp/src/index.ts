#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { HydraRecallClient, resolveHydraConfig } from './client.js';
import { registerTools } from './tools.js';

const config = resolveHydraConfig();
const client = new HydraRecallClient(config);

const server = new McpServer({
  name: 'hydradb-context-mcp',
  version: '0.1.0'
});

registerTools(server, client);

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

const transport = new StdioServerTransport();
await server.connect(transport);

console.error('Hydra DB Context MCP running on stdio');
console.error(
  `Capabilities: read-only context_recall; tenant=${config.tenantId}; allowed_sub_tenants=${config.allowedSubTenantIds.join(',')}`
);
