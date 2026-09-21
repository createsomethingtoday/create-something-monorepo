import { error } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';
import type { BuilderAsset, AssetRelease, ReleaseManifest } from '$lib/assets';
import type { Network } from './networks';

export function ownsNetwork(locals: App.Locals) {
  return (
    !!locals.identity &&
    !!locals.network &&
    locals.network.kind !== 'support' &&
    locals.network.owner_id === locals.identity.subject
  );
}
export function canBrowseAsset(asset: BuilderAsset, locals: App.Locals) {
  if (!locals.network || asset.network_id !== locals.network.id) return false;
  if (ownsNetwork(locals)) return true;
  return (
    locals.network.status === 'active' &&
    asset.visibility === 'published' &&
    (locals.identity?.role === 'member' ||
      (locals.network.access_model === 'preview' && asset.audience === 'public'))
  );
}
export async function findAsset(db: D1Database, network: Network, id: string) {
  return db
    .prepare('SELECT * FROM builder_assets WHERE network_id=? AND id=?')
    .bind(network.id, id)
    .first<BuilderAsset>();
}
export async function releases(db: D1Database, asset: BuilderAsset) {
  return (
    await db
      .prepare('SELECT * FROM asset_releases WHERE network_id=? AND asset_id=? ORDER BY rowid DESC')
      .bind(asset.network_id, asset.id)
      .all<AssetRelease>()
  ).results;
}
export async function hasRelease(db: D1Database, release: AssetRelease, buyer: string) {
  return !!(await db
    .prepare(
      "SELECT id FROM asset_entitlements WHERE network_id=? AND asset_id=? AND release_id=? AND buyer_id=? AND status='active'"
    )
    .bind(release.network_id, release.asset_id, release.id, buyer)
    .first());
}
export function releaseView(release: AssetRelease, entitled: boolean) {
  const manifest = JSON.parse(release.manifest) as ReleaseManifest;
  // Artifact locations and proprietary installation content never appear in public page data.
  return {
    id: release.id,
    version: release.version,
    sha256: release.sha256,
    size_bytes: release.size_bytes,
    created_at: release.created_at,
    entitled,
    manifest: {
      runtimes: manifest.runtimes,
      requirements: manifest.requirements,
      permissions: manifest.permissions,
      license: manifest.license,
      support: manifest.support,
      changes: manifest.changes,
      install: entitled ? manifest.install : null,
      verify: entitled ? manifest.verify : null,
      uninstall: entitled ? manifest.uninstall : null
    }
  };
}
export function requireOwner(locals: App.Locals) {
  if (!ownsNetwork(locals)) error(403, 'Only the owner can manage this network’s assets.');
}
