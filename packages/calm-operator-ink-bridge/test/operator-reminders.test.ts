import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildReminderAlert,
  buildReminderEmail,
  dueOperatorReminders,
  parseOperatorReminders
} from '../src/operator-reminders.js';

const env = {
  OPERATOR_REMINDER_EMAIL_TO: 'micah@example.com',
  OPERATOR_REMINDERS_JSON: JSON.stringify([
    {
      id: 'grant-foust-follow-up-2026-05-11',
      client: 'Grant Foust',
      due_at: '2026-05-11T14:00:00.000Z',
      subject: 'Follow up with Grant Foust',
      reason: 'Grant reached out for a meeting; no confirmation yet.',
      detail: 'Still warm.',
      action: 'Resend the meeting URL or propose a specific time.',
      channels: ['gmail', 'ink'],
      notion_url: 'https://www.notion.so/grant',
      linear_issue: 'CRE-189'
    }
  ])
};

test('parses configured operator reminders with default email recipient', () => {
  const reminders = parseOperatorReminders(env);

  assert.equal(reminders.length, 1);
  assert.equal(reminders[0]?.id, 'grant-foust-follow-up-2026-05-11');
  assert.deepEqual(reminders[0]?.channels, ['gmail', 'ink']);
  assert.equal(reminders[0]?.email_to, 'micah@example.com');
});

test('returns only reminders due at or before the checked time', () => {
  assert.equal(dueOperatorReminders(env, Date.parse('2026-05-11T13:59:00Z')).length, 0);

  const due = dueOperatorReminders(env, Date.parse('2026-05-11T14:00:00Z'));
  assert.equal(due.length, 1);
  assert.equal(due[0]?.reminder.id, 'grant-foust-follow-up-2026-05-11');
});

test('builds an Ink alert from reminder context', () => {
  const reminder = parseOperatorReminders(env)[0];
  assert.ok(reminder);

  const alert = buildReminderAlert(reminder);

  assert.equal(alert.id, 'operator-reminder:grant-foust-follow-up-2026-05-11');
  assert.equal(alert.state, 'operator_attention');
  assert.equal(alert.category, 'follow_up');
  assert.equal(alert.subject, 'Follow up with Grant Foust');
  assert.equal(alert.payload?.linear_issue, 'CRE-189');
});

test('builds a plain-text Gmail reminder', () => {
  const reminder = parseOperatorReminders(env)[0];
  assert.ok(reminder);

  const email = buildReminderEmail(reminder);

  assert.equal(email.recipientEmail, 'micah@example.com');
  assert.equal(email.subject, 'Follow up: Follow up with Grant Foust');
  assert.match(email.body, /Grant reached out/);
  assert.match(email.body, /Linear: CRE-189/);
});
