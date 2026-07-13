import { describe, expect, it } from 'vitest';
import { bindGuardIdentity, parseGuardAccessConfig } from './access.js';

describe('Guard Lab identity bindings', () => {
  it('maps exact operator and player subjects and leaves unbound identities blocked', () => {
    const config = parseGuardAccessConfig({
      GUARD_LAB_OPERATOR_SUBJECTS: 'subject-operator',
      GUARD_LAB_PLAYER_BINDINGS: JSON.stringify({ 'subject-player-a': 'player-a' })
    });

    expect(bindGuardIdentity('subject-operator', config)).toEqual({ role: 'operator', subject: 'subject-operator' });
    expect(bindGuardIdentity('subject-player-a', config)).toEqual({ role: 'player', playerId: 'player-a', subject: 'subject-player-a' });
    expect(bindGuardIdentity('subject-unbound', config)).toBeNull();
  });

  it('rejects an ambiguous subject assigned as both operator and player', () => {
    expect(() => parseGuardAccessConfig({
      GUARD_LAB_OPERATOR_SUBJECTS: 'subject-shared',
      GUARD_LAB_PLAYER_BINDINGS: JSON.stringify({ 'subject-shared': 'player-a' })
    })).toThrow(/both operator and player/i);
  });
});
