#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import * as beads from './tools/beads.js';
import * as qualityGates from './tools/quality-gates.js';
import * as git from './tools/git.js';
import * as checkpoint from './tools/checkpoint.js';
import * as canon from './tools/canon.js';

const server = new Server(
  {
    name: 'harness-mcp',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // Beads operations
    {
      name: 'get_issue',
      description: 'Get a Beads issue by ID',
      inputSchema: {
        type: 'object',
        properties: {
          issueId: { type: 'string', description: 'The issue ID (e.g., cs-abc123)' }
        },
        required: ['issueId']
      }
    },
    {
      name: 'list_issues',
      description: 'List Beads issues with optional filters',
      inputSchema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['pending', 'in-progress', 'completed', 'blocked'],
            description: 'Filter by status'
          },
          labels: {
            type: 'array',
            items: { type: 'string' },
            description: 'Filter by labels'
          },
          priority: {
            type: 'string',
            description: 'Filter by priority (P0-P4)'
          }
        }
      }
    },
    {
      name: 'get_priority',
      description: 'Get prioritized list of issues (bv --robot-priority)',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'update_issue',
      description: 'Update a Beads issue',
      inputSchema: {
        type: 'object',
        properties: {
          issueId: { type: 'string', description: 'The issue ID' },
          status: {
            type: 'string',
            enum: ['pending', 'in-progress', 'completed', 'blocked'],
            description: 'New status'
          },
          addLabels: {
            type: 'array',
            items: { type: 'string' },
            description: 'Labels to add'
          },
          removeLabels: {
            type: 'array',
            items: { type: 'string' },
            description: 'Labels to remove'
          },
          notes: {
            type: 'string',
            description: 'Notes to add'
          }
        },
        required: ['issueId']
      }
    },
    {
      name: 'close_issue',
      description: 'Close a Beads issue',
      inputSchema: {
        type: 'object',
        properties: {
          issueId: { type: 'string', description: 'The issue ID' }
        },
        required: ['issueId']
      }
    },

    // Quality gates
    {
      name: 'run_quality_gate',
      description: 'Run a specific quality gate (tests, typecheck, or lint)',
      inputSchema: {
        type: 'object',
        properties: {
          gate: {
            type: 'string',
            enum: ['tests', 'typecheck', 'lint'],
            description: 'Which gate to run'
          },
          package: {
            type: 'string',
            description: 'Optional package filter (e.g., "space", "io")'
          },
          autoFix: {
            type: 'boolean',
            description: 'Auto-fix linting errors (lint only)',
            default: false
          }
        },
        required: ['gate']
      }
    },
    {
      name: 'run_all_gates',
      description: 'Run all quality gates in sequence',
      inputSchema: {
        type: 'object',
        properties: {
          package: {
            type: 'string',
            description: 'Optional package filter'
          },
          autoFix: {
            type: 'boolean',
            description: 'Auto-fix linting errors',
            default: false
          }
        }
      }
    },

    // Git operations
    {
      name: 'get_git_status',
      description: 'Get current git status (branch, modified files, etc.)',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'get_diff',
      description: 'Get git diff',
      inputSchema: {
        type: 'object',
        properties: {
          staged: {
            type: 'boolean',
            description: 'Show staged changes (--staged)',
            default: false
          }
        }
      }
    },
    {
      name: 'commit_with_issue',
      description: 'Commit changes with issue reference',
      inputSchema: {
        type: 'object',
        properties: {
          issueId: { type: 'string', description: 'Issue ID to reference' },
          message: { type: 'string', description: 'Commit message' }
        },
        required: ['issueId', 'message']
      }
    },

    // Checkpoint operations
    {
      name: 'save_checkpoint',
      description: 'Save agent context as a checkpoint',
      inputSchema: {
        type: 'object',
        properties: {
          context: {
            type: 'object',
            description: 'Agent context to save',
            properties: {
              sessionId: { type: 'string' },
              issueId: { type: 'string' },
              filesModified: { type: 'array' },
              decisions: { type: 'array' },
              agentNotes: { type: 'string' },
              blockers: { type: 'array' }
            },
            required: ['sessionId', 'filesModified', 'decisions', 'agentNotes']
          }
        },
        required: ['context']
      }
    },
    {
      name: 'load_checkpoint',
      description: 'Load a saved checkpoint',
      inputSchema: {
        type: 'object',
        properties: {
          checkpointId: {
            type: 'string',
            description: 'Checkpoint ID or "latest"'
          },
          sessionId: {
            type: 'string',
            description: 'Session ID (required for loading by ID)'
          }
        },
        required: ['checkpointId']
      }
    },
    {
      name: 'list_checkpoints',
      description: 'List checkpoints for a session',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: 'Session ID' }
        },
        required: ['sessionId']
      }
    },

    // Canon rules
    {
      name: 'get_canon_rules',
      description: 'Get CREATE SOMETHING canon rules (CSS, voice, code conventions)',
      inputSchema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['css', 'voice', 'code', 'templates', 'all'],
            description: 'Which category of rules to retrieve (default: all)'
          }
        }
      }
    },
    {
      name: 'get_quick_reference',
      description: 'Get quick reference summary of common patterns',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    }
  ]
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: any;

    // Type guard for args
    const safeArgs = args as Record<string, any> || {};

    switch (name) {
      // Beads operations
      case 'get_issue':
        result = beads.getIssue(safeArgs.issueId as string);
        break;

      case 'list_issues':
        result = beads.listIssues(safeArgs);
        break;

      case 'get_priority':
        result = beads.getPriority();
        break;

      case 'update_issue':
        beads.updateIssue(safeArgs.issueId as string, {
          status: safeArgs.status,
          labels: {
            add: safeArgs.addLabels,
            remove: safeArgs.removeLabels
          },
          notes: safeArgs.notes
        });
        result = { success: true };
        break;

      case 'close_issue':
        beads.closeIssue(safeArgs.issueId as string);
        result = { success: true };
        break;

      // Quality gates
      case 'run_quality_gate':
        result = qualityGates.runQualityGate(safeArgs.gate as 'tests' | 'typecheck' | 'lint', {
          package: safeArgs.package as string | undefined,
          autoFix: safeArgs.autoFix as boolean | undefined
        });
        break;

      case 'run_all_gates':
        result = qualityGates.runAllGates({
          package: safeArgs.package as string | undefined,
          autoFix: safeArgs.autoFix as boolean | undefined
        });
        break;

      // Git operations
      case 'get_git_status':
        result = git.getGitStatus();
        break;

      case 'get_diff':
        result = { diff: git.getDiff(safeArgs.staged as boolean | undefined) };
        break;

      case 'commit_with_issue':
        git.commitWithIssue(safeArgs.issueId as string, safeArgs.message as string);
        result = { success: true };
        break;

      // Checkpoint operations
      case 'save_checkpoint':
        const checkpointId = checkpoint.saveCheckpoint(safeArgs.context as any);
        result = { checkpointId };
        break;

      case 'load_checkpoint':
        result = checkpoint.loadCheckpoint(safeArgs.checkpointId as string, safeArgs.sessionId as string | undefined);
        break;

      case 'list_checkpoints':
        result = checkpoint.listCheckpoints(safeArgs.sessionId as string);
        break;

      // Canon rules
      case 'get_canon_rules':
        result = canon.getCanonRules(safeArgs.category as 'css' | 'voice' | 'code' | 'templates' | 'all' | undefined);
        break;

      case 'get_quick_reference':
        result = { reference: canon.getQuickReference() };
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

  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error.message,
            tool: name,
            arguments: args
          }, null, 2)
        }
      ],
      isError: true
    };
  }
});

// Start server
const transport = new StdioServerTransport();
server.connect(transport);

console.error('Harness MCP server running on stdio');
