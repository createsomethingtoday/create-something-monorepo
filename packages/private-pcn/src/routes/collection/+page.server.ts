import { error, redirect } from '@sveltejs/kit';
import type { AssetKind } from '$lib/assets';
export const load = async ({ locals, platform }) => {
  if (!locals.identity) redirect(303, '/login?next=/collection');
  if (!platform?.env.DB) error(503, 'Your collection is temporarily unavailable.');
  const { results } = await platform.env.DB.prepare(
    `SELECT a.id,a.title,a.kind,r.version,r.id AS release_id,e.status,n.slug,n.name AS network_name
 FROM asset_entitlements e JOIN builder_assets a ON a.id=e.asset_id AND a.network_id=e.network_id
 JOIN asset_releases r ON r.id=e.release_id AND r.asset_id=e.asset_id AND r.network_id=e.network_id
 JOIN networks n ON n.id=e.network_id WHERE e.buyer_id=? ORDER BY e.created_at DESC,e.id DESC`
  )
    .bind(locals.identity.subject)
    .all<{
      id: string;
      title: string;
      kind: AssetKind;
      version: string;
      release_id: string;
      status: string;
      slug: string;
      network_name: string;
    }>();
  return { collection: results };
};
