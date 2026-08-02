import { offerObservationSchema } from './schemas.js';
import type { OfferObservation, OfferRequest } from './types.js';

function canonicalDateTime(value: unknown): string | undefined {
  if (typeof value !== 'string' || /^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function canonicalDateOnly(value: unknown): string | undefined {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function normalizeOptionalTemporal(
  record: Record<string, unknown>,
  timestampKey: string,
  dateKey: string
): void {
  const value = record[timestampKey];
  if (value === undefined) return;
  const dateTime = canonicalDateTime(value);
  if (dateTime) {
    record[timestampKey] = dateTime;
    return;
  }
  const dateOnly = canonicalDateOnly(value);
  if (dateOnly) {
    if (record[dateKey] === undefined) record[dateKey] = dateOnly;
    delete record[timestampKey];
    return;
  }
  delete record[timestampKey];
}

export function normalizeDiscoveredOfferObservations(
  normalizedRequest: OfferRequest,
  observations: unknown[]
): OfferObservation[] {
  return observations.flatMap((input) => {
    if (!input || typeof input !== 'object') return [];
    const observation = JSON.parse(JSON.stringify(input)) as {
      source?: Record<string, unknown>;
      offer?: Record<string, unknown>;
    };
    if (observation.source) {
      observation.source.observedAt = normalizedRequest.asOf;
      normalizeOptionalTemporal(observation.source, 'publishedAt', 'publishedOn');
    }
    if (observation.offer) {
      normalizeOptionalTemporal(observation.offer, 'startsAt', 'startsOn');
      normalizeOptionalTemporal(observation.offer, 'endsAt', 'endsOn');
    }
    if (
      observation.offer &&
      observation.offer.discount === undefined &&
      typeof observation.offer.code === 'string' &&
      observation.offer.code.trim().length > 0
    ) {
      observation.offer.discount = { kind: 'unknown' };
    }
    const parsed = offerObservationSchema.safeParse(observation);
    return parsed.success ? [parsed.data] : [];
  });
}
