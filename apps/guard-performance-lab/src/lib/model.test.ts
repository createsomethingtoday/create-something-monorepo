import { describe, expect, it } from 'vitest';
import { createInitialState, createPlayer, emptyReceipt, parseState, receiptsForSelected, saveReceipt, validateReceipt } from './model.js';

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
});
