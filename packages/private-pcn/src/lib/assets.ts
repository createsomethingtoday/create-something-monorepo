export const assetKinds = {
  mcp: 'MCP server',
  plugin: 'Agent plugin',
  skill: 'Agent skill',
  workflow: 'Workflow package'
} as const;
export type AssetKind = keyof typeof assetKinds;
export interface BuilderAsset {
  id: string;
  network_id: string;
  title: string;
  kind: AssetKind;
  summary: string;
  price_cents: number;
  visibility: 'draft' | 'published' | 'archived';
  audience: 'members' | 'public';
}
export interface ReleaseManifest {
  runtimes: string;
  requirements: string;
  permissions: string;
  license: string;
  install: string;
  verify: string;
  uninstall: string;
  changes: string;
  support: string;
}
export interface AssetRelease {
  id: string;
  network_id: string;
  asset_id: string;
  version: string;
  manifest: string;
  object_key: string;
  sha256: string;
  size_bytes: number;
  created_at: string;
}
export function assetPrice(cents: number) {
  return cents === 0
    ? 'Free'
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}
export function priceCents(input: unknown): number | null {
  if (typeof input !== 'string' || !/^(?:0|[1-9]\d{0,3})(?:\.\d{1,2})?$/.test(input)) return null;
  const [dollars, fraction = ''] = input.split('.');
  const cents = Number(dollars) * 100 + Number(fraction.padEnd(2, '0'));
  return cents <= 999900 && (cents === 0 || cents >= 100) ? cents : null;
}
export function validateManifest(input: unknown): ReleaseManifest | null {
  if (!input || typeof input !== 'object') return null;
  const result: Record<string, string> = {};
  for (const key of [
    'runtimes',
    'requirements',
    'permissions',
    'license',
    'install',
    'verify',
    'uninstall',
    'changes',
    'support'
  ]) {
    const value = (input as Record<string, unknown>)[key];
    if (
      typeof value !== 'string' ||
      !value.trim() ||
      value.length > (['install', 'license'].includes(key) ? 4000 : 1500)
    )
      return null;
    result[key] = value.trim();
  }
  return result as unknown as ReleaseManifest;
}

export function validateAssetDraft(input: unknown) {
  if (!input || typeof input !== 'object') return null;
  const body = input as Record<string, unknown>;
  const cents = priceCents(body.price);
  if (
    typeof body.title !== 'string' ||
    !body.title.trim() ||
    body.title.length > 100 ||
    typeof body.summary !== 'string' ||
    !body.summary.trim() ||
    body.summary.length > 1000 ||
    typeof body.kind !== 'string' ||
    !Object.hasOwn(assetKinds, body.kind) ||
    cents === null ||
    (body.audience !== 'members' && body.audience !== 'public')
  )
    return null;
  return {
    title: body.title.trim(),
    summary: body.summary.trim(),
    kind: body.kind as AssetKind,
    price_cents: cents,
    audience: body.audience
  };
}
