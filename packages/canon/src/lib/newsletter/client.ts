import { getAnalytics } from '../analytics/client.js';

/** Reuse existing analytics consent/session; subscribing never grants tracking permission. */
export function newsletterSignupContext() {
  const analytics = getAnalytics();
  if (
    typeof window === 'undefined' ||
    !analytics ||
    analytics.isTrackingDisabled() ||
    (typeof navigator !== 'undefined' &&
      (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl)
  ) {
    return { analyticsEnabled: false };
  }
  return {
    analyticsEnabled: true,
    sessionId: analytics.getSessionId(),
    sourceProperty: analytics.getSourceProperty() ?? undefined,
    landingUrl: window.location.href,
    referrer: typeof document !== 'undefined' ? document.referrer : undefined
  };
}
