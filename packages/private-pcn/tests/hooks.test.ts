import { beforeEach, describe, expect, it, vi } from 'vitest';
const verify = vi.hoisted(() => vi.fn());
vi.mock('@create-something/canon/auth/server', () => ({ verifyIdentityToken: verify }));
import { handle } from '../src/hooks.server';
let membership = 1;
function context(
  url = 'https://private.createsomething.agency/library',
  current: unknown = { id: 'subject', email: 'member@example.com', email_verified: true }
) {
  const first = vi.fn(async () => ({ active: membership }));
  const event = {
    url: new URL(url),
    request: new Request(url),
    cookies: { get: () => 'fixture-token' },
    locals: { identity: null },
    fetch: vi.fn(async () => new Response(JSON.stringify(current))),
    platform: {
      env: {
        DB: { prepare: () => ({ bind: () => ({ first }) }) },
        PCN_ADMIN_EMAILS: 'owner@example.com',
        ENVIRONMENT: 'production',
        PCN_RATE_LIMIT: { limit: vi.fn(async () => ({ success: true })) }
      }
    }
  };
  return { event, resolve: vi.fn(async () => new Response('ok')) } as any;
}
beforeEach(() => {
  membership = 1;
  verify.mockResolvedValue({ subject: 'subject', email: 'member@example.com' });
});
describe('session and redirect boundaries', () => {
  it('reads changed membership on the next request', async () => {
    const c = context();
    await handle(c);
    expect(c.event.locals.identity.role).toBe('member');
    membership = 0;
    await handle(c);
    expect(c.event.locals.identity.role).toBe('blocked');
  });
  it('rejects valid tokens when authoritative email or verification changes', async () => {
    for (const current of [
      { id: 'subject', email: 'changed@example.com', email_verified: true },
      { id: 'other', email: 'member@example.com', email_verified: true },
      { id: 'subject', email: 'member@example.com', email_verified: false }
    ]) {
      const c = context(undefined, current);
      await handle(c);
      expect(c.event.locals.identity).toBeNull();
    }
  });
  it('fails closed when authoritative Identity is unavailable', async () => {
    const c = context();
    c.event.fetch.mockRejectedValue(new Error('offline'));
    await handle(c);
    expect(c.event.locals.identity).toBeNull();
  });
  it('cannot redirect double-slash paths to another host', async () => {
    const c = context('https://private.createsomething.io//evil.example/a?x=1');
    const response = await handle(c);
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe(
      'https://private.createsomething.agency//evil.example/a?x=1'
    );
    expect(c.resolve).not.toHaveBeenCalled();
  });
  it('rate limits before checking credentials or accessing Identity', async () => {
    const c = context('https://private.createsomething.agency/api/playback');
    c.event.platform.env.PCN_RATE_LIMIT.limit.mockResolvedValue({ success: false });
    expect((await handle(c)).status).toBe(429);
    expect(c.event.fetch).not.toHaveBeenCalled();
  });
  it('rejects cryptographically invalid identity before network or database authorization', async () => {
    verify.mockResolvedValue(null);
    const c = context();
    await handle(c);
    expect(c.event.locals.identity).toBeNull();
    expect(c.event.fetch).not.toHaveBeenCalled();
  });
});
