import type { HealthcareProvider } from '../abundance/healthcare-providers';
import {
  sourcingCsvHeader,
  sourcingCsvRow,
  registryPhoneStatus
} from '../abundance/sourcing-export';

const EARTH_MILES = 3958.7613;
type Vector = { x: number; y: number; z: number };
export function unitVector(latitude: number, longitude: number): Vector {
  const lat = (latitude * Math.PI) / 180,
    lon = (longitude * Math.PI) / 180;
  return { x: Math.cos(lat) * Math.cos(lon), y: Math.cos(lat) * Math.sin(lon), z: Math.sin(lat) };
}
export function distanceMiles(a: Vector, b: Vector): number {
  return EARTH_MILES * Math.acos(Math.min(1, Math.max(-1, a.x * b.x + a.y * b.y + a.z * b.z)));
}
export type SourcingQuery = {
  state?: string;
  city?: string;
  name?: string;
  taxonomy: string;
  runId?: string;
  centerAddress?: string;
  radiusMiles?: number;
  locationMode: 'within_radius' | 'unresolved';
  limit: number;
  offset: number;
};
export function parseSourcingQuery(params: URLSearchParams): SourcingQuery {
  const allowed = new Set([
    'state',
    'city',
    'name',
    'taxonomy_code',
    'run_id',
    'center_address',
    'radius_miles',
    'location_mode',
    'limit',
    'offset',
    'format'
  ]);
  for (const key of params.keys())
    if (!allowed.has(key)) throw new TypeError(`Unsupported sourcing filter: ${key}`);
  const clean = (key: string) => params.get(key)?.trim() || undefined;
  const number = (key: string, fallback: number, min: number, max: number) => {
    const n = params.has(key) ? Number(params.get(key)) : fallback;
    if (!Number.isFinite(n) || n < min || n > max) throw new TypeError(`Invalid ${key}.`);
    return n;
  };
  const centerAddress = clean('center_address');
  const radiusMiles = params.has('radius_miles') ? number('radius_miles', 0, 0.1, 250) : undefined;
  if ((centerAddress === undefined) !== (radiusMiles === undefined))
    throw new TypeError('A center street address and radius_miles are both required.');
  if (
    centerAddress &&
    (!/\d/.test(centerAddress) || centerAddress.length < 8 || centerAddress.length > 300)
  )
    throw new TypeError('Use a full center street address, not a city or ZIP centroid.');
  const state = clean('state')?.toUpperCase(),
    city = clean('city');
  if (state && !/^[A-Z]{2}$/.test(state)) throw new TypeError('state must be a two-letter code.');
  if (city && !state) throw new TypeError('city requires state.');
  if (radiusMiles && (city || state))
    throw new TypeError(
      'Radius searches cross city/state borders; omit state and city. Use a separate city search for location associations.'
    );
  const taxonomy = clean('taxonomy_code') ?? '363LF0000X';
  if (taxonomy !== '363LF0000X')
    throw new TypeError(
      'This snapshot contains primary Family NP records only. AGNP and other specialties require a broader completed import; no complete specialty result is available yet.'
    );
  if (!/^363L[A-Z0-9]{5}X$/.test(taxonomy))
    throw new TypeError('Use a Nurse Practitioner taxonomy code.');
  const locationMode = clean('location_mode') ?? 'within_radius';
  if (locationMode !== 'within_radius' && locationMode !== 'unresolved')
    throw new TypeError('Invalid location_mode.');
  if (locationMode === 'unresolved' && !radiusMiles)
    throw new TypeError('unresolved requires a radius search.');
  const limit = number('limit', 25, 1, 100),
    offset = number('offset', 0, 0, 1000000);
  if (!Number.isInteger(limit) || !Number.isInteger(offset))
    throw new TypeError('Pagination must use integers.');
  const runId = clean('run_id');
  if (runId && !/^abnationalrun_[a-zA-Z0-9_-]+$/.test(runId))
    throw new TypeError('Invalid run_id.');
  return {
    state,
    city,
    name: clean('name'),
    taxonomy,
    runId,
    centerAddress,
    radiusMiles,
    locationMode,
    limit,
    offset
  };
}
class AddressNotMatchedError extends TypeError {}
export async function geocodeStreetAddress(address: string, fetchFn: typeof fetch = fetch) {
  const url = new URL('https://geocoding.geo.census.gov/geocoder/locations/onelineaddress');
  url.search = new URLSearchParams({
    address,
    benchmark: 'Public_AR_Current',
    format: 'json'
  }).toString();
  const response = await fetchFn(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('Address geocoding service unavailable.');
  const body = (await response.json()) as {
    result?: {
      addressMatches?: Array<{ matchedAddress?: string; coordinates?: { x?: number; y?: number } }>;
    };
  };
  const matches = body.result?.addressMatches ?? [];
  const match = matches[0];
  if (
    matches.length !== 1 ||
    !match?.matchedAddress ||
    !Number.isFinite(match.coordinates?.x) ||
    !Number.isFinite(match.coordinates?.y)
  )
    throw new AddressNotMatchedError(
      'Address not uniquely geocoded; provide a complete street address.'
    );
  const longitude = match.coordinates!.x!,
    latitude = match.coordinates!.y!;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180)
    throw new Error('Invalid geocoder coordinates.');
  return {
    latitude,
    longitude,
    matched_address: match.matchedAddress,
    precision: 'address_range_interpolated',
    source: 'us_census_public_ar_current',
    ...unitVector(latitude, longitude)
  };
}
const join = `LEFT JOIN abundance_healthcare_geocodes g ON g.provider_npi=m.provider_npi
 AND g.source_payload_hash=json_extract(m.provider_snapshot_json,'$.source_payload_hash')`;
