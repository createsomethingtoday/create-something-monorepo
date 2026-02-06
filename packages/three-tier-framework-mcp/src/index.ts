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
    version: '1.0.0'
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
