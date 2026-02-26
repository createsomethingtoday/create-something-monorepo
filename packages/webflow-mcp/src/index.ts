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
import { initObservability, createTrace, createSpan } from '@create-something/observability';
import { mcpToolMetadata } from '@create-something/observability/atlas';

import * as plagiarism from './tools/plagiarism.js';

// Initialize Langfuse tracing
initObservability();

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

function toArgsRecord(args: unknown): Record<string, unknown> {
  if (args && typeof args === 'object' && !Array.isArray(args)) {
    return args as Record<string, unknown>;
  }
  return {};
}

function requireStringArg(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid "${key}": expected non-empty string`);
  }
  return value.trim();
}

function optionalStringArg(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    throw new Error(`Invalid "${key}": expected string`);
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function optionalNumberArg(
  args: Record<string, unknown>,
  key: string,
  constraints?: { min?: number; max?: number; integer?: boolean }
): number | undefined {
  const value = args[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Invalid "${key}": expected number`);
  }
  if (constraints?.integer && !Number.isInteger(value)) {
    throw new Error(`Invalid "${key}": expected integer`);
  }
  if (constraints?.min !== undefined && value < constraints.min) {
    throw new Error(`Invalid "${key}": expected >= ${constraints.min}`);
  }
  if (constraints?.max !== undefined && value > constraints.max) {
    throw new Error(`Invalid "${key}": expected <= ${constraints.max}`);
  }
  return value;
}

function optionalBooleanArg(args: Record<string, unknown>, key: string): boolean | undefined {
  const value = args[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid "${key}": expected boolean`);
  }
  return value;
}

function isLikelyUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

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
      description: 'Calculate Bayesian plagiarism probability for a template ID pair. Combines CSS, JS, framework, and structural evidence using Bayes theorem. Use plagiarism_compare_urls for URL-based comparisons.',
      inputSchema: {
        type: 'object',
        properties: {
          templateA: { 
            type: 'string', 
            description: 'First template ID (not URL)' 
          },
          templateB: { 
            type: 'string', 
            description: 'Second template ID (not URL)' 
          }
        },
        required: ['templateA', 'templateB']
      }
    },
    {
      name: 'plagiarism_compare_urls',
      description: 'Compare two template/site URLs directly via vector similarity. Automatically normalizes Webflow template listing URLs to their preview .webflow.io URLs when possible.',
      inputSchema: {
        type: 'object',
        properties: {
          originalUrl: {
            type: 'string',
            description: 'Original template/site URL'
          },
          allegedCopyUrl: {
            type: 'string',
            description: 'Alleged copy template/site URL'
          }
        },
        required: ['originalUrl', 'allegedCopyUrl']
      }
    },
    {
      name: 'plagiarism_exclude',
      description: 'Add a template pair to the exclusion list (false positive handling). Use when editorial review determines two templates are legitimately similar.',
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
          },
          reason: { 
            type: 'string', 
            description: 'Why this pair is excluded (e.g., "same_author", "licensed", "common_framework")' 
          }
        },
        required: ['templateA', 'templateB']
      }
    },
    {
      name: 'plagiarism_exclusion_check',
      description: 'Check whether a template pair is currently in the exclusion list.',
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
    },
    {
      name: 'plagiarism_exclusion_list',
      description: 'List exclusions for audit and false-positive review workflows.',
      inputSchema: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Number of exclusions to return (default: 100)'
          }
        }
      }
    }
  ]
}));

// =============================================================================
// Tool Handlers
// =============================================================================

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Create trace for tool call
  const trace = createTrace({
    name: `webflow-mcp:${name}`,
    metadata: mcpToolMetadata('webflow-mcp', name, 'classify')
  });

  const span = createSpan(trace, {
    name: `tool:${name}`,
    input: args
  });

  try {
    const safeArgs = toArgsRecord(args);
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
        {
          const url = requireStringArg(safeArgs, 'url');
          const threshold = optionalNumberArg(safeArgs, 'threshold', { min: 0, max: 1 });
          result = await plagiarism.scanTemplate(url, threshold);
        }
        break;

      case 'plagiarism_lsh_index':
        result = await plagiarism.indexLSHSignatures(
          optionalNumberArg(safeArgs, 'limit', { min: 1, integer: true })
        );
        break;

      case 'plagiarism_similar_functions':
        {
          const templateId = requireStringArg(safeArgs, 'templateId');
          const minBands = optionalNumberArg(safeArgs, 'minBands', { min: 1, integer: true });
          result = await plagiarism.findSimilarFunctions(templateId, minBands);
        }
        break;

      case 'plagiarism_pagerank':
        result = await plagiarism.computePageRank(
          optionalNumberArg(safeArgs, 'threshold', { min: 0, max: 1 }),
          optionalBooleanArg(safeArgs, 'rebuildGraph')
        );
        break;

      case 'plagiarism_pagerank_leaderboard':
        result = await plagiarism.getPageRankLeaderboard(
          optionalNumberArg(safeArgs, 'limit', { min: 1, integer: true })
        );
        break;

      case 'plagiarism_detect_frameworks':
        {
          const url = requireStringArg(safeArgs, 'url');
          const templateId = optionalStringArg(safeArgs, 'templateId');
          result = await plagiarism.detectFrameworks(url, templateId);
        }
        break;

      case 'plagiarism_confidence':
        {
          const templateA = requireStringArg(safeArgs, 'templateA');
          const templateB = requireStringArg(safeArgs, 'templateB');
          if (isLikelyUrl(templateA) || isLikelyUrl(templateB)) {
            throw new Error('plagiarism_confidence expects template IDs, not URLs. Use plagiarism_compare_urls for URL pairs.');
          }
          result = await plagiarism.calculateBayesianConfidence(templateA, templateB);
        }
        break;

      case 'plagiarism_compare_urls':
        {
          const originalUrl = requireStringArg(safeArgs, 'originalUrl');
          const allegedCopyUrl = requireStringArg(safeArgs, 'allegedCopyUrl');
          if (!isLikelyUrl(originalUrl) || !isLikelyUrl(allegedCopyUrl)) {
            throw new Error('plagiarism_compare_urls expects fully-qualified http(s) URLs for originalUrl and allegedCopyUrl.');
          }
          result = await plagiarism.compareUrls(originalUrl, allegedCopyUrl);
        }
        break;

      case 'plagiarism_exclude':
        {
          const templateA = requireStringArg(safeArgs, 'templateA');
          const templateB = requireStringArg(safeArgs, 'templateB');
          const reason = optionalStringArg(safeArgs, 'reason');
          result = await plagiarism.addExclusion(templateA, templateB, reason);
        }
        break;

      case 'plagiarism_exclusion_check':
        {
          const templateA = requireStringArg(safeArgs, 'templateA');
          const templateB = requireStringArg(safeArgs, 'templateB');
          result = await plagiarism.checkExclusion(templateA, templateB);
        }
        break;

      case 'plagiarism_exclusion_list':
        result = await plagiarism.listExclusions(
          optionalNumberArg(safeArgs, 'limit', { min: 1, integer: true })
        );
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    span.end({ output: result });

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
    
    span.end({ 
      output: { error: message },
      level: 'ERROR',
      statusMessage: message
    });

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
