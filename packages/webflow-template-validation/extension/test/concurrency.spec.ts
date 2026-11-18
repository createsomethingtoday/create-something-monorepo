import { describe, expect, it } from 'vitest';
import { mapWithConcurrency } from '../src/concurrency';

const tick = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('mapWithConcurrency', () => {
  it('keeps input order although later items finish first', async () => {
    const result = await mapWithConcurrency([30, 5, 15, 1], 4, async (ms, index) => {
      await tick(ms);
      return `${index}:${ms}`;
    });
    expect(result).toEqual(['0:30', '1:5', '2:15', '3:1']);
  });

  it('never runs more than the limit at once and reports progress', async () => {
    let inFlight = 0;
    let peak = 0;
    const progress: Array<[number, number]> = [];
    await mapWithConcurrency(
      Array.from({ length: 20 }, (_, index) => index),
      3,
      async () => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await tick(2);
        inFlight -= 1;
      },
      (done, total) => progress.push([done, total])
    );
    expect(peak).toBe(3);
    expect(progress).toHaveLength(20);
    expect(progress[19]).toEqual([20, 20]);
  });

  it('handles an empty list and a zero limit', async () => {
    expect(await mapWithConcurrency([], 8, async (item) => item)).toEqual([]);
    expect(await mapWithConcurrency([1, 2], 0, async (item) => item * 2)).toEqual([2, 4]);
  });
});
