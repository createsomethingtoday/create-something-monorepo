import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAuthConfigMap } from '../index.js';

test('dedicated Google Search Console auth config augments the shared map', () => {
  const authConfigMap = buildAuthConfigMap({
    COMPOSIO_AUTH_CONFIG_MAP: JSON.stringify({ gmail: 'gmail-config' }),
    COMPOSIO_GOOGLE_SEARCH_CONSOLE_AUTH_CONFIG_ID: ' gsc-config '
  });

  assert.deepEqual(authConfigMap, {
    gmail: 'gmail-config',
    google_search_console: 'gsc-config'
  });
});
