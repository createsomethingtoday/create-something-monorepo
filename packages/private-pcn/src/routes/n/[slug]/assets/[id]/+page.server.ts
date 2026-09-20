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
  const views = await Promise.all(
    all.map(async (release) =>
      releaseView(
        release,
        owner || (!!locals.identity && (await hasRelease(db, release, locals.identity.subject)))
      )
    )
  );
  // Buyers can return to a purchased release even after its storefront is archived.
  if (!canBrowseAsset(asset, locals) && !views.some((v) => v.entitled))
    error(404, 'This asset is private or no longer listed.');
  const visible = canBrowseAsset(asset, locals) ? views : views.filter((v) => v.entitled);
  return {
    selectedRelease:
      visible.find((v) => v.id === url.searchParams.get('release'))?.id ||
      visible.find((v) => v.entitled)?.id ||
      '',
    asset,
    releases: visible,
    owner,
    storageReady: !!platform.env.ASSET_PACKAGES,
    commerceReady: platform.env.PCN_ASSET_COMMERCE_ENABLED === 'true'
  };
};
