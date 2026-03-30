#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { AirtableClient } from './airtable.js';
import { DEFAULT_AIRTABLE_BASE_ID } from './schema.js';
import { registerPrompts } from './prompts.js';
import { getReviewerProfileForAccount, listReviewerProfiles, parseReviewerDirectory } from './reviewer-directory.js';
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
  const apiKey = requireEnv('AIRTABLE_API_KEY');
  const baseId = process.env.AIRTABLE_BASE_ID ?? DEFAULT_AIRTABLE_BASE_ID;
  const reviewerDirectory = parseReviewerDirectory(process.env.REVIEWER_DIRECTORY_JSON);
  const getReviewer = () =>
    getReviewerProfileForAccount(reviewerDirectory, process.env.MCP_ACCOUNT_ID ?? null);
  const listReviewers = () => listReviewerProfiles(reviewerDirectory);

  const client = new AirtableClient({
    apiKey,
    baseId,
  });

  const server = new McpServer({
    name: 'webflow-template-admin-mcp',
    version: '1.0.0',
  });

  registerResources(server, () => client, getReviewer, listReviewers);
  registerTools(server, () => client, getReviewer, listReviewers);
  registerPrompts(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('webflow-template-admin-mcp running on stdio');
}

main().catch((error) => {
  console.error('[webflow-template-admin-mcp] fatal error:', error);
  process.exit(1);
});
