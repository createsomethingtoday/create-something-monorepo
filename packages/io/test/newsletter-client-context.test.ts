import { beforeEach, describe, expect, it, vi } from 'vitest';
const { analytics } = vi.hoisted(() => ({
  analytics: {
    current: null as null | {
      isTrackingDisabled(): boolean;
      getSessionId(): string;
      getSourceProperty(): string;
    }
  }
}));
vi.mock('../../canon/src/lib/analytics/client.js', () => ({
  getAnalytics: () => analytics.current
}));
import { newsletterSignupContext } from '../../canon/src/lib/newsletter/client';

beforeEach(() => {
  vi.unstubAllGlobals();
  analytics.current = null;
});
describe('consent-aware context shared by every newsletter signup client', () => {
  it('passes the existing enabled preference and attribution context without creating a session', () => {
    vi.stubGlobal('window', {
      location: {
        href: 'https://createsomething.io/newsletters?utm_source=newsletter&utm_medium=email&utm_campaign=2026-09-08-test-the-checker'
      }
    });
    vi.stubGlobal('document', { referrer: 'https://createsomething.io/papers/proof-surface' });
    vi.stubGlobal('navigator', { globalPrivacyControl: false });
    analytics.current = {
      isTrackingDisabled: () => false,
      getSessionId: () => 'existing-session',
      getSourceProperty: () => 'io'
    };
    expect(newsletterSignupContext()).toEqual({
      analyticsEnabled: true,
      sessionId: 'existing-session',
      sourceProperty: 'io',
      landingUrl: window.location.href,
      referrer: document.referrer
    });
  });
  for (const reason of ['no client', 'disabled preference', 'GPC', 'server'])
    it(`does not infer analytics permission for ${reason}`, () => {
      if (reason !== 'server') {
        vi.stubGlobal('window', { location: { href: 'https://createsomething.io/subscribe' } });
        vi.stubGlobal('document', { referrer: '' });
      }
      vi.stubGlobal('navigator', { globalPrivacyControl: reason === 'GPC' });
      if (reason !== 'no client')
        analytics.current = {
          isTrackingDisabled: () => reason === 'disabled preference',
          getSessionId: () => 'private-session',
          getSourceProperty: () => 'io'
        };
      expect(newsletterSignupContext()).toEqual({ analyticsEnabled: false });
    });
});
