/**
 * InsightEmitter — the perceptual membrane (cross-cutting concern)
 *
 * Three-Tier Framework: Insight is not a processing tier — it doesn't do work
 * the way tiers do. It watches work being done. It's the reflexive loop that
 * enables the system to observe its own operation.
 *
 * Without Insight, policy modification is blind mutation. With Insight, every
 * policy selection is traced, every constraint change is logged, and the system
 * perceives itself choosing constraints.
 *
 * Every InsightEvent is scoped to an accountId. Per-account audit trails come free.
 */

// =============================================================================
// Insight Event
// =============================================================================

/**
 * A single observation about what happened in the system.
 *
 * Events are classified by tier so you can filter/route them:
 *   - database:    token refresh, data fetch, storage operations
 *   - automation:  tool invocation, API call, skill execution
 *   - judgment:    policy check, scope validation, sampling request
 */
export interface InsightEvent {
  /** Account this event belongs to */
  accountId: string;

  /** Which tier generated the event */
  tier: 'database' | 'automation' | 'judgment';

  /** What happened (e.g., 'tool:create_item', 'auth:token_refresh', 'policy:scope_check') */
  action: string;

  /** Did it succeed? */
  success?: boolean;

  /** Duration in milliseconds (for performance tracking) */
  durationMs?: number;

  /** Additional structured data */
  metadata?: Record<string, unknown>;

  /** When it happened (defaults to Date.now() if not set) */
  timestamp?: number;
}

// =============================================================================
// Insight Emitter Interface
// =============================================================================

/**
 * Pluggable observability interface.
 *
 * Implementations:
 *   - ConsoleInsight:  Structured JSON to stderr (dev/debug)
 *   - WorkerInsight:   Cloudflare Analytics Engine / Logpush
 *   - NoopInsight:     Silent (production default if no config)
 */
export interface InsightEmitter {
  emit(event: InsightEvent): void;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Create a scoped emitter that pre-fills accountId on every event.
 *
 * Usage in tool handlers:
 *   const insight = scopedInsight(emitter, ctx.accountId);
 *   insight.emit({ tier: 'automation', action: 'tool:my_tool' });
 *   // accountId is already set
 */
export function scopedInsight(
  emitter: InsightEmitter,
  accountId: string,
): InsightEmitter {
  return {
    emit(event: InsightEvent) {
      emitter.emit({
        ...event,
        accountId,
        timestamp: event.timestamp ?? Date.now(),
      });
    },
  };
}

/**
 * Wrap an async operation with insight timing.
 *
 * Usage:
 *   const result = await withInsight(insight, {
 *     tier: 'automation',
 *     action: 'api:fetch_items',
 *     accountId: ctx.accountId,
 *   }, async () => {
 *     return await api.getItems(ctx.accountId);
 *   });
 */
export async function withInsight<T>(
  emitter: InsightEmitter,
  event: Omit<InsightEvent, 'success' | 'durationMs' | 'timestamp'>,
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    emitter.emit({
      ...event,
      success: true,
      durationMs: Date.now() - start,
      timestamp: start,
    });
    return result;
  } catch (error) {
    emitter.emit({
      ...event,
      success: false,
      durationMs: Date.now() - start,
      timestamp: start,
      metadata: {
        ...event.metadata,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}
