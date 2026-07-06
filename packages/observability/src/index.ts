/**
 * @create-something/observability
 * 
 * Agent observability utilities with Langfuse integration
 * and AI Interaction Atlas vocabulary.
 */

import { Langfuse } from 'langfuse';
import type { AtlasMetadata } from './atlas.js';

// Re-export Atlas types
export * from './atlas.js';

// =============================================================================
// Configuration
// =============================================================================

export interface ObservabilityConfig {
  publicKey?: string;
  secretKey?: string;
  host?: string;
  enabled?: boolean;
  flushAt?: number;
  flushInterval?: number;
}

let langfuseClient: Langfuse | null = null;
let config: ObservabilityConfig = {
  enabled: true,
  flushAt: 10,
  flushInterval: 5000
};

function endpointBaseUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  try {
    return new URL(value.trim()).origin;
  } catch {
    return undefined;
  }
}

/**
 * Initialize the observability client.
 * Call once at application startup.
 */
export function initObservability(options: ObservabilityConfig = {}): Langfuse | null {
  config = { ...config, ...options };

  // Check for required keys
  const publicKey = options.publicKey || process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = options.secretKey || process.env.LANGFUSE_SECRET_KEY;
  const host =
    options.host ||
    process.env.LANGFUSE_BASE_URL ||
    process.env.LANGFUSE_HOST ||
    endpointBaseUrl(process.env.LANGFUSE_MCP_ENDPOINT) ||
    'https://us.cloud.langfuse.com';

  if (!publicKey || !secretKey) {
    console.warn('[observability] Missing LANGFUSE_PUBLIC_KEY or LANGFUSE_SECRET_KEY. Tracing disabled.');
    config.enabled = false;
    return null;
  }

  if (!config.enabled) {
    return null;
  }

  langfuseClient = new Langfuse({
    publicKey,
    secretKey,
    baseUrl: host,
    flushAt: config.flushAt,
    flushInterval: config.flushInterval
  });

  return langfuseClient;
}

/**
 * Get the Langfuse client instance.
 * Returns null if not initialized or disabled.
 */
export function getClient(): Langfuse | null {
  return langfuseClient;
}

/**
 * Shutdown the observability client.
 * Call before application exit to flush pending events.
 */
export async function shutdownObservability(): Promise<void> {
  if (langfuseClient) {
    await langfuseClient.shutdownAsync();
    langfuseClient = null;
  }
}

// =============================================================================
// Trace Creation
// =============================================================================

export interface TraceOptions {
  name: string;
  userId?: string;
  sessionId?: string;
  metadata?: AtlasMetadata;
  tags?: string[];
  input?: unknown;
  output?: unknown;
}

export interface TraceHandle {
  id: string;
  trace: ReturnType<Langfuse['trace']> | null;
}

/**
 * Create a new trace.
 * 
 * @example
 * const trace = createTrace({
 *   name: 'mcp-tool-call',
 *   metadata: {
 *     'touchpoint.mcp_server': 'procore-mcp',
 *     'ai_task.type': 'generate'
 *   }
 * });
 */
export function createTrace(options: TraceOptions): TraceHandle {
  const traceId = crypto.randomUUID();

  if (!langfuseClient || !config.enabled) {
    return { id: traceId, trace: null };
  }

  const trace = langfuseClient.trace({
    id: traceId,
    name: options.name,
    userId: options.userId,
    sessionId: options.sessionId,
    metadata: options.metadata,
    tags: options.tags,
    input: options.input,
    output: options.output
  });

  return { id: traceId, trace };
}

// =============================================================================
// Span Creation
// =============================================================================

export interface SpanOptions {
  name: string;
  input?: unknown;
  output?: unknown;
  metadata?: AtlasMetadata;
  level?: 'DEBUG' | 'DEFAULT' | 'WARNING' | 'ERROR';
  statusMessage?: string;
}

export interface SpanHandle {
  id: string;
  span: ReturnType<ReturnType<Langfuse['trace']>['span']> | null;
  end: (output?: unknown) => void;
}

/**
 * Create a span within a trace.
 * 
 * @example
 * const span = createSpan(trace, {
 *   name: 'fetch-project',
 *   input: { projectId: '123' }
 * });
 * // ... do work
 * span.end({ success: true });
 */
export function createSpan(trace: TraceHandle, options: SpanOptions): SpanHandle {
  const spanId = crypto.randomUUID();

  if (!trace.trace || !config.enabled) {
    return {
      id: spanId,
      span: null,
      end: () => {}
    };
  }

  const span = trace.trace.span({
    id: spanId,
    name: options.name,
    input: options.input,
    output: options.output,
    metadata: options.metadata,
    level: options.level,
    statusMessage: options.statusMessage
  });

  return {
    id: spanId,
    span,
    end: (output?: unknown) => {
      span.end({ output });
    }
  };
}

// =============================================================================
// Generation Tracking (LLM Calls)
// =============================================================================

export interface GenerationOptions {
  name: string;
  model: string;
  input?: unknown;
  output?: unknown;
  metadata?: AtlasMetadata;
  usage?: {
    input?: number;
    output?: number;
    total?: number;
    unit?: 'TOKENS' | 'CHARACTERS';
  };
  modelParameters?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
  level?: 'DEBUG' | 'DEFAULT' | 'WARNING' | 'ERROR';
  statusMessage?: string;
}

