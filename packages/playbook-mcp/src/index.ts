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
 *   Database (Resources)  — 6 playbook resources
 *   Judgment (Prompts)    — workflow_setup, host_comparison, project_structure
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerResources } from './resources.js';
import { registerPrompts } from './prompts.js';
import { HOST_PLAYBOOKS } from './playbooks.js';

const server = new McpServer({
  name: 'playbook',
  version: '1.0.0',
});

registerResources(server);
registerPrompts(server);

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

const transport = new StdioServerTransport();
await server.connect(transport);

console.error('Playbook MCP running on stdio');
console.error(`Content: ${HOST_PLAYBOOKS.length} host playbooks, 3 prompts, 6 resources`);
