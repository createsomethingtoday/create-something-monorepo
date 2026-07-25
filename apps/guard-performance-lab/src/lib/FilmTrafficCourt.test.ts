import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import FilmTrafficCourt from './FilmTrafficCourt.svelte';
import { captureFilmAnalysis } from './film.js';

const source = { sha256: 'a'.repeat(64), durationMs: 2000, width: 1920, height: 1080, fps: 30, byteSize: 1000, linkedPath: '/private/game.mp4' };
const evidence = { intervalId: 'live-1', method: 'source-review' as const, reviewer: 'codex' as const, note: 'Agent-reviewed live possession.' };
const analysis = captureFilmAnalysis({
  source,
  frames: [
    { timeMs: 0, targetStatus: 'resolved', playState: 'live-offense', playStateEvidence: evidence, players: [{ trackId: '13', team: 'target', court: [10, 20], confidence: 0.9 }] },
    { timeMs: 1000, targetStatus: 'resolved', playState: 'live-offense', playStateEvidence: evidence, players: [{ trackId: '13', team: 'target', court: [20, 30], confidence: 0.9 }] }
  ]
});
const draw = (timeMs: number) => render(FilmTrafficCourt, { props: { analysis, timeMs, wakeMs: 5000, movementMode: 'live-only' as const } }).body;

describe('film traffic canvas', () => {
  it('declares a synthesized #13 position and leaves a captured one undecorated', () => {
    const between = draw(500);
    expect(between).toContain('data-interpolated="true"');
    expect(between).toContain('stroke-dasharray="4 5"');
    expect(between).toContain('position is interpolated');

    const captured = draw(0);
    expect(captured).not.toContain('data-interpolated');
    expect(captured).not.toContain('stroke-dasharray="4 5"');
    expect(captured).toContain('sits on a captured frame');
  });

  it('renders the target wake from an already-corrected analysis without re-applying corrections', () => {
    const body = draw(1000);
    expect(body).toContain('class="target-wake"');
    expect(body).toContain('live-offense');
    expect(body).toContain('>13</text>');
  });
});
