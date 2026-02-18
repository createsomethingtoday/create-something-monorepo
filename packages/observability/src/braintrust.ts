/**
 * Braintrust Integration
 *
 * MCP tool invocation logging via Braintrust. Runs alongside (or instead of)
 * Langfuse — the two emitters are independent.
 *
 * Three-Tier Framework alignment:
 *   - Database:    Logger cached per project (what exists)
 *   - Automation:  wrapMcpToolWithBraintrust / emitToolInvocation (what happens)
 *   - Judgment:    Per-client account_id in metadata enables policy/billing insight
 *   - Insight:     Every tool call surfaces in Braintrust logs with Atlas metadata
 *
 * Usage:
 * ```typescript
 * import { initBraintrust, emitToolInvocation } from '@create-something/observability/braintrust';
 *
 * initBraintrust({ apiKey: process.env.BRAINTRUST_API_KEY, projectName: 'my-mcp' });
 *
 * await emitToolInvocation({
 *   serverName: 'my-mcp',
 *   toolName: 'get_project',
 *   accountId: 'client-abc',
 *   input: args,
 *   output: result,
 *   durationMs: 120,
 *   success: true,
 * });
 * ```
 */

import { flush, initLogger, type Logger, type Span } from 'braintrust';
import type { AITaskType, AtlasMetadata } from './atlas.js';

// =============================================================================
// Configuration
// =============================================================================

export interface BraintrustConfig {
  apiKey?: string;
  projectName?: string;
  enabled?: boolean;
  /** Async flush — recommended for Workers / edge where there is no long-lived process. */
  asyncFlush?: boolean;
}

let _config: BraintrustConfig = { enabled: true, asyncFlush: true };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _logger: Logger<any> | null = null;

/**
 * Initialize the Braintrust logger. Call once at application startup.
 * Safe to call multiple times — subsequent calls are no-ops if already initialized.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function initBraintrust(config: BraintrustConfig = {}): Logger<any> | null {
  _config = { ..._config, ...config };

  const apiKey = config.apiKey || process.env.BRAINTRUST_API_KEY;
  const projectName = config.projectName || process.env.BRAINTRUST_PROJECT || 'mcp-fleet';

  if (!apiKey) {
    console.warn('[braintrust] Missing BRAINTRUST_API_KEY. Tracing disabled.');
    _config.enabled = false;
    return null;
  }

  if (_config.enabled === false) return null;
  if (_logger) return _logger;

  _logger = initLogger({
    projectName,
    apiKey,
    asyncFlush: _config.asyncFlush ?? true,
    setCurrent: true,
  });

  return _logger;
}

/**
 * Get the cached Braintrust logger. Returns null if not initialized.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getBraintrustLogger(): Logger<any> | null {
  return _logger;
}

/**
 * Flush and close Braintrust logging.
 * Safe to call multiple times.
 */
export async function shutdownBraintrust(): Promise<void> {
  if (!_logger || _config.enabled === false) return;

  try {
    await _logger.flush();
  } catch (err) {
    console.warn('[braintrust] logger.flush failed during shutdown:', err);
  }

  // Flush global queue as an additional best-effort safety net.
  try {
    await flush();
  } catch (err) {
    console.warn('[braintrust] global flush failed during shutdown:', err);
  }

  _logger = null;
}

// =============================================================================
// Direct span emission
// =============================================================================

export interface ToolInvocationEvent {
  serverName: string;
  toolName: string;
  /** Client identifier — stored in metadata for per-client segmentation. */
  accountId?: string;
  input?: unknown;
  output?: unknown;
  durationMs?: number;
  success: boolean;
  error?: string;
  aiTaskType?: AITaskType;
  atlasMetadata?: AtlasMetadata;
}

/**
 * Emit a single MCP tool invocation as a Braintrust span.
 * Best-effort: failures are swallowed so tool execution is never blocked.
 */
export async function emitToolInvocation(event: ToolInvocationEvent): Promise<void> {
  if (!_logger || !_config.enabled) return;

  try {
    await _logger.traced(
      (span: Span) => {
        span.log({
          input: event.input,
          output: event.output,
          error: event.error,
          tags: [
            'mcp',
            event.serverName,
            event.toolName,
            event.success ? 'success' : 'error',
          ],
          metadata: {
            server: event.serverName,
            tool: event.toolName,
            accountId: event.accountId || 'operator',
            durationMs: event.durationMs,
            success: event.success,
            aiTaskType: event.aiTaskType,
            ...event.atlasMetadata,
          },
        });
      },
      {
        name: `mcp:${event.serverName}:${event.toolName}`,
        type: 'tool',
      },
    );
  } catch (err) {
    console.warn('[braintrust] emitToolInvocation failed:', err);
  }
}

// =============================================================================
// Wrap an MCP tool handler
// =============================================================================

export interface WrappedToolOptions {
  serverName: string;
  toolName: string;
  aiTaskType?: AITaskType;
  atlasMetadata?: AtlasMetadata;
  /** Resolve the calling account from the handler arguments or surrounding context. */
  getAccountId?: (args: Record<string, unknown>) => string | undefined;
}

/**
 * Wrap an async MCP tool handler so every invocation is logged to Braintrust.
 *
 * @example
 * server.tool(
 *   'get_project',
 *   'Get project by ID',
 *   schema,
 *   wrapMcpToolWithBraintrust(
 *     { serverName: 'procore-mcp', toolName: 'get_project', aiTaskType: 'extract' },
 *     async (args) => procoreClient.getProject(args.projectId as string)
 *   )
 * );
 */
export function wrapMcpToolWithBraintrust<TArgs extends Record<string, unknown>, TResult>(
  options: WrappedToolOptions,
  handler: (args: TArgs) => Promise<TResult>,
): (args: TArgs) => Promise<TResult> {
  return async (args: TArgs): Promise<TResult> => {
    if (!_logger || !_config.enabled) {
      return handler(args);
    }

    const accountId = options.getAccountId?.(args);
    const start = Date.now();

    return _logger.traced(
      async (span: Span) => {
        span.log({
          input: args,
          tags: ['mcp', options.serverName, options.toolName],
          metadata: {
            server: options.serverName,
            tool: options.toolName,
            accountId: accountId || 'operator',
            aiTaskType: options.aiTaskType,
            ...options.atlasMetadata,
          },
        });

        try {
          const result = await handler(args);
          span.log({
            output: result,
            metadata: {
              success: true,
              durationMs: Date.now() - start,
            },
          });
          return result;
        } catch (error) {
          const durationMs = Date.now() - start;
          const errorMessage = error instanceof Error ? error.message : String(error);

          span.log({
            output: { error: errorMessage },
            error: errorMessage,
            tags: ['mcp', options.serverName, options.toolName, 'error'],
            metadata: {
              success: false,
              durationMs,
              error: errorMessage,
            },
          });

          throw error;
        }
      },
      {
        name: `mcp:${options.serverName}:${options.toolName}`,
        type: 'tool',
      },
    );
  };
}

// =============================================================================
// Re-exports for convenience
// =============================================================================

export type { AITaskType, AtlasMetadata } from './atlas.js';
