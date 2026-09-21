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
  sqlite.exec(
    readFileSync(new URL('../migrations/0006_builder_assets.sql', import.meta.url), 'utf8')
  );
  sqlite.exec(
    readFileSync(new URL('../migrations/0008_creator_admission.sql', import.meta.url), 'utf8')
  );
  sqlite.exec(
    readFileSync(new URL('../migrations/0010_company_support.sql', import.meta.url), 'utf8')
  );
  sqlite.exec(
    readFileSync(new URL('../migrations/0014_lesson_material.sql', import.meta.url), 'utf8')
  );
  sqlite.exec(
    readFileSync(new URL('../migrations/0015_guided_learning.sql', import.meta.url), 'utf8')
  );
  remote = vi.fn();
  vi.stubGlobal('fetch', remote);
});
afterEach(() => {
  sqlite.close();
  vi.unstubAllGlobals();
});

describe('API against migrated SQLite schema (supporting proof)', () => {
  it('does not expose archived, cross-network or suspended paths, or accept stale edits', async () => {
    seed('one');
    seed('two');
    const payload = {
      title: 'Scoped path',
      outcome: 'Apply a technique',
      prerequisites: '',
      estimated_minutes: 10,
      lesson_ids: ['one', 'two'],
      visibility: 'published'
    };
    const { id } = await (await POST(event('learning/paths/save', payload, 'admin'))).json();
    expect(
      (await POST(event('learning/paths/save', { ...payload, id, revision: 0 }, 'admin'))).status
    ).toBe(409);
    expect(
      (
        await POST(
          event('learning/paths/save', { ...payload, lesson_ids: ['one', 'one'] }, 'admin')
        )
      ).status
    ).toBe(400);
    expect((await POST(event('learning/paths/save', payload, 'member'))).status).toBe(403);
    expect(
      (await POST(event('learning/paths/save', payload, 'admin', 'https://evil.example'))).status
    ).toBe(403);
    const cross = event(`learning/paths/${id}`, undefined, 'admin');
    cross.locals.network = { id: 'other', status: 'active' };
    expect((await GET(cross)).status).toBe(404);
    const suspended = event(`learning/paths/${id}`, undefined, 'member');
    suspended.locals.network = { id: 'default', status: 'suspended' };
    expect((await GET(suspended)).status).toBe(404);
    sqlite.prepare("UPDATE videos SET visibility='archived' WHERE id='two'").run();
    expect((await GET(event(`learning/paths/${id}`, undefined, 'member'))).status).toBe(404);
    expect((await (await GET(event('learning/paths', undefined, 'member'))).json()).paths).toEqual(
      []
    );
  });
  it('rolls back path saves if the activity receipt cannot be persisted', async () => {
    seed('atomic-lesson');
    sqlite.exec(
      "CREATE TRIGGER receipt_failure BEFORE INSERT ON receipts WHEN NEW.action='learning_path.saved' BEGIN SELECT RAISE(ABORT,'receipt unavailable'); END;"
    );
    await expect(
      POST(
        event(
          'learning/paths/save',
          {
            title: 'Atomic path',
            outcome: 'Build',
            prerequisites: '',
            estimated_minutes: 5,
            lesson_ids: ['atomic-lesson'],
            visibility: 'draft'
          },
          'admin'
        )
      )
    ).rejects.toThrow('receipt unavailable');
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM learning_paths').get()?.count).toBe(0);
  });
  it('removes revoked lessons from resume and rejects cross-network or impersonated progress writes', async () => {
    seed('progress-lesson');
    sqlite.prepare('UPDATE videos SET duration=125 WHERE id=?').run('progress-lesson');
    const body = { id: 'progress-lesson', action: 'position', position: 40 };
    expect((await POST(event('learning/progress', body, 'member'))).status).toBe(200);
    const resume = await (await GET(event('learning/continue', undefined, 'member'))).json();
    expect(resume.lessons).toHaveLength(1);
    expect(JSON.stringify(resume)).not.toContain('fixture-user');
    const cross = event('learning/progress', body, 'member');
    cross.locals.network = { id: 'other', status: 'active' };
    expect((await POST(cross)).status).toBe(404);
    const support = event('learning/progress', body, 'admin');
    support.locals.impersonation = { id: 'support', invalid: false };
    expect((await POST(support)).status).toBe(404);
    const suspended = event('learning/continue', undefined, 'member');
    suspended.locals.network = { id: 'default', status: 'suspended' };
    expect((await (await GET(suspended)).json()).lessons).toEqual([]);
    expect(
      (await (await GET(event('learning/continue', undefined, 'blocked'))).json()).lessons
    ).toEqual([]);
    sqlite.prepare("UPDATE videos SET visibility='archived' WHERE id=?").run('progress-lesson');
    expect(
      (await (await GET(event('learning/continue', undefined, 'member'))).json()).lessons
    ).toEqual([]);
    expect((await POST(event('learning/progress', body, 'member'))).status).toBe(404);
  });
  it('persists personal resume and self-reported practice without sharing another member progress', async () => {
    seed('lesson');
    sqlite
      .prepare('INSERT INTO lesson_material(video_id,network_id,practice) VALUES(?,?,?)')
      .run('lesson', 'default', 'Verify an MCP tool');
    sqlite.prepare('UPDATE videos SET duration=125 WHERE id=?').run('lesson');
    const saved = await POST(
      event('learning/progress', { id: 'lesson', action: 'position', position: 42 }, 'member')
    );
    expect(saved.status).toBe(200);
    const viewed = await GET(event('lessons/lesson', undefined, 'member'));
    expect((await viewed.json()).progress.position).toBe(42);
    const other = event('lessons/lesson', undefined, 'member');
    other.locals.identity.subject = 'another-member';
    expect((await (await GET(other)).json()).progress).toBeNull();
    expect(
      (await POST(event('learning/progress', { id: 'lesson', action: 'practice' }, 'member')))
        .status
    ).toBe(200);
    const progress = (await (await GET(event('lessons/lesson', undefined, 'member'))).json())
      .progress;
    expect(progress.practice_started_at).toBeTruthy();
    expect(progress.watched_at).toBeNull();
    expect(
      (
        await POST(
          event('learning/progress', { id: 'lesson', action: 'position', position: 999 }, 'member')
        )
      ).status
    ).toBe(400);
    expect(
      (
        await POST(
          event('learning/progress', { id: 'lesson', action: 'position', position: 5 }, 'blocked')
        )
      ).status
    ).toBe(404);
  });
  it('lets a creator publish an ordered path and members read only its authorized lessons', async () => {
    seed('first');
    seed('second');
    const create = await POST(
      event(
        'learning/paths/save',
        {
          title: 'Connect an MCP',
          outcome: 'Verify scoped tool access',
          prerequisites: 'An MCP client',
          estimated_minutes: 20,
          lesson_ids: ['second', 'first'],
          visibility: 'published'
        },
        'admin'
      )
    );
    expect(create.status).toBe(200);
    const { id } = await create.json();
    const view = await GET(event(`learning/paths/${id}`, undefined, 'member'));
    expect(view.status).toBe(200);
    const body = await view.json();
    expect(body.lessons.map((v: any) => v.id)).toEqual(['second', 'first']);
    expect(JSON.stringify(body)).not.toContain('private-uid');
    expect((await GET(event(`learning/paths/${id}`))).status).toBe(404);
  });

  it('anonymous catalog omits member metadata, drafts and provider IDs', async () => {
    seed('private');
    seed('preview', 'public');
    seed('draft', 'public', 'draft');
    const response = await GET(event('videos'));
    const body = await response.json();
    expect(body.videos.map((v: any) => v.id)).toEqual(['preview']);
    expect(JSON.stringify(body)).not.toContain('private-uid');
  });
  it('serves a direct lesson only within its network and current publication access', async () => {
    seed('private');
    seed('public', 'public');
    seed('draft', 'public', 'draft');
    expect((await GET(event('lessons/private'))).status).toBe(404);
    expect((await GET(event('lessons/draft', undefined, 'member'))).status).toBe(404);
    const response = await GET(event('lessons/private', undefined, 'member'));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ video: { id: 'private' }, lesson: null });
    const cross = event('lessons/private', undefined, 'admin');
    cross.locals.network = { id: 'other', status: 'active' };
    expect((await GET(cross)).status).toBe(404);
    const suspended = event('lessons/public', undefined, 'member');
    suspended.locals.network = { id: 'default', status: 'suspended' };
    expect((await GET(suspended)).status).toBe(404);
    const body = await (await GET(event('lessons/public'))).text();
    expect(body).not.toContain('private-uid');
  });
  it('lets only the network admin save bounded lesson material with an audit receipt', async () => {
    seed('private');
    const details = {
      id: 'private',
      outcome: 'Build a safe MCP connection',
      prerequisites: 'A test workspace',
      tools: 'Claude Desktop',
      transcript: '<script>plain text</script>',
      practice: 'Audit one page',
      release_id: ''
    };
    expect((await POST(event('lessons/save', details, 'member'))).status).toBe(403);
    expect(
      (await POST(event('lessons/save', details, 'admin', 'https://other.example'))).status
    ).toBe(403);
    const cross = event('lessons/save', details, 'admin');
    cross.locals.network = { id: 'other', status: 'active' };
    expect((await POST(cross)).status).toBe(404);
    expect(
      (await POST(event('lessons/save', { ...details, outcome: 'x'.repeat(1001) }, 'admin'))).status
    ).toBe(400);
    expect(
      (await POST(event('lessons/save', { ...details, release_id: 'foreign-release' }, 'admin')))
        .status
    ).toBe(400);
    expect((await POST(event('lessons/save', details, 'admin'))).status).toBe(200);
    const result = await (await GET(event('lessons/private', undefined, 'member'))).json();
    expect(result.lesson).toMatchObject({
      outcome: details.outcome,
      transcript: details.transcript,
      practice: details.practice
    });
    expect(result.release).toBeNull();
    expect(result.releaseOptions).toEqual([]);
    expect(sqlite.prepare("SELECT action FROM receipts WHERE target='private'").get()?.action).toBe(
      'lesson.updated'
    );
  });
  it('links an exact release without leaking private asset metadata or granting entitlement', async () => {
    seed('public', 'public');
    sqlite.exec(
      "INSERT INTO builder_assets(id,network_id,title,kind,summary,price_cents,visibility,audience) VALUES('asset','default','Restricted skill','skill','Private details',0,'published','members')"
    );
    sqlite.exec(
      "INSERT INTO asset_releases(id,network_id,asset_id,version,manifest,object_key,sha256,size_bytes) VALUES('release','default','asset','1.2.3','{}','secret-key','hash',1)"
    );
    const body = {
      id: 'public',
      outcome: '',
      prerequisites: '',
      tools: '',
      transcript: '',
      practice: '',
      release_id: 'release'
    };
    expect((await POST(event('lessons/save', body, 'admin'))).status).toBe(200);
    const request = event('lessons/public');
    request.locals.network = {
      id: 'default',
      slug: 'create-something',
      status: 'active',
      access_model: 'preview'
    };
    const anonymous = await (await GET(request)).json();
    expect(anonymous.release).toBeNull();
    expect(anonymous.lesson.release_id).toBeNull();
    expect(JSON.stringify(anonymous)).not.toContain('Restricted skill');
    expect(anonymous.releaseOptions).toEqual([]);
    request.locals.identity = { role: 'member', subject: 'buyer', email: 'buyer@example.com' };
    const member = await (await GET(request)).json();
    expect(member.release).toEqual({
      id: 'release',
      asset_id: 'asset',
      version: '1.2.3',
      title: 'Restricted skill'
    });
    expect(JSON.stringify(member)).not.toContain('secret-key');
    expect(sqlite.prepare('SELECT COUNT(*) AS total FROM asset_entitlements').get()?.total).toBe(0);
    sqlite.exec("UPDATE builder_assets SET visibility='archived' WHERE id='asset'");
    expect((await (await GET(request)).json()).release).toBeNull();
    sqlite.exec(
      "INSERT INTO asset_entitlements(id,network_id,asset_id,release_id,buyer_id,source,status) VALUES('entitlement','default','asset','release','buyer','free','active')"
    );
    expect((await (await GET(request)).json()).release.id).toBe('release');
    sqlite.exec("UPDATE asset_entitlements SET status='revoked'");
    expect((await (await GET(request)).json()).release).toBeNull();
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
  it('requires creator approval before reserving a network, regardless of client claims', async () => {
    const response = await createNetwork(
      event(
        'networks',
        {
          name: 'Unreviewed',
          slug: 'unreviewed',
          approved: true
        },
        'blocked'
      )
    );
    expect(response.status).toBe(403);
    expect(
      sqlite.prepare("SELECT COUNT(*) AS count FROM networks WHERE slug='unreviewed'").get()?.count
    ).toBe(0);
  });

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
  const approve = (subject = 'fixture-user') =>
    sqlite
      .prepare(
        "INSERT INTO creator_applications(subject,email,display_name,credentials,teaching_video_url,status) VALUES(?, 'creator@example.com','Builder','Experience','https://example.com/video','approved')"
      )
      .run(subject);
  it('assigns ownership from verified identity and never accepts client activation', async () => {
    approve();
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
    approve();
    approve('other');
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
    for (const [id, network] of [
      ['asset-ours', 'alpha'],
      ['asset-theirs', 'default']
    ]) {
      sqlite
        .prepare(
          'INSERT INTO builder_assets(id,network_id,title,kind,summary,price_cents) VALUES(?,?,?,?,?,?)'
        )
        .run(id, network, id, 'skill', 'Useful technique', 1900);
      sqlite
        .prepare(
          'INSERT INTO asset_releases(id,network_id,asset_id,version,manifest,object_key,sha256,size_bytes) VALUES(?,?,?,?,?,?,?,?)'
        )
        .run(
          `release-${id}`,
          network,
          id,
          '1.0.0',
          JSON.stringify({ license: 'Personal use', install: 'Read the guide' }),
          `private-object-key/${id}`,
          'a'.repeat(64),
          4
        );
    }
    sqlite.exec(
      "INSERT INTO lesson_material(video_id,network_id,outcome) VALUES('ours','alpha','Our lesson outcome'),('theirs','default','Private other lesson')"
    );
    sqlite.exec(
      `INSERT INTO learning_paths(id,network_id,title,outcome,estimated_minutes,lesson_ids,visibility) VALUES('our-path','alpha','Our path','Build',10,'["ours"]','draft'),('their-path','default','Private other path','Build',10,'["theirs"]','draft'); INSERT INTO lesson_progress(network_id,subject,video_id,position) VALUES('alpha','learner-private-subject','ours',15)`
    );
    const e = event('export', undefined, 'admin');
    e.locals.network = { id: 'alpha', slug: 'alpha', owner_id: 'fixture-user' };
    const response = await exportNetwork(e);
    const data = await response.json();
    expect(data.lessonMaterial).toEqual([
      expect.objectContaining({ video_id: 'ours', outcome: 'Our lesson outcome' })
    ]);
    expect(JSON.stringify(data)).not.toContain('Private other lesson');
    expect(data.schemaVersion).toBe(4);
    expect(data.learningPaths).toEqual([
      expect.objectContaining({ title: 'Our path', lesson_ids: ['ours'] })
    ]);
    expect(JSON.stringify(data)).not.toContain('Private other path');
    expect(JSON.stringify(data)).not.toContain('learner-private-subject');
    expect(data).not.toHaveProperty('lessonProgress');
    expect(data.sessions.map((v: any) => v.id)).toEqual(['ours']);
    expect(data.assets.map((a: any) => a.id)).toEqual(['asset-ours']);
    expect(data.releases).toHaveLength(1);
    expect(data.releases[0]).toMatchObject({
      asset_id: 'asset-ours',
      manifest: { license: 'Personal use', install: 'Read the guide' }
    });
    expect(JSON.stringify(data)).not.toContain('private-object-key');
    expect(JSON.stringify(data)).not.toContain('asset-theirs');
    expect(JSON.stringify(data)).not.toContain('private-uid');
    expect(response.headers.get('Content-Disposition')).toContain('attachment');
    e.locals.identity.subject = 'other';
    expect((await exportNetwork(e)).status).toBe(403);
  });
});
it('does not turn a private company support network into a public creator storefront', async () => {
  sqlite
    .prepare(
      "INSERT INTO networks(id,slug,owner_id,name) VALUES('company','company','fixture-user','Company')"
    )
    .run();
  const e = event(
    'settings',
    { name: 'Company', description: 'Support project', access_model: 'preview' },
    'admin'
  );
  e.locals.network = { id: 'company', owner_id: 'fixture-user', kind: 'support' };
  expect((await saveSettings(e)).status).toBe(403);
});
