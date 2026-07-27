import assert from 'node:assert/strict';
import test from 'node:test';

import { parseContactSubmission } from '../src/lib/server/contact-submission';

test('contact submission accepts name and phone with an optional email', () => {
  assert.deepEqual(
    parseContactSubmission({
      name: '  Jordan Care  ',
      phone: '  (817) 555-0141  ',
      email: '  jordan@example.com  '
    }),
    {
      name: 'Jordan Care',
      phone: '(817) 555-0141',
      email: 'jordan@example.com'
    }
  );

  assert.deepEqual(parseContactSubmission({ name: 'Jordan Care', phone: '817-555-0141' }), {
    name: 'Jordan Care',
    phone: '817-555-0141',
    email: ''
  });
});

test('contact submission rejects missing contact fields and malformed email', () => {
  assert.equal(parseContactSubmission({ phone: '817-555-0141' }), null);
  assert.equal(parseContactSubmission({ name: 'Jordan Care' }), null);
  assert.equal(
    parseContactSubmission({
      name: 'Jordan Care',
      phone: '817-555-0141',
      email: 'not-an-email'
    }),
    null
  );
});
