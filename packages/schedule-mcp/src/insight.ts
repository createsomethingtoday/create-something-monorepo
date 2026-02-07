/**
 * Schedule MCP — Insight (Cross-Cutting Concern)
 *
 * "How the system perceives itself." — Three-Tier Framework
 *
 * The Insight concern is the reflexive loop that makes execution legible.
 * Without it, policy modification is blind mutation. With it, every tool
 * invocation is traced, every sampling request is logged, and the system
 * perceives its own operation.
 *
 * This module provides lightweight, zero-dependency tracing that works in
 * both stdio and Worker contexts. In stdio mode, traces go to stderr.
 * In Worker mode, traces go to Cloudflare's built-in observability +
 * structured console output visible in `wrangler tail`.
 *
 * Optionally integrates with @create-something/observability (Langfuse)
 * when available for full distributed tracing.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TraceEvent {
  /** Unique trace ID (groups related events) */
  traceId: string;
  /** Event type */
  type: 'tool_start' | 'tool_end' | 'tool_error' | 'resource_read' | 'sampling_request' | 'sampling_response' | 'policy_event';
  /** Tool or resource name */
  name: string;
  /** When the event occurred (unix ms) */
  timestamp: number;
  /** Duration in ms (for _end events) */
  durationMs?: number;
  /** Input data (sanitized) */
  input?: Record<string, unknown>;
  /** Output summary */
  output?: Record<string, unknown>;
  /** Error details */
  error?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface InsightConfig {
  /** Enable/disable tracing (default: true) */
  enabled: boolean;
  /** Log to stderr (default: true in stdio mode) */
  logToStderr: boolean;
  /** Custom event handler for external integrations */
  onEvent?: (event: TraceEvent) => void;
}

// ---------------------------------------------------------------------------
// Insight Engine
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: InsightConfig = {
  enabled: true,
  logToStderr: true,
};

let insightConfig: InsightConfig = { ...DEFAULT_CONFIG };

/** Event buffer for batch retrieval */
const eventBuffer: TraceEvent[] = [];
const MAX_BUFFER_SIZE = 1000;

/**
 * Configure the Insight engine.
 */
export function configureInsight(config: Partial<InsightConfig>): void {
  insightConfig = { ...insightConfig, ...config };
}

/**
 * Generate a unique trace ID.
 */
