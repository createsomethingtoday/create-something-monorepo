// Runs an async function over a list with a fixed number in flight at once.
// Results keep the order of the input. Pure so it can be unit-tested.

export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
  onProgress?: (done: number, total: number) => void
): Promise<R[]> {
  const results = new Array<R>(items.length);
  const workers = Math.max(1, Math.min(Math.floor(limit) || 1, items.length));
  let next = 0;
  let done = 0;

  async function work(): Promise<void> {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
      done += 1;
      onProgress?.(done, items.length);
    }
  }

  await Promise.all(Array.from({ length: workers }, work));
  return results;
}
