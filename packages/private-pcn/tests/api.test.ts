import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '../src/routes/api/[...path]/+server';
import { GET as listNetworks, POST as createNetwork } from '../src/routes/api/networks/+server';

import { GET as exportNetwork } from '../src/routes/api/networks/[slug]/export/+server';
import { POST as saveSettings } from '../src/routes/api/networks/[slug]/settings/+server';
let sqlite: DatabaseSync;
let remote: ReturnType<typeof vi.fn>;
function statement(sql: string, values: unknown[] = []) {
  return {
    bind: (...args: unknown[]) => statement(sql, args),
    first: async () => sqlite.prepare(sql).get(...(values as any[])),
    all: async () => ({ results: sqlite.prepare(sql).all(...(values as any[])) }),
    run: async () => {
      const result = sqlite.prepare(sql).run(...(values as any[]));
      return { meta: { changes: result.changes } };
    }
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
  sqlite.exec(
    readFileSync(new URL('../migrations/0002_network_ownership.sql', import.meta.url), 'utf8')
  );
  sqlite.exec(
    readFileSync(new URL('../migrations/0003_resource_limits.sql', import.meta.url), 'utf8')
  );
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

describe('network ownership isolation', () => {
  const network = (id: string, owner: string) => {
    sqlite
      .prepare(
        "INSERT INTO networks(id,slug,owner_id,name,status,access_model) VALUES(?,?,?,?,'active','preview')"
      )
      .run(id, id, owner, id);
    return { id, slug: id, owner_id: owner, name: id, status: 'active', access_model: 'preview' };
  };
  it('does not expose or mutate another network through a guessed video id', async () => {
    const a = network('alpha', 'owner-a');
    network('bravo', 'owner-b');
    seed('other-private');
    sqlite.prepare("UPDATE videos SET network_id='bravo' WHERE id='other-private'").run();
    for (const path of ['playback', 'videos/status', 'videos/publish']) {
      const e = event(
        path,
        { id: 'other-private', visibility: 'published', access: 'public' },
        'admin'
      );
      e.locals.network = a;
      expect((await POST(e)).status).toBe(404);
    }
    const e = event('admin', undefined, 'admin');
    e.locals.network = a;
    expect((await (await GET(e)).json()).videos).toEqual([]);
    expect(remote).not.toHaveBeenCalled();
  });
  it('scopes invitations to the selected network', async () => {
    const a = network('alpha', 'owner-a');
    const b = network('bravo', 'owner-b');
    const e = event('members', { email: 'same@example.com', active: true }, 'admin');
    e.locals.network = a;
    await POST(e);
    e.locals.network = b;
    e.request = new Request(e.request.url, {
      method: 'POST',
      headers: { origin: 'https://private.createsomething.agency' },
      body: JSON.stringify({ email: 'same@example.com', active: false })
    });
    await POST(e);
    expect(
      sqlite.prepare('SELECT network_id,active FROM members ORDER BY network_id').all()
    ).toEqual([
      { network_id: 'alpha', active: 1 },
      { network_id: 'bravo', active: 0 }
    ]);
  });
  it('assigns ownership from verified identity and never accepts client activation', async () => {
    const e = event(
      'networks',
      { name: 'Builders', slug: 'builders', owner_id: 'attacker', status: 'active' },
      'blocked'
    );
    expect((await createNetwork(e)).status).toBe(201);
    const saved = sqlite
      .prepare('SELECT owner_id,status FROM networks WHERE slug=?')
      .get('builders');
    expect(saved).toEqual({ owner_id: 'fixture-user', status: 'draft' });
    const other = event('networks', undefined, 'blocked');
    other.locals.identity.subject = 'someone-else';
    expect((await (await listNetworks(other)).json()).networks).toEqual([]);
  });
  it('requires authentication to reserve a network and handles repeated creation without duplication', async () => {
    const body = { name: 'Builders', slug: 'builders' };
    expect((await createNetwork(event('networks', body))).status).toBe(401);
    expect((await createNetwork(event('networks', body, 'blocked'))).status).toBe(201);
    expect((await createNetwork(event('networks', body, 'blocked'))).status).toBe(200);
    const e = event('networks', body, 'blocked');
    e.locals.identity.subject = 'other';
    expect((await createNetwork(e)).status).toBe(409);
  });
});

describe('owner settings and migration continuity', () => {
  it('preserves original memberships, videos and evidence in the default network', () => {
    const legacy = new DatabaseSync(':memory:');
    try {
      legacy.exec(
        readFileSync(new URL('../migrations/0001_private_pcn.sql', import.meta.url), 'utf8')
      );
      legacy.exec(
        "INSERT INTO members(email,active) VALUES('existing@example.com',0); INSERT INTO videos(id,stream_uid,title) VALUES('v','uid','Existing'); INSERT INTO receipts(id,actor,action,target) VALUES('r','owner','publish','v'); INSERT INTO playback_events(id,video_id) VALUES('p','v');"
      );
      legacy.exec(
        readFileSync(new URL('../migrations/0002_network_ownership.sql', import.meta.url), 'utf8')
      );
      expect(legacy.prepare('SELECT email,active,network_id FROM members').get()).toEqual({
        email: 'existing@example.com',
        active: 0,
        network_id: 'default'
      });
      for (const table of ['videos', 'receipts', 'playback_events'])
        expect(legacy.prepare(`SELECT network_id FROM ${table}`).get()?.network_id).toBe('default');
    } finally {
      legacy.close();
    }
  });
  it('closes only the selected network previews and does not reopen them implicitly', async () => {
    sqlite
      .prepare(
        "INSERT INTO networks(id,slug,owner_id,name,status,access_model) VALUES('alpha','alpha','fixture-user','Alpha','active','preview')"
      )
      .run();
    seed('alpha-video', 'public');
    seed('default-preview', 'public');
    sqlite.prepare("UPDATE videos SET network_id='alpha' WHERE id='alpha-video'").run();
    const e = event(
      'settings',
      { name: 'New name', description: 'Technical research', access_model: 'members' },
      'admin'
    );
    e.locals.network = { id: 'alpha', owner_id: 'fixture-user' };
    expect((await saveSettings(e)).status).toBe(200);
    expect(sqlite.prepare("SELECT access FROM videos WHERE id='alpha-video'").get()?.access).toBe(
      'members'
    );
    expect(
      sqlite.prepare("SELECT access FROM videos WHERE id='default-preview'").get()?.access
    ).toBe('public');
    e.request = event(
      'settings',
      { name: 'New name', description: 'Technical research', access_model: 'preview' },
      'admin'
    ).request;
    expect((await saveSettings(e)).status).toBe(200);
    expect(sqlite.prepare("SELECT access FROM videos WHERE id='alpha-video'").get()?.access).toBe(
      'members'
    );
    expect(
      sqlite.prepare("SELECT COUNT(*) AS count FROM receipts WHERE network_id='alpha'").get()?.count
    ).toBe(2);
  });
  it('denies nonowners and cross-origin settings changes', async () => {
    const e = event(
      'settings',
      { name: 'Changed', description: '', access_model: 'members' },
      'admin'
    );
    e.locals.network = { id: 'default', owner_id: 'someone-else' };
    expect((await saveSettings(e)).status).toBe(403);
    e.locals.network.owner_id = 'fixture-user';
    e.request = event('settings', {}, 'admin', 'https://other.example').request;
    expect((await saveSettings(e)).status).toBe(403);
  });
});

describe('atomic resource capacity', () => {
  it('limits active members but allows revocation and replacement', async () => {
    const insert = sqlite.prepare('INSERT INTO members(network_id,email) VALUES(?,?)');
    for (let i = 0; i < 100; i++) insert.run('default', `member${i}@example.com`);
    expect(
      (await POST(event('members', { email: 'overflow@example.com', active: true }, 'admin')))
        .status
    ).toBe(409);
    expect(
      (await POST(event('members', { email: 'member0@example.com', active: true }, 'admin'))).status
    ).toBe(200);
    expect(
      (await POST(event('members', { email: 'member0@example.com', active: false }, 'admin')))
        .status
    ).toBe(200);
    expect(
      (await POST(event('members', { email: 'replacement@example.com', active: true }, 'admin')))
        .status
    ).toBe(200);
    expect(
      sqlite.prepare('SELECT COUNT(*) AS count FROM members WHERE active=1').get()?.count
    ).toBe(100);
  });
  it('reserves the last upload slot before any provider call and retains uncertain outcomes', async () => {
    for (let i = 0; i < 19; i++) seed(`stored-${i}`);
    let release: () => void = () => {};
    remote.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          release = () => reject(new Error('unknown provider outcome'));
        })
    );
    const first = POST(event('uploads', { title: 'Last slot', size: 123 }, 'admin'));
    await vi.waitFor(() => expect(remote).toHaveBeenCalledTimes(1));
    expect(
      (await POST(event('uploads', { title: 'Concurrent overflow', size: 123 }, 'admin'))).status
    ).toBe(409);
    release();
    expect((await first).status).toBe(503);
    expect(sqlite.prepare('SELECT state FROM upload_reservations').get()?.state).toBe('uncertain');
  });
});

