import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DECISION_GARDEN_BLOCKED_ACTIONS,
  buildRetoolReviewPacket,
  eventPayloadWithRetoolReviewPacket
} from '../src/retool-review-packet.js';

test('builds a Retool review packet from a compact Decision Garden event', () => {
  const packet = buildRetoolReviewPacket(
    {
      type: 'offline_decision_garden',
      source: 'core-ink',
      summary: 'Core Ink Decision Garden packet',
      payload: {
        marked_slots: 7,
        cursor: 6,
        device_id: 'core-ink-01',
        battery: 82
      }
    },
    Date.parse('2026-05-10T04:31:00.000Z')
  );

  assert.deepEqual(packet, {
    source: 'core-ink',
    marked_slots: 7,
    cursor: 6,
    timestamp: '2026-05-10T04:31:00.000Z',
    device_id: 'core-ink-01',
    battery: 82,
    suggested_review_lane: 'workflow-readiness-map',
    blocked_actions: DECISION_GARDEN_BLOCKED_ACTIONS
  });
});

test('does not propagate sensitive freeform payload into the review packet', () => {
  const { payload, review_packet } = eventPayloadWithRetoolReviewPacket(
    {
      type: 'offline_decision_garden',
      source: 'core-ink',
      payload: {
        marked_slots: 1,
        cursor: 0,
        device_id: 'core-ink',
        sensitive_text: 'Do not store this in Retool packet',
        business_context: 'private client note'
      }
    },
    Date.parse('2026-05-10T04:31:00.000Z')
  );

  assert.equal(review_packet?.marked_slots, 1);
  assert.deepEqual(Object.keys(review_packet ?? {}).sort(), [
    'battery',
    'blocked_actions',
    'cursor',
    'device_id',
    'marked_slots',
    'source',
    'suggested_review_lane',
    'timestamp'
  ]);
  assert.equal(typeof payload.review_packet, 'object');
});

test('ignores unrelated operator events', () => {
  assert.equal(
    buildRetoolReviewPacket({
      type: 'manual_check_in',
      source: 'core-ink',
      payload: {
        device_id: 'core-ink',
        battery: 80
      }
    }),
    null
  );
});
