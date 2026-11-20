// How long each part of a Validator run took in the Designer, and how much it
// read. Pure so it can be unit-tested. The times go into the copied report and
// the submitted result, so a slow run says which step was slow.

export interface RunTimings {
  /** Milliseconds per step, in the order the steps ran. */
  steps: Record<string, number>;
  /** Items read per step (styles, pages, ...). */
  counts: Record<string, number>;
}

export interface RunTimer {
  /** Records the time since the previous lap (or since the timer started) under `step`. */
  lap(step: string): void;
  count(name: string, items: number | undefined | null): void;
  result(): RunTimings;
}

export function createRunTimer(now: () => number = () => performance.now()): RunTimer {
  const startedAt = now();
  let lastLap = startedAt;
  const steps: Record<string, number> = {};
  const counts: Record<string, number> = {};

  return {
    lap(step) {
      const current = now();
      steps[step] = (steps[step] || 0) + Math.max(0, Math.round(current - lastLap));
      lastLap = current;
    },
    count(name, items) {
      if (typeof items === 'number' && Number.isFinite(items)) counts[name] = Math.max(0, Math.floor(items));
    },
    result() {
      return { steps: { ...steps, total: Math.max(0, Math.round(now() - startedAt)) }, counts: { ...counts } };
    },
  };
}

function formatSeconds(ms: number): string {
  return ms >= 10_000 ? `${Math.round(ms / 1000)} s` : `${(ms / 1000).toFixed(1)} s`;
}

/** One line for the report: total first, then the steps, slowest first. */
export function formatRunTimings(timings?: RunTimings | null): string | null {
  if (!timings || typeof timings.steps !== 'object') return null;
  const { total, ...steps } = timings.steps;
  const parts = Object.entries(steps)
    .filter(([, ms]) => typeof ms === 'number' && Number.isFinite(ms))
    .sort(([, a], [, b]) => b - a)
    .map(([step, ms]) => {
      const items = timings.counts?.[step];
      return `${step} ${formatSeconds(ms)}${typeof items === 'number' ? ` (${items} items)` : ''}`;
    });
  if (typeof total !== 'number' && parts.length === 0) return null;
  return [typeof total === 'number' ? `total ${formatSeconds(total)}` : null, ...parts].filter(Boolean).join(' · ');
}
