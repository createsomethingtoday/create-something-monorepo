#!/usr/bin/env node

/**
 * CREATE SOMETHING Content MCP — Stdio Server
 *
 * The single entry point to all CREATE SOMETHING content:
 * philosophy, research, design system, patterns, and practices.
 *
 * Architecture (demonstrates the Three-Tier Framework):
 *   Database (Resources)  — Papers, Canon, Patterns, Masters, Framework, Graph, Praxis, Products
 *   Automation (Tools)    — Search, Relate, Classify, Apply Triad, Audit Design
 *   Judgment (Prompts)    — Architecture Review, Design Review, Triad Analysis, MCP Design, Research Dive
 *
 * Usage:
 *   node dist/index.js                          # Run on stdio
 *   claude mcp add create-something -- node dist/index.js  # Add to Claude Code
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerResources } from './resources.js';
import { registerTools } from './tools.js';
import { registerPrompts } from './prompts.js';

// Content counts for info
import { PAPERS } from './content/generated/papers.js';
import { CANON_PAGES } from './content/generated/canon.js';
import { CANON_REGISTRY_MANIFEST } from './content/generated/canon-registry.js';
import {
  CANON_PUBLIC_EXPORT_CLASSIFICATION_RULES
} from './content/generated/canon-public-export-classification.js';
import { CANON_OVERLAY_CATALOG } from './content/generated/canon-overlay-catalog.js';
import { PATTERNS } from './content/generated/patterns.js';
import { GRAPH_NODES } from './content/generated/graph.js';
import { PROPERTY_DOCUMENTS } from './content/generated/property-docs.js';
import { MASTERS } from './content/masters.js';
import { PRAXIS_EXERCISES } from './content/praxis.js';
import { PRODUCTS } from './content/products.js';
import { HOST_PLAYBOOKS } from './content/playbooks.js';

// =============================================================================
// Server Setup — All Three Capabilities
// =============================================================================

const server = new McpServer({
  name: 'create-something',
  version: '1.0.0',
});

// Register all three primitive handlers
registerResources(server);
registerTools(server);
registerPrompts(server);

// =============================================================================
// Server Lifecycle
// =============================================================================

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

// Start server on stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);

console.error('CREATE SOMETHING Content MCP running on stdio');
console.error(`Content: ${PAPERS.length} papers, ${CANON_PAGES.length} canon pages, ${CANON_REGISTRY_MANIFEST.items.length} canon registry items, ${CANON_PUBLIC_EXPORT_CLASSIFICATION_RULES.length} canon export policy rules, ${CANON_OVERLAY_CATALOG.templates.length} canon overlay templates, ${PATTERNS.length} patterns, ${MASTERS.length} masters, ${GRAPH_NODES.length} graph nodes, ${PRAXIS_EXERCISES.length} exercises, ${PRODUCTS.length} products, ${HOST_PLAYBOOKS.length} host playbooks, ${PROPERTY_DOCUMENTS.length} property docs`);
console.error('Capabilities: Resources (Database) + Tools (Automation) + Prompts (Judgment)');
