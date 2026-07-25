import { describe, expect, it } from 'vitest';
import {
  FILM_PLAY_REVIEW_PROFILE,
  filmPlayReviewPacketSchema,
  validateFilmPlayReviewPacket
} from './film-play-review.js';

const sourceSha256 = 'a'.repeat(64);
const anonymizedImage = {
  mediaType: 'image/webp' as const,
  dataUrl: `data:image/webp;base64,${Buffer.from('anonymized-webp').toString('base64')}`,
  sha256: 'b'.repeat(64),
  width: 960,
  height: 540,
  anonymization: {
    method: 'whole-frame-pixelation-v1' as const,
    sourceWidth: 1920,
    sourceHeight: 1080,
    pixelWidth: 160,
    pixelHeight: 90,
    rawSourceIncluded: false as const,
    marker: { label: '13' as const, style: 'synthetic-orange-v1' as const, normalizedPoint: [0.4, 0.6] as [number, number] }
  }
};

const packet = {
  version: 1 as const,
  profile: FILM_PLAY_REVIEW_PROFILE,
  sourceSha256,
  analysisRevision: 3 as const,
  analysisExecutionCount: 1 as const,
  reviewer: 'codex' as const,
  reviewedAt: '2026-07-20T20:00:00.000Z',
  cards: [{
    id: 'defense-to-offense-width',
    startMs: 1_065_000,
    representativeTimeMs: 1_075_000,
    endMs: 1_079_000,
    possession: 'teammate',
    phase: 'transition-offense',
    position: 'Right corner / short-corner band',
    observation: 'After the possession changes, #13 advances to the right corner and remains outside the central cluster.',
    interpretation: 'The route creates offensive width instead of following the ball into the middle.',
    limitation: 'The frames do not establish the called play or an exact distance from the lane line.',
    image: anonymizedImage
  }]
};

describe('film play review evidence', () => {
  it('accepts a source-bound, whole-frame anonymized possession card', () => {
    expect(filmPlayReviewPacketSchema.parse(packet)).toEqual(packet);
    expect(validateFilmPlayReviewPacket(packet, {
      sourceSha256,
      sourceDurationMs: 3_395_733,
      analysisRevision: 3,
      analysisExecutionCount: 1
    })).toEqual({ ok: true, issues: [], cardCount: 1 });
  });

  it('fails closed for a source mismatch, raw imagery, missing marker, and invalid time domain', () => {
    const unsafe = {
      ...packet,
      sourceSha256: 'c'.repeat(64),
      cards: [{
        ...packet.cards[0],
        startMs: 2_000,
        representativeTimeMs: 1_000,
        image: {
          ...anonymizedImage,
          anonymization: {
            ...anonymizedImage.anonymization,
            pixelWidth: 960,
            pixelHeight: 540,
            rawSourceIncluded: true,
            marker: { ...anonymizedImage.anonymization.marker, label: '12' }
          }
        }
      }]
    };

    const result = validateFilmPlayReviewPacket(unsafe, {
      sourceSha256,
      sourceDurationMs: 3_395_733,
      analysisRevision: 3,
      analysisExecutionCount: 1
    });
    expect(result.ok).toBe(false);
    expect(result.issues.join(' ')).toMatch(/source|raw|pixel|13|time/i);
  });

  it('rejects publicly addressable images and oversized embedded payloads', () => {
    expect(filmPlayReviewPacketSchema.safeParse({
      ...packet,
      cards: [{ ...packet.cards[0], image: { ...anonymizedImage, dataUrl: 'https://example.com/player-13.webp' } }]
    }).success).toBe(false);

    expect(filmPlayReviewPacketSchema.safeParse({
      ...packet,
      cards: [{ ...packet.cards[0], image: { ...anonymizedImage, dataUrl: `data:image/webp;base64,${'A'.repeat(250_001)}` } }]
    }).success).toBe(false);
  });
});
