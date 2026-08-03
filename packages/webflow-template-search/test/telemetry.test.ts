import { describe, expect, it } from 'vitest';

import { parseTelemetryBody } from '../src/telemetry';

function event(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    event_type: '[Template Marketplace] Code Component Event',
    event_properties: { component: 'TemplateGrid', transport: 'beacon_fallback' },
    device_id: 'device-123',
    insert_id: 'insert-456',
    time: Date.now(),
    ...overrides,
  };
}

describe('telemetry fallback payload parsing', () => {
  it('accepts well-formed component events', () => {
    const events = parseTelemetryBody(JSON.stringify({ events: [event()] }));
    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe('[Template Marketplace] Code Component Event');
    expect(events[0].device_id).toBe('device-123');
  });

  it('accepts the legacy purchase CTA event name', () => {
    const events = parseTelemetryBody(
      JSON.stringify({ events: [event({ event_type: 'Template Detail Page - Purchase CTA Clicked' })] }),
    );
    expect(events).toHaveLength(1);
  });

  it('rejects event names outside the component allowlist', () => {
    const spam = parseTelemetryBody(JSON.stringify({ events: [event({ event_type: 'Signed Up' })] }));
    expect(spam).toHaveLength(0);
  });

  it('rejects malformed bodies, oversized payloads, and missing ids', () => {
    expect(parseTelemetryBody('not json')).toHaveLength(0);
    expect(parseTelemetryBody(JSON.stringify({ events: 'nope' }))).toHaveLength(0);
    expect(parseTelemetryBody(JSON.stringify({ events: [event({ device_id: '' })] }))).toHaveLength(0);
    expect(parseTelemetryBody(JSON.stringify({ events: [event({ insert_id: undefined })] }))).toHaveLength(0);
    expect(
      parseTelemetryBody(JSON.stringify({ events: [event({ device_id: 'x'.repeat(65) })] })),
    ).toHaveLength(0);

    const oversized = JSON.stringify({
      events: [event({ event_properties: { blob: 'x'.repeat(70_000) } })],
    });
    expect(parseTelemetryBody(oversized)).toHaveLength(0);
  });

  it('caps events per request and clamps absurd timestamps', () => {
    const now = Date.now();
    const many = Array.from({ length: 40 }, () => event());
    expect(parseTelemetryBody(JSON.stringify({ events: many }), now)).toHaveLength(25);

    const [clamped] = parseTelemetryBody(
      JSON.stringify({ events: [event({ time: now - 365 * 24 * 60 * 60 * 1000 })] }),
      now,
    );
    expect(clamped.time).toBe(now);
  });
});
