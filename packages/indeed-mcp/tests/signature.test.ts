import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';

import { computeIndeedSignature, verifyIndeedSignature } from '../src/signature.ts';

test('computeIndeedSignature matches node crypto HMAC-SHA1 output', async () => {
  const secret = 'super-secret';
  const payload = '{"id":"apply_123","job":{"jobId":"job_1"}}';
  const expected = createHmac('sha1', secret).update(payload).digest('base64');

  const actual = await computeIndeedSignature(secret, payload);

  assert.equal(actual, expected);
});

test('verifyIndeedSignature rejects a mismatched signature', async () => {
  const result = await verifyIndeedSignature({
    secret: 'super-secret',
    payload: '{"id":"apply_123"}',
    signature: 'not-a-real-signature',
  });

  assert.equal(result.enabled, true);
  assert.equal(result.verified, false);
  assert.equal(result.reason, 'signature_mismatch');
});

