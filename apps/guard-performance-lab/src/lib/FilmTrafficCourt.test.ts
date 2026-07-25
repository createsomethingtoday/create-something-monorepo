import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import FilmTrafficCourt from './FilmTrafficCourt.svelte';
import { applyFilmCorrections, captureFilmAnalysis } from './film.js';
import type { FilmAnalysisRecord } from './model.js';

const source = { sha256: 'a'.repeat(64), durationMs: 2000, width: 1920, height: 1080, fps: 30, byteSize: 1000, linkedPath: '/private/game.mp4' };
const evidence = { intervalId: 'live-1', method: 'source-review' as const, reviewer: 'codex' as const, note: 'Agent-reviewed live possession.' };
const captured = captureFilmAnalysis({
  source,
  frames: [
    { timeMs: 0, targetStatus: 'resolved', playState: 'live-offense', playStateEvidence: evidence, players: [{ trackId: '13', team: 'target', court: [10, 20], confidence: 0.9 }] },
    { timeMs: 1000, targetStatus: 'resolved', playState: 'live-offense', playStateEvidence: evidence, players: [{ trackId: '13', team: 'target', court: [20, 30], confidence: 0.9 }] }
  ]
});
const analysis: FilmAnalysisRecord = { ...captured, id: 'analysis-1', playerId: 'developing-guard', title: 'Game / #13', createdAt: '2026-07-20T00:00:00.000Z', corrections: [] };
const corrected = applyFilmCorrections(analysis);
const draw = (timeMs: number) => render(FilmTrafficCourt, { props: { analysis, corrected, timeMs, wakeMs: 5000, movementMode: 'live-only' as const } }).body;

describe('film traffic canvas', () => {
  it('declares a synthesized #13 position and leaves a captured one undecorated', () => {
    const between = draw(500);
    expect(between).toContain('data-interpolated="true"');
    expect(between).toContain('stroke-dasharray="4 5"');
    expect(between).toContain('position is interpolated');

    const onFrame = draw(0);
    expect(onFrame).not.toContain('data-interpolated');
    expect(onFrame).not.toContain('stroke-dasharray="4 5"');
    expect(onFrame).toContain('sits on a captured frame');
  });

  it('renders the wake from the already-corrected analysis it is handed', () => {
    const body = draw(1000);
    expect(body).toContain('class="target-wake"');
    expect(body).toContain('live-offense');
    expect(body).toContain('>13</text>');
    expect(body).toContain('data-analysis-id="analysis-1"');
  });
});