async function prepareQuery(db: D1Database, q: SourcingQuery, fetchFn: typeof fetch) {
  const run = await db
    .prepare(
      `SELECT id, source_published_at, finished_at FROM abundance_healthcare_nationwide_runs
 WHERE status='succeeded' ${q.runId ? 'AND id=?' : ''} ORDER BY finished_at DESC LIMIT 1`
    )
    .bind(...(q.runId ? [q.runId] : []))
    .first<{ id: string; source_published_at: string; finished_at: string }>();
  if (!run) throw new Error('Requested completed snapshot is unavailable.');
  const filters = ['m.run_id=?', 'm.primary_taxonomy_code=?'],
    args: unknown[] = [run.id, q.taxonomy];
  if (q.state) {
    filters.push('m.practice_state=?');
    args.push(q.state);
  }
  if (q.city) {
    filters.push('m.practice_city=lower(?)');
    args.push(q.city);
  }
  if (q.name) {
    filters.push('m.name_search LIKE ?');
    args.push('%' + q.name.toLowerCase() + '%');
  }
  const center = q.centerAddress ? await geocodeStreetAddress(q.centerAddress, fetchFn) : undefined;
  const baseWhere = filters.join(' AND '),
    baseArgs = [...args];
  if (center) {
    if (q.locationMode === 'unresolved') filters.push("(g.status IS NULL OR g.status!='matched')");
    else {
      filters.push("g.status='matched' AND (g.unit_x*? + g.unit_y*? + g.unit_z*?) >= ?");
      args.push(center.x, center.y, center.z, Math.cos(q.radiusMiles! / EARTH_MILES));
    }
  }
  return { run, center, where: filters.join(' AND '), args, baseWhere, baseArgs };
}
type Row = {
  provider_snapshot_json: string;
  unit_x: number | null;
  unit_y: number | null;
  unit_z: number | null;
};
function project(row: Row, center: Awaited<ReturnType<typeof geocodeStreetAddress>> | undefined) {
  const p = JSON.parse(row.provider_snapshot_json) as HealthcareProvider;
  const matched = row.unit_x !== null && row.unit_y !== null && row.unit_z !== null;
  const distance =
    center && matched
      ? Math.round(
          distanceMiles(center, { x: row.unit_x!, y: row.unit_y!, z: row.unit_z! }) * 100
        ) / 100
      : undefined;
  return {
    provider: p,
    distance_miles: distance,
    location_match: center
      ? matched
        ? 'within_radius'
        : 'unresolved_address'
      : 'city_or_state_association_only'
  };
}
export async function querySourcing(
  db: D1Database,
  q: SourcingQuery,
  fetchFn: typeof fetch = fetch
) {
  const plan = await prepareQuery(db, q, fetchFn);
  const [count, unresolved, rows] = await Promise.all([
    db
      .prepare(
        `SELECT count(*) AS total FROM abundance_healthcare_nationwide_memberships m ${join} WHERE ${plan.where}`
      )
      .bind(...plan.args)
      .first<{ total: number }>(),
    db
      .prepare(
        `SELECT count(*) AS total FROM abundance_healthcare_nationwide_memberships m ${join} WHERE ${plan.baseWhere} AND (g.status IS NULL OR g.status!='matched')`
      )
      .bind(...plan.baseArgs)
      .first<{ total: number }>(),
    db
      .prepare(
        `SELECT m.provider_snapshot_json,g.unit_x,g.unit_y,g.unit_z FROM abundance_healthcare_nationwide_memberships m ${join} WHERE ${plan.where} ORDER BY m.provider_npi LIMIT ? OFFSET ?`
      )
      .bind(...plan.args, q.limit, q.offset)
      .all<Row>()
  ]);
  const total = count?.total ?? 0;
  return {
    run_id: plan.run.id,
    source_published_at: plan.run.source_published_at,
    total,
    limit: q.limit,
    offset: q.offset,
    next_offset: q.offset + q.limit < total ? q.offset + q.limit : undefined,
    center: plan.center,
    unresolved_address_count: unresolved?.total ?? 0,
    completeness: 'all_matching_records_in_selected_snapshot',
    limitation:
      'Snapshot scope is primary Family NP until broader NP import is completed. Taxonomy is not board certification. Address-range distance is straight-line practice-to-center distance, not home location or commute time. Unresolved records cannot be classified inside or outside the radius.',
    results: (rows.results ?? []).map((row) => {
      const p = project(row, plan.center);
      return {
        ...p.provider,
        location_match: p.location_match,
        distance_miles: p.distance_miles,
        practice_phone_status: registryPhoneStatus(p.provider.practice_phone),
        contact_route_status: 'public_registry_unverified',
        clinical_verification_status: 'recruiter_verification_required',
        direct_outreach_status: 'operator_review_required'
      };
    })
  };
}
export async function exportSourcingCsv(
  db: D1Database,
  q: SourcingQuery,
  fetchFn: typeof fetch = fetch
): Promise<Response> {
  const plan = await prepareQuery(db, q, fetchFn);
  let cursor = '',
    started = false;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        if (!started) {
          controller.enqueue(encoder.encode('\ufeff' + sourcingCsvHeader()));
          started = true;
        }
        const rows = await db
          .prepare(
            `SELECT m.provider_npi,m.provider_snapshot_json,g.unit_x,g.unit_y,g.unit_z FROM abundance_healthcare_nationwide_memberships m ${join} WHERE ${plan.where} AND m.provider_npi>? ORDER BY m.provider_npi LIMIT 1000`
          )
          .bind(...plan.args, cursor)
          .all<Row & { provider_npi: string }>();
        const batch = rows.results ?? [];
        if (batch.length) {
          controller.enqueue(
            encoder.encode(
              batch
                .map((row) => {
                  const p = project(row, plan.center);
                  return sourcingCsvRow(p.provider, p.location_match, p.distance_miles);
                })
                .join('')
            )
          );
          cursor = batch[batch.length - 1].provider_npi;
        }
        if (batch.length < 1000) controller.close();
      } catch (cause) {
        controller.error(cause);
      }
    }
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="npg-registry-sourcing.csv"',
      'Cache-Control': 'private, no-store',
      'X-NPG-Snapshot': plan.run.id
    }
  });
}
// Service-only bounded warmup. Never turn an unmatched address into a city centroid.
export async function geocodeSourcingBatch(
  db: D1Database,
  state: string,
  fetchFn: typeof fetch = fetch
) {
  if (!/^[A-Z]{2}$/.test(state)) throw new TypeError('state must be a two-letter code.');
  const rows = await db
    .prepare(
      `SELECT m.provider_snapshot_json FROM abundance_healthcare_nationwide_memberships m ${join}
 WHERE m.run_id=(SELECT id FROM abundance_healthcare_nationwide_runs WHERE status='succeeded' ORDER BY finished_at DESC LIMIT 1)
 AND m.practice_state=? AND g.provider_npi IS NULL ORDER BY m.provider_npi LIMIT 10`
    )
    .bind(state)
    .all<{ provider_snapshot_json: string }>();
  let matched = 0,
    unmatched = 0;
  for (const row of rows.results ?? []) {
    const p = JSON.parse(row.provider_snapshot_json) as HealthcareProvider;
    let geo: Awaited<ReturnType<typeof geocodeStreetAddress>> | undefined;
    if (p.practice_address_1 && p.practice_city && p.practice_state) {
      try {
        geo = await geocodeStreetAddress(
          [p.practice_address_1, p.practice_city, p.practice_state, p.practice_postal_code]
            .filter(Boolean)
            .join(', '),
          fetchFn
        );
      } catch (cause) {
        if (!(cause instanceof AddressNotMatchedError)) throw cause;
      }
    }
    await db
      .prepare(
        `INSERT INTO abundance_healthcare_geocodes(provider_npi,source_payload_hash,status,latitude,longitude,unit_x,unit_y,unit_z,matched_address,fetched_at)
   VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(provider_npi) DO UPDATE SET source_payload_hash=excluded.source_payload_hash,status=excluded.status,latitude=excluded.latitude,longitude=excluded.longitude,unit_x=excluded.unit_x,unit_y=excluded.unit_y,unit_z=excluded.unit_z,matched_address=excluded.matched_address,fetched_at=excluded.fetched_at`
      )
      .bind(
        p.npi,
        p.source_payload_hash,
        geo ? 'matched' : 'unmatched',
        geo?.latitude ?? null,
        geo?.longitude ?? null,
        geo?.x ?? null,
        geo?.y ?? null,
        geo?.z ?? null,
        geo?.matched_address ?? null,
        new Date().toISOString()
      )
      .run();
    if (geo) matched++;
    else unmatched++;
  }
  return { processed: matched + unmatched, matched, unmatched };
}
