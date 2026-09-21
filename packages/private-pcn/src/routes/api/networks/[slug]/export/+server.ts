import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { publicNetwork } from '$lib/server/networks';
export const GET: RequestHandler = async ({ locals, platform }) => {
  if (!locals.identity || !locals.network || locals.network.owner_id !== locals.identity.subject)
    return json({ error: 'Network owner access required.' }, { status: 403 });
  if (!platform?.env.DB) return json({ error: 'Export unavailable.' }, { status: 503 });
  const db = platform.env.DB;
  const id = locals.network.id;
  const [videos, members, receipts, assets, releases, lessons] = await Promise.all([
    db
      .prepare(
        'SELECT id,title,description,series,visibility,access,ingest_status,duration,created_at,updated_at FROM videos WHERE network_id=? ORDER BY created_at'
      )
      .bind(id)
      .all(),
    db
      .prepare(
        'SELECT email,active,created_at,updated_at FROM members WHERE network_id=? ORDER BY email'
      )
      .bind(id)
      .all(),
    db
      .prepare(
        'SELECT action,target,created_at FROM receipts WHERE network_id=? ORDER BY created_at'
      )
      .bind(id)
      .all(),
    db
      .prepare(
        'SELECT id,title,kind,summary,price_cents,visibility,audience,created_at,updated_at FROM builder_assets WHERE network_id=? ORDER BY created_at,id'
      )
      .bind(id)
      .all(),
    db
      .prepare(
        'SELECT id,asset_id,version,manifest,sha256,size_bytes,created_at FROM asset_releases WHERE network_id=? ORDER BY rowid'
      )
      .bind(id)
      .all<{
        id: string;
        asset_id: string;
        version: string;
        manifest: string;
        sha256: string;
        size_bytes: number;
        created_at: string;
      }>(),
    db
      .prepare(
        'SELECT video_id,outcome,prerequisites,tools,transcript,practice,release_id,updated_at FROM lesson_material WHERE network_id=? ORDER BY video_id'
      )
      .bind(id)
      .all()
  ]);
  return json(
    {
      schemaVersion: 3,
      exportedAt: new Date().toISOString(),
      network: publicNetwork(locals.network),
      sessions: videos.results,
      lessonMaterial: lessons.results,
      members: members.results,
      activity: receipts.results,
      assets: assets.results,
      releases: releases.results.map(({ manifest, ...release }) => ({
        ...release,
        manifest: JSON.parse(manifest)
      })),
      media:
        'This export contains network and asset metadata, release documentation and membership records. It does not contain video files or ZIP packages. Download each package from its asset page and keep your original files as backups.'
    },
    {
      headers: {
        'Content-Disposition': `attachment; filename="${locals.network.slug}-network.json"`,
        'Cache-Control': 'private, no-store'
      }
    }
  );
};
