import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import SharedLanguageCourt from './SharedLanguageCourt.svelte';

describe('SharedLanguageCourt', () => {
  it('keeps the selected animation understandable without WebGL or motion', () => {
    const body = render(SharedLanguageCourt, { props: { term: 'Advantage' } }).body;

    expect(body).toContain('Animated example / Advantage');
    expect(body).toContain('The orange guard gets a shoulder beyond the on-ball defender');
    expect(body).toContain('Beat one. Make two decide. Finish or find the open player.');
    expect(body).toContain('aria-label="Animated half-court example for Advantage"');
    expect(body).toContain('Replay example');
    expect(body).toContain('Pause animation');
  });

  it('explains the Freeze dribble without relying on animation', () => {
    const body = render(SharedLanguageCourt, { props: { term: 'Freeze' } }).body;

    expect(body).toContain('Dribble at a helper so they commit to the ball');
    expect(body).toContain('The orange guard dribbles at the black helper');
    expect(body).toContain('Dribble at the helper. Make them commit. Pass behind the help.');
  });
});
