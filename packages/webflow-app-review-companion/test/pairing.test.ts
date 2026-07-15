import { describe, expect, test, vi } from 'vitest';
import {
  isAllowedPairingSender,
  redeemAndBeginCompanion
} from '../src/pairing';

describe('browser companion pairing', () => {
  test('redeems one Webflow-issued code and begins the exact version-bound run', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          session: {
            token: 'short-lived-session-token',
            expiresAt: '2026-07-15T16:00:00.000Z',
            reviewId: 'review-1',
            reviewVersionId: 'version-3',
            actorRole: 'reviewer',
            evidenceTrust: 'webflow_observed'
          }
        })
      )
      .mockResolvedValueOnce(
        Response.json(
          {
            run: {
              id: 'run-1',
              reviewId: 'review-1',
              reviewVersionId: 'version-3',
              actorRole: 'reviewer',
              evidenceTrust: 'webflow_observed'
            }
          },
          { status: 201 }
        )
      );

    const paired = await redeemAndBeginCompanion({
      code: 'webflow-issued-one-time-code',
      apiBaseUrl: 'https://preflight.example.workers.dev',
      fetcher
    });

    expect(paired.settings).toEqual({
      apiBaseUrl: 'https://preflight.example.workers.dev',
      token: 'short-lived-session-token',
      reviewId: 'review-1',
      reviewVersionId: 'version-3',
      expiresAt: '2026-07-15T16:00:00.000Z'
    });
    expect(paired.run).toMatchObject({
      id: 'run-1',
      reviewVersionId: 'version-3',
      evidenceTrust: 'webflow_observed'
    });
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      'https://preflight.example.workers.dev/v1/reviews/review-1/companion-runs',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Bearer short-lived-session-token'
        }),
        body: JSON.stringify({ reviewVersionId: 'version-3' })
      })
    );
  });

  test('accepts pairing only from the owning Webflow extension surface', () => {
    expect(
      isAllowedPairingSender(
        'https://68821e9ad5797a48cfc68499.webflow-ext.com',
        false
      )
    ).toBe(true);
    expect(isAllowedPairingSender('https://webflow.com', false)).toBe(false);
    expect(isAllowedPairingSender('https://attacker.example', false)).toBe(false);
    expect(isAllowedPairingSender('http://localhost:4175', true)).toBe(true);
    expect(isAllowedPairingSender('http://localhost:4175', false)).toBe(false);
  });
});
