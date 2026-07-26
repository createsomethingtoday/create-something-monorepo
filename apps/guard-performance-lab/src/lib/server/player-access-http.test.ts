import { describe, expect, it, vi } from 'vitest';
import { forwardPlayerAccessRequest } from './player-access-http.js';

const env = {
  GUARD_LAB_PLAYER_BINDINGS: JSON.stringify({ 'guard-player-13': 'player-13' }),
  GUARD_LAB_IDENTITY_ADMIN_TOKEN: 'service-secret',
  IDENTITY_API_URL: 'https://id.test'
};

describe('forwardPlayerAccessRequest', () => {
  it('keeps management operator-only and forwards the bound subject without exposing the service secret', async () => {
    const runtimeFetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      expect(String(input)).toBe('https://id.test/v1/auth/player-access/admin-upsert');
      expect(new Headers(init?.headers).get('x-api-key')).toBe('service-secret');
      expect(JSON.parse(String(init?.body))).toMatchObject({
        subject_id: 'guard-player-13',
        manager_subject: 'operator-1',
        display_name: 'Player 13'
      });
      return Response.json({ success: true, player_access: { subject: 'guard-player-13', player_code: 'ACE-2713', status: 'active' } }, { status: 201 });
    });

    const response = await forwardPlayerAccessRequest({
      scope: { role: 'operator', subject: 'operator-1' },
      env,
      playerId: 'player-13',
      action: 'upsert',
      passphrase: 'river lantern balance corner',
      displayName: 'Player 13',
      fetch: runtimeFetch as typeof globalThis.fetch
    });
    expect(response.status).toBe(201);
    expect(runtimeFetch).toHaveBeenCalledOnce();
    expect(JSON.stringify(await response.json())).not.toContain('service-secret');
  });

  it('rejects player-scoped management before calling Identity', async () => {
    const runtimeFetch = vi.fn();
    const response = await forwardPlayerAccessRequest({
      scope: { role: 'player', subject: 'guard-player-13', playerId: 'player-13' },
      env,
      playerId: 'player-13',
      action: 'get',
      fetch: runtimeFetch as typeof globalThis.fetch
    });
    expect(response.status).toBe(403);
    expect(runtimeFetch).not.toHaveBeenCalled();
  });
});
