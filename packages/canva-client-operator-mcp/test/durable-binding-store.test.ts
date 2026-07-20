import assert from 'node:assert/strict';
import test from 'node:test';

import { CanvaClientBindingObject } from '../src/durable-binding-store.js';

test('Durable Object atomically audits and clears a pending reset', async () => {
  const records = new Map<string, unknown>();
  const object = new CanvaClientBindingObject({
    storage: {
      get: async (key: string) => records.get(key),
      put: async (key: string, value: unknown) => { records.set(key, value); },
      delete: async (key: string) => records.delete(key),
    },
  } as never);

  const post = (path: string, body: Record<string, unknown>) =>
    object.fetch(new Request(`https://binding.internal${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }));

  assert.equal((await post('/reserve', {
    reservationId: 'reservation_1',
    operatorSubject: 'operator_123',
    now: '2026-07-16T21:00:00.000Z',
  })).status, 200);
  assert.equal((await post('/attach', {
    reservationId: 'reservation_1',
    connectionRequestId: 'ca_stale_pending',
    redirectUrl: 'https://connect.composio.dev/link/ln_stale_pending',
  })).status, 200);
  assert.equal((await post('/reset-pending', {
    expectedReservationId: 'reservation_1',
    previousConnectionRequestId: 'ca_stale_pending',
    operatorSubject: 'operator_456',
    resetAt: '2026-07-16T21:05:00.000Z',
    receiptId: 'reset_receipt_1',
    revoked: true,
  })).status, 200);

  assert.equal(records.has('binding'), false);
  assert.deepEqual(records.get('audit:reset_receipt_1'), {
    receiptId: 'reset_receipt_1',
    previousStatus: 'pending',
    previousConnectionRequestId: 'ca_stale_pending',
    operatorSubject: 'operator_456',
    resetAt: '2026-07-16T21:05:00.000Z',
    revoked: true,
  });
});
