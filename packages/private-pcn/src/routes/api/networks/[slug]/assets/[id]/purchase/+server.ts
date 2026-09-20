import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { findAsset, canBrowseAsset } from '$lib/server/builder-assets';
import { boundedText } from '$lib/server/body';
import { isSameOrigin } from '$lib/server/policy';
import { BillingError } from '$lib/server/billing';
import { acquireAsset, checkPurchase } from '$lib/server/asset-orders';
import type { AssetRelease } from '$lib/assets';
export const POST: RequestHandler = async ({ request, locals, platform, params, url }) => {
  if (!isSameOrigin(request))
    return json({ error: 'Same-origin request required.' }, { status: 403 });
  if (!locals.identity || !locals.network)
    return json({ error: 'Sign in before acquiring an asset.' }, { status: 401 });
  if (!platform?.env.DB) return json({ error: 'Purchases unavailable.' }, { status: 503 });
  let body;
  try {
    body = JSON.parse(await boundedText(request));
  } catch {
    return json({ error: 'Invalid purchase request.' }, { status: 400 });
  }
  if (!body || typeof body.release !== 'string' || !['acquire', 'check'].includes(body.action))
    return json({ error: 'Select a release and action.' }, { status: 400 });
  const env = platform.env,
    asset = await findAsset(env.DB, locals.network, params.id);
  if (!asset) return json({ error: 'Asset not found.' }, { status: 404 });
  const release = await env.DB.prepare(
    'SELECT * FROM asset_releases WHERE network_id=? AND asset_id=? AND id=?'
  )
    .bind(locals.network.id, asset.id, body.release)
    .first<AssetRelease>();
  if (!release) return json({ error: 'Release not found.' }, { status: 404 });
  try {
    if (body.action === 'check')
      return json(await checkPurchase(env, locals.identity.subject, release.id));
    if (body.acceptLicense !== true)
      return json(
        {
          error:
            'Review and accept the release license and builder refund policy before continuing.'
        },
        { status: 400 }
      );
    if (!canBrowseAsset(asset, locals))
      return json({ error: 'This listing is private or unavailable.' }, { status: 404 });
    return json(
      await acquireAsset(env, locals.network, asset, release, locals.identity, url.origin)
    );
  } catch (e) {
    return json(
      {
        error:
          e instanceof BillingError
            ? e.message
            : 'Payment confirmation is temporarily unavailable. Check purchase before paying again.'
      },
      { status: e instanceof BillingError ? e.status : 503 }
    );
  }
};
