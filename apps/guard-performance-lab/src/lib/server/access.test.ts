import { beforeAll, describe, expect, it } from 'vitest';
import {
  PROJECT_SESSION_COOKIE,
  authenticateProjectPassword,
  createProjectSession,
  hashProjectPassword,
  resolveGuardApplicationAccess,
  verifyProjectSession,
  type RuntimeEnv
} from './access.js';

const password = 'orange-horizon-family-27';
const playerId = 'developing-guard';
const sessionSecret = 'test-session-secret-that-is-at-least-thirty-two-characters';
const now = Date.parse('2026-08-08T12:00:00.000Z');
let passwordHash = '';
let env: RuntimeEnv;

beforeAll(async () => {
  passwordHash = await hashProjectPassword(password, {
    salt: new Uint8Array(16).fill(7)
  });
  env = {
    ENVIRONMENT: 'production',
    GUARD_LAB_PROJECT_PASSWORD_HASH: passwordHash,
    GUARD_LAB_SESSION_SECRET: sessionSecret,
    GUARD_LAB_SHARED_PLAYER_ID: playerId
  };
});

describe('Guard Lab shared project password', () => {
  it('keeps PBKDF2 within the Cloudflare Workers runtime ceiling', async () => {
    const verifier = await hashProjectPassword(password, {
      salt: new Uint8Array(16).fill(9)
    });

    expect(verifier.split('$')[1]).toBe('100000');
    await expect(hashProjectPassword(password, {
      iterations: 100_001,
      salt: new Uint8Array(16).fill(9)
    })).rejects.toThrow(/at most 100000 iterations/i);
  });

  it('creates only a player-scoped session and rejects tampering or expiration', async () => {
    const token = await createProjectSession({ passwordHash, playerId, sessionSecret, now });

    await expect(verifyProjectSession(token, { passwordHash, playerId, sessionSecret, now }))
      .resolves.toEqual({ role: 'player', playerId });
    await expect(verifyProjectSession(`${token.slice(0, -1)}x`, { passwordHash, playerId, sessionSecret, now }))
      .resolves.toBeNull();
    await expect(verifyProjectSession(token, {
      passwordHash,
      playerId,
      sessionSecret,
      now: now + (15 * 24 * 60 * 60 * 1000)
    })).resolves.toBeNull();
  });

  it('fails closed when anonymous and accepts only a valid signed project session', async () => {
    const url = new URL('https://guard.example/film?view=trace');
    const anonymous = await resolveGuardApplicationAccess({
      request: new Request(url),
      url,
      env,
      now
    });
    expect(anonymous).toMatchObject({ status: 'unauthenticated', scope: null });
    expect(anonymous.signInUrl).toBe('/sign-in?redirect=%2Ffilm%3Fview%3Dtrace');

    const token = await createProjectSession({ passwordHash, playerId, sessionSecret, now });
    const allowed = await resolveGuardApplicationAccess({
      request: new Request(url, { headers: { cookie: `${PROJECT_SESSION_COOKIE}=${token}` } }),
      url,
      env,
      now
    });
    expect(allowed).toMatchObject({
      status: 'allowed',
      source: 'project-password',
      scope: { role: 'player', playerId }
    });
  });

  it('sets an HTTP-only production cookie only for the correct password', async () => {
    const correct = await authenticateProjectPassword({
      request: new Request('https://guard.example/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password })
      }),
      env,
      now
    });
    expect(correct.status).toBe(200);
    expect(await correct.json()).toEqual({ success: true });
    expect(correct.headers.get('set-cookie')).toContain(`${PROJECT_SESSION_COOKIE}=`);
    expect(correct.headers.get('set-cookie')).toContain('HttpOnly');
    expect(correct.headers.get('set-cookie')).toContain('SameSite=Lax');
    expect(correct.headers.get('set-cookie')).toContain('Secure');
    expect(correct.headers.get('cache-control')).toBe('private, no-store');

    const incorrect = await authenticateProjectPassword({
      request: new Request('https://guard.example/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: 'incorrect-project-password' })
      }),
      env,
      now
    });
    expect(incorrect.status).toBe(401);
    expect(await incorrect.json()).toEqual({ success: false, error: 'Invalid project password.' });
    expect(incorrect.headers.has('set-cookie')).toBe(false);
    expect(incorrect.headers.get('cache-control')).toBe('private, no-store');
  });

  it('returns an unconfigured access state when any deployment secret or player binding is missing', async () => {
    const access = await resolveGuardApplicationAccess({
      request: new Request('https://guard.example/'),
      url: new URL('https://guard.example/'),
      env: { GUARD_LAB_SHARED_PLAYER_ID: playerId },
      now
    });
    expect(access).toMatchObject({ status: 'unconfigured', scope: null });
    expect(access.detail).toMatch(/password verifier and session secret/i);
  });
});
