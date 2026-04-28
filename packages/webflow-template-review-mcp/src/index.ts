#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { AirtableClient } from './airtable.js';
import { DEFAULT_AIRTABLE_BASE_ID } from './schema.js';
import { registerPrompts } from './prompts.js';
import { registerResources } from './resources.js';
import { registerTools } from './tools.js';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function isEnabled(value?: string): boolean {
  return value?.trim().toLowerCase() === 'true';
}

async function main() {
  const apiKey = requireEnv('AIRTABLE_API_KEY');
  const baseId = process.env.AIRTABLE_BASE_ID ?? DEFAULT_AIRTABLE_BASE_ID;

  const client = new AirtableClient({
    apiKey,
    baseId,
  });

  const server = new McpServer({
    name: 'webflow-template-review-mcp',
    version: '1.0.0',
  });

  registerResources(server, () => client);
  registerTools(server, () => client, () => null, {
    allowOperatorMutations: isEnabled(process.env.TEMPLATE_REVIEW_ALLOW_OPERATOR_MUTATIONS),
  });
  registerPrompts(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('webflow-template-review-mcp running on stdio');
}

main().catch((error) => {
  console.error('[webflow-template-review-mcp] fatal error:', error);
  process.exit(1);
});
