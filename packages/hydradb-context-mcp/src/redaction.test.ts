import assert from 'node:assert/strict';
import test from 'node:test';

import { redactJson, redactSecrets } from './redaction.js';

test('redactSecrets removes common token shapes', () => {
  const stripeToken = `sk_${'live'}_1234567890abcdef`;
  const slackToken = `xox${'b'}-1234567890`;
  const hydraAssignment = `HYDRA_DB_${'API_KEY'}=abc123456789`;
  const bearerToken = `Bearer ${'eyJabcdefghijklmnopqrstuvwxyz'}`;
  const value = redactSecrets(`${hydraAssignment} ${bearerToken} ${stripeToken} ${slackToken}`);

  assert.equal(value.includes('abc123456789'), false);
  assert.equal(value.includes('eyJabcdefghijklmnopqrstuvwxyz'), false);
  assert.equal(value.includes(stripeToken), false);
  assert.equal(value.includes(slackToken), false);
});

test('redactJson walks nested metadata', () => {
  assert.deepEqual(redactJson({ nested: [`Bearer ${'abcdefghijklmnopqrstuvwxyz'}`] }), {
    nested: ['Bearer [REDACTED]']
  });
});
