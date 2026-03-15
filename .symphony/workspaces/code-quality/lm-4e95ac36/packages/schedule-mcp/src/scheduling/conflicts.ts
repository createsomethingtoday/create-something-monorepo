/**
 * Schedule MCP — Conflict Detection & Availability
 * Detect scheduling conflicts and find open time slots.
 *
 * All timestamps are unix seconds.
 * Zero external dependencies.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TimeBlock {
  id?: string;
  title?: string;
  start_time: number;
  end_time: number;
  calendar_id?: string;
  member_id?: string;
}

export interface Conflict {
  event_a: TimeBlock;
  event_b: TimeBlock;
  overlap_start: number;
  overlap_end: number;
  overlap_minutes: number;
}

export interface AvailabilitySlot {
  start_time: number;
  end_time: number;
  duration_minutes: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SECONDS_PER_MINUTE = 60;
const DEFAULT_MIN_DURATION_MINUTES = 30;

// ---------------------------------------------------------------------------
// Conflict Detection
// ---------------------------------------------------------------------------

/**
 * Find all pairwise overlapping time blocks.
 *
 * Two blocks overlap when A starts before B ends AND B starts before A ends.
 * Results are sorted by overlap start time.
 *
 * Uses a sweep-line approach: sort by start time, then check each event
 * against subsequent events until no more overlaps are possible.
 *
 * @param events - Array of time blocks to check
 * @returns Array of conflicts sorted by overlap_start
 */
export function findConflicts(events: TimeBlock[]): Conflict[] {
  if (events.length < 2) return [];

  // Sort by start_time, then by end_time descending (longer events first)
  const sorted = [...events].sort((a, b) => {
    const startDiff = a.start_time - b.start_time;
    if (startDiff !== 0) return startDiff;
    return b.end_time - a.end_time;
  });

  const conflicts: Conflict[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j];

      // Since sorted by start_time, if b starts at or after a ends,
      // no further events can overlap with a
      if (b.start_time >= a.end_time) break;

      // Overlap exists: a.start < b.end && b.start < a.end
      const overlapStart = Math.max(a.start_time, b.start_time);
      const overlapEnd = Math.min(a.end_time, b.end_time);
      const overlapSeconds = overlapEnd - overlapStart;

      if (overlapSeconds > 0) {
        conflicts.push({
          event_a: a,
          event_b: b,
          overlap_start: overlapStart,
          overlap_end: overlapEnd,
          overlap_minutes: Math.floor(overlapSeconds / SECONDS_PER_MINUTE),
        });
      }
    }
  }

  // Sort by overlap start time
  conflicts.sort((a, b) => a.overlap_start - b.overlap_start);

  return conflicts;
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

/**
 * Find free time slots within a range, given a set of busy blocks.
 *
 * Merges overlapping busy blocks, then identifies gaps that meet
 * the minimum duration requirement.
 *
 * @param busyBlocks         - Array of occupied time blocks
 * @param rangeStart         - Search range start (unix seconds, inclusive)
 * @param rangeEnd           - Search range end (unix seconds, exclusive)
 * @param minDurationMinutes - Minimum slot duration in minutes (default: 30)
 * @returns Array of available slots sorted by start_time
 */
export function findAvailability(
  busyBlocks: TimeBlock[],
  rangeStart: number,
  rangeEnd: number,
  minDurationMinutes?: number,
): AvailabilitySlot[] {
  if (rangeStart >= rangeEnd) return [];

  const minDuration = (minDurationMinutes ?? DEFAULT_MIN_DURATION_MINUTES) * SECONDS_PER_MINUTE;

  // Clip busy blocks to the range and filter out-of-range blocks
  const clipped: Array<{ start: number; end: number }> = [];
  for (const block of busyBlocks) {
    const start = Math.max(block.start_time, rangeStart);
    const end = Math.min(block.end_time, rangeEnd);
    if (start < end) {
      clipped.push({ start, end });
    }
  }

  // Sort by start time
  clipped.sort((a, b) => a.start - b.start);

  // Merge overlapping intervals
  const merged: Array<{ start: number; end: number }> = [];
  for (const interval of clipped) {
    const last = merged[merged.length - 1];
    if (last && interval.start <= last.end) {
      // Overlapping or adjacent — extend
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push({ start: interval.start, end: interval.end });
    }
  }

  // Find gaps
  const slots: AvailabilitySlot[] = [];
  let cursor = rangeStart;

  for (const busy of merged) {
    if (cursor < busy.start) {
      const gapSeconds = busy.start - cursor;
      if (gapSeconds >= minDuration) {
        slots.push({
          start_time: cursor,
          end_time: busy.start,
          duration_minutes: Math.floor(gapSeconds / SECONDS_PER_MINUTE),
        });
      }
    }
    cursor = Math.max(cursor, busy.end);
  }

  // Trailing gap after last busy block
  if (cursor < rangeEnd) {
    const gapSeconds = rangeEnd - cursor;
    if (gapSeconds >= minDuration) {
      slots.push({
        start_time: cursor,
        end_time: rangeEnd,
        duration_minutes: Math.floor(gapSeconds / SECONDS_PER_MINUTE),
      });
    }
  }

  return slots;
}
