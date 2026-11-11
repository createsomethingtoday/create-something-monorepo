import type {
  BookingReportStore,
  BookingReportWindows,
  BookingSummary
} from '../application/booking-reports.js';

export const MAX_REPORT_RECEIPTS = 50000;

type SummaryRow = {
  current_committed: number;
  current_rescheduled: number;
  current_cancelled: number;
  prior_committed: number;
  prior_rescheduled: number;
  prior_cancelled: number;
  latest_at: string | null;
  invalid_receipts: number;
};

/**
 * No constructor schema initialization. Missing/corrupt/oversized ledgers fail unavailable.
 * Only fixed SELECT queries are reachable; unlike the command store this reader never
 * writes idempotency/receipts, creates scheduling tables or schedules an alarm.
 */
export class DurableBookingReportStore implements BookingReportStore {
  constructor(private readonly sql: SqlStorage) {}

  summarize(windows: BookingReportWindows): BookingSummary {
    try {
      const count = this.sql.exec<{ count: number }>(
        `SELECT COUNT(*) AS count FROM (SELECT 1 FROM receipts LIMIT ${MAX_REPORT_RECEIPTS + 1})`
      ).toArray()[0]?.count;
      if (count === undefined || count > MAX_REPORT_RECEIPTS)
        throw new Error('Receipt read exceeds report safety limit.');
      const row = this.sql.exec<SummaryRow>(`
        WITH parsed AS (
          SELECT status, julianday(occurred_at) AS at,
            json_valid(receipt_json) AS valid_json,
            CASE WHEN json_valid(receipt_json) THEN json_extract(receipt_json, '$.bookingId') END AS booking_id,
            CASE WHEN json_valid(receipt_json) THEN json_extract(receipt_json, '$.status') END AS receipt_status
          FROM receipts WHERE status IN ('committed', 'rescheduled', 'cancelled')
        ), initial_commits AS (
          SELECT booking_id, MIN(at) AS at FROM parsed
          WHERE status = 'committed' GROUP BY booking_id
        ), events AS (
          SELECT 'committed' AS status, at FROM initial_commits
          UNION ALL SELECT status, at FROM parsed WHERE status IN ('rescheduled','cancelled')
        ), periods AS (
          SELECT *, CASE WHEN at >= julianday(?) THEN 'current' ELSE 'prior' END AS period
          FROM events WHERE at >= julianday(?) AND at < julianday(?)
        )
        SELECT
          COUNT(CASE WHEN period = 'current' AND status = 'committed' THEN 1 END) AS current_committed,
          COUNT(CASE WHEN period = 'current' AND status = 'rescheduled' THEN 1 END) AS current_rescheduled,
          COUNT(CASE WHEN period = 'current' AND status = 'cancelled' THEN 1 END) AS current_cancelled,
          COUNT(CASE WHEN period = 'prior' AND status = 'committed' THEN 1 END) AS prior_committed,
          COUNT(CASE WHEN period = 'prior' AND status = 'rescheduled' THEN 1 END) AS prior_rescheduled,
          COUNT(CASE WHEN period = 'prior' AND status = 'cancelled' THEN 1 END) AS prior_cancelled,
          strftime('%Y-%m-%dT%H:%M:%fZ', MAX(at)) AS latest_at,
          (SELECT COUNT(*) FROM parsed WHERE valid_json = 0 OR at IS NULL
            OR typeof(booking_id) <> 'text' OR length(trim(booking_id)) = 0
            OR receipt_status IS NULL OR receipt_status <> status) AS invalid_receipts
        FROM periods`,
        windows.current.start, windows.prior.start, windows.current.end
      ).toArray()[0];
      if (!row || row.invalid_receipts > 0) throw new Error('Receipt ledger cannot be reported.');
      return {
        source: 'scheduler-receipts',
        current: {
          committed: row.current_committed,
          rescheduled: row.current_rescheduled,
          cancelled: row.current_cancelled
        },
        prior: {
          committed: row.prior_committed,
          rescheduled: row.prior_rescheduled,
          cancelled: row.prior_cancelled
        },
        latestAt: row.latest_at
      };
    } catch {
      // SQL errors can contain schema details; the caller only needs an unavailable source.
      throw new Error('Scheduler receipt report unavailable.');
    }
  }
}
