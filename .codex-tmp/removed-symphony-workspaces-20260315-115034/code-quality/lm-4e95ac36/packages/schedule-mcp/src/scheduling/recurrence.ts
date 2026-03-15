/**
 * Schedule MCP — Recurrence Engine
 * Lightweight RFC 5545 RRULE parser and occurrence generator.
 *
 * Covers common patterns: DAILY, WEEKLY, MONTHLY, YEARLY
 * with INTERVAL, BYDAY, BYMONTHDAY, COUNT, UNTIL.
 *
 * All timestamps are unix seconds, all math is UTC.
 * Zero external dependencies.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export type Weekday = 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA';

export interface RecurrenceRule {
  freq: Frequency;
  interval?: number;
  byday?: Weekday[];
  bymonthday?: number;
  count?: number;
  until?: number; // unix seconds
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_FREQ = new Set<string>(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']);

const VALID_WEEKDAYS = new Set<string>(['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']);

/** JS Date.getUTCDay() returns 0=Sunday. Map to Weekday. */
const DAY_INDEX_TO_WEEKDAY: Weekday[] = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/** Map Weekday to JS Date.getUTCDay() index. */
const WEEKDAY_TO_INDEX: Record<Weekday, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

const SECONDS_PER_DAY = 86400;

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Parse an RRULE string into a RecurrenceRule.
 *
 * Accepts format: "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,FR"
 * Leading "RRULE:" prefix is stripped if present.
 */
export function parseRRule(rruleString: string): RecurrenceRule {
  const cleaned = rruleString.replace(/^RRULE:/i, '').trim();
  if (!cleaned) {
    throw new Error('Empty RRULE string');
  }

  const parts = cleaned.split(';');
  const params = new Map<string, string>();

  for (const part of parts) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).toUpperCase().trim();
    const value = part.slice(eqIdx + 1).trim();
    params.set(key, value);
  }

  // FREQ is required
  const freqStr = params.get('FREQ');
  if (!freqStr || !VALID_FREQ.has(freqStr)) {
    throw new Error(`Invalid or missing FREQ: ${freqStr ?? '(none)'}`);
  }
  const freq = freqStr as Frequency;

  const rule: RecurrenceRule = { freq };

  // INTERVAL
  const intervalStr = params.get('INTERVAL');
  if (intervalStr !== undefined) {
    const interval = parseInt(intervalStr, 10);
    if (isNaN(interval) || interval < 1) {
      throw new Error(`Invalid INTERVAL: ${intervalStr}`);
    }
    rule.interval = interval;
  }

  // BYDAY
  const bydayStr = params.get('BYDAY');
  if (bydayStr !== undefined) {
    const days = bydayStr.split(',').map((d) => d.trim().toUpperCase());
    for (const d of days) {
      if (!VALID_WEEKDAYS.has(d)) {
        throw new Error(`Invalid BYDAY value: ${d}`);
      }
    }
    rule.byday = days as Weekday[];
  }

  // BYMONTHDAY
  const bymonthdayStr = params.get('BYMONTHDAY');
  if (bymonthdayStr !== undefined) {
    const day = parseInt(bymonthdayStr, 10);
    if (isNaN(day) || day < 1 || day > 31) {
      throw new Error(`Invalid BYMONTHDAY: ${bymonthdayStr}`);
    }
    rule.bymonthday = day;
  }

  // COUNT
  const countStr = params.get('COUNT');
  if (countStr !== undefined) {
    const count = parseInt(countStr, 10);
    if (isNaN(count) || count < 1) {
      throw new Error(`Invalid COUNT: ${countStr}`);
    }
    rule.count = count;
  }

  // UNTIL — accepts ISO 8601 string or unix timestamp
  const untilStr = params.get('UNTIL');
  if (untilStr !== undefined) {
    let until: number;
    // Try parsing as iCal date (YYYYMMDDTHHMMSSZ or YYYYMMDD)
    const icalMatch = untilStr.match(
      /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z?)?$/,
    );
    if (icalMatch) {
      const [, y, m, d, hh, mm, ss] = icalMatch;
      const iso = `${y}-${m}-${d}T${hh ?? '00'}:${mm ?? '00'}:${ss ?? '00'}Z`;
      until = Math.floor(new Date(iso).getTime() / 1000);
    } else if (/^\d+$/.test(untilStr)) {
      until = parseInt(untilStr, 10);
    } else {
      // Try ISO 8601
      const ms = Date.parse(untilStr);
      if (isNaN(ms)) {
        throw new Error(`Invalid UNTIL: ${untilStr}`);
      }
      until = Math.floor(ms / 1000);
    }
    rule.until = until;
  }

  return rule;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/**
 * Serialize a RecurrenceRule back to RRULE string format.
 * Does NOT include the "RRULE:" prefix.
 */
