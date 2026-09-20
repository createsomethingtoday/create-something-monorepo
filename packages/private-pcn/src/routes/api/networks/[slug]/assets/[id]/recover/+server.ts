import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { AssetRelease } from '$lib/assets';
import { requireOwner, findAsset } from '$lib/server/builder-assets';
import { isSameOrigin } from '$lib/server/policy';
export const POST: RequestHandler = async ({ request, locals, platform, params }) => {
  if (!isSameOrigin(request))
    return json({ error: 'Same-origin request required.' }, { status: 403 });
  requireOwner(locals);
  const db = platform?.env.DB,
    bucket = platform?.env.ASSET_PACKAGES;
  if (!db || !bucket) return json({ error: 'Package storage unavailable.' }, { status: 503 });
  if (!(await findAsset(db, locals.network!, params.id)))
    return json({ error: 'Asset not found.' }, { status: 404 });
  const { results } = await db
    .prepare('SELECT * FROM asset_uploads WHERE network_id=? AND asset_id=? ORDER BY created_at')
    .bind(locals.network!.id, params.id)
    .all<AssetRelease>();
  let recovered = 0,
    pending = 0;
  for (const upload of results) {
    const object = await bucket.head(upload.object_key);
    // Missing/uncertain objects are not released: the original write may still finish.
    if (
      !object ||
      object.size !== upload.size_bytes ||
      object.customMetadata?.sha256 !== upload.sha256
    ) {
      pending++;
      continue;
    }
    await db.batch([
      db
        .prepare(
          'INSERT INTO asset_releases(id,network_id,asset_id,version,manifest,object_key,sha256,size_bytes) SELECT id,network_id,asset_id,version,manifest,object_key,sha256,size_bytes FROM asset_uploads WHERE id=? ON CONFLICT(id) DO NOTHING'
        )
        .bind(upload.id),
      db
        .prepare(
          "INSERT INTO receipts(id,actor,action,target,network_id) SELECT ?,?,'asset.release.recovered',id,network_id FROM asset_uploads WHERE id=?"
        )
        .bind(crypto.randomUUID(), locals.identity!.subject, upload.id),
      db.prepare('DELETE FROM asset_uploads WHERE id=?').bind(upload.id)
    ]);
    recovered++;
  }
  return json({
    recovered,
    pending,
    message: pending
      ? 'Some uploads remain uncertain and still reserve capacity. Contact support if recovery stays pending.'
      : 'Uploaded packages have been reconciled.'
  });
};
