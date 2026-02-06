/**
 * Three-Tier Framework — Tool Handlers (Automation Tier)
 * 
 * Model-controlled functions that agents invoke during reasoning.
 * MCP Tools primitive — the Automation tier of this server.
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import {
  classifyComponent,
  debugSystem,
  analyzeMCPServer,
  identifyPolicyArtifacts,
  mapToAutomotive,
  architectureDiff
} from './framework/heuristics.js';

export function registerTools(server: Server): void {

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'classify_component',
        description: 'Classify a component or service into framework tier(s) (Database, Automation, Judgment) with confidence scores and rationale. Use this to understand where a piece of your system fits in the Three-Tier Framework.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            description: {
              type: 'string',
              description: 'Description of the component or service to classify'
            },
            context: {
              type: 'string',
              description: 'Optional additional context about the system this component belongs to'
            }
          },
          required: ['description']
        }
      },
      {
        name: 'debug_system',
        description: 'Apply the Three-Tier causality heuristic to debug a system failure. Returns an ordered diagnostic checklist: (1) Database — is data there? (2) Automation — did execution work? (3) Judgment — was policy correct?',
        inputSchema: {
          type: 'object' as const,
          properties: {
            failure: {
              type: 'string',
              description: 'Description of the failure or unexpected behavior'
            },
            context: {
              type: 'string',
              description: 'Optional system context or recent changes'
            }
          },
          required: ['failure']
        }
      },
      {
        name: 'analyze_mcp_server',
        description: 'Analyze an MCP server against the Three-Tier Framework. Maps its primitives (Resources, Tools, Prompts) to tiers, identifies coverage gaps, and recommends improvements.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            name: {
              type: 'string',
              description: 'Name of the MCP server to analyze'
            },
            tools: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of tool names this server exposes'
            },
            resources: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of resource URIs this server exposes'
            },
            prompts: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of prompt names this server exposes'
            }
          },
          required: ['name']
        }
      },
      {
        name: 'identify_policy_artifacts',
        description: 'Identify which constraints in a system are policy artifacts that should flow through tiers. Classifies each as mutable/immutable, identifies versioning opportunities, and maps to appropriate tiers.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            system: {
              type: 'string',
              description: 'Description of the system to audit for policy artifacts'
            },
            constraints: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of known constraints, rules, or policies in the system'
            }
          },
          required: ['system']
        }
      },
      {
        name: 'map_to_automotive',
        description: 'Map system components to the Automotive Framework vocabulary (Chassis, Engine, Fuel Tank, Turbocharger, etc.) to communicate architecture using the vehicle metaphor.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            components: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of component names or descriptions to map'
            }
          },
          required: ['components']
        }
      },
      {
        name: 'architecture_diff',
        description: 'Compare two systems\' architecture through the Three-Tier Framework. Shows tier coverage differences, gaps, and boundary components between systems.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            system_a_name: {
              type: 'string',
              description: 'Name of the first system'
            },
            system_a_components: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of component descriptions for the first system'
            },
            system_b_name: {
              type: 'string',
              description: 'Name of the second system'
            },
            system_b_components: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of component descriptions for the second system'
            }
          },
          required: ['system_a_name', 'system_a_components', 'system_b_name', 'system_b_components']
        }
      }
    ]
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const safeArgs = (args || {}) as Record<string, unknown>;

    try {
      let result: unknown;

      switch (name) {
        case 'classify_component':
          result = classifyComponent(
            safeArgs.description as string,
            safeArgs.context as string | undefined
          );
          break;

        case 'debug_system':
          result = debugSystem(
            safeArgs.failure as string,
            safeArgs.context as string | undefined
          );
          break;

        case 'analyze_mcp_server':
          result = analyzeMCPServer(
            safeArgs.name as string,
            safeArgs.tools as string[] | undefined,
            safeArgs.resources as string[] | undefined,
            safeArgs.prompts as string[] | undefined
          );
          break;

        case 'identify_policy_artifacts':
          result = identifyPolicyArtifacts(
            safeArgs.system as string,
            safeArgs.constraints as string[] | undefined
          );
          break;

        case 'map_to_automotive':
          result = mapToAutomotive(safeArgs.components as string[]);
          break;

        case 'architecture_diff':
          result = architectureDiff(
            safeArgs.system_a_name as string,
            safeArgs.system_a_components as string[],
            safeArgs.system_b_name as string,
            safeArgs.system_b_components as string[]
          );
          break;

        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: errorMessage, tool: name, arguments: safeArgs }, null, 2)
        }],
        isError: true
      };
    }
  });
}