export function formatRRule(rule: RecurrenceRule): string {
  const parts: string[] = [`FREQ=${rule.freq}`];

  if (rule.interval !== undefined && rule.interval > 1) {
    parts.push(`INTERVAL=${rule.interval}`);
  }

  if (rule.byday !== undefined && rule.byday.length > 0) {
    parts.push(`BYDAY=${rule.byday.join(',')}`);
  }

  if (rule.bymonthday !== undefined) {
    parts.push(`BYMONTHDAY=${rule.bymonthday}`);
  }

  if (rule.count !== undefined) {
    parts.push(`COUNT=${rule.count}`);
  }

  if (rule.until !== undefined) {
    // Format as iCal date
    const d = new Date(rule.until * 1000);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const formatted =
      `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
      `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
    parts.push(`UNTIL=${formatted}`);
  }

  return parts.join(';');
}

// ---------------------------------------------------------------------------
// Occurrence Generation
// ---------------------------------------------------------------------------

/**
 * Generate occurrence timestamps within [rangeStart, rangeEnd).
 *
 * @param rule       - The recurrence rule
 * @param startTime  - Original event start (unix seconds)
 * @param rangeStart - Range start (unix seconds, inclusive)
 * @param rangeEnd   - Range end (unix seconds, exclusive)
 * @returns Array of unix timestamps (seconds) for each occurrence
 */
export function generateOccurrences(
  rule: RecurrenceRule,
  startTime: number,
  rangeStart: number,
  rangeEnd: number,
): number[] {
  const occurrences: number[] = [];
  const interval = rule.interval ?? 1;
  const maxCount = rule.count;
  const until = rule.until;

  // Hard safety limit to prevent infinite loops
  const SAFETY_LIMIT = 10_000;
  let totalGenerated = 0;

  switch (rule.freq) {
    case 'DAILY':
      return generateDaily(startTime, interval, rangeStart, rangeEnd, maxCount, until);

    case 'WEEKLY':
      return generateWeekly(
        startTime,
        interval,
        rule.byday,
        rangeStart,
        rangeEnd,
        maxCount,
        until,
      );

    case 'MONTHLY':
      return generateMonthly(
        startTime,
        interval,
        rule.bymonthday,
        rangeStart,
        rangeEnd,
        maxCount,
        until,
      );

    case 'YEARLY':
      return generateYearly(startTime, interval, rangeStart, rangeEnd, maxCount, until);

    default:
      return occurrences;
  }
}

// ---------------------------------------------------------------------------
// Per-frequency generators
// ---------------------------------------------------------------------------

function generateDaily(
  startTime: number,
  interval: number,
  rangeStart: number,
  rangeEnd: number,
  maxCount: number | undefined,
  until: number | undefined,
): number[] {
  const results: number[] = [];
  const step = interval * SECONDS_PER_DAY;
  let count = 0;

  // Fast-forward: skip ahead if startTime is well before rangeStart
  let current = startTime;
  if (current < rangeStart) {
    const skipSteps = Math.floor((rangeStart - current) / step);
    current += skipSteps * step;
    count += skipSteps;
  }

  for (; count < (maxCount ?? Infinity); count++) {
    if (current >= rangeEnd) break;
    if (until !== undefined && current > until) break;
    if (current >= rangeStart) {
      results.push(current);
    }
    current = startTime + (count + 1) * step;
  }

  return results;
}

