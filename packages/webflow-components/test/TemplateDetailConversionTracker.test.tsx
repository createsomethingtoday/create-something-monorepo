import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  LEGACY_TEMPLATE_DETAIL_PURCHASE_CTA_EVENT,
  trackTemplateDetailPurchaseCtaClick,
} from '../src/components/marketplace/TemplateDetailConversionTracker';
import { MARKETPLACE_LANDING_ANALYTICS_EVENT } from '../src/components/marketplace/analytics';

type GlobalWithBrowser = typeof globalThis & {
  window?: Window;
  document?: Document;
  CustomEvent?: typeof CustomEvent;
};

type TrackedEvent = {
  eventName: string;
  data?: Record<string, unknown>;
};

function installBrowserAnalyticsFixture() {
  const globalRef = globalThis as GlobalWithBrowser;
  const originalWindow = globalRef.window;
  const originalDocument = globalRef.document;
  const originalCustomEvent = globalRef.CustomEvent;

  if (typeof globalRef.CustomEvent === 'undefined') {
    globalRef.CustomEvent = class TestCustomEvent<T = unknown> extends Event {
      detail: T;

      constructor(type: string, eventInitDict?: CustomEventInit<T>) {
        super(type, eventInitDict);
        this.detail = eventInitDict?.detail as T;
      }
    } as typeof CustomEvent;
  }

  const browserWindow = new EventTarget() as Window & {
    analytics: { track: (eventName: string, data?: Record<string, unknown>) => void };
    amplitude: { track: (eventName: string, data?: Record<string, unknown>) => void };
    wf_analytics: { track: (eventName: string, data?: Record<string, unknown>) => void };
  };
  const browserDocument = new EventTarget() as Document;
  const customEvents: TrackedEvent[] = [];
  const segmentEvents: TrackedEvent[] = [];
  const amplitudeEvents: TrackedEvent[] = [];
  const wfEvents: TrackedEvent[] = [];

  Object.assign(browserWindow, {
    location: {
      href: 'https://webflow.com/templates/html/example?category=agency',
      pathname: '/templates/html/example',
      search: '?category=agency',
    },
    analytics: {
      track: (eventName: string, data?: Record<string, unknown>) => segmentEvents.push({ eventName, data }),
    },
    amplitude: {
      track: (eventName: string, data?: Record<string, unknown>) => amplitudeEvents.push({ eventName, data }),
    },
    wf_analytics: {
      track: (eventName: string, data?: Record<string, unknown>) => wfEvents.push({ eventName, data }),
    },
  });
  Object.assign(browserDocument, {
    title: 'Example template',
    referrer: 'https://webflow.com/templates',
  });
  browserWindow.addEventListener(MARKETPLACE_LANDING_ANALYTICS_EVENT, (event) => {
    const detail = (event as CustomEvent<TrackedEvent>).detail;
    customEvents.push(detail);
  });

  globalRef.window = browserWindow;
  globalRef.document = browserDocument;

  return {
    customEvents,
    segmentEvents,
    amplitudeEvents,
    wfEvents,
    restore: () => {
      globalRef.window = originalWindow;
      globalRef.document = originalDocument;
      globalRef.CustomEvent = originalCustomEvent;
    },
  };
}

test('purchase CTA tracking dual-fires the new scoped event and the exact legacy event', () => {
  const fixture = installBrowserAnalyticsFixture();

  try {
    trackTemplateDetailPurchaseCtaClick({
      component: 'TemplateDetailConversionTracker',
      scope: 'detail_purchase_cta_clicked',
      detail_template_slug: 'example',
      detail_price_bucket: 'paid',
      cta_location: 'hero',
      purchase_type: 'checkout',
    });

    assert.deepEqual(
      fixture.customEvents.map((event) => event.eventName),
      ['Code Component Event', LEGACY_TEMPLATE_DETAIL_PURCHASE_CTA_EVENT],
    );
    assert.deepEqual(
      fixture.segmentEvents.map((event) => event.eventName),
      ['[Template Marketplace] Code Component Event', LEGACY_TEMPLATE_DETAIL_PURCHASE_CTA_EVENT],
    );
    assert.deepEqual(
      fixture.amplitudeEvents.map((event) => event.eventName),
      ['[Template Marketplace] Code Component Event', LEGACY_TEMPLATE_DETAIL_PURCHASE_CTA_EVENT],
    );
    assert.deepEqual(
      fixture.wfEvents.map((event) => event.eventName),
      ['Code Component Event', LEGACY_TEMPLATE_DETAIL_PURCHASE_CTA_EVENT],
    );
    assert.equal(fixture.segmentEvents[1]?.data?.scope, 'detail_purchase_cta_clicked');
    assert.equal(fixture.segmentEvents[1]?.data?.detail_template_slug, 'example');
  } finally {
    fixture.restore();
  }
});
