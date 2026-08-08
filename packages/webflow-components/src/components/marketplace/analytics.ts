import { hasPageAnalyticsSdk, sendTelemetryFallbackEvent } from './telemetryFallback';

export type MarketplaceAnalyticsData = Record<string, string | number | boolean | null | undefined>;
export type MarketplaceExperimentVariant = 'control' | 'treatment';
export type MarketplaceExperimentRole = 'none' | MarketplaceExperimentVariant;

export interface TrackMarketplaceEventOptions {
  prefixTemplateMarketplaceEvent?: boolean;
}

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
const COMPONENT_ERROR_EVENT_NAME = 'Code Component Event';
const MAX_ERROR_MESSAGE_LENGTH = 300;

function getBrowserContext(): Record<string, string | boolean> {
  if (typeof navigator === 'undefined') return {};

  const uaData = (navigator as Navigator & {
    userAgentData?: {
      brands?: Array<{ brand: string; version: string }>;
      mobile?: boolean;
      platform?: string;
    };
  }).userAgentData;
  const userAgent = navigator.userAgent || '';
  const platform = uaData?.platform || navigator.platform || 'unknown';
  const browserMatch =
    userAgent.match(/Edg\/([\d.]+)/) ||
    userAgent.match(/EdgiOS\/([\d.]+)/) ||
    userAgent.match(/OPR\/([\d.]+)/) ||
    userAgent.match(/CriOS\/([\d.]+)/) ||
    userAgent.match(/Chrome\/([\d.]+)/) ||
    userAgent.match(/FxiOS\/([\d.]+)/) ||
    userAgent.match(/Firefox\/([\d.]+)/) ||
    userAgent.match(/Version\/([\d.]+).*Safari\//);

  let browser = 'unknown';
  if (/Edg\/|EdgiOS\//.test(userAgent)) browser = 'Edge';
  else if (/OPR\//.test(userAgent)) browser = 'Opera';
  else if (/Chrome\/|CriOS\//.test(userAgent) && !/Chromium\//.test(userAgent)) browser = 'Chrome';
  else if (/Firefox\/|FxiOS\//.test(userAgent)) browser = 'Firefox';
  else if (/Safari\//.test(userAgent)) browser = 'Safari';

  const uaBrand = uaData?.brands?.find((brand) => !/Not.?A.?Brand/i.test(brand.brand));
  if (browser === 'unknown' && uaBrand) browser = uaBrand.brand;

  return {
    browser,
    browser_version: browserMatch?.[1] || uaBrand?.version || 'unknown',
    browser_platform: platform,
    browser_is_mobile: Boolean(uaData?.mobile ?? /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent)),
  };
}

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
    pathname: window.location.pathname,
    search: window.location.search,
    page_title: typeof document !== 'undefined' ? document.title : '',
    referrer: typeof document !== 'undefined' ? document.referrer || 'direct' : 'direct',
    current_category: urlParams.category || null,
    current_subcategory: urlParams.subcategory || null,
    experiment_key: experimentState?.key ?? null,
    experiment_variant: experimentState?.variant ?? null,
    experiment_assignment_source: experimentState?.source ?? null,
    timestamp: new Date().toISOString(),
    ...getBrowserContext(),
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
  options: TrackMarketplaceEventOptions = {},
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

  const shouldPrefixTemplateMarketplaceEvent = options.prefixTemplateMarketplaceEvent ?? true;
  const analyticsEventName =
    shouldPrefixTemplateMarketplaceEvent && !eventName.startsWith('[Template Marketplace]')
      ? `[Template Marketplace] ${eventName}`
      : eventName;

  try {
    window.analytics?.track?.(analyticsEventName, data);
  } catch {
    // Analytics must not block navigation or component interaction.
  }

  try {
    if (typeof window.amplitude?.track === 'function') {
      window.amplitude.track(analyticsEventName, data);
    } else if (typeof window.amplitude?.logEvent === 'function') {
      window.amplitude.logEvent(analyticsEventName, data);
    } else {
      window.amplitude?.getInstance?.()?.logEvent?.(analyticsEventName, data);
    }
  } catch {
    // Analytics must not block navigation or component interaction.
  }

  try {
    // Page-SDK outage resilience (2026-07-21): when no SDK is present the
    // fan-out above silently no-oped. Beacon the event to the owned Worker so
    // the funnel stays measurable. Gated on SDK absence to avoid double-counting.
    if (!hasPageAnalyticsSdk()) {
      sendTelemetryFallbackEvent(analyticsEventName, data);
    }
  } catch {
    // Analytics must not block navigation or component interaction.
  }
}

export function trackMarketplaceEventExact(
  eventName: string,
  eventData: MarketplaceAnalyticsData = {},
  enabled = true,
): void {
  trackMarketplaceEvent(eventName, eventData, enabled, { prefixTemplateMarketplaceEvent: false });
}

function normalizeErrorMessage(error: unknown): string {
  let message = '';
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else if (error && typeof error === 'object' && 'message' in error) {
    const candidate = (error as { message?: unknown }).message;
    if (typeof candidate === 'string') message = candidate;
  }

  return (message || 'Unknown component error').slice(0, MAX_ERROR_MESSAGE_LENGTH);
}

function getErrorName(error: unknown): string {
  return error instanceof Error && error.name ? error.name : 'Error';
}

export function trackMarketplaceComponentError(
  component: string,
  error: unknown,
  detail: MarketplaceAnalyticsData = {},
  enabled = true,
): void {
  trackMarketplaceEvent(
    COMPONENT_ERROR_EVENT_NAME,
    {
      component,
      scope: 'error',
      message: normalizeErrorMessage(error),
      error_name: getErrorName(error),
      ...detail,
    },
    enabled,
  );
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
