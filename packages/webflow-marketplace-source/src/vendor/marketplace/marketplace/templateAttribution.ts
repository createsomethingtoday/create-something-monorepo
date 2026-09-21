import type { MarketplaceAnalyticsData } from './analytics';

export const TEMPLATE_MARKETPLACE_ATTRIBUTION_KEY = 'templateMarketplaceAttribution';
export const MARKETPLACE_SIGNAL_WINDOW = 'rolling_30d';

const ATTRIBUTION_TTL_MS = 2 * 60 * 60 * 1000;

export interface TemplateMarketplaceAttribution {
  version: 1;
  source_component: string;
  source_pathname: string | null;
  source_scope: string;
  source_sort: string;
  source_category_group_slug: string | null;
  source_child_category_slug: string | null;
  source_style_slug: string | null;
  source_tag_slug: string | null;
  source_free_only: boolean;
  source_q_present: boolean;
  source_styles_count: number;
  source_tags_count: number;
  source_types_count: number;
  source_page: number;
  source_position: number;
  template_slug: string;
  signal_bucket: string | null;
  signal_metric: string | null;
  signal_window: string;
  signal_density: string;
  created_at: string;
}

function isStorageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

function isAttribution(value: unknown): value is TemplateMarketplaceAttribution {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<TemplateMarketplaceAttribution>;
  return (
    candidate.version === 1 &&
    typeof candidate.source_component === 'string' &&
    typeof candidate.template_slug === 'string' &&
    typeof candidate.created_at === 'string'
  );
}

function isExpired(attribution: TemplateMarketplaceAttribution): boolean {
  const created = Date.parse(attribution.created_at);
  return Number.isNaN(created) || Date.now() - created > ATTRIBUTION_TTL_MS;
}

export function safeCurrentPageUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return window.location.pathname || null;
  }
}

export function getSafeAnalyticsOverrides(): MarketplaceAnalyticsData {
  return {
    page_url: safeCurrentPageUrl(),
    search: null,
  };
}

export function writeTemplateAttribution(attribution: TemplateMarketplaceAttribution): void {
  if (!isStorageAvailable()) return;
  try {
    window.sessionStorage.setItem(TEMPLATE_MARKETPLACE_ATTRIBUTION_KEY, JSON.stringify(attribution));
  } catch {
    // Attribution should never block card navigation.
  }
}

export function readTemplateAttribution(): TemplateMarketplaceAttribution | null {
  if (!isStorageAvailable()) return null;
  try {
    const raw = window.sessionStorage.getItem(TEMPLATE_MARKETPLACE_ATTRIBUTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isAttribution(parsed) || isExpired(parsed)) {
      window.sessionStorage.removeItem(TEMPLATE_MARKETPLACE_ATTRIBUTION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function attributionAnalytics(
  attribution: TemplateMarketplaceAttribution | null,
  expectedTemplateSlug?: string | null,
): MarketplaceAnalyticsData {
  if (!attribution) {
    return {
      attribution_present: false,
      attribution_match: false,
    };
  }

  const expected = expectedTemplateSlug?.trim() || null;
  return {
    attribution_present: true,
    attribution_match: expected ? attribution.template_slug === expected : null,
    attribution_source_component: attribution.source_component,
    attribution_source_pathname: attribution.source_pathname,
    attribution_source_scope: attribution.source_scope,
    attribution_source_sort: attribution.source_sort,
    attribution_source_category_group_slug: attribution.source_category_group_slug,
    attribution_source_child_category_slug: attribution.source_child_category_slug,
    attribution_source_style_slug: attribution.source_style_slug,
    attribution_source_tag_slug: attribution.source_tag_slug,
    attribution_source_free_only: attribution.source_free_only,
    attribution_source_q_present: attribution.source_q_present,
    attribution_source_styles_count: attribution.source_styles_count,
    attribution_source_tags_count: attribution.source_tags_count,
    attribution_source_types_count: attribution.source_types_count,
    attribution_source_page: attribution.source_page,
    attribution_source_position: attribution.source_position,
    attribution_template_slug: attribution.template_slug,
    attribution_signal_bucket: attribution.signal_bucket,
    attribution_signal_metric: attribution.signal_metric,
    attribution_signal_window: attribution.signal_window,
    attribution_signal_density: attribution.signal_density,
    signal_bucket: attribution.signal_bucket,
    signal_metric: attribution.signal_metric,
    signal_window: attribution.signal_window,
    signal_density: attribution.signal_density,
  };
}
