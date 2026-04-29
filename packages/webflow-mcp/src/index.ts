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
import { mcpToolMetadata, type AtlasMetadata } from '@create-something/observability/atlas';
import { pathToFileURL } from 'node:url';

import * as plagiarism from './tools/plagiarism.js';

function webflowToolGroup(name: string): string {
  if (name.startsWith('plagiarism_')) {
    return 'plagiarism';
  }
  return 'other';
}

function webflowTraceMetadata(name: string, args: Record<string, unknown>): AtlasMetadata {
  return {
    ...mcpToolMetadata('webflow-mcp', name, 'classify'),
    'business.tool_group': webflowToolGroup(name),
    'business.template_id': typeof args.templateId === 'string' ? args.templateId : undefined,
    'business.template_a': typeof args.templateA === 'string' ? args.templateA : undefined,
    'business.template_b': typeof args.templateB === 'string' ? args.templateB : undefined,
    'business.reason': typeof args.reason === 'string' ? args.reason : undefined,
    'business.url_present': typeof args.url === 'string' && args.url.length > 0 ? 'true' : undefined,
  };
}

// Initialize Langfuse tracing
initObservability();

export function createWebflowMcpServer(): Server {
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
        description: 'Calculate Bayesian plagiarism probability for a template pair. Accepts template IDs or URLs. For URL-vs-URL inputs, uses vector compare as the primary evidence path. For ID/slug paths, uses compute/confidence first and falls back to vector compare when confidence signals are weak. For Webflow URL pairs, applies component-pattern normalization to reduce platform-common false positives.',
        inputSchema: {
          type: 'object',
          properties: {
            templateA: {
              type: 'string',
              description: 'First template ID or URL'
            },
            templateB: {
              type: 'string',
              description: 'Second template ID or URL'
            }
          },
          required: ['templateA', 'templateB']
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
      }
    ]
  }));

// =============================================================================
// Tool Handlers
// =============================================================================

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const safeArgs = (args as Record<string, unknown> | undefined) || {};

  // Create trace for tool call
  const trace = createTrace({
    name: `webflow-mcp:${name}`,
    metadata: webflowTraceMetadata(name, safeArgs),
    tags: ['mcp', 'webflow-mcp', webflowToolGroup(name)]
  });

  const span = createSpan(trace, {
    name: `tool:${name}`,
    input: args,
    metadata: {
      'business.tool_group': webflowToolGroup(name)
    }
  });

    try {
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

      case 'plagiarism_exclude':
        result = await plagiarism.addExclusion(
          safeArgs.templateA as string,
          safeArgs.templateB as string,
          safeArgs.reason as string | undefined
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

  return server;
}

// =============================================================================
// Start Server
// =============================================================================

function isDirectRun(): boolean {
  return Boolean(process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href);
}

async function startStdioServer(): Promise<void> {
  const transport = new StdioServerTransport();
  await createWebflowMcpServer().connect(transport);

  console.error('Webflow MCP server running on stdio');
}

if (isDirectRun()) {
  startStdioServer().catch((error) => {
    console.error('[webflow-mcp] fatal error:', error);
    process.exit(1);
  });
}
