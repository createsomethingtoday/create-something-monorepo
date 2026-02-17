#!/usr/bin/env node

/**
 * Playbook MCP — Stdio Server
 *
 * Host workflow playbooks for MCP onboarding. Teaches non-technical users
 * how to work effectively in Codex, Cursor, and Claude Desktop.
 *
 * Lightweight by design — ships alongside client MCPs for onboarding.
 * No philosophy, no papers, no design system. Just workflow guidance.
 *
 * Architecture:
 *   Database (Resources)  — per-host playbooks + list/comparison/graduation resources
 *   Judgment (Prompts)    — workflow_setup, host_comparison, project_structure
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerResources } from './resources.js';
import { registerTools } from './tools.js';
import { registerPrompts } from './prompts.js';
import { HOST_PLAYBOOKS } from './playbooks.js';
import { MCP_CATALOG } from './catalog.js';

const RESOURCE_COUNT = HOST_PLAYBOOKS.length + 3; // list + per-host + comparison + graduation path

const server = new McpServer({
  name: 'playbook',
  version: '1.1.0',
});

registerResources(server);
registerTools(server);
registerPrompts(server);

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

const transport = new StdioServerTransport();
await server.connect(transport);

console.error('Playbook MCP running on stdio');
console.error(
  `Content: ${HOST_PLAYBOOKS.length} host playbooks, ${MCP_CATALOG.length} catalog entries, 8 tools, 3 prompts, ${RESOURCE_COUNT} resources`,
);
