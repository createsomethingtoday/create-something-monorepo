import { refreshBuyerRelease, assetAcquisitionEnabled } from '$lib/server/asset-orders';
import { error } from '@sveltejs/kit';
import {
  findAsset,
  canBrowseAsset,
  ownsNetwork,
  releases,
  hasRelease,
  releaseView
} from '$lib/server/builder-assets';
export const load = async ({ locals, platform, params, url }) => {
  if (!platform?.env.DB || !locals.network) error(503, 'Asset unavailable.');
  const db = platform.env.DB,
    asset = await findAsset(db, locals.network, params.id);
  if (!asset) error(404, 'Asset not found.');
  const owner = ownsNetwork(locals);
  const all = await releases(db, asset);
  if (locals.identity && !owner) {
    for (const release of all) {
      try {
        await refreshBuyerRelease(platform.env, release, locals.identity.subject);
      } catch {
        error(503, 'Payment verification is temporarily unavailable. Try again shortly.');
      }
    }
  }
  const purchase = locals.identity
    ? await db
        .prepare(
          'SELECT status,release_id FROM asset_orders WHERE network_id=? AND asset_id=? AND buyer_id=? ORDER BY created_at DESC LIMIT 1'
        )
        .bind(asset.network_id, asset.id, locals.identity.subject)
        .first<{ status: string; release_id: string }>()
    : null;
  const views = await Promise.all(
    all.map(async (release) =>
      releaseView(
        release,
        owner || (!!locals.identity && (await hasRelease(db, release, locals.identity.subject)))
      )
    )
  );
  // Buyers can return to a purchased release even after its storefront is archived.
  if (!canBrowseAsset(asset, locals) && !views.some((v) => v.entitled) && !purchase)
    error(404, 'This asset is private or no longer listed.');
  const visible = canBrowseAsset(asset, locals)
    ? views
    : views.filter((v) => v.entitled || v.id === purchase?.release_id);
  return {
    selectedRelease:
      visible.find((v) => v.id === url.searchParams.get('release'))?.id ||
      visible.find((v) => v.entitled)?.id ||
      '',
    asset,
    releases: visible,
    owner,
    purchase,
    storageReady: !!platform.env.ASSET_PACKAGES,
    commerceReady: assetAcquisitionEnabled(platform.env, asset.price_cents)
  };
};
