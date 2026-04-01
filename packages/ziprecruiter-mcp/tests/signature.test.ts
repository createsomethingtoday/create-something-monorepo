import assert from 'node:assert/strict';
import test from 'node:test';

import {
  computeZipRecruiterSignature,
  verifyZipRecruiterSignature,
} from '../src/signature.ts';

test('verifyZipRecruiterSignature accepts a valid signature within tolerance', async () => {
  const secret = 'super-secret';
  const timestamp = '2026-04-01T12:00:00.000Z';
  const payload = '{"response_id":"abc"}';
  const signature = await computeZipRecruiterSignature(secret, timestamp, payload);

  const result = await verifyZipRecruiterSignature({
    secret,
    timestamp,
    payload,
    signature,
    nowMs: Date.parse(timestamp) + 2_000,
    toleranceMs: 10_000,
  });

  assert.equal(result.enabled, true);
  assert.equal(result.verified, true);
});

test('verifyZipRecruiterSignature rejects stale timestamps', async () => {
  const secret = 'super-secret';
  const timestamp = '2026-04-01T12:00:00.000Z';
  const payload = '{"response_id":"abc"}';
  const signature = await computeZipRecruiterSignature(secret, timestamp, payload);

  const result = await verifyZipRecruiterSignature({
    secret,
    timestamp,
    payload,
    signature,
    nowMs: Date.parse(timestamp) + 60_000,
    toleranceMs: 5_000,
  });

  assert.equal(result.verified, false);
  assert.equal(result.reason, 'stale_timestamp');
});
