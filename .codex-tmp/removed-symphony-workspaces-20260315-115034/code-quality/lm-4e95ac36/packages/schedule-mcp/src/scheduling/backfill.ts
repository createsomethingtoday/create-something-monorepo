/**
 * Schedule MCP — Backfill Engine
 * Generate past events from a template pattern over a date range.
 *
 * Takes template slots (day offsets + time-of-day) and a cycle period,
 * then stamps out concrete events for each cycle within the range.
 *
 * All timestamps are unix seconds, all math is UTC.
 * Zero external dependencies.
 */

import type { TemplateSlot } from '../db/schema.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BackfillOptions {
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

export interface GeneratedEvent {
  calendar_id: string;
  title: string;
  start_time: number;
  end_time: number;
  all_day: number;
  recurrence_id?: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SECONDS_PER_DAY = 86400;
const SECONDS_PER_MINUTE = 60;

// ---------------------------------------------------------------------------
// Core generation
// ---------------------------------------------------------------------------

/**
 * Generate concrete events from template slots over a date range.
 *
 * For each cycle period within [rangeStart, rangeEnd), every template slot
 * produces one event positioned by its day_offset and start_minutes relative
 * to the cycle start.
 *
 * @param options - Backfill configuration
 * @param statusOverride - Event status (default: 'confirmed')
 * @returns Array of generated events sorted by start_time
 */
export function generateBackfillEvents(
  options: BackfillOptions,
  statusOverride?: string,
): GeneratedEvent[] {
  const {
    templateSlots,
    cycleDays,
    rangeStart,
    rangeEnd,
    calendarId,
  } = options;

  if (cycleDays <= 0) {
    throw new Error(`cycleDays must be positive, got ${cycleDays}`);
  }
  if (rangeStart >= rangeEnd) {
    return [];
  }
  if (templateSlots.length === 0) {
    return [];
  }

  const status = statusOverride ?? 'confirmed';
  const cycleSeconds = cycleDays * SECONDS_PER_DAY;
  const events: GeneratedEvent[] = [];

  // Align to cycle boundary at or before rangeStart
  // Use rangeStart as the first cycle start, then step forward by cycleDays
  let cycleStart = rangeStart;

  // Safety limit: max cycles
  const maxCycles = Math.ceil((rangeEnd - rangeStart) / cycleSeconds) + 1;
  const SAFETY = Math.min(maxCycles, 100_000);

  for (let c = 0; c < SAFETY && cycleStart < rangeEnd; c++) {
    for (const slot of templateSlots) {
      const eventStart =
        cycleStart +
        slot.day_offset * SECONDS_PER_DAY +
        slot.start_minutes * SECONDS_PER_MINUTE;

      const eventEnd = eventStart + slot.duration_minutes * SECONDS_PER_MINUTE;

      // Only include events that fall within the range
      if (eventStart >= rangeEnd) continue;
      if (eventEnd <= rangeStart) continue;

      const event: GeneratedEvent = {
        calendar_id: calendarId,
        title: slot.title,
        start_time: eventStart,
        end_time: eventEnd,
        all_day: 0,
        status,
      };

      // Link back to template slot for traceability
      if (slot.template_id) {
        event.recurrence_id = slot.template_id;
      }

      events.push(event);
    }

    cycleStart += cycleSeconds;
  }

  // Sort by start time, then by title for deterministic order
  events.sort((a, b) => {
    const timeDiff = a.start_time - b.start_time;
    if (timeDiff !== 0) return timeDiff;
    return a.title.localeCompare(b.title);
  });

  return events;
}
