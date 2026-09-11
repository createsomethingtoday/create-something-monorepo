import { z } from 'zod';
import { geocodeStreetAddress } from './abundance-sourcing';
import { estimatePracticeTravel, type TravelLocation } from './abundance-travel';
import { reserveTravelCredits } from './abundance-travel-quota';
const schema = z
  .object({
    npis: z
      .array(z.string().regex(/^\d{10}$/))
      .min(1)
      .max(50)
      .refine((a) => new Set(a).size === a.length),
    clinics: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-zA-Z0-9_-]{1,60}$/),
            address: z.string().trim().min(8).max(300)
          })
          .strict()
      )
      .min(1)
      .max(3)
      .refine((a) => new Set(a.map((c) => c.id)).size === a.length),
    max_minutes: z.union([z.literal(30), z.literal(45)]),
    clinic_match: z.enum(['any', 'all']),
    run_id: z
      .string()
      .regex(/^abnationalrun_[a-zA-Z0-9_-]+$/)
      .optional()
  })
  .strict();
export async function calculateSourcingTravel(
  db: D1Database,
  raw: unknown,
  apiKey: string,
  fetchFn: typeof fetch = fetch
) {
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    throw new TypeError(
      'Use 1–50 unique NPIs, 1–3 clinic street addresses with unique IDs, max_minutes 30 or 45, and clinic_match any or all.'
    );
  const input = parsed.data;
  const run = await db
    .prepare(
      `SELECT id FROM abundance_healthcare_nationwide_runs WHERE status='succeeded' ${input.run_id ? 'AND id=?' : ''} ORDER BY finished_at DESC LIMIT 1`
    )
    .bind(...(input.run_id ? [input.run_id] : []))
    .first<{ id: string }>();
  if (!run) throw new TypeError('Requested completed source snapshot is unavailable.');
  const rows = await db
    .prepare(
      `SELECT m.provider_npi,json_extract(m.provider_snapshot_json,'$.source_payload_hash') AS source_hash,g.latitude,g.longitude,g.status
 FROM abundance_healthcare_nationwide_memberships m LEFT JOIN abundance_healthcare_geocodes g ON g.provider_npi=m.provider_npi AND g.source_payload_hash=json_extract(m.provider_snapshot_json,'$.source_payload_hash')
 WHERE m.run_id=? AND m.provider_npi IN (SELECT value FROM json_each(?)) ORDER BY m.provider_npi`
    )
    .bind(run.id, JSON.stringify(input.npis))
    .all<{
      provider_npi: string;
      source_hash: string;
      latitude: number | null;
      longitude: number | null;
      status: string | null;
    }>();
  if (rows.results.length !== input.npis.length)
    throw new TypeError('One or more selected NPIs are absent from this snapshot.');
  const clinics = [];
  for (const clinic of input.clinics)
    clinics.push({ ...clinic, ...(await geocodeStreetAddress(clinic.address, fetchFn)) });
  const origins: TravelLocation[] = rows.results
    .filter((r) => r.status === 'matched' && r.latitude !== null && r.longitude !== null)
    .map((r) => ({ id: r.provider_npi, latitude: r.latitude!, longitude: r.longitude! }));
  const material = JSON.stringify({ run: run.id, input, origins, clinics });
  const cacheKey = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(material))),
    (v) => v.toString(16).padStart(2, '0')
  ).join('');
  const cached = await db
    .prepare(
      'SELECT report_json FROM abundance_travel_reports WHERE cache_key=? AND created_at_ms>=? ORDER BY created_at_ms DESC LIMIT 1'
    )
    .bind(cacheKey, Date.now() - 30 * 86400000)
    .first<{ report_json: string }>();
  if (cached) return { ...JSON.parse(cached.report_json), cache_hit: true };
  const estimate = origins.length
    ? await estimatePracticeTravel(
        { origins, clinics, maxMinutes: input.max_minutes, match: input.clinic_match },
        { apiKey, fetchFn, reserveCredits: (credits) => reserveTravelCredits(db, credits) }
      )
    : null;
  const id = 'abtravel_' + crypto.randomUUID();
  const report = {
    id,
    run_id: run.id,
    scope: 'selected_npis_only',
    requested_count: input.npis.length,
    basis: 'registered_practice_to_clinic_typical_traffic',
    source: 'geocodio_distance',
    calculated_at: new Date().toISOString(),
    max_minutes: input.max_minutes,
    clinic_match: input.clinic_match,
    clinics: clinics.map((c) => ({
      id: c.id,
      address: c.matched_address,
      source: c.source,
      precision: c.precision,
      confirmation: 'operator_supplied_not_role_verified'
    })),
    reserved_credits: estimate?.reserved_credits ?? 0,
    unresolved_geocode_count: input.npis.length - origins.length,
    limitation:
      'Selected practices only; not a complete sourcing population or candidate home commute. Clinics are operator-supplied, not independently linked to a requisition. Missing geocodes and routes remain unresolved.',
    results: rows.results.map((row) => ({
      npi: row.provider_npi,
      source_hash: row.source_hash,
      ...(estimate?.results.find((r) => r.origin_id === row.provider_npi) ?? {
        match: 'unresolved',
        routes: [],
        reason: 'unresolved_practice_geocode'
      })
    }))
  };
  await db
    .prepare(
      'INSERT INTO abundance_travel_reports(id,source_run_id,cache_key,created_at_ms,report_json) VALUES(?,?,?,?,?)'
    )
    .bind(id, run.id, cacheKey, Date.now(), JSON.stringify(report))
    .run();
  return { ...report, cache_hit: false };
}