export function generateTraceId(): string {
  return `sch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Emit a trace event.
 */
export function emitEvent(event: TraceEvent): void {
  if (!insightConfig.enabled) return;

  // Buffer for batch retrieval
  eventBuffer.push(event);
  if (eventBuffer.length > MAX_BUFFER_SIZE) {
    eventBuffer.shift();
  }

  // Log to stderr (structured JSON)
  if (insightConfig.logToStderr) {
    const logLine = JSON.stringify({
      _insight: true,
      ...event,
    });
    console.error(`[insight] ${logLine}`);
  }

  // Custom handler (for Langfuse, external integrations)
  if (insightConfig.onEvent) {
    insightConfig.onEvent(event);
  }
}

/**
 * Get recent events from the buffer.
 */
export function getRecentEvents(limit = 50): TraceEvent[] {
  return eventBuffer.slice(-limit);
}

/**
 * Clear the event buffer.
 */
export function clearEvents(): void {
  eventBuffer.length = 0;
}

// ---------------------------------------------------------------------------
// Traced Tool Wrapper
// ---------------------------------------------------------------------------

/**
 * Wrap an MCP tool handler with insight tracing.
 *
 * Records tool_start, tool_end (with duration), and tool_error events.
 * Returns the original result unchanged.
 *
 * @example
 * ```ts
 * const result = await tracedTool('create_event', params, async () => {
 *   return await actualHandler(params);
 * });
 * ```
 */
export async function tracedTool<T>(
  toolName: string,
  input: Record<string, unknown>,
  handler: () => Promise<T>,
  metadata?: Record<string, unknown>,
): Promise<T> {
  const traceId = generateTraceId();
  const startTime = Date.now();

  emitEvent({
    traceId,
    type: 'tool_start',
    name: toolName,
    timestamp: startTime,
    input: sanitizeInput(input),
    metadata,
  });

  try {
    const result = await handler();

    emitEvent({
      traceId,
      type: 'tool_end',
      name: toolName,
      timestamp: Date.now(),
      durationMs: Date.now() - startTime,
      output: summarizeOutput(result),
      metadata,
    });

    return result;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    emitEvent({
      traceId,
      type: 'tool_error',
      name: toolName,
      timestamp: Date.now(),
      durationMs: Date.now() - startTime,
      error: errorMessage,
      metadata,
    });

    throw err;
  }
}

/**
 * Log a resource read event.
 */
export function traceResourceRead(
  resourceName: string,
  uri: string,
  metadata?: Record<string, unknown>,
): void {
  emitEvent({
    traceId: generateTraceId(),
    type: 'resource_read',
    name: resourceName,
    timestamp: Date.now(),
    input: { uri },
    metadata,
  });
}

/**
 * Log a sampling request event (Automation requesting Judgment).
 *
 * This is the recursive property in action — the most important
 * architectural event to trace per the Three-Tier Framework.
 */
export function traceSamplingRequest(
  toolName: string,
  traceId: string,
  input: string,
  metadata?: Record<string, unknown>,
): void {
  emitEvent({
    traceId,
    type: 'sampling_request',
    name: toolName,
    timestamp: Date.now(),
    input: { prompt_preview: input.slice(0, 200) },
    metadata: { ...metadata, recursive_property: true },
  });
}

/**
 * Log a sampling response event.
 */
export function traceSamplingResponse(
  toolName: string,
  traceId: string,
  validated: boolean,
  metadata?: Record<string, unknown>,
): void {
  emitEvent({
    traceId,
    type: 'sampling_response',
    name: toolName,
    timestamp: Date.now(),
    output: { validated },
    metadata: { ...metadata, recursive_property: true },
  });
}

/**
 * Log a policy-related event (policy-as-artifact).
 */
export function tracePolicyEvent(
  description: string,
  policyData?: Record<string, unknown>,
): void {
  emitEvent({
    traceId: generateTraceId(),
    type: 'policy_event',
    name: 'policy',
    timestamp: Date.now(),
    metadata: { description, ...policyData },
  });
}

// ---------------------------------------------------------------------------
// Sanitization Helpers
// ---------------------------------------------------------------------------

/** Sanitize input for logging (redact large payloads, truncate strings). */
function sanitizeInput(input: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'string' && value.length > 500) {
      sanitized[key] = value.slice(0, 500) + '...[truncated]';
    } else if (Array.isArray(value)) {
      sanitized[key] = `[Array(${value.length})]`;
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/** Summarize output for logging (extract key metrics). */
function summarizeOutput(result: unknown): Record<string, unknown> {
  if (result === null || result === undefined) return { empty: true };

  if (typeof result === 'object' && result !== null) {
    const obj = result as Record<string, unknown>;

    // MCP content format
    if ('content' in obj && Array.isArray(obj.content)) {
      const firstContent = obj.content[0];
      if (firstContent && typeof firstContent === 'object' && 'text' in firstContent) {
        const text = (firstContent as { text: string }).text;
        try {
          const parsed = JSON.parse(text);
          if (parsed.error) return { error: parsed.error };
          if (parsed.events_created !== undefined) return { events_created: parsed.events_created };
          if (parsed.conflicts_found !== undefined) return { conflicts_found: parsed.conflicts_found };
          if (parsed.slots_found !== undefined) return { slots_found: parsed.slots_found };
          return { result_keys: Object.keys(parsed).join(', ') };
        } catch {
          return { text_length: text.length };
        }
      }
    }

    return { keys: Object.keys(obj).join(', ') };
  }

  return { type: typeof result };
}
