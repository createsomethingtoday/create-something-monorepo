import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseMapMonitorD1Result,
  validateMapMonitorHealth
} from '../public-ga-verify.mjs';

const receiptSource = {
  kind: 'cloudflare-d1',
  workerName: 'map-production-monitor'
};
const expectedSourceSha = 'a'.repeat(40);

test('parses only a successful Cloudflare D1 Map receipt result', () => {
  const receipts = parseMapMonitorD1Result([
    {
      success: true,
      results: [
        {
          receipt_id: 'map-20260825060700-aaaaaaaaaaaa',
          schema_version: 1,
          trigger: 'scheduled',
          scheduled_at: '2026-08-25T06:07:00.000Z',
          completed_at: '2026-08-25T06:08:00.000Z',
          source_sha: 'a'.repeat(40),
          worker_version: 'version-1',
          base_url: 'https://createsomething.agency',
          status: 'passed',
          complete: 1,
          customer_data_used: 0,
          agent_mutation_used: 0,
          booking_submitted: 0,
          checks_json: '[{"id":"desktop_map_health","ok":true,"durationMs":4}]'
        }
      ]
    }
  ]);

  assert.deepEqual(receipts[0], {
    receiptId: 'map-20260825060700-aaaaaaaaaaaa',
    schemaVersion: 1,
    trigger: 'scheduled',
    scheduledAt: '2026-08-25T06:07:00.000Z',
    completedAt: '2026-08-25T06:08:00.000Z',
    sourceSha: 'a'.repeat(40),
    workerVersion: 'version-1',
    baseUrl: 'https://createsomething.agency',
    status: 'passed',
    complete: true,
    customerDataUsed: false,
    agentMutationUsed: false,
    bookingSubmitted: false,
    checks: [{ id: 'desktop_map_health', ok: true, durationMs: 4 }]
  });
});

test('rejects malformed Cloudflare D1 receipt result sets', () => {
  assert.throws(() => parseMapMonitorD1Result([]), /exactly one result set/);
  assert.throws(
    () => parseMapMonitorD1Result([{ success: false, results: [] }]),
    /not successful/
  );
  assert.throws(
    () =>
      parseMapMonitorD1Result([
        { success: true, results: [{ receipt_id: 'bad', checks_json: '{' }] }
      ]),
    /invalid checks JSON/
  );
});

test('requires a ready scheduled-only Cloudflare Map receipt lane', () => {
  assert.deepEqual(
    validateMapMonitorHealth(
      {
        schemaVersion: 1,
        status: 'ready',
        worker: 'map-production-monitor',
        receiptStore: 'cloudflare-d1',
        scheduledOnly: true,
        sourceSha: expectedSourceSha
      },
      receiptSource,
      expectedSourceSha
    ),
    []
  );
  assert.match(
    validateMapMonitorHealth(
      {
        schemaVersion: 1,
        status: 'ready',
        worker: 'map-production-monitor',
        receiptStore: 'cloudflare-d1',
        scheduledOnly: false
      },
      receiptSource,
      expectedSourceSha
    ).join('\n'),
    /non-scheduled execution mode/
  );
  assert.match(
    validateMapMonitorHealth(
      {
        schemaVersion: 1,
        status: 'ready',
        worker: 'map-production-monitor',
        receiptStore: 'cloudflare-d1',
        scheduledOnly: true,
        sourceSha: 'b'.repeat(40)
      },
      receiptSource,
      expectedSourceSha
    ).join('\n'),
    /source SHA does not match the GA commit/
  );
});
