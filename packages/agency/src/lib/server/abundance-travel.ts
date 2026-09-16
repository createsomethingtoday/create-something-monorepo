export type TravelLocation = { id: string; latitude: number; longitude: number };
export type TravelInput = {
  origins: TravelLocation[];
  clinics: TravelLocation[];
  maxMinutes: 30 | 45;
  match: 'any' | 'all';
};
export type TravelOptions = {
  apiKey: string;
  reserveCredits: (credits: number) => Promise<void>;
  fetchFn?: typeof fetch;
};
type VendorRoute = { id: string; distance_miles?: number | null; duration_seconds?: number | null };
type VendorRow = { origin: { id: string }; destinations: VendorRoute[] };
/** Coordinate-only adapter. The API owner reserves durable quota before each vendor call. */
export async function estimatePracticeTravel(input: TravelInput, options: TravelOptions) {
  if (
    !Array.isArray(input.origins) ||
    input.origins.length < 1 ||
    input.origins.length > 50 ||
    !Array.isArray(input.clinics) ||
    input.clinics.length < 1 ||
    input.clinics.length > 3
  )
    throw new TypeError('Use 1–50 practices and 1–3 clinics per routing batch.');
  if (![30, 45].includes(input.maxMinutes) || !['any', 'all'].includes(input.match))
    throw new TypeError('Choose 30 or 45 minutes and any or all clinics.');
  for (const group of [input.origins, input.clinics]) {
    const ids = new Set<string>();
    for (const p of group) {
      if (
        !p ||
        typeof p.id !== 'string' ||
        !p.id ||
        p.id.length > 100 ||
        ids.has(p.id) ||
        !Number.isFinite(p.latitude) ||
        Math.abs(p.latitude) > 90 ||
        !Number.isFinite(p.longitude) ||
        Math.abs(p.longitude) > 180
      )
        throw new TypeError('Routing locations require unique IDs and valid coordinates.');
      ids.add(p.id);
    }
  }
  if (!options.apiKey?.trim()) throw new Error('Driving-time service is not configured.');
  const credits = input.origins.length * input.clinics.length * 2;
  await options.reserveCredits(credits);
  const url = new URL('https://api.geocod.io/v2/distance-matrix');
  url.searchParams.set('api_key', options.apiKey.trim());
  let body: { mode?: string; results?: VendorRow[] };
  try {
    const response = await (options.fetchFn ?? fetch)(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
        origins: input.origins.map((p, i) => `${p.latitude},${p.longitude},o${i}`),
        destinations: input.clinics.map((p, i) => `${p.latitude},${p.longitude},c${i}`),
        mode: 'driving',
        units: 'miles'
      })
    });
    if (!response.ok) throw new Error();
    body = await response.json();
  } catch {
    // Vendor URLs contain the key: never propagate response bodies, URLs, or network errors.
    throw new Error('Driving-time service unavailable; no complete estimate was produced.');
  }
  if (body.mode !== 'driving' || !Array.isArray(body.results))
    throw new Error('Invalid driving-time response; no estimate was accepted.');
  const rows = new Map<string, Map<string, VendorRoute>>();
  for (const row of body.results) {
    const id = row?.origin?.id;
    if (
      !input.origins.some((_p, i) => id === `o${i}`) ||
      rows.has(id) ||
      !Array.isArray(row.destinations)
    )
      throw new Error('Invalid driving-time response; no estimate was accepted.');
    const routes = new Map<string, VendorRoute>();
    for (const route of row.destinations) {
      if (!route || !input.clinics.some((_p, i) => route.id === `c${i}`) || routes.has(route.id))
        throw new Error('Invalid driving-time response; no estimate was accepted.');
      for (const value of [route.duration_seconds, route.distance_miles])
        if (value != null && (!Number.isFinite(value) || value < 0))
          throw new Error('Invalid driving-time response; no estimate was accepted.');
      routes.set(route.id, route);
    }
    rows.set(id, routes);
  }
  const results = input.origins.map((origin, i) => {
    const routes = input.clinics.map((clinic, j) => {
      const route = rows.get(`o${i}`)?.get(`c${j}`),
        duration = route?.duration_seconds ?? null;
      const band =
        duration === null
          ? 'unresolved_route'
          : duration <= 1800
            ? 'within_30_minutes'
            : duration <= 2700
              ? '30_to_45_minutes'
              : 'over_45_minutes';
      return {
        clinic_id: clinic.id,
        duration_seconds: duration,
        distance_miles: route?.distance_miles ?? null,
        band
      };
    });
    const within = routes.filter(
      (r) => r.duration_seconds !== null && r.duration_seconds <= input.maxMinutes * 60
    ).length;
    const outside = routes.filter(
      (r) => r.duration_seconds !== null && r.duration_seconds > input.maxMinutes * 60
    ).length;
    const unknown = routes.some((r) => r.duration_seconds === null);
    const match =
      input.match === 'any'
        ? within > 0
          ? 'within_limit'
          : unknown
            ? 'unresolved'
            : 'outside_limit'
        : outside > 0
          ? 'outside_limit'
          : unknown
            ? 'unresolved'
            : 'within_limit';
    return { origin_id: origin.id, match, routes };
  });
  return {
    source: 'geocodio_distance',
    basis: 'registered_practice_to_clinic_typical_traffic',
    calculated_at: new Date().toISOString(),
    reserved_credits: credits,
    max_minutes: input.maxMinutes,
    clinic_match: input.match,
    limitation:
      'Estimated one-way travel from registered practice, not candidate home commute. Typical traffic; no departure-time or live-traffic assumption. Missing routes remain unresolved.',
    results
  };
}
