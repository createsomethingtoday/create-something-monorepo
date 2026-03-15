/**
 * ConsoleInsight — structured JSON insight to stderr
 *
 * For local development and debugging. Outputs each InsightEvent as a
 * single-line JSON object to stderr (not stdout — MCP uses stdout for
 * protocol messages).
 *
 * Format: {"ts":"...","tier":"...","action":"...","account":"...","ok":true,"ms":42}
 */

import type { InsightEmitter, InsightEvent } from '../insight.js';

export class ConsoleInsight implements InsightEmitter {
  private readonly verbose: boolean;

  /**
   * @param verbose - If true, include full metadata in output. Default: false.
   */
  constructor(verbose: boolean = false) {
    this.verbose = verbose;
  }

  emit(event: InsightEvent): void {
    const ts = new Date(event.timestamp ?? Date.now()).toISOString();

    const entry: Record<string, unknown> = {
      ts,
      tier: event.tier,
      action: event.action,
      account: event.accountId,
    };

    if (event.success !== undefined) {
      entry.ok = event.success;
    }

    if (event.durationMs !== undefined) {
      entry.ms = event.durationMs;
    }

    if (this.verbose && event.metadata) {
      entry.meta = event.metadata;
    }

    console.error(JSON.stringify(entry));
  }
}
