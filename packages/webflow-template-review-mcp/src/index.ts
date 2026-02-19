#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { AirtableClient } from './airtable.js';
import { AIRTABLE_BASE_ID_DEFAULT } from './schema.js';
import { registerResources } from './resources.js';
import { registerTools } from './tools.js';
import { registerPrompts } from './prompts.js';

async function main() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID || AIRTABLE_BASE_ID_DEFAULT;

  if (!apiKey) {
    process.stderr.write('Missing AIRTABLE_API_KEY for webflow-template-review-mcp.\n');
    process.exit(1);
  }

  const server = new McpServer({
    name: 'webflow-template-review-mcp',
    version: '1.0.0',
  });

  const client = new AirtableClient({
    apiKey,
    baseId,
  });

  const context = {
    client,
    authRequired: false,
    baseId,
  };

  registerResources(server, context);
  registerTools(server, context);
  registerPrompts(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  process.stderr.write(`${(error as Error).message}\n`);
  process.exit(1);
});
