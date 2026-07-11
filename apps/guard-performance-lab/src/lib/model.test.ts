import { describe, expect, it } from 'vitest';
import { createInitialState, createPlayer, emptyReceipt, parseState, receiptsForSelected, saveReceipt, validateReceipt } from './model.js';

describe('guard performance local model', () => {
  it('recovers from missing and corrupt storage', () => {
    expect(parseState(null).players[0]?.name).toBe('Developing Guard');
    expect(parseState('{broken').version).toBe(3);
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
