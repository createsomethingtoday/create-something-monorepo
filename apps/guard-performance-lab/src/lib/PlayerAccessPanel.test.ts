import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import PlayerAccessPanel from './PlayerAccessPanel.svelte';

describe('PlayerAccessPanel', () => {
  it('makes adult-owned reset and revocation visible without rendering a credential secret', () => {
    const body = render(PlayerAccessPanel, { props: { playerId: 'player-13', displayName: 'Player 13' } }).body;
    expect(body).toContain('Player Access');
    expect(body).toContain('Create or reset access');
    expect(body).toContain('Revoke access');
    expect(body).toContain('The old secret phrase cannot be viewed');
    expect(body).not.toContain('river lantern');
  });
});
