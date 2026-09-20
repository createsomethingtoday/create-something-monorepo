import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { AssetRelease } from '$lib/assets';
import { refreshBuyerRelease } from '$lib/server/asset-orders';
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
  if (release && !ownsNetwork(locals)) {
    try {
      await refreshBuyerRelease(platform!.env, release, locals.identity.subject);
    } catch {
      return json(
        { error: 'Your payment status could not be verified. Try again shortly.' },
        { status: 503 }
      );
    }
  }
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
  // Aggregate the server-authorized delivery, without buyer identity or installation claims.
  await db
    .prepare(
      `INSERT INTO network_impact_daily(day,network_id,event,count) VALUES(date('now'),?,'package_delivery_granted',1)
    ON CONFLICT(day,network_id,event) DO UPDATE SET count=count+1`
    )
    .bind(locals.network.id)
    .run();
  await db
    .prepare("DELETE FROM network_impact_daily WHERE network_id=? AND day<date('now','-90 days')")
    .bind(locals.network.id)
    .run();
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
