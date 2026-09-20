import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { POST as saveAsset } from '../src/routes/api/networks/[slug]/assets/[id]/+server';
import { POST as create } from '../src/routes/api/networks/[slug]/assets/+server';
import { POST as upload } from '../src/routes/api/networks/[slug]/assets/[id]/release/+server';
import { POST as recover } from '../src/routes/api/networks/[slug]/assets/[id]/recover/+server';
import { GET as download } from '../src/routes/api/networks/[slug]/assets/[id]/download/+server';
import { load as detail } from '../src/routes/n/[slug]/assets/[id]/+page.server';
import { load as collection } from '../src/routes/collection/+page.server';
import { canBrowseAsset, releaseView } from '../src/lib/server/builder-assets';
import { priceCents, validateManifest } from '../src/lib/assets';
import { safeReturnPath } from '../src/lib/return-path';
let sql: DatabaseSync;
let objects: Map<string, ArrayBuffer>;
const network = {
  id: 'net-a',
  slug: 'builder-a',
  owner_id: 'owner-a',
  name: 'Builder A',
  description: '',
  format: 'academy',
  access_model: 'preview',
  status: 'active'
};
const manifest = {
  runtimes: 'Runtime 1.0',
  requirements: 'Node 22; no paid services',
  permissions: 'Reads the selected repository',
  license: 'Personal use; no redistribution',
  install: 'Private installation content',
  verify: 'Run a local check',
  uninstall: 'Remove the configuration',
  changes: 'Initial release',
  support: 'support@example.com; contact for refund review'
};
function statement(query: string, values: any[] = []): any {
  return {
    bind: (...args: any[]) => statement(query, args),
    first: async () => sql.prepare(query).get(...values) || null,
    all: async () => ({ results: sql.prepare(query).all(...values) }),
    run: async () => ({ meta: { changes: sql.prepare(query).run(...values).changes } })
  };
}
function event(
  body?: unknown,
  identity: any = { subject: 'owner-a', email: 'owner@example.com', role: 'admin' }
): any {
  return {
    locals: { network: { ...network }, identity },
    params: { slug: network.slug, id: 'asset-a' },
    url: new URL(
      'https://private.createsomething.agency/api/networks/builder-a/assets/asset-a/download?release=release-a'
    ),
    request: new Request('https://private.createsomething.agency/api/networks/builder-a/assets', {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        Origin: 'https://private.createsomething.agency',
        'Content-Type': 'application/json'
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    }),
    platform: {
      env: {
        DB: {
          prepare: statement,
          batch: async (statements: any[]) => {
            sql.exec('BEGIN');
            try {
              const result = [];
              for (const s of statements) result.push(await s.run());
              sql.exec('COMMIT');
              return result;
            } catch (e) {
              sql.exec('ROLLBACK');
              throw e;
            }
          }
        },
        ASSET_PACKAGES: {
          head: vi.fn(async (key: string) =>
            objects.has(key)
              ? {
                  size: objects.get(key)!.byteLength,
                  customMetadata: {
                    sha256: sql
                      .prepare('SELECT sha256 FROM asset_uploads WHERE object_key=?')
                      .get(key)?.sha256
                  }
                }
              : null
          ),
          put: vi.fn(async (key: string, bytes: ArrayBuffer) => {
            objects.set(key, bytes);
          }),
          get: vi.fn(async (key: string) =>
            objects.has(key) ? { body: objects.get(key), size: objects.get(key)!.byteLength } : null
          ),
          delete: vi.fn(async (key: string) => {
            objects.delete(key);
          })
        }
      }
    }
  };
}
function seedAsset() {
  sql
    .prepare(
      'INSERT INTO builder_assets(id,network_id,title,kind,summary,price_cents,audience) VALUES(?,?,?,?,?,?,?)'
    )
    .run('asset-a', 'net-a', 'Review skill', 'skill', 'Review repository code', 1900, 'public');
}
function seedRelease() {
  objects.set('net-a/asset-a/release-a.zip', new Uint8Array([80, 75, 3, 4]).buffer);
  sql
    .prepare(
      'INSERT INTO asset_releases(id,network_id,asset_id,version,manifest,object_key,sha256,size_bytes) VALUES(?,?,?,?,?,?,?,?)'
    )
    .run(
      'release-a',
      'net-a',
      'asset-a',
      '1.0.0',
      JSON.stringify(manifest),
      'net-a/asset-a/release-a.zip',
      'a'.repeat(64),
      4
    );
}
function grant(buyer = 'buyer-a') {
  sql
    .prepare(
      "INSERT INTO asset_entitlements(id,network_id,asset_id,release_id,buyer_id,source,status) VALUES(?,?,?,?,?,'free','active')"
    )
    .run('grant-a', 'net-a', 'asset-a', 'release-a', buyer);
}
function uploadEvent(version = '1.0.0') {
  const e = event();
  const form = new FormData();
  form.set('version', version);
  form.set('manifest', JSON.stringify(manifest));
  form.set('package', new File([new Uint8Array([80, 75, 3, 4])], 'skill.zip'));
  e.request = new Request(
    'https://private.createsomething.agency/api/networks/builder-a/assets/asset-a/release',
    { method: 'POST', headers: { Origin: 'https://private.createsomething.agency' }, body: form }
  );
  return e;
}
beforeEach(() => {
  sql = new DatabaseSync(':memory:');
  sql.exec('PRAGMA foreign_keys=ON');
  for (const name of [
    '0001_private_pcn.sql',
    '0002_network_ownership.sql',
    '0006_builder_assets.sql',
    '0004_subscriptions.sql',
    '0007_builder_commerce.sql',
    '0008_creator_admission.sql',
    '0010_company_support.sql',
    '0009_impact.sql'
  ])
    sql.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8'));
  sql
    .prepare(
      'INSERT INTO networks(id,slug,owner_id,name,format,access_model,status) VALUES(?,?,?,?,?,?,?)'
    )
    .run('net-a', 'builder-a', 'owner-a', 'Builder A', 'academy', 'preview', 'active');
  objects = new Map();
});
afterEach(() => {
  sql.close();
});
describe('builder-owned asset drafts and releases', () => {
  it('ignores forged owner/status and converts exact decimal price on the server', async () => {
    const response = await create(
      event({
        title: 'Review',
        kind: 'skill',
        summary: 'A reusable technique',
        price: '19.95',
        audience: 'members',
        network_id: 'other',
        visibility: 'published'
      })
    );
    expect(response.status).toBe(201);
    const saved = sql.prepare('SELECT * FROM builder_assets').get();
    expect(saved).toMatchObject({ network_id: 'net-a', visibility: 'draft', price_cents: 1995 });
  });
  it('allows draft edits without changing a buyer’s release and rejects premature publication', async () => {
    seedAsset();
    seedRelease();
    const body = {
      title: 'Updated title',
      summary: 'Updated scope',
      kind: 'skill',
      price: '25.00',
      audience: 'members',
      visibility: 'archived'
    };
    expect((await saveAsset(event(body))).status).toBe(200);
    expect(sql.prepare('SELECT price_cents,visibility FROM builder_assets').get()).toMatchObject({
      price_cents: 2500,
      visibility: 'archived'
    });
    expect(sql.prepare('SELECT manifest FROM asset_releases').get()?.manifest).toBe(
      JSON.stringify(manifest)
    );
    expect((await saveAsset(event({ ...body, visibility: 'published' }))).status).toBe(503);
  });
  it('rejects nonowners and foreign-origin mutations', async () => {
    await expect(create(event({}, { subject: 'buyer-a', role: 'member' }))).rejects.toMatchObject({
      status: 403
    });
    const e = event({});
    e.request = new Request(e.request, { headers: { Origin: 'https://evil.example' } });
    expect((await create(e)).status).toBe(403);
  });
  it('saves private immutable packages and rejects version replacement', async () => {
    seedAsset();
    const e = uploadEvent();
    expect((await upload(e)).status).toBe(201);
    expect(objects.size).toBe(1);
    const release: any = sql.prepare('SELECT * FROM asset_releases').get();
    expect(release.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(() => sql.prepare("UPDATE asset_releases SET version='2.0.0'").run()).toThrow(
      'immutable_release'
    );
    expect((await upload(uploadEvent())).status).toBe(409);
    expect(objects.size).toBe(1);
  });
  it('enforces tenant ownership when uploading to a foreign asset ID', async () => {
    seedAsset();
    const e = uploadEvent();
    e.locals.network = { ...network, id: 'net-b', owner_id: 'owner-a' };
    expect((await upload(e)).status).toBe(404);
    expect(objects.size).toBe(0);
  });
  it('removes only the new object after atomic release-capacity rejection', async () => {
    seedAsset();
    for (let i = 0; i < 5; i++) expect((await upload(uploadEvent(`1.0.${i}`))).status).toBe(201);
    expect((await upload(uploadEvent('1.0.5'))).status).toBe(409);
    expect(objects.size).toBe(5);
    expect(sql.prepare('SELECT count(*) AS n FROM asset_releases').get()?.n).toBe(5);
  });
  it('recovers an uncertain object write without reuploading or freeing its reservation', async () => {
    seedAsset();
    const e = uploadEvent();
    e.platform.env.ASSET_PACKAGES.put.mockImplementation(
      async (key: string, bytes: ArrayBuffer) => {
        objects.set(key, bytes);
        throw new Error('response lost');
      }
    );
    expect((await upload(e)).status).toBe(503);
    expect(sql.prepare('SELECT count(*) AS n FROM asset_uploads').get()?.n).toBe(1);
    const rec = event({});
    expect((await recover(rec)).status).toBe(200);
    expect(sql.prepare('SELECT count(*) AS n FROM asset_releases').get()?.n).toBe(1);
    expect(sql.prepare('SELECT count(*) AS n FROM asset_uploads').get()?.n).toBe(0);
    expect(objects.size).toBe(1);
  });
  it('preserves missing uncertain uploads instead of permitting unbounded retries', async () => {
    seedAsset();
    const e = uploadEvent();
    e.platform.env.ASSET_PACKAGES.put.mockRejectedValue(new Error('uncertain'));
    expect((await upload(e)).status).toBe(503);
    const result = await recover(event({}));
    expect(await result.json()).toMatchObject({ recovered: 0, pending: 1 });
    expect((await upload(uploadEvent())).status).toBe(409);
  });
  it('does not publish or expose private installation content through public metadata', async () => {
    seedAsset();
    seedRelease();
    const row: any = sql.prepare('SELECT * FROM asset_releases').get();
    expect(releaseView(row, false).manifest.install).toBeNull();
    expect(releaseView(row, false)).not.toHaveProperty('object_key');
    await expect(detail(event(undefined, null))).rejects.toMatchObject({ status: 404 });
    sql.exec("UPDATE builder_assets SET visibility='published'");
    const data: any = await detail(event(undefined, null));
    expect(data.releases[0].manifest.install).toBeNull();
    expect(data.releases[0]).not.toHaveProperty('object_key');
  });
  it('respects network access even for a public listing and refuses cross-tenant metadata', () => {
    const asset: any = { network_id: 'net-a', visibility: 'published', audience: 'public' };
    expect(canBrowseAsset(asset, event().locals)).toBe(true);
    const e = event(undefined, null);
    expect(canBrowseAsset(asset, e.locals)).toBe(true);
    e.locals.network.access_model = 'members';
    expect(canBrowseAsset(asset, e.locals)).toBe(false);
    expect(canBrowseAsset({ ...asset, network_id: 'other' }, event().locals)).toBe(false);
  });
});
describe('buyer release entitlements', () => {
  it('requires an exact buyer/release entitlement, not network membership', async () => {
    seedAsset();
    seedRelease();
    grant();
    const buyer = { subject: 'buyer-a', role: 'blocked' };
    expect((await download(event(undefined, buyer))).status).toBe(200);
    expect((await download(event(undefined, { subject: 'buyer-b', role: 'member' }))).status).toBe(
      404
    );
    expect((await download(event(undefined, null))).status).toBe(401);
  });
  it('retains acquired archived releases without exposing other private releases', async () => {
    seedAsset();
    seedRelease();
    grant();
    const data: any = await detail(event(undefined, { subject: 'buyer-a', role: 'blocked' }));
    expect(data.releases).toHaveLength(1);
    expect(data.releases[0].manifest.install).toBe(manifest.install);
    sql.exec("UPDATE builder_assets SET visibility='archived'");
    expect((await download(event(undefined, { subject: 'buyer-a', role: 'blocked' }))).status).toBe(
      200
    );
  });
  it('revocation immediately denies delivery and collection is subject-scoped', async () => {
    seedAsset();
    seedRelease();
    grant();
    const e = event(undefined, { subject: 'buyer-a', role: 'blocked' });
    expect((await collection(e)).collection).toHaveLength(1);
    expect(
      (await collection(event(undefined, { subject: 'buyer-b', role: 'admin' }))).collection
    ).toHaveLength(0);
    sql.exec("UPDATE asset_entitlements SET status='revoked'");
    expect((await download(e)).status).toBe(404);
    await expect(detail(e)).rejects.toMatchObject({ status: 404 });
  });
  it('uses attachment delivery, no-store, and does not expose object keys', async () => {
    seedAsset();
    seedRelease();
    const result = await download(event());
    expect(result.headers.get('Content-Disposition')).toContain('attachment;');
    expect(result.headers.get('Cache-Control')).toBe('private, no-store');
    expect(result.headers.get('Location')).toBeNull();
    expect(new Uint8Array(await result.arrayBuffer())).toEqual(new Uint8Array([80, 75, 3, 4]));
  });
});
describe('intent-preserving onboarding and inputs', () => {
  it('returns buyers to exact assets and sellers to their workspace without open redirects', () => {
    for (const path of [
      '/start',
      '/collection',
      '/dashboard',
      '/n/builder-a/assets/asset-a',
      '/n/builder-a/assets'
    ])
      expect(safeReturnPath(path)).toBe(path);
    for (const path of [
      '//evil.example',
      'https://evil.example',
      '/n/abc/../settings',
      '/collection?next=//evil.example',
      '/n/abc/assets/a%2fb'
    ])
      expect(safeReturnPath(path)).toBe('/start');
  });
  it('rejects fractional cents, negative prices, missing permission/license/install details', () => {
    expect(priceCents('24.50')).toBe(2450);
    expect(priceCents('0')).toBe(0);
    for (const value of ['1.001', '-1', '1e2', '0.50', '10000', 1])
      expect(priceCents(value)).toBeNull();
    expect(validateManifest(manifest)).toEqual(manifest);
    expect(validateManifest({ ...manifest, permissions: '' })).toBeNull();
  });
});
