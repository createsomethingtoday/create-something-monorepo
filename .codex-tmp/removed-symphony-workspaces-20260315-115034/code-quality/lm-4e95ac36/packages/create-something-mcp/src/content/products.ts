/**
 * Products & Services — Embedded from packages/agency/src/lib/data/services.ts.
 * Key offerings from CREATE SOMETHING agency.
 */

import type { Product } from './types.js';

export const PRODUCTS: Product[] = [
  {
    id: 'loom',
    title: 'Loom',
    description: 'Agent-native issue tracking that persists across sessions. Multi-agent coordination with sessions, routing, cost tracking, and crash recovery. The tool recedes; the work remains.',
    pricing: 'Open Source',
    timeline: 'Available now',
    category: 'developer-tools'
  },
  {
    id: 'ground',
    title: 'Ground',
    description: 'Codebase verification tool that prevents hallucination. Analyzes exports, finds duplicates, validates imports. The Grounding Discipline as executable tooling.',
    pricing: 'Open Source',
    timeline: 'Available now',
    category: 'developer-tools'
  },
  {
    id: 'triad-audit',
    title: 'Subtractive Triad Audit',
    description: 'Automated code review through the Subtractive Triad lens: DRY (eliminate duplication), Rams (eliminate excess), Heidegger (eliminate disconnection). Every pull request measured against three questions.',
    pricing: 'Open Source',
    timeline: 'Available now',
    category: 'developer-tools'
  },
  {
    id: 'learn',
    title: 'Learn MCP',
    description: 'Interactive MCP server that teaches the Subtractive Triad through Claude Code. Progressive lessons, praxis exercises, and mastery tracking.',
    pricing: 'Free',
    timeline: 'Available now',
    category: 'developer-tools'
  },
  {
    id: 'seeing',
    title: 'Seeing MCP',
    description: 'Gemini CLI extension for learning to see through the Subtractive Triad. Teaches perception through progressive lessons — from noticing to understanding.',
    pricing: 'Free',
    timeline: 'Available now',
    category: 'developer-tools'
  },
  {
    id: 'three-tier-framework-mcp',
    title: 'Three-Tier Framework MCP',
    description: 'The Three-Tier Framework (Database, Automation, Judgment) as an MCP server. Uses all three MCP primitives. Zero dependencies — pure framework knowledge served through protocol.',
    pricing: 'Free',
    timeline: 'Available now',
    category: 'framework'
  },
  {
    id: 'mcp-audit',
    title: 'MCP Audit',
    description: 'Strategic assessment: What MCPs would unlock value for your business? Analysis of existing tool landscape, identification of automation opportunities, and MCP server design recommendations.',
    pricing: 'Contact',
    timeline: '1-2 weeks',
    category: 'featured'
  },
  {
    id: 'custom-mcp-development',
    title: 'Custom MCP Development',
    description: 'Build the MCP server, package as Desktop Extension (.mcpb). Full implementation: auth, data mapping, tool design, prompt engineering, Cloudflare Workers deployment.',
    pricing: 'Contact',
    timeline: '2-6 weeks',
    category: 'featured'
  },
  {
    id: 'intelligence-layer',
    title: 'Intelligence Layer',
    description: 'Skills and Agents on top of your MCPs. The monetizable layer — from connectivity to outcomes. RFIs that draft themselves. Daily logs that synthesize themselves.',
    pricing: 'Contact',
    timeline: '4-8 weeks',
    category: 'featured'
  }
];
