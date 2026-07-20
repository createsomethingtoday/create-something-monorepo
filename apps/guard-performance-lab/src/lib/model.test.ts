import { describe, expect, it } from 'vitest';
import { applyFilmPlayStateLedger, captureFilmAnalysis, FILM_PLAY_STATE_PROFILE } from './film.js';
import { createInitialState, createPlayer, emptyReceipt, latestFilmAnalysisForPlayer, parseState, receiptsForSelected, saveReceipt, validateReceipt } from './model.js';

describe('guard performance local model', () => {
  it('recovers from missing and corrupt storage', () => {
    expect(parseState(null).players[0]?.name).toBe('Developing Guard');
    expect(parseState('{broken').version).toBe(5);
  });

  it('upgrades an existing v3 player without inventing profile data', () => {
    const state = parseState(JSON.stringify({
      version: 3,
      revision: 7,
      selectedPlayerId: 'legacy-player',
      players: [{ id: 'legacy-player', name: 'Private label', createdAt: '2026-07-11T00:00:00.000Z' }],
      receipts: [],
      artifacts: [],
      engagements: []
    }));

    expect(state.version).toBe(5);
    expect(state.revision).toBe(7);
    expect(state.players[0]?.profile).toMatchObject({ age: null, gender: null, primaryPosition: null, preferredName: '' });
  });

  it('isolates receipts by player', () => {
    let state = createInitialState('2026-07-11T00:00:00.000Z');
    const draft = { ...emptyReceipt('2026-07-12'), strength: 'Scans early', nextFocus: 'Protect pickup', playerWords: 'I saw the low man' };
    state = saveReceipt(state, draft, 'r1', '2026-07-12T12:00:00.000Z');
    state = createPlayer(state, 'Second Player', 'p2', '2026-07-12T12:01:00.000Z');
    expect(receiptsForSelected(state)).toHaveLength(0);
    expect(state.receipts).toHaveLength(1);
  });

  it('requires strength, next focus, and player words without mutating state', () => {
    const state = createInitialState();
    const draft = emptyReceipt('2026-07-12');
    expect(validateReceipt(draft)).toHaveLength(3);
    expect(saveReceipt(state, draft)).toBe(state);
  });

  it('prefers a play-state-reviewed overlay when immutable analysis revisions match', () => {
    const sourceSha256 = 'd'.repeat(64);
    const analysis = captureFilmAnalysis({
      source: { sha256: sourceSha256, durationMs: 2000, width: 1920, height: 1080, fps: 30, byteSize: 1000, linkedPath: '/private/game.mp4' },
      frames: [{ timeMs: 0, players: [{ trackId: '13', team: 'target', court: [10, 20], confidence: 0.9 }] }]
    });
    const reviewed = applyFilmPlayStateLedger(analysis, {
      version: 1,
      profile: FILM_PLAY_STATE_PROFILE,
      sourceSha256,
      intervals: [{
        id: 'reviewed', startMs: 0, endMs: 2000, state: 'live-defense',
        evidence: { method: 'source-review', reviewer: 'codex', note: 'Reviewed live possession.' }
      }]
    });
    const state = {
      ...createInitialState(),
      filmAnalyses: [
        { ...analysis, id: 'base', playerId: 'developing-guard', title: 'Base', createdAt: '2026-07-19T00:00:00.000Z', corrections: [] },
        { ...reviewed, id: 'reviewed', playerId: 'developing-guard', title: 'Reviewed', createdAt: '2026-07-19T00:01:00.000Z', corrections: [] }
      ]
    };

    expect(latestFilmAnalysisForPlayer(state, 'developing-guard')?.id).toBe('reviewed');
  });
});
