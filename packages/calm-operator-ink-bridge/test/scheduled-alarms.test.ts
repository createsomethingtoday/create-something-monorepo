import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  configuredDailyAlarmTimes,
  dueDailyAlarms,
  shouldRunHealthReviewAtUtcHour
} from '../src/scheduled-alarms.js';

test('defaults to the core daily rhythm alarms', () => {
  assert.deepEqual(configuredDailyAlarmTimes({}), ['06:00', '09:00', '12:30', '15:00', '23:00']);
});

test('fires the labeled 6 AM workout alarm during daylight time', () => {
  const alarms = dueDailyAlarms({}, Date.parse('2026-04-29T11:00:00Z'));

  assert.equal(alarms.length, 1);
  assert.equal(alarms[0]?.local_time, '06:00');
  assert.equal(alarms[0]?.display_time, '6:00 AM');
  assert.equal(alarms[0]?.alert.state, 'daily_alarm');
  assert.equal(alarms[0]?.alert.subject, 'WORKOUT');
  assert.equal(alarms[0]?.alert.reason, '6:00 AM CT');
  assert.equal(alarms[0]?.alert.urgent, true);
});

test('fires the 9 AM alarm during standard time', () => {
  const alarms = dueDailyAlarms({}, Date.parse('2026-12-15T15:00:00Z'));

  assert.equal(alarms.length, 1);
  assert.equal(alarms[0]?.local_time, '09:00');
  assert.equal(alarms[0]?.display_time, '9:00 AM');
  assert.equal(alarms[0]?.alert.subject, 'WORK');
});

test('fires the midday walk alarm during daylight time', () => {
  const alarms = dueDailyAlarms({}, Date.parse('2026-04-29T17:30:00Z'));

  assert.equal(alarms.length, 1);
  assert.equal(alarms[0]?.local_time, '12:30');
  assert.equal(alarms[0]?.alert.subject, 'WALK');
});

test('supports simple unlabeled custom alarm times', () => {
  const alarms = dueDailyAlarms({ DAILY_ALARMS_CT: '08:15' }, Date.parse('2026-04-29T13:15:00Z'));

  assert.equal(alarms.length, 1);
  assert.equal(alarms[0]?.local_time, '08:15');
  assert.equal(alarms[0]?.alert.subject, 'Daily alarm');
});

test('does not fire alarms outside configured Central times', () => {
  assert.deepEqual(dueDailyAlarms({}, Date.parse('2026-04-29T12:00:00Z')), []);
});

test('keeps health review cadence limited to configured UTC hours', () => {
  assert.equal(shouldRunHealthReviewAtUtcHour(undefined, Date.parse('2026-04-29T13:00:00Z')), true);
  assert.equal(shouldRunHealthReviewAtUtcHour(undefined, Date.parse('2026-04-29T11:00:00Z')), false);
});
