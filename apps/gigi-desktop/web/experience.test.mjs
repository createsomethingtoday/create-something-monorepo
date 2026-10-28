import test from 'node:test';
import assert from 'node:assert/strict';
import { displayField, importantDetails, emptyCopy, localToday, fieldHelp } from './experience.mjs';

test('record detail puts actionable fields first and retains every supporting field', () => {
  const fields = { Source: 'manual', Requirements: 'Bring keys', Fee: 9000, Date: '2026-10-02', Status: 'Confirmed', 'Call Time': '18:00', Custom: 'Keep me' };
  const view = importantDetails('gigs', fields);
  assert.deepEqual(view.primary.map(([key]) => key), ['Date', 'Call Time', 'Fee', 'Status', 'Requirements']);
  assert.deepEqual(view.supporting, [['Source', 'manual'], ['Custom', 'Keep me']]);
});

test('dates retain their calendar day and invalid values remain visible without inventing a date', () => {
  assert.equal(displayField('Due Date', '2026-10-02'), 'Fri, Oct 2, 2026');
  assert.equal(displayField('Date', '2026-02-30'), '2026-02-30');
  assert.equal(displayField('Requirements', '2026-10-02'), '2026-10-02');
  assert.equal(displayField('Confirmed', false), 'No');
  assert.equal(localToday(new Date(2026, 9, 2, 0, 1)), '2026-10-02');
});

test('empty sections explain their purpose and suggest a first action', () => {
  assert.match(emptyCopy('contacts').description, /people.*link/i);
  assert.match(emptyCopy('finances').description, /income.*expense/i);
  assert.equal(emptyCopy('tasks').action, 'Add your first task');
  assert.equal(emptyCopy('schedule').title, 'No schedule entries yet.');
  assert.equal(emptyCopy('gigs').title, 'No gigs or shifts yet.');
});

test('offset-bearing dates show the recorded civil time and offset independent of the viewer timezone', () => {
  const previous = process.env.TZ;
  try {
    for (const zone of ['UTC', 'Pacific/Kiritimati', 'America/Los_Angeles']) {
      process.env.TZ = zone;
      assert.equal(displayField('Date', '2026-10-03T16:00:00-05:00'), 'Sat, Oct 3, 2026, 4:00 PM (UTC-05:00)');
      assert.equal(displayField('Due Date', '2026-01-01T00:15:00+14:00'), 'Thu, Jan 1, 2026, 12:15 AM (UTC+14:00)');
      assert.equal(displayField('Date', '2026-01-01T00:15:00Z'), 'Thu, Jan 1, 2026, 12:15 AM (UTC)');
      assert.equal(displayField('Date', '2024-02-29'), 'Thu, Feb 29, 2024');
    }
    for (const value of ['2026-02-30T16:00:00-05:00', '2026-01-01T24:00:00Z', '2026-10-03T16:00:00', 'invalid', '']) assert.equal(displayField('Date', value), value);
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});

test('money help identifies each supported profile currency and keeps an unset currency neutral', () => {
  for (const currency of ['USD', 'CAD', 'EUR', 'GBP']) assert.match(fieldHelp('Amount', currency), new RegExp(`amount in ${currency}`));
  assert.match(fieldHelp('Fee', null), /Currency is not set/);
  assert.doesNotMatch(fieldHelp('Fee', null), /USD|CAD|EUR|GBP/);
  assert.equal(fieldHelp('Estimated Time', 'USD'), '');
  assert.equal(fieldHelp('Recurring', 'USD'), '');
});
