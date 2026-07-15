import { describe, expect, test, vi } from 'vitest';
import {
  ACTIVE_TAB_CAPTURE_GUIDANCE,
  captureMaskedVisibleTab
} from '../src/capture';

describe('masked screenshot capture', () => {
  test('explains how to grant one-tab capture without requesting every site', async () => {
    const setMask = vi.fn(() => Promise.resolve());

    await expect(
      captureMaskedVisibleTab({
        setMask,
        capture: () => Promise.reject(
          new Error("Either the '<all_urls>' or 'activeTab' permission is required.")
        )
      })
    ).rejects.toThrow(ACTIVE_TAB_CAPTURE_GUIDANCE);

    expect(ACTIVE_TAB_CAPTURE_GUIDANCE).toContain('one-tab screenshot grant');
    expect(ACTIVE_TAB_CAPTURE_GUIDANCE).toContain('does not request access to every site');
    expect(setMask).toHaveBeenNthCalledWith(1, true);
    expect(setMask).toHaveBeenNthCalledWith(2, false);
  });

  test('always removes the capture mask after a successful screenshot', async () => {
    const setMask = vi.fn(() => Promise.resolve());

    await expect(
      captureMaskedVisibleTab({
        setMask,
        capture: () => Promise.resolve('data:image/png;base64,evidence')
      })
    ).resolves.toBe('data:image/png;base64,evidence');

    expect(setMask).toHaveBeenNthCalledWith(1, true);
    expect(setMask).toHaveBeenNthCalledWith(2, false);
  });
});
