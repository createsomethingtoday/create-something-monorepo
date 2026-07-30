import { z } from 'zod';

const evidenceStateSchema = z.enum(['confirmed', 'conflict', 'unknown']);

export const offerRequestSchema = z
  .object({
    merchant: z.string().min(1),
    searchCategory: z.enum(['health_and_beauty']).optional(),
    candidateMerchants: z.array(z.string().min(1)).min(1).optional(),
    need: z.string().min(1),
    budget: z.number().positive('budget must be greater than zero'),
    currency: z.string().min(3).max(3),
    postalCode: z.string().regex(/^\d{5}$/),
    deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    asOf: z.string().datetime(),
    channels: z.array(z.enum(['online', 'pickup', 'in_store'])).min(1)
  })
  .strict();

export const offerObservationSchema = z
  .object({
    id: z.string().min(1),
    merchant: z.string().min(1),
    title: z.string().min(1),
    source: z
      .object({
        kind: z.enum([
          'official_retailer',
          'retailer_checkout',
          'ltk_public',
          'creator_owned',
          'affiliate_feed',
          'user_authorized',
          'search_index',
          'deal_aggregator'
        ]),
        url: z.string().url(),
        publisher: z.string().min(1),
        publishedAt: z.string().datetime().optional(),
        observedAt: z.string().datetime(),
        access: z.enum(['public', 'authenticated', 'app_only', 'blocked']),
        direct: z.boolean()
      })
      .strict(),
    offer: z
      .object({
        code: z.string().min(1).optional(),
        discount: z
          .object({
            kind: z.enum(['percent', 'amount', 'shipping', 'unknown']),
            value: z.number().nonnegative().optional()
          })
          .strict(),
        status: z.enum(['active', 'expired', 'revoked', 'unknown']),
        startsAt: z.string().datetime().optional(),
        endsAt: z.string().datetime().optional(),
        minimumSubtotal: z.number().nonnegative().optional(),
        checkoutOnly: z.boolean().optional()
      })
      .strict(),
    applicability: z
      .object({
        merchant: evidenceStateSchema,
        budget: evidenceStateSchema,
        location: evidenceStateSchema,
        channel: evidenceStateSchema,
        membership: evidenceStateSchema
      })
      .strict(),
    fulfillment: z
      .object({
        deadline: z.enum(['confirmed', 'misses', 'unknown']),
        evidenceUrl: z.string().url().optional()
      })
      .strict(),
    evidence: z
      .object({
        terms: z.enum(['explicit', 'partial', 'none']),
        code: z.enum(['verified', 'reported', 'not_applicable', 'unknown']),
        corroboratingUrls: z.array(z.string().url())
      })
      .strict()
  })
  .strict();

export const offerEvidenceInputSchema = z
  .object({
    request: offerRequestSchema,
    observations: z.array(offerObservationSchema)
  })
  .strict();

export const verifyOfferInputSchema = z
  .object({
    request: offerRequestSchema,
    observation: offerObservationSchema
  })
  .strict();

export const watchOffersInputSchema = z
  .object({
    request: offerRequestSchema,
    until: z.string().datetime(),
    idempotencyKey: z.string().min(1).max(256)
  })
  .strict();
