import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveComposioUserId } from './composio-user-id.js';

test('resolveComposioUserId prefers explicit preprovisioned user ids', () => {
  assert.equal(
    resolveComposioUserId({
      accountSlug: 'c3-denver',
      partnerClientSlug: 'blondish',
      composioUserId: 'hd_notion_c3_denver',
    }),
    'hd_notion_c3_denver',
  );
});

test('resolveComposioUserId falls back to legacy derived ids when no explicit user id is provided', () => {
  assert.equal(
    resolveComposioUserId({
      accountSlug: 'c3-denver',
      partnerClientSlug: 'blondish',
    }),
    'hd_notion_blondish_c3_denver',
  );
});
