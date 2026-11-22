import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarLabels } from './canon-calendar-verify.mjs';
test('Calendar comparison binds full local date, start, end and timezone to the scheduled instants', () => {
  const config = {
    starts_at: '2026-11-24T18:00:00Z',
    ends_at: '2026-11-24T18:30:00Z',
    title: 'Internal Test',
    calendarGuestName: 'Internal Guest',
    timeZone: 'America/Chicago'
  };
  const labels = calendarLabels(config);
  assert.deepEqual(labels, {
    calendarZoneLabel: 'GMT-6',
    calendarChip:
      '12pm to 12:30pm, Internal Test, Internal Guest, Accepted, No location, November 24, 2026'
  });
  assert.notEqual(
    calendarLabels({ ...config, ends_at: '2026-11-24T18:45:00Z' }).calendarChip,
    labels.calendarChip
  );
});
