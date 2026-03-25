import test from 'node:test';
import assert from 'node:assert/strict';

import { runGmailUnreadSummary } from './gmailUnreadSummary.ts';

test('invalid timezone returns config_error instead of throwing', async () => {
  const result = await runGmailUnreadSummary(
    {
      GMAIL_UNREAD_SUMMARY_TIMEZONE: 'Mars/Phobos',
    },
    { force: true },
  );

  assert.equal(result.ok, false);
  assert.equal(result.status, 'config_error');
  assert.match(result.details ?? '', /Invalid time zone/i);
});
