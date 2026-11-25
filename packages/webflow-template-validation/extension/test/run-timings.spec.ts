import { describe, expect, it } from 'vitest';
import { createRunTimer, formatRunTimings } from '../src/run-timings';
import { buildReportMarkdown } from '../src/report';

describe('run timings', () => {
  it('records each step as the time since the previous one, plus a total', () => {
    let clock = 1000;
    const timer = createRunTimer(() => clock);
    clock = 1400;
    timer.lap('variables');
    clock = 61400;
    timer.lap('styles');
    timer.count('styles', 3912);
    timer.count('pages', undefined);
    clock = 62000;

    expect(timer.result()).toEqual({ steps: { variables: 400, styles: 60000, total: 61000 }, counts: { styles: 3912 } });
  });

  it('formats the total first, then the steps from slowest to fastest', () => {
    expect(formatRunTimings({ steps: { variables: 400, styles: 60000, total: 61000 }, counts: { styles: 3912 } })).toBe(
      'total 61 s · styles 60 s (3912 items) · variables 0.4 s'
    );
    expect(formatRunTimings(undefined)).toBeNull();
    expect(formatRunTimings({ steps: {}, counts: {} })).toBeNull();
  });

  it('adds a run time line to the copied report only when timings exist', () => {
    const base = { generatedAt: '2026-11-16T00:00:00Z', errors: 0, warnings: 0, infos: 0, categories: [] };
    expect(buildReportMarkdown({ ...base, timings: { steps: { worker: 70000, total: 70500 }, counts: {} } })).toContain(
      '- Run time: total 71 s · worker 70 s'
    );
    expect(buildReportMarkdown(base)).not.toContain('Run time');
  });
});
