export const MARKETING_ATTRIBUTION_TTL_MS = 30 * 60 * 1000;

const STORAGE_KEY = 'cs.agency.marketing-attribution.v1';
const SOURCES = new Set([
  'facebook',
  'instagram',
  'linkedin',
  'medium',
  'substack',
  'x',
  'youtube'
]);
const MEDIA = new Set(['email', 'referral', 'social', 'video']);
const TOKEN = /^[a-z0-9][a-z0-9_-]{0,79}$/;

export interface MarketingAttribution {
  marketingSource: string;
  marketingMedium: string;
  marketingCampaign: string;
  marketingContent?: string;
  marketingLandingPath: string;
  marketingAttribution: 'consented-first-party-session';
}

export interface MarketingSessionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface StoredAttribution {
  attribution: MarketingAttribution;
  expiresAt: number;
}

export function captureMarketingAttribution(
  url: URL,
  storage: MarketingSessionStorage,
  now = Date.now()
): MarketingAttribution | undefined {
  const attribution = parseMarketingAttribution(url);
  if (attribution) {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ attribution, expiresAt: now + MARKETING_ATTRIBUTION_TTL_MS })
    );
    return attribution;
  }
  return readMarketingAttribution(storage, now);
}

export function readMarketingAttribution(
  storage: MarketingSessionStorage,
  now = Date.now()
): MarketingAttribution | undefined {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return undefined;
  try {
    const stored = JSON.parse(raw) as StoredAttribution;
    if (stored.expiresAt <= now || !isMarketingAttribution(stored.attribution)) {
      storage.removeItem(STORAGE_KEY);
      return undefined;
    }
    return stored.attribution;
  } catch {
    storage.removeItem(STORAGE_KEY);
    return undefined;
  }
}

export function clearMarketingAttribution(storage: MarketingSessionStorage): void {
  storage.removeItem(STORAGE_KEY);
}

function parseMarketingAttribution(url: URL): MarketingAttribution | undefined {
  const source = url.searchParams.get('utm_source')?.toLowerCase() ?? '';
  const medium = url.searchParams.get('utm_medium')?.toLowerCase() ?? '';
  const campaign = url.searchParams.get('utm_campaign')?.toLowerCase() ?? '';
  const content = url.searchParams.get('utm_content')?.toLowerCase() ?? '';
  if (!SOURCES.has(source) || !MEDIA.has(medium) || !TOKEN.test(campaign)) return undefined;
  if (content && !TOKEN.test(content)) return undefined;
  return {
    marketingSource: source,
    marketingMedium: medium,
    marketingCampaign: campaign,
    ...(content ? { marketingContent: content } : {}),
    marketingLandingPath: url.pathname,
    marketingAttribution: 'consented-first-party-session'
  };
}

function isMarketingAttribution(value: unknown): value is MarketingAttribution {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<MarketingAttribution>;
  return Boolean(
    candidate.marketingSource && SOURCES.has(candidate.marketingSource) &&
    candidate.marketingMedium && MEDIA.has(candidate.marketingMedium) &&
    candidate.marketingCampaign && TOKEN.test(candidate.marketingCampaign) &&
    (!candidate.marketingContent || TOKEN.test(candidate.marketingContent)) &&
    candidate.marketingLandingPath?.startsWith('/') &&
    candidate.marketingAttribution === 'consented-first-party-session'
  );
}
