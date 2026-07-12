import { describe, expect, it, vi } from 'vitest';
import {
  GOOGLE_CALENDAR_SCOPES,
  GoogleOAuthClient,
  InMemoryGoogleCredentialStore,
  InMemoryOAuthStateStore
} from './google-oauth.js';

describe('GoogleOAuthClient', () => {
  it('uses one-time state and persists an offline token exchange with only scheduler scopes', async () => {
    const states = new InMemoryOAuthStateStore();
    const credentials = new InMemoryGoogleCredentialStore();
    const fetch = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      const body = new URLSearchParams(String(init?.body));
      expect(Object.fromEntries(body)).toEqual({
        client_id: 'controlled-client-id',
        client_secret: 'controlled-client-secret',
        code: 'controlled-code',
        redirect_uri: 'https://scheduler.local/oauth/google/callback',
        grant_type: 'authorization_code'
      });
      return Response.json({
        access_token: 'controlled-access-token',
        refresh_token: 'controlled-refresh-token',
        expires_in: 3600,
        scope: GOOGLE_CALENDAR_SCOPES.join(' '),
        token_type: 'Bearer'
      });
    });
    const oauth = new GoogleOAuthClient({
      clientId: 'controlled-client-id',
      clientSecret: 'controlled-client-secret',
      redirectUri: 'https://scheduler.local/oauth/google/callback',
      clock: { now: () => '2026-07-13T15:00:00Z' },
      randomState: () => 'controlled-state',
      states,
      credentials,
      fetch
    });

    const authorization = await oauth.createAuthorizationRequest();
    const url = new URL(authorization.url);
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('state')).toBe('controlled-state');
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.has('include_granted_scopes')).toBe(false);
    expect(url.searchParams.get('prompt')).toBe('consent');
    expect(url.searchParams.get('scope')?.split(' ')).toEqual(GOOGLE_CALENDAR_SCOPES);

    const result = await oauth.exchangeAuthorizationCode({
      code: 'controlled-code',
      state: 'controlled-state'
    });
    expect(result).toMatchObject({ status: 'connected', expiresAt: '2026-07-13T16:00:00Z' });
    expect(await credentials.read()).toMatchObject({
      accessToken: 'controlled-access-token',
      refreshToken: 'controlled-refresh-token'
    });
    await expect(oauth.exchangeAuthorizationCode({
      code: 'replayed-code',
      state: 'controlled-state'
    })).resolves.toEqual({ status: 'rejected', reason: 'invalid_oauth_state' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('refreshes an expired access token without losing the stored refresh token', async () => {
    const credentials = new InMemoryGoogleCredentialStore();
    await credentials.write({
      accessToken: 'expired-access-token',
      refreshToken: 'durable-refresh-token',
      expiresAt: '2026-07-13T14:59:00Z',
      grantedScopes: [...GOOGLE_CALENDAR_SCOPES]
    });
    const fetch = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      expect(Object.fromEntries(new URLSearchParams(String(init?.body)))).toEqual({
        client_id: 'controlled-client-id',
        client_secret: 'controlled-client-secret',
        refresh_token: 'durable-refresh-token',
        grant_type: 'refresh_token'
      });
      return Response.json({
        access_token: 'refreshed-access-token',
        expires_in: 3600,
        scope: GOOGLE_CALENDAR_SCOPES.join(' '),
        token_type: 'Bearer'
      });
    });
    const oauth = new GoogleOAuthClient({
      clientId: 'controlled-client-id',
      clientSecret: 'controlled-client-secret',
      redirectUri: 'https://scheduler.local/oauth/google/callback',
      clock: { now: () => '2026-07-13T15:00:00Z' },
      states: new InMemoryOAuthStateStore(),
      credentials,
      fetch
    });

    await expect(oauth.getAccessToken()).resolves.toBe('refreshed-access-token');
    expect(await credentials.read()).toEqual({
      accessToken: 'refreshed-access-token',
      refreshToken: 'durable-refresh-token',
      expiresAt: '2026-07-13T16:00:00Z',
      grantedScopes: [...GOOGLE_CALENDAR_SCOPES]
    });
  });

  it('invokes the runtime fetch function with the global receiver', async () => {
    const states = new InMemoryOAuthStateStore();
    const credentials = new InMemoryGoogleCredentialStore();
    const runtimeFetch = vi.fn(function (this: typeof globalThis) {
      if (this !== globalThis) throw new TypeError('Illegal invocation');
      return Promise.resolve(Response.json({
        access_token: 'controlled-access-token',
        refresh_token: 'controlled-refresh-token',
        expires_in: 3600,
        scope: GOOGLE_CALENDAR_SCOPES.join(' '),
        token_type: 'Bearer'
      }));
    });
    vi.stubGlobal('fetch', runtimeFetch);

    try {
      const oauth = new GoogleOAuthClient({
        clientId: 'controlled-client-id',
        clientSecret: 'controlled-client-secret',
        redirectUri: 'https://scheduler.local/oauth/google/callback',
        clock: { now: () => '2026-07-13T15:00:00Z' },
        randomState: () => 'controlled-state',
        states,
        credentials
      });
      await oauth.createAuthorizationRequest();

      await expect(oauth.exchangeAuthorizationCode({
        code: 'controlled-code',
        state: 'controlled-state'
      })).resolves.toMatchObject({ status: 'connected' });
      expect(runtimeFetch).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
