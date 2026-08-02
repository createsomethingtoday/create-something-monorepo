import assert from 'node:assert/strict';
import test from 'node:test';

import type { ComposioToolDef } from '@create-something/composio-bridge';

import { GSC_READONLY_TOOL_SLUGS, projectToolkitTools } from '../tool-policy.js';

function tool(slug: string, app = 'google_search_console'): ComposioToolDef {
  return {
    slug,
    name: slug,
    description: `${slug} fixture`,
    app,
    parameters: {
      type: 'object',
      properties: {}
    }
  };
}

test('Google Search Console projects an exact read-only allowlist', () => {
  const discovered = [
    tool('GOOGLE_SEARCH_CONSOLE_SUBMIT_SITEMAP'),
    tool('GOOGLE_SEARCH_CONSOLE_LIST_SITES'),
    tool('GOOGLE_SEARCH_CONSOLE_SEARCH_ANALYTICS_QUERY'),
    tool('GOOGLE_SEARCH_CONSOLE_ADD_SITE'),
    tool('GOOGLE_SEARCH_CONSOLE_GET_SITE'),
    tool('GOOGLE_SEARCH_CONSOLE_DELETE_SITE'),
    tool('GOOGLE_SEARCH_CONSOLE_INSPECT_URL'),
    tool('GOOGLE_SEARCH_CONSOLE_LIST_SITEMAPS'),
    tool('GOOGLE_SEARCH_CONSOLE_GET_SITEMAP'),
    tool('GOOGLE_SEARCH_CONSOLE_FUTURE_UNKNOWN_ACTION')
  ];

  const projection = projectToolkitTools('google_search_console', discovered);

  assert.deepEqual(
    projection.toolDefs.map((definition) => definition.slug),
    GSC_READONLY_TOOL_SLUGS
  );
  assert.equal(projection.policy.mode, 'exact_allowlist');
  assert.equal(projection.policy.sourceToolCount, discovered.length);
  assert.equal(projection.policy.exposedToolCount, GSC_READONLY_TOOL_SLUGS.length);
  assert.equal(projection.policy.deniedToolCount, 4);
  assert.deepEqual(projection.policy.deniedToolSlugs, [
    'GOOGLE_SEARCH_CONSOLE_ADD_SITE',
    'GOOGLE_SEARCH_CONSOLE_DELETE_SITE',
    'GOOGLE_SEARCH_CONSOLE_FUTURE_UNKNOWN_ACTION',
    'GOOGLE_SEARCH_CONSOLE_SUBMIT_SITEMAP'
  ]);
});

test('other toolkits retain the complete dynamically discovered surface', () => {
  const discovered = [tool('GMAIL_FETCH_EMAILS', 'gmail'), tool('GMAIL_SEND_EMAIL', 'gmail')];

  const projection = projectToolkitTools('gmail', discovered);

  assert.deepEqual(projection.toolDefs, discovered);
  assert.equal(projection.policy.mode, 'dynamic');
  assert.equal(projection.policy.deniedToolCount, 0);
});