function generateWeekly(
  startTime: number,
  interval: number,
  byday: Weekday[] | undefined,
  rangeStart: number,
  rangeEnd: number,
  maxCount: number | undefined,
  until: number | undefined,
): number[] {
  const results: number[] = [];
  const startDate = new Date(startTime * 1000);

  // If no BYDAY, use the day of the week from startTime
  const targetDays: Set<number> = new Set();
  if (byday && byday.length > 0) {
    for (const d of byday) {
      targetDays.add(WEEKDAY_TO_INDEX[d]);
    }
  } else {
    targetDays.add(startDate.getUTCDay());
  }

  // Time of day from original event (seconds past midnight UTC)
  const timeOfDay =
    startDate.getUTCHours() * 3600 +
    startDate.getUTCMinutes() * 60 +
    startDate.getUTCSeconds();

  // Find the Monday of the starting week
  const startDow = startDate.getUTCDay();
  // Adjust to get the Sunday of the week (week starts Sunday in JS)
  const weekStartMs = startDate.getTime() - startDow * SECONDS_PER_DAY * 1000;

  const weekStep = interval * 7 * SECONDS_PER_DAY * 1000;
  let count = 0;
  let weekMs = weekStartMs;

  // Fast-forward weeks if possible
  if (weekMs / 1000 + 7 * SECONDS_PER_DAY < rangeStart) {
    const weeksToSkip = Math.floor(
      (rangeStart * 1000 - weekMs) / weekStep,
    );
    // We can't skip count tracking for COUNT rules
    if (maxCount !== undefined) {
      // Count occurrences per week
      const perWeek = targetDays.size;
      const safeSkip = Math.floor(((maxCount - 1) / perWeek) > weeksToSkip ? weeksToSkip : (maxCount - 1) / perWeek);
      weekMs += safeSkip * weekStep;
      count += safeSkip * perWeek;
    } else {
      weekMs += weeksToSkip * weekStep;
    }
  }

  const SAFETY = 10_000;
  let iterations = 0;

  outer: while (iterations++ < SAFETY) {
    // For each day in this week
    const sortedDays = [...targetDays].sort((a, b) => a - b);
    for (const dow of sortedDays) {
      const dayMs = weekMs + dow * SECONDS_PER_DAY * 1000;
      const ts = Math.floor(dayMs / 1000) + timeOfDay;

      // Skip occurrences before the original start
      if (ts < startTime) continue;

      if (maxCount !== undefined && count >= maxCount) break outer;
      if (until !== undefined && ts > until) break outer;
      if (ts >= rangeEnd) break outer;

      if (ts >= rangeStart) {
        results.push(ts);
      }
      count++;
    }

    weekMs += weekStep;
  }

  return results;
}

function generateMonthly(
  startTime: number,
  interval: number,
  bymonthday: number | undefined,
  rangeStart: number,
  rangeEnd: number,
  maxCount: number | undefined,
  until: number | undefined,
): number[] {
  const results: number[] = [];
  const startDate = new Date(startTime * 1000);

  const targetDay = bymonthday ?? startDate.getUTCDate();
  const timeOfDay =
    startDate.getUTCHours() * 3600 +
    startDate.getUTCMinutes() * 60 +
    startDate.getUTCSeconds();

  let year = startDate.getUTCFullYear();
  let month = startDate.getUTCMonth();
  let count = 0;

  const SAFETY = 10_000;

  for (let i = 0; i < SAFETY; i++) {
    // Clamp day to month's last day
    const daysInMonth = getDaysInMonth(year, month);
    const day = Math.min(targetDay, daysInMonth);

    const d = new Date(Date.UTC(year, month, day));
    const ts = Math.floor(d.getTime() / 1000) + timeOfDay;

    if (ts >= startTime) {
      if (maxCount !== undefined && count >= maxCount) break;
      if (until !== undefined && ts > until) break;
      if (ts >= rangeEnd) break;

      if (ts >= rangeStart) {
        results.push(ts);
      }
      count++;
    }

    // Advance by interval months
    month += interval;
    while (month >= 12) {
      month -= 12;
      year++;
    }
  }

  return results;
}

function generateYearly(
  startTime: number,
  interval: number,
  rangeStart: number,
  rangeEnd: number,
  maxCount: number | undefined,
  until: number | undefined,
): number[] {
  const results: number[] = [];
  const startDate = new Date(startTime * 1000);

  const targetMonth = startDate.getUTCMonth();
  const targetDay = startDate.getUTCDate();
  const timeOfDay =
    startDate.getUTCHours() * 3600 +
    startDate.getUTCMinutes() * 60 +
    startDate.getUTCSeconds();

  let year = startDate.getUTCFullYear();
  let count = 0;

  const SAFETY = 10_000;

  for (let i = 0; i < SAFETY; i++) {
    const daysInMonth = getDaysInMonth(year, targetMonth);
    const day = Math.min(targetDay, daysInMonth);

    const d = new Date(Date.UTC(year, targetMonth, day));
    const ts = Math.floor(d.getTime() / 1000) + timeOfDay;

    if (ts >= startTime) {
      if (maxCount !== undefined && count >= maxCount) break;
      if (until !== undefined && ts > until) break;
      if (ts >= rangeEnd) break;

      if (ts >= rangeStart) {
        results.push(ts);
      }
      count++;
    }

    year += interval;
  }

  return results;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDaysInMonth(year: number, month: number): number {
  // Date(year, month+1, 0) gives last day of month
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}
