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

test('client-confirmed Portland, Memphis, and Des Moines addresses resolve for callers', () => {
  const portland = findNpgLocation('Portland, Maine');
  assert.equal(portland.status, 'matched');
  if (portland.status === 'matched') {
    assert.deepEqual(portland.location.addressLines, [
      '41 Hutchins Drive',
      'Portland, ME 04102'
    ]);
    assert.equal(portland.location.building, 'Building 3');
    assert.equal(portland.location.floor, '1st');
  }

  const memphis = findNpgLocation('Memphis, Tennessee');
  assert.equal(memphis.status, 'matched');
  if (memphis.status === 'matched') {
    assert.deepEqual(memphis.location.addressLines, [
      '1661 International Drive',
      'Memphis, TN 38120'
    ]);
    assert.equal(memphis.location.suite, '400');
  }

  const desMoines = findNpgLocation('West Des Moines, Iowa');
  assert.equal(desMoines.status, 'matched');
  if (desMoines.status === 'matched') {
    assert.equal(desMoines.location.name, 'NPG Des Moine, IA');
    assert.deepEqual(desMoines.location.addressLines, [
      '1501 42nd Street',
      'West Des Moines, IA 50266'
    ]);
    assert.equal(desMoines.location.suite, '450');
    assert.equal(desMoines.location.floor, '4th');
  }
});

test('broad and unknown searches never guess', () => {
  assert.equal(findNpgLocation('NPG').status, 'ambiguous');
  assert.equal(findNpgLocation('Denver, CO').status, 'not_found');
});
