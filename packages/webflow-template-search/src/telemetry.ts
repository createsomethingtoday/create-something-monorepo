// First-party telemetry fallback endpoint.
//
// The Template Marketplace code components beacon events here when the
// page-level analytics SDKs on webflow.com fail to load (as in the 2026-07-21
// outage). The Worker validates the payload and forwards it to Amplitude's
// HTTP API server-side, so the funnel keeps flowing into the same project
// ("Webflow Prod Events") the browser SDKs normally feed.
//
// Requires the AMPLITUDE_API_KEY secret (the project's client API key —
// public by design in browser bundles, kept server-side here anyway). When
// the secret is absent, events are accepted and dropped so the client never
// sees an error: `wrangler secret put AMPLITUDE_API_KEY`.

import { jsonResponse } from './http.js';
import type { Env } from './types.js';

const AMPLITUDE_HTTP_API = 'https://api2.amplitude.com/2/httpapi';

const MAX_BODY_CHARS = 64_000;
const MAX_EVENTS_PER_REQUEST = 25;
const MAX_EVENT_TYPE_LENGTH = 128;
const MAX_ID_LENGTH = 64;
// Only component-emitted event names are forwarded; anything else is spam.
const ALLOWED_EVENT_PREFIXES = ['[Template Marketplace]', 'Template Detail Page -'];
// Reject timestamps outside a sane clock-skew window instead of trusting them.
const MAX_CLOCK_SKEW_MS = 7 * 24 * 60 * 60 * 1000;

interface TelemetryEvent {
  event_type: string;
  event_properties: Record<string, unknown>;
  device_id: string;
  insert_id: string;
  time: number;
}

function sanitizeEvent(raw: unknown, now: number): TelemetryEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Record<string, unknown>;

  const eventType = candidate.event_type;
  if (typeof eventType !== 'string' || !eventType || eventType.length > MAX_EVENT_TYPE_LENGTH) {
    return null;
  }
  if (!ALLOWED_EVENT_PREFIXES.some((prefix) => eventType.startsWith(prefix))) return null;

  const deviceId = candidate.device_id;
  const insertId = candidate.insert_id;
  if (typeof deviceId !== 'string' || !deviceId || deviceId.length > MAX_ID_LENGTH) return null;
  if (typeof insertId !== 'string' || !insertId || insertId.length > MAX_ID_LENGTH) return null;

  const time = typeof candidate.time === 'number' ? candidate.time : now;
  const clampedTime = Math.abs(time - now) > MAX_CLOCK_SKEW_MS ? now : time;

  const properties =
    candidate.event_properties && typeof candidate.event_properties === 'object'
      ? (candidate.event_properties as Record<string, unknown>)
      : {};

  return {
    event_type: eventType,
    event_properties: properties,
    device_id: deviceId,
    insert_id: insertId,
    time: clampedTime,
  };
}

export function parseTelemetryBody(body: string, now = Date.now()): TelemetryEvent[] {
  if (!body || body.length > MAX_BODY_CHARS) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return [];
  }

  const rawEvents = Array.isArray((parsed as { events?: unknown })?.events)
    ? ((parsed as { events: unknown[] }).events as unknown[])
    : [];

  return rawEvents
    .slice(0, MAX_EVENTS_PER_REQUEST)
    .map((raw) => sanitizeEvent(raw, now))
    .filter((event): event is TelemetryEvent => event !== null);
}

async function forwardToAmplitude(apiKey: string, events: TelemetryEvent[]): Promise<void> {
  try {
    await fetch(AMPLITUDE_HTTP_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: '*/*' },
      body: JSON.stringify({ api_key: apiKey, events }),
    });
  } catch {
    // Forwarding is best-effort; the client already got its 202.
  }
}

export async function handleTelemetry(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  let body = '';
  try {
    body = await request.text();
  } catch {
    return jsonResponse(request, env, { accepted: 0, forwarded: false }, 202);
  }

  const events = parseTelemetryBody(body);
  const apiKey = env.AMPLITUDE_API_KEY?.trim();

  if (events.length > 0 && apiKey) {
    ctx.waitUntil(forwardToAmplitude(apiKey, events));
  }

  // Always 202: telemetry clients (sendBeacon) cannot act on errors, and a
  // non-2xx would only add console noise on visitors' pages.
  return jsonResponse(
    request,
    env,
    { accepted: events.length, forwarded: events.length > 0 && Boolean(apiKey) },
    202,
  );
}
