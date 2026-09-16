import type { HealthcareProvider } from '../abundance/healthcare-providers';
import { sourcingCsvCell, sourcingCsvHeader, sourcingCsvRow } from '../abundance/sourcing-export';
type StoredReport = {
  id: string;
  run_id: string;
  basis: string;
  source: string;
  calculated_at: string;
  clinic_match: string;
  max_minutes: number;
  results: Array<{
    npi: string;
    match: string;
    routes: Array<{
      clinic_id: string;
      duration_seconds: number | null;
      distance_miles: number | null;
    }>;
  }>;
};
export async function exportTravelCsv(db: D1Database, id: string): Promise<Response> {
  if (!/^abtravel_[a-f0-9-]{36}$/.test(id)) throw new TypeError('Invalid travel report ID.');
  const stored = await db
    .prepare('SELECT source_run_id,report_json FROM abundance_travel_reports WHERE id=?')
    .bind(id)
    .first<{ source_run_id: string; report_json: string }>();
  if (!stored) throw new TypeError('Travel report is unavailable.');
  const report = JSON.parse(stored.report_json) as StoredReport;
  const rows = await db
    .prepare(
      `SELECT provider_npi,provider_snapshot_json FROM abundance_healthcare_nationwide_memberships WHERE run_id=? AND provider_npi IN (SELECT value FROM json_each(?)) ORDER BY provider_npi`
    )
    .bind(stored.source_run_id, JSON.stringify(report.results.map((r) => r.npi)))
    .all<{ provider_npi: string; provider_snapshot_json: string }>();
  if (rows.results.length !== report.results.length)
    throw new Error('Source snapshot no longer contains every report record.');
  const extra = [
    'Travel Match',
    'Travel Basis',
    'Travel Source',
    'Travel Calculated',
    'Clinic Requirement',
    'Minute Limit',
    'Clinic Driving Estimates',
    'Travel Scope'
  ];
  let csv =
    '\ufeff' + sourcingCsvHeader().trimEnd() + ',' + extra.map(sourcingCsvCell).join(',') + '\r\n';
  for (const row of rows.results) {
    const provider = JSON.parse(row.provider_snapshot_json) as HealthcareProvider;
    const result = report.results.find((r) => r.npi === row.provider_npi)!;
    const routes = result.routes
      .map(
        (r) =>
          `${r.clinic_id}: ${r.duration_seconds === null ? 'Unresolved' : (r.duration_seconds / 60).toFixed(1) + ' minutes'}${r.distance_miles === null ? '' : ', ' + r.distance_miles + ' miles'}`
      )
      .join('; ');
    csv +=
      sourcingCsvRow(provider).trimEnd() +
      ',' +
      [
        result.match,
        report.basis,
        report.source,
        report.calculated_at,
        report.clinic_match,
        report.max_minutes,
        routes || 'Unresolved practice geocode',
        'Selected NPIs only; not complete population'
      ]
        .map(sourcingCsvCell)
        .join(',') +
      '\r\n';
  }
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="npg-practice-travel.csv"',
      'Cache-Control': 'private, no-store',
      'X-NPG-Snapshot': stored.source_run_id,
      'X-NPG-Travel-Report': id
    }
  });
}
