#!/usr/bin/env node

/**
 * Webflow Marketplace MCP Server
 * 
 * Agent-native tools for the Webflow Marketplace team.
 * Exposes plagiarism detection, template analysis, and more via MCP.
 * 
 * Usage:
 *   node dist/index.js              # Run as MCP server (stdio)
 *   webflow-mcp                     # If installed globally
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import * as plagiarism from './tools/plagiarism.js';

const server = new Server(
  {
    name: 'webflow-mcp',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// =============================================================================
// Tool Definitions
// =============================================================================

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // ─────────────────────────────────────────────────────────────────────────
    // Plagiarism Detection Tools
    // ─────────────────────────────────────────────────────────────────────────
    {
      name: 'plagiarism_health',
      description: 'Check health and version of the plagiarism detection system',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'plagiarism_stats',
      description: 'Get statistics about plagiarism algorithms (LSH signatures indexed, PageRank scores, frameworks detected)',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'plagiarism_scan',
      description: 'Scan a template URL for potential plagiarism. Returns similar templates from the index with similarity scores.',
      inputSchema: {
        type: 'object',
        properties: {
          url: { 
            type: 'string', 
            description: 'Template URL to scan (e.g., https://template.webflow.io)' 
          },
          threshold: { 
            type: 'number', 
            description: 'Minimum similarity to report (0-1, default: 0.3)' 
          }
        },
        required: ['url']
      }
    },
    {
      name: 'plagiarism_lsh_index',
      description: 'Index JS functions with LSH signatures for O(1) similarity lookup. Uses MinHash (128 permutations) + LSH banding (16 bands).',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { 
            type: 'number', 
            description: 'Number of functions to index in this batch (default: 100)' 
          }
        }
      }
    },
    {
      name: 'plagiarism_similar_functions',
      description: 'Find JS functions similar to those in a template using LSH lookup. Returns candidates with estimated Jaccard similarity.',
      inputSchema: {
        type: 'object',
        properties: {
          templateId: { 
            type: 'string', 
            description: 'Template ID to find similar functions for' 
          },
          minBands: { 
            type: 'number', 
            description: 'Minimum matching LSH bands required (default: 1)' 
          }
        },
        required: ['templateId']
      }
    },
    {
      name: 'plagiarism_pagerank',
      description: 'Compute PageRank scores to identify original vs derivative templates. Higher scores indicate more authoritative (likely original) templates.',
      inputSchema: {
        type: 'object',
        properties: {
          threshold: { 
            type: 'number', 
            description: 'Minimum similarity for graph edges (0-1, default: 0.5)' 
          },
          rebuildGraph: { 
            type: 'boolean', 
            description: 'Force rebuild the similarity graph (default: false)' 
          }
        }
      }
    },
    {
      name: 'plagiarism_pagerank_leaderboard',
      description: 'Get top templates ranked by PageRank authority score. Shows which templates are most likely originals.',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { 
            type: 'number', 
            description: 'Number of results (default: 50)' 
          }
        }
      }
    },
    {
      name: 'plagiarism_detect_frameworks',
      description: 'Detect JavaScript frameworks used in a template. Identifies 15+ libraries including GSAP, Lenis, Barba, Swiper, Three.js, Webflow IX2, etc.',
      inputSchema: {
        type: 'object',
        properties: {
          url: { 
            type: 'string', 
            description: 'Template URL to analyze' 
          },
          templateId: { 
            type: 'string', 
            description: 'Optional template ID to store results' 
          }
        },
        required: ['url']
      }
    },
    {
      name: 'plagiarism_confidence',
      description: 'Calculate Bayesian plagiarism probability for a template pair. Combines CSS, JS, framework, and structural evidence using Bayes theorem.',
      inputSchema: {
        type: 'object',
        properties: {
          templateA: { 
            type: 'string', 
            description: 'First template ID' 
          },
          templateB: { 
            type: 'string', 
            description: 'Second template ID' 
          }
        },
        required: ['templateA', 'templateB']
      }
    }
  ]
}));

// =============================================================================
// Tool Handlers
// =============================================================================

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const safeArgs = args as Record<string, unknown> || {};
    let result: unknown;

    switch (name) {
      // Plagiarism Detection
      case 'plagiarism_health':
        result = await plagiarism.getHealth();
        break;

      case 'plagiarism_stats':
        result = await plagiarism.getComputeStats();
        break;

      case 'plagiarism_scan':
        result = await plagiarism.scanTemplate(
          safeArgs.url as string,
          safeArgs.threshold as number | undefined
        );
        break;

      case 'plagiarism_lsh_index':
        result = await plagiarism.indexLSHSignatures(
          safeArgs.limit as number | undefined
        );
        break;

      case 'plagiarism_similar_functions':
        result = await plagiarism.findSimilarFunctions(
          safeArgs.templateId as string,
          safeArgs.minBands as number | undefined
        );
        break;

      case 'plagiarism_pagerank':
        result = await plagiarism.computePageRank(
          safeArgs.threshold as number | undefined,
          safeArgs.rebuildGraph as boolean | undefined
        );
        break;

      case 'plagiarism_pagerank_leaderboard':
        result = await plagiarism.getPageRankLeaderboard(
          safeArgs.limit as number | undefined
        );
        break;

      case 'plagiarism_detect_frameworks':
        result = await plagiarism.detectFrameworks(
          safeArgs.url as string,
          safeArgs.templateId as string | undefined
        );
        break;

      case 'plagiarism_confidence':
        result = await plagiarism.calculateBayesianConfidence(
          safeArgs.templateA as string,
          safeArgs.templateB as string
        );
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: message,
            tool: name,
            arguments: args
          }, null, 2)
        }
      ],
      isError: true
    };
  }
});

// =============================================================================
// Start Server
// =============================================================================

const transport = new StdioServerTransport();
server.connect(transport);

console.error('Webflow MCP server running on stdio');
