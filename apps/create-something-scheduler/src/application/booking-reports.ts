/** Private receipt-based query contract. No scheduler identity, credentials or provider data. */
export interface BookingReportWindow {
  start: string;
  end: string;
}

export interface BookingReportWindows {
  current: BookingReportWindow;
  prior: BookingReportWindow;
}

export interface BookingReportCounts {
  committed: number;
  rescheduled: number;
  cancelled: number;
}

export interface BookingSummary {
  source: 'scheduler-receipts';
  current: BookingReportCounts;
  prior: BookingReportCounts;
  latestAt: string | null;
}

export interface BookingReportStore {
  summarize(windows: BookingReportWindows): BookingSummary;
}

/** Read service is separate from BookingService's provider-bearing command dependencies. */
export class BookingReports {
  constructor(private readonly store: BookingReportStore) {}

  getBookingSummary(input: unknown): BookingSummary {
    return this.store.summarize(parseBookingReportWindows(input));
  }
}

function exactObject(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid booking report windows.');
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== keys.length || keys.some(key => !(key in record)))
    throw new Error('Invalid booking report windows.');
  return record;
}

function midnight(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T00:00:00(?:\.000)?Z$/.test(value))
    throw new Error('Booking report boundaries must be complete UTC days.');
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value.slice(0, 10))
    throw new Error('Invalid booking report date.');
  return date.toISOString();
}

export function parseBookingReportWindows(input: unknown): BookingReportWindows {
  const root = exactObject(input, ['current', 'prior']);
  const current = exactObject(root.current, ['start', 'end']);
  const prior = exactObject(root.prior, ['start', 'end']);
  const parsed = {
    current: { start: midnight(current.start), end: midnight(current.end) },
    prior: { start: midnight(prior.start), end: midnight(prior.end) }
  };
  const currentDays = (Date.parse(parsed.current.end) - Date.parse(parsed.current.start)) / 86400000;
  const priorDays = (Date.parse(parsed.prior.end) - Date.parse(parsed.prior.start)) / 86400000;
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  if (![7, 30, 90].includes(currentDays) || currentDays !== priorDays ||
      parsed.prior.end !== parsed.current.start || Date.parse(parsed.current.end) > todayUtc)
    throw new Error('Booking reports require adjacent equal 7, 30 or 90 complete UTC-day windows.');
  return parsed;
}
