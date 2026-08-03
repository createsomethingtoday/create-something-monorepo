import assert from 'node:assert/strict';
import { test } from 'node:test';
import { trackMarketplaceEvent } from '../src/components/marketplace/analytics';
import {
  hasPageAnalyticsSdk,
  resetTelemetryFallbackForTests,
  sendTelemetryFallbackEvent,
  TELEMETRY_FALLBACK_ENDPOINT,
  TELEMETRY_FALLBACK_ENDPOINT_SECONDARY,
} from '../src/components/marketplace/telemetryFallback';

type GlobalWithBrowser = typeof globalThis & {
  window?: Window;
  document?: Document;
  CustomEvent?: typeof CustomEvent;
};

interface BeaconCall {
  url: string;
  payload: string;
}

interface FetchCall {
  url: string;
  body: string;
}

async function blobToString(data: Blob | string): Promise<string> {
  return typeof data === 'string' ? data : await data.text();
}

function installFixture(options: { sdkPresent?: boolean; beaconAccepts?: boolean } = {}) {
  const { sdkPresent = false, beaconAccepts = true } = options;
  const globalRef = globalThis as GlobalWithBrowser;
  const originalWindow = globalRef.window;
  const originalDocument = globalRef.document;
  const originalCustomEvent = globalRef.CustomEvent;
  const originalFetch = globalThis.fetch;
  const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

  if (typeof globalRef.CustomEvent === 'undefined') {
    globalRef.CustomEvent = class TestCustomEvent<T = unknown> extends Event {
      detail: T;

      constructor(type: string, eventInitDict?: CustomEventInit<T>) {
        super(type, eventInitDict);
        this.detail = eventInitDict?.detail as T;
      }
    } as typeof CustomEvent;
  }

  const beaconCalls: BeaconCall[] = [];
  const fetchCalls: FetchCall[] = [];
  const rawBeaconPayloads: Array<Blob | string> = [];

  const storage = new Map<string, string>();
  const browserWindow = new EventTarget() as Window & Record<string, unknown>;
  Object.assign(browserWindow, {
    location: {
      href: 'https://webflow.com/templates?category=agency',
      pathname: '/templates',
      search: '?category=agency',
      origin: 'https://webflow.com',
    },
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => void storage.set(key, value),
      removeItem: (key: string) => void storage.delete(key),
    },
  });
  if (sdkPresent) {
    (browserWindow as Record<string, unknown>).analytics = { track: () => undefined };
  }

  globalRef.window = browserWindow;
  globalRef.document = new EventTarget() as Document;

  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      sendBeacon: (url: string, data: Blob | string) => {
        rawBeaconPayloads.push(data);
        beaconCalls.push({ url, payload: '' });
        return beaconAccepts;
      },
    },
  });

  globalThis.fetch = ((url: string, init?: RequestInit) => {
    fetchCalls.push({ url: String(url), body: String(init?.body ?? '') });
    return Promise.resolve(new Response(null, { status: 202 }));
  }) as typeof fetch;

  resetTelemetryFallbackForTests();

  return {
    beaconCalls,
    fetchCalls,
    async beaconPayload(index: number): Promise<string> {
      return blobToString(rawBeaconPayloads[index]);
    },
    restore() {
      globalRef.window = originalWindow;
      globalRef.document = originalDocument;
      globalRef.CustomEvent = originalCustomEvent;
      globalThis.fetch = originalFetch;
      if (originalNavigatorDescriptor) {
        Object.defineProperty(globalThis, 'navigator', originalNavigatorDescriptor);
      } else {
        delete (globalThis as Record<string, unknown>).navigator;
      }
      resetTelemetryFallbackForTests();
    },
  };
}

test('hasPageAnalyticsSdk reflects SDK availability', () => {
  const withSdk = installFixture({ sdkPresent: true });
  try {
    assert.equal(hasPageAnalyticsSdk(), true);
  } finally {
    withSdk.restore();
  }

  const withoutSdk = installFixture({ sdkPresent: false });
  try {
    assert.equal(hasPageAnalyticsSdk(), false);
  } finally {
    withoutSdk.restore();
  }
});

test('beacons the event with device id and transport marker when no SDK is present', async () => {
  const fixture = installFixture({ sdkPresent: false });
  try {
    sendTelemetryFallbackEvent('[Template Marketplace] Code Component Event', {
      component: 'TemplateGrid',
      scope: 'results_rendered',
    });

    assert.equal(fixture.beaconCalls.length, 1);
    assert.equal(fixture.beaconCalls[0].url, TELEMETRY_FALLBACK_ENDPOINT);

    const payload = JSON.parse(await fixture.beaconPayload(0)) as {
      events: Array<{
        event_type: string;
        event_properties: Record<string, unknown>;
        device_id: string;
        insert_id: string;
        time: number;
      }>;
    };
    assert.equal(payload.events.length, 1);
    const event = payload.events[0];
    assert.equal(event.event_type, '[Template Marketplace] Code Component Event');
    assert.equal(event.event_properties.component, 'TemplateGrid');
    assert.equal(event.event_properties.transport, 'beacon_fallback');
    assert.ok(event.device_id.length > 0);
    assert.ok(event.insert_id.length > 0);
    assert.ok(Number.isFinite(event.time));

    // Device id is stable across events on the same page.
    sendTelemetryFallbackEvent('[Template Marketplace] Code Component Event', { scope: 'second' });
    const second = JSON.parse(await fixture.beaconPayload(1)) as typeof payload;
    assert.equal(second.events[0].device_id, event.device_id);
    assert.notEqual(second.events[0].insert_id, event.insert_id);
  } finally {
    fixture.restore();
  }
});

test('falls back to keepalive fetch when sendBeacon rejects the payload', () => {
  const fixture = installFixture({ sdkPresent: false, beaconAccepts: false });
  try {
    sendTelemetryFallbackEvent('[Template Marketplace] Code Component Event', { scope: 'x' });
    assert.equal(fixture.fetchCalls.length, 1);
    assert.equal(fixture.fetchCalls[0].url, TELEMETRY_FALLBACK_ENDPOINT_SECONDARY);
    assert.ok(fixture.fetchCalls[0].body.includes('"events"'));
  } finally {
    fixture.restore();
  }
});

test('trackMarketplaceEvent triggers the fallback only when SDKs are absent', () => {
  const noSdk = installFixture({ sdkPresent: false });
  try {
    trackMarketplaceEvent('Code Component Event', { component: 'TemplateGrid', scope: 'test' });
    assert.equal(noSdk.beaconCalls.length, 1, 'fallback fires during an SDK outage');
  } finally {
    noSdk.restore();
  }

  const sdk = installFixture({ sdkPresent: true });
  try {
    trackMarketplaceEvent('Code Component Event', { component: 'TemplateGrid', scope: 'test' });
    assert.equal(sdk.beaconCalls.length, 0, 'no double-count when an SDK handled the event');
  } finally {
    sdk.restore();
  }
});

test('caps fallback volume per page', () => {
  const fixture = installFixture({ sdkPresent: false });
  try {
    for (let i = 0; i < 250; i += 1) {
      sendTelemetryFallbackEvent('[Template Marketplace] Code Component Event', { i });
    }
    assert.equal(fixture.beaconCalls.length, 200);
  } finally {
    fixture.restore();
  }
});
