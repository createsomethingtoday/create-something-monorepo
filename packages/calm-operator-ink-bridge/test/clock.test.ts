import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildClockSnapshot } from '../src/clock.js';

test('builds an accessible Central Time clock snapshot', () => {
  const clock = buildClockSnapshot(Date.parse('2026-04-30T14:23:00.000Z'));

  assert.equal(clock.timezone, 'America/Chicago');
  assert.equal(clock.local_date, '2026-04-30');
  assert.equal(clock.local_time_24, '09:23');
  assert.equal(clock.display_time, '9:23 AM');
  assert.equal(clock.display_date, 'Thu Apr 30');
  assert.equal(clock.day_period, 'morning');
});
