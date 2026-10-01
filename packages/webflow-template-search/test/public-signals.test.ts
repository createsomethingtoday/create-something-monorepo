import { describe, expect, it } from 'vitest';
import { publicPurchaseBucket, publicViewerBucket } from '../src/public-signals.js';

describe('public signal buckets', () => {
  it('floors purchases to the highest consumer threshold cleared', () => {
    expect([null, 0, 1, 9, 10, 19, 20, 24, 25, 49, 50, 99, 100, 249, 250, 470, 499, 500, 9_999].map(publicPurchaseBucket)).toEqual([
      null, 0, 1, 1, 10, 10, 20, 20, 25, 25, 50, 50, 100, 100, 250, 250, 250, 500, 500,
    ]);
  });

  it('floors viewers without exposing exact traffic', () => {
    expect([null, 0, 623, 4_999, 5_000, 22_333, 1_200_000].map(publicViewerBucket)).toEqual([
      null, 0, 1, 1_000, 5_000, 10_000, 1_000_000,
    ]);
  });

  it('preserves every consumer threshold check', () => {
    const purchaseChecks = [1, 10, 20, 25, 50, 100, 250, 500];
    const viewerChecks = [1, 5_000];
    for (let value = 0; value <= 1_000; value += 1) {
      for (const t of purchaseChecks) expect(publicPurchaseBucket(value)! >= t).toBe(value >= t);
    }
    for (let value = 0; value <= 60_000; value += 7) {
      for (const t of viewerChecks) expect(publicViewerBucket(value)! >= t).toBe(value >= t);
    }
  });
});
