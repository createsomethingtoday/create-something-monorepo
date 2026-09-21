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
    cookies: { get: (name: string) => name === '__Host-pcn_access' ? 'fixture-token' : undefined },
    locals: { identity: null },
    fetch: vi.fn(async () => new Response(JSON.stringify(current))),
    platform: {
      env: {
        DB: {
          prepare: (sql: string) => ({
            bind: () => ({
              first: sql.includes('FROM networks')
                ? async () => ({
                    id: 'default',
                    slug: 'create-something',
                    status: 'active',
                    owner_id: null
                  })
                : first
            })
          })
        },
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

describe('network ownership in the real request hook', () => {
  it('grants the verified owner access only to their network', async () => {
    membership = 0;
    const c = context('https://private.createsomething.agency/n/alpha/studio');
    c.event.platform.env.DB.prepare = (sql: string) => ({
      bind: (...args: unknown[]) => ({
        first: async () =>
          sql.includes('FROM networks')
            ? { id: 'alpha', slug: 'alpha', owner_id: 'subject', status: 'active' }
            : { active: 0 }
      })
    });
    await handle(c);
    expect(c.event.locals.identity.role).toBe('admin');
    c.event.platform.env.DB.prepare = (sql: string) => ({
      bind: () => ({
        first: async () =>
          sql.includes('FROM networks')
            ? { id: 'bravo', slug: 'bravo', owner_id: 'another-subject', status: 'active' }
            : { active: 0 }
      })
    });
    await handle(c);
    expect(c.event.locals.identity.role).toBe('blocked');
  });
  it('does not give platform admins control of creator-owned networks', async () => {
    const c = context('https://private.createsomething.agency/n/alpha/studio');
    c.event.platform.env.PCN_ADMIN_EMAILS = 'member@example.com';
    c.event.platform.env.DB.prepare = (sql: string) => ({
      bind: () => ({
        first: async () =>
          sql.includes('FROM networks')
            ? { id: 'alpha', slug: 'alpha', owner_id: 'another-subject', status: 'active' }
            : { active: 0 }
      })
    });
    await handle(c);
    expect(c.event.locals.identity.role).toBe('blocked');
  });
});

it('hides active network content immediately when its creator approval is missing', async () => {
  const c = context('https://private.createsomething.agency/n/alpha');
  c.event.platform.env.DB.prepare = (query: string) => ({
    bind: () => ({
      first: async () =>
        query.includes('FROM networks')
          ? { id: 'alpha', slug: 'alpha', owner_id: 'owner', status: 'active' }
          : null
    })
  });
  await handle(c);
  expect(c.event.locals.network.status).toBe('suspended');
});
