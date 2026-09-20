import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { AssetRelease } from '$lib/assets';
import { ownsNetwork, hasRelease } from '$lib/server/builder-assets';
export const GET: RequestHandler = async ({ locals, platform, params, url }) => {
  const db = platform?.env.DB,
    bucket = platform?.env.ASSET_PACKAGES;
  if (!locals.identity || !locals.network)
    return json({ error: 'Sign in to access your package.' }, { status: 401 });
  if (!db || !bucket)
    return json({ error: 'Package delivery is unavailable. Try again shortly.' }, { status: 503 });
  const release = await db
    .prepare('SELECT * FROM asset_releases WHERE network_id=? AND asset_id=? AND id=?')
    .bind(locals.network.id, params.id, url.searchParams.get('release') || '')
    .first<AssetRelease>();
  if (
    !release ||
    (!ownsNetwork(locals) && !(await hasRelease(db, release, locals.identity.subject)))
  )
    return json({ error: 'This release is not in your collection.' }, { status: 404 });
  const object = await bucket.get(release.object_key);
  if (!object || object.size !== release.size_bytes)
    return json(
      { error: 'Package unavailable. Contact the builder with this release version.' },
      { status: 503 }
    );
  // Workers and DOM declare different stream types for the same runtime interface.
  return new Response(object.body as unknown as ReadableStream<Uint8Array>, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${params.id}-${release.version}.zip"`,
      'Content-Length': String(object.size),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox"
    }
  });
};
