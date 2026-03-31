/**
 * MCP Server Instrumentation
 *
 * Provides tracing utilities for MCP server tool handlers.
 * Integrates with Langfuse for LLM observability and Braintrust for
 * per-client MCP usage visibility.
 *
 * Dual-emit: when both LANGFUSE_* and BRAINTRUST_API_KEY are set, every tool
 * invocation is sent to both backends independently (best-effort).
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { CallToolRequest, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  initObservability,
  createTrace,
  createSpan,
  logEvent,
  type ObservabilityConfig,
  type TraceHandle
} from './index.js';
import { mcpToolMetadata, type AITaskType, type AtlasMetadata } from './atlas.js';
import {
  initBraintrust,
  emitToolInvocation,
  shutdownBraintrust,
  type BraintrustConfig,
} from './braintrust.js';
import {
  traceContextAtlasMetadata,
  traceContextTags,
  type GovernanceTraceContext,
} from './trace-context.js';

// =============================================================================
// Types
// =============================================================================

export interface McpServerConfig extends ObservabilityConfig {
  serverName: string;
  serverVersion?: string;
  /** Braintrust configuration. When provided (or BRAINTRUST_API_KEY env is set),
   *  every tool invocation is also logged to Braintrust. */
  braintrust?: BraintrustConfig;
  /** Resolve the calling account ID from the tool arguments.
   *  Used for per-client segmentation in both D1 telemetry and Braintrust. */
  getAccountId?: (args: Record<string, unknown>) => string | undefined;
  /** Resolve the governance and experiment context that should be attached to traces. */
  getTraceContext?: (input: {
    toolName: string;
    args: Record<string, unknown>;
  }) => GovernanceTraceContext | undefined;
}

export interface ToolHandlerContext {
  trace: TraceHandle;
  serverName: string;
  toolName: string;
}

export type InstrumentedToolHandler = (
  name: string,
  args: Record<string, unknown>,
  context: ToolHandlerContext
) => Promise<CallToolResult>;

export interface ToolMetadata {
  aiTaskType?: AITaskType;
  metadata?: AtlasMetadata;
}

// =============================================================================
// Instrumented MCP Server Wrapper
// =============================================================================

/**
 * Create an instrumented MCP server wrapper that automatically traces all tool calls.
 * 
 * @example
 * const { wrapToolHandler, shutdown } = createInstrumentedMcpServer({
 *   serverName: 'procore-mcp',
 *   serverVersion: '1.0.0',
 *   publicKey: process.env.LANGFUSE_PUBLIC_KEY,
 *   secretKey: process.env.LANGFUSE_SECRET_KEY
 * });
 * 
 * server.setRequestHandler(CallToolRequestSchema, async (request) => {
 *   return wrapToolHandler(request, async (name, args, context) => {
 *     // Your existing handler logic
 *     switch (name) {
 *       case 'get_project':
 *         return { content: [{ type: 'text', text: '...' }] };
 *     }
 *   });
 * });
 */
