// First-party telemetry fallback for the Template Marketplace code components.
//
// The components normally fan events out to the page-level analytics SDKs
// (wf_analytics, Segment, Amplitude). When those scripts fail to load — as in
// the 2026-07-21 webflow.com outage — every guarded call silently no-ops and
// the funnel goes dark even though the storefront keeps working. This module
// keeps a minimal signal alive by beaconing events to the owned
// webflow-template-search Worker (`/api/templates/telemetry`), which forwards
// them to Amplitude server-side.
//
// Design constraints, in order:
// 1. Never block or break the page. Every path is wrapped and fire-and-forget.
// 2. Never double-count. The fallback fires only when NO page SDK is present.
// 3. Stay bounded. A hard per-page event cap prevents runaway loops.

// workers.dev is primary: the templates.webflow.com/templates-api custom
// domain is fronted by a Next.js proxy app that only forwards known paths —
// verified 2026-08-03 that /api/templates/telemetry 404s there while the
// workers.dev origin accepts. Flip the order once the proxy gains the route.
export const TELEMETRY_FALLBACK_ENDPOINT =
  'https://webflow-template-search.createsomething.workers.dev/api/templates/telemetry';
export const TELEMETRY_FALLBACK_ENDPOINT_SECONDARY =
  'https://templates.webflow.com/templates-api/api/templates/telemetry';

export const TELEMETRY_FALLBACK_TRANSPORT = 'beacon_fallback';
const DEVICE_ID_STORAGE_KEY = 'wf_tm_beacon_device_id';
const MAX_FALLBACK_EVENTS_PER_PAGE = 200;
const MAX_PAYLOAD_CHARS = 60_000;

interface FallbackEvent {
  event_type: string;
  event_properties: Record<string, unknown>;
  device_id: string;
  insert_id: string;
  time: number;
}

let sentThisPage = 0;

/** Test hook: reset per-page state between test cases. */
export function resetTelemetryFallbackForTests(): void {
  sentThisPage = 0;
  pendingIndeterminate = [];
  if (graceTimer !== null) {
    clearTimeout(graceTimer);
    graceTimer = null;
  }
  flushHooked = false;
  zombieVerdict = false;
}

export type PageAnalyticsSdkHealth = 'healthy' | 'indeterminate' | 'absent';

/**
 * Three-state SDK assessment. A `track` function alone is NOT evidence of a
 * working pipeline: since ~2026-08-04 webflow.com ships a wf_analytics shim
 * whose track() swallows events with zero network egress and whose
 * isInitialized() never flips true (the marketing scripts that load the real
 * bundle are empty husks). Segment's snippet similarly stubs track() before
 * analytics.js loads. Such shims are 'indeterminate' — maybe still loading,
 * maybe zombies — and their events are buffered for a grace period instead of
 * being dropped or double-sent.
 */
export function assessPageAnalyticsSdk(): PageAnalyticsSdkHealth {
  if (typeof window === 'undefined') return 'healthy'; // SSR: nothing to fall back for.
  let sawShim = false;
  try {
    const wf = window.wf_analytics;
    if (typeof wf?.track === 'function') {
      if (typeof wf.isInitialized === 'function') {
        if (wf.isInitialized()) return 'healthy';
        sawShim = true; // Present but uninitialized: loading or zombie.
      } else {
        // No introspection surface — assume the old working bundle rather
        // than risk double-counting alongside it.
        return 'healthy';
      }
    }
    const segment = window.analytics;
    if (typeof segment?.track === 'function') {
      // The snippet stub queues method calls; the real analytics.js sets
      // `initialized` and exposes non-queueable members like user().
      if (segment.initialized || typeof segment.user === 'function') return 'healthy';
      sawShim = true;
    }
    const amplitude = window.amplitude;
    if (typeof amplitude?.track === 'function') return 'healthy';
    if (typeof amplitude?.logEvent === 'function') return 'healthy';
    if (typeof amplitude?.getInstance === 'function') return 'healthy';
  } catch {
    // Property access on a broken SDK shim must not break tracking.
  }
  return sawShim ? 'indeterminate' : 'absent';
}

/** True when a page-level analytics SDK is verifiably able to deliver events. */
export function hasPageAnalyticsSdk(): boolean {
  return assessPageAnalyticsSdk() === 'healthy';
}

