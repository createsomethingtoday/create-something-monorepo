import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Asset } from '$lib/server/airtable';
import submissionStore, { type SubmissionState } from './submission';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('submissionStore legacy fallback', () => {
  it('uses dashboard assets without an outage state when the server requests local calculation', async () => {
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
    submissionStore.setAssets([agatha]);

    let state: SubmissionState | undefined;
    const unsubscribe = submissionStore.subscribe((value) => {
      state = value;
    });
    await submissionStore.refresh('creator@example.com');
    unsubscribe();

    expect(state).toMatchObject({
      hasError: false,
      dataSource: 'local',
      assetsSubmitted30: 1,
      remainingSubmissions: 5,
      retryCount: 0
    });
    expect(state?.message).not.toContain('server unavailable');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
