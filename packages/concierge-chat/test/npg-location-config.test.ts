import assert from 'node:assert/strict';
import test from 'node:test';

import {
  lookupConfiguredNpgLocation,
  parseConfiguredNpgDirectory
} from '../src/lib/server/npg-location-directory';

test('configured location records strip protected and unknown fields', () => {
  const directory = parseConfiguredNpgDirectory(
    JSON.stringify([
      {
        id: 'safe-test',
        name: 'NPG Safe Test, TX',
        aliases: ['Safe Test Texas'],
        street: '100 Example Street',
        city: 'Safe Test',
        state: 'TX',
        postalCode: '75001',
        status: 'approved',
        sourceVersion: 'test-v1',
        providerPhone: '555-111-2222',
        accountNumber: 'protected-account'
      }
    ])
  );

  assert.equal(directory.length, 1);
  assert.doesNotMatch(JSON.stringify(directory), /555-111|protected-account|providerPhone/i);
  assert.equal(
    lookupConfiguredNpgLocation('Safe Test, TX', JSON.stringify(directory)).status,
    'matched'
  );
});

test('invalid configured data fails closed instead of serving a stale fallback', () => {
  const result = lookupConfiguredNpgLocation('East Berlin, CT', '{not-json');

  assert.equal(result.status, 'not_found');
  assert.match(result.message, /unavailable/i);
});
