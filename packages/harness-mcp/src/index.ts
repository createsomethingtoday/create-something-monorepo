#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { initObservability, createTrace, createSpan } from '@create-something/observability';
import { mcpToolMetadata, type AtlasMetadata } from '@create-something/observability/atlas';

import * as beads from './tools/beads.js';
import * as qualityGates from './tools/quality-gates.js';
import * as git from './tools/git.js';
import * as checkpoint from './tools/checkpoint.js';
import * as canon from './tools/canon.js';

function harnessToolGroup(name: string): string {
  if (['get_issue', 'list_issues', 'get_priority', 'update_issue', 'close_issue'].includes(name)) {
    return 'issue_tracking';
  }
  if (['run_quality_gate', 'run_all_gates'].includes(name)) {
    return 'quality_gate';
  }
  if (['get_git_status', 'get_diff', 'commit_with_issue'].includes(name)) {
    return 'git';
  }
  if (['save_checkpoint', 'load_checkpoint', 'list_checkpoints'].includes(name)) {
    return 'checkpoint';
  }
  if (['get_canon_rules', 'get_quick_reference'].includes(name)) {
    return 'canon';
  }
  return 'other';
}

function harnessTraceMetadata(name: string, args: Record<string, unknown>): AtlasMetadata {
  return {
    ...mcpToolMetadata('harness-mcp', name, 'orchestrate'),
    'business.tool_group': harnessToolGroup(name),
    'business.issue_id': typeof args.issueId === 'string' ? args.issueId : undefined,
    'business.session_id': typeof args.sessionId === 'string' ? args.sessionId : undefined,
    'business.package': typeof args.package === 'string' ? args.package : undefined,
    'business.gate': typeof args.gate === 'string' ? args.gate : undefined,
    'business.category': typeof args.category === 'string' ? args.category : undefined,
  };
}

// Initialize Langfuse tracing
initObservability();

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
    // Tracked issue operations (legacy Beads-backed adapter)
    {
      name: 'get_issue',
      description: 'Get a tracked issue by ID',
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
      description: 'List tracked issues with optional filters',
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
      description: 'Update a tracked issue',
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
      description: 'Close a tracked issue',
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
            enum: ['css', 'voice', 'code', 'all'],
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
  const safeArgs = (args as Record<string, any> | undefined) || {};

  // Create trace for tool call
  const trace = createTrace({
    name: `harness-mcp:${name}`,
    metadata: harnessTraceMetadata(name, safeArgs),
    tags: ['mcp', 'harness-mcp', harnessToolGroup(name)]
  });

  const span = createSpan(trace, {
    name: `tool:${name}`,
    input: args,
    metadata: {
      'business.tool_group': harnessToolGroup(name)
    }
  });

  try {
    let result: any;

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
        result = canon.getCanonRules(safeArgs.category as 'css' | 'voice' | 'code' | 'all' | undefined);
        break;

      case 'get_quick_reference':
        result = { reference: canon.getQuickReference() };
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

  } catch (error: any) {
    span.end({ 
      output: { error: error.message },
      level: 'ERROR',
      statusMessage: error.message
    });

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
