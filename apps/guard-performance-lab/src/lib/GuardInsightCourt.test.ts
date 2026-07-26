import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import GuardInsightCourt from './GuardInsightCourt.svelte';

describe('guard insight court', () => {
  it('shares an age-appropriate observation through spacing, footwork, and scheme pictures', () => {
    const body = render(GuardInsightCourt).body;

    expect(body).toContain('data-player-age="12"');
    expect(body).toContain('Base spacing awareness');
    expect(body).toContain('Natural shooting foundation');
    expect(body).toContain('Right hand is usable');
    expect(body).toContain('Left hand is developing');
    expect(body).toContain('Spacing picture');
    expect(body).toContain('Footwork picture');
    expect(body).toContain('Scheme picture');
    expect(body).toContain('Choose a ball-screen picture');
    expect(body).toContain('Drop');
    expect(body).toContain('Snake');
    expect(body).toContain('Reject');
    expect(body).toContain('The screen defender stays back near the lane.');
    expect(body).toContain('aria-label="Interactive three-dimensional half-court teaching model"');
    expect(body).toContain('Copy current insight');
  });

  it('keeps the observation separate from a player ranking or projection', () => {
    const body = render(GuardInsightCourt).body.toLowerCase().replace(/\s+/g, ' ');

    expect(body).toContain('observed foundation');
    expect(body).toContain('next evidence');
    expect(body).toContain('no ranking or future projection');
    expect(body).not.toContain('elite');
    expect(body).not.toContain('recruit');
  });
});
