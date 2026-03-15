/**
 * WorkerInsight — Cloudflare Workers insight adapter
 *
 * Writes InsightEvents to a collector function that you wire to your
 * preferred Cloudflare observability service:
 *   - Analytics Engine (real-time analytics)
 *   - Logpush (structured log export)
 *   - Custom Workers endpoint
 *
 * The adapter is intentionally simple — it transforms InsightEvents
 * into a format your collector can consume, without importing any
 * Cloudflare-specific types (keeping mcp-core platform-agnostic).
 */

import type { InsightEmitter, InsightEvent } from '../insight.js';

/**
 * A collector function that receives processed insight data.
 *
 * Wire this to your Cloudflare service:
 *   - Analytics Engine: `(data) => env.ANALYTICS.writeDataPoint(data)`
 *   - Logpush: `(data) => console.log(JSON.stringify(data))`
 *   - Custom: `(data) => env.INSIGHT_QUEUE.send(data)`
 */
export type InsightCollector = (data: InsightDataPoint) => void;

export interface InsightDataPoint {
  /** Blobs: dimension values for Analytics Engine */
  blobs: string[];

  /** Doubles: numeric values for Analytics Engine */
  doubles: number[];

  /** Indexes: primary grouping key */
  indexes: string[];
}

export class WorkerInsight implements InsightEmitter {
  private readonly collector: InsightCollector;

  constructor(collector: InsightCollector) {
    this.collector = collector;
  }

  emit(event: InsightEvent): void {
    const dataPoint: InsightDataPoint = {
      blobs: [
        event.accountId,
        event.tier,
        event.action,
        event.success !== undefined ? (event.success ? 'ok' : 'error') : 'unknown',
      ],
      doubles: [
        event.durationMs ?? 0,
        event.timestamp ?? Date.now(),
      ],
      indexes: [event.accountId],
    };

    this.collector(dataPoint);
  }
}
