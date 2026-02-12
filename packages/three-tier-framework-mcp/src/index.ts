#!/usr/bin/env node

/**
 * Three-Tier Framework MCP Server
 *
 * The Three-Tier Framework (Database, Automation, Judgment) exposed as an MCP server.
 * First server in the CREATE SOMETHING monorepo to use all three MCP primitives.
 *
 * Architecture (the server demonstrates its own thesis):
 * - Database Tier (Resources): Framework definitions, mappings, reference data
 * - Automation Tier (Tools): Classification, debugging heuristic, analysis
 * - Judgment Tier (Prompts): Architecture review templates, design guidance
 *
 * The recursive property: This server IS the framework it describes,
 * served through the very primitives the framework maps to tiers.
 *
 * Version 1.3 — February 2026
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerResources } from './resources.js';
import { registerTools } from './tools.js';
import { registerPrompts } from './prompts.js';

// =============================================================================
// Server Setup — All Three Capabilities
// =============================================================================

const server = new Server(
  {
    name: 'three-tier-framework',
    version: '1.0.0',
    icons: [{
      src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI2IiBmaWxsPSIjMDAwMDAwIi8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNCw0KSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZmlsbD0ibm9uZSI+PHBhdGggZD0iTTIxIDhhMiAyIDAgMCAwLTEtMS43M2wtNy00YTIgMiAwIDAgMC0yIDBsLTcgNEEyIDIgMCAwIDAgMyA4djhhMiAyIDAgMCAwIDEgMS43M2w3IDRhMiAyIDAgMCAwIDIgMGw3LTRBMiAyIDAgMCAwIDIxIDE2WiIvPjxwYXRoIGQ9Im0zLjMgNyA4LjcgNSA4LjctNSIvPjxwYXRoIGQ9Ik0xMiAyMlYxMiIvPjwvZz48L3N2Zz4=',
      mimeType: 'image/svg+xml',
      sizes: ['any'],
    }],
  },
  {
    capabilities: {
      resources: {},  // Database tier — application-controlled
      tools: {},      // Automation tier — model-controlled
      prompts: {}     // Judgment tier — user-controlled
    }
  }
);

// Register all three primitive handlers
registerResources(server);   // 11 resource URIs
registerTools(server);       // 5 tools
registerPrompts(server);     // 5 prompts

// =============================================================================
// Server Lifecycle
// =============================================================================

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

// Start server on stdio transport
const transport = new StdioServerTransport();
server.connect(transport);

console.error('Three-Tier Framework MCP server running on stdio');
console.error('Capabilities: Resources (Database) + Tools (Automation) + Prompts (Judgment)');
