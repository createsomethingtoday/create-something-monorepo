#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { AirtableClient } from './airtable.js';
import { DEFAULT_REVIEWER_EXCEPTIONS_BASE_ID, DEFAULT_REVIEWER_EXCEPTIONS_TABLE_ID } from './schema.js';
import { registerResources } from './resources.js';
import { registerTools } from './tools.js';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function main() {
  const apiKey = requireEnv('AIRTABLE_REVIEWER_EXCEPTIONS_API_KEY');
  const baseId = process.env.AIRTABLE_REVIEWER_EXCEPTIONS_BASE_ID ?? DEFAULT_REVIEWER_EXCEPTIONS_BASE_ID;
  const tableId = process.env.AIRTABLE_REVIEWER_EXCEPTIONS_TABLE_ID ?? DEFAULT_REVIEWER_EXCEPTIONS_TABLE_ID;

  const client = new AirtableClient({
    apiKey,
    baseId,
    tableId,
  });

  const server = new McpServer({
    name: 'webflow-reviewer-exceptions-mcp',
    version: '1.0.0',
  });

  registerResources(server, () => client);
  registerTools(server, () => client);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('webflow-reviewer-exceptions-mcp running on stdio');
}

main().catch((error) => {
  console.error('[webflow-reviewer-exceptions-mcp] fatal error:', error);
  process.exit(1);
});
