/** Public buyer signals shared by cards and WebMCP. Never returns exact sales counts. */
export interface PublicSignalInput {
  cumulative_purchases?: number | null;
  unique_viewers?: number | null;
  popularity_score?: number | null;
}
function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) return `${Number((value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1))}M`;
  if (value >= 1_000) return `${Number((value / 1_000).toFixed(value >= 10_000 ? 0 : 1))}k`;
  return String(value);
}

function pluralize(value: number, singular: string, plural = `${singular}s`): string {
  return `${formatCompactNumber(value)} ${value === 1 ? singular : plural}`;
}

export type MarketplaceSignalDensity = 'full' | 'selective' | 'strict';

export function signalDensityForPosition(position: number): MarketplaceSignalDensity {
  if (position <= 12) return 'full';
  if (position <= 24) return 'selective';
  return 'strict';
}

export function marketplaceSignals(item: PublicSignalInput, position = 1): string[] {
  // The backend field name is historical; the value is a rolling 30-day
  // purchase count, so keep the card labels bucketed instead of implying
  // lifetime proof from exact low counts.
  const purchases = typeof item.cumulative_purchases === 'number' ? item.cumulative_purchases : 0;
  const viewers = typeof item.unique_viewers === 'number' ? item.unique_viewers : 0;
  const popularity = typeof item.popularity_score === 'number' ? item.popularity_score : 0;
  const density = signalDensityForPosition(position);
  const isPopular = popularity >= 5;
  const hasSales = purchases > 0;
  const hasHighViews = viewers >= 5_000;

  if (purchases >= 250) return ['Marketplace favorite', '250+ purchases'];
  if (purchases >= 100) return ['Top seller', '100+ purchases'];
  if (purchases >= 50) return ['Strong seller', '50+ purchases'];
  if (purchases >= 20 && density !== 'strict') return ['Sales momentum', '20+ purchases'];
  if (purchases >= 10 && density === 'full') return ['Recently purchased', '10+ purchases'];
  if (hasSales && isPopular && density === 'full') return ['Recently purchased'];
  if (hasSales && hasHighViews && density === 'full') return ['Buyer interest'];
  if (isPopular && hasHighViews && density !== 'strict') return ['High interest', pluralize(viewers, 'view')];
  if (isPopular && density === 'full') return ['Popular'];
  if (hasHighViews && density === 'full') return [pluralize(viewers, 'view')];
  return [];
}
