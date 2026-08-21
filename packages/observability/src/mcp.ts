/**
 * MCP Server Instrumentation
 *
 * Provides tracing utilities for MCP server tool handlers.
 * Integrates with Langfuse for LLM observability and per-client MCP usage
 * visibility.
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
  initLangfuse,
  emitToolInvocation,
  resolveToolInvocationOutcome,
  shutdownLangfuse,
  type GovernanceTraceContext,
  type LangfuseConfig,
} from './langfuse.js';

// =============================================================================
// Types
// =============================================================================

export interface McpServerConfig extends ObservabilityConfig {
  serverName: string;
  serverVersion?: string;
  /** Langfuse configuration. When provided (or LANGFUSE_PUBLIC_KEY/LANGFUSE_SECRET_KEY env is set),
   *  every tool invocation is also logged to Langfuse. */
  langfuse?: LangfuseConfig;
  /** Resolve the calling account ID from the tool arguments.
   *  Used for per-client segmentation in both D1 telemetry and Langfuse. */
  getAccountId?: (args: Record<string, unknown>) => string | undefined;
  /** Resolve the policy and routing context that should be attached to traces. */
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

function governanceAtlasMetadata(
  traceContext: GovernanceTraceContext | undefined,
): AtlasMetadata {
  if (!traceContext) return {};

  return Object.fromEntries(
    Object.entries({
      'governance.tenant_id': traceContext.tenantId,
      'governance.user_id': traceContext.userId,
      'governance.session_id': traceContext.sessionId,
      'governance.correlation_id': traceContext.correlationId,
      'governance.request_id': traceContext.requestId,
      'governance.policy_id': traceContext.policyId,
      'governance.route_classification': traceContext.routeClassification,
      'governance.authz_decision': traceContext.authzDecision,
      'governance.lane_slug': traceContext.laneSlug,
      'governance.bound_host': traceContext.boundHost,
      'governance.entrypoint': traceContext.entrypoint,
    }).filter(([, value]) => typeof value === 'string' && value.length > 0),
  ) as AtlasMetadata;
}

function governanceTags(traceContext: GovernanceTraceContext | undefined): string[] {
  if (!traceContext) return [];

  return [
    traceContext.policyId ? `policy:${traceContext.policyId}` : null,
    traceContext.routeClassification ? `route:${traceContext.routeClassification}` : null,
    traceContext.authzDecision ? `authz:${traceContext.authzDecision}` : null,
    traceContext.laneSlug ? `lane:${traceContext.laneSlug}` : null,
  ].filter((value): value is string => Boolean(value));
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

  // Initialize Langfuse when configured or env keys are present.
  const publicKey = config.langfuse?.publicKey || process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = config.langfuse?.secretKey || process.env.LANGFUSE_SECRET_KEY;
  if (publicKey && secretKey) {
    initLangfuse({
      publicKey,
      secretKey,
      host: config.langfuse?.host || process.env.LANGFUSE_BASE_URL || process.env.LANGFUSE_HOST,
      projectName:
        config.langfuse?.projectName ||
        process.env.LANGFUSE_PROJECT_NAME ||
        process.env.LANGFUSE_PROJECT ||
        config.serverName,
      environment: config.langfuse?.environment,
      release: config.langfuse?.release,
      enabled: config.langfuse?.enabled ?? true,
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
    const governanceMetadata = governanceAtlasMetadata(traceContext);
    const traceTags = governanceTags(traceContext);

    // Create trace for this tool call
    const trace = createTrace({
      name: `mcp:${serverName}:${name}`,
      input: safeArgs,
      metadata: {
        ...mcpToolMetadata(serverName, name, aiTaskType),
        ...additionalMetadata,
        ...governanceMetadata,
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
        ...governanceMetadata
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
      const outcome = resolveToolInvocationOutcome(result);

      // A resolved MCP response can still be a tool failure (`isError: true`).
      span.end({
        success: outcome.success,
        error: outcome.error,
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

      // Langfuse — emit alongside Langfuse (best-effort, non-blocking)
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
        success: outcome.success,
        error: outcome.error,
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

      // Langfuse — emit error (best-effort, non-blocking)
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
    await shutdownLangfuse();
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
