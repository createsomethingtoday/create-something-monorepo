import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const verify = vi.hoisted(() => vi.fn());
vi.mock('@create-something/canon/auth/server', () => ({ verifyIdentityToken: verify }));
import { handle } from '../src/hooks.server';
import { POST } from '../src/routes/api/impersonation/+server';
import { POST as createNetwork } from '../src/routes/api/networks/+server';
let sql: DatabaseSync;
function statement(query: string, values: any[] = []): any {
  return {
    bind: (...args: any[]) => statement(query, args),
    first: async () => sql.prepare(query).get(...values),
    all: async () => ({ results: sql.prepare(query).all(...values) }),
    run: async () => ({ meta: { changes: Number(sql.prepare(query).run(...values).changes) } })
  };
}
const cookies = new Map<string, string>();
function event(path = '/api/impersonation', body?: unknown): any {
  const url = new URL('https://private.createsomething.agency' + path);
  return {
    url,
    params: {},
    locals: {
      identity: { subject: 'admin', email: 'admin@example.com', role: 'admin' },
      network: null
    },
    request: new Request(url, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        origin: url.origin,
        ...(cookies.has('__Host-pcn_impersonation')
          ? {
              'X-PCN-Support-Session': String(
                sql
                  .prepare('SELECT id FROM impersonation_sessions ORDER BY rowid DESC LIMIT 1')
                  .get()?.id
              )
            }
          : {})
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    }),
    cookies: {
      get: (key: string) => cookies.get(key),
      set: (key: string, value: string) => cookies.set(key, value),
      delete: (key: string) => cookies.delete(key)
    },
    fetch: vi.fn(
      async (url: string) =>
        new Response(
          JSON.stringify(
            url.endsWith('/users/me')
              ? { id: 'admin', email: 'admin@example.com', email_verified: true }
              : { id: 'creator', email: 'creator@example.com', email_verified: true }
          )
        )
    ),
    platform: {
      env: {
        DB: {
          prepare: statement,
          batch: async (items: any[]) => {
            sql.exec('BEGIN');
            try {
              const result = [];
              for (const item of items) result.push(await item.run());
              sql.exec('COMMIT');
              return result;
            } catch (e) {
              sql.exec('ROLLBACK');
              throw e;
            }
          }
        },
        PCN_ADMIN_EMAILS: 'admin@example.com',
        PCN_IMPERSONATION_ENABLED: 'true',
        PCN_RATE_LIMIT: { limit: async () => ({ success: true }) },
        ENVIRONMENT: 'production'
      }
    }
  };
}
beforeEach(() => {
  sql = new DatabaseSync(':memory:');
  for (const file of readdirSync(new URL('../migrations/', import.meta.url)).sort())
    sql.exec(readFileSync(new URL('../migrations/' + file, import.meta.url), 'utf8'));
  sql.exec(
    "INSERT INTO creator_applications(subject,email,display_name,credentials,teaching_video_url,status) VALUES('creator','creator@example.com','Creator','Real evidence','https://example.com/video','approved')"
  );
  cookies.clear();
  cookies.set('__Host-pcn_access', 'admin-token');
  verify.mockResolvedValue({ subject: 'admin', email: 'admin@example.com' });
});
afterEach(() => sql.close());
it('starts a bounded support session and writes a network under the target, retaining the administrator audit', async () => {
  const response = await POST(
    event('/api/impersonation', {
      email: 'creator@example.com',
      reason: 'Verify invited creator onboarding'
    })
  );
  expect(response.status).toBe(201);
  expect(cookies.has('__Host-pcn_impersonation')).toBe(true);
  const e = event('/api/networks', { name: 'Creator practice', slug: 'creator-practice' });
  const result = await handle({ event: e, resolve: createNetwork } as any);
  expect(result.status).toBe(201);
  expect(e.locals.identity.subject).toBe('creator');
  expect(
    sql.prepare("SELECT owner_id FROM networks WHERE slug='creator-practice'").get()?.owner_id
  ).toBe('creator');
  expect(
    sql.prepare('SELECT actor_subject,target_subject,status FROM impersonation_requests').all()
  ).toContainEqual(
    expect.objectContaining({ actor_subject: 'admin', target_subject: 'creator', status: 201 })
  );
});
it('refuses an administrator tab write after another tab starts impersonation', async () => {
  await POST(
    event('/api/impersonation', { email: 'creator@example.com', reason: 'Verify onboarding' })
  );
  const e = event('/api/networks', { name: 'Wrong tab', slug: 'wrong-tab' });
  e.request.headers.delete('X-PCN-Support-Session');
  const resolve = vi.fn(async () => new Response('unsafe'));
  expect((await handle({ event: e, resolve } as any)).status).toBe(409);
  expect(resolve).not.toHaveBeenCalled();
});
it('never inherits platform admin privileges or another creator network', async () => {
  await POST(
    event('/api/impersonation', { email: 'creator@example.com', reason: 'Check authorization' })
  );
  const e = event('/api/creators/review', { subject: 'creator', status: 'approved' });
  const resolve = vi.fn(async () => new Response('unsafe'));
  expect((await handle({ event: e, resolve } as any)).status).toBe(403);
  expect(resolve).not.toHaveBeenCalled();
  const read = event('/api/admin');
  await handle({ event: read, resolve: async () => new Response('ok') } as any);
  expect(read.locals.identity.role).toBe('blocked');
});
it('blocks financial and unknown write paths before execution', async () => {
  await POST(
    event('/api/impersonation', { email: 'creator@example.com', reason: 'Check protected actions' })
  );
  for (const path of [
    '/api/networks/demo/billing',
    '/api/networks/demo/seller',
    '/api/networks/demo/assets/asset/purchase',
    '/api/support',
    '/api/creators/review',
    '/api/login',
    '/api/new-dangerous-action'
  ]) {
    sql.exec(
      "INSERT OR IGNORE INTO networks(id,slug,owner_id,name) VALUES('demo','demo','creator','Demo')"
    );
    const resolve = vi.fn(async () => new Response('unsafe'));
    expect((await handle({ event: event(path, {}), resolve } as any)).status).toBe(403);
    expect(resolve).not.toHaveBeenCalled();
  }
});
it('fails closed on expiry, administrator revocation, target revocation and audit failure', async () => {
  await POST(
    event('/api/impersonation', { email: 'creator@example.com', reason: 'Check fail closed' })
  );
  const resolve = vi.fn(async () => new Response('unsafe'));
  const revoked = event('/api/networks', {});
  revoked.platform.env.PCN_ADMIN_EMAILS = 'other@example.com';
  expect((await handle({ event: revoked, resolve } as any)).status).toBe(401);
  const inactive = event('/api/networks', {});
  inactive.fetch = vi.fn(async (url: string) =>
    url.endsWith('/users/me')
      ? new Response(
          JSON.stringify({ id: 'admin', email: 'admin@example.com', email_verified: true })
        )
      : new Response('', { status: 404 })
  );
  expect((await handle({ event: inactive, resolve } as any)).status).toBe(503);
  sql.exec('DROP TABLE impersonation_requests');
  expect((await handle({ event: event('/api/networks', {}), resolve } as any)).status).toBe(503);
  sql.exec('UPDATE impersonation_sessions SET expires_at=0');
  expect((await handle({ event: event('/api/networks', {}), resolve } as any)).status).toBe(401);
  expect(resolve).not.toHaveBeenCalled();
});
it('stops the target session, restores the original actor and rejects stale target writes', async () => {
  await POST(
    event('/api/impersonation', {
      email: 'creator@example.com',
      reason: 'Check return to administrator'
    })
  );
  const stale = event('/api/networks', {});
  expect((await POST(event('/api/impersonation', { action: 'stop' }))).status).toBe(200);
  expect(cookies.has('__Host-pcn_impersonation')).toBe(false);
  expect(
    sql.prepare('SELECT revoked_at FROM impersonation_sessions').get()?.revoked_at
  ).toBeTruthy();
  const resolve = vi.fn(async () => new Response('ok'));
  expect((await handle({ event: stale, resolve } as any)).status).toBe(409);
  const normal = event('/dashboard');
  await handle({ event: normal, resolve } as any);
  expect(normal.locals.identity.subject).toBe('admin');
});
it('requires an administrator, a reason, same origin and rejects nesting', async () => {
  const ordinary = event('/api/impersonation', {
    email: 'creator@example.com',
    reason: 'Check forbidden start'
  });
  ordinary.locals.identity = { subject: 'creator', email: 'creator@example.com', role: 'admin' };
  expect((await POST(ordinary)).status).toBe(403);
  expect(
    (await POST(event('/api/impersonation', { email: 'creator@example.com', reason: 'short' })))
      .status
  ).toBe(400);
  const cross = event('/api/impersonation', {
    email: 'creator@example.com',
    reason: 'Cross origin start'
  });
  cross.request.headers.set('origin', 'https://evil.example');
  expect((await POST(cross)).status).toBe(403);
  await POST(
    event('/api/impersonation', { email: 'creator@example.com', reason: 'Valid support request' })
  );
  expect(
    (
      await POST(
        event('/api/impersonation', {
          email: 'creator@example.com',
          reason: 'Nested support request'
        })
      )
    ).status
  ).toBe(409);
});
it('binds the opaque session to its original actor and live target subject', async () => {
  await POST(
    event('/api/impersonation', { email: 'creator@example.com', reason: 'Verify session binding' })
  );
  const resolve = vi.fn(async () => new Response('unsafe'));
  const changed = event('/api/networks', {});
  changed.fetch = vi.fn(
    async (url: string) =>
      new Response(
        JSON.stringify(
          url.endsWith('/users/me')
            ? { id: 'admin', email: 'admin@example.com', email_verified: true }
            : { id: 'replacement', email: 'creator@example.com', email_verified: true }
        )
      )
  );
  expect((await handle({ event: changed, resolve } as any)).status).toBe(403);
  sql.exec("UPDATE impersonation_sessions SET actor_subject='another-admin'");
  expect((await handle({ event: event('/api/networks', {}), resolve } as any)).status).toBe(401);
  expect(resolve).not.toHaveBeenCalled();
});
it('preserves a committed creator write when audit outcome persistence fails', async () => {
  await POST(
    event('/api/impersonation', {
      email: 'creator@example.com',
      reason: 'Verify committed response'
    })
  );
  const e = event('/api/networks', { name: 'Committed draft', slug: 'committed-draft' });
  const prepare = e.platform.env.DB.prepare;
  e.platform.env.DB.prepare = (query: string) =>
    query === 'UPDATE impersonation_requests SET status=? WHERE id=?'
      ? {
          bind: () => ({
            run: async () => {
              throw new Error('transient outcome failure');
            }
          })
        }
      : prepare(query);
  expect((await handle({ event: e, resolve: createNetwork } as any)).status).toBe(201);
  expect(
    sql.prepare("SELECT owner_id FROM networks WHERE slug='committed-draft'").get()?.owner_id
  ).toBe('creator');
  expect(sql.prepare('SELECT status FROM impersonation_requests').get()?.status).toBeNull();
});
