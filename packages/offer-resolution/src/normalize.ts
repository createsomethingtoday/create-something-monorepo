import { offerObservationSchema } from './schemas.js';
import type { OfferObservation, OfferRequest } from './types.js';

function canonicalDateTime(value: unknown): string | undefined {
  if (typeof value !== 'string' || /^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
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
      if (observation.source.publishedAt !== undefined) {
        const publishedAt = canonicalDateTime(observation.source.publishedAt);
        if (publishedAt) observation.source.publishedAt = publishedAt;
        else delete observation.source.publishedAt;
      }
    }
    for (const key of ['startsAt', 'endsAt'] as const) {
      if (observation.offer?.[key] !== undefined) {
        const dateTime = canonicalDateTime(observation.offer[key]);
        if (dateTime) observation.offer[key] = dateTime;
        else delete observation.offer[key];
      }
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