function randomId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // Fall through to the non-crypto fallback.
  }
  return `f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function fallbackDeviceId(): string {
  try {
    const stored = window.localStorage?.getItem(DEVICE_ID_STORAGE_KEY);
    if (stored) return stored;
    const created = randomId();
    window.localStorage?.setItem(DEVICE_ID_STORAGE_KEY, created);
    return created;
  } catch {
    // Storage unavailable (privacy mode): a per-page id still allows counting.
    return randomId();
  }
}

function postPayload(payload: string): void {
  // text/plain keeps this a CORS "simple request": sendBeacon and keepalive
  // fetch both deliver without a preflight, even mid-navigation.
  let beaconAccepted = false;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      beaconAccepted = navigator.sendBeacon(
        TELEMETRY_FALLBACK_ENDPOINT,
        new Blob([payload], { type: 'text/plain;charset=UTF-8' }),
      );
    }
  } catch {
    beaconAccepted = false;
  }
  if (beaconAccepted) return;

  try {
    void fetch(TELEMETRY_FALLBACK_ENDPOINT_SECONDARY, {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      keepalive: true,
      mode: 'cors',
    }).catch(() => {
      // Telemetry must never surface errors to the page.
    });
  } catch {
    // fetch itself unavailable: give up silently.
  }
}

/**
 * Send one event to the owned telemetry endpoint. Callers are expected to
 * gate on `hasPageAnalyticsSdk()` so this only runs when the page SDKs are
 * down; the event lands in the same Amplitude project via the Worker.
 */
export function sendTelemetryFallbackEvent(
  eventType: string,
  eventProperties: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return;
  if (!eventType || sentThisPage >= MAX_FALLBACK_EVENTS_PER_PAGE) return;

  try {
    const event: FallbackEvent = {
      event_type: eventType,
      event_properties: { ...eventProperties, transport: TELEMETRY_FALLBACK_TRANSPORT },
      device_id: fallbackDeviceId(),
      insert_id: randomId(),
      time: Date.now(),
    };
    const payload = JSON.stringify({ events: [event] });
    if (payload.length > MAX_PAYLOAD_CHARS) return;

    sentThisPage += 1;
    postPayload(payload);
  } catch {
    // Serialization failures must never block the interaction being tracked.
  }
}

// ── Indeterminate-SDK buffering ───────────────────────────────────────────────
// Events emitted while the SDK is a not-yet-initialized shim are held for a
// grace window. If the real bundle finishes loading, it owns the events (the
// fan-out already invoked its queueing track()); the buffer is dropped. If the
// shim is still uninitialized at the deadline — today's zombie failure mode —
// the buffer flushes to the beacon. A queueing stub's in-memory backlog dies
// with the page, so the pagehide flush cannot double-count either.

/** How long a present-but-uninitialized SDK gets to prove it can deliver. */
export const INDETERMINATE_SDK_GRACE_MS = 6_000;

let pendingIndeterminate: Array<{ eventType: string; properties: Record<string, unknown> }> = [];
let graceTimer: ReturnType<typeof setTimeout> | null = null;
let flushHooked = false;
let zombieVerdict = false;

function flushIndeterminate(): void {
  if (graceTimer !== null) {
    clearTimeout(graceTimer);
    graceTimer = null;
  }
  const pending = pendingIndeterminate;
  pendingIndeterminate = [];
  if (pending.length === 0) return;
  if (assessPageAnalyticsSdk() === 'healthy') return; // SDK loaded; it owns these events.
  zombieVerdict = true;
  for (const item of pending) sendTelemetryFallbackEvent(item.eventType, item.properties);
}

function bufferIndeterminateEvent(eventType: string, properties: Record<string, unknown>): void {
  if (pendingIndeterminate.length >= MAX_FALLBACK_EVENTS_PER_PAGE) return;
  pendingIndeterminate.push({ eventType, properties });
  if (graceTimer === null) {
    try {
      graceTimer = setTimeout(flushIndeterminate, INDETERMINATE_SDK_GRACE_MS);
    } catch {
      graceTimer = null;
    }
  }
  if (!flushHooked) {
    flushHooked = true;
    try {
      window.addEventListener('pagehide', flushIndeterminate);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flushIndeterminate();
      });
    } catch {
      // Listener installation is best-effort; the grace timer still flushes.
    }
  }
}

/**
 * Single fallback entry point for the marketplace tracker: sends immediately
 * when no SDK exists, drops when a working SDK is present, and buffers for
 * the grace window when only an uninitialized shim is present.
 */
export function maybeSendTelemetryFallback(
  eventType: string,
  eventProperties: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return;
  const health = assessPageAnalyticsSdk();
  if (health === 'healthy') return;
  if (health === 'absent' || zombieVerdict) {
    sendTelemetryFallbackEvent(eventType, eventProperties);
    return;
  }
  bufferIndeterminateEvent(eventType, eventProperties);
}

/** Test hook: force the grace-window flush without waiting on the timer. */
export function flushIndeterminateForTests(): void {
  flushIndeterminate();
}