export function createInstrumentedMcpServer(config: McpServerConfig) {
  // Initialize Langfuse observability
  initObservability({
    publicKey: config.publicKey,
    secretKey: config.secretKey,
    host: config.host,
    enabled: config.enabled
  });

  // Initialize Braintrust when configured or env key present
  const btApiKey = config.braintrust?.apiKey || process.env.BRAINTRUST_API_KEY;
  if (btApiKey) {
    initBraintrust({
      apiKey: btApiKey,
      projectName:
        config.braintrust?.projectName ||
        process.env.BRAINTRUST_PROJECT_NAME ||
        process.env.BRAINTRUST_PROJECT ||
        config.serverName,
      projectId: config.braintrust?.projectId || process.env.BRAINTRUST_PROJECT_ID,
      enabled: config.braintrust?.enabled ?? true,
      asyncFlush: config.braintrust?.asyncFlush ?? true,
    });
  }

  const serverName = config.serverName;
  const serverVersion = config.serverVersion || '1.0.0';
  const getAccountId = config.getAccountId;
  const getTraceContext = config.getTraceContext;

  /**
   * Wrap a tool handler with automatic tracing.
   */
  async function wrapToolHandler(
    request: { params: CallToolRequest['params'] },
    handler: InstrumentedToolHandler,
    toolMetadata?: Record<string, ToolMetadata>
  ): Promise<CallToolResult> {
    const { name, arguments: args } = request.params;
    const safeArgs = (args || {}) as Record<string, unknown>;

    // Get tool-specific metadata if provided
    const meta = toolMetadata?.[name];
    const aiTaskType = meta?.aiTaskType || 'orchestrate';
    const additionalMetadata = meta?.metadata || {};
    const traceContext = getTraceContext?.({ toolName: name, args: safeArgs });
    const traceMetadata = traceContextAtlasMetadata(traceContext);
    const traceTags = traceContextTags(traceContext);

    // Create trace for this tool call
    const trace = createTrace({
      name: `mcp:${serverName}:${name}`,
      userId: traceContext?.userId,
      sessionId: traceContext?.sessionId,
      input: safeArgs,
      metadata: {
        ...mcpToolMetadata(serverName, name, aiTaskType),
        ...additionalMetadata,
        ...traceMetadata,
        'mcp.server_version': serverVersion
      },
      tags: ['mcp', serverName, name, ...traceTags]
    });

    // Create span for execution
    const span = createSpan(trace, {
      name: `execute:${name}`,
      input: safeArgs,
      metadata: {
        'ai_task.skill': name,
        ...traceMetadata
      }
    });

    const startTime = Date.now();
    let accountId: string | undefined;
    try {
      accountId = getAccountId?.(safeArgs);
    } catch (error) {
      console.warn(
        `[mcp-observability] getAccountId failed for ${serverName}:${name}:`,
        error instanceof Error ? error.message : String(error),
      );
      accountId = undefined;
    }

    try {
      // Execute the handler
      const result = await handler(name, safeArgs, {
        trace,
        serverName,
        toolName: name
      });

      const durationMs = Date.now() - startTime;

      // Langfuse — log success
      span.end({
        success: true,
        duration_ms: durationMs,
        has_content: result.content?.length > 0
      });

      if (trace.trace) {
        trace.trace.update({
          output: {
            contentLength: result.content?.length || 0,
            isError: result.isError || false
          }
        });
      }

      // Braintrust — emit alongside Langfuse (best-effort, non-blocking)
      emitToolInvocation({
        serverName,
        toolName: name,
        accountId,
        traceContext: {
          ...traceContext,
          accountId: traceContext?.accountId || accountId,
        },
        input: safeArgs,
        output: { contentLength: result.content?.length || 0, isError: result.isError || false },
        durationMs,
        success: true,
        aiTaskType,
        atlasMetadata: { ...mcpToolMetadata(serverName, name, aiTaskType), ...additionalMetadata },
      }).catch(() => {});

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const durationMs = Date.now() - startTime;

      // Langfuse — log error
      span.end({
        success: false,
        error: errorMessage,
        duration_ms: durationMs
      });

      logEvent(trace, {
        name: 'tool_error',
        metadata: {
          'ai_task.skill': name,
          error: true
        },
        level: 'ERROR',
        statusMessage: errorMessage
      });

      // Braintrust — emit error (best-effort, non-blocking)
      emitToolInvocation({
        serverName,
        toolName: name,
        accountId,
        traceContext: {
          ...traceContext,
          accountId: traceContext?.accountId || accountId,
        },
        input: safeArgs,
        output: { error: errorMessage },
        durationMs,
        success: false,
        error: errorMessage,
        aiTaskType,
        atlasMetadata: { ...mcpToolMetadata(serverName, name, aiTaskType), ...additionalMetadata },
      }).catch(() => {});

      // Return error result
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }

  /**
   * Shutdown the observability client.
   * Call before server exit to flush pending events.
   */
  async function shutdown(): Promise<void> {
    const { shutdownObservability } = await import('./index.js');
    await shutdownObservability();
    await shutdownBraintrust();
  }

  return {
    wrapToolHandler,
    shutdown,
    serverName,
    serverVersion
  };
}

// =============================================================================
// Convenience Decorators
// =============================================================================

/**
 * Create a traced tool handler map.
 * 
 * @example
 * const handlers = createTracedHandlers('procore-mcp', {
 *   get_project: {
 *     aiTaskType: 'extract',
 *     handler: async (args, context) => {
 *       const project = await procoreClient.getProject(args.projectId);
 *       return { content: [{ type: 'text', text: JSON.stringify(project) }] };
 *     }
 *   },
 *   create_rfi: {
 *     aiTaskType: 'generate',
 *     handler: async (args, context) => {
 *       // ...
 *     }
 *   }
 * });
 */
export function createTracedHandlers<T extends Record<string, {
  aiTaskType?: AITaskType;
  metadata?: AtlasMetadata;
  handler: (args: Record<string, unknown>, context: ToolHandlerContext) => Promise<CallToolResult>;
}>>(
  serverName: string,
  handlers: T
): {
  handle: (name: keyof T, args: Record<string, unknown>, context: ToolHandlerContext) => Promise<CallToolResult>;
  metadata: Record<keyof T, ToolMetadata>;
} {
  const metadata: Record<string, ToolMetadata> = {};

  for (const [name, config] of Object.entries(handlers)) {
    metadata[name] = {
      aiTaskType: config.aiTaskType,
      metadata: config.metadata
    };
  }

  return {
    handle: async (name, args, context) => {
      const config = handlers[name as string];
      if (!config) {
        throw new Error(`Unknown tool: ${String(name)}`);
      }
      return config.handler(args, context);
    },
    metadata: metadata as Record<keyof T, ToolMetadata>
  };
}

// =============================================================================
// Re-exports for convenience
// =============================================================================

export {
  createTrace,
  createSpan,
  createGeneration,
  logEvent,
  recordScore
} from './index.js';

export {
  mcpToolMetadata,
  llmGenerationMetadata,
  workerTaskMetadata,
  type AtlasMetadata,
  type AITaskType,
  type HumanOversightLevel
} from './atlas.js';
