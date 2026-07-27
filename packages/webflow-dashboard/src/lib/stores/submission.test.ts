import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Asset } from '$lib/server/airtable';
import submissionStore, { type SubmissionState } from './submission';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('submissionStore legacy fallback', () => {
  it('uses dashboard assets without an outage state when the server requests local calculation', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-27T14:00:00.000Z'));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            assetsSubmitted30: 0,
            hasError: false,
            message: 'Submission availability is calculated from your dashboard assets.',
            useLocalCalculation: true,
            fallbackReason: 'legacy_user_not_found'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );

    const agatha = {
      id: 'recdSLZ5svKYU14pd',
      name: 'Agatha',
      type: 'Template',
      status: 'Upcoming',
      submittedDate: new Date().toISOString()
    } as Asset;
    const recentDelisted = {
      id: 'rec-delisted',
      name: 'Recent delisted submission',
      type: 'Template',
      status: 'Delisted',
      submittedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    } as Asset;
    const expiredRejected = {
      id: 'rec-expired',
      name: 'Expired rejected submission',
      type: 'Template',
      status: 'Rejected',
      submittedDate: new Date(
        Date.now() - (30 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000)
      ).toISOString()
    } as Asset;
    submissionStore.setAssets([agatha, recentDelisted, expiredRejected]);

    let state: SubmissionState | undefined;
    const unsubscribe = submissionStore.subscribe((value) => {
      state = value;
    });
    await submissionStore.refresh('creator@example.com');
    unsubscribe();

    expect(state).toMatchObject({
      hasError: false,
      dataSource: 'local',
      assetsSubmitted30: 2,
      remainingSubmissions: 4,
      retryCount: 0
    });
    expect(state?.submissions.map((submission) => submission.id)).toEqual([
      'rec-delisted',
      'recdSLZ5svKYU14pd'
    ]);
    expect(state?.message).not.toContain('server unavailable');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
