import assert from 'node:assert/strict';
import test from 'node:test';

import { findNpgLocation, npgLocationDirectory } from '../src/lib/npg/location-directory';

test('the caller-safe directory contains no protected escalation fields', () => {
  const serialized = JSON.stringify(npgLocationDirectory);

  assert.doesNotMatch(serialized, /account.?number|provider.?phone|personal.?phone/i);
  assert.equal(
    npgLocationDirectory.every((location) => !('phone' in location) && !('provider' in location)),
    true
  );
});

test('a specific city and state resolves to one caller-safe location', () => {
  const result = findNpgLocation('East Berlin, CT');

  assert.equal(result.status, 'matched');
  if (result.status !== 'matched') return;
  assert.equal(result.location.name, 'NPG Berlin, CT');
  assert.deepEqual(result.location.addressLines, ['1224 Mill Street', 'East Berlin, CT 06023']);
  assert.equal(result.location.office, '212');
  assert.equal(result.location.facilityLabel, 'Regus or HQ');
});

test('records with incomplete client data are held for human confirmation', () => {
  const result = findNpgLocation('Memphis, Tennessee');

  assert.equal(result.status, 'review_required');
  if (result.status !== 'review_required') return;
  assert.match(result.message, /NPG representative/i);
});

test('broad and unknown searches never guess', () => {
  assert.equal(findNpgLocation('NPG').status, 'ambiguous');
  assert.equal(findNpgLocation('Denver, CO').status, 'not_found');
});
