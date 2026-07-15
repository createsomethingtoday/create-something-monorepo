import { describe, expect, test, vi } from 'vitest';
import { requestMissionTarget } from '../src/permissions';

describe('mission origin permission', () => {
  test('invokes the exact-origin permission request synchronously', async () => {
    const request = vi.fn(() => Promise.resolve(true));
    const target = requestMissionTarget(
      {
        id: 42,
        url: 'https://example.webflow.com/path?secret=redacted'
      },
      request
    );

    expect(request).toHaveBeenCalledWith({
      origins: ['https://example.webflow.com/*']
    });
    await expect(target).resolves.toEqual({ targetTabId: 42 });
  });

  test('fails closed when current-site access is denied', async () => {
    await expect(
      requestMissionTarget(
        { id: 42, url: 'https://example.webflow.com/' },
        () => Promise.resolve(false)
      )
    ).rejects.toThrow('This mission needs access to the current site only.');
  });
});
