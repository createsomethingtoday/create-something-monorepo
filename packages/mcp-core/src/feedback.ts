/**
 * FeedbackStore — cross-cutting Insight concern for user-reported issues
 *
 * Three-Tier Framework alignment:
 *   - Database:    FeedbackStore persists entries (what exists)
 *   - Automation:  submit_feedback tool captures feedback (what happens)
 *   - Judgment:    review status and triage (what should happen)
 *   - Insight:     the feedback loop itself — the system learns from its users
 *
 * When a ScopedMcpServer is configured with a FeedbackStore, a
 * `submit_feedback` tool is automatically registered. Users of ANY
 * MCP built on mcp-core can report issues, corrections, or suggestions
 * without the MCP author writing a single line of feedback code.
 *
 * This is the perceptual membrane applied to content quality:
 * the system perceives its own errors through user reports.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

// =============================================================================
// Feedback Entry
// =============================================================================

/**
 * A single piece of user feedback about an MCP server.
 *
 * Scoped to the server that received it (serverName) and the account
 * that submitted it (accountId). This is the Artifact that flows
 * through the feedback loop.
 */
export interface FeedbackEntry {
  /** Auto-generated ID (set by the store) */
  id?: number;

  /** Which MCP server this feedback is about */
  serverName: string;

  /** Account that submitted the feedback */
  accountId: string;

  /** What kind of feedback */
  feedbackType: 'correction' | 'suggestion' | 'error' | 'praise';

  /** The actual feedback content */
  content: string;

  /** Which section, tool, resource, or prompt the feedback is about */
  section?: string;

  /** Triage status */
  status: 'new' | 'reviewed' | 'applied' | 'dismissed';

  /** When submitted */
  createdAt: string;

  /** When reviewed (if applicable) */
  reviewedAt?: string;

  /** Reviewer notes */
  reviewNotes?: string;
}

// =============================================================================
// Feedback Store Interface
// =============================================================================

/**
 * Persistence interface for feedback entries.
 *
 * Like TokenStore, this is backend-agnostic. The D1FeedbackStore is
 * provided for Cloudflare Workers. Other implementations (file, KV)
 * can be added as needed.
 */
export interface FeedbackStore {
  /** Submit a new feedback entry. Returns the entry ID. */
  submit(entry: Omit<FeedbackEntry, 'id' | 'status' | 'createdAt'>): Promise<number>;

  /** List feedback entries with optional filters. */
  list(filters?: {
    serverName?: string;
    status?: FeedbackEntry['status'];
    feedbackType?: FeedbackEntry['feedbackType'];
    limit?: number;
  }): Promise<FeedbackEntry[]>;

  /** Update the status of a feedback entry (for triage). */
  updateStatus(id: number, status: FeedbackEntry['status'], reviewNotes?: string): Promise<void>;
}

// =============================================================================
// Tool Schema — used by registerFeedbackTool
// =============================================================================

export const FEEDBACK_TOOL_SCHEMA = {
  feedback_type: z.enum(['correction', 'suggestion', 'error', 'praise'])
    .describe('Type of feedback: correction (something is wrong), suggestion (could be better), error (something broke), praise (something works great)'),
  content: z.string()
    .describe('Your feedback — describe the issue, correction, or suggestion in detail'),
  section: z.string().optional()
    .describe('Which part of the MCP this is about — a tool name, resource URI, prompt name, or content section'),
};

// =============================================================================
// Tool Registration Helper
// =============================================================================

/**
 * Register the submit_feedback tool on an McpServer.
 *
 * This is called by ScopedMcpServer.buildServer() when a feedbackStore
 * is configured. It binds the tool to the store and context automatically.
 *
 * The tool is always readOnly: false — it writes to the feedback store.
 * But it should NOT be blocked by readOnly policy, since feedback
 * submission is a meta-operation about the system, not a business action.
 * We handle this with a dedicated `allowFeedback` policy flag.
 */
export function createFeedbackToolHandler(
  store: FeedbackStore,
  serverName: string,
  accountId: string,
): (params: Record<string, unknown>) => Promise<CallToolResult> {
  return async (params) => {
    const { feedback_type, content, section } = params as {
      feedback_type: FeedbackEntry['feedbackType'];
      content: string;
      section?: string;
    };

    const id = await store.submit({
      serverName,
      accountId,
      feedbackType: feedback_type,
      content,
      section,
    });

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          success: true,
          id,
          message: `Feedback submitted. Thank you — this helps us improve ${serverName}.`,
          type: feedback_type,
          section: section || '(general)',
        }, null, 2),
      }],
    };
  };
}

// =============================================================================
// Standalone Registration — works with ANY McpServer
// =============================================================================

/**
 * Register the `submit_feedback` tool on any McpServer instance.
 *
 * This is the universal integration point. Works with:
 *   - McpAgent-based workers (Half Dozen, client MCPs)
 *   - ScopedMcpServer (mcp-core managed servers)
 *   - Raw McpServer instances (any MCP)
 *
 * Usage in a McpAgent worker:
 * ```typescript
 * import { registerFeedbackTool, D1FeedbackStore } from '@create-something/mcp-core';
 *
 * export class MyMCP extends McpAgent<Env> {
 *   server = new McpServer({ name: 'my-mcp', version: '1.0.0' });
 *   async init() {
 *     // ... register your tools, resources, prompts ...
 *     registerFeedbackTool(this.server, new D1FeedbackStore(this.env.FEEDBACK_DB), 'my-mcp');
 *   }
 * }
 * ```
 *
 * @param server     - Any McpServer instance
 * @param store      - FeedbackStore implementation (D1FeedbackStore for Workers)
 * @param serverName - Name of the MCP server (stored with each feedback entry)
 * @param accountId  - Optional account ID (defaults to 'anonymous')
 */
export function registerFeedbackTool(
  server: McpServer,
  store: FeedbackStore,
  serverName: string,
  accountId: string = 'anonymous',
): void {
  const handler = createFeedbackToolHandler(store, serverName, accountId);

  server.tool(
    'submit_feedback',
    `Report an issue, correction, or suggestion about ${serverName}. Your feedback creates a support ticket that helps us improve this tool.`,
    FEEDBACK_TOOL_SCHEMA,
    async (params: Record<string, unknown>) => {
      try {
        return await handler(params);
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              error: 'Failed to submit feedback. Please try again.',
              details: error instanceof Error ? error.message : String(error),
            }),
          }],
          isError: true,
        };
      }
    },
  );
}
