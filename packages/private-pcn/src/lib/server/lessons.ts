import type { D1Database } from '@cloudflare/workers-types';
import { canBrowseAsset, hasRelease } from './builder-assets';
import type { BuilderAsset, AssetRelease } from '$lib/assets';

export interface LessonMaterial {
  outcome: string;
  prerequisites: string;
  tools: string;
  transcript: string;
  practice: string;
  release_id: string | null;
}
export const lessonLimits = {
  outcome: 1000,
  prerequisites: 2000,
  tools: 1000,
  transcript: 40000,
  practice: 4000
};
export function parseLesson(body: Record<string, unknown>): LessonMaterial | null {
  const value: Record<string, string> = {};
  for (const [key, max] of Object.entries(lessonLimits)) {
    if (typeof body[key] !== 'string' || body[key].length > max) return null;
    value[key] = body[key].trim();
  }
  if (typeof body.release_id !== 'string' || body.release_id.length > 100) return null;
  return { ...value, release_id: body.release_id || null } as unknown as LessonMaterial;
}
export async function lessonView(
  db: D1Database,
  videoId: string,
  networkId: string,
  locals: App.Locals
) {
  const material = await db
    .prepare(
      'SELECT outcome,prerequisites,tools,transcript,practice,release_id FROM lesson_material WHERE video_id=? AND network_id=?'
    )
    .bind(videoId, networkId)
    .first<LessonMaterial>();
  let release: { id: string; asset_id: string; title: string; version: string } | null = null;
  if (material?.release_id && locals.network) {
    const r = await db
      .prepare('SELECT * FROM asset_releases WHERE id=? AND network_id=?')
      .bind(material.release_id, networkId)
      .first<AssetRelease>();
    const asset = r
      ? await db
          .prepare('SELECT * FROM builder_assets WHERE id=? AND network_id=?')
          .bind(r.asset_id, networkId)
          .first<BuilderAsset>()
      : null;
    if (
      r &&
      asset &&
      (canBrowseAsset(asset, locals) ||
        (!!locals.identity && (await hasRelease(db, r, locals.identity.subject))))
    )
      release = { id: r.id, asset_id: r.asset_id, title: asset.title, version: r.version };
  }
  const admin = locals.identity?.role === 'admin';
  const releaseOptions =
    admin && locals.network?.kind !== 'support'
      ? (
          await db
            .prepare(
              'SELECT r.id, r.asset_id, a.title, r.version FROM asset_releases r JOIN builder_assets a ON a.id=r.asset_id AND a.network_id=r.network_id WHERE r.network_id=? ORDER BY a.title,r.rowid DESC'
            )
            .bind(networkId)
            .all()
        ).results
      : [];
  // A private release ID is metadata too: omit it from unauthorized lesson views.
  return {
    lesson: material
      ? { ...material, release_id: admin ? material.release_id : release?.id || null }
      : null,
    release,
    releaseOptions
  };
}
