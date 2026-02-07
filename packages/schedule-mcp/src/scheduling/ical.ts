/**
 * Schedule MCP — iCalendar Export
 * Generate RFC 5545 VCALENDAR output for calendar events.
 *
 * Produces valid .ics files importable by Google Calendar, Apple Calendar, etc.
 *
 * All timestamps are unix seconds.
 * Zero external dependencies.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Calendar metadata for the VCALENDAR wrapper. */
interface CalendarInfo {
  name: string;
  timezone?: string;
}

/** Event data for VEVENT generation. */
interface EventInfo {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  start_time: number;
  end_time: number;
  all_day: number;
  recurrence_rule?: string | null;
  status?: string;
}

// ---------------------------------------------------------------------------
// Date Formatting
// ---------------------------------------------------------------------------

/**
 * Convert unix timestamp (seconds) to iCal datetime format.
 * Output: YYYYMMDDTHHMMSSZ
 *
 * @param unixSeconds - Unix timestamp in seconds
 * @returns Formatted iCal datetime string
 */
export function formatICalDate(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    `${d.getUTCFullYear()}` +
    `${pad(d.getUTCMonth() + 1)}` +
    `${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}` +
    `${pad(d.getUTCMinutes())}` +
    `${pad(d.getUTCSeconds())}Z`
  );
}

/**
 * Convert unix timestamp (seconds) to iCal VALUE=DATE format.
 * Output: YYYYMMDD
 *
 * @param unixSeconds - Unix timestamp in seconds
 * @returns Formatted iCal date string
 */
export function formatICalDateAllDay(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    `${d.getUTCFullYear()}` +
    `${pad(d.getUTCMonth() + 1)}` +
    `${pad(d.getUTCDate())}`
  );
}

// ---------------------------------------------------------------------------
// Text Escaping
// ---------------------------------------------------------------------------

/**
 * Escape text for iCal property values per RFC 5545 §3.3.11.
 * Escapes backslashes, semicolons, commas, and newlines.
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Fold long lines per RFC 5545 §3.1.
 * Lines longer than 75 octets are folded with CRLF + space.
 */
function foldLine(line: string): string {
  const MAX_LINE = 75;
  if (line.length <= MAX_LINE) return line;

  const parts: string[] = [];
  parts.push(line.slice(0, MAX_LINE));
  let pos = MAX_LINE;

  while (pos < line.length) {
    // Continuation lines start with a space, so effective content is 74 chars
    const chunk = line.slice(pos, pos + MAX_LINE - 1);
    parts.push(' ' + chunk);
    pos += MAX_LINE - 1;
  }

  return parts.join('\r\n');
}

// ---------------------------------------------------------------------------
// Status Mapping
// ---------------------------------------------------------------------------

/**
 * Map internal status to iCal STATUS values.
 * RFC 5545 §3.8.1.11: TENTATIVE, CONFIRMED, CANCELLED
 */
function mapStatus(status: string | undefined): string {
  switch (status?.toLowerCase()) {
    case 'confirmed':
      return 'CONFIRMED';
    case 'tentative':
      return 'TENTATIVE';
    case 'cancelled':
      return 'CANCELLED';
    default:
      return 'CONFIRMED';
  }
}

// ---------------------------------------------------------------------------
// VEVENT Generation
// ---------------------------------------------------------------------------

function generateVEvent(event: EventInfo): string {
  const lines: string[] = [];

  lines.push('BEGIN:VEVENT');
  lines.push(`UID:${event.id}`);
  lines.push(`DTSTAMP:${formatICalDate(Math.floor(Date.now() / 1000))}`);

  if (event.all_day) {
    lines.push(`DTSTART;VALUE=DATE:${formatICalDateAllDay(event.start_time)}`);
    lines.push(`DTEND;VALUE=DATE:${formatICalDateAllDay(event.end_time)}`);
  } else {
    lines.push(`DTSTART:${formatICalDate(event.start_time)}`);
    lines.push(`DTEND:${formatICalDate(event.end_time)}`);
  }

  lines.push(`SUMMARY:${escapeICalText(event.title)}`);

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeICalText(event.location)}`);
  }

  lines.push(`STATUS:${mapStatus(event.status)}`);

  if (event.recurrence_rule) {
    // Strip "RRULE:" prefix if already present
    const rrule = event.recurrence_rule.replace(/^RRULE:/i, '');
    lines.push(`RRULE:${rrule}`);
  }

  lines.push('END:VEVENT');

  return lines.map(foldLine).join('\r\n');
}

// ---------------------------------------------------------------------------
// VCALENDAR Export
// ---------------------------------------------------------------------------

/**
 * Generate a complete iCalendar (RFC 5545) document.
 *
 * Produces a VCALENDAR with VEVENT components for each event.
 * Output uses CRLF line endings as required by the spec.
 *
 * @param calendar - Calendar metadata (name, timezone)
 * @param events   - Array of events to include
 * @returns Complete VCALENDAR string
 */
export function exportToICal(calendar: CalendarInfo, events: EventInfo[]): string {
  const lines: string[] = [];

  // VCALENDAR header
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push(`PRODID:-//CREATE SOMETHING//Schedule MCP//EN`);
  lines.push('CALSCALE:GREGORIAN');
  lines.push('METHOD:PUBLISH');
  lines.push(`X-WR-CALNAME:${escapeICalText(calendar.name)}`);

  if (calendar.timezone) {
    lines.push(`X-WR-TIMEZONE:${escapeICalText(calendar.timezone)}`);
  }

  // VEVENT components
  for (const event of events) {
    lines.push(generateVEvent(event));
  }

  // VCALENDAR footer
  lines.push('END:VCALENDAR');

  return lines.join('\r\n') + '\r\n';
}
