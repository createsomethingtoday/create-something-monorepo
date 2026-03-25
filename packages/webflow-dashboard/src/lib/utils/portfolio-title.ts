import type { Asset } from '$lib/server/airtable';

type AssetType = Asset['type'];

const TYPE_LABELS: Record<AssetType, string> = {
  Template: 'template',
  Library: 'library',
  App: 'app'
};

export function getPortfolioTitle(assets: Array<Pick<Asset, 'type'>>): string {
  const distinctTypes = new Set(assets.map((asset) => asset.type).filter(Boolean));

  if (distinctTypes.size !== 1) {
    return 'Your Webflow asset portfolio';
  }

  const [assetType] = distinctTypes;
  const label = TYPE_LABELS[assetType];

  return label ? `Your Webflow ${label} portfolio` : 'Your Webflow asset portfolio';
}
