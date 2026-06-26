import type { OperatorEventInput } from './types.js';

export interface RetoolReviewPacket {
  source: string;
  marked_slots: number;
  cursor: number;
  timestamp: string;
  device_id: string;
  battery: number | null;
  suggested_review_lane: string;
  blocked_actions: string[];
}

export const DECISION_GARDEN_BLOCKED_ACTIONS = [
  'expand_into_config',
  'mutate_client_metadata',
  'create_client_work',
  'change_code_or_production',
  'rotate_or_write_secrets',
  'change_permissions'
];

const DECISION_GARDEN_EVENT_TYPES = new Set(['offline_decision_garden', 'decision_garden']);

function payloadRecord(input: OperatorEventInput): Record<string, unknown> {
  return typeof input.payload === 'object' && input.payload !== null && !Array.isArray(input.payload)
    ? input.payload
    : {};
}

function numberFrom(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return fallback;
}

function stringFrom(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function suggestedLane(markedSlots: number): string {
  if (markedSlots >= 9) return 'priority-review';
  if (markedSlots >= 6) return 'workflow-readiness-map';
  return 'operator-inbox';
}

export function buildRetoolReviewPacket(
  input: OperatorEventInput,
  observedAtMs = Date.now()
): RetoolReviewPacket | null {
  const payload = payloadRecord(input);
  const type = stringFrom(input.type, stringFrom(payload.kind, ''));
  const hasMarkedSlots = payload.marked_slots !== undefined;
  if (!DECISION_GARDEN_EVENT_TYPES.has(type) && !hasMarkedSlots) return null;

  const markedSlots = Math.max(0, Math.min(9, Math.round(numberFrom(payload.marked_slots, 0))));
  const cursor = Math.max(0, Math.min(8, Math.round(numberFrom(payload.cursor, 0))));
  const batteryValue = payload.battery ?? payload.battery_percent;
  const battery = batteryValue === undefined ? null : Math.max(0, Math.min(100, Math.round(numberFrom(batteryValue, 0))));

  return {
    source: stringFrom(input.source, stringFrom(payload.source, 'core-ink')),
    marked_slots: markedSlots,
    cursor,
    timestamp: new Date(observedAtMs).toISOString(),
    device_id: stringFrom(payload.device_id, 'core-ink'),
    battery,
    suggested_review_lane: stringFrom(payload.suggested_review_lane, suggestedLane(markedSlots)),
    blocked_actions: [...DECISION_GARDEN_BLOCKED_ACTIONS]
  };
}

export function eventPayloadWithRetoolReviewPacket(
  input: OperatorEventInput,
  observedAtMs = Date.now()
): {
  payload: Record<string, unknown>;
  review_packet: RetoolReviewPacket | null;
} {
  const payload = payloadRecord(input);
  const reviewPacket = buildRetoolReviewPacket(input, observedAtMs);
  if (!reviewPacket) return { payload, review_packet: null };

  return {
    payload: {
      ...payload,
      review_packet: reviewPacket
    },
    review_packet: reviewPacket
  };
}
