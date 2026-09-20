import { error } from '@sveltejs/kit';
import type { BuilderAsset } from '$lib/assets';
import { canBrowseAsset, ownsNetwork } from '$lib/server/builder-assets';
export const load = async ({ locals, platform }) => {
  if (!platform?.env.DB || !locals.network) error(503, 'Asset catalog is unavailable.');
  const { results } = await platform.env.DB.prepare(
    'SELECT * FROM builder_assets WHERE network_id=? ORDER BY created_at DESC,id DESC'
  )
    .bind(locals.network.id)
    .all<BuilderAsset>();
  return {
    assets: results.filter((asset) => canBrowseAsset(asset, locals)),
    owner: ownsNetwork(locals),
    memberAccessRequired:
      locals.network.access_model === 'members' &&
      !ownsNetwork(locals) &&
      locals.identity?.role !== 'member'
  };
};
