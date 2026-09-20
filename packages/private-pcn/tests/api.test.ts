import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '../src/routes/api/[...path]/+server';

let sqlite: DatabaseSync;
let remote: ReturnType<typeof vi.fn>;
function statement(sql: string, values: unknown[] = []) {
  return {
    bind: (...args: unknown[]) => statement(sql, args),
    first: async () => sqlite.prepare(sql).get(...(values as any[])),
    all: async () => ({ results: sqlite.prepare(sql).all(...(values as any[])) }),
    run: async () => sqlite.prepare(sql).run(...(values as any[]))
  };
}
function event(
  path: string,
  body?: unknown,
  role?: 'admin' | 'member' | 'blocked',
  origin = 'https://private.createsomething.agency'
) {
  const cookies = { get: vi.fn(), set: vi.fn(), delete: vi.fn() };
  return {
    params: { path },
    platform: {
      env: {
        DB: {
          prepare: statement,
          batch: async (statements: any[]) => {
            sqlite.exec('BEGIN');
            try {
              const result = [];
              for (const s of statements) result.push(await s.run());
              sqlite.exec('COMMIT');
              return result;
            } catch (e) {
              sqlite.exec('ROLLBACK');
              throw e;
            }
          }
        },
        CLOUDFLARE_ACCOUNT_ID: 'test-account',
        CLOUDFLARE_STREAM_API_TOKEN: 'test-fixture'
      }
    },
    locals: {
      identity: role ? { subject: 'fixture-user', email: 'member@example.com', role } : null
    },
    request: new Request(`https://private.createsomething.agency/api/${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { origin, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    }),
    cookies,
    fetch: remote
  } as any;
}
function seed(id: string, access = 'members', visibility = 'published', status = 'ready') {
  sqlite
    .prepare(
      'INSERT INTO videos(id, stream_uid, title, access, visibility, ingest_status) VALUES(?,?,?,?,?,?)'
    )
    .run(id, `${id}-private-uid`, id, access, visibility, status);
}
beforeEach(() => {
  sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../migrations/0001_private_pcn.sql', import.meta.url), 'utf8'));
  remote = vi.fn();
  vi.stubGlobal('fetch', remote);
});
afterEach(() => {
  sqlite.close();
  vi.unstubAllGlobals();
});

describe('API against migrated SQLite schema (supporting proof)', () => {
  it('anonymous catalog omits member metadata, drafts and provider IDs', async () => {
    seed('private');
    seed('preview', 'public');
    seed('draft', 'public', 'draft');
    const response = await GET(event('videos'));
    const body = await response.json();
    expect(body.videos.map((v: any) => v.id)).toEqual(['preview']);
    expect(JSON.stringify(body)).not.toContain('private-uid');
  });
  it('denies private playback before any provider call', async () => {
    seed('private');
    for (const role of [undefined, 'blocked'] as const) {
      expect((await POST(event('playback', { id: 'private' }, role))).status).toBe(404);
    }
    expect(remote).not.toHaveBeenCalled();
  });
  it('records a permitted playback grant and returns no original UID', async () => {
    seed('private');
    remote.mockResolvedValue(
      new Response(JSON.stringify({ success: true, result: { token: 'signed-test-token' } }))
    );
    const response = await POST(event('playback', { id: 'private' }, 'member'));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      hlsUrl: 'https://videodelivery.net/signed-test-token/manifest/video.m3u8'
    });
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM playback_events').get()?.count).toBe(1);
    const options = remote.mock.calls[0][1];
    expect(JSON.parse(options.body).exp).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 60);
  });
  it('requires same-origin admin authority for all writes', async () => {
    for (const path of ['uploads', 'members', 'videos/status', 'videos/publish']) {
      expect((await POST(event(path, {}, 'member'))).status).toBe(403);
      expect((await POST(event(path, {}, 'admin', 'https://other.example'))).status).toBe(403);
    }
    expect(remote).not.toHaveBeenCalled();
  });
  it('invites and revokes the same membership with durable receipts', async () => {
    await POST(event('members', { email: 'Member@Example.com', active: true }, 'admin'));
    await POST(event('members', { email: 'member@example.com', active: false }, 'admin'));
    expect(sqlite.prepare('SELECT active FROM members').get()?.active).toBe(0);
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM receipts').get()?.count).toBe(2);
  });
  it('does not publish unfinished uploads', async () => {
    seed('pending', 'members', 'draft', 'processing');
    const response = await POST(
      event('videos/publish', { id: 'pending', visibility: 'published', access: 'public' }, 'admin')
    );
    expect(response.status).toBe(409);
    expect(sqlite.prepare('SELECT visibility FROM videos').get()?.visibility).toBe('draft');
  });
  it('rejects provider readiness when original media is not signed', async () => {
    seed('pending', 'members', 'draft', 'processing');
    remote.mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, result: { readyToStream: true, requireSignedURLs: false } })
      )
    );
    expect((await POST(event('videos/status', { id: 'pending' }, 'admin'))).status).toBe(409);
    expect(sqlite.prepare('SELECT ingest_status FROM videos').get()?.ingest_status).toBe(
      'processing'
    );
  });
  it('creates uploads as private drafts regardless of client publication claims', async () => {
    remote.mockResolvedValue(
      new Response(null, {
        headers: {
          Location: 'https://upload.videodelivery.net/test',
          'stream-media-id': 'provider-uid'
        }
      })
    );
    const response = await POST(
      event(
        'uploads',
        { title: 'Test film', size: 12345, access: 'public', visibility: 'published' },
        'admin'
      )
    );
    expect(response.status).toBe(200);
    expect(sqlite.prepare('SELECT access,visibility FROM videos').get()).toEqual({
      access: 'members',
      visibility: 'draft'
    });
    expect(remote.mock.calls[0][1].headers['Upload-Metadata']).toContain('requiresignedurls');
  });
  it('does not expose administrator reports to anonymous visitors', async () => {
    expect((await GET(event('admin'))).status).toBe(403);
  });
  it('exchanges passwords only with the owning Identity service and never returns credentials', async () => {
    remote.mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'access-fixture',
          refresh_token: 'refresh-fixture',
          expires_in: 900
        })
      )
    );
    const e = event('login', { email: 'member@example.com', password: 'long-fixture-password' });
    const response = await POST(e);
    expect(await response.json()).toEqual({ success: true });
    expect(remote.mock.calls[0][0]).toBe('https://id.createsomething.space/v1/auth/login');
    expect(JSON.parse(remote.mock.calls[0][1].body).audience).toBe('agency');
    expect(e.cookies.set).toHaveBeenCalledWith(
      '__Host-pcn_access',
      'access-fixture',
      expect.objectContaining({ secure: true, httpOnly: true, sameSite: 'lax', path: '/' })
    );
    expect(e.cookies.set.mock.calls[0][2]).not.toHaveProperty('domain');
  });
});
