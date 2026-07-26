import { z } from 'zod';

export const FILM_PLAY_REVIEW_PROFILE = 'guard-player-13-play-review-v1' as const;
export const FILM_REVIEW_IMAGE_MAX_DATA_URL_LENGTH = 250_000;

const normalizedPointSchema = z.tuple([
  z.number().min(0).max(1),
  z.number().min(0).max(1)
]);

export const filmReviewImageSchema = z.object({
  mediaType: z.literal('image/webp'),
  dataUrl: z.string()
    .max(FILM_REVIEW_IMAGE_MAX_DATA_URL_LENGTH)
    .regex(/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  width: z.literal(960),
  height: z.literal(540),
  anonymization: z.object({
    method: z.literal('whole-frame-pixelation-v1'),
    sourceWidth: z.number().int().positive(),
    sourceHeight: z.number().int().positive(),
    pixelWidth: z.number().int().positive().max(160),
    pixelHeight: z.number().int().positive().max(90),
    rawSourceIncluded: z.literal(false),
    marker: z.object({
      label: z.literal('13'),
      style: z.literal('synthetic-orange-v1'),
      normalizedPoint: normalizedPointSchema
    })
  }).superRefine((value, context) => {
    if (value.pixelWidth * 8 > value.sourceWidth || value.pixelHeight * 8 > value.sourceHeight) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Whole-frame pixelation must reduce both source dimensions by at least 8x.'
      });
    }
  })
});

export const filmPlayReviewCardSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  startMs: z.number().int().nonnegative(),
  representativeTimeMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
  possession: z.enum(['teammate', 'opponent', 'dead-ball', 'unknown']),
  phase: z.enum([
    'half-court-offense',
    'half-court-defense',
    'transition-offense',
    'transition-defense',
    'baseline-inbound-defense',
    'dead-ball'
  ]),
  position: z.string().trim().min(1).max(160),
  observation: z.string().trim().min(1).max(800),
  interpretation: z.string().trim().min(1).max(800),
  limitation: z.string().trim().min(1).max(800),
  image: filmReviewImageSchema
});

export const filmPlayReviewPacketSchema = z.object({
  version: z.literal(1),
  profile: z.literal(FILM_PLAY_REVIEW_PROFILE),
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
  analysisRevision: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  analysisExecutionCount: z.literal(1),
  reviewer: z.enum(['user', 'codex']),
  reviewedAt: z.string().datetime(),
  cards: z.array(filmPlayReviewCardSchema).min(1).max(12)
});

export type FilmPlayReviewPacket = z.infer<typeof filmPlayReviewPacketSchema>;
export type FilmPlayReviewCard = z.infer<typeof filmPlayReviewCardSchema>;

export function validateFilmPlayReviewPacket(
  input: unknown,
  expected: {
    sourceSha256: string;
    sourceDurationMs: number;
    analysisRevision: number;
    analysisExecutionCount: number;
  }
) {
  const parsed = filmPlayReviewPacketSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      issues: parsed.error.issues.map((issue) => `${issue.path.join('.') || 'packet'}: ${issue.message}`),
      cardCount: 0
    };
  }

  const packet = parsed.data;
  const issues: string[] = [];
  if (packet.sourceSha256 !== expected.sourceSha256) issues.push('The play review source does not match the captured film source.');
  if (packet.analysisRevision !== expected.analysisRevision) issues.push('The play review analysis revision does not match the captured film revision.');
  if (packet.analysisExecutionCount !== expected.analysisExecutionCount || expected.analysisExecutionCount !== 1) issues.push('The play review must remain bound to exactly one analysis execution.');

  const ids = new Set<string>();
  for (const card of packet.cards) {
    if (ids.has(card.id)) issues.push(`Duplicate play review card id: ${card.id}.`);
    ids.add(card.id);
    if (card.startMs > card.representativeTimeMs || card.representativeTimeMs > card.endMs) {
      issues.push(`${card.id} has an invalid start, representative, or end time.`);
    }
    if (card.endMs > expected.sourceDurationMs) issues.push(`${card.id} extends past the captured source duration.`);
  }

  return { ok: issues.length === 0, issues, cardCount: packet.cards.length };
}
