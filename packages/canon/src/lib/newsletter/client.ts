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
  let landingUrl = window.location.href;
  let referrer = typeof document !== 'undefined' ? document.referrer : undefined;
  // Only the retained, same-origin form bridge may use its enclosing document.
  try {
    if (window.location.pathname === '/newsletters/signup-form' &&
        window.parent !== window && window.parent.location.origin === window.location.origin) {
      landingUrl = window.parent.location.href;
      referrer = window.parent.document.referrer;
    }
  } catch { /* Cross-origin embeds keep their own context. */ }
  return {
    analyticsEnabled: true,
    sessionId: analytics.getSessionId(),
    sourceProperty: analytics.getSourceProperty() ?? undefined,
    landingUrl,
    referrer
  };
}
