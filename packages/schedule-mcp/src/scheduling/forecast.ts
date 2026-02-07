/**
 * Schedule MCP — Forecast Engine
 * Project future events from a template pattern over a date range.
 *
 * Reuses backfill generation logic with status set to 'tentative'.
 *
 * All timestamps are unix seconds, all math is UTC.
 * Zero external dependencies.
 */

import type { TemplateSlot } from '../db/schema.js';
import { generateBackfillEvents, type GeneratedEvent } from './backfill.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ForecastOptions {
  /** Template slots defining the recurring pattern */
  templateSlots: TemplateSlot[];
  /** Cycle length in days (e.g., 7 for weekly, 14 for biweekly) */
  cycleDays: number;
  /** Range start — unix seconds (inclusive) */
  rangeStart: number;
  /** Range end — unix seconds (exclusive) */
  rangeEnd: number;
  /** Calendar to assign generated events to */
  calendarId: string;
  /** Timezone hint (informational — all math remains UTC) */
  timezone?: string;
}

// Re-export GeneratedEvent for consumers of this module
export type { GeneratedEvent };

// ---------------------------------------------------------------------------
// Core generation
// ---------------------------------------------------------------------------

/**
 * Generate forecast events from template slots over a future date range.
 *
 * Identical to backfill but produces events with status 'tentative'
 * to indicate they are projected rather than confirmed.
 *
 * @param options - Forecast configuration
 * @returns Array of generated events sorted by start_time
 */
export function generateForecastEvents(options: ForecastOptions): GeneratedEvent[] {
  return generateBackfillEvents(
    {
      templateSlots: options.templateSlots,
      cycleDays: options.cycleDays,
      rangeStart: options.rangeStart,
      rangeEnd: options.rangeEnd,
      calendarId: options.calendarId,
      timezone: options.timezone,
    },
    'tentative',
  );
}
