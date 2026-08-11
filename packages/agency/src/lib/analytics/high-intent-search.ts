export const HIGH_INTENT_SEARCH_CAMPAIGN_ID = 'agency-high-intent-search-v20260810';
export const HIGH_INTENT_SEARCH_SESSION_TTL_MS = 30 * 60 * 1000;

const STORAGE_KEY = 'cs.agency.high-intent-search.v1';

const LANDING_PATH_BY_INTENT = {
  'marketplace-review': '/marketplace-review-automation',
  'workflow-recovery': '/ai-workflow-recovery',
  'workflow-control': '/ai-workflow-control',
  brand: '/'
} as const;

type PaidSearchIntent = keyof typeof LANDING_PATH_BY_INTENT;

export interface HighIntentSearchAttribution {
  paidSearchCampaign: typeof HIGH_INTENT_SEARCH_CAMPAIGN_ID;
  paidSearchSource: 'google';
  paidSearchMedium: 'cpc';
  paidSearchIntent: PaidSearchIntent;
  paidSearchLandingPath: (typeof LANDING_PATH_BY_INTENT)[PaidSearchIntent];
  paidSearchAttribution: 'consented-first-party-session';
}

interface StoredHighIntentSearchAttribution {
  attribution: HighIntentSearchAttribution;
  expiresAt: number;
}

export interface CampaignSessionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function captureHighIntentSearchAttribution(
  url: URL,
  storage: CampaignSessionStorage,
  now = Date.now()
): HighIntentSearchAttribution | undefined {
  const attribution = parseAttribution(url);

  if (attribution) {
    const stored: StoredHighIntentSearchAttribution = {
      attribution,
      expiresAt: now + HIGH_INTENT_SEARCH_SESSION_TTL_MS
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(stored));
    return attribution;
  }

  return readHighIntentSearchAttribution(storage, now);
}

export function readHighIntentSearchAttribution(
  storage: CampaignSessionStorage,
  now = Date.now()
): HighIntentSearchAttribution | undefined {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return undefined;

  try {
    const stored = JSON.parse(raw) as StoredHighIntentSearchAttribution;
    if (stored.expiresAt <= now || !isAttribution(stored.attribution)) {
      storage.removeItem(STORAGE_KEY);
      return undefined;
    }
    return stored.attribution;
  } catch {
    storage.removeItem(STORAGE_KEY);
    return undefined;
  }
}

export function clearHighIntentSearchAttribution(storage: CampaignSessionStorage): void {
  storage.removeItem(STORAGE_KEY);
}

function parseAttribution(url: URL): HighIntentSearchAttribution | undefined {
  const source = url.searchParams.get('utm_source');
  const medium = url.searchParams.get('utm_medium');
  const campaign = url.searchParams.get('utm_campaign');
  const intent = url.searchParams.get('utm_content');

  if (
    source !== 'google' ||
    medium !== 'cpc' ||
    campaign !== HIGH_INTENT_SEARCH_CAMPAIGN_ID ||
    !isPaidSearchIntent(intent)
  ) {
    return undefined;
  }

  const landingPath = LANDING_PATH_BY_INTENT[intent];
  if (url.pathname !== landingPath) return undefined;

  return {
    paidSearchCampaign: HIGH_INTENT_SEARCH_CAMPAIGN_ID,
    paidSearchSource: 'google',
    paidSearchMedium: 'cpc',
    paidSearchIntent: intent,
    paidSearchLandingPath: landingPath,
    paidSearchAttribution: 'consented-first-party-session'
  };
}

function isPaidSearchIntent(value: string | null): value is PaidSearchIntent {
  return value !== null && Object.hasOwn(LANDING_PATH_BY_INTENT, value);
}

function isAttribution(value: unknown): value is HighIntentSearchAttribution {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<HighIntentSearchAttribution>;
  const intent = candidate.paidSearchIntent;
  if (!isPaidSearchIntent(intent ?? null)) return false;
  const landingPath = LANDING_PATH_BY_INTENT[intent as PaidSearchIntent];

  return (
    candidate.paidSearchCampaign === HIGH_INTENT_SEARCH_CAMPAIGN_ID &&
    candidate.paidSearchSource === 'google' &&
    candidate.paidSearchMedium === 'cpc' &&
    candidate.paidSearchLandingPath === landingPath &&
    candidate.paidSearchAttribution === 'consented-first-party-session'
  );
}
