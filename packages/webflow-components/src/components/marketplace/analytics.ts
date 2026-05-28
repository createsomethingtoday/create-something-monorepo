export type MarketplaceAnalyticsData = Record<string, string | number | boolean | null | undefined>;
export type MarketplaceExperimentVariant = 'control' | 'treatment';
export type MarketplaceExperimentRole = 'none' | MarketplaceExperimentVariant;

export interface MarketplaceExperimentState {
  key: string;
  variant: MarketplaceExperimentVariant;
  source: string;
}

interface WfAnalytics {
  init?: (config: Record<string, unknown>) => void;
  track?: (eventName: string, eventData?: Record<string, unknown>) => void;
}

interface SegmentAnalytics {
  track?: (eventName: string, eventData?: Record<string, unknown>) => void;
}

interface AmplitudeAnalytics {
  track?: (eventName: string, eventData?: Record<string, unknown>) => unknown;
  logEvent?: (eventName: string, eventData?: Record<string, unknown>) => unknown;
  getInstance?: () => {
    logEvent?: (eventName: string, eventData?: Record<string, unknown>) => unknown;
  };
}

interface OptimizelyApi extends Array<unknown> {
  push: (...items: unknown[]) => number;
}

declare global {
  interface Window {
    __templateMarketplaceAnalyticsInitialized?: boolean;
    __templateMarketplaceLandingExperiment?: MarketplaceExperimentState;
    analytics?: SegmentAnalytics;
    amplitude?: AmplitudeAnalytics;
    optimizely?: OptimizelyApi;
    wf_analytics?: WfAnalytics;
  }
}

export const MARKETPLACE_LANDING_ANALYTICS_EVENT = 'marketplaceLandingAnalytics';

function getUrlParams(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const params: Record<string, string> = {};
  try {
    new URL(window.location.href).searchParams.forEach((value, key) => {
      params[key] = value;
    });
  } catch {
    return params;
  }
  return params;
}

function getPageContext(): Record<string, unknown> {
  if (typeof window === 'undefined') return {};
  const urlParams = getUrlParams();
  const experimentState = window.__templateMarketplaceLandingExperiment;
  return {
    page_url: window.location.href,
    page_title: typeof document !== 'undefined' ? document.title : '',
    referrer: typeof document !== 'undefined' ? document.referrer || 'direct' : 'direct',
    current_category: urlParams.category || null,
    current_subcategory: urlParams.subcategory || null,
    experiment_key: experimentState?.key ?? null,
    experiment_variant: experimentState?.variant ?? null,
    experiment_assignment_source: experimentState?.source ?? null,
    timestamp: new Date().toISOString(),
  };
}

function compactData(data: MarketplaceAnalyticsData): Record<string, unknown> {
  const compact: Record<string, unknown> = {};
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) compact[key] = value;
  });
  return compact;
}

export function trackMarketplaceEvent(
  eventName: string,
  eventData: MarketplaceAnalyticsData = {},
  enabled = true,
): void {
  if (!enabled || typeof window === 'undefined') return;

  const data = {
    ...getPageContext(),
    ...compactData(eventData),
  };
  const detail = { eventName, data };

  window.dispatchEvent(new CustomEvent(MARKETPLACE_LANDING_ANALYTICS_EVENT, { detail }));
  if (typeof document !== 'undefined') {
    document.dispatchEvent(new CustomEvent(MARKETPLACE_LANDING_ANALYTICS_EVENT, { detail }));
  }

  try {
    window.wf_analytics?.track?.(eventName, data);
  } catch {
    // Analytics must not block navigation or component interaction.
  }

  const amplitudeEventName = eventName.startsWith('[Template Marketplace]')
    ? eventName
    : `[Template Marketplace] ${eventName}`;

  try {
    window.analytics?.track?.(amplitudeEventName, data);
  } catch {
    // Analytics must not block navigation or component interaction.
  }

  try {
    if (typeof window.amplitude?.track === 'function') {
      window.amplitude.track(amplitudeEventName, data);
    } else if (typeof window.amplitude?.logEvent === 'function') {
      window.amplitude.logEvent(amplitudeEventName, data);
    } else {
      window.amplitude?.getInstance?.()?.logEvent?.(amplitudeEventName, data);
    }
  } catch {
    // Analytics must not block navigation or component interaction.
  }
}

export function trackOptimizelyEvent(
  eventName: string,
  tags: MarketplaceAnalyticsData = {},
  enabled = true,
): void {
  if (!enabled || typeof window === 'undefined' || !eventName.trim()) return;
  window.optimizely = window.optimizely || ([] as unknown as OptimizelyApi);
  const optimizely = window.optimizely;
  if (!optimizely) return;
  try {
    optimizely.push({
      type: 'event',
      eventName,
      tags: compactData(tags),
    });
  } catch {
    // Optimizely metrics must not block the page.
  }
}

export function initTemplateMarketplacePageAnalytics(
  data: MarketplaceAnalyticsData = {},
  enabled = true,
): void {
  if (!enabled || typeof window === 'undefined' || window.__templateMarketplaceAnalyticsInitialized) return;
  if (window.location.pathname.startsWith('/templates/html/')) return;

  window.__templateMarketplaceAnalyticsInitialized = true;
  try {
    window.wf_analytics?.init?.({
      pageView: {
        name: 'Template Marketplace Viewed',
        data: {
          params: window.location.search,
          ...compactData(data),
        },
      },
      page: 'template marketplace',
    });
  } catch {
    window.__templateMarketplaceAnalyticsInitialized = false;
  }
}