export interface GenerationHandle {
  id: string;
  generation: ReturnType<ReturnType<Langfuse['trace']>['generation']> | null;
  end: (output?: unknown, usage?: GenerationOptions['usage']) => void;
}

/**
 * Track an LLM generation within a trace.
 * 
 * @example
 * const generation = createGeneration(trace, {
 *   name: 'claude-completion',
 *   model: 'claude-sonnet-4-20250514',
 *   input: messages,
 *   metadata: llmGenerationMetadata('claude-sonnet-4-20250514', 'generate')
 * });
 * 
 * const response = await anthropic.messages.create({ ... });
 * 
 * generation.end(response, {
 *   input: response.usage.input_tokens,
 *   output: response.usage.output_tokens
 * });
 */
export function createGeneration(trace: TraceHandle, options: GenerationOptions): GenerationHandle {
  const generationId = crypto.randomUUID();

  if (!trace.trace || !config.enabled) {
    return {
      id: generationId,
      generation: null,
      end: () => {}
    };
  }

  const generation = trace.trace.generation({
    id: generationId,
    name: options.name,
    model: options.model,
    input: options.input,
    output: options.output,
    metadata: options.metadata,
    usage: options.usage,
    modelParameters: options.modelParameters,
    level: options.level,
    statusMessage: options.statusMessage
  });

  return {
    id: generationId,
    generation,
    end: (output?: unknown, usage?: GenerationOptions['usage']) => {
      generation.end({ output, usage });
    }
  };
}

// =============================================================================
// Event Logging
// =============================================================================

export interface EventOptions {
  name: string;
  input?: unknown;
  output?: unknown;
  metadata?: AtlasMetadata;
  level?: 'DEBUG' | 'DEFAULT' | 'WARNING' | 'ERROR';
  statusMessage?: string;
}

/**
 * Log an event within a trace.
 * 
 * @example
 * logEvent(trace, {
 *   name: 'budget-warning',
 *   metadata: { 'constraint.type': 'cost', 'constraint.budget_usd': 5.00 },
 *   level: 'WARNING'
 * });
 */
export function logEvent(trace: TraceHandle, options: EventOptions): void {
  if (!trace.trace || !config.enabled) {
    return;
  }

  trace.trace.event({
    name: options.name,
    input: options.input,
    output: options.output,
    metadata: options.metadata,
    level: options.level,
    statusMessage: options.statusMessage
  });
}

// =============================================================================
// Score Recording
// =============================================================================

export interface ScoreOptions {
  name: string;
  value: number;
  comment?: string;
  dataType?: 'NUMERIC' | 'BOOLEAN' | 'CATEGORICAL';
}

/**
 * Record a score for a trace.
 * 
 * @example
 * recordScore(trace, {
 *   name: 'accuracy',
 *   value: 0.95,
 *   comment: 'High accuracy on validation set'
 * });
 */
export function recordScore(trace: TraceHandle, options: ScoreOptions): void {
  if (!trace.trace || !config.enabled) {
    return;
  }

  trace.trace.score({
    name: options.name,
    value: options.value,
    comment: options.comment,
    dataType: options.dataType
  });
}

// =============================================================================
// Convenience Wrappers
// =============================================================================

/**
 * Wrap an async function with tracing.
 * 
 * @example
 * const tracedFetch = withTrace(
 *   { name: 'api-fetch', metadata: { 'system_task.type': 'routing' } },
 *   async () => fetch('https://api.example.com/data')
 * );
 */
export async function withTrace<T>(
  options: TraceOptions,
  fn: (trace: TraceHandle) => Promise<T>
): Promise<T> {
  const trace = createTrace(options);
  
  try {
    const result = await fn(trace);
    if (trace.trace) {
      trace.trace.update({ output: result });
    }
    return result;
  } catch (error) {
    if (trace.trace) {
      trace.trace.update({
        output: { error: error instanceof Error ? error.message : String(error) },
        metadata: { ...options.metadata, error: true }
      });
    }
    throw error;
  }
}

/**
 * Wrap an MCP tool handler with tracing.
 * 
 * @example
 * const handler = traceMcpTool('procore-mcp', 'get-project', 'extract', async (input) => {
 *   return await procoreClient.getProject(input.projectId);
 * });
 */
export function traceMcpTool<TInput, TOutput>(
  serverName: string,
  toolName: string,
  taskType: import('./atlas.js').AITaskType,
  handler: (input: TInput) => Promise<TOutput>
): (input: TInput) => Promise<TOutput> {
  return async (input: TInput): Promise<TOutput> => {
    const { mcpToolMetadata } = await import('./atlas.js');
    
    return withTrace(
      {
        name: `mcp:${serverName}:${toolName}`,
        input,
        metadata: mcpToolMetadata(serverName, toolName, taskType)
      },
      async (trace) => {
        const span = createSpan(trace, {
          name: toolName,
          input,
          metadata: { 'ai_task.skill': toolName }
        });

        try {
          const result = await handler(input);
          span.end(result);
          return result;
        } catch (error) {
          span.end({ error: error instanceof Error ? error.message : String(error) });
          throw error;
        }
      }
    );
  };
}