describe('self-service recovery and data ownership', () => {
  it('archives before provider deletion and retains the record when the result is uncertain', async () => {
    seed('remove-me');
    remote.mockRejectedValue(new Error('timeout'));
    expect(
      (
        await POST(
          event('videos/delete', { id: 'remove-me', title: 'remove-me', confirm: true }, 'admin')
        )
      ).status
    ).toBe(503);
    expect(
      sqlite.prepare("SELECT visibility FROM videos WHERE id='remove-me'").get()?.visibility
    ).toBe('archived');
    remote.mockResolvedValue(new Response(null, { status: 404 }));
    expect(
      (
        await POST(
          event('videos/delete', { id: 'remove-me', title: 'remove-me', confirm: true }, 'admin')
        )
      ).status
    ).toBe(200);
    expect(sqlite.prepare("SELECT * FROM videos WHERE id='remove-me'").get()).toBeUndefined();
  });
  it('requires explicit deletion confirmation and denies another network asset', async () => {
    seed('keep');
    expect((await POST(event('videos/delete', { id: 'keep' }, 'admin'))).status).toBe(400);
    const e = event('videos/delete', { id: 'keep', title: 'keep', confirm: true }, 'admin');
    e.locals.network = { id: 'other' };
    expect((await POST(e)).status).toBe(404);
    expect(remote).not.toHaveBeenCalled();
  });
  it('reconciles an uncertain upload only from matching signed provider metadata', async () => {
    sqlite
      .prepare(
        "INSERT INTO upload_reservations(id,network_id,title,state,created_at) VALUES('retry','default','Recovered','uncertain','2020-01-01 00:00:00')"
      )
      .run();
    remote.mockResolvedValue(
      Response.json({
        success: true,
        result: [
          {
            uid: 'recovered-uid',
            creator: 'default',
            requireSignedURLs: true,
            meta: { network: 'default', videoId: 'retry' }
          }
        ]
      })
    );
    expect((await POST(event('uploads/reconcile', { id: 'retry' }, 'admin'))).status).toBe(200);
    expect(sqlite.prepare("SELECT access,visibility FROM videos WHERE id='retry'").get()).toEqual({
      access: 'members',
      visibility: 'draft'
    });
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM upload_reservations').get()?.count).toBe(
      0
    );
  });
  it('exports only owner-scoped metadata without provider credentials or originals', async () => {
    sqlite
      .prepare(
        "INSERT INTO networks(id,slug,owner_id,name) VALUES('alpha','alpha','fixture-user','Alpha')"
      )
      .run();
    seed('ours');
    seed('theirs');
    sqlite.prepare("UPDATE videos SET network_id='alpha' WHERE id='ours'").run();
    const e = event('export', undefined, 'admin');
    e.locals.network = { id: 'alpha', slug: 'alpha', owner_id: 'fixture-user' };
    const response = await exportNetwork(e);
    const data = await response.json();
    expect(data.sessions.map((v: any) => v.id)).toEqual(['ours']);
    expect(JSON.stringify(data)).not.toContain('private-uid');
    expect(response.headers.get('Content-Disposition')).toContain('attachment');
    e.locals.identity.subject = 'other';
    expect((await exportNetwork(e)).status).toBe(403);
  });
});
