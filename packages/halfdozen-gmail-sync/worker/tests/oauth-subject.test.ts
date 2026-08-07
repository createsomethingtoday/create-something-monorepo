import assert from 'node:assert/strict';
import test from 'node:test';

import { assertOAuthSubjectMatch } from '../oauth-subject.js';

test('OAuth callback accepts only the Google account requested in signed state', () => {
  assert.equal(
    assertOAuthSubjectMatch('Owner@Example.com', 'owner@example.com'),
    'owner@example.com',
  );
  assert.throws(
    () => assertOAuthSubjectMatch('owner@example.com', 'different@example.com'),
    /does not match the requested mailbox/,
  );
});
