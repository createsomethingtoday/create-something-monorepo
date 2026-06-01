export const TEMPLATE_MARKETPLACE_COMPONENT_VERSION = '2026-05-28.2';

type AnalyticsWindow = Window & {
  wf_analytics?: {
    track?: (event: string, data: Record<string, unknown>) => void;
  };
};

export function emitTemplateComponentEvent(
  component: string,
  event: string,
  payload: Record<string, unknown> = {},
): void {
  if (typeof window === 'undefined') return;

  const detail = {
    component,
    event,
    version: TEMPLATE_MARKETPLACE_COMPONENT_VERSION,
    pathname: window.location.pathname,
    search: window.location.search,
    ...payload,
  };

  window.dispatchEvent(new CustomEvent('templateMarketplaceComponent', { detail }));
  document.dispatchEvent(new CustomEvent('templateMarketplaceComponent', { detail }));

  const analytics = (window as AnalyticsWindow).wf_analytics;
  if (typeof analytics?.track === 'function') {
    analytics.track('[Template Marketplace] Code Component Event', detail);
  }
}
