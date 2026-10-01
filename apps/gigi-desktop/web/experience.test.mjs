import test from 'node:test';
import assert from 'node:assert/strict';
import { displayField, importantDetails, emptyCopy, localToday } from './experience.mjs';

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
